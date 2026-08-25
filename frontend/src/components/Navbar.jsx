import { NavLink } from 'react-router-dom'
import { LineChart, Search, Sparkles, CalendarClock, ShieldAlert, Star } from 'lucide-react'

const links = [
  { to: '/', label: 'Dashboard', icon: LineChart },
  { to: '/search', label: 'Search', icon: Search },
  { to: '/earnings', label: 'Earnings', icon: CalendarClock },
  { to: '/watchlist', label: 'Watchlist', icon: Star },
]

export default function Navbar() {
  return (
    <header className="sticky top-0 z-20 bg-white/90 backdrop-blur border-b border-slate-200">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2 font-semibold text-slate-800">
          <Sparkles className="w-5 h-5 text-brand-600" />
          <span>Tickerlyze</span>
        </div>
        <nav className="flex items-center gap-1 overflow-x-auto">
          {links.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className={({ isActive }) =>
                `flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                  isActive
                    ? 'bg-brand-50 text-brand-700'
                    : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100'
                }`
              }
            >
              <Icon className="w-4 h-4" />
              {label}
            </NavLink>
          ))}
        </nav>
      </div>
    </header>
  )
}