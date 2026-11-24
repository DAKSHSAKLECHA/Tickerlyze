import { Gauge } from 'lucide-react'
import { Loading, ErrorBox } from './Common'

export default function RiskCard({ history, loading, error }) {
  const metrics = history?.priceIndicators
  const pct = (n) => Number.isFinite(n) ? `${n.toFixed(1)}%` : 'Unavailable'
  const rows = metrics ? [
    ['Daily Price Swings', pct(metrics.swing), 'Average daily move, up or down, over the available last three months.', `${metrics.swingStart} to ${metrics.end}`],
    ['Largest Recent Fall', pct(metrics.fall), 'Biggest fall from an earlier closing-price peak in this period.', `${metrics.start} to ${metrics.end}`],
    ['Six-Month Performance', `${metrics.performance > 0 ? '+' : ''}${pct(metrics.performance)}`, 'Change between the first and last available closing price. New listings may have less than six months of data.', `${metrics.start} to ${metrics.end}`],
  ] : []
  return <section className="card">
    <h2 className="flex items-center gap-2 font-semibold text-slate-800"><Gauge className="w-4 h-4" />Price Movement &amp; Risk</h2>
    <p className="text-xs text-slate-500 mt-2">Understand how the price has behaved, using the same daily prices as the six-month chart.</p>
    {loading && <Loading label="Loading price indicators..." />}
    <ErrorBox message={error} />
    {!loading && !error && !metrics && <p className="text-sm text-slate-500 mt-4">Not enough price history to calculate these indicators.</p>}
    {!loading && !error && rows.map(([label, value, note, period]) => <div key={label} className="mt-4 border-t border-slate-100 pt-3">
      <div className="flex justify-between gap-3 text-sm font-medium text-slate-800"><span>{label}</span><span>{value}</span></div>
      <p className="text-xs text-slate-500 mt-1">{note}</p><p className="text-xs text-slate-400 mt-1">{period}</p>
    </div>)}
    {history?.fetchedAt && <p className="text-xs text-slate-500 mt-4">{history.stale ? 'Saved data; live refresh unavailable. Fetched ' : 'Fetched '}{new Date(history.fetchedAt).toLocaleString()}.</p>}
    <p className="text-xs text-slate-500 mt-4">Historical price behaviour does not predict future returns or measure every business risk.</p>
  </section>
}
