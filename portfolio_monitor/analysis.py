from __future__ import annotations

from typing import Any

from .calculations import buy_trade_size, gradual_trim_fraction, sell_trade_size, total_portfolio_value
from .models import (
    ActionRecommendation,
    BuyCandidateAnalysis,
    EarningsEvent,
    NewsItem,
    PortfolioPosition,
    PositionAnalysis,
    PositionMetrics,
    Quote,
)


NEGATIVE_TERMS = {
    "downgrade",
    "miss",
    "lawsuit",
    "probe",
    "cuts",
    "layoffs",
    "guidance cut",
    "shortfall",
    "bankruptcy",
    "delisting",
    "fraud",
    "falls",
    "drops",
    "nosediving",
    "slump",
    "tumbles",
    "warning",
}
POSITIVE_TERMS = {
    "upgrade",
    "beats",
    "raises guidance",
    "partnership",
    "record",
    "accelerates",
    "growth",
    "profit",
    "buyback",
    "launches",
    "ai demand",
}
DISTRESSED_TICKERS = {"CHGG", "FUBO"}
SPECULATIVE_TICKERS = {"HNST", "CHGG", "FUBO", "SOFI"}
AI_SEMI_TICKERS = {"AMD", "AVGO", "META"}


def analyze_positions(
    *,
    positions: list[PortfolioPosition],
    quotes: dict[str, Quote],
    metrics: dict[str, PositionMetrics],
    news: dict[str, list[NewsItem]],
    earnings: dict[str, EarningsEvent],
    config: dict[str, Any],
) -> list[PositionAnalysis]:
    rules = config["risk_rules"]
    analyses: list[PositionAnalysis] = []
    portfolio_value = total_portfolio_value(metrics.values())
    extreme_concentration_present = any(
        metric.weight is not None and metric.weight > config["risk_rules"]["extreme_concentration_weight"]
        for metric in metrics.values()
    )

    for position in positions:
        quote = quotes[position.ticker]
        metric = metrics[position.ticker]
        target = config.get("position_targets", {}).get(position.ticker, {})
        target_max = float(target.get("max_weight", rules["normal_max_position"]))
        ticker_news = news.get(position.ticker, [])
        action = _recommend_action(
            position=position,
            quote=quote,
            metric=metric,
            news_items=ticker_news,
            earnings_event=earnings.get(position.ticker),
            portfolio_value=portfolio_value,
            extreme_concentration_present=extreme_concentration_present,
            target_max=target_max,
            rules=rules,
        )

        analyses.append(
            PositionAnalysis(
                position=position,
                quote=quote,
                metrics=metric,
                action=action,
                thesis=_thesis(position.ticker, position.company),
                latest_news_summary=_news_summary(ticker_news),
                technical_condition=_technical_condition(quote),
                fundamental_risk=_fundamental_risk(position.ticker, metric, earnings.get(position.ticker)),
                invalidation_trigger=_invalidation_trigger(position.ticker, quote, target_max),
                next_action=_next_action(action, portfolio_value),
                sources=_sources_for_position(position.ticker, quote, ticker_news, earnings.get(position.ticker)),
            )
        )
    return analyses


def analyze_buy_candidates(
    *,
    candidates: list[dict[str, Any]],
    quotes: dict[str, Quote],
    portfolio_value: float | None,
    market_risk_high: bool,
) -> list[BuyCandidateAnalysis]:
    analyses: list[BuyCandidateAnalysis] = []
    for candidate in candidates:
        ticker = candidate["ticker"]
        quote = quotes.get(ticker)
        allocation = float(candidate.get("suggested_allocation", 0.03))
        max_weight = float(candidate.get("max_weight", 0.10))
        price = quote.price if quote and quote.has_price else None
        shares, dollars = buy_trade_size(
            portfolio_value=portfolio_value,
            price=price,
            buy_fraction_of_portfolio=allocation,
        )

        analyses.append(
            BuyCandidateAnalysis(
                ticker=ticker,
                name=candidate.get("name", ticker),
                implementation=_candidate_implementation(candidate),
                reason_to_consider=_candidate_reason(candidate, market_risk_high),
                entry_zone=_candidate_entry_zone(quote),
                suggested_allocation=allocation,
                approximate_dollars=dollars if price is not None else None,
                approximate_shares=shares,
                max_weight=max_weight,
                risk=_candidate_risk(candidate, market_risk_high),
                source_url=f"https://finance.yahoo.com/quote/{ticker}" if quote else None,
            )
        )
    return analyses


def market_regime_summary(context_quotes: dict[str, Quote], macro_news: list[NewsItem]) -> tuple[str, bool]:
    spx = context_quotes.get("S&P 500")
    ndx = context_quotes.get("Nasdaq 100")
    vix = context_quotes.get("VIX")
    ten_year = context_quotes.get("10Y Treasury yield")

    risk_high = False
    observations: list[str] = []
    observations.append(f"S&P 500: {_trend_phrase(spx)}")
    observations.append(f"Nasdaq 100: {_trend_phrase(ndx)}")

    if vix and vix.price is not None:
        risk_high = risk_high or vix.price >= 25
        observations.append(f"VIX: {vix.price:.2f} ({'elevated' if vix.price >= 20 else 'contained'})")
    else:
        observations.append("VIX: unavailable")

    if ten_year and ten_year.price is not None:
        observations.append(f"10Y yield proxy: {ten_year.price:.2f}")
    else:
        observations.append("10Y yield: unavailable")

    if macro_news:
        observations.append("Major macro/news themes: " + "; ".join(item.title for item in macro_news[:3]))
    else:
        observations.append("Major macro/news themes: news unavailable")

    return " | ".join(observations), risk_high


def _recommend_action(
    *,
    position: PortfolioPosition,
    quote: Quote,
    metric: PositionMetrics,
    news_items: list[NewsItem],
    earnings_event: EarningsEvent | None,
    portfolio_value: float | None,
    extreme_concentration_present: bool,
    target_max: float,
    rules: dict[str, Any],
) -> ActionRecommendation:
    weight = metric.weight
    sentiment = _headline_sentiment(news_items)
    is_distressed = position.ticker in DISTRESSED_TICKERS
    price_available = quote.has_price

    if not price_available:
        return ActionRecommendation(
            signal="Hold",
            suggested_action="Hold pending price refresh",
            urgency="Low",
            reason="Latest price data is unavailable, so the automation will not generate trade amounts.",
        )

    if weight is not None and weight > rules["extreme_concentration_weight"]:
        fraction = gradual_trim_fraction(
            current_weight=weight,
            target_weight=target_max,
            default_fraction=rules["gradual_trim_fraction"],
        )
        fraction = fraction or rules["gradual_trim_fraction"]
        shares, dollars = sell_trade_size(
            shares=position.shares,
            price=quote.price,
            sell_fraction_of_position=fraction,
        )
        urgency = "High" if _negative_technical_breakdown(quote) or sentiment < 0 else "Medium"
        return ActionRecommendation(
            signal="Trim",
            suggested_action=f"Trim {position.ticker} by {fraction:.1%} of position (~{(weight * fraction):.1%} of portfolio)",
            urgency=urgency,
            reason=(
                f"{position.ticker} is an extreme concentration at {_fmt_pct(weight)} versus a "
                f"{_fmt_pct(target_max)} exceptional-conviction cap; gradual rebalancing reduces "
                "single-stock risk without forcing a full exit."
            ),
            sell_fraction_of_position=fraction,
            approximate_shares=shares,
            approximate_dollars=dollars,
            max_position_size=target_max,
        )

    if weight is not None and weight > rules["high_concentration_weight"]:
        fraction = rules["gradual_trim_fraction"]
        shares, dollars = sell_trade_size(
            shares=position.shares,
            price=quote.price,
            sell_fraction_of_position=fraction,
        )
        return ActionRecommendation(
            signal="Trim",
            suggested_action=f"Trim {position.ticker} by {fraction:.1%} of position (~{(weight * fraction):.1%} of portfolio)",
            urgency="Medium",
            reason=f"{position.ticker} is above the high-concentration threshold of {_fmt_pct(rules['high_concentration_weight'])}.",
            sell_fraction_of_position=fraction,
            approximate_shares=shares,
            approximate_dollars=dollars,
            max_position_size=target_max,
        )

    if weight is not None and weight > target_max:
        fraction = rules["gradual_trim_fraction"]
        shares, dollars = sell_trade_size(
            shares=position.shares,
            price=quote.price,
            sell_fraction_of_position=fraction,
        )
        return ActionRecommendation(
            signal="Trim",
            suggested_action=f"Trim {position.ticker} by {fraction:.1%} of position (~{(weight * fraction):.1%} of portfolio)",
            urgency="Low",
            reason=f"Position weight {_fmt_pct(weight)} is above configured target {_fmt_pct(target_max)}.",
            sell_fraction_of_position=fraction,
            approximate_shares=shares,
            approximate_dollars=dollars,
            max_position_size=target_max,
        )

    if is_distressed:
        return ActionRecommendation(
            signal="Watchlist Only",
            suggested_action=f"Avoid adding {position.ticker}; monitor for proof of stabilization",
            urgency="Low",
            reason="Distressed/small-cap exposure should remain capped at 1%-2% until revenue, margin, or balance-sheet evidence improves.",
            max_position_size=target_max,
        )

    if position.ticker in SPECULATIVE_TICKERS and position.ticker != "SOFI":
        return ActionRecommendation(
            signal="Watchlist Only",
            suggested_action=f"Avoid adding {position.ticker}; keep speculative sizing capped",
            urgency="Low",
            reason="Speculative/small-cap exposure should stay small unless fresh earnings and news evidence validate the thesis.",
            max_position_size=target_max,
        )

    if _negative_technical_breakdown(quote) and sentiment < 0:
        return ActionRecommendation(
            signal="Sell / Exit",
            suggested_action=f"Consider exiting or materially reducing {position.ticker}",
            urgency="High",
            reason="Negative headlines are coinciding with a technical breakdown below key moving averages.",
            sell_fraction_of_position=0.25,
            approximate_shares=position.shares * 0.25,
            approximate_dollars=position.shares * 0.25 * quote.price,
            max_position_size=target_max,
        )

    if _constructive_technical_setup(quote) and sentiment >= 0 and weight is not None and weight < target_max * 0.5:
        if extreme_concentration_present:
            return ActionRecommendation(
                signal="Hold",
                suggested_action=f"Hold {position.ticker}; defer add-ons until AMD concentration is reduced",
                urgency="Low",
                reason="Portfolio-level concentration risk is the dominant issue, so new add-ons should wait until rebalancing lowers single-stock exposure.",
                max_position_size=target_max,
            )
        buy_fraction = min(0.02, target_max - weight)
        buy_shares, buy_dollars = buy_trade_size(
            portfolio_value=portfolio_value,
            price=quote.price,
            buy_fraction_of_portfolio=buy_fraction,
        )
        return ActionRecommendation(
            signal="Buy Small",
            suggested_action=f"Add-on buy: optional small add to {position.ticker} at {buy_fraction:.1%} of portfolio",
            urgency="Low",
            reason="Trend is constructive and current sizing is well below the configured maximum; keep additions incremental.",
            buy_fraction_of_portfolio=buy_fraction,
            approximate_shares=buy_shares,
            approximate_dollars=buy_dollars,
            max_position_size=target_max,
        )

    return ActionRecommendation(
        signal="Hold",
        suggested_action=f"Hold {position.ticker}",
        urgency="Low",
        reason="No concentration breach, thesis break, severe news risk, or technical breakdown requires immediate action.",
        max_position_size=target_max,
    )


def _thesis(ticker: str, company: str) -> str:
    if ticker == "AMD":
        return f"{company} remains a long-term AI/semiconductor growth holding, but portfolio risk is dominated by position size."
    if ticker == "AVGO":
        return f"{company} provides profitable AI infrastructure and semiconductor/software exposure."
    if ticker == "META":
        return f"{company} combines advertising cash flow with AI infrastructure and product optionality."
    if ticker in {"ELF", "CELH", "HNST"}:
        return f"{company} is tied to consumer discretionary demand, brand execution, and retail channel momentum."
    if ticker == "SOFI":
        return f"{company} is a fintech growth position sensitive to credit quality, rates, and member growth."
    if ticker == "TTD":
        return f"{company} is a digital advertising growth holding sensitive to ad budgets and platform competition."
    if ticker in DISTRESSED_TICKERS:
        return f"{company} is high-risk and should be treated as speculative/distressed until fundamentals stabilize."
    return f"{company} is monitored for fit with long-term growth and risk-controlled portfolio construction."


def _news_summary(items: list[NewsItem]) -> str:
    if not items:
        return "news unavailable"
    return "; ".join(item.title for item in items[:3])


def _technical_condition(quote: Quote) -> str:
    if not quote.has_price:
        return "price data unavailable"
    parts = []
    if quote.ma_50:
        parts.append("above 50-DMA" if quote.price > quote.ma_50 else "below 50-DMA")
    if quote.ma_200:
        parts.append("above 200-DMA" if quote.price > quote.ma_200 else "below 200-DMA")
    if quote.rsi_14:
        if quote.rsi_14 >= 70:
            parts.append(f"RSI overbought at {quote.rsi_14:.1f}")
        elif quote.rsi_14 <= 30:
            parts.append(f"RSI oversold at {quote.rsi_14:.1f}")
        else:
            parts.append(f"RSI neutral at {quote.rsi_14:.1f}")
    if quote.relative_volume:
        parts.append(f"relative volume {quote.relative_volume:.1f}x")
    return ", ".join(parts) if parts else "technical data unavailable"


def _fundamental_risk(ticker: str, metric: PositionMetrics, earnings_event: EarningsEvent | None) -> str:
    risk = []
    if metric.weight is not None and metric.weight > 0.35:
        risk.append("single-stock concentration risk")
    if ticker in AI_SEMI_TICKERS:
        risk.append("AI capex cycle, semiconductor demand, export controls, and valuation sensitivity")
    if ticker in {"ELF", "CELH", "HNST"}:
        risk.append("consumer discretionary demand, retail inventory, and margin pressure")
    if ticker == "SOFI":
        risk.append("credit cycle, funding costs, regulation, and rate sensitivity")
    if ticker == "TTD":
        risk.append("advertising budget cyclicality and platform competition")
    if ticker in DISTRESSED_TICKERS:
        risk.append("distressed/small-cap execution and financing risk")
    if earnings_event and earnings_event.date:
        risk.append(f"next reported earnings date: {earnings_event.date}")
    if earnings_event and earnings_event.estimate_revision_summary:
        risk.append(f"analyst estimate revisions: {earnings_event.estimate_revision_summary}")
    elif earnings_event and earnings_event.error:
        risk.append("earnings calendar / analyst estimate revisions unavailable")
    return "; ".join(risk) if risk else "no special fundamental risk flagged"


def _invalidation_trigger(ticker: str, quote: Quote, target_max: float) -> str:
    if not quote.has_price:
        return "Refresh price data before changing sizing."
    triggers = [f"reassess if {ticker} breaks below its 200-DMA on heavy volume"]
    if quote.ma_200:
        triggers.append(f"200-DMA reference: approximately ${quote.ma_200:.2f}")
    triggers.append("or if company news shows thesis deterioration rather than normal volatility")
    if ticker == "AMD":
        triggers.append(f"concentration remains invalid above the {_fmt_pct(target_max)} exceptional-conviction target")
    return "; ".join(triggers)


def _next_action(action: ActionRecommendation, portfolio_value: float | None) -> str:
    if action.signal in {"Trim", "Sell / Exit"}:
        if action.approximate_dollars is None:
            return "Do not size a trade until price data is available."
        return (
            f"If you agree with the rationale, consider {action.suggested_action.lower()} "
            f"for about ${action.approximate_dollars:,.0f}; final decision is yours."
        )
    if action.signal in {"Strong Buy / Add", "Buy Small"} and action.buy_fraction_of_portfolio:
        dollars = portfolio_value * action.buy_fraction_of_portfolio if portfolio_value else None
        if dollars is None:
            return "Wait for a valid portfolio value before sizing any add."
        return f"Consider only an incremental add near {action.buy_fraction_of_portfolio:.1%} of portfolio, about ${dollars:,.0f}."
    return "Leave untouched unless new price, earnings, or news evidence changes the risk/reward."


def _sources_for_position(
    ticker: str,
    quote: Quote,
    news_items: list[NewsItem],
    earnings_event: EarningsEvent | None,
) -> list[str]:
    sources = [f"https://finance.yahoo.com/quote/{quote.source_symbol}"]
    sources.extend(item.url for item in news_items[:5])
    if earnings_event and earnings_event.url:
        sources.append(earnings_event.url)
    return sources


def _headline_sentiment(items: list[NewsItem]) -> int:
    score = 0
    text = " ".join(item.title.lower() for item in items)
    for term in POSITIVE_TERMS:
        if term in text:
            score += 1
    for term in NEGATIVE_TERMS:
        if term in text:
            score -= 1
    return score


def _negative_technical_breakdown(quote: Quote) -> bool:
    if not quote.has_price:
        return False
    below_50 = quote.ma_50 is not None and quote.price < quote.ma_50
    below_200 = quote.ma_200 is not None and quote.price < quote.ma_200
    heavy_volume = quote.relative_volume is not None and quote.relative_volume >= 1.5
    return below_50 and (below_200 or heavy_volume)


def _constructive_technical_setup(quote: Quote) -> bool:
    if not quote.has_price:
        return False
    above_50 = quote.ma_50 is not None and quote.price > quote.ma_50
    above_200 = quote.ma_200 is not None and quote.price > quote.ma_200
    rsi_ok = quote.rsi_14 is None or 35 <= quote.rsi_14 <= 70
    return above_50 and above_200 and rsi_ok


def _trend_phrase(quote: Quote | None) -> str:
    if not quote or not quote.has_price:
        return "unavailable"
    monthly = f"{quote.month_change_pct:.1%} 1M" if quote.month_change_pct is not None else "1M unavailable"
    ma = "above 50-DMA" if quote.ma_50 and quote.price > quote.ma_50 else "below/unknown 50-DMA"
    return f"{quote.price:.2f}, {monthly}, {ma}"


def _candidate_reason(candidate: dict[str, Any], market_risk_high: bool) -> str:
    candidate_type = candidate.get("type", "")
    if "cash_tbill" in candidate_type:
        return "Cash/T-bill exposure can dampen volatility and preserve dry powder after concentration trims."
    if "semiconductor" in candidate_type:
        return "Diversifies AI semiconductor exposure away from a single-stock AMD concentration."
    if "ucits" in candidate_type:
        return "Potential ETF implementation path for European investors; verify broker availability, currency, tax, and domicile."
    if "broad_market" in candidate_type:
        return "Broad-market exposure can rebalance single-stock risk while keeping long-term equity compounding."
    if market_risk_high:
        return "Quality candidate, but elevated market risk argues for smaller staged entries."
    return "Quality growth candidate that can diversify single-name risk if valuation and trend are reasonable."


def _candidate_implementation(candidate: dict[str, Any]) -> str:
    candidate_type = candidate.get("type", "")
    if "cash_tbill" in candidate_type:
        return "cash reserve / rebalance"
    if "etf" in candidate_type or "ucits" in candidate_type:
        return "new buy / rebalance"
    return "new buy"


def _candidate_entry_zone(quote: Quote | None) -> str:
    if not quote or not quote.has_price:
        return "price unavailable; do not size a buy"
    if quote.ma_50:
        return f"Prefer staged entries near the 50-DMA (${quote.ma_50:.2f}) or after a constructive base."
    return f"Use staged entries around current price ${quote.price:.2f}; require refreshed data first."


def _candidate_risk(candidate: dict[str, Any], market_risk_high: bool) -> str:
    risks = []
    if "semiconductor" in candidate.get("type", ""):
        risks.append("cyclical semiconductor drawdowns and valuation compression")
    if "ucits" in candidate.get("type", ""):
        risks.append("currency, withholding-tax, and product-domicile considerations")
    if "cash_tbill" in candidate.get("type", ""):
        risks.append("reinvestment risk if rates fall")
    if market_risk_high:
        risks.append("elevated macro volatility")
    return "; ".join(risks) if risks else "normal equity market and valuation risk"


def _fmt_pct(value: float | None) -> str:
    return "n/a" if value is None else f"{value:.1%}"
