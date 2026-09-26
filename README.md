# AI Finance Controller

A full-stack web app that helps investors analyze stocks using live market
data (Yahoo Finance) and AI-generated insights (Google Gemini). Includes a
dashboard, stock search, AI analysis, an earnings tracker, a rules-based risk
engine, and a personal watchlist.

> ⚠️ **Disclaimer:** This tool is for educational and informational purposes
> only. Nothing it produces is financial advice.

---

## Tech Stack

| Layer     | Technology                          |
|-----------|--------------------------------------|
| Frontend  | React (Vite) + Tailwind CSS          |
| Backend   | Python Flask (REST API)              |
| Data      | Yahoo Finance via `yfinance`         |
| AI        | Google Gemini API                    |
| Storage   | JSON files (no database required)    |

---

## Folder Structure

```
ai-finance-controller/
├── backend/
│   ├── app.py                  # Flask app factory + entrypoint
│   ├── config.py                # Env-driven configuration
│   ├── requirements.txt
│   ├── .env.example
│   ├── routes/                  # One blueprint per feature
│   │   ├── stock_routes.py
│   │   ├── ai_routes.py
│   │   ├── risk_routes.py
│   │   ├── earnings_routes.py
│   │   ├── watchlist_routes.py
│   │   └── dashboard_routes.py
│   ├── services/                # Business logic, external calls
│   │   ├── stock_service.py     # yfinance wrapper
│   │   ├── ai_service.py        # Gemini prompt + parsing
│   │   └── risk_engine.py       # Risk scoring model
│   ├── storage/                 # JSON "database"
│   │   ├── watchlist.json
│   │   └── analyses.json
│   └── utils/
│       └── json_store.py        # Safe JSON read/write helper
│
├── frontend/
│   ├── src/
│   │   ├── api/client.js        # Axios wrapper for all API calls
│   │   ├── components/          # Reusable UI (cards, navbar, etc.)
│   │   ├── pages/                # Dashboard, Search, StockDetail, Earnings, Watchlist
│   │   ├── App.jsx
│   │   └── main.jsx
│   ├── index.html
│   ├── package.json
│   ├── tailwind.config.js
│   ├── vite.config.js
│   └── .env.example
│
├── screenshots/                 # Sample UI screenshots (add your own)
└── README.md
```

---

## Getting Started

### 1. Backend Setup

```bash
cd backend
python3 -m venv venv
source venv/bin/activate      # Windows: venv\Scripts\activate
pip install -r requirements.txt

cp .env.example .env
# Edit .env and add your GEMINI_API_KEY (https://aistudio.google.com/apikey)

python app.py
```

The API runs at `http://localhost:5000`.

### 2. Frontend Setup

```bash
cd frontend
npm install

cp .env.example .env
# VITE_API_BASE_URL should point to your backend, e.g. http://localhost:5000/api

npm run dev
```

The app runs at `http://localhost:5173`.

---

## Environment Variables

**backend/.env**
| Variable         | Description                                  |
|-------------------|-----------------------------------------------|
| `GEMINI_API_KEY`  | Your Google Gemini API key (required for AI Analysis) |
| `GEMINI_MODEL`    | Gemini model name (default: `gemini-1.5-flash`) |
| `FLASK_DEBUG`     | `True`/`False`                               |
| `PORT`            | Backend port (default `5000`)                |
| `CORS_ORIGINS`    | Comma-separated list of allowed frontend origins |

**frontend/.env**
| Variable              | Description                     |
|------------------------|----------------------------------|
| `VITE_API_BASE_URL`   | Base URL of the backend REST API |

---

## REST API Reference

All endpoints return JSON and are prefixed with `/api`.

| Method | Endpoint                              | Description                                   |
|--------|----------------------------------------|------------------------------------------------|
| GET    | `/health`                              | Health check                                   |
| GET    | `/dashboard/overview`                  | Market indexes, watchlist count, recent analyses |
| GET    | `/stocks/search?q=`                    | Search tickers by name/symbol                 |
| GET    | `/stocks/<symbol>`                     | Quote: price, market cap, PE, 52W high/low, etc. |
| GET    | `/stocks/<symbol>/history?period=`     | Historical OHLCV data                         |
| POST   | `/ai/analyze/<symbol>`                 | Generate AI analysis (summary, bull/bear, risks, takeaways) |
| GET    | `/ai/analyses?limit=`                  | Recent AI analyses                            |
| GET    | `/risk/<symbol>`                       | Risk score + Low/Medium/High rating           |
| GET    | `/earnings/<symbol>`                   | Next earnings date for a symbol               |
| GET    | `/earnings/watchlist/upcoming`         | Next earnings dates for all watchlist symbols |
| GET    | `/watchlist`                           | Get current watchlist (with live quotes)      |
| POST   | `/watchlist`                           | Add a symbol — body: `{ "symbol": "AAPL" }`   |
| DELETE | `/watchlist/<symbol>`                  | Remove a symbol from the watchlist            |

All endpoints return a `{ "error": "message" }` payload with an appropriate
HTTP status code (400/404/500/502) on failure, and the frontend surfaces
these messages directly in the UI.

---

## Risk Engine Methodology

The risk score (0–100, lower is safer) is a weighted blend of three factors
pulled straight from the stock's fundamentals:

- **PE Ratio** (35%) — very low, negative, or very high PE increases risk
- **Revenue Growth** (35%) — contracting or stagnant revenue increases risk
- **Debt-to-Equity** (30%) — higher leverage increases risk

Final score buckets: **Low** (< 35), **Medium** (35–65), **High** (≥ 65).
See `backend/services/risk_engine.py` for the exact scoring curve — it's a
transparent heuristic, not a proprietary black box, so you can tune the
weights and thresholds to your own taste.

---

## Error Handling

- Backend: every route wraps external calls (`yfinance`, Gemini) in
  try/except and returns structured JSON errors with proper status codes.
  Invalid tickers return `404`; upstream/API failures return `500`/`502`.
- Frontend: an Axios interceptor normalizes all errors to `err.message`,
  and every page renders a dismissible error banner instead of crashing.

---

## Screenshots

Add screenshots of the running app to the `screenshots/` folder, e.g.:

- `screenshots/dashboard.png`
- `screenshots/stock-search.png`
- `screenshots/ai-analysis.png`
- `screenshots/risk-engine.png`
- `screenshots/watchlist.png`

(Run both servers, click through the app, and drop your captures here —
they aren't included in this scaffold since they depend on your own data.)

---

## Notes & Limitations

- `yfinance` pulls from an unofficial Yahoo Finance endpoint; occasional
  rate-limiting or missing fields (e.g. `debtToEquity` for some tickers) is
  expected — the UI shows "N/A" gracefully rather than breaking.
- Earnings dates come from Yahoo's calendar data, which isn't always
  populated far in advance.
- JSON-file storage is intentionally simple for this scope. For multi-user
  or production use, swap `utils/json_store.py` for a real database without
  touching the route/service layers.

## Deploy: Railway API and Vercel frontend

1. Railway: deploy the repository with Root Directory `/backend`. Use start
   command `gunicorn app:app --bind 0.0.0.0:$PORT --workers 1 --threads 4 --timeout 120`.
   Dependencies come from `requirements.txt`. Set `GEMINI_API_KEY`, a model
   available to your Google account in `GEMINI_MODEL`, and `FLASK_DEBUG=False`.
2. Generate a public backend domain. Check `https://YOUR-BACKEND/api/health`:
   it should return `{"status":"ok"}`. `/` is not a frontend page on this API.
3. Vercel: import the repository, choose Root Directory `frontend`, preset
   Vite, build `npm run build`, output `dist`. Set `VITE_API_BASE_URL` to
   `https://YOUR-BACKEND/api` before deploying. Redeploy after changing it.
4. On Railway set `CORS_ORIGINS=https://YOUR-FRONTEND.vercel.app` (no path).
   Multiple origins can be comma-separated. Keep the Gemini key on Railway.
5. For persistent watchlists/analyses, attach a Railway volume at `/data` and
   set `STORAGE_DIR=/data`. Otherwise deployment restarts can lose JSON data.
   Keep one worker and one replica with the current file storage design.

Local development: run `python app.py` inside `backend`, then `npm run dev`
inside `frontend`. Set `VITE_API_BASE_URL=/api` in `frontend/.env` and restart
Vite. Its proxy forwards `/api` to `127.0.0.1:5000`. Ensure that port runs
Tickerlyze, not another project's backend. Health is `/api/health`; dashboard
is `/api/dashboard/overview`. A 404 on these indicates the wrong server or URL.

### Current Vercel API connection

Production frontend calls `/api` on its own origin. `frontend/vercel.json`
proxies those requests to `https://tickerlyze-production.up.railway.app`.
`VITE_API_BASE_URL` now only applies during local development; remove the
production variable to avoid confusion. If the Railway domain changes, update
`frontend/vercel.json`. This supersedes the direct-browser API setup above.
Both Railway (dependency update) and Vercel (proxy/client update) need redeploying.
