import os
from dotenv import load_dotenv

load_dotenv()


class Config:
    GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")
    GEMINI_MODEL = os.getenv("GEMINI_MODEL", "gemini-1.5-flash")
    FLASK_DEBUG = os.getenv("FLASK_DEBUG", "False").lower() == "true"
    PORT = int(os.getenv("PORT", 5000))
    CORS_ORIGINS = [origin.strip().rstrip("/") for origin in os.getenv("CORS_ORIGINS", "http://localhost:5173").split(",") if origin.strip()]

    BASE_DIR = os.path.dirname(os.path.abspath(__file__))
    STORAGE_DIR = os.getenv("STORAGE_DIR", os.path.join(BASE_DIR, "storage"))
    WATCHLIST_FILE = os.path.join(STORAGE_DIR, "watchlist.json")
    ANALYSES_FILE = os.path.join(STORAGE_DIR, "analyses.json")
    CACHE_FILE = os.path.join(STORAGE_DIR, "cache.json")
