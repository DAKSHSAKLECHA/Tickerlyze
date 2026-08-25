import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Star, Trash2, Plus } from 'lucide-react'
import { watchlistApi } from '../api/client'
import { Loading, ErrorBox, formatCurrency } from '../components/Common'

export default function Watchlist() {
  const [watchlist, setWatchlist] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [newSymbol, setNewSymbol] = useState('')
  const [adding, setAdding] = useState(false)
  const [busySymbol, setBusySymbol] = useState('')

  async function load() {
    setLoading(true)
    setError('')
    try {
      const data = await watchlistApi.get()
      setWatchlist(data.watchlist || [])
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  async function handleAdd(e) {
    e.preventDefault()
    const symbol = newSymbol.trim().toUpperCase()
    if (!symbol) return
    setAdding(true)
    setError('')
    try {
      await watchlistApi.add(symbol)
      setNewSymbol('')
      await load()
    } catch (err) {
      setError(err.message)
    } finally {
      setAdding(false)
    }
  }

  async function handleRemove(symbol) {
    setBusySymbol(symbol)
    try {
      await watchlistApi.remove(symbol)
      setWatchlist((prev) => prev.filter((w) => w.symbol !== symbol))
    } catch (err) {
      setError(err.message)
    } finally {
      setBusySymbol('')
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Watchlist</h1>
        <p className="text-sm text-slate-500 mt-1">Track the stocks you care about.</p>
      </div>

      <form onSubmit={handleAdd} className="flex gap-2">
        <input
          value={newSymbol}
          onChange={(e) => setNewSymbol(e.target.value)}
          placeholder="Add ticker, e.g. MSFT"
          className="flex-1 px-3 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
        />
        <button
          type="submit"
          disabled={adding}
          className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-brand-600 text-white text-sm font-medium hover:bg-brand-700 disabled:opacity-60"
        >
          <Plus className="w-4 h-4" /> Add
        </button>
      </form>

      <ErrorBox message={error} />
      {loading && <Loading label="Loading watchlist..." />}

      {!loading && watchlist.length === 0 && !error && (
        <div className="card text-center py-10 text-sm text-slate-400 flex flex-col items-center gap-2">
          <Star className="w-6 h-6 text-slate-300" />
          Your watchlist is empty.
        </div>
      )}

      {!loading && watchlist.length > 0 && (
        <div className="card divide-y divide-slate-100">
          {watchlist.map((w) => (
            <div key={w.symbol} className="flex items-center justify-between py-3 px-2 -mx-2 rounded-lg hover:bg-slate-50">
              <Link to={`/stock/${w.symbol}`} className="flex-1">
                <div className="text-sm font-semibold text-slate-800">{w.symbol}</div>
                <div className="text-xs text-slate-400">{w.shortName || w.error || ''}</div>
              </Link>
              <div className="text-sm text-slate-600 mr-4">
                {w.currentPrice ? formatCurrency(w.currentPrice, w.currency) : '—'}
              </div>
              <button
                onClick={() => handleRemove(w.symbol)}
                disabled={busySymbol === w.symbol}
                className="p-2 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50"
                title="Remove from watchlist"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
