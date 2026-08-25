import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { dashboardApi, watchlistApi, earningsApi } from '../api/client'
import { Loading, ErrorBox, formatCurrency } from '../components/Common'
import { TrendingUp, TrendingDown, Star, CalendarClock, Sparkles } from 'lucide-react'

export default function Dashboard() {
  const [overview, setOverview] = useState(null)
  const [watchlist, setWatchlist] = useState([])
  const [upcoming, setUpcoming] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    async function load() {
      setLoading(true)
      setError('')
      try {
        const [ov, wl, up] = await Promise.allSettled([
          dashboardApi.getOverview(),
          watchlistApi.get(),
          earningsApi.getUpcomingForWatchlist(),
        ])
        if (ov.status === 'fulfilled') setOverview(ov.value)
        if (wl.status === 'fulfilled') setWatchlist(wl.value.watchlist || [])
        if (up.status === 'fulfilled') setUpcoming(up.value.upcoming || [])
        if (ov.status === 'rejected') setError(ov.reason.message)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  if (loading) return <Loading label="Loading dashboard..." />

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Dashboard</h1>
        <p className="text-sm text-slate-500 mt-1">Your market snapshot at a glance.</p>
      </div>

      <ErrorBox message={error} />

      <section>
        <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-3">Market Overview</h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {overview?.marketIndexes?.map((idx) => (
            <div key={idx.symbol} className="card">
              <div className="text-xs text-slate-400">{idx.name}</div>
              {idx.error ? (
                <div className="text-sm text-slate-400 mt-2">Unavailable</div>
              ) : (
                <>
                  <div className="text-lg font-semibold text-slate-800 mt-1">
                    {formatCurrency(idx.price, 'USD').replace('$', '')}
                  </div>
                  <div
                    className={`flex items-center gap-1 text-xs font-medium mt-1 ${
                      idx.change >= 0 ? 'text-emerald-600' : 'text-rose-600'
                    }`}
                  >
                    {idx.change >= 0 ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
                    {idx.change} ({idx.changePercent}%)
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      </section>

      <div className="grid lg:grid-cols-2 gap-6">
        <section className="card">
          <div className="flex items-center justify-between mb-3">
            <h2 className="flex items-center gap-1.5 font-semibold text-slate-800">
              <Star className="w-4 h-4 text-brand-600" /> Watchlist
            </h2>
            <Link to="/watchlist" className="text-xs text-brand-600 font-medium">View all</Link>
          </div>
          {watchlist.length === 0 ? (
            <p className="text-sm text-slate-400">No stocks on your watchlist yet.</p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {watchlist.slice(0, 5).map((w) => (
                <li key={w.symbol} className="py-2 flex items-center justify-between">
                  <Link to={`/stock/${w.symbol}`} className="text-sm font-medium text-slate-700 hover:text-brand-600">
                    {w.symbol}
                  </Link>
                  <span className="text-sm text-slate-500">
                    {w.currentPrice ? formatCurrency(w.currentPrice, w.currency) : '—'}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="card">
          <h2 className="flex items-center gap-1.5 font-semibold text-slate-800 mb-3">
            <CalendarClock className="w-4 h-4 text-brand-600" /> Upcoming Earnings
          </h2>
          {upcoming.length === 0 ? (
            <p className="text-sm text-slate-400">No upcoming earnings tracked. Add stocks to your watchlist.</p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {upcoming.slice(0, 5).map((e) => (
                <li key={e.symbol} className="py-2 flex items-center justify-between">
                  <Link to={`/stock/${e.symbol}`} className="text-sm font-medium text-slate-700 hover:text-brand-600">
                    {e.symbol}
                  </Link>
                  <span className="text-sm text-slate-500">{e.nextEarningsDate || 'TBA'}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <section className="card">
        <h2 className="flex items-center gap-1.5 font-semibold text-slate-800 mb-3">
          <Sparkles className="w-4 h-4 text-brand-600" /> Recent AI Analyses
        </h2>
        {(!overview?.recentAnalyses || overview.recentAnalyses.length === 0) ? (
          <p className="text-sm text-slate-400">No analyses generated yet. Search a stock to get started.</p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {overview.recentAnalyses.map((a, i) => (
              <li key={i} className="py-2.5 flex items-center justify-between">
                <div>
                  <Link to={`/stock/${a.symbol}`} className="text-sm font-medium text-slate-700 hover:text-brand-600">
                    {a.symbol}
                  </Link>
                  <p className="text-xs text-slate-400">{a.analysis?.companySummary?.slice(0, 90)}...</p>
                </div>
                <span className="text-xs text-slate-400 whitespace-nowrap ml-3">
                  {new Date(a.generatedAt).toLocaleDateString()}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
