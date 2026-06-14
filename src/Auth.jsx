import React, { useState } from 'react';
import { supabase } from './supabaseClient';

const t = {
  bg: '#0a0a0f', bg2: '#12121a', bg3: '#1a1a26',
  border: 'rgba(255,255,255,0.07)', border2: 'rgba(255,255,255,0.13)',
  text: '#f0f0f5', text2: '#9090a8', text3: '#5a5a72',
  accent: '#c8a96e', green: '#3dd68c', greenbg: 'rgba(61,214,140,0.1)',
  red: '#f26b6b', redbg: 'rgba(242,107,107,0.1)',
};

const inputStyle = {
  width: '100%', background: '#1a1a26', border: '1px solid rgba(255,255,255,0.13)',
  borderRadius: 10, padding: '12px 14px', color: t.text, fontSize: 14,
  outline: 'none', fontFamily: 'Inter, system-ui, sans-serif', marginTop: 6,
  transition: 'border-color 0.2s',
};

export default function Auth({ onAuthSuccess }) {
  const [mode, setMode] = useState('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  async function handle(e) {
    e.preventDefault();
    setError(''); setSuccess(''); setLoading(true);
    if (mode === 'login') {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) setError(error.message);
      else onAuthSuccess(data.session);
    } else {
      const { error } = await supabase.auth.signUp({ email, password });
      if (error) setError(error.message);
      else setSuccess('Check your email to confirm your account, then log in.');
    }
    setLoading(false);
  }

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@700;800&family=Inter:wght@400;500;600&family=JetBrains+Mono:wght@400;500&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: #0a0a0f; }
        @keyframes fadeUp { from { opacity:0; transform:translateY(16px); } to { opacity:1; transform:translateY(0); } }
      `}</style>

      <div style={{ minHeight: '100vh', background: t.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20, fontFamily: 'Inter, system-ui, sans-serif' }}>
        {/* Background glow */}
        <div style={{ position: 'fixed', top: '20%', left: '50%', transform: 'translateX(-50%)', width: 400, height: 400, background: 'radial-gradient(circle, rgba(200,169,110,0.07) 0%, transparent 70%)', borderRadius: '50%', pointerEvents: 'none' }} />

        <div style={{ width: '100%', maxWidth: 400, animation: 'fadeUp 0.35s ease both' }}>
          {/* Logo */}
          <div style={{ textAlign: 'center', marginBottom: 36 }}>
            <div style={{ width: 56, height: 56, borderRadius: 16, background: 'linear-gradient(135deg, #c8a96e, #a78bfa)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', fontFamily: "'Syne', sans-serif", fontSize: 22, fontWeight: 800, color: '#fff' }}>W</div>
            <h1 style={{ fontFamily: "'Syne', sans-serif", fontSize: 28, fontWeight: 800, color: t.text, letterSpacing: -0.5 }}>
              W <span style={{ color: t.accent }}>Caymans</span>
            </h1>
            <p style={{ fontSize: 11, letterSpacing: '0.2em', textTransform: 'uppercase', color: t.text3, marginTop: 6, fontFamily: "'JetBrains Mono', monospace" }}>Private Finance Hub</p>
          </div>

          {/* Card */}
          <div style={{ background: t.bg2, border: `1px solid ${t.border}`, borderRadius: 20, padding: 28 }}>
            {/* Tabs */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, background: t.bg3, padding: 4, borderRadius: 12, marginBottom: 24, border: `1px solid ${t.border}` }}>
              {['login', 'signup'].map(m => (
                <button key={m} onClick={() => { setMode(m); setError(''); setSuccess(''); }} style={{ padding: '10px', borderRadius: 9, fontSize: 13, fontWeight: mode === m ? 700 : 500, background: mode === m ? t.accent : 'none', color: mode === m ? t.bg : t.text2, border: 'none', cursor: 'pointer', fontFamily: "'Syne', sans-serif", transition: 'all 0.15s' }}>
                  {m === 'login' ? 'Log in' : 'Sign up'}
                </button>
              ))}
            </div>

            <form onSubmit={handle}>
              <label style={{ display: 'block', marginBottom: 16 }}>
                <div style={{ fontSize: 10, color: t.text3, textTransform: 'uppercase', letterSpacing: '0.12em', fontFamily: "'JetBrains Mono', monospace" }}>Email</div>
                <input type="email" required value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" style={inputStyle} onFocus={e => e.target.style.borderColor = t.accent} onBlur={e => e.target.style.borderColor = t.border2} />
              </label>

              <label style={{ display: 'block', marginBottom: 20 }}>
                <div style={{ fontSize: 10, color: t.text3, textTransform: 'uppercase', letterSpacing: '0.12em', fontFamily: "'JetBrains Mono', monospace" }}>Password</div>
                <input type="password" required value={password} onChange={e => setPassword(e.target.value)} placeholder="At least 6 characters" style={inputStyle} onFocus={e => e.target.style.borderColor = t.accent} onBlur={e => e.target.style.borderColor = t.border2} />
              </label>

              {error && <div style={{ background: t.redbg, color: t.red, padding: '10px 14px', borderRadius: 9, fontSize: 13, marginBottom: 16, border: `1px solid ${t.red}` }}>{error}</div>}
              {success && <div style={{ background: t.greenbg, color: t.green, padding: '10px 14px', borderRadius: 9, fontSize: 13, marginBottom: 16, border: `1px solid ${t.green}` }}>{success}</div>}

              <button type="submit" disabled={loading} style={{ width: '100%', background: t.accent, color: t.bg, border: 'none', borderRadius: 10, padding: '13px', fontSize: 15, fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer', fontFamily: "'Syne', sans-serif", opacity: loading ? 0.7 : 1, transition: 'opacity 0.2s' }}>
                {loading ? 'Please wait…' : mode === 'login' ? 'Log in' : 'Create account'}
              </button>
            </form>
          </div>

          <p style={{ textAlign: 'center', marginTop: 20, fontSize: 12, color: t.text3, fontFamily: "'JetBrains Mono', monospace" }}>
            Your data is private to your account.
          </p>
        </div>
      </div>
    </>
  );
}
