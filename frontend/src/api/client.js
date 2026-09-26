import axios from 'axios'
import { apiBaseUrl } from './baseUrl'

// Production uses the same-origin Vercel proxy; local development may override it.
const API_BASE_URL = import.meta.env.PROD ? '/api' : apiBaseUrl(import.meta.env.VITE_API_BASE_URL)

const client = axios.create({
  baseURL: API_BASE_URL,
  timeout: 60000,
})

// Normalize errors so components can just read `err.message`
client.interceptors.response.use(
  (res) => {
    if (typeof res.data === 'string' && res.data.trimStart().startsWith('<')) {
      return Promise.reject(new Error('The API returned a web page instead of data. Check the backend URL configuration.'))
    }
    return res
  },
  (err) => {
    const message =
      err.response?.data?.error ||
      err.message ||
      'Something went wrong. Please try again.'
    return Promise.reject(new Error(message))
  }
)

export const dashboardApi = {
  getOverview: () => client.get('/dashboard/overview').then((r) => r.data),
}

export const stockApi = {
  search: (q) => client.get('/stocks/search', { params: { q } }).then((r) => r.data),
  getQuote: (symbol) => client.get(`/stocks/${symbol}`).then((r) => r.data),
  getHistory: (symbol, period = '6mo') =>
    client.get(`/stocks/${symbol}/history`, { params: { period } }).then((r) => r.data),
}

export const aiApi = {
  analyze: (symbol) => client.post(`/ai/analyze/${symbol}`).then((r) => r.data),
  getRecent: (limit = 10) =>
    client.get('/ai/analyses', { params: { limit } }).then((r) => r.data),
  getForSymbol: (symbol) => client.get(`/ai/analyses/${symbol}`).then((r) => r.data),
}

export const riskApi = {
  getRisk: (symbol) => client.get(`/risk/${symbol}`).then((r) => r.data),
}

export const earningsApi = {
  getForSymbol: (symbol) => client.get(`/earnings/${symbol}`).then((r) => r.data),
  getUpcomingForWatchlist: () =>
    client.get('/earnings/watchlist/upcoming').then((r) => r.data),
}

export const watchlistApi = {
  get: () => client.get('/watchlist').then((r) => r.data),
  add: (symbol) => client.post('/watchlist', { symbol }).then((r) => r.data),
  remove: (symbol) => client.delete(`/watchlist/${symbol}`).then((r) => r.data),
}

export default client