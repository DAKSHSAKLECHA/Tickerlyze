from concurrent.futures import ThreadPoolExecutor, as_completed
from flask import Blueprint, jsonify
from config import Config
from services import stock_service
from utils.json_store import read_json

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
            "change": quote.get("change"),
            "changePercent": quote.get("changePercent"),
        }
    except Exception:
        return {"symbol": symbol, "name": name, "error": "unavailable"}


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

    watchlist = read_json(Config.WATCHLIST_FILE, default=[])
    analyses = read_json(Config.ANALYSES_FILE, default=[])

    return jsonify({
        "marketIndexes": indexes,
        "watchlistCount": len(watchlist),
        "recentAnalyses": analyses[:5],
    })