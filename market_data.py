"""Market data access and technical indicator calculations."""

from __future__ import annotations

import logging
from dataclasses import dataclass, field
from typing import Any

import pandas as pd
import yfinance as yf

LOGGER = logging.getLogger(__name__)


@dataclass
class MarketSnapshot:
    """Normalized market data for one instrument."""

    ticker: str
    data_symbol: str
    price: float | None = None
    previous_close: float | None = None
    day_change: float | None = None
    day_change_pct: float | None = None
    volume: float | None = None
    average_volume: float | None = None
    week_52_high: float | None = None
    week_52_low: float | None = None
    ma_20: float | None = None
    ma_50: float | None = None
    ma_200: float | None = None
    rsi_14: float | None = None
    volatility_30d: float | None = None
    beta: float | None = None
    trailing_pe: float | None = None
    forward_pe: float | None = None
    market_cap: float | None = None
    currency: str | None = None
    source_notes: list[str] = field(default_factory=list)
    missing_fields: list[str] = field(default_factory=list)

    def as_dict(self) -> dict[str, Any]:
        return {
            "ticker": self.ticker,
            "data_symbol": self.data_symbol,
            "price": self.price,
            "previous_close": self.previous_close,
            "day_change": self.day_change,
            "day_change_pct": self.day_change_pct,
            "volume": self.volume,
            "average_volume": self.average_volume,
            "week_52_high": self.week_52_high,
            "week_52_low": self.week_52_low,
            "ma_20": self.ma_20,
            "ma_50": self.ma_50,
            "ma_200": self.ma_200,
            "rsi_14": self.rsi_14,
            "volatility_30d": self.volatility_30d,
            "beta": self.beta,
            "trailing_pe": self.trailing_pe,
            "forward_pe": self.forward_pe,
            "market_cap": self.market_cap,
            "currency": self.currency,
            "source_notes": self.source_notes,
            "missing_fields": self.missing_fields,
        }


class MarketDataClient:
    """Fetches quote, historical, and macro market data using yfinance."""

    def __init__(self, timeout_seconds: int = 20) -> None:
        self.timeout_seconds = timeout_seconds

    def fetch_positions(self, positions: list[dict[str, Any]]) -> dict[str, MarketSnapshot]:
        snapshots: dict[str, MarketSnapshot] = {}
        for position in positions:
            ticker = position["ticker"]
            data_symbol = position.get("data_symbol") or ticker
            fallback_price = _to_float(position.get("current_price"))
            snapshot = self.fetch_symbol(ticker, data_symbol, fallback_price)
            snapshots[ticker] = snapshot
        return snapshots

    def fetch_macro(self) -> dict[str, MarketSnapshot]:
        symbols = {
            "Nasdaq": "^IXIC",
            "S&P 500": "^GSPC",
            "SOXX": "SOXX",
            "VIX": "^VIX",
            "US 10Y Yield": "^TNX",
            "USD Index": "DX-Y.NYB",
            "Oil WTI": "CL=F",
        }
        macro: dict[str, MarketSnapshot] = {}
        for label, symbol in symbols.items():
            macro[label] = self.fetch_symbol(label, symbol, None)
        return macro

    def fetch_symbol(
        self, ticker: str, data_symbol: str, fallback_price: float | None
    ) -> MarketSnapshot:
        snapshot = MarketSnapshot(ticker=ticker, data_symbol=data_symbol)
        try:
            yf_ticker = yf.Ticker(data_symbol)
            history = yf_ticker.history(period="1y", interval="1d", auto_adjust=False)
            info = self._safe_info(yf_ticker)
            self._apply_history(snapshot, history)
            self._apply_info(snapshot, info)
            if snapshot.price is None and fallback_price is not None:
                snapshot.price = fallback_price
                snapshot.source_notes.append("Using configured fallback price.")
        except Exception as exc:  # pragma: no cover - network/provider dependent
            LOGGER.warning("Failed to fetch market data for %s: %s", data_symbol, exc)
            snapshot.source_notes.append(f"Market data fetch failed: {exc}")
            if fallback_price is not None:
                snapshot.price = fallback_price
                snapshot.source_notes.append("Using configured fallback price.")

        if snapshot.price is not None and snapshot.previous_close is not None:
            snapshot.day_change = snapshot.price - snapshot.previous_close
            if snapshot.previous_close:
                snapshot.day_change_pct = snapshot.day_change / snapshot.previous_close * 100

        self._mark_missing(snapshot)
        return snapshot

    def _safe_info(self, yf_ticker: yf.Ticker) -> dict[str, Any]:
        try:
            return yf_ticker.get_info()
        except Exception as exc:  # pragma: no cover - network/provider dependent
            LOGGER.info("Ticker info unavailable: %s", exc)
            return {}

    def _apply_history(self, snapshot: MarketSnapshot, history: pd.DataFrame) -> None:
        if history.empty:
            snapshot.source_notes.append("No historical price data returned.")
            return

        close = history["Close"].dropna()
        if close.empty:
            snapshot.source_notes.append("Historical close series is empty.")
            return

        snapshot.price = float(close.iloc[-1])
        if len(close) > 1:
            snapshot.previous_close = float(close.iloc[-2])

        if "Volume" in history.columns and not history["Volume"].dropna().empty:
            snapshot.volume = float(history["Volume"].dropna().iloc[-1])
            if len(history["Volume"].dropna()) >= 30:
                snapshot.average_volume = float(history["Volume"].dropna().tail(30).mean())

        if "High" in history.columns and not history["High"].dropna().empty:
            snapshot.week_52_high = float(history["High"].dropna().max())
        if "Low" in history.columns and not history["Low"].dropna().empty:
            snapshot.week_52_low = float(history["Low"].dropna().min())

        snapshot.ma_20 = _moving_average(close, 20)
        snapshot.ma_50 = _moving_average(close, 50)
        snapshot.ma_200 = _moving_average(close, 200)
        snapshot.rsi_14 = _rsi(close, 14)
        snapshot.volatility_30d = _annualized_volatility(close, 30)

    def _apply_info(self, snapshot: MarketSnapshot, info: dict[str, Any]) -> None:
        price = _first_number(
            info,
            [
                "regularMarketPrice",
                "currentPrice",
                "postMarketPrice",
                "preMarketPrice",
                "previousClose",
            ],
        )
        if price is not None:
            snapshot.price = price

        previous_close = _first_number(info, ["regularMarketPreviousClose", "previousClose"])
        if previous_close is not None:
            snapshot.previous_close = previous_close

        snapshot.volume = _first_number(info, ["regularMarketVolume", "volume"]) or snapshot.volume
        snapshot.average_volume = _first_number(info, ["averageVolume", "averageVolume10days"]) or snapshot.average_volume
        snapshot.week_52_high = _first_number(info, ["fiftyTwoWeekHigh"]) or snapshot.week_52_high
        snapshot.week_52_low = _first_number(info, ["fiftyTwoWeekLow"]) or snapshot.week_52_low
        snapshot.beta = _first_number(info, ["beta"])
        snapshot.trailing_pe = _first_number(info, ["trailingPE"])
        snapshot.forward_pe = _first_number(info, ["forwardPE"])
        snapshot.market_cap = _first_number(info, ["marketCap"])
        snapshot.currency = info.get("currency")

    def _mark_missing(self, snapshot: MarketSnapshot) -> None:
        required = {
            "price": snapshot.price,
            "previous_close": snapshot.previous_close,
            "volume": snapshot.volume,
            "ma_50": snapshot.ma_50,
            "ma_200": snapshot.ma_200,
            "rsi_14": snapshot.rsi_14,
            "volatility_30d": snapshot.volatility_30d,
        }
        snapshot.missing_fields = [name for name, value in required.items() if value is None]


def classify_technical_trend(snapshot: MarketSnapshot) -> str:
    """Classify price trend from moving averages, RSI, and 52-week drawdown."""

    if snapshot.price is None or snapshot.ma_50 is None or snapshot.ma_200 is None:
        return "Neutral"

    price = snapshot.price
    ma_50 = snapshot.ma_50
    ma_200 = snapshot.ma_200
    drawdown_pct = None
    if snapshot.week_52_high:
        drawdown_pct = (price - snapshot.week_52_high) / snapshot.week_52_high * 100

    if price > ma_50 > ma_200 and (snapshot.rsi_14 is None or snapshot.rsi_14 < 75):
        return "Strong uptrend"
    if price > ma_50 and price > ma_200:
        return "Uptrend"
    if drawdown_pct is not None and drawdown_pct < -35 and price < ma_50 < ma_200:
        return "Broken trend"
    if price < ma_50 and price < ma_200:
        return "Downtrend"
    return "Neutral"


def technical_score(trend: str) -> int:
    return {
        "Strong uptrend": 2,
        "Uptrend": 1,
        "Neutral": 0,
        "Downtrend": -1,
        "Broken trend": -2,
    }.get(trend, 0)


def _moving_average(close: pd.Series, window: int) -> float | None:
    if len(close) < window:
        return None
    return float(close.tail(window).mean())


def _rsi(close: pd.Series, period: int) -> float | None:
    if len(close) <= period:
        return None
    delta = close.diff().dropna()
    gain = delta.clip(lower=0)
    loss = -delta.clip(upper=0)
    avg_gain = gain.rolling(period).mean().iloc[-1]
    avg_loss = loss.rolling(period).mean().iloc[-1]
    if pd.isna(avg_gain) or pd.isna(avg_loss):
        return None
    if avg_loss == 0:
        return 100.0
    rs = avg_gain / avg_loss
    return float(100 - (100 / (1 + rs)))


def _annualized_volatility(close: pd.Series, days: int) -> float | None:
    if len(close) <= days:
        return None
    returns = close.pct_change().dropna().tail(days)
    if returns.empty:
        return None
    return float(returns.std() * (252**0.5) * 100)


def _first_number(info: dict[str, Any], keys: list[str]) -> float | None:
    for key in keys:
        value = _to_float(info.get(key))
        if value is not None:
            return value
    return None


def _to_float(value: Any) -> float | None:
    if value is None:
        return None
    try:
        return float(value)
    except (TypeError, ValueError):
        return None
