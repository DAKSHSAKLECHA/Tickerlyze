import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Check, Plus, Search } from 'lucide-react'
import { stockApi, watchlistApi } from '../api/client'
import { Loading, ErrorBox } from '../components/Common'

const popularStocks = [
  {
    title: 'Indian stocks',
    stocks: [
      ['RELIANCE.NS', 'Reliance Industries'], ['TCS.NS', 'Tata Consultancy Services'],
      ['HDFCBANK.NS', 'HDFC Bank'], ['INFY.NS', 'Infosys'],
      ['ICICIBANK.NS', 'ICICI Bank'], ['SBIN.NS', 'State Bank of India'],
      ['BHARTIARTL.NS', 'Bharti Airtel'], ['LT.NS', 'Larsen & Toubro'],
      ['ITC.NS', 'ITC'], ['HINDUNILVR.NS', 'Hindustan Unilever'],
      ['MARUTI.NS', 'Maruti Suzuki'], ['SUNPHARMA.NS', 'Sun Pharma'],
    ],
  },
  {
    title: 'US stocks',
    stocks: [
      ['AAPL', 'Apple'], ['MSFT', 'Microsoft'],
      ['NVDA', 'NVIDIA'], ['AMZN', 'Amazon'],
      ['GOOGL', 'Alphabet'], ['META', 'Meta Platforms'],
      ['TSLA', 'Tesla'], ['MU', 'Micron Technology'],
      ['AMD', 'Advanced Micro Devices'], ['JPM', 'JPMorgan Chase'],
      ['WMT', 'Walmart'], ['NFLX', 'Netflix'],
    ],
  },
].map(({ title, stocks }, index) => ({
  title,
  stocks: stocks.map(([symbol, name]) => ({ symbol, name, exchange: index === 0 ? 'NSE' : '' })),
}))

export default function StockSearch() {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [saved, setSaved] = useState(null)
  const [adding, setAdding] = useState(null)
  const [watchlistError, setWatchlistError] = useState('')
  const [watchlistLoading, setWatchlistLoading] = useState(true)

  async function loadWatchlist() {
    setWatchlistLoading(true)
    setWatchlistError('')
    try {
      const data = await watchlistApi.get()
      setSaved(new Set((data.watchlist || []).map((stock) => stock.symbol)))
    } catch (err) {
      setWatchlistError(err.message)
    } finally {
      setWatchlistLoading(false)
    }
  }

  useEffect(() => {
    loadWatchlist()
  }, [])

  async function handleSearch(event) {
    event.preventDefault()
    const trimmed = query.trim()
    if (!trimmed || loading) return
    setLoading(true)
    setError('')
    try {
      const data = await stockApi.search(trimmed)
      setResults(data.results || [])
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  async function addStock(symbol) {
    setAdding(symbol)
    setWatchlistError('')
    try {
      await watchlistApi.add(symbol)
      setSaved((previous) => new Set(previous).add(symbol))
    } catch (err) {
      setWatchlistError(`${symbol}: ${err.message}`)
    } finally {
      setAdding(null)
    }
  }

  function clearSearch() {
    setQuery('')
    setResults(null)
    setError('')
  }

  const groups = results === null ? popularStocks : [{ title: 'Search results', stocks: results }]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Stock Search</h1>
        <p className="mt-1 text-sm text-slate-500">Browse stocks or search by ticker or company name.</p>
      </div>

      <form onSubmit={handleSearch} className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            aria-label="Ticker or company name"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="e.g. AAPL, Tesla, Reliance..."
            className="w-full rounded-xl border border-slate-200 py-2.5 pl-9 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </div>
        <button
          type="submit"
          disabled={loading || !query.trim()}
          className="rounded-xl bg-brand-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-60"
        >
          Search
        </button>
      </form>

      <ErrorBox message={error} />
      <div role="status">
        <ErrorBox message={watchlistError} />
        {!saved && !watchlistLoading && (
          <button type="button" onClick={loadWatchlist} className="mt-2 text-sm font-medium text-brand-700">
            Retry loading watchlist
          </button>
        )}
      </div>

      {loading ? <Loading label="Searching..." /> : (
        <div className={results === null ? 'grid gap-6 lg:grid-cols-2' : ''}>
          {groups.map(({ title, stocks }) => (
            <section key={title} className="card">
              <div className="mb-3 flex items-center justify-between gap-2">
                <h2 className="font-semibold text-slate-800">{title}</h2>
                {results !== null && (
                  <button type="button" onClick={clearSearch} className="text-sm font-medium text-brand-700">
                    Browse stocks
                  </button>
                )}
              </div>
              {stocks.length === 0 && <p className="text-sm text-slate-500">No stocks matched your search.</p>}
              <ul className="divide-y divide-slate-100">
                {stocks.map(({ symbol, name, exchange }) => {
                  const isSaved = saved?.has(symbol)
                  const label = isSaved ? 'Added' : adding === symbol ? 'Adding...' : 'Add'
                  return (
                    <li key={symbol} className="flex items-center gap-3 py-2.5">
                      <Link
                        to={`/stock/${encodeURIComponent(symbol)}`}
                        className="min-w-0 flex-1 rounded-lg p-1 text-sm hover:bg-slate-50"
                      >
                        <span className="font-semibold text-slate-800">{symbol}</span>
                        {exchange && <span className="ml-2 text-xs text-slate-500">{exchange}</span>}
                        <span className="block truncate text-xs text-slate-500">{name}</span>
                      </Link>
                      <button
                        type="button"
                        aria-label={`${label} ${symbol}`}
                        disabled={!saved || Boolean(adding) || isSaved}
                        onClick={() => addStock(symbol)}
                        className="flex min-w-20 items-center justify-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-sm font-medium text-brand-700 hover:bg-slate-50 disabled:opacity-60"
                      >
                        {isSaved ? <Check className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
                        {label}
                      </button>
                    </li>
                  )
                })}
              </ul>
            </section>
          ))}
        </div>
      )}
    </div>
  )
}

