"""Process-local bounded cache and shared provider cooldown (one worker)."""
from collections import OrderedDict
from copy import deepcopy
from functools import wraps
from threading import RLock
from time import monotonic


class StockNotFoundError(Exception):
    pass


class MarketDataUnavailable(Exception):
    pass


_lock = RLock()
_cache = OrderedDict()
_cooldown_until = 0
_MAX_ENTRIES = 256


def cached_market_data(ttl=300):
    def decorate(func):
        @wraps(func)
        def wrapped(*args, **kwargs):
            global _cooldown_until
            key = (func.__name__, args, tuple(sorted(kwargs.items())))
            # Serialize upstream calls: concurrent dashboard requests share results.
            with _lock:
                now = monotonic()
                entry = _cache.get(key)
                if entry and entry[0] > now:
                    _cache.move_to_end(key)
                    if entry[2]:
                        raise MarketDataUnavailable(entry[1])
                    return deepcopy(entry[1])
                if now < _cooldown_until:
                    raise MarketDataUnavailable('Market data provider is rate-limiting requests. Please try again in a few minutes.')
                try:
                    value = func(*args, **kwargs)
                except StockNotFoundError:
                    raise
                except Exception as exc:
                    text = str(exc).lower()
                    limited = '429' in text or 'too many requests' in text or 'rate limit' in text or 'ratelimit' in type(exc).__name__.lower()
                    if limited:
                        _cooldown_until = monotonic() + 120
                    message = ('Market data provider is rate-limiting requests. Please try again in a few minutes.'
                               if limited else 'Market data is temporarily unavailable. Please try again later.')
                    _cache[key] = (monotonic() + 120, message, True)
                    while len(_cache) > _MAX_ENTRIES:
                        _cache.popitem(last=False)
                    raise MarketDataUnavailable(message) from exc
                _cache[key] = (monotonic() + ttl, deepcopy(value), False)
                _cache.move_to_end(key)
                while len(_cache) > _MAX_ENTRIES:
                    _cache.popitem(last=False)
                return deepcopy(value)
        return wrapped
    return decorate
