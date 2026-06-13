Now the big one — src/App.jsx. Edit in place: open the file, “…” → Edit file → In place, select ALL existing content, delete it completely, then paste the full content below.
This is long, so take your time copying. Make sure the code block has fully loaded on your screen before selecting/copying — scroll to the very bottom of this message first to let it render, then scroll back up and copy from the top.
Path (existing file): src/App.jsx
New content:

import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { Plus, Trash2, TrendingUp, TrendingDown, Wallet, Building2, Landmark, X, ChevronRight, LogOut, Check, Loader2 } from 'lucide-react';
import { supabase } from './supabaseClient';
import Auth from './Auth';
import { Welcome, ProfileSetup } from './Onboarding';

const ZMW = (n) => 'K' + Number(n || 0).toLocaleString('en-ZM', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const todayISO = () => new Date().toISOString().slice(0, 10);
const uid = () => Math.random().toString(36).slice(2, 10);

const EXPENSE_CATEGORIES = ['Stock', 'Rent', 'Transport', 'Utilities', 'Wages', 'Marketing', 'Equipment', 'Parts', 'Other'];
const INCOME_CATEGORIES = ['Sales', 'Services', 'Repairs', 'Commission', 'Other'];

const emptyData = { businesses: [], loans: [] };

function calcLoanStats(loan) {
  const totalPaid = loan.payments.reduce((s, p) => s + Number(p.amount), 0);
  const monthlyRate = loan.rate / 100 / 12;
  let balance = loan.principal;
  let totalInterest = 0;
  const sortedPayments = [...loan.payments].sort((a, b) => new Date(a.date) - new Date(b.date));
  for (const p of sortedPayments) {
    const interestPortion = balance * monthlyRate;
    totalInterest += interestPortion;
    balance = balance + interestPortion - Number(p.amount);
    if (balance < 0) balance = 0;
  }
  return { totalPaid, remaining: balance, totalInterest };
}

function Modal({ title, onClose, children }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-stone-900/40 backdrop-blur-sm" onClick={onClose}>
      <div
        className="bg-stone-50 w-full sm:max-w-md sm:rounded-2xl rounded-t-2xl shadow-2xl max-h-[85vh] overflow-y-auto border border-stone-200"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-stone-200 sticky top-0 bg-stone-50">
          <h3 className="font-serif text-lg text-stone-800">{title}</h3>
          <button onClick={onClose} className="p-1 rounded-full hover:bg-stone-200 text-stone-500">
            <X size={18} />
          </button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <label className="block mb-3">
      <span className="text-xs uppercase tracking-wide text-stone-500 font-medium">{label}</span>
      <div className="mt-1">{children}</div>
    </label>
  );
}

const inputCls = "w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-stone-800 focus:outline-none focus:ring-2 focus:ring-amber-700/40 focus:border-amber-700";

export default function App() {
  const [session, setSession] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);

  const [book, setBook] = useState(null);
  const [bookLoading, setBookLoading] = useState(true);
  const [onboardingStep, setOnboardingStep] = useState(null);
  const [savingProfile, setSavingProfile] = useState(false);

  const [businesses, setBusinesses] = useState([]);
  const [loans, setLoans] = useState([]);
  const [saveStatus, setSaveStatus] = useState('idle');

  const [view, setView] = useState('dashboard');
  const [activeBusinessId, setActiveBusinessId] = useState(null);
  const [modal, setModal] = useState(null);

  const saveTimeout = useRef(null);
  const initialLoad = useRef(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setAuthLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setAuthLoading(false);
      if (!session) {
        setBook(null);
        setBookLoading(true);
        setOnboardingStep(null);
        setBusinesses([]);
        setLoans([]);
        initialLoad.current = true;
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!session) return;
    let active = true;

    async function loadBook() {
      setBookLoading(true);
      const { data, error } = await supabase
        .from('books')
        .select('*')
        .eq('user_id', session.user.id)
        .maybeSingle();

      if (!active) return;

      if (error) {
        setBookLoading(false);
        return;
      }

      if (!data) {
        const { data: created, error: createError } = await supabase
          .from('books')
          .insert({ user_id: session.user.id, data: emptyData, onboarding_complete: false })
          .select()
          .single();

        if (!active) return;

        if (createError) {
          setBookLoading(false);
          return;
        }

        setBook(created);
        setBusinesses(created.data?.businesses || []);
        setLoans(created.data?.loans || []);
        setOnboardingStep('welcome');
        setBookLoading(false);
        initialLoad.current = true;
        return;
      }

      setBook(data);
      setBusinesses(data.data?.businesses || []);
      setLoans(data.data?.loans || []);
      setOnboardingStep(data.onboarding_complete ? null : 'welcome');
      setBookLoading(false);
      initialLoad.current = true;
    }

    loadBook();
    return () => { active = false; };
  }, [session]);

  useEffect(() => {
    if (!book || bookLoading || onboardingStep) return;
    if (initialLoad.current) {
      initialLoad.current = false;
      return;
    }
    setSaveStatus('saving');
    if (saveTimeout.current) clearTimeout(saveTimeout.current);
    saveTimeout.current = setTimeout(async () => {
      const { error } = await supabase
        .from('books')
        .update({ data: { businesses, loans }, updated_at: new Date().toISOString() })
        .eq('id', book.id);
      setSaveStatus(error ? 'error' : 'saved');
      if (!error) setTimeout(() => setSaveStatus('idle'), 1500);
    }, 600);
    return () => { if (saveTimeout.current) clearTimeout(saveTimeout.current); };
  }, [businesses, loans]);

  async function completeProfileSetup(name) {
    setSavingProfile(true);
    const { error } = await supabase
      .from('books')
      .update({ profile_name: name, onboarding_complete: true, updated_at: new Date().toISOString() })
      .eq('id', book.id);
    setSavingProfile(false);
    if (!error) {
      setBook((b) => ({ ...b, profile_name: name, onboarding_complete: true }));
      setOnboardingStep(null);
      initialLoad.current = true;
    }
  }

  async function handleLogout() {
    await supabase.auth.signOut();
  }

  const businessTotals = useMemo(() => {
    return businesses.map((b) => {
      const income = b.transactions.filter((t) => t.type === 'income').reduce((s, t) => s + Number(t.amount), 0);
      const expense = b.transactions.filter((t) => t.type === 'expense').reduce((s, t) => s + Number(t.amount), 0);
      return { ...b, income, expense, net: income - expense };
    });
  }, [businesses]);

  const grandTotals = useMemo(() => {
    const income = businessTotals.reduce((s, b) => s + b.income, 0);
    const expense = businessTotals.reduce((s, b) => s + b.expense, 0);
    const loanBalance = loans.reduce((s, l) => s + calcLoanStats(l).remaining, 0);
    return { income, expense, net: income - expense, loanBalance };
  }, [businessTotals, loans]);

  const activeBusiness = businessTotals.find((b) => b.id === activeBusinessId);

  const addBusiness = useCallback((name, category) => {
    setBusinesses((bs) => [...bs, { id: uid(), name, category, transactions: [] }]);
  }, []);

  const deleteBusiness = useCallback((id) => {
    setBusinesses((bs) => bs.filter((b) => b.id !== id));
    setActiveBusinessId((cur) => (cur === id ? null : cur));
  }, []);

  const addTransaction = useCallback((businessId, tx) => {
    setBusinesses((bs) =>
      bs.map((b) => (b.id === businessId ? { ...b, transactions: [...b.transactions, { id: uid(), ...tx }] } : b))
    );
  }, []);

  const deleteTransaction = useCallback((businessId, txId) => {
    setBusinesses((bs) =>
      bs.map((b) =>
        b.id === businessId ? { ...b, transactions: b.transactions.filter((t) => t.id !== txId) } : b
      )
    );
  }, []);

  const addLoan = useCallback((loan) => {
    setLoans((ls) => [...ls, { id: uid(), payments: [], ...loan }]);
  }, []);

  const deleteLoan = useCallback((id) => {
    setLoans((ls) => ls.filter((l) => l.id !== id));
  }, []);

  const addPayment = useCallback((loanId, payment) => {
    setLoans((ls) =>
      ls.map((l) => (l.id === loanId ? { ...l, payments: [...l.payments, { id: uid(), ...payment }] } : l))
    );
  }, []);

  const deletePayment = useCallback((loanId, paymentId) => {
    setLoans((ls) =>
      ls.map((l) => (l.id === loanId ? { ...l, payments: l.payments.filter((p) => p.id !== paymentId) } : l))
    );
  }, []);

  if (authLoading) {
    return (
      <div className="min-h-screen bg-stone-100 flex items-center justify-center text-stone-500">
        <Loader2 className="animate-spin mr-2" size={20} /> Loading…
      </div>
    );
  }

  if (!session) {
    return <Auth onAuthSuccess={(s) => setSession(s)} />;
  }

  if (bookLoading) {
    return (
      <div className="min-h-screen bg-stone-100 flex items-center justify-center text-stone-500">
        <Loader2 className="animate-spin mr-2" size={20} /> Loading your ledger…
      </div>
    );
  }

  if (onboardingStep === 'welcome') {
    return <Welcome onContinue={() => setOnboardingStep('setup')} />;
  }

  if (onboardingStep === 'setup') {
    return <ProfileSetup onSubmit={completeProfileSetup} saving={savingProfile} />;
  }

  return (
    <div className="min-h-screen bg-stone-100 text-stone-800" style={{ fontFamily: "'Inter', system-ui, sans-serif" }}>
      <style>{`.font-serif { font-family: 'Fraunces', serif; } .font-mono { font-family: 'JetBrains Mono', monospace; }`}</style>

      <header className="bg-stone-900 text-stone-100 sticky top-0 z-30 shadow-md">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between gap-3">
          <div>
            <h1 className="font-serif text-2xl tracking-tight">Ledger & Lots</h1>
            <p className="text-stone-400 text-xs font-mono mt-0.5">
              {book?.profile_name ? book.profile_name : 'your businesses, your loans, one page'}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex gap-1 bg-stone-800 rounded-full p-1">
              {[
                { key: 'dashboard', label: 'Overview' },
                { key: 'business', label: 'Businesses' },
                { key: 'loans', label: 'Loans' },
              ].map((t) => (
                <button
                  key={t.key}
                  onClick={() => {
                    setView(t.key);
                    if (t.key !== 'business') setActiveBusinessId(null);
                  }}
                  className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                    view === t.key ? 'bg-amber-700 text-white' : 'text-stone-300 hover:text-white'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
            <button onClick={handleLogout} title="Log out" className="p-2 rounded-full bg-stone-800 text-stone-300 hover:text-white">
              <LogOut size={16} />
            </button>
          </div>
        </div>
        <div className="max-w-5xl mx-auto px-4 pb-2 -mt-1 text-xs text-stone-500 font-mono flex justify-end h-4">
          {saveStatus === 'saving' && 'saving…'}
          {saveStatus === 'saved' && 'saved'}
          {saveStatus === 'error' && <span className="text-rose-400">save failed — check connection</span>}
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-6 pb-24">
        {view === 'dashboard' && (
          <Dashboard
            grandTotals={grandTotals}
            businessTotals={businessTotals}
            loans={loans}
            onOpenBusiness={(id) => {
              setActiveBusinessId(id);
              setView('business');
            }}
            onGoLoans={() => setView('loans')}
          />
        )}

        {view === 'business' && !activeBusinessId && (
          <BusinessList
            businesses={businessTotals}
            onOpen={(id) => setActiveBusinessId(id)}
            onAdd={() => setModal({ type: 'addBusiness' })}
            onDelete={deleteBusiness}
          />
        )}

        {view === 'business' && activeBusiness && (
          <BusinessDetail
            business={activeBusiness}
            onBack={() => setActiveBusinessId(null)}
            onAddTransaction={() => setModal({ type: 'addTransaction', businessId: activeBusiness.id })}
            onDeleteTransaction={(txId) => deleteTransaction(activeBusiness.id, txId)}
            onDeleteBusiness={() => deleteBusiness(activeBusiness.id)}
          />
        )}

        {view === 'loans' && (
          <LoansView
            loans={loans}
            onAddLoan={() => setModal({ type: 'addLoan' })}
            onDeleteLoan={deleteLoan}
            onAddPayment={(loanId) => setModal({ type: 'addPayment', loanId })}
            onDeletePayment={deletePayment}
          />
        )}
      </main>

      {modal?.type === 'addBusiness' && (
        <Modal title="New business" onClose={() => setModal(null)}>
          <AddBusinessForm onSubmit={(name, category) => { addBusiness(name, category); setModal(null); }} />
        </Modal>
      )}
      {modal?.type === 'addTransaction' && (
        <Modal title="Add transaction" onClose={() => setModal(null)}>
          <AddTransactionForm onSubmit={(tx) => { addTransaction(modal.businessId, tx); setModal(null); }} />
        </Modal>
      )}
      {modal?.type === 'addLoan' && (
        <Modal title="New loan" onClose={() => setModal(null)}>
          <AddLoanForm onSubmit={(loan) => { addLoan(loan); setModal(null); }} />
        </Modal>
      )}
      {modal?.type === 'addPayment' && (
        <Modal title="Record payment" onClose={() => setModal(null)}>
          <AddPaymentForm onSubmit={(payment) => { addPayment(modal.loanId, payment); setModal(null); }} />
        </Modal>
      )}
    </div>
  );
}

function Dashboard({ grandTotals, businessTotals, loans, onOpenBusiness, onGoLoans }) {
  return (
    <div>
      <section className="mb-6">
        <p className="text-xs uppercase tracking-widest text-amber-700 font-mono mb-1">Combined position</p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <StatCard label="Total income" value={ZMW(grandTotals.income)} icon={<TrendingUp size={16} />} accent="emerald" />
          <StatCard label="Total expenses" value={ZMW(grandTotals.expense)} icon={<TrendingDown size={16} />} accent="rose" />
          <StatCard label="Net profit" value={ZMW(grandTotals.net)} icon={<Wallet size={16} />} accent={grandTotals.net >= 0 ? 'emerald' : 'rose'} />
          <StatCard label="Outstanding loans" value={ZMW(grandTotals.loanBalance)} icon={<Landmark size={16} />} accent="amber" />
        </div>
      </section>

      <section className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <h2 className="font-serif text-xl text-stone-800">Your businesses</h2>
        </div>
        <div className="grid sm:grid-cols-2 gap-3">
          {businessTotals.map((b) => (
            <button
              key={b.id}
              onClick={() => onOpenBusiness(b.id)}
              className="text-left bg-white rounded-xl border border-stone-200 p-4 hover:border-amber-700/50 hover:shadow-sm transition-all group"
            >
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-serif text-lg text-stone-800">{b.name}</h3>
                  <p className="text-xs text-stone-500">{b.category}</p>
                </div>
                <ChevronRight size={18} className="text-stone-400 group-hover:text-amber-700 transition-colors" />
              </div>
              <div className="mt-3 flex gap-4 text-sm font-mono">
                <span className="text-emerald-700">+{ZMW(b.income)}</span>
                <span className="text-rose-700">-{ZMW(b.expense)}</span>
                <span className={`font-semibold ${b.net >= 0 ? 'text-stone-800' : 'text-rose-700'}`}>= {ZMW(b.net)}</span>
              </div>
            </button>
          ))}
          {businessTotals.length === 0 && (
            <p className="text-stone-500 text-sm col-span-2">No businesses yet. Add one from the Businesses tab.</p>
          )}
        </div>
      </section>

      <section>
        <div className="flex items-center justify-between mb-2">
          <h2 className="font-serif text-xl text-stone-800">Loans at a glance</h2>
          <button onClick={onGoLoans} className="text-sm text-amber-700 font-medium hover:underline">
            View all
          </button>
        </div>
        <div className="grid sm:grid-cols-2 gap-3">
          {loans.map((l) => {
            const stats = calcLoanStats(l);
            return (
              <div key={l.id} className="bg-white rounded-xl border border-stone-200 p-4">
                <h3 className="font-serif text-lg text-stone-800">{l.lender}</h3>
                <p className="text-xs text-stone-500">{l.rate}% interest • {l.termMonths} months</p>
                <div className="mt-3 flex justify-between text-sm font-mono">
                  <span className="text-stone-500">Remaining</span>
                  <span className="font-semibold text-stone-800">{ZMW(stats.remaining)}</span>
                </div>
              </div>
            );
          })}
          {loans.length === 0 && <p className="text-stone-500 text-sm col-span-2">No loans tracked yet.</p>}
        </div>
      </section>
    </div>
  );
}

function StatCard({ label, value, icon, accent }) {
  const accentMap = {
    emerald: 'text-emerald-700 bg-emerald-50',
    rose: 'text-rose-700 bg-rose-50',
    amber: 'text-amber-700 bg-amber-50',
  };
  return (
    <div className="bg-white rounded-xl border border-stone-200 p-4">
      <div className={`inline-flex items-center justify-center w-7 h-7 rounded-full mb-2 ${accentMap[accent]}`}>{icon}</div>
      <p className="text-xs text-stone-500">{label}</p>
      <p className="font-mono text-lg font-semibold text-stone-800 mt-0.5 break-all">{value}</p>
    </div>
  );
}

function BusinessList({ businesses, onOpen, onAdd, onDelete }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-serif text-2xl text-stone-800">Businesses</h2>
        <button onClick={onAdd} className="flex items-center gap-1.5 bg-amber-700 text-white px-3 py-2 rounded-lg text-sm font-medium hover:bg-amber-800 transition-colors">
          <Plus size={16} /> Add business
        </button>
      </div>
      <div className="grid sm:grid-cols-2 gap-3">
        {businesses.map((b) => (
          <div key={b.id} className="bg-white rounded-xl border border-stone-200 p-4 flex flex-col">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2">
                <Building2 size={18} className="text-amber-700" />
                <div>
                  <h3 className="font-serif text-lg text-stone-800">{b.name}</h3>
                  <p className="text-xs text-stone-500">{b.category}</p>
                </div>
              </div>
              <button onClick={() => onDelete(b.id)} className="text-stone-400 hover:text-rose-600 p-1">
                <Trash2 size={16} />
              </button>
            </div>
            <div className="mt-3 flex gap-4 text-sm font-mono">
              <span className="text-emerald-700">+{ZMW(b.income)}</span>
              <span className="text-rose-700">-{ZMW(b.expense)}</span>
              <span className={`font-semibold ${b.net >= 0 ? 'text-stone-800' : 'text-rose-700'}`}>= {ZMW(b.net)}</span>
            </div>
            <button onClick={() => onOpen(b.id)} className="mt-3 text-sm text-amber-700 font-medium hover:underline self-start">
              Open ledger →
            </button>
          </div>
        ))}
        {businesses.length === 0 && <p className="text-stone-500 text-sm">No businesses yet. Add your first one.</p>}
      </div>
    </div>
  );
}

function BusinessDetail({ business, onBack, onAddTransaction, onDeleteTransaction, onDeleteBusiness }) {
  const sortedTx = [...business.transactions].sort((a, b) => new Date(b.date) - new Date(a.date));
  return (
    <div>
      <button onClick={onBack} className="text-sm text-stone-500 hover:text-stone-800 mb-3">← All businesses</button>
      <div className="flex items-start justify-between mb-4">
        <div>
          <h2 className="font-serif text-2xl text-stone-800">{business.name}</h2>
          <p className="text-sm text-stone-500">{business.category}</p>
        </div>
        <button onClick={onDeleteBusiness} className="text-stone-400 hover:text-rose-600 p-1">
          <Trash2 size={18} />
        </button>
      </div>

      <div className="grid grid-cols-3 gap-3 mb-4">
        <StatCard label="Income" value={ZMW(business.income)} icon={<TrendingUp size={16} />} accent="emerald" />
        <StatCard label="Expenses" value={ZMW(business.expense)} icon={<TrendingDown size={16} />} accent="rose" />
        <StatCard label="Net" value={ZMW(business.net)} icon={<Wallet size={16} />} accent={business.net >= 0 ? 'emerald' : 'rose'} />
      </div>

      <div className="flex items-center justify-between mb-2">
        <h3 className="font-serif text-lg text-stone-800">Transactions</h3>
        <button onClick={onAddTransaction} className="flex items-center gap-1.5 bg-amber-700 text-white px-3 py-1.5 rounded-lg text-sm font-medium hover:bg-amber-800 transition-colors">
          <Plus size={16} /> Add
        </button>
      </div>

      <div className="bg-white rounded-xl border border-stone-200 divide-y divide-stone-100">
        {sortedTx.map((t) => (
          <div key={t.id} className="flex items-center justify-between px-4 py-3">
            <div>
              <p className="text-sm font-medium text-stone-800">{t.note || t.category}</p>
              <p className="text-xs text-stone-500 font-mono">{t.date} • {t.category}</p>
            </div>
            <div className="flex items-center gap-3">
              <span className={`font-mono text-sm font-semibold ${t.type === 'income' ? 'text-emerald-700' : 'text-rose-700'}`}>
                {t.type === 'income' ? '+' : '-'}{ZMW(t.amount)}
              </span>
              <button onClick={() => onDeleteTransaction(t.id)} className="text-stone-300 hover:text-rose-600">
                <Trash2 size={14} />
              </button>
            </div>
          </div>
        ))}
        {sortedTx.length === 0 && <p className="text-stone-500 text-sm p-4">No transactions yet.</p>}
      </div>
    </div>
  );
}

function LoansView({ loans, onAddLoan, onDeleteLoan, onAddPayment, onDeletePayment }) {
  const [expanded, setExpanded] = useState(null);
  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-serif text-2xl text-stone-800">Loans</h2>
        <button onClick={onAddLoan} className="flex items-center gap-1.5 bg-amber-700 text-white px-3 py-2 rounded-lg text-sm font-medium hover:bg-amber-800 transition-colors">
          <Plus size={16} /> Add loan
        </button>
      </div>

      <div className="space-y-3">
        {loans.map((l) => {
          const stats = calcLoanStats(l);
          const isOpen = expanded === l.id;
          return (
            <div key={l.id} className="bg-white rounded-xl border border-stone-200 overflow-hidden">
              <button onClick={() => setExpanded(isOpen ? null : l.id)} className="w-full text-left p-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Landmark size={18} className="text-amber-700" />
                  <div>
                    <h3 className="font-serif text-lg text-stone-800">{l.lender}</h3>
                    <p className="text-xs text-stone-500 font-mono">
                      Principal {ZMW(l.principal)} • {l.rate}% • since {l.startDate}
                    </p>
                  </div>
                </div>
                <ChevronRight size={18} className={`text-stone-400 transition-transform ${isOpen ? 'rotate-90' : ''}`} />
              </button>

              {isOpen && (
                <div className="border-t border-stone-100 p-4">
                  <div className="grid grid-cols-3 gap-3 mb-4">
                    <StatCard label="Total paid" value={ZMW(stats.totalPaid)} icon={<TrendingUp size={16} />} accent="emerald" />
                    <StatCard label="Interest accrued" value={ZMW(stats.totalInterest)} icon={<TrendingDown size={16} />} accent="amber" />
                    <StatCard label="Remaining" value={ZMW(stats.remaining)} icon={<Wallet size={16} />} accent={stats.remaining > 0 ? 'rose' : 'emerald'} />
                  </div>

                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-sm font-semibold text-stone-700">Payment history</h4>
                    <div className="flex gap-2">
                      <button onClick={() => onAddPayment(l.id)} className="flex items-center gap-1 text-sm text-amber-700 font-medium hover:underline">
                        <Plus size={14} /> Record payment
                      </button>
                      <button onClick={() => onDeleteLoan(l.id)} className="text-stone-400 hover:text-rose-600">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>

                  <div className="rounded-lg border border-stone-100 divide-y divide-stone-100">
                    {[...l.payments].sort((a, b) => new Date(b.date) - new Date(a.date)).map((p) => (
                      <div key={p.id} className="flex items-center justify-between px-3 py-2">
                        <span className="text-sm font-mono text-stone-600">{p.date}</span>
                        <div className="flex items-center gap-3">
                          <span className="font-mono text-sm font-semibold text-emerald-700">{ZMW(p.amount)}</span>
                          <button onClick={() => onDeletePayment(l.id, p.id)} className="text-stone-300 hover:text-rose-600">
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    ))}
                    {l.payments.length === 0 && <p className="text-stone-500 text-sm p-3">No payments recorded.</p>}
                  </div>
                </div>
              )}
            </div>
          );
        })}
        {loans.length === 0 && <p className="text-stone-500 text-sm">No loans yet. Add one to start tracking.</p>}
      </div>
    </div>
  );
}

function AddBusinessForm({ onSubmit }) {
  const [name, setName] = useState('');
  const [category, setCategory] = useState('');
  return (
    <form onSubmit={(e) => { e.preventDefault(); if (!name.trim()) return; onSubmit(name.trim(), category.trim() || 'General'); }}>
      <Field label="Business name">
        <input className={inputCls} value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Kalingalinga Grocers" autoFocus />
      </Field>
      <Field label="Category">
        <input className={inputCls} value={category} onChange={(e) => setCategory(e.target.value)} placeholder="e.g. Retail, Transport, Services" />
      </Field>
      <button type="submit" className="w-full bg-amber-700 text-white py-2.5 rounded-lg font-medium hover:bg-amber-800 transition-colors mt-2">
        Add business
      </button>
    </form>
  );
}

function AddTransactionForm({ onSubmit }) {
  const [type, setType] = useState('income');
  const [date, setDate] = useState(todayISO());
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState(INCOME_CATEGORIES[0]);
  const [note, setNote] = useState('');
  const categories = type === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;

  return (
    <form onSubmit={(e) => { e.preventDefault(); if (!amount || Number(amount) <= 0) return; onSubmit({ type, date, amount: Number(amount), category, note: note.trim() }); }}>
      <Field label="Type">
        <div className="grid grid-cols-2 gap-2">
          {['income', 'expense'].map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => { setType(t); setCategory(t === 'income' ? INCOME_CATEGORIES[0] : EXPENSE_CATEGORIES[0]); }}
              className={`py-2 rounded-lg text-sm font-medium border transition-colors ${type === t ? 'bg-amber-700 text-white border-amber-700' : 'bg-white border-stone-300 text-stone-600'}`}
            >
              {t === 'income' ? 'Income' : 'Expense'}
            </button>
          ))}
        </div>
      </Field>
      <Field label="Date">
        <input type="date" className={inputCls} value={date} onChange={(e) => setDate(e.target.value)} />
      </Field>
      <Field label="Amount (ZMW)">
        <input type="number" min="0" step="0.01" className={inputCls} value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0.00" />
      </Field>
      <Field label="Category">
        <select className={inputCls} value={category} onChange={(e) => setCategory(e.target.value)}>
          {categories.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
      </Field>
      <Field label="Note (optional)">
        <input className={inputCls} value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. Tomato supplier payment" />
      </Field>
      <button type="submit" className="w-full bg-amber-700 text-white py-2.5 rounded-lg font-medium hover:bg-amber-800 transition-colors mt-2">
        Save transaction
      </button>
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
    <form onSubmit={(e) => {
      e.preventDefault();
      if (!lender.trim() || !principal) return;
      onSubmit({ lender: lender.trim(), principal: Number(principal), rate: Number(rate) || 0, startDate, termMonths: Number(termMonths) || 0 });
    }}>
      <Field label="Lender">
        <input className={inputCls} value={lender} onChange={(e) => setLender(e.target.value)} placeholder="e.g. Zanaco Bank, Atlas Mara" autoFocus />
      </Field>
      <Field label="Principal amount (ZMW)">
        <input type="number" min="0" step="0.01" className={inputCls} value={principal} onChange={(e) => setPrincipal(e.target.value)} placeholder="0.00" />
      </Field>
      <Field label="Annual interest rate (%)">
        <input type="number" min="0" step="0.01" className={inputCls} value={rate} onChange={(e) => setRate(e.target.value)} placeholder="0" />
      </Field>
      <Field label="Start date">
        <input type="date" className={inputCls} value={startDate} onChange={(e) => setStartDate(e.target.value)} />
      </Field>
      <Field label="Term (months)">
        <input type="number" min="0" className={inputCls} value={termMonths} onChange={(e) => setTermMonths(e.target.value)} placeholder="e.g. 24" />
      </Field>
      <button type="submit" className="w-full bg-amber-700 text-white py-2.5 rounded-lg font-medium hover:bg-amber-800 transition-colors mt-2">
        Add loan
      </button>
    </form>
  );
}

function AddPaymentForm({ onSubmit }) {
  const [date, setDate] = useState(todayISO());
  const [amount, setAmount] = useState('');
  return (
    <form onSubmit={(e) => { e.preventDefault(); if (!amount || Number(amount) <= 0) return; onSubmit({ date, amount: Number(amount) }); }}>
      <Field label="Payment date">
        <input type="date" className={inputCls} value={date} onChange={(e) => setDate(e.target.value)} />
      </Field>
      <Field label="Amount paid (ZMW)">
        <input type="number" min="0" step="0.01" className={inputCls} value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0.00" autoFocus />
      </Field>
      <button type="submit" className="w-full bg-amber-700 text-white py-2.5 rounded-lg font-medium hover:bg-amber-800 transition-colors mt-2">
        Record payment
      </button>
    </form>
  );
}


Once committed, let me know — last steps are deleting src/Landing.jsx and checking the Vercel deployment.​​​​​​​​​​​​​​​​
