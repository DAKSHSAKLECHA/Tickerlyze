# AI Finance Controller

A full-stack web app that helps investors analyze stocks using live market
data (Yahoo Finance) and AI-generated insights (Google Gemini). Includes a
dashboard, stock search, AI analysis, an earnings tracker, plain-language price risk
indicators, and a personal watchlist.

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
│   │   └── risk_engine.py       # Historical price indicators
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
| GET    | `/risk/<symbol>`                       | Historical price indicators + freshness metadata           |
| GET    | `/earnings/<symbol>`                   | Next earnings date for a symbol               |
| GET    | `/earnings/watchlist/upcoming`         | Next earnings dates for all watchlist symbols |
| GET    | `/watchlist`                           | Get current watchlist (with live quotes)      |
| POST   | `/watchlist`                           | Add a symbol — body: `{ "symbol": "AAPL" }`   |
| DELETE | `/watchlist/<symbol>`                  | Remove a symbol from the watchlist            |

All endpoints return a `{ "error": "message" }` payload with an appropriate
HTTP status code (400/404/500/502) on failure, and the frontend surfaces
these messages directly in the UI.

---

## Price Movement & Risk

The stock quote replaces P/E and EPS cards with **Below 1-Year High**
(`(1 - price / yearlyHigh) * 100`) and **Above 1-Year Low**
(`(price / yearlyLow - 1) * 100`). Missing reference prices display
"Unavailable". Negative comparisons indicate prices outside the supplied
yearly range. These comparisons describe price position, not valuation.

The risk section uses the same six-month daily history as the chart:

- **Daily Price Swings:** average absolute day-to-day percentage change
  during the last three calendar months of the available history.
- **Largest Recent Fall:** largest percentage fall from a prior closing
  price peak across the available six-month history.
- **Six-Month Performance:** percentage change from the first to the last
  available closing price. New listings may cover a shorter period.

Each indicator shows its actual dates. At least two valid positive closing
prices are required. Historical behaviour does not predict future returns
or capture every business risk. There is no composite score or risk rating.

`GET /api/stocks/<symbol>/history` returns `data`, `priceIndicators`,
`fetchedAt`, and `stale`, alongside `symbol` and `period`.
`GET /api/risk/<symbol>` reuses the cached six-month history and returns
`priceIndicators`, `fetchedAt`, `stale`, and `symbol`; the former
`riskScore`, `riskLevel`, and fundamentals breakdown have been removed.

### Loading and provider interruptions

Quotes, history, earnings, watchlist, and saved AI analysis load independently.
Switching symbols cancels stock-page reads and discards outdated results.
Chart code loads separately from the initial application bundle.

The bounded process-local cache shares concurrent identical requests without
blocking unrelated keys. Successful quotes and history remain fresh for five
minutes. If refreshing fails, saved data can be used for up to one additional
hour and is visibly labelled with its original fetch time. Failed refreshes
back off for two minutes; provider rate limits trigger a shared two-minute
cooldown. The cache resets on backend restart and is separate per worker.
Fetch timestamps indicate retrieval time, not the exchange's quote time.
Normal frontend requests time out after 20 seconds; AI generation allows
60 seconds. Historical price requests use an eight-second provider timeout.

### Verification

From `frontend`: `npm run build`

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
