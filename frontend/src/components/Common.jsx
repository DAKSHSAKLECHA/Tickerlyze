import { AlertTriangle, Loader2 } from 'lucide-react'

export function Loading({ label = 'Loading...' }) {
  return (
    <div className="flex items-center justify-center gap-2 py-10 text-slate-500">
      <Loader2 className="w-5 h-5 animate-spin" />
      <span>{label}</span>
    </div>
  )
}

export function ErrorBox({ message }) {
  if (!message) return null
  return (
    <div className="flex items-start gap-2 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl px-4 py-3 text-sm">
      <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
      <span>{message}</span>
    </div>
  )
}

export function formatCurrency(num, currency = 'USD') {
  if (num === null || num === undefined || Number.isNaN(num)) return 'N/A'
  return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(num)
}

export function formatCompactNumber(num) {
  if (num === null || num === undefined || Number.isNaN(num)) return 'N/A'
  return new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 2 }).format(num)
}
