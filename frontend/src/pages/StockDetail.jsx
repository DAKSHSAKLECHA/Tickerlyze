import { useEffect, useState, useRef, lazy, Suspense } from 'react'
import { useParams } from 'react-router-dom'
import { Star, Sparkles, Loader2 } from 'lucide-react'
import { stockApi, aiApi, watchlistApi, earningsApi } from '../api/client'
import { Loading, ErrorBox } from '../components/Common'
import StockQuoteCard from '../components/StockQuoteCard'
const PriceChart = lazy(() => import('../components/PriceChart'))
import AIAnalysisCard from '../components/AIAnalysisCard'
import RiskCard from '../components/RiskCard'

export default function StockDetail() {
  const { symbol } = useParams()
  return <StockDetailContent key={symbol} symbol={symbol} />
}

function StockDetailContent({ symbol }) {

  const [quote, setQuote] = useState(null)
  const [history, setHistory] = useState(null)
  const [historyLoading, setHistoryLoading] = useState(true)
  const [historyError, setHistoryError] = useState('')
  const [watchlistReady, setWatchlistReady] = useState(false)
  const epoch = useRef(0)
  const analysisRequested = useRef(false)
  const [earnings, setEarnings] = useState(null)
  const [analysis, setAnalysis] = useState(null)
  const [analysisGeneratedAt, setAnalysisGeneratedAt] = useState(null)

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [analyzing, setAnalyzing] = useState(false)
  const [analyzeError, setAnalyzeError] = useState('')
  const [inWatchlist, setInWatchlist] = useState(false)
  const [watchlistBusy, setWatchlistBusy] = useState(false)
  const [watchlistError, setWatchlistError] = useState('')

  useEffect(() => {
    const requestEpoch = ++epoch.current
    analysisRequested.current = false
    const controller = new AbortController()
    let active = true
    const options = { signal: controller.signal }
    setLoading(true)
    setError('')
    setQuote(null)
    setHistory(null)
    setHistoryLoading(true)
    setHistoryError('')
    setEarnings(null)
    setAnalysis(null)
    setAnalysisGeneratedAt(null)
    setAnalyzing(false)
    setAnalyzeError('')
    setWatchlistError('')
    setWatchlistReady(false)
    setWatchlistBusy(false)
    setInWatchlist(false)
    stockApi.getQuote(symbol, options)
      .then((value) => { if (active) setQuote(value) })
      .catch((err) => { if (active) setError(err.message) })
      .finally(() => { if (active) setLoading(false) })
    stockApi.getHistory(symbol, '6mo', options)
      .then((value) => { if (active) setHistory(value) })
      .catch((err) => { if (active) setHistoryError(err.message) })
      .finally(() => { if (active) setHistoryLoading(false) })
    earningsApi.getForSymbol(symbol, options)
      .then((value) => { if (active) setEarnings(value) }).catch(() => {})
    watchlistApi.get(options).then((value) => {
      if (active) {
        setInWatchlist((value.watchlist || []).some((w) => w.symbol === symbol.toUpperCase()))
        setWatchlistReady(true)
      }
    }).catch((err) => { if (active) setWatchlistError(err.message) })
    aiApi.getForSymbol(symbol, options).then((saved) => {
      if (active && saved && !analysisRequested.current) {
        setAnalysis(saved.analysis)
        setAnalysisGeneratedAt(saved.generatedAt)
      }
    }).catch(() => {})
    return () => { active = false; if (epoch.current === requestEpoch) epoch.current++; controller.abort() }
  }, [symbol])

  async function handleAnalyze() {
    const requestedEpoch = epoch.current
    analysisRequested.current = true
    setAnalyzing(true)
    setAnalyzeError('')
    try {
      const result = await aiApi.analyze(symbol)
      if (epoch.current !== requestedEpoch) return
      setAnalysis(result.analysis)
      setAnalysisGeneratedAt(result.generatedAt)
    } catch (err) {
      if (epoch.current === requestedEpoch) setAnalyzeError(err.message)
    } finally {
      if (epoch.current === requestedEpoch) setAnalyzing(false)
    }
  }

  async function toggleWatchlist() {
    const requestedEpoch = epoch.current
    setWatchlistBusy(true)
    setWatchlistError('')
    try {
      if (inWatchlist) {
        await watchlistApi.remove(symbol)
        if (epoch.current === requestedEpoch) setInWatchlist(false)
      } else {
        await watchlistApi.add(symbol)
        if (epoch.current === requestedEpoch) setInWatchlist(true)
      }
    } catch (err) {
      if (epoch.current === requestedEpoch) setWatchlistError(err.message)
    } finally {
      if (epoch.current === requestedEpoch) setWatchlistBusy(false)
    }
  }


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
          disabled={watchlistBusy || !watchlistReady}
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

      <ErrorBox message={watchlistError} />
      {loading && <Loading label={`Loading ${symbol} quote...`} />}
      <ErrorBox message={error} />
      <StockQuoteCard quote={quote} />

      <Suspense fallback={<Loading label="Loading chart..." />}><PriceChart key={symbol} symbol={symbol} currency={quote?.currency} initialHistory={history} initialLoading={historyLoading} initialError={historyError} /></Suspense>

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
          <RiskCard history={history} loading={historyLoading} error={historyError} />
        </div>
      </div>
    </div>
  )
}