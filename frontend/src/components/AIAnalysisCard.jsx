import { CheckCircle2, AlertTriangle, CircleHelp, Sparkles } from 'lucide-react'

function Section({ icon: Icon, title, items, empty, tone }) {
  const colors = { positive: 'text-emerald-700 bg-emerald-50', concern: 'text-amber-800 bg-amber-50', neutral: 'text-slate-700 bg-slate-100' }
  return <section>
    <h3 className={`inline-flex items-center gap-1.5 text-sm font-semibold px-2.5 py-1 rounded-lg ${colors[tone]}`}><Icon className="w-4 h-4" />{title}</h3>
    {items?.length ? <ul className="mt-3 space-y-2 text-sm text-slate-600">{items.map((item, index) => <li key={index} className="flex gap-2"><span aria-hidden="true">•</span><span>{item}</span></li>)}</ul>
      : <p className="mt-3 text-sm text-slate-500">{empty}</p>}
  </section>
}

export default function AIAnalysisCard({ analysis, generatedAt }) {
  if (!analysis || analysis.schemaVersion !== 2) return null
  return <div className="card space-y-5">
    <div className="flex flex-wrap items-center justify-between gap-2">
      <h2 className="flex items-center gap-1.5 text-slate-800 font-semibold"><Sparkles className="w-4 h-4 text-brand-600" />AI Analysis</h2>
      {generatedAt && <span className="text-xs text-slate-400">Generated {new Date(generatedAt).toLocaleString()}</span>}
    </div>
    <section><h3 className="text-sm font-semibold text-slate-800">Summary</h3><p className="text-sm text-slate-700 leading-relaxed mt-2">{analysis.companySummary}</p></section>
    <p className="rounded-xl bg-slate-50 px-3 py-3 text-sm text-slate-600">{analysis.assessmentNote}</p>
    <div className="grid sm:grid-cols-2 gap-5">
      <Section icon={CheckCircle2} title="Supporting Factors" items={analysis.supportingFactors} empty="No supporting financial factors can be established from the supplied data." tone="positive" />
      <Section icon={AlertTriangle} title="Concerns" items={analysis.concerns} empty="No specific concerns can be established from these fields. This is not a low-risk rating." tone="concern" />
      <div className="sm:col-span-2"><Section icon={CircleHelp} title="Missing Information" items={analysis.missingInformation} empty="The selected fields are available. Company filings and independent sources have not been checked." tone="neutral" /></div>
    </div>
    <div className="border-t border-slate-100 pt-3 text-xs text-slate-500 space-y-1">
      {analysis.sourceFetchedAt && <p>{analysis.sourceStale ? 'Saved market data was used. Fetched ' : 'Market data fetched '}{new Date(analysis.sourceFetchedAt).toLocaleString()}.</p>}
      <p>AI selects observations from the supplied data. Numbers and displayed statements are assembled from those fields. No independent news research. Not a buy/sell recommendation.</p>
    </div>
  </div>
}
