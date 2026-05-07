from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime
from typing import Any


@dataclass(frozen=True)
class PortfolioPosition:
    ticker: str
    company: str
    shares: float
    current_price: float | None = None
    market_value: float | None = None
    currency_note: str | None = None
    cost_basis: float | None = None

    @classmethod
    def from_dict(cls, data: dict[str, Any]) -> "PortfolioPosition":
        return cls(
            ticker=str(data["ticker"]).upper(),
            company=str(data.get("company", data["ticker"])),
            shares=float(data["shares"]),
            current_price=_optional_float(data.get("current_price")),
            market_value=_optional_float(data.get("market_value")),
            currency_note=data.get("currency_note"),
            cost_basis=_optional_float(data.get("cost_basis")),
        )


@dataclass(frozen=True)
class Quote:
    ticker: str
    source_symbol: str
    price: float | None
    previous_close: float | None = None
    day_change_pct: float | None = None
    volume: float | None = None
    avg_volume: float | None = None
    relative_volume: float | None = None
    week_change_pct: float | None = None
    month_change_pct: float | None = None
    ma_50: float | None = None
    ma_200: float | None = None
    rsi_14: float | None = None
    atr_14: float | None = None
    currency: str | None = None
    as_of: datetime | None = None
    source: str = "unavailable"
    error: str | None = None

    @property
    def has_price(self) -> bool:
        return self.price is not None and self.price > 0


@dataclass(frozen=True)
class NewsItem:
    title: str
    url: str
    source: str
    published_at: str | None = None
    summary: str | None = None


@dataclass(frozen=True)
class EarningsEvent:
    ticker: str
    date: str | None
    source: str
    url: str | None = None
    estimate_revision_summary: str | None = None
    error: str | None = None


@dataclass(frozen=True)
class PositionMetrics:
    ticker: str
    market_value: float | None
    weight: float | None
    price_available: bool
    value_source: str
    daily_gain_loss: float | None = None
    daily_gain_loss_pct: float | None = None
    unrealized_gain_loss: float | None = None
    unrealized_gain_loss_pct: float | None = None


@dataclass(frozen=True)
class ActionRecommendation:
    signal: str
    suggested_action: str
    urgency: str
    reason: str
    sell_fraction_of_position: float | None = None
    buy_fraction_of_portfolio: float | None = None
    approximate_shares: float | None = None
    approximate_dollars: float | None = None
    max_position_size: float | None = None


@dataclass(frozen=True)
class PositionAnalysis:
    position: PortfolioPosition
    quote: Quote
    metrics: PositionMetrics
    action: ActionRecommendation
    thesis: str
    latest_news_summary: str
    technical_condition: str
    fundamental_risk: str
    invalidation_trigger: str
    next_action: str
    sources: list[str] = field(default_factory=list)


@dataclass(frozen=True)
class BuyCandidateAnalysis:
    ticker: str
    name: str
    implementation: str
    reason_to_consider: str
    entry_zone: str
    suggested_allocation: float
    approximate_dollars: float | None
    approximate_shares: float | None
    max_weight: float
    risk: str
    source_url: str | None = None


def _optional_float(value: Any) -> float | None:
    if value in (None, ""):
        return None
    return float(value)
