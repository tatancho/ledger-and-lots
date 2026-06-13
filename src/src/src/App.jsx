import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Plus, Trash2, TrendingUp, TrendingDown, Wallet, Building2, Landmark, X, ChevronRight, Copy, Check, Loader2 } from 'lucide-react';
import { supabase } from './supabaseClient';

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
  const { bookId } = useParams();
  const navigate = useNavigate();

  const [businesses, setBusinesses] = useState([]);
  const [loans, setLoans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [saveStatus, setSaveStatus] = useState('idle');
  const [copied, setCopied] = useState(false);

  const [view, setView] = useState('dashboard');
  const [activeBusinessId, setActiveBusinessId] = useState(null);
  const [modal, setModal] = useState(null);

  const saveTimeout = useRef(null);
  const initialLoad = useRef(true);

  useEffect(() => {
    let active = true;
    async function load() {
      const { data, error } = await supabase.from('books').select('data').eq('id', bookId).single();
      if (!active) return;
      if (error || !data) {
        setNotFound(true);
        setLoading(false);
        return;
      }
      const payload = data.data || emptyData;
      setBusinesses(payload.businesses || []);
      setLoans(payload.loans || []);
      setLoading(false);
      initialLoad.current = true;
    }
    load();
    return () => { active = false; };
  }, [bookId]);

  useEffect(() => {
    if (loading || notFound) return;
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
        .eq('id', bookId);
      setSaveStatus(error ? 'error' : 'saved');
      if (!error) setTimeout(() => setSaveStatus('idle'), 1500);
    }, 600);
    return () => { if (saveTimeout.current) clearTimeout(saveTimeout.current); };
  }, [businesses, loans]);

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
    setActiveBusinessId((cur) =>
