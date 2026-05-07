"""Portfolio News Advisor command-line entrypoint."""

from __future__ import annotations

import argparse
import logging
import os
from datetime import datetime
from pathlib import Path
from typing import Any
from zoneinfo import ZoneInfo

import yaml
from dotenv import load_dotenv

from market_data import MarketDataClient
from news_fetcher import NewsFetcher
from notifier import Notifier
from portfolio_analyzer import PortfolioAnalyzer
from report_generator import ReportGenerator
from scheduler import TradingDayScheduler


LOGGER = logging.getLogger(__name__)


class PortfolioNewsAdvisor:
    """Coordinates data collection, analysis, reporting, and delivery."""

    def __init__(self, config: dict[str, Any]) -> None:
        self.config = config
        self.scheduler = TradingDayScheduler(config)
        self.market_data = MarketDataClient()
        self.news_fetcher = NewsFetcher(config)
        self.analyzer = PortfolioAnalyzer(config)
        self.report_generator = ReportGenerator(config)
        self.notifier = Notifier(config)

    def run_once(
        self,
        label: str = "auto",
        send: bool = True,
        dry_run: bool = False,
        force_send: bool = False,
        enforce_trading_day: bool = True,
    ) -> dict[str, Any]:
        now = datetime.now(self.scheduler.timezone)
        if label == "auto":
            label = self.scheduler.label_for_now(now)
        if enforce_trading_day and not self.scheduler.is_trading_day(now.date()):
            LOGGER.info("Skipping report: %s is not a US market trading day.", now.date())
            return {"skipped": True, "reason": "not_trading_day", "label": label}

        report_id = self.scheduler.report_id(label, now)
        LOGGER.info("Starting %s report (%s).", label, report_id)
        positions = self.config.get("portfolio", {}).get("positions", [])
        position_market_data = self.market_data.fetch_positions(positions)
        macro_market_data = self.market_data.fetch_macro()
        news_data = self.news_fetcher.fetch_all(positions)
        analysis = self.analyzer.analyze(position_market_data, news_data, macro_market_data)
        subject, report = self.report_generator.generate(analysis, label, now)
        extension = self.config.get("reporting", {}).get("save_format", "md")
        report_path = self.report_generator.save(report, report_id, extension=extension)
        LOGGER.info("Saved report to %s.", report_path)

        delivery_results = []
        if send:
            delivery_results = self.notifier.send(
                report_id=report_id,
                subject=subject,
                body=report,
                report_path=report_path,
                dry_run=dry_run,
                force=force_send,
            )
            for result in delivery_results:
                LOGGER.info("%s: %s", result.channel, result.detail)
        else:
            LOGGER.info("Notification sending disabled for this run.")

        return {
            "skipped": False,
            "report_id": report_id,
            "report_path": str(report_path),
            "subject": subject,
            "delivery_results": [result.__dict__ for result in delivery_results],
            "analysis": analysis,
        }

    def start_scheduler(self, send: bool = True, dry_run: bool = False) -> None:
        def job(label: str) -> None:
            self.run_once(label=label, send=send, dry_run=dry_run, enforce_trading_day=True)

        self.scheduler.start(job)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Portfolio News Advisor automation")
    parser.add_argument("--config", default="config.yaml", help="Path to config.yaml")
    parser.add_argument(
        "--once",
        nargs="?",
        const="auto",
        choices=["auto", "morning", "midday"],
        help="Run one report immediately. Optional label defaults to auto.",
    )
    parser.add_argument("--schedule", action="store_true", help="Run the APScheduler loop.")
    parser.add_argument("--no-send", action="store_true", help="Generate and save report without notifications.")
    parser.add_argument("--dry-run", action="store_true", help="Skip notification delivery but exercise the run.")
    parser.add_argument("--force-send", action="store_true", help="Ignore duplicate-send state for this run.")
    parser.add_argument(
        "--ignore-trading-day",
        action="store_true",
        help="Allow --once to run on weekends/holidays for setup testing.",
    )
    parser.add_argument("--log-level", default="INFO", help="Python logging level.")
    return parser.parse_args()


def load_config(path: str | Path) -> dict[str, Any]:
    with Path(path).open("r", encoding="utf-8") as handle:
        config = yaml.safe_load(handle) or {}
    cash_env = os.getenv("CASH_AVAILABLE_USD")
    if cash_env and not config.get("portfolio", {}).get("cash_available_usd"):
        config.setdefault("portfolio", {})["cash_available_usd"] = cash_env
    return config


def setup_logging(config: dict[str, Any], level: str) -> None:
    log_file = Path(config.get("reporting", {}).get("log_file", "logs/portfolio_news_advisor.log"))
    log_file.parent.mkdir(parents=True, exist_ok=True)
    logging.basicConfig(
        level=getattr(logging, level.upper(), logging.INFO),
        format="%(asctime)s %(levelname)s [%(name)s] %(message)s",
        handlers=[
            logging.StreamHandler(),
            logging.FileHandler(log_file, encoding="utf-8"),
        ],
    )


def main() -> None:
    load_dotenv()
    args = parse_args()
    config = load_config(args.config)
    setup_logging(config, args.log_level)
    timezone = ZoneInfo(config.get("schedule", {}).get("timezone", "America/New_York"))
    LOGGER.info("Portfolio News Advisor started at %s.", datetime.now(timezone).isoformat())

    advisor = PortfolioNewsAdvisor(config)
    send = not args.no_send
    if args.schedule:
        advisor.start_scheduler(send=send, dry_run=args.dry_run)
        return

    label = args.once or "auto"
    result = advisor.run_once(
        label=label,
        send=send,
        dry_run=args.dry_run,
        force_send=args.force_send,
        enforce_trading_day=not args.ignore_trading_day,
    )
    if result.get("skipped"):
        LOGGER.info("Run skipped: %s", result.get("reason"))
    else:
        LOGGER.info("Run complete: %s", result.get("report_path"))


if __name__ == "__main__":
    main()
