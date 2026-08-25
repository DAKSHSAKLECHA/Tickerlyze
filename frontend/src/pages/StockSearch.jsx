import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search } from 'lucide-react'
import { stockApi } from '../api/client'
import { Loading, ErrorBox } from '../components/Common'

export default function StockSearch() {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const navigate = useNavigate()

  async function handleSearch(e) {
    e.preventDefault()
    const trimmed = query.trim()
    if (!trimmed) return
    setLoading(true)
    setError('')
    try {
      const data = await stockApi.search(trimmed)
      setResults(data.results || [])
      // If the query looks like an exact ticker, offer a quick jump
      if (data.results?.length === 0) {
        navigate(`/stock/${trimmed.toUpperCase()}`)
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Stock Search</h1>
        <p className="text-sm text-slate-500 mt-1">Search by ticker or company name.</p>
      </div>

      <form onSubmit={handleSearch} className="flex gap-2">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="e.g. AAPL, Tesla, Reliance..."
            className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </div>
        <button
          type="submit"
          className="px-5 py-2.5 rounded-xl bg-brand-600 text-white text-sm font-medium hover:bg-brand-700 transition-colors"
        >
          Search
        </button>
      </form>

      <ErrorBox message={error} />
      {loading && <Loading label="Searching..." />}

      {!loading && results.length > 0 && (
        <ul className="card divide-y divide-slate-100">
          {results.map((r) => (
            <li key={r.symbol}>
              <button
                onClick={() => navigate(`/stock/${r.symbol}`)}
                className="w-full text-left py-3 flex items-center justify-between hover:bg-slate-50 px-2 -mx-2 rounded-lg"
              >
                <div>
                  <div className="text-sm font-semibold text-slate-800">{r.symbol}</div>
                  <div className="text-xs text-slate-400">{r.name}</div>
                </div>
                <span className="text-xs text-slate-400">{r.exchange}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
