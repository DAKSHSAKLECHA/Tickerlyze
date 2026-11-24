# Tickerlyze

Stock research dashboard using React, Flask, Yahoo Finance data and free OpenRouter AI models.

Features: stock search, quotes/charts, historical price indicators, a shared watchlist, earnings dates and saved AI summaries. No login or separate user lists.

## Run

```powershell
cd backend
pip install -r requirements.txt
python app.py
```

In another terminal:

```powershell
cd frontend
npm ci
npm run dev
```

Open `http://localhost:5173`. Put `OPENROUTER_API_KEY` in `backend/.env`; never commit it. See `.env.example` for optional settings.

## Deploy

- Backend root: `backend`. Install `requirements.txt`. Start with `gunicorn "app:create_app()" --bind 0.0.0.0:$PORT --workers 1 --threads 4 --timeout 120`.
- Frontend root: `frontend`. Build: `npm run build`. Output: `dist`. Check the backend domain in `frontend/vercel.json`.
- Local data uses SQLite in `backend/storage`. Set `DATABASE_URL` for hosted PostgreSQL. Free Render local storage is ephemeral; a persistent database is required to retain data through redeployments.

Prices may be delayed. AI only explains supplied data and can be wrong; it is not independent live news research or investment advice. Saved summaries keep their original generation date. Free providers can be unavailable.
