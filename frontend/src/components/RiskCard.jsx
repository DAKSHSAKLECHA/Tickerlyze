import { Gauge } from 'lucide-react'
import { riskBadgeClass, formatPercent, formatNumber } from './Common'

export default function RiskCard({ risk }) {
  if (!risk) return null
  const { riskScore, riskLevel, breakdown } = risk

  const rows = [
    { label: 'PE Ratio', ...breakdown.peRatio, display: breakdown.peRatio.value ?? 'N/A' },
    {
      label: 'Revenue Growth',
      ...breakdown.revenueGrowth,
      display: breakdown.revenueGrowth.value != null ? formatPercent(breakdown.revenueGrowth.value) : 'N/A',
    },
    {
      label: 'Debt / Equity',
      ...breakdown.debtToEquity,
      display: breakdown.debtToEquity.value != null ? formatNumber(breakdown.debtToEquity.value, { maximumFractionDigits: 1 }) : 'N/A',
    },
  ]

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-1.5 text-slate-800 font-semibold">
          <Gauge className="w-4 h-4 text-brand-600" />
          Risk Engine
        </div>
        <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${riskBadgeClass(riskLevel)}`}>
          {riskLevel} Risk
        </span>
      </div>

      <div className="flex items-end gap-2 mb-5">
        <span className="text-3xl font-bold text-slate-900">{riskScore}</span>
        <span className="text-sm text-slate-400 mb-1">/ 100</span>
      </div>

      <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden mb-5">
        <div
          className={`h-full ${
            riskLevel === 'Low' ? 'bg-emerald-500' : riskLevel === 'Medium' ? 'bg-amber-500' : 'bg-rose-500'
          }`}
          style={{ width: `${riskScore}%` }}
        />
      </div>

      <div className="space-y-3">
        {rows.map((r) => (
          <div key={r.label} className="flex items-start justify-between gap-3 text-sm">
            <div>
              <div className="font-medium text-slate-700">
                {r.label}: <span className="text-slate-500 font-normal">{r.display}</span>
              </div>
              <div className="text-xs text-slate-400">{r.note}</div>
            </div>
            <div className="text-xs font-semibold text-slate-400 whitespace-nowrap">score {r.score}</div>
          </div>
        ))}
      </div>
    </div>
  )
}
