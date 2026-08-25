from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timezone
from flask import Blueprint, jsonify, request
from config import Config
from services import stock_service
from utils.json_store import read_json, write_json

watchlist_bp = Blueprint("watchlist", __name__, url_prefix="/api/watchlist")


def _enrich(item):
    symbol = item.get("symbol") if isinstance(item, dict) else item
    try:
        quote = stock_service.get_quote(symbol)
        return {**item, **quote} if isinstance(item, dict) else quote
    except Exception:
        return item if isinstance(item, dict) else {"symbol": symbol, "error": "unavailable"}


@watchlist_bp.route("", methods=["GET"])
def get_watchlist():
    watchlist = read_json(Config.WATCHLIST_FILE, default=[])
    if not watchlist:
        return jsonify({"watchlist": []})
    with ThreadPoolExecutor(max_workers=min(len(watchlist), 8)) as executor:
        enriched = list(executor.map(_enrich, watchlist))
    return jsonify({"watchlist": enriched})


@watchlist_bp.route("", methods=["POST"])
def add_to_watchlist():
    data = request.get_json(silent=True) or {}
    symbol = (data.get("symbol") or "").upper().strip()
    if not symbol:
        return jsonify({"error": "'symbol' is required."}), 400

    # Validate the ticker actually exists before saving it
    try:
        stock_service.get_quote(symbol)
    except stock_service.StockNotFoundError as e:
        return jsonify({"error": str(e)}), 404

    watchlist = read_json(Config.WATCHLIST_FILE, default=[])
    existing_symbols = {(w.get("symbol") if isinstance(w, dict) else w) for w in watchlist}
    if symbol in existing_symbols:
        return jsonify({"error": f"'{symbol}' is already on the watchlist."}), 409

    watchlist.append({"symbol": symbol, "addedAt": datetime.now(timezone.utc).isoformat()})
    write_json(Config.WATCHLIST_FILE, watchlist)
    return jsonify({"message": f"'{symbol}' added to watchlist.", "watchlist": watchlist}), 201


@watchlist_bp.route("/<symbol>", methods=["DELETE"])
def remove_from_watchlist(symbol):
    symbol = symbol.upper().strip()
    watchlist = read_json(Config.WATCHLIST_FILE, default=[])
    new_watchlist = [
        w for w in watchlist if (w.get("symbol") if isinstance(w, dict) else w) != symbol
    ]
    if len(new_watchlist) == len(watchlist):
        return jsonify({"error": f"'{symbol}' not found on watchlist."}), 404

    write_json(Config.WATCHLIST_FILE, new_watchlist)
    return jsonify({"message": f"'{symbol}' removed from watchlist.", "watchlist": new_watchlist})