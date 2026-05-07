from __future__ import annotations

from datetime import date, datetime, time, timedelta
from zoneinfo import ZoneInfo


NY_TZ = ZoneInfo("America/New_York")


def now_et() -> datetime:
    return datetime.now(tz=NY_TZ)


def is_us_market_holiday(day: date) -> bool:
    holidays = {
        _observed(date(day.year, 1, 1)),
        _nth_weekday(day.year, 1, 0, 3),  # Martin Luther King Jr. Day
        _nth_weekday(day.year, 2, 0, 3),  # Washington's Birthday
        _good_friday(day.year),
        _last_weekday(day.year, 5, 0),  # Memorial Day
        _observed(date(day.year, 6, 19)),  # Juneteenth
        _observed(date(day.year, 7, 4)),  # Independence Day
        _nth_weekday(day.year, 9, 0, 1),  # Labor Day
        _nth_weekday(day.year, 11, 3, 4),  # Thanksgiving
        _observed(date(day.year, 12, 25)),
    }
    return day in holidays


def is_us_trading_day(day: date | None = None) -> bool:
    day = day or now_et().date()
    return day.weekday() < 5 and not is_us_market_holiday(day)


def should_generate_report(
    current_dt: datetime | None = None,
    *,
    allowed_times: list[str] | None = None,
    tolerance_minutes: int = 5,
) -> tuple[bool, str | None]:
    current_dt = (current_dt or now_et()).astimezone(NY_TZ)
    if not is_us_trading_day(current_dt.date()):
        return False, None

    for slot in allowed_times or ["10:00", "14:30"]:
        slot_time = _parse_hhmm(slot)
        slot_dt = current_dt.replace(
            hour=slot_time.hour,
            minute=slot_time.minute,
            second=0,
            microsecond=0,
        )
        if abs((current_dt - slot_dt).total_seconds()) <= tolerance_minutes * 60:
            label = "10:00 AM ET" if slot == "10:00" else "2:30 PM ET"
            return True, label
    return False, None


def report_slot_label(current_dt: datetime | None = None) -> str:
    current_dt = (current_dt or now_et()).astimezone(NY_TZ)
    if current_dt.time() < time(12, 0):
        return "10:00 AM ET"
    return "2:30 PM ET"


def _parse_hhmm(value: str) -> time:
    hour, minute = value.split(":", 1)
    return time(int(hour), int(minute), tzinfo=NY_TZ)


def _observed(day: date) -> date:
    if day.weekday() == 5:
        return day - timedelta(days=1)
    if day.weekday() == 6:
        return day + timedelta(days=1)
    return day


def _nth_weekday(year: int, month: int, weekday: int, n: int) -> date:
    current = date(year, month, 1)
    while current.weekday() != weekday:
        current += timedelta(days=1)
    return current + timedelta(days=7 * (n - 1))


def _last_weekday(year: int, month: int, weekday: int) -> date:
    if month == 12:
        current = date(year + 1, 1, 1) - timedelta(days=1)
    else:
        current = date(year, month + 1, 1) - timedelta(days=1)
    while current.weekday() != weekday:
        current -= timedelta(days=1)
    return current


def _good_friday(year: int) -> date:
    # Anonymous Gregorian algorithm for Easter Sunday, then subtract two days.
    a = year % 19
    b = year // 100
    c = year % 100
    d = b // 4
    e = b % 4
    f = (b + 8) // 25
    g = (b - f + 1) // 3
    h = (19 * a + b - d - g + 15) % 30
    i = c // 4
    k = c % 4
    l = (32 + 2 * e + 2 * i - h - k) % 7
    m = (a + 11 * h + 22 * l) // 451
    month = (h + l - 7 * m + 114) // 31
    day = ((h + l - 7 * m + 114) % 31) + 1
    return date(year, month, day) - timedelta(days=2)
