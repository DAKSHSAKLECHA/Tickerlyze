"""Transactional SQLite/PostgreSQL storage. No credentials are sent to clients."""
from contextlib import contextmanager
from pathlib import Path
from threading import RLock
import json
import sqlite3
import time
from config import Config

_lock = RLock()
_ready = set()
SCHEMA = (
    'CREATE TABLE IF NOT EXISTS watchlist (symbol TEXT PRIMARY KEY, added_at TEXT NOT NULL)',
    'CREATE TABLE IF NOT EXISTS metadata (key TEXT PRIMARY KEY, value TEXT NOT NULL)',
    'CREATE TABLE IF NOT EXISTS analyses (symbol TEXT PRIMARY KEY, record TEXT NOT NULL, created_at DOUBLE PRECISION NOT NULL)',
    'CREATE TABLE IF NOT EXISTS quotas (scope TEXT NOT NULL, bucket BIGINT NOT NULL, hits INTEGER NOT NULL, expires_at DOUBLE PRECISION NOT NULL, PRIMARY KEY (scope, bucket))',
    'CREATE TABLE IF NOT EXISTS snapshots (cache_key TEXT PRIMARY KEY, payload TEXT NOT NULL, created_at DOUBLE PRECISION NOT NULL)',
)

class WatchlistFull(Exception):
    pass

@contextmanager
def connection():
    remote = bool(Config.DATABASE_URL)
    if remote:
        import psycopg
        from psycopg.rows import dict_row
        conn = psycopg.connect(Config.DATABASE_URL, row_factory=dict_row, connect_timeout=8)
        identity = Config.DATABASE_URL
    else:
        path = Path(Config.STORAGE_DIR) / 'tickerlyze.db'
        path.parent.mkdir(parents=True, exist_ok=True)
        conn = sqlite3.connect(path, timeout=10)
        conn.row_factory = sqlite3.Row
        conn.execute('PRAGMA busy_timeout=10000')
        identity = str(path.resolve())
    def execute(sql, params=()):
        return conn.execute(sql.replace('?', '%s') if remote else sql, params)
    try:
        with _lock:
            if identity not in _ready:
                for sql in SCHEMA:
                    execute(sql)
                conn.commit()
                _ready.add(identity)
        yield execute
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()

def init_database():
    with connection():
        pass

def watchlist():
    with connection() as execute:
        return [{'symbol': row['symbol'], 'addedAt': row['added_at']} for row in execute(
            'SELECT symbol, added_at FROM watchlist ORDER BY added_at, symbol').fetchall()]

def add_watch(symbol, added_at):
    with connection() as execute:
        if Config.DATABASE_URL:
            execute("SELECT pg_advisory_xact_lock(hashtext('tickerlyze-shared-watchlist'))")
        else:
            execute('BEGIN IMMEDIATE')
        if execute('SELECT symbol FROM watchlist WHERE symbol=?', (symbol,)).fetchone():
            return False
        count = execute('SELECT COUNT(*) AS total FROM watchlist').fetchone()['total']
        if count >= Config.WATCHLIST_LIMIT:
            raise WatchlistFull()
        execute('INSERT INTO watchlist (symbol, added_at) VALUES (?, ?)', (symbol, added_at))
        return True

def remove_watch(symbol):
    with connection() as execute:
        return execute('DELETE FROM watchlist WHERE symbol=?', (symbol,)).rowcount > 0

def recent_analyses(limit=5):
    with connection() as execute:
        rows = execute('SELECT record FROM analyses ORDER BY created_at DESC LIMIT ?', (limit,)).fetchall()
        return [json.loads(row['record']) for row in rows]

def analysis(symbol):
    with connection() as execute:
        row = execute('SELECT record FROM analyses WHERE symbol=?', (symbol,)).fetchone()
        return json.loads(row['record']) if row else None

def save_analysis(record):
    with connection() as execute:
        execute('INSERT INTO analyses (symbol, record, created_at) VALUES (?, ?, ?) ON CONFLICT(symbol) DO UPDATE SET record=excluded.record, created_at=excluded.created_at',
                (record['symbol'], json.dumps(record, allow_nan=False), time.time()))
        execute('DELETE FROM analyses WHERE symbol NOT IN (SELECT symbol FROM analyses ORDER BY created_at DESC LIMIT 100)')

def consume(scope, limit, seconds):
    now = time.time()
    bucket = int(now // seconds)
    with connection() as execute:
        row = execute('INSERT INTO quotas (scope, bucket, hits, expires_at) VALUES (?, ?, 1, ?) ON CONFLICT(scope, bucket) DO UPDATE SET hits=quotas.hits+1 RETURNING hits',
                      (scope, bucket, (bucket + 1) * seconds)).fetchone()
        execute('DELETE FROM quotas WHERE expires_at < ?', (now,))
        return row['hits'] <= limit, max(1, int((bucket + 1) * seconds - now))

def snapshot(key):
    with connection() as execute:
        row = execute('SELECT payload, created_at FROM snapshots WHERE cache_key=?', (key,)).fetchone()
        return (json.loads(row['payload']), row['created_at']) if row else None

def save_snapshot(key, payload):
    with connection() as execute:
        execute('INSERT INTO snapshots (cache_key, payload, created_at) VALUES (?, ?, ?) ON CONFLICT(cache_key) DO UPDATE SET payload=excluded.payload, created_at=excluded.created_at',
                (key, json.dumps(payload, allow_nan=False), time.time()))
        execute('DELETE FROM snapshots WHERE cache_key NOT IN (SELECT cache_key FROM snapshots ORDER BY created_at DESC LIMIT 256)')

def import_legacy_data():
    """Import genuine existing JSON data once; keep the original shared watchlist."""
    from datetime import datetime, timezone
    with connection() as execute:
        if execute("SELECT value FROM metadata WHERE key='legacy-import'").fetchone():
            return
    def legacy(path):
        try:
            value = json.loads(path.read_text(encoding='utf-8'))
            return value if isinstance(value, list) else []
        except (OSError, ValueError):
            return []
    watches = legacy(Path(Config.STORAGE_DIR) / 'watchlist.json')
    records = legacy(Path(Config.ANALYSES_FILE))
    with connection() as execute:
        for item in watches[:Config.WATCHLIST_LIMIT]:
            symbol = item.get('symbol') if isinstance(item, dict) else item
            if isinstance(symbol, str) and symbol:
                added = item.get('addedAt') if isinstance(item, dict) else None
                execute('INSERT INTO watchlist (symbol, added_at) VALUES (?, ?) ON CONFLICT(symbol) DO NOTHING',
                        (symbol.upper().strip(), added or datetime.now(timezone.utc).isoformat()))
        for record in reversed(records[:50]):
            if isinstance(record, dict) and isinstance(record.get('symbol'), str) and isinstance(record.get('analysis'), dict):
                execute('INSERT INTO analyses (symbol, record, created_at) VALUES (?, ?, ?) ON CONFLICT(symbol) DO NOTHING',
                        (record['symbol'], json.dumps(record, allow_nan=False), time.time()))
        execute("INSERT INTO metadata (key, value) VALUES ('legacy-import', 'done') ON CONFLICT(key) DO NOTHING")
