from datetime import datetime, time, timedelta
from zoneinfo import ZoneInfo

ET = ZoneInfo("America/New_York")
MARKET_OPEN = time(9, 30)
MARKET_CLOSE = time(16, 0)


def calculate_session_levels(candles: list[dict]) -> dict:
    """
    From a list of intraday candles (with 'time' as epoch seconds),
    compute previous day high/low and overnight high/low relative to
    the NY session (9:30 AM – 4:00 PM ET).

    Returns dict with prev_day_high, prev_day_low, overnight_high, overnight_low
    (all nullable).
    """
    if not candles:
        return {
            "prev_day_high": None, "prev_day_low": None,
            "overnight_high": None, "overnight_low": None,
        }

    # Bucket candles into NY session days and overnight periods
    # Session day = 9:30 AM to 4:00 PM ET on a given date
    # Overnight = 4:00 PM ET to 9:30 AM ET next day
    sessions: dict[str, list[dict]] = {}  # date_str -> candles in that NY session
    overnights: dict[str, list[dict]] = {}  # date_str (of the next morning) -> overnight candles

    for c in candles:
        dt = datetime.fromtimestamp(c["time"], tz=ET)
        t = dt.time()
        d = dt.date()

        if MARKET_OPEN <= t < MARKET_CLOSE:
            # Regular NY session
            key = d.isoformat()
            sessions.setdefault(key, []).append(c)
        elif t >= MARKET_CLOSE:
            # After close — overnight leading into next trading day
            next_day = _next_weekday(d + timedelta(days=1))
            key = next_day.isoformat()
            overnights.setdefault(key, []).append(c)
        elif t < MARKET_OPEN:
            # Pre-market — overnight leading into today
            key = d.isoformat()
            overnights.setdefault(key, []).append(c)

    # Find "today" = the most recent session date with data
    sorted_dates = sorted(sessions.keys())

    result = {
        "prev_day_high": None, "prev_day_low": None,
        "overnight_high": None, "overnight_low": None,
    }

    if len(sorted_dates) >= 2:
        prev_date = sorted_dates[-2]
        prev_candles = sessions[prev_date]
        result["prev_day_high"] = max(c["high"] for c in prev_candles)
        result["prev_day_low"] = min(c["low"] for c in prev_candles)

    # Overnight = the overnight period leading into the most recent session
    if sorted_dates:
        today_key = sorted_dates[-1]
        on_candles = overnights.get(today_key, [])
        if on_candles:
            result["overnight_high"] = max(c["high"] for c in on_candles)
            result["overnight_low"] = min(c["low"] for c in on_candles)

    return result


def _next_weekday(d):
    """Skip weekends."""
    while d.weekday() >= 5:
        d += timedelta(days=1)
    return d
