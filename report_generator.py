"""Decision-support report rendering with optional LLM polishing."""

from __future__ import annotations

import json
import logging
import os
from datetime import datetime
from pathlib import Path
from typing import Any

from openai import OpenAI

LOGGER = logging.getLogger(__name__)

DISCLAIMER = (
    "This is automated decision-support, not financial advice. Review all trades "
    "manually and consider taxes, liquidity, and personal risk tolerance before acting."
)


class ReportGenerator:
    """Builds a concise, practical portfolio report."""

    def __init__(self, config: dict[str, Any]) -> None:
        self.config = config
        reporting = config.get("reporting", {})
        self.output_dir = Path(reporting.get("output_dir", "reports"))
        self.include_raw_data = bool(reporting.get("include_raw_data_appendix", False))
        self.openai_model = reporting.get("openai_model", "gpt-4o-mini")
        self.llm_temperature = float(reporting.get("llm_temperature", 0.2))

    def generate(
        self,
        analysis: dict[str, Any],
        report_label: str,
        generated_at: datetime,
    ) -> tuple[str, str]:
        subject = (
            f"Portfolio News Advisor - {report_label.title()} Report - "
            f"{generated_at.strftime('%Y-%m-%d')}"
        )
        deterministic = self._render_markdown(subject, analysis, report_label, generated_at)
        if os.getenv("OPENAI_API_KEY"):
            return subject, self._llm_polish(deterministic, analysis)
        return subject, deterministic

    def save(self, content: str, report_id: str, extension: str = "md") -> Path:
        self.output_dir.mkdir(parents=True, exist_ok=True)
        path = self.output_dir / f"{report_id}.{extension}"
        path.write_text(content, encoding="utf-8")
        return path

    def _render_markdown(
        self,
        subject: str,
        analysis: dict[str, Any],
        report_label: str,
        generated_at: datetime,
    ) -> str:
        positions = analysis.get("positions", [])
        actions = [item["recommendation"] for item in positions]
        non_hold_actions = [
            action for action in actions if action.get("action") not in {"Hold", "Watch only"}
        ]
        biggest_positive = self._biggest_driver(positions, positive=True)
        biggest_negative = self._biggest_driver(positions, positive=False)

        lines = [
            f"# {subject}",
            "",
            f"Generated: {generated_at.isoformat()}",
            "",
            "## 1. Executive Summary",
            f"- Portfolio status: **{analysis.get('portfolio_status', 'Neutral')}**",
            f"- Biggest positive driver: {biggest_positive}",
            f"- Biggest negative risk: {biggest_negative}",
            f"- Recommended actions today: {self._action_sentence(non_hold_actions)}",
        ]
        if not analysis.get("generated_inputs", {}).get("cash_known"):
            lines.append(
                "- Cash availability: unknown. Set `CASH_AVAILABLE_USD` in `.env` or "
                "`portfolio.cash_available_usd` in `config.yaml`; buy ideas are held back until cash is known."
            )
        lines.extend(["", "## 2. Action Table", ""])
        lines.append("| Ticker | Action | Shares | Approx. $ | Timing | Confidence | Reason |")
        lines.append("| --- | --- | ---: | ---: | --- | --- | --- |")
        for action in actions:
            lines.append(
                "| {ticker} | {action} | {shares} | {dollars} | {timing} | {confidence} | {reason} |".format(
                    ticker=action.get("ticker", ""),
                    action=action.get("action", ""),
                    shares=_fmt_float(action.get("shares")),
                    dollars=_fmt_money(action.get("approx_dollars")),
                    timing=_escape_table(action.get("timing", "")),
                    confidence=action.get("confidence", ""),
                    reason=_escape_table(_shorten(action.get("reason", ""), 180)),
                )
            )

        lines.extend(["", "## 3. Portfolio Risk", ""])
        concentration = analysis.get("concentration", {})
        lines.append(f"- Concentration risk: {concentration.get('message', 'Not available')}")
        lines.append(
            "- Biggest position weights: "
            + ", ".join(
                f"{item['ticker']} {item['weight_pct']:.1f}%"
                for item in positions[:5]
            )
        )
        attention = [
            item["ticker"]
            for item in positions
            if item["recommendation"]["action"] in {"Trim", "Sell", "Watch only"}
            or item["risk_category"] == "Speculative"
            or item["weight_pct"] >= concentration.get("warning_threshold_pct", 25)
        ]
        lines.append(f"- Stocks needing attention: {', '.join(attention) if attention else 'None'}")
        lines.append("- Sector exposure:")
        for sector in analysis.get("sector_exposure", []):
            lines.append(f"  - {sector['sector']}: {sector['weight_pct']:.1f}%")

        lines.extend(["", "## 4. News Impact by Ticker", ""])
        for item in positions:
            rec = item["recommendation"]
            lines.extend(
                [
                    f"### {item['ticker']} - {item.get('name', '')}",
                    f"- Current value/weight: {_fmt_money(item['current_value'])} / {item['weight_pct']:.1f}%",
                    f"- Daily impact: {self._daily_impact(item)}",
                    f"- Relevant news summary: {item.get('news_evidence')}",
                    f"- Sentiment: {item.get('news_sentiment')}",
                    f"- Technical trend: {item.get('technical_trend')} (score {item.get('score')}/10)",
                    f"- Impact on long-term thesis: {self._thesis_impact(item)}",
                    f"- Action: {rec['action']}. {self._action_detail(rec)}",
                    f"- Risk warning: {rec['risk_warning']}",
                    f"- Invalidation/review trigger: {rec['invalidation']}",
                ]
            )
            earnings = item.get("earnings") or {}
            if earnings.get("next_earnings_date"):
                lines.append(f"- Next earnings date: {earnings['next_earnings_date']} ({earnings.get('source')})")
            elif earnings.get("notes"):
                lines.append("- Next earnings date: missing from available sources.")
            if item.get("analyst_events"):
                lines.append("- Analyst events: " + "; ".join(event["title"] for event in item["analyst_events"][:2]))
            if item.get("sec_filings"):
                lines.append("- SEC filings: " + "; ".join(event["title"] for event in item["sec_filings"][:2]))
            if item.get("insider_events"):
                lines.append("- Insider events: " + "; ".join(event["title"] for event in item["insider_events"][:2]))
            lines.append("")

        lines.extend(["## 5. Macro / Worldwide News", ""])
        macro = analysis.get("macro", {})
        snapshots = macro.get("market_snapshots", {})
        lines.append(f"- Fed/rates: {self._macro_line(macro.get('news', []), ['Fed', 'rate', 'inflation'])}")
        lines.append(f"- Inflation: {self._macro_line(macro.get('news', []), ['inflation', 'CPI', 'PCE'])}")
        lines.append(
            "- Nasdaq/S&P/SOX trend: "
            + ", ".join(
                self._macro_snapshot(name, snapshots.get(name, {}))
                for name in ["Nasdaq", "S&P 500", "SOXX"]
            )
        )
        lines.append(
            f"- China/Taiwan/geopolitical risk: {self._macro_line(macro.get('news', []), ['China', 'Taiwan', 'export', 'geopolitical'])}"
        )
        lines.append(
            f"- AI/semiconductor sector news: {self._macro_line(macro.get('news', []), ['AI', 'semiconductor', 'chips', 'Nvidia', 'TSMC'])}"
        )
        lines.append(
            f"- Consumer spending news: {self._macro_line(macro.get('news', []), ['consumer', 'retail', 'tariff', 'spending'])}"
        )
        lines.append(
            "- Other macro gauges: "
            + ", ".join(
                self._macro_snapshot(name, snapshots.get(name, {}))
                for name in ["VIX", "US 10Y Yield", "USD Index", "Oil WTI"]
            )
        )

        lines.extend(["", "## 6. Watchlist / Alerts", ""])
        for item in positions:
            snapshot = item.get("market_data", {})
            rec = item["recommendation"]
            price = item.get("price")
            buy_zone = rec.get("suggested_limit_price") or (round(price * 0.95, 2) if price else None)
            sell_zone = snapshot.get("ma_200") or snapshot.get("ma_50")
            lines.append(
                f"- {item['ticker']}: watch price near {_fmt_price(price)}; "
                f"buy zone {_fmt_price(buy_zone)}; sell/trim risk level {_fmt_price(sell_zone)}; "
                f"earnings {item.get('earnings', {}).get('next_earnings_date') or 'missing'}; "
                f"trigger: {rec['invalidation']}"
            )

        if analysis.get("source_notes"):
            lines.extend(["", "### Missing/failed data notes"])
            for note in analysis["source_notes"][:12]:
                lines.append(f"- {note}")

        lines.extend(["", "## 7. Disclaimer", f"> {DISCLAIMER}", ""])
        if self.include_raw_data:
            lines.extend(
                [
                    "",
                    "## Raw Data Appendix",
                    "```json",
                    json.dumps(analysis, indent=2, default=str),
                    "```",
                ]
            )
        return "\n".join(lines)

    def _llm_polish(self, deterministic: str, analysis: dict[str, Any]) -> str:
        """Use an LLM to tighten wording without adding facts."""

        try:
            client = OpenAI()
            response = client.chat.completions.create(
                model=self.openai_model,
                temperature=self.llm_temperature,
                messages=[
                    {
                        "role": "system",
                        "content": (
                            "You are a portfolio reporting assistant. Rewrite the provided markdown "
                            "to be concise and decision-oriented. Do not add facts, prices, news, "
                            "earnings dates, or recommendations that are not present. Preserve every "
                            "section heading and the disclaimer. Never imply trades are automatic."
                        ),
                    },
                    {
                        "role": "user",
                        "content": (
                            "Structured analysis JSON:\n"
                            + json.dumps(_compact_for_llm(analysis), default=str)
                            + "\n\nMarkdown draft:\n"
                            + deterministic
                        ),
                    },
                ],
            )
            content = response.choices[0].message.content
            return content or deterministic
        except Exception as exc:  # pragma: no cover - provider dependent
            LOGGER.warning("OpenAI report polish failed; using deterministic report: %s", exc)
            return deterministic

    def _biggest_driver(self, positions: list[dict[str, Any]], positive: bool) -> str:
        if not positions:
            return "No position data available."
        sorted_positions = sorted(positions, key=lambda item: item.get("score", 0), reverse=positive)
        item = sorted_positions[0]
        direction = "positive" if positive else "negative"
        return (
            f"{item['ticker']} is the biggest {direction} score contributor "
            f"({item['score']}/10, {item['news_sentiment']} news, {item['technical_trend']})."
        )

    def _action_sentence(self, actions: list[dict[str, Any]]) -> str:
        if not actions:
            return "No size-changing actions; hold/watch existing positions."
        return "; ".join(
            f"{action['action']} {action['ticker']} {action['shares']} shares (~{_fmt_money(action['approx_dollars'])})"
            for action in actions
        )

    def _daily_impact(self, item: dict[str, Any]) -> str:
        pct = item.get("daily_price_change_pct")
        dollars = item.get("daily_dollar_impact")
        if pct is None or dollars is None:
            return "missing"
        return f"{pct:+.2f}% / {_fmt_money(dollars)}"

    def _thesis_impact(self, item: dict[str, Any]) -> str:
        score = item.get("score", 0)
        if score >= 6:
            return "Supportive; thesis appears reinforced by current data."
        if score >= 2:
            return "Mildly supportive; keep position but demand cleaner catalysts before adding aggressively."
        if score >= -1:
            return "Neutral; no material thesis change found."
        if score >= -5:
            return "Pressure building; watch for guidance, earnings, or support breaks."
        return "Material risk; treat as a sell/strong-trim candidate unless new evidence improves."

    def _action_detail(self, rec: dict[str, Any]) -> str:
        if rec["shares"]:
            return (
                f"{rec['shares']} shares (~{_fmt_money(rec['approx_dollars'])}), "
                f"timing: {rec['timing']}, execution: {rec.get('execution_style') or 'manual review'}."
            )
        return f"Timing: {rec['timing']}."

    def _macro_line(self, news: list[dict[str, Any]], keywords: list[str]) -> str:
        for item in news:
            text = f"{item.get('title', '')} {item.get('summary', '')}".lower()
            if any(keyword.lower() in text for keyword in keywords):
                return item.get("title", "Relevant headline found")
        return "No specific headline found from configured sources; verify manually if this is a key decision factor."

    def _macro_snapshot(self, name: str, snapshot: dict[str, Any]) -> str:
        price = snapshot.get("price")
        change = snapshot.get("day_change_pct")
        if price is None:
            return f"{name}: missing"
        if change is None:
            return f"{name}: {_fmt_price(price)}"
        return f"{name}: {_fmt_price(price)} ({change:+.2f}%)"


def _compact_for_llm(analysis: dict[str, Any]) -> dict[str, Any]:
    return {
        "portfolio_status": analysis.get("portfolio_status"),
        "positions": [
            {
                "ticker": item.get("ticker"),
                "weight_pct": item.get("weight_pct"),
                "score": item.get("score"),
                "news_sentiment": item.get("news_sentiment"),
                "technical_trend": item.get("technical_trend"),
                "recommendation": item.get("recommendation"),
            }
            for item in analysis.get("positions", [])
        ],
        "concentration": analysis.get("concentration"),
        "sector_exposure": analysis.get("sector_exposure"),
        "source_notes": analysis.get("source_notes"),
    }


def _fmt_money(value: Any) -> str:
    if value is None:
        return "missing"
    try:
        return f"${float(value):,.2f}"
    except (TypeError, ValueError):
        return "missing"


def _fmt_price(value: Any) -> str:
    if value is None:
        return "missing"
    try:
        return f"{float(value):,.2f}"
    except (TypeError, ValueError):
        return "missing"


def _fmt_float(value: Any) -> str:
    if value is None:
        return "0"
    try:
        number = float(value)
    except (TypeError, ValueError):
        return "0"
    return f"{number:,.2f}".rstrip("0").rstrip(".")


def _escape_table(value: str) -> str:
    return value.replace("|", "/").replace("\n", " ")


def _shorten(value: str, limit: int) -> str:
    if len(value) <= limit:
        return value
    return value[: limit - 3].rstrip() + "..."
