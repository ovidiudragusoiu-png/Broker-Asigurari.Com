"""Portfolio analysis, scoring, risk rules, and action sizing."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any

from market_data import MarketSnapshot, classify_technical_trend, technical_score
from news_fetcher import aggregate_sentiment


@dataclass
class Recommendation:
    ticker: str
    action: str
    shares: float
    approx_dollars: float
    timing: str
    confidence: str
    reason: str
    risk_warning: str
    invalidation: str
    suggested_limit_price: float | None = None
    execution_style: str | None = None
    score: int = 0

    def as_dict(self) -> dict[str, Any]:
        return {
            "ticker": self.ticker,
            "action": self.action,
            "shares": self.shares,
            "approx_dollars": self.approx_dollars,
            "timing": self.timing,
            "confidence": self.confidence,
            "reason": self.reason,
            "risk_warning": self.risk_warning,
            "invalidation": self.invalidation,
            "suggested_limit_price": self.suggested_limit_price,
            "execution_style": self.execution_style,
            "score": self.score,
        }


class PortfolioAnalyzer:
    """Applies portfolio sizing, risk, sentiment, and technical rules."""

    def __init__(self, config: dict[str, Any]) -> None:
        self.config = config
        self.risk = config.get("risk", {})
        self.portfolio_config = config.get("portfolio", {})
        self.cash_available = self._cash_available()

    def analyze(
        self,
        market_data: dict[str, MarketSnapshot],
        news_data: dict[str, Any],
        macro_data: dict[str, MarketSnapshot],
    ) -> dict[str, Any]:
        positions = self.portfolio_config.get("positions", [])
        values = self._position_values(positions, market_data)
        total_value = sum(item["current_value"] for item in values)
        if self.cash_available:
            total_value += self.cash_available
        if total_value <= 0:
            total_value = float(self.portfolio_config.get("estimated_total_value_usd") or 0)

        ticker_results = []
        for item in values:
            ticker = item["ticker"]
            snapshot = market_data.get(ticker)
            news_items = news_data.get("ticker_news", {}).get(ticker, [])
            sentiment_label, sentiment_score, sentiment_evidence = aggregate_sentiment(news_items)
            trend = classify_technical_trend(snapshot) if snapshot else "Neutral"
            score_parts = self._score_parts(
                item,
                snapshot,
                news_items,
                sentiment_score,
                trend,
                total_value,
                news_data,
            )
            total_score = max(-10, min(10, sum(score_parts.values())))
            weight_pct = item["current_value"] / total_value * 100 if total_value else 0
            recommendation = self._recommend(
                item=item,
                snapshot=snapshot,
                score=total_score,
                weight_pct=weight_pct,
                sentiment_label=sentiment_label,
                trend=trend,
                news_evidence=sentiment_evidence,
            )
            ticker_results.append(
                {
                    **item,
                    "weight_pct": weight_pct,
                    "daily_price_change": snapshot.day_change if snapshot else None,
                    "daily_price_change_pct": snapshot.day_change_pct if snapshot else None,
                    "daily_dollar_impact": (
                        item["shares"] * snapshot.day_change
                        if snapshot and snapshot.day_change is not None
                        else None
                    ),
                    "sector": item.get("sector", "Unknown"),
                    "risk_category": item.get("risk_category", "Medium"),
                    "news_sentiment": sentiment_label,
                    "news_evidence": sentiment_evidence,
                    "technical_trend": trend,
                    "score_parts": score_parts,
                    "score": total_score,
                    "recommendation": recommendation.as_dict(),
                    "market_data": snapshot.as_dict() if snapshot else {},
                    "earnings": news_data.get("earnings", {}).get(ticker, {}),
                    "analyst_events": news_data.get("analyst_events", {}).get(ticker, []),
                    "sec_filings": news_data.get("sec_filings", {}).get(ticker, []),
                    "insider_events": news_data.get("insider_events", {}).get(ticker, []),
                    "news": news_items,
                }
            )

        sector_exposure = self._sector_exposure(ticker_results, total_value)
        concentration = self._concentration_summary(ticker_results)
        macro_summary = self._macro_summary(macro_data, news_data.get("macro_news", []))
        portfolio_status = self._portfolio_status(ticker_results, macro_data)

        return {
            "generated_inputs": {
                "cash_available_usd": self.cash_available,
                "cash_known": self.cash_available is not None,
                "total_value_usd": total_value,
            },
            "portfolio_status": portfolio_status,
            "positions": sorted(ticker_results, key=lambda item: item["weight_pct"], reverse=True),
            "sector_exposure": sector_exposure,
            "concentration": concentration,
            "macro": macro_summary,
            "recommended_actions": [
                item["recommendation"]
                for item in ticker_results
                if item["recommendation"]["action"] not in {"Hold", "Watch only"}
            ],
            "source_notes": news_data.get("source_notes", []),
        }

    def _position_values(
        self, positions: list[dict[str, Any]], market_data: dict[str, MarketSnapshot]
    ) -> list[dict[str, Any]]:
        values = []
        for position in positions:
            ticker = position["ticker"]
            shares = float(position["shares"])
            snapshot = market_data.get(ticker)
            price = snapshot.price if snapshot and snapshot.price is not None else _to_float(position.get("current_price"))
            current_value = shares * price if price is not None else _to_float(position.get("current_value")) or 0.0
            values.append(
                {
                    **position,
                    "shares": shares,
                    "price": price,
                    "current_value": current_value,
                }
            )
        return values

    def _score_parts(
        self,
        item: dict[str, Any],
        snapshot: MarketSnapshot | None,
        news_items: list[dict[str, Any]],
        sentiment_score: int,
        trend: str,
        total_value: float,
        news_data: dict[str, Any],
    ) -> dict[str, int]:
        valuation = self._valuation_expectations_score(item, snapshot)
        earnings = self._earnings_guidance_score(
            item["ticker"],
            news_items,
            news_data.get("analyst_events", {}).get(item["ticker"], []),
        )
        sizing = self._sizing_score(item, total_value)
        return {
            "news_sentiment": max(-3, min(3, sentiment_score)),
            "technical_trend": technical_score(trend),
            "valuation_expectations_risk": valuation,
            "earnings_guidance_momentum": earnings,
            "portfolio_sizing_risk": sizing,
        }

    def _valuation_expectations_score(
        self, item: dict[str, Any], snapshot: MarketSnapshot | None
    ) -> int:
        risk_category = item.get("risk_category", "Medium")
        if not snapshot:
            return 0
        pe = snapshot.forward_pe or snapshot.trailing_pe
        if risk_category == "Speculative":
            return -1
        if pe is None:
            return 0
        if pe > 80:
            return -2
        if pe > 45:
            return -1
        if 0 < pe < 25 and risk_category in {"Low", "Medium"}:
            return 1
        return 0

    def _earnings_guidance_score(
        self,
        ticker: str,
        news_items: list[dict[str, Any]],
        analyst_events: list[dict[str, Any]],
    ) -> int:
        text = " ".join(
            [
                *(str(item.get("title", "")) + " " + str(item.get("summary", "")) for item in news_items),
                *(str(item.get("title", "")) for item in analyst_events),
            ]
        ).lower()
        positive = ["raise", "raises", "raised", "beat", "beats", "upgrade", "guidance above"]
        negative = ["cut guidance", "guidance cut", "miss", "misses", "downgrade", "warning", "below expectations"]
        score = 0
        if any(term in text for term in positive):
            score += 1
        if any(term in text for term in negative):
            score -= 1
        if "thesis-breaking" in text or "fraud" in text:
            score -= 1
        return max(-2, min(2, score))

    def _sizing_score(self, item: dict[str, Any], total_value: float) -> int:
        if total_value <= 0:
            return 0
        weight_pct = item["current_value"] / total_value * 100
        risk_category = item.get("risk_category", "Medium")
        if weight_pct > float(self.risk.get("concentration_warning_pct", 25)):
            return -1
        if risk_category == "Speculative" and weight_pct < float(self.risk.get("speculative_max_weight_pct", 3)):
            return 0
        if weight_pct < 1 and risk_category in {"Low", "Medium"}:
            return 1
        return 0

    def _recommend(
        self,
        item: dict[str, Any],
        snapshot: MarketSnapshot | None,
        score: int,
        weight_pct: float,
        sentiment_label: str,
        trend: str,
        news_evidence: str,
    ) -> Recommendation:
        ticker = item["ticker"]
        price = item.get("price") or item.get("current_price") or 0
        risk_category = item.get("risk_category", "Medium")
        max_target = float(self.risk.get("max_single_stock_target_pct", 35))
        critical = float(self.risk.get("concentration_critical_pct", 50))
        speculative_max = float(self.risk.get("speculative_max_weight_pct", 3))

        if ticker == "AMD" and weight_pct >= critical:
            trim_pct = float((self.risk.get("amd_default_trim_steps_pct") or [5])[0])
            shares = round(item["shares"] * trim_pct / 100, 2)
            dollars = round(shares * price, 2)
            return Recommendation(
                ticker=ticker,
                action="Trim",
                shares=shares,
                approx_dollars=dollars,
                timing="Sell in stages; start with a 5% position trim unless tax review argues for waiting.",
                confidence="High",
                reason=(
                    f"AMD is {weight_pct:.1f}% of the portfolio versus a {max_target:.0f}% "
                    "single-stock target. This is risk management, not a thesis rejection. "
                    f"Current score {score}/10; news: {news_evidence}"
                ),
                risk_warning=(
                    "Trimming can reduce upside if AI/semi momentum continues. Review taxes and avoid "
                    "selling all AMD at once unless a severe thesis-breaking event occurs."
                ),
                invalidation=(
                    "If weight falls below the target band or cash/hedges materially reduce concentration, "
                    "switch from trimming to hold."
                ),
                suggested_limit_price=round(price * 0.995, 2) if price else None,
                execution_style="Staged limit order",
                score=score,
            )

        if risk_category == "Speculative" and weight_pct > speculative_max:
            shares = self._trim_to_weight(item, weight_pct, speculative_max, price)
            return self._trim_recommendation(
                item,
                shares,
                price,
                score,
                f"Speculative position exceeds the {speculative_max:.0f}% sizing rule.",
                "Staged limit order",
                "Trim toward speculative sizing cap; do not add unless fundamentals improve.",
            )

        if score >= 6 and weight_pct <= max_target and risk_category != "Speculative":
            return self._buy_recommendation(item, price, score, sentiment_label, trend, news_evidence, small=False)
        if 2 <= score <= 5 and weight_pct <= max_target and risk_category != "Speculative":
            return self._buy_recommendation(item, price, score, sentiment_label, trend, news_evidence, small=True)
        if -5 <= score <= -2:
            if self._has_material_negative_trigger(
                item=item,
                score=score,
                weight_pct=weight_pct,
                sentiment_label=sentiment_label,
                trend=trend,
            ):
                shares = round(item["shares"] * 0.05, 2)
                return self._trim_recommendation(
                    item,
                    shares,
                    price,
                    score,
                    f"Score {score}/10 has a confirmed negative trigger beyond normal volatility.",
                    "Staged limit order",
                    "Trim/watch closely; reassess after the next confirmed catalyst.",
                )
            return Recommendation(
                ticker=ticker,
                action="Watch only" if risk_category == "Speculative" else "Hold",
                shares=0,
                approx_dollars=0,
                timing=(
                    "Watch closely; do not trim on technical weakness alone unless bearish news, "
                    "guidance damage, or a decisive support break confirms the risk."
                ),
                confidence="Medium",
                reason=(
                    f"Score {score}/10 maps to trim/watch, but current evidence is not enough "
                    "for a size-changing trade under the long-term volatility-tolerant rules."
                ),
                risk_warning=self._risk_warning(item, weight_pct),
                invalidation=self._invalidation(item, snapshot),
                score=score,
            )
        if score <= -6:
            shares = round(item["shares"] * 0.15, 2)
            return self._trim_recommendation(
                item,
                shares,
                price,
                score,
                f"Score {score}/10 indicates a strong trim/sell candidate.",
                "Immediate or staged, depending on liquidity and tax review",
                "Reduce exposure because thesis, technicals, or guidance appear materially damaged.",
            )

        action = "Watch only" if risk_category == "Speculative" else "Hold"
        return Recommendation(
            ticker=ticker,
            action=action,
            shares=0,
            approx_dollars=0,
            timing="Review after the next material news, earnings update, or risk-level break.",
            confidence=self._confidence(score, snapshot, news_evidence),
            reason=(
                f"Score {score}/10 maps to hold/watch. Sentiment is {sentiment_label}; "
                f"technical trend is {trend}. No disciplined size-changing trigger was found."
            ),
            risk_warning=self._risk_warning(item, weight_pct),
            invalidation=self._invalidation(item, snapshot),
            score=score,
        )

    def _buy_recommendation(
        self,
        item: dict[str, Any],
        price: float,
        score: int,
        sentiment_label: str,
        trend: str,
        news_evidence: str,
        small: bool,
    ) -> Recommendation:
        if self.cash_available is None or self.cash_available <= 0:
            return Recommendation(
                ticker=item["ticker"],
                action="Hold",
                shares=0,
                approx_dollars=0,
                timing="Add only if CASH_AVAILABLE_USD is set or paired with an approved trim.",
                confidence="Medium" if score >= 6 else "Low",
                reason=(
                    f"Score {score}/10 supports {'buying' if score >= 6 else 'a small add'}, "
                    "but cash availability is unknown."
                ),
                risk_warning="Do not create forced turnover or margin exposure to fund this idea.",
                invalidation="If news turns bearish or trend breaks below major support, cancel the add.",
                suggested_limit_price=round(price * 0.99, 2) if price else None,
                score=score,
            )

        allocation_pct = (
            float(self.risk.get("default_add_small_allocation_pct_of_cash", 10))
            if small
            else float(self.risk.get("default_buy_allocation_pct_of_cash", 20))
        )
        dollars = max(
            float(self.risk.get("minimum_action_value_usd", 250)),
            self.cash_available * allocation_pct / 100,
        )
        dollars = min(dollars, self.cash_available)
        shares = round(dollars / price, 2) if price else 0
        action = "Add small" if small else "Buy"
        timing = "Wait for pullback; use a limit order near the suggested price."
        better_entry = round(price * 0.95, 2) if price else None
        return Recommendation(
            ticker=item["ticker"],
            action=action,
            shares=shares,
            approx_dollars=round(dollars, 2),
            timing=timing,
            confidence="High" if score >= 6 else "Medium",
            reason=(
                f"Score {score}/10 with {sentiment_label} news and {trend}. "
                f"Evidence: {news_evidence}. Better entry if patient: {better_entry}."
            ),
            risk_warning=self._risk_warning(item, item.get("weight_pct", 0)),
            invalidation="Cancel the buy if sentiment turns bearish, earnings guidance weakens, or price loses major support.",
            suggested_limit_price=round(price * 0.99, 2) if price else None,
            execution_style="Limit order",
            score=score,
        )

    def _trim_recommendation(
        self,
        item: dict[str, Any],
        shares: float,
        price: float,
        score: int,
        reason: str,
        execution_style: str,
        timing: str,
    ) -> Recommendation:
        dollars = round(shares * price, 2) if price else 0
        minimum = float(self.risk.get("minimum_action_value_usd", 250))
        if 0 < dollars < minimum:
            return Recommendation(
                ticker=item["ticker"],
                action="Watch only",
                shares=0,
                approx_dollars=0,
                timing=(
                    "Watch closely; proposed trim is below the minimum action size and "
                    "could create unnecessary turnover."
                ),
                confidence="Medium",
                reason=f"{reason} Estimated trade value {_fmt_money(dollars)} is below the configured minimum.",
                risk_warning=self._risk_warning(item, 0),
                invalidation=self._invalidation(item, None),
                score=score,
            )
        return Recommendation(
            ticker=item["ticker"],
            action="Trim" if score > -6 else "Sell",
            shares=shares,
            approx_dollars=dollars,
            timing=timing,
            confidence="Medium" if score > -6 else "High",
            reason=reason,
            risk_warning=(
                "Review tax impact before selling. Avoid market orders in thin or volatile names "
                "unless the thesis is clearly broken."
            ),
            invalidation=self._invalidation(item, None),
            suggested_limit_price=round(price * 0.995, 2) if price else None,
            execution_style=execution_style,
            score=score,
        )

    def _has_material_negative_trigger(
        self,
        item: dict[str, Any],
        score: int,
        weight_pct: float,
        sentiment_label: str,
        trend: str,
    ) -> bool:
        risk_category = item.get("risk_category", "Medium")
        high_risk_cap = float(self.risk.get("high_risk_max_weight_pct", 10))
        speculative_cap = float(self.risk.get("speculative_max_weight_pct", 3))
        if sentiment_label == "Bearish":
            return True
        if score <= -4:
            return True
        if risk_category == "High" and weight_pct > high_risk_cap and trend in {"Downtrend", "Broken trend"}:
            return True
        if risk_category == "Speculative" and weight_pct > speculative_cap and trend in {"Downtrend", "Broken trend"}:
            return True
        return False

    def _trim_to_weight(
        self, item: dict[str, Any], current_weight_pct: float, target_weight_pct: float, price: float
    ) -> float:
        if price <= 0 or current_weight_pct <= target_weight_pct:
            return 0
        excess_ratio = (current_weight_pct - target_weight_pct) / current_weight_pct
        return round(item["shares"] * min(excess_ratio, 0.25), 2)

    def _sector_exposure(
        self, ticker_results: list[dict[str, Any]], total_value: float
    ) -> list[dict[str, Any]]:
        exposure: dict[str, float] = {}
        for item in ticker_results:
            exposure[item["sector"]] = exposure.get(item["sector"], 0) + item["current_value"]
        return [
            {
                "sector": sector,
                "value": value,
                "weight_pct": value / total_value * 100 if total_value else 0,
            }
            for sector, value in sorted(exposure.items(), key=lambda pair: pair[1], reverse=True)
        ]

    def _concentration_summary(self, ticker_results: list[dict[str, Any]]) -> dict[str, Any]:
        warning = float(self.risk.get("concentration_warning_pct", 25))
        critical = float(self.risk.get("concentration_critical_pct", 50))
        concentrated = [item for item in ticker_results if item["weight_pct"] >= warning]
        return {
            "warning_threshold_pct": warning,
            "critical_threshold_pct": critical,
            "positions_over_warning": [
                {"ticker": item["ticker"], "weight_pct": item["weight_pct"]}
                for item in sorted(concentrated, key=lambda row: row["weight_pct"], reverse=True)
            ],
            "message": (
                "AMD concentration is the dominant portfolio risk."
                if any(item["ticker"] == "AMD" for item in concentrated)
                else "No single position exceeds the concentration warning threshold."
            ),
        }

    def _macro_summary(
        self, macro_data: dict[str, MarketSnapshot], macro_news: list[dict[str, Any]]
    ) -> dict[str, Any]:
        return {
            "market_snapshots": {name: snapshot.as_dict() for name, snapshot in macro_data.items()},
            "news": macro_news,
        }

    def _portfolio_status(
        self, ticker_results: list[dict[str, Any]], macro_data: dict[str, MarketSnapshot]
    ) -> str:
        avg_score = (
            sum(item["score"] for item in ticker_results) / len(ticker_results)
            if ticker_results
            else 0
        )
        vix = macro_data.get("VIX")
        nasdaq = macro_data.get("Nasdaq")
        if vix and vix.price and vix.price >= 25:
            return "Defensive"
        if avg_score >= 2 and nasdaq and (nasdaq.day_change_pct or 0) >= 0:
            return "Risk-on"
        if avg_score <= -2:
            return "Defensive"
        return "Neutral"

    def _confidence(
        self, score: int, snapshot: MarketSnapshot | None, news_evidence: str
    ) -> str:
        if snapshot and not snapshot.missing_fields and "No recent news" not in news_evidence:
            return "Medium" if abs(score) < 6 else "High"
        return "Low"

    def _risk_warning(self, item: dict[str, Any], weight_pct: float) -> str:
        risk_category = item.get("risk_category", "Medium")
        if item["ticker"] == "AMD":
            return "AMD concentration can dominate portfolio outcomes; review staged trims and tax impact."
        if risk_category == "Speculative":
            return "Speculative/turnaround holding; keep size small and do not add without clear fundamental improvement."
        if risk_category == "High":
            return "High-volatility growth holding; size additions carefully and avoid reacting to normal volatility."
        if weight_pct > float(self.risk.get("concentration_warning_pct", 25)):
            return "Position exceeds concentration warning threshold."
        return "Normal equity risk; review taxes, liquidity, and personal risk tolerance before acting."

    def _invalidation(self, item: dict[str, Any], snapshot: MarketSnapshot | None) -> str:
        if snapshot and snapshot.ma_200:
            return (
                f"Reassess if price closes decisively below the 200-day moving average "
                f"near {snapshot.ma_200:.2f} with negative news."
            )
        return "Reassess after earnings, guidance changes, or material thesis-changing news."

    def _cash_available(self) -> float | None:
        value = self.portfolio_config.get("cash_available_usd")
        if value in ("", None):
            return None
        try:
            return float(value)
        except (TypeError, ValueError):
            return None


def _to_float(value: Any) -> float | None:
    if value is None:
        return None
    try:
        return float(value)
    except (TypeError, ValueError):
        return None


def _fmt_money(value: Any) -> str:
    if value is None:
        return "missing"
    try:
        return f"${float(value):,.2f}"
    except (TypeError, ValueError):
        return "missing"
