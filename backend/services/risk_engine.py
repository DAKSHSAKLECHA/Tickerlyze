"""Descriptive historical price indicators, without an invented risk score."""
from datetime import date
from calendar import monthrange
from math import isfinite

def calculate_risk(history):
    data = []
    for row in history:
        try:
            day = date.fromisoformat(row['date'])
            close = float(row['close'])
        except (KeyError, TypeError, ValueError):
            continue
        if isfinite(close) and close > 0:
            data.append((day, close))
    data.sort()
    if len(data) < 2:
        return None
    end = data[-1][0]
    month_index = end.year * 12 + end.month - 1 - 3
    year, month = divmod(month_index, 12)
    month += 1
    cutoff = date(year, month, min(end.day, monthrange(year, month)[1]))
    moves = []
    peak = data[0][1]
    fall = 0
    for i in range(1, len(data)):
        day, close = data[i]
        peak = max(peak, close)
        fall = max(fall, (1 - close / peak) * 100)
        if day >= cutoff:
            moves.append(abs(close / data[i - 1][1] - 1) * 100)
    return dict(swing=sum(moves) / len(moves) if moves else None,
                fall=fall, performance=(data[-1][1] / data[0][1] - 1) * 100,
                start=data[0][0].isoformat(), end=end.isoformat(),
                swingStart=next(day.isoformat() for day, _ in data if day >= cutoff))
