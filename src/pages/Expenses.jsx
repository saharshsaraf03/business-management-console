/*
 * ===========================================================
 * SUPABASE SETUP — Run this SQL in your Supabase SQL Editor
 * before using the Expenses page:
 * ===========================================================
 *
 * CREATE TABLE public.expenses (
 *   expense_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 *   date date NOT NULL,
 *   category text NOT NULL CHECK (category IN ('Transport', 'Packaging', 'Labor', 'Other')),
 *   amount numeric NOT NULL CHECK (amount > 0),
 *   description text,
 *   created_by uuid REFERENCES auth.users(id),
 *   created_at timestamptz DEFAULT now()
 * );
 *
 * ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
 *
 * CREATE POLICY "Owner can do all on expenses"
 * ON public.expenses
 * FOR ALL
 * TO authenticated
 * USING (
 *   EXISTS (
 *     SELECT 1 FROM public.profiles
 *     WHERE profiles.id = auth.uid()
 *     AND profiles.role = 'owner'
 *   )
 * );
 *
 * CREATE POLICY "Employees can read expenses"
 * ON public.expenses
 * FOR SELECT
 * TO authenticated
 * USING (true);
 *
 * ===========================================================
 */

import { useState, useEffect, useMemo } from 'react';
import { supabase } from '../supabaseClient';
import { useApp } from '../context/AppContext';
import { PageSpinner } from '../components/Spinner';
import Spinner from '../components/Spinner';
import Pagination from '../components/Pagination';
import ExportButtons from '../components/ExportButtons';
import { formatCurrency, formatDate, todayISO } from '../utils/formatCurrency';
import { getExpensesByCategory } from '../utils/calculations';

const CATEGORIES = ['Transport', 'Packaging', 'Labor', 'Other'];
const ROWS_PER_PAGE = 20;

const categoryColors = {
  Transport: {
    bg: 'bg-amber-100 dark:bg-amber-900/40',
    text: 'text-amber-700 dark:text-amber-400',
    border: 'border-amber-200 dark:border-amber-800',
    icon: '🚛'
  },
  Packaging: {
    bg: 'bg-blue-100 dark:bg-blue-900/40',
    text: 'text-blue-700 dark:text-blue-400',
    border: 'border-blue-200 dark:border-blue-800',
    icon: '📦'
  },
  Labor: {
    bg: 'bg-purple-100 dark:bg-purple-900/40',
    text: 'text-purple-700 dark:text-purple-400',
    border: 'border-purple-200 dark:border-purple-800',
    icon: '👷'
  },
  Other: {
    bg: 'bg-gray-100 dark:bg-slate-700',
    text: 'text-gray-700 dark:text-slate-300',
    border: 'border-gray-200 dark:border-slate-600',
    icon: '📋'
  }
};

const emptyForm = {
  date: todayISO(),
  category: '',
  amount: '',
  description: ''
};

export default function Expenses() {
  const { user, isOwner, addToast } = useApp();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [expenses, setExpenses] = useState([]);
  const [form, setForm] = useState({ ...emptyForm });
  const [errors, setErrors] = useState({});

  // Filters
  const [filterCategory, setFilterCategory] = useState('');
  const [filterDateFrom, setFilterDateFrom] = useState('');
  const [filterDateTo, setFilterDateTo] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    fetchExpenses();
  }, []);

  const fetchExpenses = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('expenses')
        .select('*')
        .order('date', { ascending: false });
      if (error) throw error;
      setExpenses(data || []);
    } catch (err) {
      addToast('Failed to load expenses: ' + err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  // Access restriction
  if (!isOwner) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-center">
        <div className="w-16 h-16 rounded-2xl bg-red-100 dark:bg-red-900/40 flex items-center justify-center mb-4">
          <svg className="w-8 h-8 text-red-500 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
              d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
        </div>
        <h2 className="text-xl font-bold text-gray-900 dark:text-slate-100 mb-2">Access Restricted</h2>
        <p className="text-sm text-gray-500 dark:text-slate-400">Only the owner can access the Expenses module.</p>
      </div>
    );
  }

  const validate = () => {
    const errs = {};
    if (!form.date) errs.date = 'Date is required';
    if (!form.category) errs.category = 'Select a category';
    if (!form.amount || Number(form.amount) <= 0) errs.amount = 'Amount must be greater than 0';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    setSaving(true);
    try {
      const { error } = await supabase.from('expenses').insert({
        date: form.date,
        category: form.category,
        amount: Number(form.amount),
        description: form.description.trim() || null,
        created_by: user.id
      });
      if (error) throw error;
      addToast('Expense recorded successfully');
      setForm({ ...emptyForm });
      setErrors({});
      await fetchExpenses();
    } catch (err) {
      addToast('Error saving expense: ' + err.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (expense) => {
    if (!window.confirm(`Delete this ${expense.category} expense of ${formatCurrency(expense.amount)}?`)) return;
    try {
      const { error } = await supabase.from('expenses').delete().eq('expense_id', expense.expense_id);
      if (error) throw error;
      addToast('Expense deleted successfully');
      await fetchExpenses();
    } catch (err) {
      addToast('Error deleting expense: ' + err.message, 'error');
    }
  };

  // Category totals
  const categoryTotals = useMemo(() => getExpensesByCategory(expenses), [expenses]);
  const categoryCounts = useMemo(() => {
    const counts = { Transport: 0, Packaging: 0, Labor: 0, Other: 0 };
    expenses.forEach(e => { if (counts[e.category] !== undefined) counts[e.category]++; });
    return counts;
  }, [expenses]);

  // Filtered expenses
  const filteredExpenses = useMemo(() => {
    let result = [...expenses];
    if (filterCategory) result = result.filter(e => e.category === filterCategory);
    if (filterDateFrom) result = result.filter(e => e.date >= filterDateFrom);
    if (filterDateTo) result = result.filter(e => e.date <= filterDateTo);
    return result;
  }, [expenses, filterCategory, filterDateFrom, filterDateTo]);

  const totalPages = Math.ceil(filteredExpenses.length / ROWS_PER_PAGE);
  const paginatedExpenses = filteredExpenses.slice(
    (currentPage - 1) * ROWS_PER_PAGE,
    currentPage * ROWS_PER_PAGE
  );

  useEffect(() => { setCurrentPage(1); }, [filterCategory, filterDateFrom, filterDateTo]);

  // Export
  const exportColumns = [
    { header: 'Sr. No.', key: 'idx' },
    { header: 'Date', key: 'dateFormatted' },
    { header: 'Category', key: 'category' },
    { header: 'Amount (₹)', key: 'amount' },
    { header: 'Description', key: 'description' }
  ];

  const exportData = filteredExpenses.map((e, i) => ({
    ...e,
    idx: i + 1,
    dateFormatted: formatDate(e.date)
  }));

  if (loading) return <PageSpinner />;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Add Expense Form */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm dark:shadow-none transition-all duration-300">
        <div className="px-5 py-4 border-b border-gray-100 dark:border-slate-700">
          <h2 className="text-lg font-bold text-gray-900 dark:text-slate-100">Add Expense</h2>
        </div>
        <div className="px-5 py-4">
          <form onSubmit={handleSubmit}>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="form-label">Date *</label>
                <input type="date" className="input-field" value={form.date}
                  onChange={e => setForm(f => ({ ...f, date: e.target.value }))} />
                {errors.date && <p className="form-error">{errors.date}</p>}
              </div>
              <div>
                <label className="form-label">Category *</label>
                <select className="select-field" value={form.category}
                  onChange={e => setForm(f => ({ ...f, category: e.target.value }))}>
                  <option value="">Select category</option>
                  {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
                {errors.category && <p className="form-error">{errors.category}</p>}
              </div>
              <div>
                <label className="form-label">Amount (₹) *</label>
                <input type="number" className="input-field" placeholder="0.00" min="0.01" step="0.01"
                  value={form.amount}
                  onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} />
                {errors.amount && <p className="form-error">{errors.amount}</p>}
              </div>
              <div>
                <label className="form-label">Description</label>
                <input type="text" className="input-field" placeholder="e.g. Auto fare to Kharadi"
                  value={form.description}
                  onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
              </div>
            </div>
            <div className="mt-4">
              <button type="submit" disabled={saving} className="btn-primary flex items-center gap-2">
                {saving && <Spinner size="sm" />}
                Add Expense
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Category Summary Cards */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 dark:text-slate-100 mb-4">Expense Summary</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {CATEGORIES.map(cat => {
            const c = categoryColors[cat];
            return (
              <div key={cat} className={`bg-white dark:bg-slate-800 rounded-xl p-5 border ${c.border} shadow-sm dark:shadow-none hover:shadow-md transition-all duration-300 hover:-translate-y-0.5`}>
                <div className="flex items-center justify-between mb-3">
                  <p className={`text-sm font-medium ${c.text}`}>{cat}</p>
                  <div className={`w-9 h-9 rounded-lg ${c.bg} flex items-center justify-center`}>
                    <span className="text-lg">{c.icon}</span>
                  </div>
                </div>
                <p className="text-2xl font-bold text-gray-900 dark:text-slate-100">{formatCurrency(categoryTotals[cat])}</p>
                <p className="text-xs text-gray-500 dark:text-slate-400 mt-1">{categoryCounts[cat]} {categoryCounts[cat] === 1 ? 'entry' : 'entries'}</p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Filters + Export */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm dark:shadow-none px-5 py-4 transition-colors duration-300">
        <div className="flex flex-col lg:flex-row lg:items-end gap-4">
          <div className="flex-1">
            <label className="form-label">Category</label>
            <select className="select-field" value={filterCategory}
              onChange={e => setFilterCategory(e.target.value)}>
              <option value="">All Categories</option>
              {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className="form-label">From</label>
            <input type="date" className="input-field" value={filterDateFrom}
              onChange={e => setFilterDateFrom(e.target.value)} />
          </div>
          <div>
            <label className="form-label">To</label>
            <input type="date" className="input-field" value={filterDateTo}
              onChange={e => setFilterDateTo(e.target.value)} />
          </div>
          <ExportButtons data={exportData} columns={exportColumns} fileName="expenses" title="Expenses Report" />
        </div>
      </div>

      {/* Expenses Table */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm dark:shadow-none overflow-hidden transition-colors duration-300">
        <table className="data-table">
          <thead>
            <tr>
              <th>Sr.</th>
              <th>Date</th>
              <th>Category</th>
              <th>Amount (₹)</th>
              <th>Description</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {paginatedExpenses.length === 0 ? (
              <tr>
                <td colSpan={6} className="text-center py-12">
                  <div className="flex flex-col items-center gap-2">
                    <svg className="w-12 h-12 text-gray-300 dark:text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5"
                        d="M9 14l6-6m-5.5.5h.01m4.99 5h.01M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16l3.5-2 3.5 2 3.5-2 3.5 2z" />
                    </svg>
                    <p className="text-sm text-gray-400 dark:text-slate-500">No expenses recorded yet</p>
                  </div>
                </td>
              </tr>
            ) : (
              paginatedExpenses.map((exp, i) => {
                const cc = categoryColors[exp.category] || categoryColors.Other;
                return (
                  <tr key={exp.expense_id}>
                    <td className="font-medium">{(currentPage - 1) * ROWS_PER_PAGE + i + 1}</td>
                    <td>{formatDate(exp.date)}</td>
                    <td>
                      <span className={`inline-flex items-center text-xs font-semibold px-2.5 py-0.5 rounded-full ${cc.bg} ${cc.text}`}>
                        {exp.category}
                      </span>
                    </td>
                    <td className="font-semibold">{formatCurrency(exp.amount)}</td>
                    <td className="max-w-[200px] truncate text-gray-600 dark:text-slate-400">{exp.description || '—'}</td>
                    <td>
                      <button onClick={() => handleDelete(exp)}
                        className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/30 text-red-600 dark:text-red-400 transition-colors duration-200"
                        title="Delete">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                            d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />
    </div>
  );
}
