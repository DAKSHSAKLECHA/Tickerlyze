"""Wraps yfinance calls and normalizes the data we care about."""
import yfinance as yf
from services.market_cache import cached_market_data, MarketDataUnavailable, StockNotFoundError


def _safe_get(info, *keys, default=None):
    for key in keys:
        val = info.get(key)
        if val is not None:
            return val
    return default


@cached_market_data(ttl=300)
def get_quote(ticker_symbol):
    """Return current price + key valuation metrics for a ticker."""
    ticker_symbol = ticker_symbol.upper().strip()
    if ticker_symbol.startswith("^"):
        ticker = yf.Ticker(ticker_symbol)
        history = ticker.history(period="5d", raise_errors=True)
        if history.empty:
            raise MarketDataUnavailable("No market index prices available.")
        closes = history["Close"].dropna()
        if len(closes) < 2:
            raise MarketDataUnavailable("Insufficient market index prices.")
        current, previous = float(closes.iloc[-1]), float(closes.iloc[-2])
        change = current - previous
        return {"symbol": ticker_symbol, "currentPrice": current,
                "previousClose": previous, "change": round(change, 2),
                "changePercent": round(change / previous * 100, 2) if previous else None}
    ticker = yf.Ticker(ticker_symbol)

    try:
        info = ticker.info
    except Exception as e:
        raise

    if not info or info.get("regularMarketPrice") is None and info.get("currentPrice") is None:
        # yfinance sometimes still returns a sparse dict for invalid tickers
        hist = ticker.history(period="5d")
        if hist.empty:
            raise StockNotFoundError(f"Ticker '{ticker_symbol}' not found.")

    current_price = _safe_get(info, "currentPrice", "regularMarketPrice", "previousClose")

    quote = {
        "symbol": ticker_symbol,
        "shortName": info.get("shortName") or info.get("longName") or ticker_symbol,
        "sector": info.get("sector"),
        "industry": info.get("industry"),
        "currency": info.get("currency", "USD"),
        "currentPrice": current_price,
        "previousClose": info.get("previousClose"),
        "change": None,
        "changePercent": None,
        "marketCap": info.get("marketCap"),
        "peRatio": _safe_get(info, "trailingPE", "forwardPE"),
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

    if quote["currentPrice"] and quote["previousClose"]:
        quote["change"] = round(quote["currentPrice"] - quote["previousClose"], 2)
        quote["changePercent"] = round((quote["change"] / quote["previousClose"]) * 100, 2)

    return quote


@cached_market_data(ttl=300)
def get_history(ticker_symbol, period="6mo", interval="1d"):
    ticker = yf.Ticker(ticker_symbol.upper().strip())
    hist = ticker.history(period=period, interval=interval, raise_errors=True)
    if hist.empty:
        raise StockNotFoundError(f"No historical data for '{ticker_symbol}'.")
    hist = hist.reset_index()
    date_col = "Date" if "Date" in hist.columns else "Datetime"
    return [
        {
            "date": row[date_col].strftime("%Y-%m-%d"),
            "open": round(row["Open"], 2),
            "high": round(row["High"], 2),
            "low": round(row["Low"], 2),
            "close": round(row["Close"], 2),
            "volume": int(row["Volume"]),
        }
        for _, row in hist.iterrows()
    ]


@cached_market_data(ttl=300)
def get_next_earnings_date(ticker_symbol):
    ticker = yf.Ticker(ticker_symbol.upper().strip())
    try:
        cal = ticker.calendar
    except Exception:
        return None

    if cal is None:
        return None

    # yfinance returns either a DataFrame or a dict depending on version
    try:
        if hasattr(cal, "get"):
            earnings_date = cal.get("Earnings Date")
        else:
            earnings_date = cal.loc["Earnings Date"].values if "Earnings Date" in cal.index else None
    except Exception:
        earnings_date = None

    if earnings_date is None:
        return None

    if isinstance(earnings_date, (list, tuple)):
        candidates = list(earnings_date)
    else:
        try:
            candidates = list(earnings_date)
        except TypeError:
            candidates = [earnings_date]

    dates = []
    for d in candidates:
        try:
            if isinstance(d, str):
                dates.append(d)
            else:
                dates.append(str(d)[:10])
        except Exception:
            continue

    return dates[0] if dates else None


@cached_market_data(ttl=300)
def search_tickers(query):
    """Best-effort ticker search using yfinance's search endpoint."""
    try:
        results = yf.Search(query, max_results=8).quotes
    except Exception:
        return []

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
