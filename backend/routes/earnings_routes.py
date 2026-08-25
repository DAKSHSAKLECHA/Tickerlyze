from concurrent.futures import ThreadPoolExecutor
from flask import Blueprint, jsonify, request
from config import Config
from services import stock_service
from utils.json_store import read_json

earnings_bp = Blueprint("earnings", __name__, url_prefix="/api/earnings")


@earnings_bp.route("/<symbol>", methods=["GET"])
def get_earnings(symbol):
    try:
        next_date = stock_service.get_next_earnings_date(symbol)
        return jsonify({"symbol": symbol.upper(), "nextEarningsDate": next_date})
    except Exception as e:
        return jsonify({"error": str(e)}), 500


def _fetch_earnings(symbol):
    try:
        next_date = stock_service.get_next_earnings_date(symbol)
    except Exception:
        next_date = None
    return {"symbol": symbol, "nextEarningsDate": next_date}


@earnings_bp.route("/watchlist/upcoming", methods=["GET"])
def upcoming_for_watchlist():
    """Returns next earnings dates for every symbol currently on the watchlist."""
    watchlist = read_json(Config.WATCHLIST_FILE, default=[])
    symbols = [item.get("symbol") if isinstance(item, dict) else item for item in watchlist]

    if not symbols:
        return jsonify({"upcoming": []})

    with ThreadPoolExecutor(max_workers=min(len(symbols), 8)) as executor:
        results = list(executor.map(_fetch_earnings, symbols))

    results.sort(key=lambda r: (r["nextEarningsDate"] is None, r["nextEarningsDate"]))
    return jsonify({"upcoming": results})