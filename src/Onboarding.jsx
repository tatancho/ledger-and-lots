import React, { useState } from 'react';

const t = {
  bg: '#0a0a0f', bg2: '#12121a', bg3: '#1a1a26',
  border: 'rgba(255,255,255,0.07)', border2: 'rgba(255,255,255,0.13)',
  text: '#f0f0f5', text2: '#9090a8', text3: '#5a5a72',
  accent: '#c8a96e', green: '#3dd68c', greenbg: 'rgba(61,214,140,0.1)',
};

const btnPrimary = {
  width: '100%', background: '#c8a96e', color: '#0a0a0f', border: 'none',
  borderRadius: 10, padding: '13px', fontSize: 15, fontWeight: 700,
  cursor: 'pointer', fontFamily: "'Syne', sans-serif', letterSpacing: 0.3,
  transition: 'opacity 0.2s',
};

const inputStyle = {
  width: '100%', background: '#1a1a26', border: '1px solid rgba(255,255,255,0.13)',
  borderRadius: 10, padding: '12px 14px', color: '#f0f0f5', fontSize: 14,
  outline: 'none', fontFamily: 'Inter, system-ui, sans-serif', marginTop: 6,
  transition: 'border-color 0.2s',
};

export function Welcome({ onContinue }) {
  const features = [
    { icon: '◉', label: 'All Accounts', sub: 'Mobile money, Visa, bank' },
    { icon: '⬡', label: 'Cryptocurrency', sub: 'BTC, ETH, USDT addresses' },
    { icon: '🏠', label: 'Rentals Hold', sub: 'Deposits & rental income' },
    { icon: '◐', label: 'Loan Tracking', sub: 'Repayments & interest' },
    { icon: '◎', label: 'Savings Goals', sub: 'Track progress visually' },
    { icon: '◧', label: 'Full Summary', sub: 'Money in, out & why' },
  ];

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@700;800&family=Inter:wght@400;500;600&family=JetBrains+Mono:wght@400;500&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: #0a0a0f; }
        @keyframes fadeUp { from { opacity:0; transform:translateY(16px); } to { opacity:1; transform:translateY(0); } }
      `}</style>

      <div style={{ minHeight: '100vh', background: t.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20, fontFamily: 'Inter, system-ui, sans-serif' }}>
        <div style={{ position: 'fixed', top: '15%', left: '50%', transform: 'translateX(-50%)', width: 500, height: 500, background: 'radial-gradient(circle, rgba(200,169,110,0.06) 0%, transparent 70%)', borderRadius: '50%', pointerEvents: 'none' }} />

        <div style={{ width: '100%', maxWidth: 460, animation: 'fadeUp 0.35s ease both' }}>
          {/* Logo */}
          <div style={{ textAlign: 'center', marginBottom: 40 }}>
            <div style={{ width: 64, height: 64, borderRadius: 18, background: 'linear-gradient(135deg, #c8a96e, #a78bfa)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 18px', fontFamily: "'Syne', sans-serif", fontSize: 26, fontWeight: 800, color: '#fff' }}>W</div>
            <h1 style={{ fontFamily: "'Syne', sans-serif", fontSize: 32, fontWeight: 800, color: t.text, letterSpacing: -1 }}>
              Welcome to <span style={{ color: t.accent }}>W Caymans</span>
            </h1>
            <p style={{ color: t.text2, fontSize: 14, marginTop: 10, lineHeight: 1.6 }}>
              Your private financial hub. Track everything in one secure place.
            </p>
          </div>

          {/* Feature grid */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 32 }}>
            {features.map(f => (
              <div key={f.label} style={{ background: t.bg2, border: `1px solid ${t.border}`, borderRadius: 14, padding: '16px 18px', display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ fontSize: 22, flexShrink: 0, color: t.accent }}>{f.icon}</div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: t.text }}>{f.label}</div>
                  <div style={{ fontSize: 11, color: t.text3, fontFamily: "'JetBrains Mono', monospace", marginTop: 2 }}>{f.sub}</div>
                </div>
              </div>
            ))}
          </div>

          <button onClick={onContinue} style={btnPrimary}>
            Get started →
          </button>

          <p style={{ textAlign: 'center', marginTop: 16, fontSize: 11, color: t.text3, fontFamily: "'JetBrains Mono', monospace" }}>
            Your data is encrypted and private to your account.
          </p>
        </div>
      </div>
    </>
  );
}

export function ProfileSetup({ onSubmit, saving }) {
  const [name, setName] = useState('');

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@700;800&family=Inter:wght@400;500;600&family=JetBrains+Mono:wght@400;500&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: #0a0a0f; }
        @keyframes fadeUp { from { opacity:0; transform:translateY(16px); } to { opacity:1; transform:translateY(0); } }
      `}</style>

      <div style={{ minHeight: '100vh', background: t.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20, fontFamily: 'Inter, system-ui, sans-serif' }}>
        <div style={{ position: 'fixed', top: '20%', left: '50%', transform: 'translateX(-50%)', width: 400, height: 400, background: 'radial-gradient(circle, rgba(200,169,110,0.07) 0%, transparent 70%)', borderRadius: '50%', pointerEvents: 'none' }} />

        <div style={{ width: '100%', maxWidth: 400, animation: 'fadeUp 0.35s ease both' }}>
          <div style={{ textAlign: 'center', marginBottom: 32 }}>
            <div style={{ width: 56, height: 56, borderRadius: 16, background: 'linear-gradient(135deg, #c8a96e, #a78bfa)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', fontFamily: "'Syne', sans-serif", fontSize: 22, fontWeight: 800, color: '#fff' }}>
              {name ? name.charAt(0).toUpperCase() : 'W'}
            </div>
            <h1 style={{ fontFamily: "'Syne', sans-serif", fontSize: 26, fontWeight: 800, color: t.text, letterSpacing: -0.5 }}>Set up your profile</h1>
            <p style={{ color: t.text2, fontSize: 14, marginTop: 8 }}>Just one step before you start.</p>
          </div>

          <div style={{ background: t.bg2, border: `1px solid ${t.border}`, borderRadius: 20, padding: 28 }}>
            <form onSubmit={e => { e.preventDefault(); if (!name.trim()) return; onSubmit(name.trim()); }}>
              <label style={{ display: 'block', marginBottom: 24 }}>
                <div style={{ fontSize: 10, color: t.text3, textTransform: 'uppercase', letterSpacing: '0.12em', fontFamily: "'JetBrains Mono', monospace", marginBottom: 6 }}>Your Name</div>
                <input
                  autoFocus
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="e.g. W. Caymans"
                  style={inputStyle}
                  onFocus={e => e.target.style.borderColor = t.accent}
                  onBlur={e => e.target.style.borderColor = t.border2}
                />
              </label>

              {/* Preview avatar */}
              {name && (
                <div style={{ background: t.bg3, border: `1px solid ${t.border}`, borderRadius: 12, padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
                  <div style={{ width: 38, height: 38, borderRadius: '50%', background: 'linear-gradient(135deg, #c8a96e, #a78bfa)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15, fontWeight: 800, color: '#fff', fontFamily: "'Syne', sans-serif", flexShrink: 0 }}>
                    {name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 600, color: t.text }}>{name}</div>
                    <div style={{ fontSize: 11, color: t.green, fontFamily: "'JetBrains Mono', monospace" }}>✓ Ready to go</div>
                  </div>
                </div>
              )}

              <button type="submit" disabled={saving || !name.trim()} style={{ ...btnPrimary, opacity: saving || !name.trim() ? 0.6 : 1, cursor: saving || !name.trim() ? 'not-allowed' : 'pointer' }}>
                {saving ? 'Setting up…' : 'Enter W Caymans →'}
              </button>
            </form>
          </div>

          <p style={{ textAlign: 'center', marginTop: 16, fontSize: 11, color: t.text3, fontFamily: "'JetBrains Mono', monospace" }}>
            You can update this anytime in Profile & Security.
          </p>
        </div>
      </div>
    </>
  );
}
