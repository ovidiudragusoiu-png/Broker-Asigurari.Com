from __future__ import annotations

import argparse
import logging
from datetime import datetime
from pathlib import Path
from typing import Any

from .analysis import analyze_buy_candidates, analyze_positions, market_regime_summary
from .calculations import calculate_position_metrics, total_portfolio_value
from .config import load_config, validate_environment
from .data_sources import EarningsClient, MarketDataClient, NewsClient
from .market_calendar import is_us_trading_day, now_et, report_slot_label, should_generate_report
from .notifications import send_notifications
from .portfolio import load_portfolio
from .report import build_report, save_report


def run_once(
    *,
    config_path: str = "config.yaml",
    slot_label: str | None = None,
    send: bool = False,
    force: bool = False,
) -> Path | None:
    config = load_config(config_path)
    logger = _setup_logging(config)
    generated_at = now_et()

    if not force and not is_us_trading_day(generated_at.date()):
        logger.info("Skipped run: %s is not a US trading day.", generated_at.date())
        return None

    slot = slot_label or report_slot_label(generated_at)
    missing_env = validate_environment(config)
    if missing_env:
        logger.warning("Missing environment variables: %s", ", ".join(missing_env))

    portfolio_path = _resolve_path(config_path, config["portfolio_path"])
    positions = load_portfolio(portfolio_path)
    tickers = [position.ticker for position in positions]
    candidate_tickers = [candidate["ticker"] for candidate in config.get("buy_candidates", [])]

    market_client = MarketDataClient(config)
    news_client = NewsClient(config)
    earnings_client = EarningsClient(config)

    logger.info("Fetching market data for %s", ", ".join(tickers))
    quotes = market_client.fetch_quotes(tickers)
    allow_snapshot = bool(config["market_data"].get("use_snapshot_prices_when_live_unavailable", False))
    metrics = calculate_position_metrics(positions, quotes, allow_snapshot_fallback=allow_snapshot)

    context_symbols = config["market_data"].get("market_context_symbols", {})
    context_quotes = {
        label: market_client.fetch_quote(symbol)
        for label, symbol in context_symbols.items()
    }

    logger.info("Fetching news and earnings calendar data")
    company_news = {}
    earnings = {}
    for position in positions:
        items, error = news_client.company_news(position.ticker, position.company)
        if error:
            logger.warning("%s news unavailable: %s", position.ticker, error)
        company_news[position.ticker] = items
        earnings[position.ticker] = earnings_client.next_earnings(position.ticker)

    macro_news, macro_error = news_client.macro_news()
    if macro_error:
        logger.warning("Macro news unavailable: %s", macro_error)

    analyses = analyze_positions(
        positions=positions,
        quotes=quotes,
        metrics=metrics,
        news=company_news,
        earnings=earnings,
        config=config,
    )
    _, market_risk_high = market_regime_summary(context_quotes, macro_news)

    candidate_quotes = market_client.fetch_quotes(candidate_tickers) if candidate_tickers else {}
    buy_candidates = analyze_buy_candidates(
        candidates=config.get("buy_candidates", []),
        quotes=candidate_quotes,
        portfolio_value=total_portfolio_value(metrics.values()),
        market_risk_high=market_risk_high,
    )

    subject, report_text = build_report(
        analyses=analyses,
        buy_candidates=buy_candidates,
        context_quotes=context_quotes,
        macro_news=macro_news,
        metrics=metrics,
        slot_label=slot,
        generated_at=generated_at,
        missing_env=missing_env,
    )
    reports_dir = _resolve_path(config_path, config["reports_dir"])
    report_path = save_report(report_text, reports_dir, generated_at, slot)
    logger.info("Wrote report: %s", report_path)

    if send:
        for result in send_notifications(subject, report_text, config):
            logger.info("Notification result: %s", result)
    else:
        logger.info("Notification delivery disabled for this run.")
    return report_path


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Portfolio monitoring automation")
    parser.add_argument("--config", default="config.yaml", help="Path to config.yaml")
    subparsers = parser.add_subparsers(dest="command", required=True)

    run_parser = subparsers.add_parser("run", help="Generate a report once")
    run_parser.add_argument("--slot", choices=["morning", "afternoon", "now"], default="now")
    run_parser.add_argument("--send", action="store_true", help="Send configured notifications")
    run_parser.add_argument("--force", action="store_true", help="Run even on non-trading days")

    due_parser = subparsers.add_parser("run-if-due", help="Cron-friendly due check")
    due_parser.add_argument("--send", action="store_true", help="Send configured notifications")
    due_parser.add_argument("--force", action="store_true", help="Run even outside configured windows")
    due_parser.add_argument("--tolerance-minutes", type=int, default=5)

    args = parser.parse_args(argv)

    if args.command == "run":
        label = None
        if args.slot == "morning":
            label = "10:00 AM ET"
        elif args.slot == "afternoon":
            label = "2:30 PM ET"
        path = run_once(config_path=args.config, slot_label=label, send=args.send, force=args.force)
        print(path or "Skipped: not a US trading day")
        return 0

    if args.command == "run-if-due":
        config = load_config(args.config)
        due, label = should_generate_report(
            allowed_times=config.get("report_times_et", ["10:00", "14:30"]),
            tolerance_minutes=args.tolerance_minutes,
        )
        if not due and not args.force:
            print("Skipped: not due, weekend, or US market holiday")
            return 0
        path = run_once(config_path=args.config, slot_label=label, send=args.send, force=args.force)
        print(path or "Skipped")
        return 0

    return 2


def _setup_logging(config: dict[str, Any]) -> logging.Logger:
    logs_dir = Path(config.get("logs_dir", "logs"))
    if not logs_dir.is_absolute():
        config_path = Path(config.get("_path", "config.yaml")).resolve()
        logs_dir = config_path.parent / logs_dir
    logs_dir.mkdir(parents=True, exist_ok=True)
    log_path = logs_dir / "portfolio_monitor.log"

    logger = logging.getLogger("portfolio_monitor")
    logger.setLevel(logging.INFO)
    logger.handlers.clear()

    formatter = logging.Formatter("%(asctime)s %(levelname)s %(message)s")
    file_handler = logging.FileHandler(log_path, encoding="utf-8")
    file_handler.setFormatter(formatter)
    logger.addHandler(file_handler)

    console_handler = logging.StreamHandler()
    console_handler.setFormatter(formatter)
    logger.addHandler(console_handler)
    return logger


def _resolve_path(config_path: str, configured_path: str) -> Path:
    path = Path(configured_path)
    if path.is_absolute():
        return path
    return Path(config_path).resolve().parent / path


if __name__ == "__main__":
    raise SystemExit(main())
