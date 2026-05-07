"""Trading-day-aware scheduling for Portfolio News Advisor."""

from __future__ import annotations

import logging
from datetime import date, datetime, time
from typing import Any, Callable
from zoneinfo import ZoneInfo

import pandas_market_calendars as mcal
from apscheduler.schedulers.blocking import BlockingScheduler
from apscheduler.triggers.cron import CronTrigger

LOGGER = logging.getLogger(__name__)


class TradingDayScheduler:
    """Schedules reports only on US market trading days."""

    def __init__(self, config: dict[str, Any]) -> None:
        schedule = config.get("schedule", {})
        self.timezone_name = schedule.get("timezone", "America/New_York")
        self.timezone = ZoneInfo(self.timezone_name)
        self.calendar_name = schedule.get("exchange_calendar", "NYSE")
        self.calendar = mcal.get_calendar(self.calendar_name)
        self.morning_time = _parse_hhmm(schedule.get("morning_report_time", "10:15"))
        self.midday_time = _parse_hhmm(schedule.get("midday_report_time", "13:30"))

    def is_trading_day(self, day: date | None = None) -> bool:
        day = day or datetime.now(self.timezone).date()
        schedule = self.calendar.schedule(start_date=day.isoformat(), end_date=day.isoformat())
        return not schedule.empty

    def market_session(self, day: date | None = None) -> dict[str, datetime] | None:
        day = day or datetime.now(self.timezone).date()
        schedule = self.calendar.schedule(start_date=day.isoformat(), end_date=day.isoformat())
        if schedule.empty:
            return None
        row = schedule.iloc[0]
        return {
            "open": row["market_open"].to_pydatetime().astimezone(self.timezone),
            "close": row["market_close"].to_pydatetime().astimezone(self.timezone),
        }

    def label_for_now(self, now: datetime | None = None) -> str:
        now = now or datetime.now(self.timezone)
        midday = datetime.combine(now.date(), self.midday_time, tzinfo=self.timezone)
        return "midday" if now >= midday else "morning"

    def report_id(self, label: str, now: datetime | None = None) -> str:
        now = now or datetime.now(self.timezone)
        return f"{now.date().isoformat()}-{label}"

    def run_if_trading_day(self, label: str, job: Callable[[str], None]) -> None:
        if not self.is_trading_day():
            LOGGER.info("Skipping %s report: not a %s trading day.", label, self.calendar_name)
            return
        session = self.market_session()
        if session:
            now = datetime.now(self.timezone)
            if now < session["open"]:
                LOGGER.info("Skipping %s report: market has not opened.", label)
                return
        job(label)

    def start(self, job: Callable[[str], None]) -> None:
        scheduler = BlockingScheduler(timezone=self.timezone_name)
        scheduler.add_job(
            lambda: self.run_if_trading_day("morning", job),
            CronTrigger(
                day_of_week="mon-fri",
                hour=self.morning_time.hour,
                minute=self.morning_time.minute,
                timezone=self.timezone_name,
            ),
            id="portfolio-news-advisor-morning",
            replace_existing=True,
        )
        scheduler.add_job(
            lambda: self.run_if_trading_day("midday", job),
            CronTrigger(
                day_of_week="mon-fri",
                hour=self.midday_time.hour,
                minute=self.midday_time.minute,
                timezone=self.timezone_name,
            ),
            id="portfolio-news-advisor-midday",
            replace_existing=True,
        )
        LOGGER.info(
            "Scheduler started for %s trading days at %s and %s %s.",
            self.calendar_name,
            self.morning_time.strftime("%H:%M"),
            self.midday_time.strftime("%H:%M"),
            self.timezone_name,
        )
        scheduler.start()


def _parse_hhmm(value: str) -> time:
    hour, minute = str(value).split(":", maxsplit=1)
    return time(hour=int(hour), minute=int(minute))
