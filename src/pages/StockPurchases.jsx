import { useState, useEffect, useMemo } from 'react';
import { supabase } from '../supabaseClient';
import { useApp } from '../context/AppContext';
import { PageSpinner } from '../components/Spinner';
import Spinner from '../components/Spinner';
import SearchableDropdown from '../components/SearchableDropdown';
import ExportButtons from '../components/ExportButtons';
import Pagination from '../components/Pagination';
import ConfirmDialog from '../components/ConfirmDialog';
import { formatCurrency, formatDate, todayISO } from '../utils/formatCurrency';

const PAYMENT_METHODS = ['UPI', 'Cash', 'Bank Transfer', 'Other'];
const ROWS_PER_PAGE = 20;

const emptyForm = {
  date: todayISO(),
  supplier_id: '',
  newSupplierName: '',
  newSupplierLocation: '',
  // Box tier calculator (form-only, NOT stored in DB)
  boxes_7dz: '',
  boxes_6dz: '',
  boxes_5dz: '',
  boxes_4dz: '',
  // Per-size breakdown (stored in DB)
  jumbo_dz: '',
  large_dz: '',
  medium_dz: '',
  small_dz: '',
  total_amount: '',
  amount_paid: '',
  payment_date: '',
  payment_method: '',
  notes: ''
};

export default function StockPurchases() {
  const { user, isOwner, addToast } = useApp();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [purchases, setPurchases] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [form, setForm] = useState({ ...emptyForm });
  const [editingId, setEditingId] = useState(null);
  const [errors, setErrors] = useState({});
  const [showAddSupplier, setShowAddSupplier] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [purchRes, supRes] = await Promise.all([
        supabase.from('stock_purchases').select('*, suppliers(name, location)').order('date', { ascending: false }),
        supabase.from('suppliers').select('*').order('name')
      ]);
      if (purchRes.error) throw purchRes.error;
      if (supRes.error) throw supRes.error;
      setPurchases(purchRes.data || []);
      setSuppliers(supRes.data || []);
    } catch (err) {
      addToast('Failed to load purchases: ' + err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  // Box tier calculator — auto-compute total dozens
  const calculatedTotalDz = useMemo(() => {
    const b7 = Number(form.boxes_7dz) || 0;
    const b6 = Number(form.boxes_6dz) || 0;
    const b5 = Number(form.boxes_5dz) || 0;
    const b4 = Number(form.boxes_4dz) || 0;
    return (b7 * 7) + (b6 * 6) + (b5 * 5) + (b4 * 4);
  }, [form.boxes_7dz, form.boxes_6dz, form.boxes_5dz, form.boxes_4dz]);

  // Due amount
  const dueAmount = useMemo(() => {
    const total = Number(form.total_amount) || 0;
    const paid = Number(form.amount_paid) || 0;
    return Math.max(0, total - paid);
  }, [form.total_amount, form.amount_paid]);

  const supplierOptions = useMemo(() =>
    suppliers.map(s => ({
      value: s.supplier_id,
      label: s.name,
      subtitle: s.location || ''
    })),
    [suppliers]
  );

  const validate = () => {
    const errs = {};
    if (!form.date) errs.date = 'Date is required';
    if (!form.supplier_id && !form.newSupplierName.trim()) errs.supplier = 'Select or add a supplier';
    if (showAddSupplier && !form.newSupplierName.trim()) errs.newSupplierName = 'Supplier name is required';
    if (!form.total_amount || Number(form.total_amount) <= 0) errs.total_amount = 'Total amount must be greater than 0';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    setSaving(true);
    try {
      let supplierId = form.supplier_id;

      if (showAddSupplier && form.newSupplierName.trim()) {
        const { data: newSup, error: supErr } = await supabase
          .from('suppliers')
          .insert({ name: form.newSupplierName.trim(), location: form.newSupplierLocation.trim() })
          .select()
          .single();
        if (supErr) throw supErr;
        supplierId = newSup.supplier_id;
      }

      const purchaseData = {
        date: form.date,
        supplier_id: supplierId,
        jumbo_dz: Number(form.jumbo_dz) || 0,
        large_dz: Number(form.large_dz) || 0,
        medium_dz: Number(form.medium_dz) || 0,
        small_dz: Number(form.small_dz) || 0,
        total_amount: Number(form.total_amount) || 0,
        amount_paid: Number(form.amount_paid) || 0,
        payment_date: form.payment_date || null,
        payment_method: form.payment_method || null,
        notes: form.notes.trim(),
        created_by: user.id
      };

      if (editingId) {
        const { error } = await supabase
          .from('stock_purchases')
          .update(purchaseData)
          .eq('purchase_id', editingId);
        if (error) throw error;
        addToast('Purchase updated successfully');
      } else {
        const { error } = await supabase
          .from('stock_purchases')
          .insert(purchaseData);
        if (error) throw error;
        addToast('Purchase recorded successfully');
      }

      setForm({ ...emptyForm });
      setEditingId(null);
      setShowAddSupplier(false);
      setErrors({});
      await fetchData();
    } catch (err) {
      addToast('Error saving purchase: ' + err.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (purchase) => {
    setEditingId(purchase.purchase_id);
    setShowAddSupplier(false);
    setForm({
      date: purchase.date,
      supplier_id: purchase.supplier_id || '',
      newSupplierName: '',
      newSupplierLocation: '',
      boxes_7dz: '',
      boxes_6dz: '',
      boxes_5dz: '',
      boxes_4dz: '',
      jumbo_dz: String(purchase.jumbo_dz || 0),
      large_dz: String(purchase.large_dz || 0),
      medium_dz: String(purchase.medium_dz || 0),
      small_dz: String(purchase.small_dz || 0),
      total_amount: String(purchase.total_amount || 0),
      amount_paid: String(purchase.amount_paid || 0),
      payment_date: purchase.payment_date || '',
      payment_method: purchase.payment_method || '',
      notes: purchase.notes || ''
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const { error } = await supabase
        .from('stock_purchases')
        .delete()
        .eq('purchase_id', deleteTarget.purchase_id);
      if (error) throw error;
      addToast('Purchase deleted successfully');
      setDeleteTarget(null);
      await fetchData();
    } catch (err) {
      addToast('Error deleting purchase: ' + err.message, 'error');
    } finally {
      setDeleting(false);
    }
  };

  const handleCancel = () => {
    setForm({ ...emptyForm });
    setEditingId(null);
    setShowAddSupplier(false);
    setErrors({});
  };

  const totalPages = Math.ceil(purchases.length / ROWS_PER_PAGE);
  const paginatedPurchases = purchases.slice(
    (currentPage - 1) * ROWS_PER_PAGE,
    currentPage * ROWS_PER_PAGE
  );

  const exportColumns = [
    { header: 'Sr. No.', key: 'idx' },
    { header: 'Date', key: 'dateFormatted' },
    { header: 'Supplier', key: 'supplierName' },
    { header: 'Jumbo dz', key: 'jumbo_dz' },
    { header: 'Large dz', key: 'large_dz' },
    { header: 'Medium dz', key: 'medium_dz' },
    { header: 'Small dz', key: 'small_dz' },
    { header: 'Total (₹)', key: 'total_amount' },
    { header: 'Paid (₹)', key: 'amount_paid' },
    { header: 'Due (₹)', key: 'due' },
    { header: 'Payment Date', key: 'paymentDateFormatted' },
    { header: 'Method', key: 'payment_method' },
    { header: 'Notes', key: 'notes' }
  ];

  const exportData = purchases.map((p, i) => ({
    ...p,
    idx: i + 1,
    dateFormatted: formatDate(p.date),
    supplierName: p.suppliers?.name || '',
    due: Number(p.total_amount || 0) - Number(p.amount_paid || 0),
    paymentDateFormatted: formatDate(p.payment_date)
  }));

  if (loading) return <PageSpinner />;

  return (
    <div className="space-y-6 animate-fade-in">
      <h1 className="page-title">Stock Purchases</h1>

      {/* Add / Edit Form */}
      <div className="card">
        <div className="card-header">
          <h2 className="section-title">{editingId ? 'Edit Purchase' : 'Add New Purchase'}</h2>
        </div>
        <div className="card-body">
          <form onSubmit={handleSubmit}>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {/* Date */}
              <div>
                <label className="form-label">Date *</label>
                <input type="date" className="input-field" value={form.date}
                  onChange={e => setForm(f => ({ ...f, date: e.target.value }))} />
                {errors.date && <p className="form-error">{errors.date}</p>}
              </div>

              {/* Supplier */}
              <div>
                <label className="form-label">Supplier *</label>
                {showAddSupplier ? (
                  <div className="space-y-2">
                    <input type="text" className="input-field" placeholder="Supplier name"
                      value={form.newSupplierName}
                      onChange={e => setForm(f => ({ ...f, newSupplierName: e.target.value }))} />
                    {errors.newSupplierName && <p className="form-error">{errors.newSupplierName}</p>}
                    <input type="text" className="input-field" placeholder="Location"
                      value={form.newSupplierLocation}
                      onChange={e => setForm(f => ({ ...f, newSupplierLocation: e.target.value }))} />
                    <button type="button" className="text-xs text-green-700 dark:text-green-400 hover:underline"
                      onClick={() => { setShowAddSupplier(false); setForm(f => ({ ...f, newSupplierName: '', newSupplierLocation: '' })); }}>
                      ← Back to search
                    </button>
                  </div>
                ) : (
                  <SearchableDropdown
                    options={supplierOptions}
                    value={form.supplier_id}
                    onChange={(val) => setForm(f => ({ ...f, supplier_id: val }))}
                    placeholder="Search suppliers..."
                    showAddNew
                    onAddNewClick={() => setShowAddSupplier(true)}
                  />
                )}
                {errors.supplier && <p className="form-error">{errors.supplier}</p>}
              </div>
            </div>

            {/* Box Tier Calculator */}
            <div className="mt-5 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-900/40 rounded-xl transition-colors duration-200">
              <h3 className="text-sm font-semibold text-blue-800 dark:text-blue-300 mb-3">
                📦 Wholesale Box Calculator <span className="font-normal text-blue-500 dark:text-blue-400/60">(convenience tool — not stored)</span>
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                <div>
                  <label className="text-xs text-blue-600 dark:text-blue-400 font-medium">7 dz boxes</label>
                  <input type="number" className="input-field" min="0" value={form.boxes_7dz}
                    onChange={e => setForm(f => ({ ...f, boxes_7dz: e.target.value }))} />
                </div>
                <div>
                  <label className="text-xs text-blue-600 dark:text-blue-400 font-medium">6 dz boxes</label>
                  <input type="number" className="input-field" min="0" value={form.boxes_6dz}
                    onChange={e => setForm(f => ({ ...f, boxes_6dz: e.target.value }))} />
                </div>
                <div>
                  <label className="text-xs text-blue-600 dark:text-blue-400 font-medium">5 dz boxes</label>
                  <input type="number" className="input-field" min="0" value={form.boxes_5dz}
                    onChange={e => setForm(f => ({ ...f, boxes_5dz: e.target.value }))} />
                </div>
                <div>
                  <label className="text-xs text-blue-600 dark:text-blue-400 font-medium">4 dz boxes</label>
                  <input type="number" className="input-field" min="0" value={form.boxes_4dz}
                    onChange={e => setForm(f => ({ ...f, boxes_4dz: e.target.value }))} />
                </div>
                <div className="flex items-end">
                  <div className="bg-white dark:bg-slate-700 rounded-lg border border-blue-200 dark:border-blue-800 px-4 py-2 w-full text-center transition-colors duration-200">
                    <p className="text-xs text-blue-500 dark:text-blue-400">Total</p>
                    <p className="text-lg font-bold text-blue-800 dark:text-blue-300">{calculatedTotalDz} dz</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Per-size breakdown */}
            <div className="mt-5">
              <h3 className="text-sm font-semibold text-gray-700 dark:text-slate-300 mb-3">Per-Size Quantity Breakdown (dozens)</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <label className="form-label">Jumbo dz</label>
                  <input type="number" className="input-field" min="0" step="0.5" value={form.jumbo_dz}
                    onChange={e => setForm(f => ({ ...f, jumbo_dz: e.target.value }))} />
                </div>
                <div>
                  <label className="form-label">Large dz</label>
                  <input type="number" className="input-field" min="0" step="0.5" value={form.large_dz}
                    onChange={e => setForm(f => ({ ...f, large_dz: e.target.value }))} />
                </div>
                <div>
                  <label className="form-label">Medium dz</label>
                  <input type="number" className="input-field" min="0" step="0.5" value={form.medium_dz}
                    onChange={e => setForm(f => ({ ...f, medium_dz: e.target.value }))} />
                </div>
                <div>
                  <label className="form-label">Small dz</label>
                  <input type="number" className="input-field" min="0" step="0.5" value={form.small_dz}
                    onChange={e => setForm(f => ({ ...f, small_dz: e.target.value }))} />
                </div>
              </div>
            </div>

            {/* Payment fields */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mt-5">
              <div>
                <label className="form-label">Total Amount (₹) *</label>
                <input type="number" className="input-field" min="0" value={form.total_amount}
                  onChange={e => setForm(f => ({ ...f, total_amount: e.target.value }))} />
                {errors.total_amount && <p className="form-error">{errors.total_amount}</p>}
              </div>
              <div>
                <label className="form-label">Amount Paid (₹)</label>
                <input type="number" className="input-field" min="0" value={form.amount_paid}
                  onChange={e => setForm(f => ({ ...f, amount_paid: e.target.value }))} />
              </div>
              <div>
                <label className="form-label">Due Amount</label>
                <div className={`w-full px-4 py-2.5 rounded-lg border border-gray-200 dark:border-slate-600 bg-gray-50 dark:bg-slate-700 text-sm font-semibold ${dueAmount > 0 ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'}`}>
                  {formatCurrency(dueAmount)}
                </div>
              </div>
              <div>
                <label className="form-label">Payment Date</label>
                <input type="date" className="input-field" value={form.payment_date}
                  onChange={e => setForm(f => ({ ...f, payment_date: e.target.value }))} />
              </div>
              <div>
                <label className="form-label">Payment Method</label>
                <select className="select-field" value={form.payment_method}
                  onChange={e => setForm(f => ({ ...f, payment_method: e.target.value }))}>
                  <option value="">Select method</option>
                  {PAYMENT_METHODS.map(m => <option key={m} value={m}>{m}</option>)}
                </select>
              </div>
              <div className="lg:col-span-2">
                <label className="form-label">Notes</label>
                <input type="text" className="input-field" placeholder="Optional notes" value={form.notes}
                  onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
              </div>
            </div>

            <div className="flex items-center gap-3 mt-5">
              <button type="submit" disabled={saving} className="btn-primary flex items-center gap-2">
                {saving && <Spinner size="sm" />}
                {editingId ? 'Update Purchase' : 'Add Purchase'}
              </button>
              {editingId && (
                <button type="button" onClick={handleCancel} className="btn-secondary">Cancel</button>
              )}
            </div>
          </form>
        </div>
      </div>

      {/* Export */}
      <div className="flex justify-end">
        <ExportButtons data={exportData} columns={exportColumns} fileName="stock_purchases" title="Stock Purchases Report" />
      </div>

      {/* Purchases Table */}
      <div className="table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th>Sr.</th>
              <th>Date</th>
              <th>Supplier</th>
              <th>Jumbo dz</th>
              <th>Large dz</th>
              <th>Medium dz</th>
              <th>Small dz</th>
              <th>Total (₹)</th>
              <th>Paid (₹)</th>
              <th>Due (₹)</th>
              <th>Pay Date</th>
              <th>Method</th>
              <th>Notes</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {paginatedPurchases.length === 0 ? (
              <tr><td colSpan={14} className="text-center py-8 text-gray-400 dark:text-slate-500">No purchases found</td></tr>
            ) : (
              paginatedPurchases.map((p, i) => {
                const due = Number(p.total_amount || 0) - Number(p.amount_paid || 0);
                return (
                  <tr key={p.purchase_id}>
                    <td className="font-medium">{(currentPage - 1) * ROWS_PER_PAGE + i + 1}</td>
                    <td>{formatDate(p.date)}</td>
                    <td className="font-medium">{p.suppliers?.name || '—'}</td>
                    <td>{p.jumbo_dz}</td>
                    <td>{p.large_dz}</td>
                    <td>{p.medium_dz}</td>
                    <td>{p.small_dz}</td>
                    <td className="font-semibold">{formatCurrency(p.total_amount)}</td>
                    <td>{formatCurrency(p.amount_paid)}</td>
                    <td className={`font-semibold ${due > 0 ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'}`}>
                      {formatCurrency(due)}
                    </td>
                    <td>{formatDate(p.payment_date)}</td>
                    <td>{p.payment_method || '—'}</td>
                    <td className="max-w-[120px] truncate">{p.notes || '—'}</td>
                    <td>
                      <div className="flex items-center gap-1">
                        <button onClick={() => handleEdit(p)} className="p-1.5 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/30 text-blue-600 dark:text-blue-400 transition-colors duration-200" title="Edit">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                              d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                        {isOwner && (
                          <button onClick={() => setDeleteTarget(p)} className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/30 text-red-600 dark:text-red-400 transition-colors duration-200" title="Delete">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />

      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete Purchase"
        message="Are you sure you want to delete this purchase record? This action cannot be undone."
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
        loading={deleting}
      />
    </div>
  );
}
