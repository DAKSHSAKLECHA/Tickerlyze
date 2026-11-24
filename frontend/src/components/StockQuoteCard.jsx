import { ArrowUpRight, ArrowDownRight } from 'lucide-react'
import { formatCurrency, formatCompactNumber } from './Common'

export default function StockQuoteCard({ quote }) {
  if (!quote) return null
  const isUp = (quote.change ?? 0) >= 0

  const comparison = (reference, below = false) => {
    if (!Number.isFinite(quote.currentPrice) || !Number.isFinite(reference) || reference <= 0) return 'Unavailable'
    const pct = (quote.currentPrice / reference - 1) * 100
    return `${(below ? -pct : pct).toFixed(1)}%`
  }
  const metrics = [
    { label: 'Market Cap', value: formatCompactNumber(quote.marketCap) },
    { label: 'Below 1-Year High', value: comparison(quote.week52High, true), note: 'Distance below the highest price in the last year. A negative value means a new high.' },
    { label: 'Above 1-Year Low', value: comparison(quote.week52Low), note: 'Distance above the lowest price in the last year. A negative value means a new low.' },
    { label: '52W High', value: formatCurrency(quote.week52High, quote.currency) },
    { label: '52W Low', value: formatCurrency(quote.week52Low, quote.currency) },
  ]

  return (
    <div className="card">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-xl font-semibold text-slate-800">{quote.shortName}</h2>
          <p className="text-sm text-slate-400">
            {[quote.symbol, quote.exchange, quote.sector].filter(Boolean).join(" · ")}
          </p>
        </div>
        <div className="text-right">
          <div className="text-2xl font-bold text-slate-900">
            {formatCurrency(quote.currentPrice, quote.currency)}
          </div>
          {Number.isFinite(quote.change) && Number.isFinite(quote.changePercent) && (
            <div
              className={`flex items-center justify-end gap-1 text-sm font-medium ${
                isUp ? 'text-emerald-600' : 'text-rose-600'
              }`}
            >
              {isUp ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
              {quote.change} ({quote.changePercent}%)
            </div>
          )}
        </div>
      </div>

      {quote.fetchedAt && <p className="text-xs text-slate-500 mt-3">
        {quote.stale ? 'Showing saved data; live refresh is temporarily unavailable. ' : 'Data fetched '}
        {new Date(quote.fetchedAt).toLocaleString()}. Prices may be delayed.
      </p>}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mt-5">
        {metrics.map((m) => (
          <div key={m.label} className="bg-slate-50 rounded-xl px-3 py-2.5">
            <div className="text-xs text-slate-400">{m.label}</div>
            <div className="text-sm font-semibold text-slate-800 mt-0.5">{m.value}</div>
            {m.note && <p className="text-xs text-slate-500 mt-1">{m.note}</p>}
          </div>
        ))}
      </div>
    </div>
  )
}
