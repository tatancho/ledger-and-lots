import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from './supabaseClient'
import { BookOpen, ArrowRight, KeyRound } from 'lucide-react'

function generateId() {
  return Array.from(crypto.getRandomValues(new Uint8Array(12)))
    .map((b) => b.toString(36))
    .join('')
    .slice(0, 16)
}

export default function Landing() {
  const navigate = useNavigate()
  const [existingId, setExistingId] = useState('')
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState('')

  async function createNewLedger() {
    setCreating(true)
    setError('')
    const id = generateId()
    const { error } = await supabase.from('books').insert({
      id,
      data: { businesses: [], loans: [] },
    })
    if (error) {
      setError('Could not create your ledger. Check Supabase setup (see README).')
      setCreating(false)
      return
    }
    navigate(`/book/${id}`)
  }

  function openExisting(e) {
    e.preventDefault()
    const trimmed = existingId.trim()
    if (!trimmed) return
    navigate(`/book/${trimmed}`)
  }

  return (
    <div className="min-h-screen bg-stone-100 text-stone-800 flex items-center justify-center px-4" style={{ fontFamily: "'Inter', system-ui, sans-serif" }}>
      <style>{`.font-serif { font-family: 'Fraunces', serif; }`}</style>
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-amber-700 text-white mb-3">
            <BookOpen size={22} />
          </div>
          <h1 className="font-serif text-3xl text-stone-800">Ledger & Lots</h1>
          <p className="text-stone-500 text-sm mt-1 font-mono">your businesses, your loans, one private link</p>
        </div>

        <div className="bg-white rounded-2xl border border-stone-200 p-6 mb-4">
          <h2 className="font-serif text-lg mb-2">Start a new ledger</h2>
          <p className="text-sm text-stone-500 mb-4">
            We'll create a private ledger and give you a unique link. Bookmark it — that link is how you get back in. No password needed, but anyone with the link can view and edit it, so keep it private.
          </p>
          <button
            onClick={createNewLedger}
            disabled={creating}
            className="w-full bg-amber-700 text-white py-2.5 rounded-lg font-medium hover:bg-amber-800 transition-colors flex items-center justify-center gap-2 disabled:opacity-60"
          >
            {creating ? 'Creating…' : 'Create my ledger'} <ArrowRight size={16} />
          </button>
          {error && <p className="text-rose-600 text-sm mt-3">{error}</p>}
        </div>

        <div className="bg-white rounded-2xl border border-stone-200 p-6">
          <h2 className="font-serif text-lg mb-2 flex items-center gap-2">
            <KeyRound size={16} className="text-amber-700" /> Already have a link?
          </h2>
          <form onSubmit={openExisting}>
            <input
              className="w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-stone-800 focus:outline-none focus:ring-2 focus:ring-amber-700/40 focus:border-amber-700 mb-3 font-mono text-sm"
              placeholder="Paste your ledger ID"
              value={existingId}
              onChange={(e) => setExistingId(e.target.value)}
            />
            <button type="submit" className="w-full bg-stone-800 text-white py-2.5 rounded-lg font-medium hover:bg-stone-900 transition-colors">
              Open ledger
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
