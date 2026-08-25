import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { Star, Sparkles, Loader2 } from 'lucide-react'
import { stockApi, aiApi, riskApi, watchlistApi, earningsApi } from '../api/client'
import { Loading, ErrorBox } from '../components/Common'
import StockQuoteCard from '../components/StockQuoteCard'
import PriceChart from '../components/PriceChart'
import AIAnalysisCard from '../components/AIAnalysisCard'
import RiskCard from '../components/RiskCard'

export default function StockDetail() {
  const { symbol } = useParams()

  const [quote, setQuote] = useState(null)
  const [risk, setRisk] = useState(null)
  const [earnings, setEarnings] = useState(null)
  const [analysis, setAnalysis] = useState(null)
  const [analysisGeneratedAt, setAnalysisGeneratedAt] = useState(null)

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [analyzing, setAnalyzing] = useState(false)
  const [analyzeError, setAnalyzeError] = useState('')
  const [inWatchlist, setInWatchlist] = useState(false)
  const [watchlistBusy, setWatchlistBusy] = useState(false)

  useEffect(() => {
    async function load() {
      setLoading(true)
      setError('')
      setAnalysis(null)
      try {
        const [q, r, e, wl] = await Promise.allSettled([
          stockApi.getQuote(symbol),
          riskApi.getRisk(symbol),
          earningsApi.getForSymbol(symbol),
          watchlistApi.get(),
        ])
        if (q.status === 'fulfilled') setQuote(q.value)
        else setError(q.reason.message)
        if (r.status === 'fulfilled') setRisk(r.value)
        if (e.status === 'fulfilled') setEarnings(e.value)
        if (wl.status === 'fulfilled') {
          setInWatchlist((wl.value.watchlist || []).some((w) => w.symbol === symbol.toUpperCase()))
        }

        // Load a previously saved AI analysis for this symbol, if one exists
        try {
          const saved = await aiApi.getForSymbol(symbol)
          if (saved) {
            setAnalysis(saved.analysis)
            setAnalysisGeneratedAt(saved.generatedAt)
          }
        } catch {
          // no saved analysis yet — that's fine, user can generate one
        }
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [symbol])

  async function handleAnalyze() {
    setAnalyzing(true)
    setAnalyzeError('')
    try {
      const result = await aiApi.analyze(symbol)
      setAnalysis(result.analysis)
      setAnalysisGeneratedAt(result.generatedAt)
    } catch (err) {
      setAnalyzeError(err.message)
    } finally {
      setAnalyzing(false)
    }
  }

  async function toggleWatchlist() {
    setWatchlistBusy(true)
    try {
      if (inWatchlist) {
        await watchlistApi.remove(symbol)
        setInWatchlist(false)
      } else {
        await watchlistApi.add(symbol)
        setInWatchlist(true)
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setWatchlistBusy(false)
    }
  }

  if (loading) return <Loading label={`Loading ${symbol}...`} />
  if (error && !quote) return <ErrorBox message={error} />

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">{symbol.toUpperCase()}</h1>
          {earnings?.nextEarningsDate && (
            <p className="text-sm text-slate-500 mt-1">
              Next earnings: <span className="font-medium">{earnings.nextEarningsDate}</span>
            </p>
          )}
        </div>
        <button
          onClick={toggleWatchlist}
          disabled={watchlistBusy}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium border transition-colors ${
            inWatchlist
              ? 'bg-amber-50 border-amber-200 text-amber-700 hover:bg-amber-100'
              : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
          }`}
        >
          <Star className={`w-4 h-4 ${inWatchlist ? 'fill-amber-500 text-amber-500' : ''}`} />
          {inWatchlist ? 'On Watchlist' : 'Add to Watchlist'}
        </button>
      </div>

      <StockQuoteCard quote={quote} />

      <PriceChart symbol={symbol} currency={quote?.currency} />

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          {!analysis && (
            <div className="card flex flex-col items-center justify-center text-center py-10 gap-3">
              <Sparkles className="w-8 h-8 text-brand-500" />
              <p className="text-sm text-slate-500 max-w-sm">
                Generate an AI-powered summary, bull/bear case, risks, and key takeaways for {symbol.toUpperCase()}.
              </p>
              <button
                onClick={handleAnalyze}
                disabled={analyzing}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-brand-600 text-white text-sm font-medium hover:bg-brand-700 disabled:opacity-60 transition-colors"
              >
                {analyzing && <Loader2 className="w-4 h-4 animate-spin" />}
                {analyzing ? 'Analyzing...' : 'Generate AI Analysis'}
              </button>
              <ErrorBox message={analyzeError} />
            </div>
          )}
          {analysis && (
            <>
              <AIAnalysisCard analysis={analysis} generatedAt={analysisGeneratedAt} />
              <div className="flex justify-end">
                <button
                  onClick={handleAnalyze}
                  disabled={analyzing}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl border border-slate-200 text-slate-600 text-sm font-medium hover:bg-slate-50 disabled:opacity-60 transition-colors"
                >
                  {analyzing && <Loader2 className="w-4 h-4 animate-spin" />}
                  {analyzing ? 'Re-analyzing...' : 'Re-run AI Analysis'}
                </button>
              </div>
              <ErrorBox message={analyzeError} />
            </>
          )}
        </div>

        <div>
          <RiskCard risk={risk} />
        </div>
      </div>
    </div>
  )
}