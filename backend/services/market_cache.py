"""Bounded process-local cache with per-key request sharing and stale fallback."""
from collections import OrderedDict
from concurrent.futures import Future
from copy import deepcopy
from datetime import datetime, timezone
from functools import wraps
from threading import RLock
from time import monotonic, time
import json
import logging
from services import database

class StockNotFoundError(Exception):
    pass

class MarketDataUnavailable(Exception):
    pass

_lock = RLock()
_cache = OrderedDict()
_inflight = {}
_cooldown_until = 0
_MAX_ENTRIES = 256

def cached_market_data(ttl=300, stale_ttl=0):
    def decorate(func):
        @wraps(func)
        def wrapped(*args, **kwargs):
            global _cooldown_until
            key = (func.__name__, args, tuple(sorted(kwargs.items())))
            def present(entry, stale=False):
                value = deepcopy(entry['value'])
                if stale_ttl and isinstance(value, dict):
                    value.update(fetchedAt=entry['fetchedAt'], stale=stale)
                return value
            def fallback(entry):
                if entry and not entry.get('error') and monotonic() < entry['expires'] + stale_ttl:
                    return present(entry, True)
                raise MarketDataUnavailable('Market data is temporarily unavailable. Please try again later.')
            # Disk/remote database I/O must not hold the global cache lock.
            restored = None
            with _lock:
                load_saved = stale_ttl and key not in _cache
            if load_saved:
                try:
                    saved = database.snapshot(json.dumps(key))
                    if saved and time() - saved[1] < ttl + stale_ttl:
                        payload, created = saved
                        restored = dict(value=payload['value'], fetchedAt=payload['fetchedAt'], expires=monotonic() + ttl - (time() - created))
                except Exception:
                    logging.getLogger(__name__).warning('Saved market data could not be loaded')
            with _lock:
                now = monotonic()
                entry = _cache.get(key)
                if not entry and restored:
                    entry = _cache[key] = restored
                    while len(_cache) > _MAX_ENTRIES:
                        _cache.popitem(last=False)
                if entry and entry['expires'] > now:
                    _cache.move_to_end(key)
                    if entry.get('error'):
                        raise MarketDataUnavailable(entry['error'])
                    return present(entry)
                if now < _cooldown_until or (entry and entry.get('retryAt', 0) > now):
                    return fallback(entry)
                future = _inflight.get(key)
                owner = future is None
                if owner:
                    future = _inflight[key] = Future()
            if not owner:
                return deepcopy(future.result())
            try:
                value = func(*args, **kwargs)
                with _lock:
                    entry = dict(value=deepcopy(value), expires=monotonic() + ttl,
                                 fetchedAt=datetime.now(timezone.utc).isoformat())
                    _cache[key] = entry
                    _cache.move_to_end(key)
                    while len(_cache) > _MAX_ENTRIES:
                        _cache.popitem(last=False)
                result = present(entry)
                if stale_ttl:
                    try:
                        database.save_snapshot(json.dumps(key), {'value': entry['value'], 'fetchedAt': entry['fetchedAt']})
                    except Exception:
                        logging.getLogger(__name__).warning('Market snapshot could not be saved')
            except StockNotFoundError as exc:
                future.set_exception(exc)
                raise
            except Exception as exc:
                message = str(exc).lower() + type(exc).__name__.lower()
                limited = any(s in message for s in ('429', 'too many requests', 'rate limit', 'ratelimit'))
                with _lock:
                    if limited:
                        _cooldown_until = monotonic() + 120
                    if entry and not entry.get('error') and monotonic() < entry['expires'] + stale_ttl:
                        entry['retryAt'] = monotonic() + 120
                        result = present(entry, True)
                    else:
                        error = ('Market data provider is rate-limiting requests. Please try again in a few minutes.'
                                 if limited else 'Market data is temporarily unavailable. Please try again later.')
                        _cache[key] = dict(error=error, expires=monotonic() + 120)
                        while len(_cache) > _MAX_ENTRIES:
                            _cache.popitem(last=False)
                        failure = MarketDataUnavailable(error)
                        future.set_exception(failure)
                        raise failure from exc
            finally:
                with _lock:
                    _inflight.pop(key, None)
            future.set_result(deepcopy(result))
            return result
        return wrapped
    return decorate
