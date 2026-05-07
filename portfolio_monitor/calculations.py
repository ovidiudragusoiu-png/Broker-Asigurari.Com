from __future__ import annotations

from collections.abc import Iterable

from .models import PortfolioPosition, PositionMetrics, Quote


def calculate_market_value(
    position: PortfolioPosition,
    quote: Quote | None = None,
    *,
    allow_snapshot_fallback: bool = False,
) -> tuple[float | None, bool, str]:
    if quote and quote.has_price:
        return position.shares * quote.price, True, quote.source
    if allow_snapshot_fallback and position.market_value is not None:
        return position.market_value, False, "portfolio_snapshot"
    if allow_snapshot_fallback and position.current_price is not None:
        return position.shares * position.current_price, False, "portfolio_snapshot"
    return None, False, "price_unavailable"


def calculate_position_metrics(
    positions: Iterable[PortfolioPosition],
    quotes: dict[str, Quote],
    *,
    allow_snapshot_fallback: bool = False,
) -> dict[str, PositionMetrics]:
    positions = list(positions)
    values: dict[str, tuple[float | None, bool, str]] = {
        position.ticker: calculate_market_value(
            position,
            quotes.get(position.ticker),
            allow_snapshot_fallback=allow_snapshot_fallback,
        )
        for position in positions
    }
    total = sum(value for value, _, _ in values.values() if value is not None)

    metrics: dict[str, PositionMetrics] = {}
    for position in positions:
        quote = quotes.get(position.ticker)
        market_value, price_available, value_source = values[position.ticker]
        weight = market_value / total if market_value is not None and total > 0 else None

        daily_gl = None
        if quote and quote.previous_close and quote.has_price:
            daily_gl = (quote.price - quote.previous_close) * position.shares

        unrealized_gl = None
        unrealized_gl_pct = None
        if position.cost_basis is not None and quote and quote.has_price:
            cost_value = position.cost_basis * position.shares
            unrealized_gl = market_value - cost_value if market_value is not None else None
            unrealized_gl_pct = unrealized_gl / cost_value if unrealized_gl is not None and cost_value else None

        metrics[position.ticker] = PositionMetrics(
            ticker=position.ticker,
            market_value=market_value,
            weight=weight,
            price_available=price_available,
            value_source=value_source,
            daily_gain_loss=daily_gl,
            daily_gain_loss_pct=quote.day_change_pct if quote else None,
            unrealized_gain_loss=unrealized_gl,
            unrealized_gain_loss_pct=unrealized_gl_pct,
        )
    return metrics


def total_portfolio_value(metrics: Iterable[PositionMetrics]) -> float | None:
    values = [metric.market_value for metric in metrics if metric.market_value is not None]
    if not values:
        return None
    return sum(values)


def position_weight(market_value: float, total_value: float) -> float:
    if total_value <= 0:
        raise ValueError("total_value must be positive")
    return market_value / total_value


def sell_trade_size(
    *,
    shares: float,
    price: float | None,
    sell_fraction_of_position: float,
) -> tuple[float, float | None]:
    if not 0 < sell_fraction_of_position <= 1:
        raise ValueError("sell_fraction_of_position must be between 0 and 1")
    shares_to_sell = shares * sell_fraction_of_position
    dollars = shares_to_sell * price if price is not None and price > 0 else None
    return shares_to_sell, dollars


def buy_trade_size(
    *,
    portfolio_value: float | None,
    price: float | None,
    buy_fraction_of_portfolio: float,
) -> tuple[float | None, float | None]:
    if not 0 < buy_fraction_of_portfolio <= 1:
        raise ValueError("buy_fraction_of_portfolio must be between 0 and 1")
    if portfolio_value is None or portfolio_value <= 0:
        return None, None
    dollars = portfolio_value * buy_fraction_of_portfolio
    shares = dollars / price if price is not None and price > 0 else None
    return shares, dollars


def gradual_trim_fraction(
    *,
    current_weight: float | None,
    target_weight: float,
    default_fraction: float,
) -> float | None:
    if current_weight is None or current_weight <= target_weight:
        return None

    # Cap the first trim to a gradual step unless the concentration is far above target.
    gap = current_weight - target_weight
    fraction_needed_to_target = gap / current_weight
    return min(max(default_fraction, fraction_needed_to_target / 4), 0.15)
