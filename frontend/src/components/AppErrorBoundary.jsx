import { Component } from 'react'

export default class AppErrorBoundary extends Component {
  state = { failed: false }
  static getDerivedStateFromError() { return { failed: true } }
  render() {
    if (!this.state.failed) return this.props.children
    return <div role="alert" className="card my-6 text-center space-y-4">
      <h1 className="text-xl font-semibold">This page could not load</h1>
      <p className="text-slate-500">Reload to try again. Your saved watchlist is kept by the backend.</p>
      <button className="rounded-xl bg-brand-600 text-white px-4 py-2" onClick={() => window.location.reload()}>Reload page</button>
    </div>
  }
}
