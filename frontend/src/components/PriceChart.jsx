import { useEffect, useState } from 'react'
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'
import { TrendingUp } from 'lucide-react'
import { stockApi } from '../api/client'
import { Loading, ErrorBox, formatCurrency } from './Common'

const PERIODS = [
  { label: '1M', value: '1mo' },
  { label: '3M', value: '3mo' },
  { label: '6M', value: '6mo' },
  { label: '1Y', value: '1y' },
  { label: '5Y', value: '5y' },
]

function CustomTooltip({ active, payload, label, currency }) {
  if (!active || !payload || !payload.length) return null
  return (
    <div className="bg-white border border-slate-200 rounded-lg shadow-sm px-3 py-2 text-xs">
      <div className="text-slate-400">{label}</div>
      <div className="font-semibold text-slate-800">{formatCurrency(payload[0].value, currency)}</div>
    </div>
  )
}

export default function PriceChart({ symbol, currency = 'USD' }) {
  const [period, setPeriod] = useState('6mo')
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      setError('')
      try {
        const res = await stockApi.getHistory(symbol, period)
        if (!cancelled) setData(res.data || [])
      } catch (err) {
        if (!cancelled) setError(err.message)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [symbol, period])

  const isUp = data.length > 1 && data[data.length - 1].close >= data[0].close

  return (
    <div className="card">
      <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
        <div className="flex items-center gap-1.5 text-slate-800 font-semibold">
          <TrendingUp className="w-4 h-4 text-brand-600" />
          Price History
        </div>
        <div className="flex gap-1 bg-slate-100 rounded-lg p-1">
          {PERIODS.map((p) => (
            <button
              key={p.value}
              onClick={() => setPeriod(p.value)}
              className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                period === p.value
                  ? 'bg-white text-brand-700 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {loading && <Loading label="Loading chart..." />}
      <ErrorBox message={error} />

      {!loading && !error && data.length > 0 && (
        <ResponsiveContainer width="100%" height={260}>
          <AreaChart data={data} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="priceGradient" x1="0" y1="0" x2="0" y2="1">
                <stop
                  offset="5%"
                  stopColor={isUp ? '#10b981' : '#f43f5e'}
                  stopOpacity={0.25}
                />
                <stop
                  offset="95%"
                  stopColor={isUp ? '#10b981' : '#f43f5e'}
                  stopOpacity={0}
                />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
            <XAxis
              dataKey="date"
              tick={{ fontSize: 11, fill: '#94a3b8' }}
              tickLine={false}
              axisLine={false}
              minTickGap={40}
            />
            <YAxis
              domain={['auto', 'auto']}
              tick={{ fontSize: 11, fill: '#94a3b8' }}
              tickLine={false}
              axisLine={false}
              width={55}
              tickFormatter={(v) => formatCurrency(v, currency).replace(/\.00$/, '')}
            />
            <Tooltip content={<CustomTooltip currency={currency} />} />
            <Area
              type="monotone"
              dataKey="close"
              stroke={isUp ? '#059669' : '#e11d48'}
              strokeWidth={2}
              fill="url(#priceGradient)"
            />
          </AreaChart>
        </ResponsiveContainer>
      )}

      {!loading && !error && data.length === 0 && (
        <p className="text-sm text-slate-400 text-center py-10">No historical data available.</p>
      )}
    </div>
  )
}