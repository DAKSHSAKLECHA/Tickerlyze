from concurrent.futures import ThreadPoolExecutor, as_completed
from flask import Blueprint, jsonify
from services import stock_service
from services import database

dashboard_bp = Blueprint("dashboard", __name__, url_prefix="/api/dashboard")

MARKET_INDEXES = {
    "^GSPC": "S&P 500",
    "^DJI": "Dow Jones",
    "^IXIC": "NASDAQ",
    "^NSEI": "NIFTY 50",
}


def _fetch_index(symbol, name):
    try:
        quote = stock_service.get_quote(symbol)
        return {
            "symbol": symbol,
            "name": name,
            "price": quote.get("currentPrice"),
            "fetchedAt": quote.get("fetchedAt"), "stale": quote.get("stale", False),
            "priceAsOf": quote.get("priceAsOf"),
            "change": quote.get("change"),
            "changePercent": quote.get("changePercent"),
        }
    except Exception:
        return {"symbol": symbol, "name": name, "error": "Market data temporarily unavailable. Please try again in a few minutes."}


@dashboard_bp.route("/overview", methods=["GET"])
def market_overview():
    with ThreadPoolExecutor(max_workers=len(MARKET_INDEXES)) as executor:
        futures = {
            executor.submit(_fetch_index, symbol, name): symbol
            for symbol, name in MARKET_INDEXES.items()
        }
        results = {futures[f]: f.result() for f in as_completed(futures)}

    # preserve original display order
    indexes = [results[symbol] for symbol in MARKET_INDEXES]

    watchlist = database.watchlist()
    analyses = database.recent_analyses(5)

    return jsonify({
        "marketIndexes": indexes,
        "watchlistCount": len(watchlist),
        "recentAnalyses": analyses[:5],
    })