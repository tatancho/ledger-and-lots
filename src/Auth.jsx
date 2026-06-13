import React, { useState } from 'react';
import { supabase } from './supabaseClient';
import { BookOpen, Loader2 } from 'lucide-react';

const inputCls = "w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-stone-800 focus:outline-none focus:ring-2 focus:ring-amber-700/40 focus:border-amber-700";

export default function Auth({ onAuthSuccess }) {
  const [mode, setMode] = useState('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setInfo('');
    setLoading(true);

    if (mode === 'signup') {
      const { data, error } = await supabase.auth.signUp({ email, password });
      setLoading(false);
      if (error) {
        setError(error.message);
        return;
      }
      if (data.session) {
        onAuthSuccess(data.session);
      } else {
        setInfo('Check your email to confirm your account, then log in.');
        setMode('login');
      }
      return;
    }

    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) {
      setError(error.message);
      return;
    }
    onAuthSuccess(data.session);
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
          <p className="text-stone-500 text-sm mt-1 font-mono">your businesses, your loans, one place</p>
        </div>

        <div className="bg-white rounded-2xl border border-stone-200 p-6">
          <div className="grid grid-cols-2 gap-2 mb-5">
            <button
              type="button"
              onClick={() => { setMode('login'); setError(''); setInfo(''); }}
              className={`py-2 rounded-lg text-sm font-medium border transition-colors ${mode === 'login' ? 'bg-amber-700 text-white border-amber-700' : 'bg-white border-stone-300 text-stone-600'}`}
            >
              Log in
            </button>
            <button
              type="button"
              onClick={() => { setMode('signup'); setError(''); setInfo(''); }}
              className={`py-2 rounded-lg text-sm font-medium border transition-colors ${mode === 'signup' ? 'bg-amber-700 text-white border-amber-700' : 'bg-white border-stone-300 text-stone-600'}`}
            >
              Sign up
            </button>
          </div>

          <form onSubmit={handleSubmit}>
            <label className="block mb-3">
              <span className="text-xs uppercase tracking-wide text-stone-500 font-medium">Email</span>
              <input
                type="email"
                required
                className={inputCls + " mt-1"}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                autoComplete="email"
              />
            </label>
            <label className="block mb-4">
              <span className="text-xs uppercase tracking-wide text-stone-500 font-medium">Password</span>
              <input
                type="password"
                required
                minLength={6}
                className={inputCls + " mt-1"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="At least 6 characters"
                autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
              />
            </label>

            {error && <p className="text-rose-600 text-sm mb-3">{error}</p>}
            {info && <p className="text-emerald-700 text-sm mb-3">{info}</p>}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-amber-700 text-white py-2.5 rounded-lg font-medium hover:bg-amber-800 transition-colors flex items-center justify-center gap-2 disabled:opacity-60"
            >
              {loading && <Loader2 className="animate-spin" size={16} />}
              {mode === 'login' ? 'Log in' : 'Create account'}
            </button>
          </form>
        </div>

        <p className="text-center text-xs text-stone-400 mt-4 font-mono">
          Your data is private to your account.
        </p>
      </div>
    </div>
  );
}
