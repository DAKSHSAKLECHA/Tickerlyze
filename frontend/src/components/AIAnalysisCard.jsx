import { ThumbsUp, ThumbsDown, ShieldAlert, ListChecks, Sparkles } from 'lucide-react'

function Section({ icon: Icon, title, items, tone }) {
  const toneClasses = {
    positive: 'text-emerald-600 bg-emerald-50',
    negative: 'text-rose-600 bg-rose-50',
    warning: 'text-amber-600 bg-amber-50',
    neutral: 'text-brand-700 bg-brand-50',
  }
  return (
    <div>
      <div className={`inline-flex items-center gap-1.5 text-sm font-semibold px-2.5 py-1 rounded-lg ${toneClasses[tone]}`}>
        <Icon className="w-4 h-4" />
        {title}
      </div>
      <ul className="mt-2.5 space-y-1.5 text-sm text-slate-600">
        {items?.map((item, i) => (
          <li key={i} className="flex gap-2">
            <span className="text-slate-300">•</span>
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

export default function AIAnalysisCard({ analysis, generatedAt }) {
  if (!analysis) return null
  return (
    <div className="card space-y-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-slate-800 font-semibold">
          <Sparkles className="w-4 h-4 text-brand-600" />
          AI Analysis
        </div>
        {generatedAt && (
          <span className="text-xs text-slate-400">
            Generated {new Date(generatedAt).toLocaleString()}
          </span>
        )}
      </div>

      <p className="text-sm text-slate-700 leading-relaxed">{analysis.companySummary}</p>

      <div className="grid sm:grid-cols-2 gap-5">
        <Section icon={ThumbsUp} title="Bull Case" items={analysis.bullCase} tone="positive" />
        <Section icon={ThumbsDown} title="Bear Case" items={analysis.bearCase} tone="negative" />
        <Section icon={ShieldAlert} title="Risks" items={analysis.risks} tone="warning" />
        <Section icon={ListChecks} title="Key Takeaways" items={analysis.keyTakeaways} tone="neutral" />
      </div>

      <p className="text-xs text-slate-400 border-t border-slate-100 pt-3">
        AI-generated for informational purposes only. Not financial advice.
      </p>
    </div>
  )
}
