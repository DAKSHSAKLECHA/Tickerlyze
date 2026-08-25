import { Routes, Route } from 'react-router-dom'
import Navbar from './components/Navbar'
import Dashboard from './pages/Dashboard'
import StockSearch from './pages/StockSearch'
import StockDetail from './pages/StockDetail'
import Earnings from './pages/Earnings'
import Watchlist from './pages/Watchlist'

export default function App() {
  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />
      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-6">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/search" element={<StockSearch />} />
          <Route path="/stock/:symbol" element={<StockDetail />} />
          <Route path="/earnings" element={<Earnings />} />
          <Route path="/watchlist" element={<Watchlist />} />
          <Route path="*" element={<div className="text-slate-500">Page not found.</div>} />
        </Routes>
      </main>
    </div>
  )
}
