from __future__ import annotations

from datetime import datetime
from pathlib import Path
from zoneinfo import ZoneInfo

from .analysis import market_regime_summary
from .calculations import total_portfolio_value
from .models import BuyCandidateAnalysis, NewsItem, PositionAnalysis, PositionMetrics, Quote


SAFETY_LINE = (
    "This is decision-support analysis, not guaranteed financial advice. "
    "Final investment decisions are your responsibility."
)


def build_report(
    *,
    analyses: list[PositionAnalysis],
    buy_candidates: list[BuyCandidateAnalysis],
    context_quotes: dict[str, Quote],
    macro_news: list[NewsItem],
    metrics: dict[str, PositionMetrics],
    slot_label: str,
    generated_at: datetime,
    missing_env: list[str],
) -> tuple[str, str]:
    generated_at_et = generated_at.astimezone(ZoneInfo("America/New_York"))
    subject = f"Portfolio Action Report - {generated_at_et:%Y-%m-%d} - {slot_label}"
    portfolio_value = total_portfolio_value(metrics.values())
    market_summary, _ = market_regime_summary(context_quotes, macro_news)
    top_positions = sorted(analyses, key=lambda item: item.metrics.weight or 0, reverse=True)[:5]
    biggest_risk = _biggest_risk(analyses)
    biggest_opportunity = _biggest_opportunity(analyses, buy_candidates)

    lines: list[str] = [
        f"# {subject}",
        "",
        SAFETY_LINE,
        "",
        "The tool does not execute trades. It only prepares decision-support recommendations with rationale, risks, and source links.",
        "",
    ]

    if missing_env:
        lines.extend(
            [
                "> Data/notification warning: missing environment variables: "
                + ", ".join(missing_env)
                + ". API-backed sections may show unavailable data and notifications may be skipped.",
                "",
            ]
        )

    lines.extend(
        [
            "## 1. Market regime summary",
            "",
            market_summary,
            "",
            "AI/semiconductor sector condition: monitored through AMD, AVGO, META, semiconductor ETF candidates, and AI infrastructure headlines. If related news is unavailable, the relevant ticker sections state that explicitly.",
            "",
            "## 2. Portfolio summary",
            "",
            f"- Total estimated value: {_money(portfolio_value)}",
            "- Top 5 position weights:",
        ]
    )
    for analysis in top_positions:
        lines.append(f"  - {analysis.position.ticker}: {_pct(analysis.metrics.weight)}")
    lines.extend(
        [
            f"- Biggest risk: {biggest_risk}",
            f"- Biggest opportunity: {biggest_opportunity}",
            "- Cash available: not configured",
            f"- Concentration warning: {_concentration_warning(analyses)}",
            "",
            "## 3. Action table",
            "",
            "| Ticker | Current Weight | Signal | Suggested Action | Shares | Approx. Dollar Amount | Urgency | Reason |",
            "| --- | ---: | --- | --- | ---: | ---: | --- | --- |",
        ]
    )

    for analysis in analyses:
        action = analysis.action
        lines.append(
            "| "
            + " | ".join(
                [
                    analysis.position.ticker,
                    _pct(analysis.metrics.weight),
                    action.signal,
                    _escape(action.suggested_action),
                    _shares(action.approximate_shares),
                    _money(action.approximate_dollars),
                    action.urgency,
                    _escape(action.reason),
                ]
            )
            + " |"
        )

    lines.extend(["", "## 4. Detailed reasoning per ticker", ""])
    for analysis in analyses:
        lines.extend(
            [
                f"### {analysis.position.ticker} - {analysis.position.company}",
                "",
                f"- Current thesis: {analysis.thesis}",
                f"- Latest news summary: {analysis.latest_news_summary}",
                f"- Technical condition: {analysis.technical_condition}",
                f"- Fundamental risk: {analysis.fundamental_risk}",
                f"- Recommendation: {analysis.action.signal} - {analysis.action.suggested_action}. Why now: {analysis.action.reason}",
                f"- What changed/data support: weight {_pct(analysis.metrics.weight)}, daily change {_pct(analysis.quote.day_change_pct)}, weekly change {_pct(analysis.quote.week_change_pct)}, monthly change {_pct(analysis.quote.month_change_pct)}, relative volume {_multiple(analysis.quote.relative_volume)}.",
                f"- Unrealized performance: {_money(analysis.metrics.unrealized_gain_loss)} / {_pct(analysis.metrics.unrealized_gain_loss_pct)} if cost basis is configured; otherwise n/a.",
                f"- What could go wrong: {_what_could_go_wrong(analysis)}",
                f"- Invalidation trigger: {analysis.invalidation_trigger}",
                f"- Suggested next action: {analysis.next_action} Final decision is yours.",
                "",
            ]
        )

    lines.extend(
        [
            "## 5. Buy candidate section",
            "",
            "| Ticker | Implementation | Reason to consider | Entry zone | Suggested allocation | Approx. Dollar Amount | Approx. Shares | Max position-size target | Risk |",
            "| --- | --- | --- | --- | ---: | ---: | ---: | ---: | --- |",
        ]
    )
    for candidate in buy_candidates:
        lines.append(
            "| "
            + " | ".join(
                [
                    candidate.ticker,
                    _escape(candidate.implementation),
                    _escape(candidate.reason_to_consider),
                    _escape(candidate.entry_zone),
                    _pct(candidate.suggested_allocation),
                    _money(candidate.approximate_dollars),
                    _shares(candidate.approximate_shares),
                    _pct(candidate.max_weight),
                    _escape(candidate.risk),
                ]
            )
            + " |"
        )

    lines.extend(
        [
            "",
            "## 6. Final decision summary",
            "",
            f"- Today's highest priority action: {_highest_priority(analyses)}",
            f"- Positions to leave untouched: {_positions_by_signal(analyses, {'Hold'})}",
            f"- Positions to monitor closely: {_positions_by_signal(analyses, {'Trim', 'Sell / Exit', 'Watchlist Only'})}",
            "- Recommended cash reserve: keep a cash/T-bill reserve sized to your comfort with volatility; after any concentration trim, consider holding dry powder rather than immediately redeploying all proceeds if market risk is elevated.",
            f"- Next trigger to watch: {_next_trigger(analyses)}",
            "",
            "## 7. Sources",
            "",
        ]
    )
    for source in _all_sources(analyses, buy_candidates, context_quotes, macro_news):
        lines.append(f"- {source}")
    lines.extend(["", SAFETY_LINE, ""])
    return subject, "\n".join(lines)


def save_report(report_text: str, reports_dir: str | Path, generated_at: datetime, slot_label: str) -> Path:
    path = Path(reports_dir)
    path.mkdir(parents=True, exist_ok=True)
    safe_slot = slot_label.replace(" ", "_").replace(":", "")
    report_path = path / f"portfolio_report_{generated_at:%Y%m%d_%H%M%S}_{safe_slot}.md"
    report_path.write_text(report_text, encoding="utf-8")
    return report_path


def _biggest_risk(analyses: list[PositionAnalysis]) -> str:
    if not analyses:
        return "unavailable"
    top = max(analyses, key=lambda item: item.metrics.weight or 0)
    if top.metrics.weight and top.metrics.weight > 0.50:
        return f"{top.position.ticker} extreme concentration at {_pct(top.metrics.weight)}."
    if top.metrics.weight and top.metrics.weight > 0.35:
        return f"{top.position.ticker} high concentration at {_pct(top.metrics.weight)}."
    return "No single position above the configured high-concentration threshold."


def _biggest_opportunity(analyses: list[PositionAnalysis], candidates: list[BuyCandidateAnalysis]) -> str:
    trims = [analysis for analysis in analyses if analysis.action.signal == "Trim"]
    if trims:
        return "Reduce single-stock risk while preserving long-term equity exposure through staged rebalancing."
    if candidates:
        return f"Consider staged diversification through {candidates[0].ticker} if price, tax, and broker availability fit."
    return "unavailable"


def _concentration_warning(analyses: list[PositionAnalysis]) -> str:
    warnings = [
        f"{analysis.position.ticker} is {_pct(analysis.metrics.weight)}"
        for analysis in analyses
        if analysis.metrics.weight is not None and analysis.metrics.weight > 0.35
    ]
    return "; ".join(warnings) if warnings else "none above 35%"


def _what_could_go_wrong(analysis: PositionAnalysis) -> str:
    if analysis.action.signal == "Trim":
        return "the stock could keep compounding after a trim, so gradual sizing may reduce regret risk."
    if analysis.action.signal in {"Buy Small", "Strong Buy / Add"}:
        return "valuation could compress or macro/news conditions could worsen after entry."
    if analysis.action.signal == "Watchlist Only":
        return "a turnaround could emerge before the evidence is obvious, but downside risk remains high."
    return "the hold thesis could be invalidated by earnings, guidance, balance-sheet stress, or sector-wide multiple compression."


def _highest_priority(analyses: list[PositionAnalysis]) -> str:
    ordered = sorted(
        analyses,
        key=lambda item: (
            {"High": 3, "Medium": 2, "Low": 1}.get(item.action.urgency, 0),
            item.metrics.weight or 0,
        ),
        reverse=True,
    )
    if not ordered:
        return "No action."
    top = ordered[0]
    return f"{top.position.ticker}: {top.action.suggested_action} ({top.action.urgency})."


def _positions_by_signal(analyses: list[PositionAnalysis], signals: set[str]) -> str:
    tickers = [analysis.position.ticker for analysis in analyses if analysis.action.signal in signals]
    return ", ".join(tickers) if tickers else "none"


def _next_trigger(analyses: list[PositionAnalysis]) -> str:
    for analysis in analyses:
        if analysis.position.ticker == "AMD":
            return analysis.invalidation_trigger
    return analyses[0].invalidation_trigger if analyses else "refresh market data"


def _all_sources(
    analyses: list[PositionAnalysis],
    candidates: list[BuyCandidateAnalysis],
    context_quotes: dict[str, Quote],
    macro_news: list[NewsItem],
) -> list[str]:
    seen: set[str] = set()
    sources: list[str] = []
    for quote in context_quotes.values():
        sources.append(f"https://finance.yahoo.com/quote/{quote.source_symbol}")
    for item in macro_news:
        sources.append(item.url)
    for analysis in analyses:
        sources.extend(analysis.sources)
    for candidate in candidates:
        if candidate.source_url:
            sources.append(candidate.source_url)

    unique_sources = []
    for source in sources:
        if source and source not in seen:
            unique_sources.append(source)
            seen.add(source)
    return unique_sources or ["Sources unavailable because market/news data could not be fetched."]


def _money(value: float | None) -> str:
    return "n/a" if value is None else f"${value:,.0f}"


def _pct(value: float | None) -> str:
    return "n/a" if value is None else f"{value:.1%}"


def _shares(value: float | None) -> str:
    return "n/a" if value is None else f"{value:,.2f}"


def _multiple(value: float | None) -> str:
    return "n/a" if value is None else f"{value:.1f}x"


def _escape(value: str) -> str:
    return value.replace("|", "\\|").replace("\n", " ")
