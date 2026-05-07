"""News, filings, analyst, insider, and macro event collection."""

from __future__ import annotations

import logging
import os
from dataclasses import dataclass, field
from datetime import date, datetime, timedelta, timezone
from typing import Any

import requests
import yfinance as yf

LOGGER = logging.getLogger(__name__)

POSITIVE_TERMS = {
    "beat",
    "beats",
    "upgrade",
    "raises",
    "raised",
    "growth",
    "accelerates",
    "record",
    "strong",
    "bullish",
    "approval",
    "partnership",
    "expands",
    "profit",
}
NEGATIVE_TERMS = {
    "miss",
    "misses",
    "downgrade",
    "cuts",
    "cut",
    "weak",
    "bearish",
    "probe",
    "lawsuit",
    "warning",
    "slows",
    "decline",
    "loss",
    "guidance cut",
    "investigation",
}


@dataclass
class NewsItem:
    title: str
    source: str
    url: str | None = None
    published_at: str | None = None
    summary: str | None = None
    ticker: str | None = None
    category: str = "company"
    sentiment_score: float | None = None
    raw: dict[str, Any] = field(default_factory=dict)

    def compact(self) -> dict[str, Any]:
        return {
            "title": self.title,
            "source": self.source,
            "url": self.url,
            "published_at": self.published_at,
            "summary": self.summary,
            "ticker": self.ticker,
            "category": self.category,
            "sentiment_score": self.sentiment_score,
        }


class NewsFetcher:
    """Fetches market-moving news from optional providers.

    Missing API keys disable the corresponding provider. Network/API failures are
    logged and returned as source notes so report generation can mark gaps.
    """

    def __init__(self, config: dict[str, Any]) -> None:
        news_config = config.get("data_sources", {}).get("news", {})
        self.lookback_days = int(news_config.get("lookback_days", 5))
        self.max_articles_per_ticker = int(news_config.get("max_articles_per_ticker", 8))
        self.max_macro_articles = int(news_config.get("max_macro_articles", 12))
        self.use_yfinance_news = bool(news_config.get("use_yfinance_news", True))
        self.use_finnhub = bool(news_config.get("use_finnhub", True))
        self.use_newsapi = bool(news_config.get("use_newsapi", True))
        self.use_alpha_vantage = bool(news_config.get("use_alpha_vantage", True))
        self.use_gdelt = bool(news_config.get("use_gdelt", True))
        self.use_sec_filings = bool(news_config.get("use_sec_filings", True))
        self.use_finnhub_insider = bool(news_config.get("use_finnhub_insider", True))
        self.macro_queries = news_config.get("macro_queries", [])
        self.sector_queries = news_config.get("sector_queries", {})
        self.session = requests.Session()
        self.session.headers.update(
            {"User-Agent": "PortfolioNewsAdvisor/1.0 contact=configure-email"}
        )
        self.notes: list[str] = []

    def fetch_all(self, positions: list[dict[str, Any]]) -> dict[str, Any]:
        self.notes = []
        ticker_news: dict[str, list[NewsItem]] = {}
        earnings: dict[str, Any] = {}
        analyst: dict[str, list[NewsItem]] = {}
        filings: dict[str, list[NewsItem]] = {}
        insider: dict[str, list[NewsItem]] = {}

        for position in positions:
            ticker = position["ticker"]
            query = self._company_query(position)
            ticker_news[ticker] = self.fetch_ticker_news(ticker, position.get("data_symbol", ticker), query)
            earnings[ticker] = self.fetch_earnings(ticker, position.get("data_symbol", ticker))
            analyst[ticker] = self.fetch_analyst_events(ticker)
            filings[ticker] = self.fetch_sec_filings(ticker)
            insider[ticker] = self.fetch_insider_events(ticker)

        macro_news = self.fetch_macro_news()
        return {
            "ticker_news": {
                ticker: [item.compact() for item in items]
                for ticker, items in ticker_news.items()
            },
            "macro_news": [item.compact() for item in macro_news],
            "earnings": earnings,
            "analyst_events": {
                ticker: [item.compact() for item in items]
                for ticker, items in analyst.items()
            },
            "sec_filings": {
                ticker: [item.compact() for item in items]
                for ticker, items in filings.items()
            },
            "insider_events": {
                ticker: [item.compact() for item in items]
                for ticker, items in insider.items()
            },
            "source_notes": self.notes,
        }

    def fetch_ticker_news(self, ticker: str, data_symbol: str, query: str) -> list[NewsItem]:
        items: list[NewsItem] = []
        if self.use_yfinance_news:
            items.extend(self._fetch_yfinance_news(ticker, data_symbol))
        if self.use_finnhub:
            items.extend(self._fetch_finnhub_company_news(ticker))
        if self.use_newsapi:
            items.extend(self._fetch_newsapi(query, ticker=ticker, category="company"))
        if self.use_alpha_vantage:
            items.extend(self._fetch_alpha_vantage_news(ticker))
        if self.use_gdelt:
            items.extend(self._fetch_gdelt(query, ticker=ticker, category="company"))
        return self._dedupe(items)[: self.max_articles_per_ticker]

    def fetch_macro_news(self) -> list[NewsItem]:
        items: list[NewsItem] = []
        for query in self.macro_queries:
            if self.use_newsapi:
                items.extend(self._fetch_newsapi(query, category="macro"))
            if self.use_gdelt:
                items.extend(self._fetch_gdelt(query, category="macro"))
        for name, query in self.sector_queries.items():
            if self.use_newsapi:
                items.extend(self._fetch_newsapi(query, category=f"sector:{name}"))
            if self.use_gdelt:
                items.extend(self._fetch_gdelt(query, category=f"sector:{name}"))
        return self._dedupe(items)[: self.max_macro_articles]

    def fetch_earnings(self, ticker: str, data_symbol: str) -> dict[str, Any]:
        result: dict[str, Any] = {"next_earnings_date": None, "source": None, "notes": []}
        try:
            calendar = yf.Ticker(data_symbol).calendar
            if calendar is not None:
                result["raw"] = _json_safe(calendar)
                date_value = _extract_earnings_date(calendar)
                if date_value:
                    result["next_earnings_date"] = date_value
                    result["source"] = "yfinance"
        except Exception as exc:  # pragma: no cover - provider dependent
            result["notes"].append(f"yfinance earnings unavailable: {exc}")

        finnhub_key = os.getenv("FINNHUB_API_KEY")
        if self.use_finnhub and finnhub_key and result["next_earnings_date"] is None:
            today = date.today()
            params = {
                "from": today.isoformat(),
                "to": (today + timedelta(days=120)).isoformat(),
                "symbol": ticker,
                "token": finnhub_key,
            }
            try:
                response = self.session.get(
                    "https://finnhub.io/api/v1/calendar/earnings",
                    params=params,
                    timeout=20,
                )
                response.raise_for_status()
                earnings = response.json().get("earningsCalendar", [])
                if earnings:
                    result["next_earnings_date"] = earnings[0].get("date")
                    result["source"] = "finnhub"
                    result["raw"] = earnings[0]
            except Exception as exc:  # pragma: no cover - provider dependent
                result["notes"].append(f"Finnhub earnings unavailable: {exc}")
        return result

    def fetch_analyst_events(self, ticker: str) -> list[NewsItem]:
        items: list[NewsItem] = []
        finnhub_key = os.getenv("FINNHUB_API_KEY")
        if not (self.use_finnhub and finnhub_key):
            return items
        try:
            response = self.session.get(
                "https://finnhub.io/api/v1/stock/upgrade-downgrade",
                params={"symbol": ticker, "token": finnhub_key},
                timeout=20,
            )
            response.raise_for_status()
            cutoff = datetime.now(timezone.utc) - timedelta(days=self.lookback_days)
            for row in response.json()[:10]:
                published = _parse_date(row.get("gradeTime"))
                if published and published < cutoff:
                    continue
                action = row.get("action", "analyst action")
                title = (
                    f"{ticker} analyst {action}: {row.get('fromGrade')} to "
                    f"{row.get('toGrade')} at {row.get('company')}"
                )
                items.append(
                    NewsItem(
                        title=title,
                        source="Finnhub analyst",
                        published_at=published.isoformat() if published else None,
                        ticker=ticker,
                        category="analyst",
                        sentiment_score=_score_text(title),
                        raw=row,
                    )
                )
        except Exception as exc:  # pragma: no cover - provider dependent
            self.notes.append(f"{ticker}: analyst events unavailable: {exc}")
        return items

    def fetch_sec_filings(self, ticker: str) -> list[NewsItem]:
        if not self.use_sec_filings:
            return []
        cik = os.getenv(f"SEC_CIK_{ticker}")
        if not cik:
            return []
        cik = cik.zfill(10)
        try:
            response = self.session.get(
                f"https://data.sec.gov/submissions/CIK{cik}.json",
                timeout=20,
            )
            response.raise_for_status()
            filings = response.json().get("filings", {}).get("recent", {})
            forms = filings.get("form", [])
            dates = filings.get("filingDate", [])
            accessions = filings.get("accessionNumber", [])
            items: list[NewsItem] = []
            cutoff = date.today() - timedelta(days=self.lookback_days)
            for form, filing_date, accession in zip(forms, dates, accessions):
                parsed = _parse_date(filing_date)
                if parsed and parsed.date() < cutoff:
                    continue
                title = f"{ticker} SEC filing: {form} filed {filing_date}"
                url = (
                    "https://www.sec.gov/Archives/edgar/data/"
                    f"{int(cik)}/{accession.replace('-', '')}/{accession}-index.html"
                )
                items.append(
                    NewsItem(
                        title=title,
                        source="SEC",
                        url=url,
                        published_at=filing_date,
                        ticker=ticker,
                        category="filing",
                        sentiment_score=0,
                    )
                )
                if len(items) >= 5:
                    break
            return items
        except Exception as exc:  # pragma: no cover - provider dependent
            self.notes.append(f"{ticker}: SEC filings unavailable: {exc}")
            return []

    def fetch_insider_events(self, ticker: str) -> list[NewsItem]:
        items: list[NewsItem] = []
        finnhub_key = os.getenv("FINNHUB_API_KEY")
        if not (self.use_finnhub_insider and finnhub_key):
            return items
        try:
            today = date.today()
            response = self.session.get(
                "https://finnhub.io/api/v1/stock/insider-transactions",
                params={
                    "symbol": ticker,
                    "from": (today - timedelta(days=self.lookback_days)).isoformat(),
                    "to": today.isoformat(),
                    "token": finnhub_key,
                },
                timeout=20,
            )
            response.raise_for_status()
            for row in response.json().get("data", [])[:10]:
                shares = row.get("share")
                change = row.get("change")
                transaction = "buying" if _to_float(change) and float(change) > 0 else "selling"
                title = f"{ticker} insider {transaction}: {shares} shares by {row.get('name')}"
                items.append(
                    NewsItem(
                        title=title,
                        source="Finnhub insider",
                        published_at=row.get("transactionDate"),
                        ticker=ticker,
                        category="insider",
                        sentiment_score=1 if transaction == "buying" else -1,
                        raw=row,
                    )
                )
        except Exception as exc:  # pragma: no cover - provider dependent
            self.notes.append(f"{ticker}: insider events unavailable: {exc}")
        return items

    def _fetch_yfinance_news(self, ticker: str, data_symbol: str) -> list[NewsItem]:
        try:
            raw_items = yf.Ticker(data_symbol).news or []
        except Exception as exc:  # pragma: no cover - provider dependent
            self.notes.append(f"{ticker}: yfinance news unavailable: {exc}")
            return []

        items: list[NewsItem] = []
        for raw in raw_items:
            title = raw.get("title") or raw.get("content", {}).get("title")
            if not title:
                continue
            publisher = raw.get("publisher") or raw.get("content", {}).get("provider", {}).get("displayName")
            link = raw.get("link") or raw.get("content", {}).get("canonicalUrl", {}).get("url")
            published = raw.get("providerPublishTime") or raw.get("content", {}).get("pubDate")
            items.append(
                NewsItem(
                    title=title,
                    source=publisher or "Yahoo Finance",
                    url=link,
                    published_at=_format_provider_time(published),
                    summary=raw.get("summary"),
                    ticker=ticker,
                    sentiment_score=_score_text(title),
                    raw=raw,
                )
            )
        return items

    def _fetch_finnhub_company_news(self, ticker: str) -> list[NewsItem]:
        api_key = os.getenv("FINNHUB_API_KEY")
        if not api_key:
            return []
        today = date.today()
        params = {
            "symbol": ticker,
            "from": (today - timedelta(days=self.lookback_days)).isoformat(),
            "to": today.isoformat(),
            "token": api_key,
        }
        try:
            response = self.session.get(
                "https://finnhub.io/api/v1/company-news", params=params, timeout=20
            )
            response.raise_for_status()
            return [
                NewsItem(
                    title=row.get("headline") or "",
                    source=row.get("source") or "Finnhub",
                    url=row.get("url"),
                    published_at=_format_provider_time(row.get("datetime")),
                    summary=row.get("summary"),
                    ticker=ticker,
                    sentiment_score=_score_text(
                        f"{row.get('headline', '')} {row.get('summary', '')}"
                    ),
                    raw=row,
                )
                for row in response.json()
                if row.get("headline")
            ]
        except Exception as exc:  # pragma: no cover - provider dependent
            self.notes.append(f"{ticker}: Finnhub company news unavailable: {exc}")
            return []

    def _fetch_newsapi(
        self, query: str, ticker: str | None = None, category: str = "company"
    ) -> list[NewsItem]:
        api_key = os.getenv("NEWSAPI_API_KEY")
        if not api_key:
            return []
        params = {
            "q": query,
            "language": "en",
            "sortBy": "publishedAt",
            "pageSize": min(20, self.max_articles_per_ticker),
            "from": (date.today() - timedelta(days=self.lookback_days)).isoformat(),
            "apiKey": api_key,
        }
        try:
            response = self.session.get("https://newsapi.org/v2/everything", params=params, timeout=20)
            response.raise_for_status()
            articles = response.json().get("articles", [])
            return [
                NewsItem(
                    title=row.get("title") or "",
                    source=(row.get("source") or {}).get("name") or "NewsAPI",
                    url=row.get("url"),
                    published_at=row.get("publishedAt"),
                    summary=row.get("description"),
                    ticker=ticker,
                    category=category,
                    sentiment_score=_score_text(f"{row.get('title', '')} {row.get('description', '')}"),
                    raw=row,
                )
                for row in articles
                if row.get("title")
            ]
        except Exception as exc:  # pragma: no cover - provider dependent
            self.notes.append(f"NewsAPI unavailable for query '{query}': {exc}")
            return []

    def _fetch_alpha_vantage_news(self, ticker: str) -> list[NewsItem]:
        api_key = os.getenv("ALPHA_VANTAGE_API_KEY")
        if not api_key:
            return []
        params = {
            "function": "NEWS_SENTIMENT",
            "tickers": ticker,
            "sort": "LATEST",
            "limit": self.max_articles_per_ticker,
            "apikey": api_key,
        }
        try:
            response = self.session.get("https://www.alphavantage.co/query", params=params, timeout=20)
            response.raise_for_status()
            feed = response.json().get("feed", [])
            items: list[NewsItem] = []
            for row in feed:
                score = _to_float(row.get("overall_sentiment_score"))
                items.append(
                    NewsItem(
                        title=row.get("title") or "",
                        source=row.get("source") or "Alpha Vantage",
                        url=row.get("url"),
                        published_at=row.get("time_published"),
                        summary=row.get("summary"),
                        ticker=ticker,
                        sentiment_score=score,
                        raw=row,
                    )
                )
            return [item for item in items if item.title]
        except Exception as exc:  # pragma: no cover - provider dependent
            self.notes.append(f"{ticker}: Alpha Vantage news unavailable: {exc}")
            return []

    def _fetch_gdelt(
        self, query: str, ticker: str | None = None, category: str = "company"
    ) -> list[NewsItem]:
        params = {
            "query": query,
            "mode": "ArtList",
            "format": "json",
            "maxrecords": min(20, self.max_articles_per_ticker),
            "timespan": f"{self.lookback_days}d",
            "sort": "HybridRel",
        }
        try:
            response = self.session.get(
                "https://api.gdeltproject.org/api/v2/doc/doc",
                params=params,
                timeout=20,
            )
            response.raise_for_status()
            articles = response.json().get("articles", [])
            return [
                NewsItem(
                    title=row.get("title") or "",
                    source=row.get("sourceCountry") or row.get("domain") or "GDELT",
                    url=row.get("url"),
                    published_at=row.get("seendate"),
                    summary=row.get("snippet"),
                    ticker=ticker,
                    category=category,
                    sentiment_score=_score_text(f"{row.get('title', '')} {row.get('snippet', '')}"),
                    raw=row,
                )
                for row in articles
                if row.get("title")
            ]
        except Exception as exc:  # pragma: no cover - provider dependent
            self.notes.append(f"GDELT unavailable for query '{query}': {exc}")
            return []

    def _company_query(self, position: dict[str, Any]) -> str:
        parts = [position.get("name", ""), position["ticker"], *position.get("thesis_keywords", [])]
        return " OR ".join(f'"{part}"' for part in parts if part)

    def _dedupe(self, items: list[NewsItem]) -> list[NewsItem]:
        seen: set[str] = set()
        unique: list[NewsItem] = []
        for item in sorted(items, key=_item_sort_key, reverse=True):
            key = (item.url or item.title).strip().lower()
            if not key or key in seen:
                continue
            seen.add(key)
            unique.append(item)
        return unique


def aggregate_sentiment(items: list[dict[str, Any]]) -> tuple[str, int, str]:
    """Return sentiment label, score component (-3..3), and evidence text."""

    if not items:
        return "Neutral", 0, "No recent news found from configured sources."
    scores = [item.get("sentiment_score") for item in items if item.get("sentiment_score") is not None]
    if not scores:
        scores = [_score_text(f"{item.get('title', '')} {item.get('summary', '')}") for item in items]
    average = sum(scores) / len(scores) if scores else 0
    if average >= 0.35:
        return "Bullish", min(3, max(1, round(average * 3))), _headline_evidence(items)
    if average <= -0.35:
        return "Bearish", max(-3, min(-1, round(average * 3))), _headline_evidence(items)
    return "Neutral", 0, _headline_evidence(items)


def _score_text(text: str) -> float:
    clean = text.lower()
    score = 0
    for term in POSITIVE_TERMS:
        if term in clean:
            score += 1
    for term in NEGATIVE_TERMS:
        if term in clean:
            score -= 1
    if score > 0:
        return min(1.0, score / 3)
    if score < 0:
        return max(-1.0, score / 3)
    return 0.0


def _headline_evidence(items: list[dict[str, Any]]) -> str:
    headlines = [item.get("title", "Untitled") for item in items[:3]]
    return "; ".join(headlines) if headlines else "No headline evidence available."


def _item_sort_key(item: NewsItem) -> str:
    return item.published_at or ""


def _format_provider_time(value: Any) -> str | None:
    if value is None:
        return None
    if isinstance(value, (int, float)):
        return datetime.fromtimestamp(value, tz=timezone.utc).isoformat()
    return str(value)


def _parse_date(value: Any) -> datetime | None:
    if value is None:
        return None
    if isinstance(value, (int, float)):
        return datetime.fromtimestamp(value, tz=timezone.utc)
    text = str(value)
    for fmt in ("%Y-%m-%d", "%Y%m%dT%H%M%S", "%Y-%m-%dT%H:%M:%SZ"):
        try:
            return datetime.strptime(text[: len(fmt)], fmt).replace(tzinfo=timezone.utc)
        except ValueError:
            continue
    try:
        return datetime.fromisoformat(text.replace("Z", "+00:00"))
    except ValueError:
        return None


def _extract_earnings_date(calendar: Any) -> str | None:
    if isinstance(calendar, dict):
        for key in ("Earnings Date", "Earnings High", "Earnings Low"):
            value = calendar.get(key)
            if value is not None:
                return str(value[0] if isinstance(value, list) else value)
    if hasattr(calendar, "to_dict"):
        data = calendar.to_dict()
        return _extract_earnings_date(data)
    return None


def _json_safe(value: Any) -> Any:
    if hasattr(value, "to_dict"):
        return value.to_dict()
    return value


def _to_float(value: Any) -> float | None:
    if value is None:
        return None
    try:
        return float(value)
    except (TypeError, ValueError):
        return None
