"""Small helper for reading/writing JSON files used as our 'database'."""
import json
import os
import threading

_lock = threading.Lock()


def read_json(path, default=None):
    if default is None:
        default = []
    if not os.path.exists(path):
        return default
    with _lock:
        try:
            with open(path, "r", encoding="utf-8") as f:
                content = f.read().strip()
                if not content:
                    return default
                return json.loads(content)
        except (json.JSONDecodeError, OSError):
            return default


def write_json(path, data):
    with _lock:
        os.makedirs(os.path.dirname(path), exist_ok=True)
        tmp_path = f"{path}.tmp"
        with open(tmp_path, "w", encoding="utf-8") as f:
            json.dump(data, f, indent=2, default=str)
        os.replace(tmp_path, path)
