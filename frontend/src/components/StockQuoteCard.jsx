import { ArrowUpRight, ArrowDownRight } from 'lucide-react'
import { formatCurrency, formatCompactNumber, formatNumber } from './Common'

export default function StockQuoteCard({ quote }) {
  if (!quote) return null
  const isUp = (quote.change ?? 0) >= 0

  const metrics = [
    { label: 'Market Cap', value: formatCompactNumber(quote.marketCap) },
    { label: 'PE Ratio', value: quote.peRatio ? formatNumber(quote.peRatio, { maximumFractionDigits: 2 }) : 'N/A' },
    { label: '52W High', value: formatCurrency(quote.week52High, quote.currency) },
    { label: '52W Low', value: formatCurrency(quote.week52Low, quote.currency) },
  ]

  return (
    <div className="card">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-xl font-semibold text-slate-800">{quote.shortName}</h2>
          <p className="text-sm text-slate-400">
            {quote.symbol} · {quote.exchange} {quote.sector ? `· ${quote.sector}` : ''}
          </p>
        </div>
        <div className="text-right">
          <div className="text-2xl font-bold text-slate-900">
            {formatCurrency(quote.currentPrice, quote.currency)}
          </div>
          {quote.change !== null && (
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

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5">
        {metrics.map((m) => (
          <div key={m.label} className="bg-slate-50 rounded-xl px-3 py-2.5">
            <div className="text-xs text-slate-400">{m.label}</div>
            <div className="text-sm font-semibold text-slate-800 mt-0.5">{m.value}</div>
          </div>
        ))}
      </div>
    </div>
  )
}
