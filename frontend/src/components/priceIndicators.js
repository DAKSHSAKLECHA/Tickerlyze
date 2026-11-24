// Compatibility for a history response served during a rolling backend update.
export function calculatePriceIndicators(rows) {
  if (!Array.isArray(rows)) return null
  const data = rows.filter((row) => Number.isFinite(row.close) && row.close > 0 && /^\d{4}-\d{2}-\d{2}$/.test(row.date))
    .slice().sort((a, b) => a.date.localeCompare(b.date))
  if (data.length < 2) return null
  const last = data[data.length - 1]
  const cutoff = new Date(`${last.date}T00:00:00Z`)
  const day = cutoff.getUTCDate()
  cutoff.setUTCDate(1)
  cutoff.setUTCMonth(cutoff.getUTCMonth() - 3)
  const monthEnd = new Date(Date.UTC(cutoff.getUTCFullYear(), cutoff.getUTCMonth() + 1, 0)).getUTCDate()
  cutoff.setUTCDate(Math.min(day, monthEnd))
  const cutoffDate = cutoff.toISOString().slice(0, 10)
  let peak = data[0].close
  let fall = 0
  const moves = []
  for (let i = 1; i < data.length; i++) {
    peak = Math.max(peak, data[i].close)
    fall = Math.max(fall, (1 - data[i].close / peak) * 100)
    if (data[i].date >= cutoffDate) moves.push(Math.abs(data[i].close / data[i - 1].close - 1) * 100)
  }
  return { swing: moves.length ? moves.reduce((sum, value) => sum + value, 0) / moves.length : null,
    fall, performance: (last.close / data[0].close - 1) * 100,
    start: data[0].date, end: last.date, swingStart: data.find((row) => row.date >= cutoffDate)?.date }
}
