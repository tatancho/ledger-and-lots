import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { supabase } from './supabaseClient';
import Auth from './Auth';
import { Welcome, ProfileSetup } from './Onboarding';

// ── Icons (inline SVG components to avoid extra deps) ──
const Icon = ({ d, size = 18, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
    stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d={d} />
  </svg>
);
const Icons = {
  menu: 'M3 12h18M3 6h18M3 18h18',
  x: 'M18 6L6 18M6 6l12 12',
  sun: 'M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42M12 5a7 7 0 1 0 0 14A7 7 0 0 0 12 5z',
  moon: 'M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z',
  bell: 'M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 0 1-3.46 0',
  logout: 'M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9',
  trending_up: 'M23 6l-9.5 9.5-5-5L1 18',
  trending_down: 'M23 18l-9.5-9.5-5 5L1 6',
  wallet: 'M20 12V8H6a2 2 0 0 1 0-4h14v4M20 12v4H6a2 2 0 0 0 0 4h14v-4',
  building: 'M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2zM9 22V12h6v10',
  landmark: 'M3 22h18M6 18V11M10 18V11M14 18V11M18 18V11M12 2L2 7h20z',
  plus: 'M12 5v14M5 12h14',
  trash: 'M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2',
  chevron_right: 'M9 18l6-6-6-6',
  check: 'M20 6L9 17l-5-5',
  copy: 'M8 4H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-4-4H8zM14 2v6h6',
  shield: 'M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z',
  user: 'M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z',
  crypto: 'M11.767 19.089c4.924.868 6.14-6.025 1.216-6.894m-1.216 6.894L5.86 18.047m5.908 1.042l-.347 1.97m1.563-8.864c4.924.869 6.14-6.025 1.215-6.893m-1.215 6.893L4.645 9.15m7.522 1.033l-.348 1.97M4.645 9.15l-.346 1.97m0 0 8.562 1.512',
  arrow_up: 'M12 19V5M5 12l7-7 7 7',
  arrow_down: 'M12 5v14M5 12l7 7 7-7',
};

const ZMW = (n) => 'K ' + Number(n || 0).toLocaleString('en-ZM', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const USD = (n) => '$' + Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const todayISO = () => new Date().toISOString().slice(0, 10);
const uid = () => Math.random().toString(36).slice(2, 10);

const PAGES = [
  { id: 'dashboard', label: 'Dashboard', icon: 'wallet', section: 'Overview' },
  { id: 'accounts', label: 'All Accounts', icon: 'building', section: 'Accounts' },
  { id: 'savings', label: 'Savings', icon: 'trending_up', section: 'Accounts' },
  { id: 'loans', label: 'Loan Repayments', icon: 'landmark', section: 'Accounts' },
  { id: 'rentals', label: 'Rentals Hold', icon: 'building', section: 'Accounts' },
  { id: 'crypto', label: 'Cryptocurrency', icon: 'crypto', section: 'Digital Assets' },
  { id: 'transactions', label: 'Transactions', icon: 'trending_down', section: 'Activity' },
  { id: 'summary', label: 'Summary', icon: 'trending_up', section: 'Activity' },
  { id: 'profile', label: 'Profile & Security', icon: 'shield', section: 'Account' },
];

const emptyData = { businesses: [], loans: [], accounts: [], savings: [], rentals: [], cryptoTx: [] };

function calcLoanStats(loan) {
  const totalPaid = (loan.payments || []).reduce((s, p) => s + Number(p.amount), 0);
  const monthlyRate = loan.rate / 100 / 12;
  let balance = loan.principal;
  let totalInterest = 0;
  const sorted = [...(loan.payments || [])].sort((a, b) => new Date(a.date) - new Date(b.date));
  for (const p of sorted) {
    const interest = balance * monthlyRate;
    totalInterest += interest;
    balance = Math.max(0, balance + interest - Number(p.amount));
  }
  return { totalPaid, remaining: balance, totalInterest };
}

// ── THEME ──
function useTheme() {
  const [dark, setDark] = useState(true);
  const toggle = () => setDark(d => !d);
  return { dark, toggle };
}

// ── CSS-in-JS token helper ──
function getTokens(dark) {
  return dark ? {
    bg: '#0a0a0f', bg2: '#12121a', bg3: '#1a1a26',
    border: 'rgba(255,255,255,0.07)', border2: 'rgba(255,255,255,0.13)',
    text: '#f0f0f5', text2: '#9090a8', text3: '#5a5a72',
    accent: '#c8a96e', accent2: '#e8c98e', accentbg: 'rgba(200,169,110,0.12)',
    green: '#3dd68c', greenbg: 'rgba(61,214,140,0.1)',
    red: '#f26b6b', redbg: 'rgba(242,107,107,0.1)',
    blue: '#6b9ef2', bluebg: 'rgba(107,158,242,0.1)',
    purple: '#a78bfa', purplebg: 'rgba(167,139,250,0.1)',
    shadow: '0 4px 24px rgba(0,0,0,0.4)',
  } : {
    bg: '#f5f5f0', bg2: '#ffffff', bg3: '#efefea',
    border: 'rgba(0,0,0,0.07)', border2: 'rgba(0,0,0,0.13)',
    text: '#0f0f18', text2: '#5a5a72', text3: '#9090a8',
    accent: '#9a6f2e', accent2: '#7a5010', accentbg: 'rgba(154,111,46,0.1)',
    green: '#1a9e5c', greenbg: 'rgba(26,158,92,0.08)',
    red: '#c94040', redbg: 'rgba(201,64,64,0.08)',
    blue: '#2563eb', bluebg: 'rgba(37,99,235,0.08)',
    purple: '#7c3aed', purplebg: 'rgba(124,58,237,0.08)',
    shadow: '0 4px 24px rgba(0,0,0,0.08)',
  };
}

// ── GLOBAL STYLES ──
function GlobalStyles({ t }) {
  return (
    <style>{`
      @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=Inter:wght@300;400;500;600&family=JetBrains+Mono:wght@400;500&display=swap');
      *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
      body { background: ${t.bg}; color: ${t.text}; font-family: 'Inter', system-ui, sans-serif; font-size: 15px; line-height: 1.6; transition: background 0.3s, color 0.3s; }
      ::-webkit-scrollbar { width: 6px; } ::-webkit-scrollbar-track { background: ${t.bg2}; } ::-webkit-scrollbar-thumb { background: ${t.border2}; border-radius: 3px; }
      input, select, textarea { font-family: inherit; }
      button { font-family: inherit; cursor: pointer; }
      @keyframes fadeUp { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }
      .fade-up { animation: fadeUp 0.28s ease both; }
    `}</style>
  );
}

// ── REUSABLE COMPONENTS ──
function Card({ children, style, onClick }) {
  return (
    <div onClick={onClick} style={{
      background: 'var(--card)', border: '1px solid var(--border)',
      borderRadius: 16, padding: 24, transition: 'box-shadow 0.2s',
      cursor: onClick ? 'pointer' : 'default', ...style
    }}>{children}</div>
  );
}

function StatCard({ label, value, change, changeUp, icon, color }) {
  const colorMap = {
    gold: 'var(--accent)', green: 'var(--green)',
    red: 'var(--red)', blue: 'var(--blue)', purple: 'var(--purple)',
  };
  const bgMap = {
    gold: 'var(--accentbg)', green: 'var(--greenbg)',
    red: 'var(--redbg)', blue: 'var(--bluebg)', purple: 'var(--purplebg)',
  };
  return (
    <div style={{
      background: 'var(--card)', border: '1px solid var(--border)',
      borderRadius: 16, padding: 20, position: 'relative', overflow: 'hidden',
    }}>
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: `linear-gradient(90deg, ${colorMap[color]}, transparent)` }} />
      <div style={{ width: 40, height: 40, borderRadius: 10, background: bgMap[color], display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 14, color: colorMap[color] }}>
        <Icon d={Icons[icon]} size={18} color={colorMap[color]} />
      </div>
      <div style={{ fontSize: 10, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.12em', fontFamily: "'JetBrains Mono', monospace" }}>{label}</div>
      <div style={{ fontFamily: "'Syne', sans-serif", fontSize: 24, fontWeight: 700, color: 'var(--text)', margin: '4px 0', letterSpacing: '-0.5px' }}>{value}</div>
      {change && <div style={{ fontSize: 12, color: changeUp ? 'var(--green)' : 'var(--red)' }}>{changeUp ? '▲' : '▼'} {change}</div>}
    </div>
  );
}

function TxRow({ icon, iconBg, label, meta, amount, isCredit }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 0', borderBottom: '1px solid var(--border)' }}>
      <div style={{ width: 40, height: 40, borderRadius: 12, background: iconBg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: 18 }}>{icon}</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{label}</div>
        <div style={{ fontSize: 11, color: 'var(--text3)', fontFamily: "'JetBrains Mono', monospace" }}>{meta}</div>
      </div>
      <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 14, fontWeight: 600, color: isCredit ? 'var(--green)' : 'var(--red)', flexShrink: 0 }}>
        {isCredit ? '+' : '-'}{amount}
      </div>
    </div>
  );
}

function ProgressBar({ pct, color = 'var(--accent)' }) {
  return (
    <div style={{ height: 6, background: 'var(--bg3)', borderRadius: 99, overflow: 'hidden', marginTop: 8 }}>
      <div style={{ height: '100%', width: `${Math.min(100, pct)}%`, background: color, borderRadius: 99, transition: 'width 0.6s ease' }} />
    </div>
  );
}

function SectionTitle({ children, action, onAction }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
      <h3 style={{ fontFamily: "'Syne', sans-serif", fontSize: 16, fontWeight: 700, color: 'var(--text)' }}>{children}</h3>
      {action && <button onClick={onAction} style={{ fontSize: 12, color: 'var(--accent)', background: 'none', border: 'none', fontWeight: 500 }}>{action}</button>}
    </div>
  );
}

function BtnPrimary({ children, onClick, style }) {
  return (
    <button onClick={onClick} style={{
      background: 'var(--accent)', color: 'var(--bg)', border: 'none',
      borderRadius: 10, padding: '11px 22px', fontSize: 14, fontWeight: 700,
      fontFamily: "'Syne', sans-serif", letterSpacing: 0.3, transition: 'opacity 0.2s', ...style
    }} onMouseOver={e => e.target.style.opacity = 0.85} onMouseOut={e => e.target.style.opacity = 1}>
      {children}
    </button>
  );
}

function FieldInput({ label, ...props }) {
  return (
    <label style={{ display: 'block', marginBottom: 16 }}>
      <div style={{ fontSize: 10, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.12em', fontFamily: "'JetBrains Mono', monospace", marginBottom: 6 }}>{label}</div>
      <input {...props} style={{
        width: '100%', background: 'var(--bg3)', border: '1px solid var(--border2)',
        borderRadius: 10, padding: '10px 14px', color: 'var(--text)', fontSize: 14,
        outline: 'none', transition: 'border-color 0.2s', ...props.style
      }} onFocus={e => e.target.style.borderColor = 'var(--accent)'}
         onBlur={e => e.target.style.borderColor = 'var(--border2)'} />
    </label>
  );
}

function Modal({ title, onClose, children }) {
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 200, display: 'flex', alignItems: 'flex-end', justifyContent: 'center', background: 'rgba(0,0,0,0.5)' }} onClick={onClose}>
      <div style={{ background: 'var(--bg2)', width: '100%', maxWidth: 480, borderRadius: '20px 20px 0 0', maxHeight: '85vh', overflowY: 'auto', border: '1px solid var(--border)' }} onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 22px', borderBottom: '1px solid var(--border)', position: 'sticky', top: 0, background: 'var(--bg2)' }}>
          <span style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: 16, color: 'var(--text)' }}>{title}</span>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text3)' }}><Icon d={Icons.x} /></button>
        </div>
        <div style={{ padding: 22 }}>{children}</div>
      </div>
    </div>
  );
}

// ── PAGE: DASHBOARD ──
function Dashboard({ data, onNavigate }) {
  const totalSavings = (data.savings || []).reduce((s, g) => s + Number(g.saved || 0), 0);
  const totalLoans = (data.loans || []).reduce((s, l) => s + calcLoanStats(l).remaining, 0);
  const mobileMoney = (data.accounts || []).filter(a => a.type === 'mobile').reduce((s, a) => s + Number(a.balance || 0), 0);
  const rentals = (data.rentals || []).reduce((s, r) => s + Number(r.deposit || 0), 0);
  const netWorth = totalSavings + mobileMoney + rentals - totalLoans;
  const recentTx = [...(data.transactions || [])].sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 5);

  return (
    <div className="fade-up">
      <div style={{ marginBottom: 28 }}>
        <div style={{ fontSize: 10, letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--accent)', fontFamily: "'JetBrains Mono', monospace", marginBottom: 6 }}>W Caymans</div>
        <h1 style={{ fontFamily: "'Syne', sans-serif", fontSize: 30, fontWeight: 800, color: 'var(--text)', letterSpacing: -0.5 }}>Good morning, W.</h1>
        <p style={{ color: 'var(--text2)', fontSize: 14, marginTop: 4 }}>Here's your financial position today.</p>
      </div>

      {/* Net Worth Hero */}
      <div style={{ background: 'linear-gradient(135deg, var(--bg2) 0%, var(--bg3) 100%)', border: '1px solid var(--border)', borderRadius: 24, padding: 36, marginBottom: 24, position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: -60, right: -60, width: 200, height: 200, background: 'radial-gradient(circle, rgba(200,169,110,0.12) 0%, transparent 70%)', borderRadius: '50%' }} />
        <div style={{ fontSize: 11, letterSpacing: '0.15em', textTransform: 'uppercase', color: 'var(--text3)', fontFamily: "'JetBrains Mono', monospace" }}>Total Net Worth</div>
        <div style={{ fontFamily: "'Syne', sans-serif", fontSize: 48, fontWeight: 800, color: 'var(--text)', letterSpacing: -2, margin: '8px 0' }}>
          <span style={{ color: 'var(--accent)' }}>K </span>{Number(Math.max(0, netWorth)).toLocaleString('en-ZM', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </div>
        <div style={{ color: 'var(--text2)', fontSize: 13 }}>Across all accounts and digital assets</div>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'var(--greenbg)', color: 'var(--green)', padding: '4px 14px', borderRadius: 99, fontSize: 12, fontWeight: 600, marginTop: 12, fontFamily: "'JetBrains Mono', monospace" }}>
          ▲ Updated just now
        </div>
      </div>

      {/* Stat Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16, marginBottom: 24 }}>
        <StatCard label="Mobile Money" value={ZMW(mobileMoney)} icon="wallet" color="gold" change="Airtel + MTN" changeUp />
        <StatCard label="Savings" value={ZMW(totalSavings)} icon="trending_up" color="green" change="All goals" changeUp />
        <StatCard label="Loans Outstanding" value={ZMW(totalLoans)} icon="landmark" color="red" change="Total remaining" />
        <StatCard label="Rentals Hold" value={ZMW(rentals)} icon="building" color="blue" change={`${(data.rentals||[]).length} properties`} changeUp />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 20 }}>
        {/* Recent Transactions */}
        <div>
          <SectionTitle action="View all" onAction={() => onNavigate('transactions')}>Recent Transactions</SectionTitle>
          <Card>
            {recentTx.length === 0 && <p style={{ color: 'var(--text3)', fontSize: 14 }}>No transactions yet.</p>}
            {recentTx.map(t => (
              <TxRow key={t.id} icon={t.type === 'income' ? '📲' : '💸'} iconBg={t.type === 'income' ? 'var(--greenbg)' : 'var(--redbg)'} label={t.note || t.category} meta={`${t.date} · ${t.account || 'General'}`} amount={ZMW(t.amount)} isCredit={t.type === 'income'} />
            ))}
          </Card>
        </div>

        {/* Loan Snapshot */}
        <div>
          <SectionTitle action="Manage" onAction={() => onNavigate('loans')}>Loan Repayments</SectionTitle>
          <Card>
            {(data.loans || []).length === 0 && <p style={{ color: 'var(--text3)', fontSize: 14 }}>No loans tracked yet.</p>}
            {(data.loans || []).map(l => {
              const stats = calcLoanStats(l);
              const pct = l.principal > 0 ? ((l.principal - stats.remaining) / l.principal) * 100 : 0;
              return (
                <div key={l.id} style={{ marginBottom: 20 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>{l.lender}</span>
                    <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 13, color: 'var(--red)' }}>{ZMW(stats.remaining)}</span>
                  </div>
                  <ProgressBar pct={pct} color={pct > 60 ? 'var(--green)' : 'var(--accent)'} />
                  <div style={{ fontSize: 10, color: 'var(--text3)', marginTop: 4 }}>{Math.round(pct)}% repaid</div>
                </div>
              );
            })}
          </Card>
        </div>
      </div>
    </div>
  );
}

// ── PAGE: ACCOUNTS ──
function AccountsPage({ data, setData }) {
  const [modal, setModal] = useState(null);
  const accounts = data.accounts || [];
  const transactions = data.transactions || [];

  function addAccount(acc) {
    setData(d => ({ ...d, accounts: [...(d.accounts || []), { id: uid(), ...acc }] }));
  }
  function deleteAccount(id) {
    setData(d => ({ ...d, accounts: (d.accounts || []).filter(a => a.id !== id) }));
  }
  function addTransaction(tx) {
    setData(d => ({ ...d, transactions: [...(d.transactions || []), { id: uid(), ...tx }] }));
  }

  const totalBalance = accounts.reduce((s, a) => s + Number(a.balance || 0), 0);
  const totalIn = transactions.filter(t => t.type === 'income').reduce((s, t) => s + Number(t.amount), 0);
  const totalOut = transactions.filter(t => t.type === 'expense').reduce((s, t) => s + Number(t.amount), 0);

  const typeIcon = { mobile: '📲', visa: '💳', bank: '🏦' };
  const typeLabel = { mobile: 'Mobile Money', visa: 'Visa / Debit Card', bank: 'Bank Account' };

  return (
    <div className="fade-up">
      <div style={{ marginBottom: 28 }}>
        <div style={{ fontSize: 10, letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--accent)', fontFamily: "'JetBrains Mono', monospace", marginBottom: 6 }}>Finance</div>
        <h1 style={{ fontFamily: "'Syne', sans-serif", fontSize: 30, fontWeight: 800, color: 'var(--text)', letterSpacing: -0.5 }}>All Accounts</h1>
      </div>

      {/* Summary bar */}
      <div style={{ display: 'flex', background: 'var(--bg3)', borderRadius: 12, border: '1px solid var(--border)', overflow: 'hidden', marginBottom: 24, flexWrap: 'wrap' }}>
        {[['Total Balance', ZMW(totalBalance)], ['Received', ZMW(totalIn)], ['Sent', ZMW(totalOut)], ['Accounts', accounts.length]].map(([l, v]) => (
          <div key={l} style={{ flex: 1, minWidth: 130, padding: '16px 20px', borderRight: '1px solid var(--border)' }}>
            <div style={{ fontSize: 10, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.1em', fontFamily: "'JetBrains Mono', monospace" }}>{l}</div>
            <div style={{ fontFamily: "'Syne', sans-serif", fontSize: 20, fontWeight: 700, color: 'var(--text)', marginTop: 4 }}>{v}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
        <BtnPrimary onClick={() => setModal('addAccount')}>+ Add Account</BtnPrimary>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 16, marginBottom: 24 }}>
        {accounts.map(a => (
          <div key={a.id} style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 20, padding: 24, position: 'relative', overflow: 'hidden', transition: 'border-color 0.2s' }}>
            <div style={{ position: 'absolute', right: -10, bottom: -10, fontSize: 80, opacity: 0.04 }}>{typeIcon[a.type] || '💼'}</div>
            <div style={{ fontSize: 10, letterSpacing: '0.15em', textTransform: 'uppercase', color: 'var(--text3)', fontFamily: "'JetBrains Mono', monospace", marginBottom: 8 }}>{typeLabel[a.type] || a.type}</div>
            <div style={{ fontFamily: "'Syne', sans-serif", fontSize: 18, fontWeight: 700, color: 'var(--text)' }}>{a.name}</div>
            <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 28, fontWeight: 500, color: 'var(--text)', margin: '16px 0 4px', letterSpacing: -1 }}>{ZMW(a.balance)}</div>
            <div style={{ fontSize: 12, color: 'var(--text3)' }}>Zambian Kwacha · ZMW</div>
            <div style={{ display: 'flex', gap: 8, marginTop: 16, flexWrap: 'wrap' }}>
              <button onClick={() => setModal({ type: 'addTx', accountId: a.id, txType: 'income' })} style={{ padding: '7px 14px', borderRadius: 8, fontSize: 12, fontWeight: 600, background: 'var(--accent)', color: 'var(--bg)', border: 'none' }}>+ Receive</button>
              <button onClick={() => setModal({ type: 'addTx', accountId: a.id, txType: 'expense' })} style={{ padding: '7px 14px', borderRadius: 8, fontSize: 12, fontWeight: 600, background: 'var(--bg3)', color: 'var(--text2)', border: '1px solid var(--border2)' }}>Send</button>
              <button onClick={() => deleteAccount(a.id)} style={{ padding: '7px 10px', borderRadius: 8, fontSize: 12, background: 'var(--redbg)', color: 'var(--red)', border: '1px solid var(--red)' }}>✕</button>
            </div>
          </div>
        ))}
        {accounts.length === 0 && <p style={{ color: 'var(--text3)', fontSize: 14 }}>No accounts yet. Add your first one.</p>}
      </div>

      {modal === 'addAccount' && (
        <Modal title="Add Account" onClose={() => setModal(null)}>
          <AddAccountForm onSubmit={acc => { addAccount(acc); setModal(null); }} />
        </Modal>
      )}
      {modal?.type === 'addTx' && (
        <Modal title="Record Transaction" onClose={() => setModal(null)}>
          <AddTxForm defaultType={modal.txType} accountId={modal.accountId} onSubmit={tx => { addTransaction(tx); setModal(null); }} />
        </Modal>
      )}
    </div>
  );
}

// ── PAGE: SAVINGS ──
function SavingsPage({ data, setData }) {
  const [modal, setModal] = useState(false);
  const goals = data.savings || [];
  const totalSaved = goals.reduce((s, g) => s + Number(g.saved || 0), 0);
  const totalTarget = goals.reduce((s, g) => s + Number(g.target || 0), 0);

  function addGoal(g) { setData(d => ({ ...d, savings: [...(d.savings || []), { id: uid(), ...g }] })); }
  function deleteGoal(id) { setData(d => ({ ...d, savings: (d.savings || []).filter(g => g.id !== id) })); }
  function deposit(id, amount) {
    setData(d => ({ ...d, savings: (d.savings || []).map(g => g.id === id ? { ...g, saved: Number(g.saved || 0) + Number(amount) } : g) }));
  }

  const colorByPct = (pct) => pct >= 80 ? 'var(--green)' : pct >= 40 ? 'var(--accent)' : 'var(--blue)';

  return (
    <div className="fade-up">
      <div style={{ marginBottom: 28 }}>
        <div style={{ fontSize: 10, letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--accent)', fontFamily: "'JetBrains Mono', monospace", marginBottom: 6 }}>Accounts</div>
        <h1 style={{ fontFamily: "'Syne', sans-serif", fontSize: 30, fontWeight: 800, color: 'var(--text)', letterSpacing: -0.5 }}>Savings</h1>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16, marginBottom: 24 }}>
        <StatCard label="Total Saved" value={ZMW(totalSaved)} icon="trending_up" color="green" change="All goals" changeUp />
        <StatCard label="Total Target" value={ZMW(totalTarget)} icon="wallet" color="gold" />
        <StatCard label="Goals" value={goals.length} icon="check" color="blue" />
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
        <BtnPrimary onClick={() => setModal(true)}>+ New Goal</BtnPrimary>
      </div>

      <Card>
        {goals.length === 0 && <p style={{ color: 'var(--text3)', fontSize: 14 }}>No savings goals yet.</p>}
        {goals.map(g => {
          const pct = g.target > 0 ? (g.saved / g.target) * 100 : 0;
          return (
            <div key={g.id} style={{ marginBottom: 24, paddingBottom: 24, borderBottom: '1px solid var(--border)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 15, fontWeight: 600, color: 'var(--text)' }}>{g.name}</span>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 13, color: colorByPct(pct) }}>{ZMW(g.saved)} / {ZMW(g.target)}</span>
                  <button onClick={() => { const amt = prompt('Add amount (ZMW):'); if (amt && !isNaN(amt)) deposit(g.id, amt); }} style={{ padding: '4px 10px', borderRadius: 6, fontSize: 11, background: 'var(--greenbg)', color: 'var(--green)', border: '1px solid var(--green)' }}>+ Deposit</button>
                  <button onClick={() => deleteGoal(g.id)} style={{ padding: '4px 8px', borderRadius: 6, fontSize: 11, background: 'var(--redbg)', color: 'var(--red)', border: '1px solid var(--red)' }}>✕</button>
                </div>
              </div>
              <ProgressBar pct={pct} color={colorByPct(pct)} />
              <div style={{ fontSize: 10, color: 'var(--text3)', marginTop: 4 }}>{Math.round(pct)}% complete</div>
            </div>
          );
        })}
      </Card>

      {modal && (
        <Modal title="New Savings Goal" onClose={() => setModal(false)}>
          <AddGoalForm onSubmit={g => { addGoal(g); setModal(false); }} />
        </Modal>
      )}
    </div>
  );
}

// ── PAGE: LOANS ──
function LoansPage({ data, setData }) {
  const [modal, setModal] = useState(null);
  const loans = data.loans || [];

  function addLoan(l) { setData(d => ({ ...d, loans: [...(d.loans || []), { id: uid(), payments: [], ...l }] })); }
  function deleteLoan(id) { setData(d => ({ ...d, loans: (d.loans || []).filter(l => l.id !== id) })); }
  function addPayment(loanId, payment) {
    setData(d => ({ ...d, loans: (d.loans || []).map(l => l.id === loanId ? { ...l, payments: [...(l.payments || []), { id: uid(), ...payment }] } : l) }));
  }

  const totalOutstanding = loans.reduce((s, l) => s + calcLoanStats(l).remaining, 0);
  const totalPaid = loans.reduce((s, l) => s + calcLoanStats(l).totalPaid, 0);

  return (
    <div className="fade-up">
      <div style={{ marginBottom: 28 }}>
        <div style={{ fontSize: 10, letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--accent)', fontFamily: "'JetBrains Mono', monospace", marginBottom: 6 }}>Accounts</div>
        <h1 style={{ fontFamily: "'Syne', sans-serif", fontSize: 30, fontWeight: 800, color: 'var(--text)', letterSpacing: -0.5 }}>Loan Repayments</h1>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16, marginBottom: 24 }}>
        <StatCard label="Total Outstanding" value={ZMW(totalOutstanding)} icon="landmark" color="red" />
        <StatCard label="Total Paid" value={ZMW(totalPaid)} icon="check" color="green" changeUp change="All time" />
        <StatCard label="Active Loans" value={loans.length} icon="wallet" color="gold" />
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
        <BtnPrimary onClick={() => setModal('addLoan')}>+ Add Loan</BtnPrimary>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {loans.length === 0 && <p style={{ color: 'var(--text3)', fontSize: 14 }}>No loans tracked yet.</p>}
        {loans.map(l => {
          const stats = calcLoanStats(l);
          const pct = l.principal > 0 ? ((l.principal - stats.remaining) / l.principal) * 100 : 0;
          return (
            <Card key={l.id}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
                <div>
                  <div style={{ fontFamily: "'Syne', sans-serif", fontSize: 18, fontWeight: 700, color: 'var(--text)' }}>{l.lender}</div>
                  <div style={{ fontSize: 11, color: 'var(--text3)', fontFamily: "'JetBrains Mono', monospace", marginTop: 2 }}>{l.rate}% p.a. · {l.termMonths} months · from {l.startDate}</div>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button onClick={() => setModal({ type: 'pay', loanId: l.id })} style={{ padding: '7px 14px', borderRadius: 8, fontSize: 12, fontWeight: 600, background: 'var(--accent)', color: 'var(--bg)', border: 'none' }}>Pay</button>
                  <button onClick={() => deleteLoan(l.id)} style={{ padding: '7px 10px', borderRadius: 8, fontSize: 12, background: 'var(--redbg)', color: 'var(--red)', border: '1px solid var(--red)' }}>✕</button>
                </div>
              </div>
              {[['Principal', ZMW(l.principal), 'var(--text)'], ['Remaining', ZMW(stats.remaining), 'var(--red)'], ['Paid', ZMW(stats.totalPaid), 'var(--green)']].map(([k, v, c]) => (
                <div key={k} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                  <span style={{ fontSize: 13, color: 'var(--text2)' }}>{k}</span>
                  <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 13, color: c }}>{v}</span>
                </div>
              ))}
              <ProgressBar pct={pct} color={pct > 60 ? 'var(--green)' : 'var(--accent)'} />
              <div style={{ fontSize: 10, color: 'var(--text3)', marginTop: 4 }}>{Math.round(pct)}% repaid</div>

              {l.payments?.length > 0 && (
                <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid var(--border)' }}>
                  <div style={{ fontSize: 11, color: 'var(--text3)', fontFamily: "'JetBrains Mono', monospace", marginBottom: 8 }}>PAYMENT HISTORY</div>
                  {[...l.payments].sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 3).map(p => (
                    <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid var(--border)' }}>
                      <span style={{ fontSize: 13, color: 'var(--text3)', fontFamily: "'JetBrains Mono', monospace" }}>{p.date}</span>
                      <span style={{ fontSize: 13, color: 'var(--green)', fontFamily: "'JetBrains Mono', monospace", fontWeight: 600 }}>{ZMW(p.amount)}</span>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          );
        })}
      </div>

      {modal === 'addLoan' && <Modal title="Add Loan" onClose={() => setModal(null)}><AddLoanForm onSubmit={l => { addLoan(l); setModal(null); }} /></Modal>}
      {modal?.type === 'pay' && <Modal title="Record Payment" onClose={() => setModal(null)}><AddPaymentForm onSubmit={p => { addPayment(modal.loanId, p); setModal(null); }} /></Modal>}
    </div>
  );
}

// ── PAGE: RENTALS ──
function RentalsPage({ data, setData }) {
  const [modal, setModal] = useState(false);
  const rentals = data.rentals || [];
  const totalDeposits = rentals.reduce((s, r) => s + Number(r.deposit || 0), 0);
  const totalRent = rentals.reduce((s, r) => s + Number(r.rent || 0), 0);

  function addRental(r) { setData(d => ({ ...d, rentals: [...(d.rentals || []), { id: uid(), ...r }] })); }
  function deleteRental(id) { setData(d => ({ ...d, rentals: (d.rentals || []).filter(r => r.id !== id) })); }

  return (
    <div className="fade-up">
      <div style={{ marginBottom: 28 }}>
        <div style={{ fontSize: 10, letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--accent)', fontFamily: "'JetBrains Mono', monospace", marginBottom: 6 }}>Accounts</div>
        <h1 style={{ fontFamily: "'Syne', sans-serif", fontSize: 30, fontWeight: 800, color: 'var(--text)', letterSpacing: -0.5 }}>Rentals Hold</h1>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16, marginBottom: 24 }}>
        <StatCard label="Deposits Held" value={ZMW(totalDeposits)} icon="building" color="blue" change={`${rentals.length} properties`} changeUp />
        <StatCard label="Monthly Rent" value={ZMW(totalRent)} icon="trending_up" color="green" changeUp change="All properties" />
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
        <BtnPrimary onClick={() => setModal(true)}>+ Add Property</BtnPrimary>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {rentals.length === 0 && <p style={{ color: 'var(--text3)', fontSize: 14 }}>No rental properties yet.</p>}
        {rentals.map(r => (
          <Card key={r.id} style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <div style={{ width: 44, height: 44, borderRadius: 12, background: 'var(--bluebg)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, flexShrink: 0 }}>🏠</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--text)' }}>{r.name}</div>
              <div style={{ fontSize: 11, color: 'var(--text3)', fontFamily: "'JetBrains Mono', monospace" }}>Deposit: {ZMW(r.deposit)} · Rent: {ZMW(r.rent)}/mo · Due: {r.dueDay || 1}st</div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 11, fontWeight: 600, background: 'var(--greenbg)', color: 'var(--green)', padding: '3px 10px', borderRadius: 99 }}>Active</span>
              <button onClick={() => deleteRental(r.id)} style={{ padding: '6px 10px', borderRadius: 8, fontSize: 12, background: 'var(--redbg)', color: 'var(--red)', border: '1px solid var(--red)' }}>✕</button>
            </div>
          </Card>
        ))}
      </div>

      {modal && <Modal title="Add Property" onClose={() => setModal(false)}><AddRentalForm onSubmit={r => { addRental(r); setModal(false); }} /></Modal>}
    </div>
  );
}

// ── PAGE: CRYPTO ──
function CryptoPage({ data, setData }) {
  const [copied, setCopied] = useState(null);
  const cryptoAddresses = data.cryptoAddresses || [
    { coin: 'Bitcoin', symbol: 'BTC', address: 'bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh', icon: '₿', bg: '#F7931A22' },
    { coin: 'Ethereum', symbol: 'ETH', address: '0x71C7656EC7ab88b098defB751B7401B5f6d8976F', icon: 'Ξ', bg: '#627EEA22' },
    { coin: 'USDT (TRC-20)', symbol: 'USDT', address: 'TN3W4T7q5X3kmrFNSqkGvLkMDzSzJ5AaQN', icon: '₮', bg: '#26A17B22' },
  ];

  function copy(addr, symbol) {
    navigator.clipboard.writeText(addr).then(() => { setCopied(symbol); setTimeout(() => setCopied(null), 1500); });
  }

  const holdings = data.cryptoHoldings || [
    { coin: 'Bitcoin', symbol: 'BTC', amount: 0, usdValue: 0, icon: '₿', bg: '#F7931A22', priceChange: '+2.1%', up: true },
    { coin: 'Ethereum', symbol: 'ETH', amount: 0, usdValue: 0, icon: 'Ξ', bg: '#627EEA22', priceChange: '-0.8%', up: false },
    { coin: 'Tether', symbol: 'USDT', amount: 0, usdValue: 0, icon: '₮', bg: '#26A17B22', priceChange: 'Stable', up: true },
  ];

  return (
    <div className="fade-up">
      <div style={{ marginBottom: 28 }}>
        <div style={{ fontSize: 10, letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--accent)', fontFamily: "'JetBrains Mono', monospace", marginBottom: 6 }}>Digital Assets</div>
        <h1 style={{ fontFamily: "'Syne', sans-serif", fontSize: 30, fontWeight: 800, color: 'var(--text)', letterSpacing: -0.5 }}>Cryptocurrency</h1>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 20 }}>
        {/* Holdings */}
        <div>
          <SectionTitle>Holdings</SectionTitle>
          <Card>
            {holdings.map(h => (
              <div key={h.symbol} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 0', borderBottom: '1px solid var(--border)' }}>
                <div style={{ width: 40, height: 40, borderRadius: '50%', background: h.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, flexShrink: 0 }}>{h.icon}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>{h.coin}</div>
                  <div style={{ fontSize: 11, color: 'var(--text3)', fontFamily: "'JetBrains Mono', monospace" }}>{h.symbol}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 14, color: 'var(--text)' }}>{h.amount} {h.symbol}</div>
                  <div style={{ fontSize: 12, color: h.up ? 'var(--green)' : 'var(--red)' }}>{h.priceChange}</div>
                </div>
              </div>
            ))}
          </Card>
        </div>

        {/* Receive Addresses */}
        <div>
          <SectionTitle>Receive Addresses</SectionTitle>
          <Card>
            {cryptoAddresses.map(a => (
              <div key={a.symbol} style={{ marginBottom: 20 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                  <div style={{ width: 28, height: 28, borderRadius: '50%', background: a.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14 }}>{a.icon}</div>
                  <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>{a.coin} ({a.symbol})</span>
                </div>
                <div style={{ background: 'var(--bg3)', border: '1px solid var(--border2)', borderRadius: 10, padding: '10px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
                  <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: 'var(--text2)', wordBreak: 'break-all', flex: 1 }}>{a.address}</span>
                  <button onClick={() => copy(a.address, a.symbol)} style={{ padding: '4px 12px', borderRadius: 6, fontSize: 11, background: copied === a.symbol ? 'var(--greenbg)' : 'var(--accentbg)', color: copied === a.symbol ? 'var(--green)' : 'var(--accent)', border: `1px solid ${copied === a.symbol ? 'var(--green)' : 'var(--accent)'}`, flexShrink: 0, fontFamily: "'JetBrains Mono', monospace" }}>
                    {copied === a.symbol ? 'Copied!' : 'Copy'}
                  </button>
                </div>
              </div>
            ))}
          </Card>
        </div>
      </div>
    </div>
  );
}

// ── PAGE: TRANSACTIONS ──
function TransactionsPage({ data, setData }) {
  const [filter, setFilter] = useState('all');
  const [modal, setModal] = useState(false);
  const transactions = data.transactions || [];

  function addTx(tx) { setData(d => ({ ...d, transactions: [...(d.transactions || []), { id: uid(), ...tx }] })); }
  function deleteTx(id) { setData(d => ({ ...d, transactions: (d.transactions || []).filter(t => t.id !== id) })); }

  const filtered = transactions.filter(t => {
    if (filter === 'credit') return t.type === 'income';
    if (filter === 'debit') return t.type === 'expense';
    return true;
  }).sort((a, b) => new Date(b.date) - new Date(a.date));

  return (
    <div className="fade-up">
      <div style={{ marginBottom: 28 }}>
        <div style={{ fontSize: 10, letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--accent)', fontFamily: "'JetBrains Mono', monospace", marginBottom: 6 }}>Activity</div>
        <h1 style={{ fontFamily: "'Syne', sans-serif", fontSize: 30, fontWeight: 800, color: 'var(--text)', letterSpacing: -0.5 }}>Transactions</h1>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 12 }}>
        <div style={{ display: 'flex', gap: 6, background: 'var(--bg3)', padding: 4, borderRadius: 10, border: '1px solid var(--border)' }}>
          {[['all', 'All'], ['credit', 'Received'], ['debit', 'Sent']].map(([k, l]) => (
            <button key={k} onClick={() => setFilter(k)} style={{ padding: '6px 16px', borderRadius: 7, fontSize: 13, fontWeight: filter === k ? 700 : 500, background: filter === k ? 'var(--accent)' : 'none', color: filter === k ? 'var(--bg)' : 'var(--text2)', border: 'none', transition: 'all 0.15s' }}>{l}</button>
          ))}
        </div>
        <BtnPrimary onClick={() => setModal(true)}>+ Add Transaction</BtnPrimary>
      </div>

      <Card>
        {filtered.length === 0 && <p style={{ color: 'var(--text3)', fontSize: 14 }}>No transactions yet.</p>}
        {filtered.map(t => (
          <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 0', borderBottom: '1px solid var(--border)' }}>
            <div style={{ width: 40, height: 40, borderRadius: 12, background: t.type === 'income' ? 'var(--greenbg)' : 'var(--redbg)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0 }}>
              {t.type === 'income' ? '📲' : '💸'}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.note || t.category}</div>
              <div style={{ fontSize: 11, color: 'var(--text3)', fontFamily: "'JetBrains Mono', monospace" }}>{t.date} · {t.account || t.category}</div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 14, fontWeight: 600, color: t.type === 'income' ? 'var(--green)' : 'var(--red)' }}>
                {t.type === 'income' ? '+' : '-'}{ZMW(t.amount)}
              </span>
              <button onClick={() => deleteTx(t.id)} style={{ background: 'none', border: 'none', color: 'var(--text3)', fontSize: 16, lineHeight: 1 }}>✕</button>
            </div>
          </div>
        ))}
      </Card>

      {modal && <Modal title="Add Transaction" onClose={() => setModal(false)}><AddTxForm onSubmit={tx => { addTx(tx); setModal(false); }} /></Modal>}
    </div>
  );
}

// ── PAGE: SUMMARY ──
function SummaryPage({ data }) {
  const transactions = data.transactions || [];
  const totalIn = transactions.filter(t => t.type === 'income').reduce((s, t) => s + Number(t.amount), 0);
  const totalOut = transactions.filter(t => t.type === 'expense').reduce((s, t) => s + Number(t.amount), 0);
  const net = totalIn - totalOut;

  const byCategory = transactions.reduce((acc, t) => {
    const key = t.category || 'Other';
    if (!acc[key]) acc[key] = { in: 0, out: 0, count: 0 };
    if (t.type === 'income') acc[key].in += Number(t.amount);
    else acc[key].out += Number(t.amount);
    acc[key].count++;
    return acc;
  }, {});

  return (
    <div className="fade-up">
      <div style={{ marginBottom: 28 }}>
        <div style={{ fontSize: 10, letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--accent)', fontFamily: "'JetBrains Mono', monospace", marginBottom: 6 }}>Activity</div>
        <h1 style={{ fontFamily: "'Syne', sans-serif", fontSize: 30, fontWeight: 800, color: 'var(--text)', letterSpacing: -0.5 }}>Summary</h1>
      </div>

      <div style={{ display: 'flex', background: 'var(--bg3)', borderRadius: 12, border: '1px solid var(--border)', overflow: 'hidden', marginBottom: 24, flexWrap: 'wrap' }}>
        {[['Total Received', ZMW(totalIn), 'var(--green)'], ['Total Sent', ZMW(totalOut), 'var(--red)'], ['Net Flow', ZMW(net), net >= 0 ? 'var(--green)' : 'var(--red)'], ['Transactions', transactions.length, 'var(--text)']].map(([l, v, c]) => (
          <div key={l} style={{ flex: 1, minWidth: 130, padding: '16px 20px', borderRight: '1px solid var(--border)' }}>
            <div style={{ fontSize: 10, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.1em', fontFamily: "'JetBrains Mono', monospace" }}>{l}</div>
            <div style={{ fontFamily: "'Syne', sans-serif", fontSize: 20, fontWeight: 700, color: c, marginTop: 4 }}>{v}</div>
          </div>
        ))}
      </div>

      <SectionTitle>By Category</SectionTitle>
      <Card>
        {Object.keys(byCategory).length === 0 && <p style={{ color: 'var(--text3)', fontSize: 14 }}>No transactions yet.</p>}
        {Object.entries(byCategory).map(([cat, vals]) => (
          <div key={cat} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 0', borderBottom: '1px solid var(--border)' }}>
            <div style={{ width: 40, height: 40, borderRadius: 12, background: 'var(--accentbg)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>📊</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--text)' }}>{cat}</div>
              <div style={{ fontSize: 11, color: 'var(--text3)', fontFamily: "'JetBrains Mono', monospace" }}>{vals.count} transaction{vals.count !== 1 ? 's' : ''}</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              {vals.in > 0 && <div style={{ fontSize: 13, color: 'var(--green)', fontFamily: "'JetBrains Mono', monospace" }}>+{ZMW(vals.in)}</div>}
              {vals.out > 0 && <div style={{ fontSize: 13, color: 'var(--red)', fontFamily: "'JetBrains Mono', monospace" }}>-{ZMW(vals.out)}</div>}
            </div>
          </div>
        ))}
      </Card>
    </div>
  );
}

// ── PAGE: PROFILE ──
function ProfilePage({ book, session }) {
  const [name, setName] = useState(book?.profile_name || '');
  const [saved, setSaved] = useState(false);

  async function save() {
    await supabase.from('books').update({ profile_name: name, updated_at: new Date().toISOString() }).eq('id', book.id);
    setSaved(true); setTimeout(() => setSaved(false), 1500);
  }

  const verifications = [
    { label: 'Email', status: session?.user?.email_confirmed_at ? 'done' : 'pending', value: session?.user?.email },
    { label: 'Phone', status: session?.user?.phone ? 'done' : 'none', value: session?.user?.phone || 'Not added' },
    { label: 'NRC / National ID', status: 'pending', value: 'Pending review' },
    { label: 'Biometric', status: 'none', value: 'Not set up' },
  ];

  const statusStyle = { done: { bg: 'var(--greenbg)', color: 'var(--green)', label: '✓ Verified' }, pending: { bg: 'var(--accentbg)', color: 'var(--accent)', label: '⟳ Pending' }, none: { bg: 'var(--redbg)', color: 'var(--red)', label: '✕ Not set' } };

  return (
    <div className="fade-up">
      <div style={{ marginBottom: 28 }}>
        <div style={{ fontSize: 10, letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--accent)', fontFamily: "'JetBrains Mono', monospace", marginBottom: 6 }}>Account</div>
        <h1 style={{ fontFamily: "'Syne', sans-serif", fontSize: 30, fontWeight: 800, color: 'var(--text)', letterSpacing: -0.5 }}>Profile & Security</h1>
      </div>

      {/* Profile Hero */}
      <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 20, padding: 28, display: 'flex', alignItems: 'center', gap: 24, marginBottom: 24, flexWrap: 'wrap' }}>
        <div style={{ width: 72, height: 72, borderRadius: '50%', background: 'linear-gradient(135deg, var(--accent), var(--purple))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Syne', sans-serif", fontSize: 28, fontWeight: 800, color: '#fff', flexShrink: 0 }}>
          {(name || 'W').charAt(0).toUpperCase()}
        </div>
        <div>
          <div style={{ fontFamily: "'Syne', sans-serif", fontSize: 22, fontWeight: 800, color: 'var(--text)' }}>{name || 'W. Caymans'}</div>
          <div style={{ color: 'var(--text3)', fontSize: 12, fontFamily: "'JetBrains Mono', monospace", marginTop: 4 }}>W Caymans · {session?.user?.email}</div>
          <div style={{ display: 'flex', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
            {verifications.map(v => (
              <span key={v.label} style={{ fontSize: 10, fontWeight: 600, background: statusStyle[v.status].bg, color: statusStyle[v.status].color, padding: '3px 10px', borderRadius: 99, fontFamily: "'JetBrains Mono', monospace" }}>{statusStyle[v.status].label} {v.label}</span>
            ))}
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 20 }}>
        <div>
          <SectionTitle>Personal Information</SectionTitle>
          <Card>
            <FieldInput label="Display Name" value={name} onChange={e => setName(e.target.value)} placeholder="Your name" />
            <FieldInput label="Email Address" value={session?.user?.email || ''} readOnly style={{ opacity: 0.7 }} />
            <FieldInput label="Phone Number" value={session?.user?.phone || ''} placeholder="+260 9XX XXX XXX" readOnly style={{ opacity: 0.7 }} />
            <BtnPrimary onClick={save} style={{ marginTop: 4 }}>{saved ? '✓ Saved' : 'Save Changes'}</BtnPrimary>
          </Card>
        </div>

        <div>
          <SectionTitle>Verification</SectionTitle>
          <Card>
            {verifications.map(v => (
              <div key={v.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0', borderBottom: '1px solid var(--border)' }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)' }}>{v.label}</div>
                  <div style={{ fontSize: 11, color: 'var(--text3)', fontFamily: "'JetBrains Mono', monospace' " }}>{v.value}</div>
                </div>
                <span style={{ fontSize: 10, fontWeight: 600, background: statusStyle[v.status].bg, color: statusStyle[v.status].color, padding: '3px 10px', borderRadius: 99, fontFamily: "'JetBrains Mono', monospace", whiteSpace: 'nowrap' }}>{statusStyle[v.status].label}</span>
              </div>
            ))}
          </Card>

          <div style={{ marginTop: 20 }}>
            <SectionTitle>Security</SectionTitle>
            <Card>
              <FieldInput label="New Password" type="password" placeholder="Min. 8 characters" />
              <FieldInput label="Confirm Password" type="password" placeholder="Repeat password" />
              <BtnPrimary style={{ marginTop: 4 }}>Update Password</BtnPrimary>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── FORMS ──
const EXPENSE_CATS = ['Stock', 'Rent', 'Transport', 'Utilities', 'Wages', 'Marketing', 'Equipment', 'Loan Repayment', 'Other'];
const INCOME_CATS = ['Sales', 'Services', 'Repairs', 'Commission', 'Rental Income', 'Mobile Money', 'Other'];

function AddTxForm({ onSubmit, defaultType = 'income', accountId }) {
  const [type, setType] = useState(defaultType);
  const [date, setDate] = useState(todayISO());
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState(INCOME_CATS[0]);
  const [note, setNote] = useState('');
  const cats = type === 'income' ? INCOME_CATS : EXPENSE_CATS;
  return (
    <form onSubmit={e => { e.preventDefault(); if (!amount || Number(amount) <= 0) return; onSubmit({ type, date, amount: Number(amount), category, note, account: accountId }); }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 16 }}>
        {['income', 'expense'].map(t => (
          <button key={t} type="button" onClick={() => { setType(t); setCategory(t === 'income' ? INCOME_CATS[0] : EXPENSE_CATS[0]); }} style={{ padding: '9px', borderRadius: 9, fontSize: 13, fontWeight: 600, border: `1px solid ${type === t ? 'var(--accent)' : 'var(--border2)'}`, background: type === t ? 'var(--accent)' : 'var(--bg3)', color: type === t ? 'var(--bg)' : 'var(--text2)' }}>
            {t === 'income' ? '+ Received' : '- Sent'}
          </button>
        ))}
      </div>
      <FieldInput label="Date" type="date" value={date} onChange={e => setDate(e.target.value)} />
      <FieldInput label="Amount (ZMW)" type="number" min="0" step="0.01" value={amount} onChange={e => setAmount(e.target.value)} placeholder="0.00" />
      <label style={{ display: 'block', marginBottom: 16 }}>
        <div style={{ fontSize: 10, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.12em', fontFamily: "'JetBrains Mono', monospace", marginBottom: 6 }}>Category</div>
        <select value={category} onChange={e => setCategory(e.target.value)} style={{ width: '100%', background: 'var(--bg3)', border: '1px solid var(--border2)', borderRadius: 10, padding: '10px 14px', color: 'var(--text)', fontSize: 14, outline: 'none' }}>
          {cats.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
      </label>
      <FieldInput label="Note (optional)" value={note} onChange={e => setNote(e.target.value)} placeholder="e.g. Airtel top-up from client" />
      <BtnPrimary style={{ width: '100%', marginTop: 4 }}>Save Transaction</BtnPrimary>
    </form>
  );
}

function AddAccountForm({ onSubmit }) {
  const [name, setName] = useState('');
  const [type, setType] = useState('mobile');
  const [balance, setBalance] = useState('');
  return (
    <form onSubmit={e => { e.preventDefault(); if (!name.trim()) return; onSubmit({ name: name.trim(), type, balance: Number(balance) || 0 }); }}>
      <FieldInput label="Account Name" value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Airtel Money" autoFocus />
      <label style={{ display: 'block', marginBottom: 16 }}>
        <div style={{ fontSize: 10, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.12em', fontFamily: "'JetBrains Mono', monospace", marginBottom: 6 }}>Type</div>
        <select value={type} onChange={e => setType(e.target.value)} style={{ width: '100%', background: 'var(--bg3)', border: '1px solid var(--border2)', borderRadius: 10, padding: '10px 14px', color: 'var(--text)', fontSize: 14, outline: 'none' }}>
          <option value="mobile">Mobile Money</option>
          <option value="visa">Visa / Debit Card</option>
          <option value="bank">Bank Account</option>
        </select>
      </label>
      <FieldInput label="Current Balance (ZMW)" type="number" min="0" step="0.01" value={balance} onChange={e => setBalance(e.target.value)} placeholder="0.00" />
      <BtnPrimary style={{ width: '100%' }}>Add Account</BtnPrimary>
    </form>
  );
}

function AddGoalForm({ onSubmit }) {
  const [name, setName] = useState('');
  const [target, setTarget] = useState('');
  const [saved, setSaved] = useState('');
  return (
    <form onSubmit={e => { e.preventDefault(); if (!name.trim() || !target) return; onSubmit({ name: name.trim(), target: Number(target), saved: Number(saved) || 0 }); }}>
      <FieldInput label="Goal Name" value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Emergency Fund" autoFocus />
      <FieldInput label="Target Amount (ZMW)" type="number" min="0" step="0.01" value={target} onChange={e => setTarget(e.target.value)} placeholder="0.00" />
      <FieldInput label="Already Saved (ZMW)" type="number" min="0" step="0.01" value={saved} onChange={e => setSaved(e.target.value)} placeholder="0.00" />
      <BtnPrimary style={{ width: '100%' }}>Create Goal</BtnPrimary>
    </form>
  );
}

function AddLoanForm({ onSubmit }) {
  const [lender, setLender] = useState('');
  const [principal, setPrincipal] = useState('');
  const [rate, setRate] = useState('');
  const [startDate, setStartDate] = useState(todayISO());
  const [termMonths, setTermMonths] = useState('');
  return (
    <form onSubmit={e => { e.preventDefault(); if (!lender.trim() || !principal) return; onSubmit({ lender: lender.trim(), principal: Number(principal), rate: Number(rate) || 0, startDate, termMonths: Number(termMonths) || 0 }); }}>
      <FieldInput label="Lender" value={lender} onChange={e => setLender(e.target.value)} placeholder="e.g. Zanaco Bank" autoFocus />
      <FieldInput label="Principal (ZMW)" type="number" min="0" step="0.01" value={principal} onChange={e => setPrincipal(e.target.value)} placeholder="0.00" />
      <FieldInput label="Annual Interest Rate (%)" type="number" min="0" step="0.01" value={rate} onChange={e => setRate(e.target.value)} placeholder="18" />
      <FieldInput label="Start Date" type="date" value={startDate} onChange={e => setStartDate(e.target.value)} />
      <FieldInput label="Term (months)" type="number" min="0" value={termMonths} onChange={e => setTermMonths(e.target.value)} placeholder="24" />
      <BtnPrimary style={{ width: '100%' }}>Add Loan</BtnPrimary>
    </form>
  );
}

function AddPaymentForm({ onSubmit }) {
  const [date, setDate] = useState(todayISO());
  const [amount, setAmount] = useState('');
  return (
    <form onSubmit={e => { e.preventDefault(); if (!amount || Number(amount) <= 0) return; onSubmit({ date, amount: Number(amount) }); }}>
      <FieldInput label="Payment Date" type="date" value={date} onChange={e => setDate(e.target.value)} />
      <FieldInput label="Amount (ZMW)" type="number" min="0" step="0.01" value={amount} onChange={e => setAmount(e.target.value)} placeholder="0.00" autoFocus />
      <BtnPrimary style={{ width: '100%' }}>Record Payment</BtnPrimary>
    </form>
  );
}

function AddRentalForm({ onSubmit }) {
  const [name, setName] = useState('');
  const [deposit, setDeposit] = useState('');
  const [rent, setRent] = useState('');
  const [dueDay, setDueDay] = useState('1');
  return (
    <form onSubmit={e => { e.preventDefault(); if (!name.trim()) return; onSubmit({ name: name.trim(), deposit: Number(deposit) || 0, rent: Number(rent) || 0, dueDay: Number(dueDay) || 1 }); }}>
      <FieldInput label="Property Name" value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Apt 4B — Lusaka West" autoFocus />
      <FieldInput label="Security Deposit (ZMW)" type="number" min="0" step="0.01" value={deposit} onChange={e => setDeposit(e.target.value)} placeholder="0.00" />
      <FieldInput label="Monthly Rent (ZMW)" type="number" min="0" step="0.01" value={rent} onChange={e => setRent(e.target.value)} placeholder="0.00" />
      <FieldInput label="Due Day of Month" type="number" min="1" max="31" value={dueDay} onChange={e => setDueDay(e.target.value)} placeholder="1" />
      <BtnPrimary style={{ width: '100%' }}>Add Property</BtnPrimary>
    </form>
  );
}

// ── SIDEBAR COMPONENT ──
function Sidebar({ isOpen, activePage, onNavigate }) {
  const sections = [...new Set(PAGES.map(p => p.section))];
  return (
    <aside style={{
      position: 'fixed', left: 0, top: 0, bottom: 0, width: 260,
      background: 'var(--bg2)', borderRight: '1px solid var(--border)',
      display: 'flex', flexDirection: 'column', zIndex: 100,
      transform: isOpen ? 'translateX(0)' : 'translateX(-260px)',
      transition: 'transform 0.35s cubic-bezier(.4,0,.2,1)',
      overflowY: 'auto',
    }}>
      {/* Logo */}
      <div style={{ padding: '28px 24px 20px', borderBottom: '1px solid var(--border)' }}>
        <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: 22, letterSpacing: -0.5, color: 'var(--text)' }}>
          W <span style={{ color: 'var(--accent)' }}>Caymans</span>
        </div>
        <div style={{ fontSize: 10, letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--text3)', marginTop: 4, fontFamily: "'JetBrains Mono', monospace" }}>Private Finance Hub</div>
      </div>

      {/* Nav */}
      <div style={{ flex: 1, padding: '12px 12px' }}>
        {sections.map(section => (
          <div key={section} style={{ marginBottom: 4 }}>
            <div style={{ fontSize: 9, letterSpacing: '0.15em', textTransform: 'uppercase', color: 'var(--text3)', padding: '8px 12px 4px', fontFamily: "'JetBrains Mono', monospace" }}>{section}</div>
            {PAGES.filter(p => p.section === section).map(p => (
              <button key={p.id} onClick={() => onNavigate(p.id)} style={{
                display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px',
                borderRadius: 10, cursor: 'pointer', width: '100%', textAlign: 'left',
                fontSize: 14, fontWeight: 500, border: 'none',
                background: activePage === p.id ? 'var(--accentbg)' : 'none',
                color: activePage === p.id ? 'var(--accent)' : 'var(--text2)',
                transition: 'all 0.15s',
              }}>
                <Icon d={Icons[p.icon]} size={16} color={activePage === p.id ? 'var(--accent)' : 'var(--text3)'} />
                {p.label}
                {p.id === 'rentals' && <span style={{ marginLeft: 'auto', background: 'var(--accent)', color: 'var(--bg)', fontSize: 10, fontWeight: 700, padding: '1px 7px', borderRadius: 99 }}>NEW</span>}
              </button>
            ))}
          </div>
        ))}
      </div>

      {/* User chip */}
      <div style={{ padding: '16px 12px', borderTop: '1px solid var(--border)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 10, background: 'var(--bg3)' }}>
          <div style={{ width: 34, height: 34, borderRadius: '50%', background: 'linear-gradient(135deg, var(--accent), var(--purple))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, color: '#fff', flexShrink: 0 }}>W</div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>W. Caymans</div>
            <div style={{ fontSize: 11, color: 'var(--green)' }}>✓ Verified</div>
          </div>
        </div>
      </div>
    </aside>
  );
}

// ── MAIN APP ──
export default function App() {
  const [session, setSession] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [book, setBook] = useState(null);
  const [bookLoading, setBookLoading] = useState(true);
  const [onboardingStep, setOnboardingStep] = useState(null);
  const [savingProfile, setSavingProfile] = useState(false);

  const [data, setData] = useState(emptyData);
  const [saveStatus, setSaveStatus] = useState('idle');
  const [activePage, setActivePage] = useState('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(window.innerWidth > 768);
  const { dark, toggle: toggleTheme } = useTheme();

  const saveTimeout = useRef(null);
  const initialLoad = useRef(true);

  const t = getTokens(dark);

  // Inject CSS variables
  useEffect(() => {
    const root = document.documentElement;
    Object.entries(t).forEach(([k, v]) => root.style.setProperty('--' + k.replace(/([A-Z])/g, '-$1').toLowerCase(), v));
    root.style.setProperty('--card', t.bg2);
    root.style.setProperty('--accentbg', t.accentbg);
    root.style.setProperty('--greenbg', t.greenbg);
    root.style.setProperty('--redbg', t.redbg);
    root.style.setProperty('--bluebg', t.bluebg);
    root.style.setProperty('--purplebg', t.purplebg);
    root.style.setProperty('--border', t.border);
    root.style.setProperty('--border2', t.border2);
    root.style.setProperty('--bg', t.bg);
    root.style.setProperty('--bg2', t.bg2);
    root.style.setProperty('--bg3', t.bg3);
    root.style.setProperty('--text', t.text);
    root.style.setProperty('--text2', t.text2);
    root.style.setProperty('--text3', t.text3);
    root.style.setProperty('--accent', t.accent);
    root.style.setProperty('--green', t.green);
    root.style.setProperty('--red', t.red);
    root.style.setProperty('--blue', t.blue);
    root.style.setProperty('--purple', t.purple);
    document.body.style.background = t.bg;
    document.body.style.color = t.text;
  }, [dark]);

  // Responsive sidebar
  useEffect(() => {
    const handler = () => setSidebarOpen(window.innerWidth > 768);
    window.addEventListener('resize', handler);
    return () => window.removeEventListener('resize', handler);
  }, []);

  // Auth
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => { setSession(session); setAuthLoading(false); });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, s) => {
      setSession(s); setAuthLoading(false);
      if (!s) { setBook(null); setBookLoading(true); setOnboardingStep(null); setData(emptyData); initialLoad.current = true; }
    });
    return () => subscription.unsubscribe();
  }, []);

  // Load book
  useEffect(() => {
    if (!session) return;
    let active = true;
    async function load() {
      setBookLoading(true);
      const { data: d, error } = await supabase.from('books').select('*').eq('user_id', session.user.id).maybeSingle();
      if (!active) return;
      if (error) { setBookLoading(false); return; }
      if (!d) {
        const { data: created, error: ce } = await supabase.from('books').insert({ user_id: session.user.id, data: emptyData, onboarding_complete: false }).select().single();
        if (!active || ce) { setBookLoading(false); return; }
        setBook(created); setData(created.data || emptyData); setOnboardingStep('welcome'); setBookLoading(false); initialLoad.current = true; return;
      }
      setBook(d); setData(d.data || emptyData); setOnboardingStep(d.onboarding_complete ? null : 'welcome'); setBookLoading(false); initialLoad.current = true;
    }
    load();
    return () => { active = false; };
  }, [session]);

  // Auto-save
  useEffect(() => {
    if (!book || bookLoading || onboardingStep) return;
    if (initialLoad.current) { initialLoad.current = false; return; }
    setSaveStatus('saving');
    if (saveTimeout.current) clearTimeout(saveTimeout.current);
    saveTimeout.current = setTimeout(async () => {
      const { error } = await supabase.from('books').update({ data, updated_at: new Date().toISOString() }).eq('id', book.id);
      setSaveStatus(error ? 'error' : 'saved');
      if (!error) setTimeout(() => setSaveStatus('idle'), 1500);
    }, 700);
    return () => { if (saveTimeout.current) clearTimeout(saveTimeout.current); };
  }, [data]);

  async function completeProfile(name) {
    setSavingProfile(true);
    const { error } = await supabase.from('books').update({ profile_name: name, onboarding_complete: true, updated_at: new Date().toISOString() }).eq('id', book.id);
    setSavingProfile(false);
    if (!error) { setBook(b => ({ ...b, profile_name: name, onboarding_complete: true })); setOnboardingStep(null); initialLoad.current = true; }
  }

  function navigate(pageId) { setActivePage(pageId); if (window.innerWidth <= 768) setSidebarOpen(false); window.scrollTo(0, 0); }

  const pageTitle = PAGES.find(p => p.id === activePage)?.label || 'Dashboard';

  if (authLoading || bookLoading) return (
    <div style={{ minHeight: '100vh', background: t.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', color: t.text2, fontFamily: "'JetBrains Mono', monospace", fontSize: 14 }}>
      <GlobalStyles t={t} />
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 32, marginBottom: 16 }}>W</div>
        <div>Loading W Caymans…</div>
      </div>
    </div>
  );

  if (!session) return <><GlobalStyles t={t} /><Auth onAuthSuccess={s => setSession(s)} /></>;
  if (onboardingStep === 'welcome') return <><GlobalStyles t={t} /><Welcome onContinue={() => setOnboardingStep('setup')} /></>;
  if (onboardingStep === 'setup') return <><GlobalStyles t={t} /><ProfileSetup onSubmit={completeProfile} saving={savingProfile} /></>;

  const sidebarW = 260;
  const isDesktop = window.innerWidth > 768;

  return (
    <>
      <GlobalStyles t={t} />

      {/* Mobile overlay */}
      {!isDesktop && sidebarOpen && (
        <div onClick={() => setSidebarOpen(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 99 }} />
      )}

      <Sidebar isOpen={sidebarOpen} activePage={activePage} onNavigate={navigate} />

      {/* Topbar */}
      <header style={{
        position: 'fixed', top: 0, right: 0, left: isDesktop && sidebarOpen ? sidebarW : 0,
        height: 64, background: t.bg, borderBottom: `1px solid ${t.border}`,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 24px', zIndex: 90, transition: 'left 0.35s cubic-bezier(.4,0,.2,1)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <button onClick={() => setSidebarOpen(o => !o)} style={{ background: 'none', border: 'none', color: t.text2, cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: 5, padding: 6 }}>
            {[0,1,2].map(i => <span key={i} style={{ display: 'block', width: 22, height: 2, background: t.text2, borderRadius: 2 }} />)}
          </button>
          <span style={{ fontFamily: "'Syne', sans-serif", fontSize: 17, fontWeight: 700, color: t.text }}>{pageTitle}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ fontSize: 11, color: t.text3, fontFamily: "'JetBrains Mono', monospace" }}>
            {saveStatus === 'saving' && 'saving…'}{saveStatus === 'saved' && '✓ saved'}{saveStatus === 'error' && <span style={{ color: t.red }}>save failed</span>}
          </div>
          <button onClick={toggleTheme} style={{ background: t.bg3, border: `1px solid ${t.border2}`, borderRadius: 99, padding: '6px 14px', cursor: 'pointer', fontSize: 13, color: t.text2, display: 'flex', alignItems: 'center', gap: 6 }}>
            {dark ? '☀️ Light' : '🌙 Dark'}
          </button>
          <button onClick={() => supabase.auth.signOut()} style={{ background: t.bg3, border: `1px solid ${t.border}`, borderRadius: '50%', width: 38, height: 38, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: t.text2 }}>
            <Icon d={Icons.logout} size={16} />
          </button>
        </div>
      </header>

      {/* Main content */}
      <main style={{
        marginLeft: isDesktop && sidebarOpen ? sidebarW : 0,
        marginTop: 64,
        padding: '32px 28px',
        minHeight: 'calc(100vh - 64px)',
        transition: 'margin-left 0.35s cubic-bezier(.4,0,.2,1)',
        maxWidth: isDesktop && sidebarOpen ? `calc(100vw - ${sidebarW}px)` : '100vw',
      }}>
        {activePage === 'dashboard' && <Dashboard data={data} onNavigate={navigate} />}
        {activePage === 'accounts' && <AccountsPage data={data} setData={setData} />}
        {activePage === 'savings' && <SavingsPage data={data} setData={setData} />}
        {activePage === 'loans' && <LoansPage data={data} setData={setData} />}
        {activePage === 'rentals' && <RentalsPage data={data} setData={setData} />}
        {activePage === 'crypto' && <CryptoPage data={data} setData={setData} />}
        {activePage === 'transactions' && <TransactionsPage data={data} setData={setData} />}
        {activePage === 'summary' && <SummaryPage data={data} />}
        {activePage === 'profile' && <ProfilePage book={book} session={session} />}
      </main>
    </>
  );
}
