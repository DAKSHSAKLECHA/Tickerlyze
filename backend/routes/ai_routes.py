from datetime import datetime, timezone
from concurrent.futures import Future, TimeoutError
from threading import RLock
from flask import Blueprint, jsonify, request
from config import Config
from services import stock_service, ai_service
from utils.json_store import read_json, write_json

ai_bp = Blueprint('ai', __name__, url_prefix='/api/ai')
_lock = RLock()
_pending = {}
_retry_after = {}
_CACHE_SECONDS = 6 * 3600

def _saved(symbol):
    for record in read_json(Config.ANALYSES_FILE, default=[]):
        if record.get('symbol') == symbol and isinstance(record.get('analysis'), dict):
            return record
    return None

def _recover(symbol, message):
    record = _saved(symbol)
    if record:
        return {**record, 'cached': True, 'notice': message + ' Showing your last saved AI analysis; check its generation date.'}
    return {'symbol': symbol, 'analysis': None, 'status': 'unavailable', 'notice': message}

def _generate_record(symbol):
    if not Config.OPENROUTER_API_KEY:
        raise ai_service.AIServiceError('Free AI is not connected yet. Add OPENROUTER_API_KEY to the backend environment.')
    quote = stock_service.get_quote(symbol)
    analysis = ai_service.generate_analysis(quote)
    record = {'symbol': quote['symbol'], 'name': quote.get('shortName'),
              'generatedAt': datetime.now(timezone.utc).isoformat(),
              'priceAtAnalysis': quote.get('currentPrice'), 'analysis': analysis,
              'provider': 'OpenRouter free models'}
    try:
        with _lock:
            analyses = read_json(Config.ANALYSES_FILE, default=[])
            analyses.insert(0, record)
            write_json(Config.ANALYSES_FILE, analyses[:50])
    except OSError:
        return {**record, 'notice': 'Analysis generated, but it could not be saved. Please check backend storage.'}
    return record

@ai_bp.route('/analyze/<symbol>', methods=['POST'])
def analyze_stock(symbol):
    symbol = symbol.upper().strip()
    body = request.get_json(silent=True) or {}
    refresh = isinstance(body, dict) and body.get('refresh') is True
    saved = _saved(symbol)
    if saved and not refresh:
        try:
            age = (datetime.now(timezone.utc) - datetime.fromisoformat(saved['generatedAt'])).total_seconds()
            if 0 <= age < _CACHE_SECONDS:
                return jsonify({**saved, 'cached': True, 'notice': 'Showing saved AI research from the displayed generation time.'})
        except (KeyError, ValueError, TypeError):
            pass
    with _lock:
        cooldown = _retry_after.get(symbol)
        if cooldown and cooldown[0] > datetime.now(timezone.utc).timestamp():
            return jsonify(_recover(symbol, cooldown[1]))
        future = _pending.get(symbol)
        owner = future is None
        if owner:
            future = _pending[symbol] = Future()
    if not owner:
        try:
            return jsonify(future.result(timeout=45))
        except TimeoutError:
            return jsonify(_recover(symbol, 'AI research is still being prepared. Please check again shortly.'))
    try:
        result = _generate_record(symbol)
    except stock_service.StockNotFoundError:
        result = _recover(symbol, 'No price data was found for this symbol.')
    except Exception as exc:
        message = (str(exc) if isinstance(exc, ai_service.AIServiceError)
                   else 'AI research is temporarily unavailable. Please retry shortly.')
        result = _recover(symbol, message)
        with _lock:
            now = datetime.now(timezone.utc).timestamp()
            _retry_after[symbol] = (now + (300 if getattr(exc, 'status_code', None) == 429 else 60), message)
            for key in list(_retry_after):
                if _retry_after[key][0] <= now:
                    del _retry_after[key]
            while len(_retry_after) > 256:
                del _retry_after[next(iter(_retry_after))]
    with _lock:
        future.set_result(result)
        _pending.pop(symbol, None)
    return jsonify(result)


@ai_bp.route("/analyses", methods=["GET"])
def recent_analyses():
    limit = request.args.get("limit", 10, type=int)
    analyses = read_json(Config.ANALYSES_FILE, default=[])
    return jsonify({"analyses": analyses[:limit]})


@ai_bp.route("/analyses/<symbol>", methods=["GET"])
def latest_analysis_for_symbol(symbol):
    """Returns the most recent saved analysis for a symbol, if one exists."""
    symbol = symbol.upper().strip()
    analyses = read_json(Config.ANALYSES_FILE, default=[])
    for record in analyses:
        if record.get("symbol") == symbol:
            return jsonify(record)
    return jsonify(None)