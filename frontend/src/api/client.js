import axios from 'axios'
import { apiBaseUrl } from './baseUrl'

// Production uses the same-origin Vercel proxy; local development may override it.
const API_BASE_URL = import.meta.env.PROD ? '/api' : apiBaseUrl(import.meta.env.VITE_API_BASE_URL)

const client = axios.create({
  baseURL: API_BASE_URL,
  timeout: 20000,
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
      (err.code === 'ECONNABORTED' ? 'The server took too long to respond. Please retry in a moment.' : err.message) ||
      'Something went wrong. Please try again.'
    return Promise.reject(new Error(message))
  }
)

export const dashboardApi = {
  getOverview: () => client.get('/dashboard/overview').then((r) => r.data),
}

export const stockApi = {
  search: (q) => client.get('/stocks/search', { params: { q } }).then((r) => r.data),
  getQuote: (symbol, options = {}) => client.get(`/stocks/${symbol}`, options).then((r) => r.data),
  getHistory: (symbol, period = '6mo', options = {}) =>
    client.get(`/stocks/${symbol}/history`, { ...options, params: { period } }).then((r) => r.data),
}

export const aiApi = {
  analyze: (symbol, refresh = false) => client.post(`/ai/analyze/${symbol}`, { refresh }, { timeout: 60000 }).then((r) => r.data),
  getRecent: (limit = 10) =>
    client.get('/ai/analyses', { params: { limit } }).then((r) => r.data),
  getForSymbol: (symbol, options = {}) => client.get(`/ai/analyses/${symbol}`, options).then((r) => r.data),
}

export const earningsApi = {
  getForSymbol: (symbol, options = {}) => client.get(`/earnings/${symbol}`, options).then((r) => r.data),
  getUpcomingForWatchlist: () =>
    client.get('/earnings/watchlist/upcoming').then((r) => r.data),
}

export const watchlistApi = {
  get: (options = {}) => client.get('/watchlist', options).then((r) => r.data),
  add: (symbol) => client.post('/watchlist', { symbol }).then((r) => r.data),
  remove: (symbol) => client.delete(`/watchlist/${symbol}`).then((r) => r.data),
}

export default client