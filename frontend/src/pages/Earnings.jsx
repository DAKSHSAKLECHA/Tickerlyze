import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { CalendarClock } from 'lucide-react'
import { earningsApi } from '../api/client'
import { Loading, ErrorBox } from '../components/Common'

export default function Earnings() {
  const [upcoming, setUpcoming] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    async function load() {
      setLoading(true)
      setError('')
      try {
        const data = await earningsApi.getUpcomingForWatchlist()
        setUpcoming(data.upcoming || [])
      } catch (err) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Earnings Tracker</h1>
        <p className="text-sm text-slate-500 mt-1">Upcoming earnings dates for your watchlist stocks.</p>
      </div>

      <ErrorBox message={error} />
      {loading && <Loading label="Loading earnings dates..." />}

      {!loading && upcoming.length === 0 && !error && (
        <div className="card text-center py-10 text-sm text-slate-400">
          No stocks on your watchlist yet. Add stocks from the Search page to track their earnings.
        </div>
      )}

      {!loading && upcoming.length > 0 && (
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
