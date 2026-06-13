import React, { useState } from 'react';
import { BookOpen, ArrowRight, Loader2 } from 'lucide-react';

const inputCls = "w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-stone-800 focus:outline-none focus:ring-2 focus:ring-amber-700/40 focus:border-amber-700";

export function Welcome({ onContinue }) {
  return (
    <div className="min-h-screen bg-stone-100 text-stone-800 flex items-center justify-center px-4" style={{ fontFamily: "'Inter', system-ui, sans-serif" }}>
      <style>{`.font-serif { font-family: 'Fraunces', serif; }`}</style>
      <div className="max-w-md w-full text-center bg-white rounded-2xl border border-stone-200 p-8">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-amber-700 text-white mb-4">
          <BookOpen size={22} />
        </div>
        <h1 className="font-serif text-2xl text-stone-800 mb-2">Welcome to Ledger & Lots</h1>
        <p className="text-stone-500 text-sm mb-6">
          Track income and expenses across your different businesses, and keep an eye on your loans —
          all in one place. Let's set up your profile to get started.
        </p>
        <button
          onClick={onContinue}
          className="w-full bg-amber-700 text-white py-2.5 rounded-lg font-medium hover:bg-amber-800 transition-colors flex items-center justify-center gap-2"
        >
          Set up my profile <ArrowRight size={16} />
        </button>
      </div>
    </div>
  );
}

export function ProfileSetup({ onSubmit, saving }) {
  const [name, setName] = useState('');

  return (
    <div className="min-h-screen bg-stone-100 text-stone-800 flex items-center justify-center px-4" style={{ fontFamily: "'Inter', system-ui, sans-serif" }}>
      <style>{`.font-serif { font-family: 'Fraunces', serif; }`}</style>
      <div className="max-w-md w-full bg-white rounded-2xl border border-stone-200 p-8">
        <h2 className="font-serif text-2xl text-stone-800 mb-2">Create your profile</h2>
        <p className="text-stone-500 text-sm mb-6">
          What should we call you or your business group? You can change this later.
        </p>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (!name.trim()) return;
            onSubmit(name.trim());
          }}
        >
          <label className="block mb-4">
            <span className="text-xs uppercase tracking-wide text-stone-500 font-medium">Your name or business group</span>
            <input
              className={inputCls + " mt-1"}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Albert's Ventures"
              autoFocus
            />
          </label>
          <button
            type="submit"
            disabled={saving}
            className="w-full bg-amber-700 text-white py-2.5 rounded-lg font-medium hover:bg-amber-800 transition-colors flex items-center justify-center gap-2 disabled:opacity-60"
          >
            {saving && <Loader2 className="animate-spin" size={16} />}
            Continue to dashboard
          </button>
        </form>
      </div>
    </div>
  );
}
