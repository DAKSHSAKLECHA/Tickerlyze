from concurrent.futures import Future, TimeoutError
from datetime import datetime, timezone
from threading import RLock
from flask import Blueprint, current_app, jsonify, request
from config import Config
from services import stock_service, ai_service, database
from utils.validation import symbol as valid_symbol

ai_bp = Blueprint('ai', __name__, url_prefix='/api/ai')
_lock = RLock()
_pending = {}
_retry_after = {}
_CACHE_SECONDS = 6 * 3600

def _current_saved(symbol):
    record = database.analysis(symbol)
    analysis = record.get('analysis') if isinstance(record, dict) else None
    return record if isinstance(analysis, dict) and analysis.get('schemaVersion') == 2 else None

def _recover(symbol, message):
    saved = _current_saved(symbol)
    if saved:
        return {**saved, 'cached': True, 'notice': message + ' Showing saved AI research from the displayed generation time.'}
    return {'symbol': symbol, 'analysis': None, 'status': 'unavailable', 'notice': message}

def _generate_record(symbol):
    quote = stock_service.get_quote(symbol)
    analysis = ai_service.generate_analysis(quote)
    record = {'symbol': symbol, 'name': quote.get('shortName'), 'analysis': analysis,
              'generatedAt': datetime.now(timezone.utc).isoformat(), 'priceAtAnalysis': quote.get('currentPrice'),
              'marketDataFetchedAt': quote.get('fetchedAt'), 'marketDataStale': bool(quote.get('stale')),
              'provider': 'OpenRouter free models'}
    database.save_analysis(record)
    return record

@ai_bp.post('/analyze/<symbol>')
def analyze_stock(symbol):
    symbol = valid_symbol(symbol)
    body = request.get_json(silent=True) or {}
    refresh = isinstance(body, dict) and body.get('refresh') is True
    saved = _current_saved(symbol)
    if saved and not refresh:
        try:
            age = (datetime.now(timezone.utc) - datetime.fromisoformat(saved['generatedAt'])).total_seconds()
            if 0 <= age < _CACHE_SECONDS:
                return jsonify({**saved, 'cached': True, 'notice': 'Showing saved research from the displayed generation time.'})
        except (KeyError, TypeError, ValueError):
            pass
    if not Config.OPENROUTER_API_KEY:
        return jsonify(_recover(symbol, 'AI research is not connected. Please configure the backend OpenRouter key.'))
    now = datetime.now(timezone.utc).timestamp()
    with _lock:
        cooldown = _retry_after.get(symbol)
        if cooldown and cooldown[0] > now:
            return jsonify(_recover(symbol, cooldown[1]))
        if symbol in _pending:
            future = _pending[symbol]
            owner = False
        else:
            # Bound upstream work; cached research does not consume these budgets.
            if len(_pending) >= 2:
                return jsonify(_recover(symbol, 'AI is handling other requests. Please check again shortly.'))
            if current_app.config['RATE_LIMIT_ENABLED']:
                for scope, limit, seconds in (
                    ('ai:ip:' + (request.remote_addr or 'unknown'), 6, 3600),
                    ('ai:global', Config.AI_DAILY_LIMIT, 86400),
                ):
                    allowed, retry = database.consume(scope, limit, seconds)
                    if not allowed:
                        payload = _recover(symbol, 'The free AI research budget is resting. Please try later; saved research remains available.')
                        response = jsonify(payload)
                        response.headers['Retry-After'] = str(retry)
                        return response
            future = _pending[symbol] = Future()
            owner = True
    if not owner:
        try:
            return jsonify(future.result(timeout=45))
        except TimeoutError:
            return jsonify(_recover(symbol, 'Research is still being prepared. Please check again shortly.'))
    try:
        result = _generate_record(symbol)
    except Exception as exc:
        message = (str(exc) if isinstance(exc, ai_service.AIServiceError)
                   else 'Fresh AI research is temporarily unavailable. Please try shortly.')
        result = _recover(symbol, message)
        with _lock:
            _retry_after[symbol] = (now + (300 if getattr(exc, 'status_code', 0) == 429 else 60), message)
            for key in list(_retry_after):
                if _retry_after[key][0] <= now:
                    del _retry_after[key]
            while len(_retry_after) > 256:
                del _retry_after[next(iter(_retry_after))]
    with _lock:
        future.set_result(result)
        _pending.pop(symbol, None)
    return jsonify(result)

@ai_bp.get('/analyses/<symbol>')
def latest_analysis_for_symbol(symbol):
    symbol = valid_symbol(symbol)
    saved = _current_saved(symbol)
    if saved:
        return jsonify(saved)
    if database.analysis(symbol):
        return jsonify(analysis=None, status='outdated', notice='The saved summary uses the older format. Generate a new grounded analysis.')
    return jsonify(None)
