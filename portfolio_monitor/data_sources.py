from __future__ import annotations

import json
import os
import urllib.parse
import urllib.request
import xml.etree.ElementTree as ET
from datetime import datetime, timedelta, timezone
from typing import Any

from .indicators import atr, percent_change, rsi, simple_moving_average
from .models import EarningsEvent, NewsItem, Quote


YAHOO_CHART_URL = "https://query1.finance.yahoo.com/v8/finance/chart/{symbol}"
YAHOO_QUOTE_SUMMARY_URL = "https://query2.finance.yahoo.com/v10/finance/quoteSummary/{symbol}"
NEWS_API_URL = "https://newsapi.org/v2/everything"
GOOGLE_NEWS_RSS_URL = "https://news.google.com/rss/search"


class MarketDataClient:
    def __init__(self, config: dict[str, Any]):
        market_config = config.get("market_data", {})
        self.timeout = int(market_config.get("timeout_seconds", 12))
        self.symbol_map: dict[str, str] = market_config.get("symbols", {})
        self.provider = market_config.get("provider", "yahoo")

    def fetch_quote(self, ticker: str) -> Quote:
        source_symbol = self.symbol_map.get(ticker, ticker)
        try:
            return self._fetch_yahoo_quote(ticker, source_symbol)
        except Exception as exc:  # noqa: BLE001 - report should continue with unavailable data.
            return Quote(
                ticker=ticker,
                source_symbol=source_symbol,
                price=None,
                source="unavailable",
                error=str(exc),
            )

    def fetch_quotes(self, tickers: list[str]) -> dict[str, Quote]:
        return {ticker: self.fetch_quote(ticker) for ticker in tickers}

    def _fetch_yahoo_quote(self, ticker: str, symbol: str) -> Quote:
        daily = self._get_json(
            YAHOO_CHART_URL.format(symbol=urllib.parse.quote(symbol)),
            params={"range": "1y", "interval": "1d"},
        )
        result = daily["chart"]["result"][0]
        meta = result["meta"]
        indicators = result["indicators"]["quote"][0]

        closes = _clean_series(result["indicators"].get("adjclose", [{}])[0].get("adjclose"))
        raw_closes = _clean_series(indicators.get("close"))
        closes = closes or raw_closes
        highs = _clean_series(indicators.get("high"))
        lows = _clean_series(indicators.get("low"))
        volumes = [float(value) for value in indicators.get("volume", []) if value is not None]

        price = _float_or_none(meta.get("regularMarketPrice"))
        previous_close = _float_or_none(meta.get("previousClose"))
        if price is None and closes:
            price = closes[-1]
        if previous_close is None and len(closes) > 1:
            previous_close = closes[-2]

        day_change = percent_change(price, previous_close)
        week_change = percent_change(price, closes[-6] if len(closes) >= 6 else None)
        month_change = percent_change(price, closes[-22] if len(closes) >= 22 else None)
        avg_volume = sum(volumes[-30:]) / min(len(volumes), 30) if volumes else None
        volume = _float_or_none(meta.get("regularMarketVolume"))
        if volume is None and volumes:
            volume = volumes[-1]
        relative_volume = volume / avg_volume if volume and avg_volume else None

        return Quote(
            ticker=ticker,
            source_symbol=symbol,
            price=price,
            previous_close=previous_close,
            day_change_pct=day_change,
            volume=volume,
            avg_volume=avg_volume,
            relative_volume=relative_volume,
            week_change_pct=week_change,
            month_change_pct=month_change,
            ma_50=simple_moving_average(closes, 50),
            ma_200=simple_moving_average(closes, 200),
            rsi_14=rsi(closes, 14),
            atr_14=atr(highs, lows, closes, 14),
            currency=meta.get("currency"),
            as_of=datetime.fromtimestamp(meta.get("regularMarketTime", 0), tz=timezone.utc)
            if meta.get("regularMarketTime")
            else None,
            source="Yahoo Finance",
        )

    def _get_json(self, url: str, params: dict[str, str]) -> dict[str, Any]:
        query = urllib.parse.urlencode(params)
        request = urllib.request.Request(
            f"{url}?{query}",
            headers={"User-Agent": "portfolio-monitor/0.1"},
        )
        with urllib.request.urlopen(request, timeout=self.timeout) as response:
            return json.loads(response.read().decode("utf-8"))


class NewsClient:
    def __init__(self, config: dict[str, Any]):
        news_config = config.get("news", {})
        self.timeout = int(config.get("market_data", {}).get("timeout_seconds", 12))
        self.max_company_headlines = int(news_config.get("max_company_headlines", 5))
        self.max_macro_headlines = int(news_config.get("max_macro_headlines", 8))
        self.lookback_days = int(news_config.get("company_lookback_days", 7))
        self.sector_queries: dict[str, list[str]] = news_config.get("sector_queries", {})
        self.macro_queries: list[str] = news_config.get("macro_queries", [])
        self.news_api_key = os.getenv("NEWS_API_KEY")

    def company_news(self, ticker: str, company: str) -> tuple[list[NewsItem], str | None]:
        queries = [f"{ticker} {company} stock"] + self.sector_queries.get(ticker, [])
        return self._news_for_queries(queries, self.max_company_headlines)

    def macro_news(self) -> tuple[list[NewsItem], str | None]:
        return self._news_for_queries(self.macro_queries, self.max_macro_headlines)

    def _news_for_queries(self, queries: list[str], limit: int) -> tuple[list[NewsItem], str | None]:
        errors: list[str] = []
        seen: set[str] = set()
        items: list[NewsItem] = []

        for query in queries:
            if not query:
                continue
            fetched, error = self._fetch_news_api(query, limit) if self.news_api_key else ([], None)
            if error:
                errors.append(error)
            if not fetched:
                fetched, error = self._fetch_google_rss(query, limit)
                if error:
                    errors.append(error)

            for item in fetched:
                if item.url in seen:
                    continue
                items.append(item)
                seen.add(item.url)
                if len(items) >= limit:
                    return items, None

        if items:
            return items, None
        return [], "; ".join(errors) if errors else "news unavailable"

    def _fetch_news_api(self, query: str, limit: int) -> tuple[list[NewsItem], str | None]:
        params = {
            "q": query,
            "language": "en",
            "sortBy": "publishedAt",
            "pageSize": str(limit),
            "from": (datetime.now(timezone.utc) - timedelta(days=self.lookback_days)).date().isoformat(),
            "apiKey": self.news_api_key or "",
        }
        try:
            payload = _get_json(NEWS_API_URL, params, timeout=self.timeout)
        except Exception as exc:  # noqa: BLE001
            return [], f"NewsAPI error for {query}: {exc}"

        articles = payload.get("articles") or []
        return [
            NewsItem(
                title=article.get("title") or "Untitled news item",
                url=article.get("url") or "",
                source=(article.get("source") or {}).get("name") or "NewsAPI",
                published_at=article.get("publishedAt"),
                summary=article.get("description"),
            )
            for article in articles
            if article.get("url")
        ], None

    def _fetch_google_rss(self, query: str, limit: int) -> tuple[list[NewsItem], str | None]:
        params = {
            "q": query,
            "hl": "en-US",
            "gl": "US",
            "ceid": "US:en",
        }
        try:
            data = _get_bytes(GOOGLE_NEWS_RSS_URL, params, timeout=self.timeout)
            root = ET.fromstring(data)
        except Exception as exc:  # noqa: BLE001
            return [], f"Google News RSS error for {query}: {exc}"

        items: list[NewsItem] = []
        for node in root.findall("./channel/item")[:limit]:
            title = node.findtext("title") or "Untitled news item"
            link = node.findtext("link") or ""
            source = node.findtext("source") or "Google News RSS"
            published_at = node.findtext("pubDate")
            if link:
                items.append(NewsItem(title=title, url=link, source=source, published_at=published_at))
        return items, None


class EarningsClient:
    def __init__(self, config: dict[str, Any]):
        self.timeout = int(config.get("market_data", {}).get("timeout_seconds", 12))
        self.symbol_map: dict[str, str] = config.get("market_data", {}).get("symbols", {})

    def next_earnings(self, ticker: str) -> EarningsEvent:
        symbol = self.symbol_map.get(ticker, ticker)
        try:
            payload = _get_json(
                YAHOO_QUOTE_SUMMARY_URL.format(symbol=urllib.parse.quote(symbol)),
                {"modules": "calendarEvents,earningsTrend"},
                timeout=self.timeout,
            )
            result = payload["quoteSummary"]["result"][0]
            earnings = result.get("calendarEvents", {}).get("earnings", {})
            dates = earnings.get("earningsDate") or []
            timestamp = dates[0].get("raw") if dates else None
            earnings_date = (
                datetime.fromtimestamp(timestamp, tz=timezone.utc).date().isoformat()
                if timestamp
                else None
            )
            return EarningsEvent(
                ticker=ticker,
                date=earnings_date,
                source="Yahoo Finance quoteSummary",
                url=f"https://finance.yahoo.com/quote/{urllib.parse.quote(symbol)}/analysis",
                estimate_revision_summary=_estimate_revision_summary(result.get("earningsTrend", {})),
            )
        except Exception as exc:  # noqa: BLE001
            return EarningsEvent(ticker=ticker, date=None, source="unavailable", error=str(exc))


def _get_json(url: str, params: dict[str, str], *, timeout: int) -> dict[str, Any]:
    return json.loads(_get_bytes(url, params, timeout=timeout).decode("utf-8"))


def _get_bytes(url: str, params: dict[str, str], *, timeout: int) -> bytes:
    request = urllib.request.Request(
        f"{url}?{urllib.parse.urlencode(params)}",
        headers={"User-Agent": "portfolio-monitor/0.1"},
    )
    with urllib.request.urlopen(request, timeout=timeout) as response:
        return response.read()


def _clean_series(values: list[Any] | None) -> list[float]:
    return [float(value) for value in values or [] if value is not None]


def _float_or_none(value: Any) -> float | None:
    if value in (None, ""):
        return None
    return float(value)


def _estimate_revision_summary(earnings_trend: dict[str, Any]) -> str | None:
    trends = earnings_trend.get("trend") or []
    current = next((item for item in trends if item.get("period") in {"0q", "+1q"}), None)
    if not current:
        return None
    revisions = current.get("epsRevisions", {})
    up_last_30 = _raw_value(revisions.get("upLast30days"))
    down_last_30 = _raw_value(revisions.get("downLast30days"))
    if up_last_30 is None and down_last_30 is None:
        return None
    return f"EPS revisions over last 30 days: {up_last_30 or 0} up, {down_last_30 or 0} down"


def _raw_value(value: Any) -> Any:
    if isinstance(value, dict):
        return value.get("raw")
    return value
