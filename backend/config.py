import os
from dotenv import load_dotenv

load_dotenv()

class Config:
    OPENROUTER_API_KEY = os.getenv('OPENROUTER_API_KEY', '')
    DATABASE_URL = os.getenv('DATABASE_URL', '')
    TRUST_PROXY_COUNT = int(os.getenv('TRUST_PROXY_COUNT', '0'))
    AI_DAILY_LIMIT = int(os.getenv('AI_DAILY_LIMIT', '20'))
    WATCHLIST_LIMIT = 30
    FLASK_DEBUG = os.getenv('FLASK_DEBUG', 'False').lower() == 'true'
    PORT = int(os.getenv('PORT', '5000'))
    CORS_ORIGINS = [origin.strip().rstrip('/') for origin in os.getenv('CORS_ORIGINS', 'http://localhost:5173').split(',') if origin.strip()]
    BASE_DIR = os.path.dirname(os.path.abspath(__file__))
    STORAGE_DIR = os.getenv('STORAGE_DIR', os.path.join(BASE_DIR, 'storage'))
    ANALYSES_FILE = os.path.join(STORAGE_DIR, 'analyses.json')
