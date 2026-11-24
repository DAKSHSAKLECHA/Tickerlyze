import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { CalendarClock } from 'lucide-react'
import { earningsApi, watchlistApi } from '../api/client'
import { Loading, ErrorBox } from '../components/Common'

export default function Earnings() {
  const [upcoming, setUpcoming] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [stage, setStage] = useState('Checking watchlist…')
  const [watchlistEmpty, setWatchlistEmpty] = useState(false)
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    const controller = new AbortController()
    async function load() {
      setLoading(true)
      setError('')
      setStage('Checking watchlist…')
      try {
        const membership = await watchlistApi.getSymbols({ signal: controller.signal })
        if (controller.signal.aborted) return
        const empty = membership.watchlist.length === 0
        setWatchlistEmpty(empty)
        if (empty) {
          setUpcoming([])
          return
        }
        setStage('Loading earnings dates…')
        const data = await earningsApi.getUpcomingForWatchlist({ signal: controller.signal })
        if (!Array.isArray(data.upcoming)) throw new Error('Earnings dates could not be read. Please retry.')
        if (!controller.signal.aborted) setUpcoming(data.upcoming)
      } catch (err) {
        if (!controller.signal.aborted) setError(err.message)
      } finally {
        if (!controller.signal.aborted) setLoading(false)
      }
    }
    load()
    return () => controller.abort()
  }, [attempt])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Earnings Tracker</h1>
        <p className="text-sm text-slate-500 mt-1">Upcoming earnings dates for your watchlist stocks.</p>
      </div>

      <ErrorBox message={error} />
      {error && <button onClick={() => setAttempt(value => value + 1)} disabled={loading} className="text-sm font-medium text-brand-700 disabled:opacity-60">Retry</button>}
      {loading && <Loading label={stage} />}

      {!loading && upcoming.length === 0 && !error && (
        <div className="card text-center py-10 text-sm text-slate-400">
          {watchlistEmpty ? <>Your watchlist is empty. <Link to="/search" className="font-medium text-brand-700">Find stocks</Link> to track their earnings.</> : 'No upcoming earnings dates are available for your watchlist.'}
        </div>
      )}

      {!loading && !error && upcoming.length > 0 && (
        <div className="card divide-y divide-slate-100">
          {upcoming.map((e) => (
            <Link
              key={e.symbol}
              to={`/stock/${e.symbol}`}
              className="flex items-center justify-between py-3 px-2 -mx-2 rounded-lg hover:bg-slate-50"
            >
              <div className="flex items-center gap-2">
                <CalendarClock className="w-4 h-4 text-brand-600" />
                <span className="text-sm font-semibold text-slate-800">{e.symbol}</span>
              </div>
              <span className="text-sm text-slate-500">{e.nextEarningsDate || 'Not scheduled'}</span>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
