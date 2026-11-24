"""Wraps yfinance calls and normalizes the data we care about."""
from datetime import date, datetime, timezone
from math import isfinite

import yfinance as yf
from services.risk_engine import calculate_risk
from services.market_cache import cached_market_data, MarketDataUnavailable, StockNotFoundError


def _safe_get(info, *keys, default=None):
    for key in keys:
        val = info.get(key)
        if val is not None:
            return val
    return default


@cached_market_data(ttl=300, stale_ttl=3600)
def get_quote(ticker_symbol):
    """Return current price + key valuation metrics for a ticker."""
    ticker_symbol = ticker_symbol.upper().strip()
    if ticker_symbol.startswith("^"):
        ticker = yf.Ticker(ticker_symbol)
        history = ticker.history(period="5d", raise_errors=True, timeout=8)
        if history.empty:
            raise MarketDataUnavailable("No market index prices available.")
        closes = history["Close"].dropna()
        if len(closes) < 2:
            raise MarketDataUnavailable("Insufficient market index prices.")
        current, previous = float(closes.iloc[-1]), float(closes.iloc[-2])
        change = current - previous
        return {"symbol": ticker_symbol, "currentPrice": current,
                "priceAsOf": history.index[-1].isoformat(),
                "previousClose": previous, "change": round(change, 2),
                "changePercent": round(change / previous * 100, 2) if previous else None}
    ticker = yf.Ticker(ticker_symbol)

    try:
        info = ticker.info or {}
    except Exception:
        info = {}

    current_price = _safe_get(info, "currentPrice", "regularMarketPrice")
    previous_close = _safe_get(info, "regularMarketPreviousClose", "previousClose")
    currency = info.get("currency")
    if current_price is None:
        history = ticker.history(period="5d", auto_adjust=False, raise_errors=True, timeout=8)
        closes = history["Close"].dropna() if not history.empty else None
        if closes is None or closes.empty:
            raise MarketDataUnavailable("No recent prices available for this ticker.")
        current_price = float(closes.iloc[-1])
        if len(closes) >= 2:
            previous_close = float(closes.iloc[-2])
        currency = currency or ticker.history_metadata.get("currency")

    quote = {
        "symbol": ticker_symbol,
        "priceAsOf": datetime.fromtimestamp(info["regularMarketTime"], timezone.utc).isoformat() if isinstance(info.get("regularMarketTime"), (int, float)) else None,
        "shortName": info.get("shortName") or info.get("longName") or ticker_symbol,
        "sector": info.get("sector"),
        "industry": info.get("industry"),
        "currency": currency or "USD",
        "currentPrice": current_price,
        "previousClose": previous_close,
        "change": None,
        "changePercent": None,
        "marketCap": info.get("marketCap"),
        "peRatio": info.get("trailingPE"),
        "forwardPE": info.get("forwardPE"),
        "eps": info.get("trailingEps"),
        "week52High": info.get("fiftyTwoWeekHigh"),
        "week52Low": info.get("fiftyTwoWeekLow"),
        "dividendYield": info.get("dividendYield"),
        "volume": info.get("volume") or info.get("regularMarketVolume"),
        "avgVolume": info.get("averageVolume"),
        "revenueGrowth": info.get("revenueGrowth"),
        "debtToEquity": info.get("debtToEquity"),
        "totalDebt": info.get("totalDebt"),
        "totalCash": info.get("totalCash"),
        "beta": info.get("beta"),
        "exchange": info.get("exchange"),
        "website": info.get("website"),
        "longBusinessSummary": info.get("longBusinessSummary"),
    }

    for field, fast_key in (
        ("marketCap", "marketCap"),
        ("week52High", "yearHigh"),
        ("week52Low", "yearLow"),
    ):
        if quote[field] is None:
            try:
                quote[field] = ticker.fast_info[fast_key]
            except Exception:
                # A missing optional metric should not discard the price.
                continue

    if quote["currentPrice"] and quote["previousClose"]:
        quote["change"] = round(quote["currentPrice"] - quote["previousClose"], 2)
        quote["changePercent"] = round((quote["change"] / quote["previousClose"]) * 100, 2)

    for key, value in quote.items():
        if isinstance(value, float) and not isfinite(value):
            quote[key] = None
    if not isinstance(quote['currentPrice'], (int, float)) or quote['currentPrice'] <= 0:
        raise MarketDataUnavailable('No valid recent price is available.')
    return quote


@cached_market_data(ttl=300, stale_ttl=3600)
def get_history(ticker_symbol, period="6mo", interval="1d"):
    ticker = yf.Ticker(ticker_symbol.upper().strip())
    hist = ticker.history(period=period, interval=interval, raise_errors=True, timeout=8)
    if hist.empty:
        raise StockNotFoundError(f"No historical data for '{ticker_symbol}'.")
    hist = hist.dropna(subset=["Close"])
    hist = hist[hist["Close"] > 0]
    if hist.empty:
        raise MarketDataUnavailable("No valid historical prices available.")
    hist = hist.reset_index()
    date_col = "Date" if "Date" in hist.columns else "Datetime"
    rows = [
        {
            "date": row[date_col].strftime("%Y-%m-%d"),
            "open": round(row["Open"], 2),
            "high": round(row["High"], 2),
            "low": round(row["Low"], 2),
            "close": round(row["Close"], 2),
            "volume": int(row["Volume"]) if isfinite(row["Volume"]) else 0,
        }
        for _, row in hist.iterrows()
    ]
    return {"data": rows, "priceIndicators": calculate_risk(rows)}


@cached_market_data(ttl=300)
def get_next_earnings_date(ticker_symbol):
    ticker = yf.Ticker(ticker_symbol.upper().strip())
    try:
        cal = ticker.calendar
    except Exception:
        cal = None

    candidates = cal.get("Earnings Date") if isinstance(cal, dict) else None
    if isinstance(candidates, (str, date)):
        candidates = [candidates]
    today = date.today()
    dates = []
    for value in candidates or []:
        try:
            day = date.fromisoformat(str(value)[:10])
        except ValueError:
            continue
        if day >= today:
            dates.append(day)
    if dates:
        return min(dates).isoformat()

    earnings = ticker.get_earnings_dates()
    if earnings is not None:
        dates = [
            value.date() for value in earnings.index
            if isinstance(value, datetime) and str(value) != "NaT" and value.date() >= today
        ]
    return min(dates).isoformat() if dates else None


@cached_market_data(ttl=300)
def search_tickers(query):
    """Best-effort ticker search using yfinance's search endpoint."""
    results = yf.Search(query, max_results=8, raise_errors=True, timeout=8).quotes

    return [
        {
            "symbol": r.get("symbol"),
            "name": r.get("shortname") or r.get("longname"),
            "exchange": r.get("exchange"),
            "type": r.get("quoteType"),
        }
        for r in results
        if r.get("symbol")
    ]
