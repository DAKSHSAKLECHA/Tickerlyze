from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timezone
from flask import Blueprint, jsonify, request, abort
from services import stock_service, database
from utils.validation import symbol as valid_symbol

watchlist_bp = Blueprint('watchlist', __name__, url_prefix='/api/watchlist')

def _enrich(item):
    try:
        return {**item, **stock_service.get_quote(item['symbol'])}
    except Exception:
        return {**item, 'priceUnavailable': True}

@watchlist_bp.get('')
def get_watchlist():
    items = database.watchlist()
    if request.args.get('symbolsOnly') == 'true' or not items:
        return jsonify(watchlist=items)
    with ThreadPoolExecutor(max_workers=min(len(items), 4)) as pool:
        return jsonify(watchlist=list(pool.map(_enrich, items)))

@watchlist_bp.post('')
def add_to_watchlist():
    body = request.get_json(silent=True)
    if not isinstance(body, dict):
        abort(400, description='Send a JSON object with a symbol.')
    symbol = valid_symbol(body.get('symbol'))
    existing = database.watchlist()
    if any(row['symbol'] == symbol for row in existing):
        return jsonify(error=f'{symbol} is already on your watchlist.'), 409
    try:
        stock_service.get_quote(symbol)
    except stock_service.MarketDataUnavailable:
        return jsonify(error='Could not verify this stock right now. Please retry shortly.'), 503
    except stock_service.StockNotFoundError:
        return jsonify(error='No price data was found for this ticker.'), 404
    try:
        added = database.add_watch(symbol, datetime.now(timezone.utc).isoformat())
    except database.WatchlistFull:
        return jsonify(error='Your watchlist is full. Remove a stock before adding another.'), 400
    if not added:
        return jsonify(error=f'{symbol} is already on your watchlist.'), 409
    return jsonify(message=f'{symbol} added.', watchlist=database.watchlist()), 201

@watchlist_bp.delete('/<symbol>')
def remove_from_watchlist(symbol):
    symbol = valid_symbol(symbol)
    if not database.remove_watch(symbol):
        return jsonify(error='This stock is not on your watchlist.'), 404
    return jsonify(message=f'{symbol} removed.', watchlist=database.watchlist())
