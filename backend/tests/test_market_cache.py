import unittest
from concurrent.futures import ThreadPoolExecutor
from unittest.mock import patch
from services import market_cache as cache


class MarketCacheTests(unittest.TestCase):
    def setUp(self):
        cache._cache.clear()
        cache._cooldown_until = 0

    def test_concurrent_requests_share_one_call_and_copies(self):
        calls = []
        @cache.cached_market_data()
        def quote(symbol):
            calls.append(symbol)
            return {"price": 10}
        with ThreadPoolExecutor(max_workers=8) as pool:
            results = list(pool.map(quote, ["AAPL"] * 8))
        self.assertEqual(len(calls), 1)
        results[0]["price"] = 0
        self.assertEqual(quote("AAPL")["price"], 10)

    def test_global_cooldown_and_recovery(self):
        calls = []
        @cache.cached_market_data()
        def quote(symbol):
            calls.append(symbol)
            if len(calls) == 1:
                raise RuntimeError("429 Too Many Requests")
            return 10
        with patch.object(cache, "monotonic", return_value=0):
            with self.assertRaises(cache.MarketDataUnavailable): quote("A")
            with self.assertRaises(cache.MarketDataUnavailable): quote("B")
        self.assertEqual(calls, ["A"])
        with patch.object(cache, "monotonic", return_value=121):
            self.assertEqual(quote("B"), 10)

    def test_expiry_and_failed_calls_are_cached(self):
        calls = []
        @cache.cached_market_data(ttl=300)
        def data(symbol):
            calls.append(symbol)
            if symbol == "bad": raise RuntimeError("provider down")
            return 1
        with patch.object(cache, "monotonic", return_value=0):
            data("ok")
            for _ in range(2):
                with self.assertRaises(cache.MarketDataUnavailable): data("bad")
        self.assertEqual(calls, ["ok", "bad"])
        with patch.object(cache, "monotonic", return_value=301): data("ok")
        self.assertEqual(calls, ["ok", "bad", "ok"])

    def test_not_found_keeps_existing_error_type(self):
        @cache.cached_market_data()
        def missing(): raise cache.StockNotFoundError("Unknown ticker")
        with self.assertRaises(cache.StockNotFoundError): missing()

    def test_cache_is_bounded(self):
        @cache.cached_market_data()
        def value(key): return key
        for i in range(300): value(i)
        self.assertEqual(len(cache._cache), 256)

if __name__ == '__main__':
    unittest.main()
