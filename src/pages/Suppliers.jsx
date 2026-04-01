import { useState, useEffect, useMemo } from 'react';
import { supabase } from '../supabaseClient';
import { useApp } from '../context/AppContext';
import { PageSpinner } from '../components/Spinner';
import Spinner from '../components/Spinner';
import ConfirmDialog from '../components/ConfirmDialog';
import { formatCurrency, formatDate } from '../utils/formatCurrency';

export default function Suppliers() {
  const { isOwner, addToast } = useApp();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [suppliers, setSuppliers] = useState([]);
  const [purchases, setPurchases] = useState([]);
  const [expandedId, setExpandedId] = useState(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({ name: '', location: '', notes: '' });
  const [errors, setErrors] = useState({});
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [supRes, purRes] = await Promise.all([
        supabase.from('suppliers').select('*').order('name'),
        supabase.from('stock_purchases').select('*').order('date', { ascending: false })
      ]);
      if (supRes.error) throw supRes.error;
      if (purRes.error) throw purRes.error;
      setSuppliers(supRes.data || []);
      setPurchases(purRes.data || []);
    } catch (err) {
      addToast('Failed to load suppliers: ' + err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const supplierStats = useMemo(() => {
    const stats = {};
    suppliers.forEach(s => {
      const supPurchases = purchases.filter(p => p.supplier_id === s.supplier_id);
      const totalAmount = supPurchases.reduce((sum, p) => sum + Number(p.total_amount || 0), 0);
      const totalPaid = supPurchases.reduce((sum, p) => sum + Number(p.amount_paid || 0), 0);
      stats[s.supplier_id] = {
        totalBatches: supPurchases.length,
        totalAmount,
        outstandingDues: totalAmount - totalPaid
      };
    });
    return stats;
  }, [suppliers, purchases]);

  const validate = () => {
    const errs = {};
    if (!form.name.trim()) errs.name = 'Supplier name is required';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    setSaving(true);
    try {
      const data = {
        name: form.name.trim(),
        location: form.location.trim(),
        notes: form.notes.trim()
      };

      if (editingId) {
        const { error } = await supabase.from('suppliers').update(data).eq('supplier_id', editingId);
        if (error) throw error;
        addToast('Supplier updated successfully');
      } else {
        const { error } = await supabase.from('suppliers').insert(data);
        if (error) throw error;
        addToast('Supplier added successfully');
      }

      setForm({ name: '', location: '', notes: '' });
      setEditingId(null);
      setShowAddForm(false);
      setErrors({});
      await fetchData();
    } catch (err) {
      addToast('Error saving supplier: ' + err.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (supplier) => {
    setEditingId(supplier.supplier_id);
    setForm({ name: supplier.name, location: supplier.location || '', notes: supplier.notes || '' });
    setShowAddForm(true);
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const { error } = await supabase.from('suppliers').delete().eq('supplier_id', deleteTarget.supplier_id);
      if (error) throw error;
      addToast('Supplier deleted successfully');
      setDeleteTarget(null);
      await fetchData();
    } catch (err) {
      addToast('Error deleting supplier: ' + err.message, 'error');
    } finally {
      setDeleting(false);
    }
  };

  const handleCancel = () => {
    setForm({ name: '', location: '', notes: '' });
    setEditingId(null);
    setShowAddForm(false);
    setErrors({});
  };

  const getSupplierPurchases = (supplierId) => {
    return purchases.filter(p => p.supplier_id === supplierId);
  };

  if (loading) return <PageSpinner />;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <h1 className="page-title mb-0">Suppliers</h1>
        {!showAddForm && (
          <button onClick={() => setShowAddForm(true)} className="btn-primary flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
            </svg>
            Add Supplier
          </button>
        )}
      </div>

      {/* Add / Edit Form */}
      {showAddForm && (
        <div className="card animate-slide-up">
          <div className="card-header">
            <h2 className="section-title">{editingId ? 'Edit Supplier' : 'Add New Supplier'}</h2>
          </div>
          <div className="card-body">
            <form onSubmit={handleSubmit}>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="form-label">Name *</label>
                  <input type="text" className="input-field" placeholder="Supplier name"
                    value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
                  {errors.name && <p className="form-error">{errors.name}</p>}
                </div>
                <div>
                  <label className="form-label">Location</label>
                  <input type="text" className="input-field" placeholder="City / Area"
                    value={form.location} onChange={e => setForm(f => ({ ...f, location: e.target.value }))} />
                </div>
                <div>
                  <label className="form-label">Notes</label>
                  <input type="text" className="input-field" placeholder="Optional notes"
                    value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
                </div>
              </div>
              <div className="flex items-center gap-3 mt-4">
                <button type="submit" disabled={saving} className="btn-primary flex items-center gap-2">
                  {saving && <Spinner size="sm" />}
                  {editingId ? 'Update' : 'Add'}
                </button>
                <button type="button" onClick={handleCancel} className="btn-secondary">Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Suppliers Table */}
      <div className="table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th></th>
              <th>Name</th>
              <th>Location</th>
              <th>Notes</th>
              <th>Total Batches</th>
              <th>Total Purchased (₹)</th>
              <th>Outstanding (₹)</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {suppliers.length === 0 ? (
              <tr><td colSpan={8} className="text-center py-8 text-gray-400 dark:text-slate-500">No suppliers found</td></tr>
            ) : (
              suppliers.map(s => {
                const stats = supplierStats[s.supplier_id] || {};
                const isExpanded = expandedId === s.supplier_id;
                const supPurchases = isExpanded ? getSupplierPurchases(s.supplier_id) : [];

                return (
                  <tr key={s.supplier_id}>
                    <td colSpan={8} className="p-0">
                      {/* Main row */}
                      <div className="flex items-center px-4 py-3 cursor-pointer hover:bg-gray-50 dark:hover:bg-slate-700/50 transition-colors duration-150"
                        onClick={() => setExpandedId(isExpanded ? null : s.supplier_id)}>
                        <div className="w-8">
                          <svg className={`w-4 h-4 text-gray-400 dark:text-slate-500 transition-transform ${isExpanded ? 'rotate-90' : ''}`}
                            fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                          </svg>
                        </div>
                        <div className="flex-1 grid grid-cols-7 gap-4 items-center">
                          <span className="font-medium text-gray-900 dark:text-slate-100">{s.name}</span>
                          <span className="text-gray-600 dark:text-slate-400">{s.location || '—'}</span>
                          <span className="text-gray-600 dark:text-slate-400 truncate">{s.notes || '—'}</span>
                          <span>{stats.totalBatches || 0}</span>
                          <span className="font-semibold">{formatCurrency(stats.totalAmount || 0)}</span>
                          <span className={`font-semibold ${(stats.outstandingDues || 0) > 0 ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'}`}>
                            {formatCurrency(stats.outstandingDues || 0)}
                          </span>
                          <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
                            <button onClick={() => handleEdit(s)} className="p-1.5 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/30 text-blue-600 dark:text-blue-400 transition-colors duration-200" title="Edit">
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                                  d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                              </svg>
                            </button>
                            {isOwner && (
                              <button onClick={() => setDeleteTarget(s)} className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/30 text-red-600 dark:text-red-400 transition-colors duration-200" title="Delete">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                                    d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                              </button>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Expanded purchase history */}
                      {isExpanded && (
                        <div className="bg-gray-50 dark:bg-slate-700/50 px-12 py-4 border-t border-gray-100 dark:border-slate-700 animate-slide-up">
                          <h4 className="text-sm font-semibold text-gray-700 dark:text-slate-300 mb-3">Purchase History</h4>
                          {supPurchases.length === 0 ? (
                            <p className="text-sm text-gray-400 dark:text-slate-500">No purchases yet</p>
                          ) : (
                            <div className="overflow-x-auto">
                              <table className="w-full text-sm">
                                <thead>
                                  <tr className="text-xs text-gray-500 dark:text-slate-400 uppercase">
                                    <th className="text-left py-2 pr-4">Date</th>
                                    <th className="text-left py-2 pr-4">Jumbo</th>
                                    <th className="text-left py-2 pr-4">Large</th>
                                    <th className="text-left py-2 pr-4">Medium</th>
                                    <th className="text-left py-2 pr-4">Small</th>
                                    <th className="text-left py-2 pr-4">Total</th>
                                    <th className="text-left py-2 pr-4">Paid</th>
                                    <th className="text-left py-2">Due</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {supPurchases.map(p => {
                                    const due = Number(p.total_amount || 0) - Number(p.amount_paid || 0);
                                    return (
                                      <tr key={p.purchase_id} className="border-t border-gray-100 dark:border-slate-700">
                                        <td className="py-2 pr-4">{formatDate(p.date)}</td>
                                        <td className="py-2 pr-4">{p.jumbo_dz}</td>
                                        <td className="py-2 pr-4">{p.large_dz}</td>
                                        <td className="py-2 pr-4">{p.medium_dz}</td>
                                        <td className="py-2 pr-4">{p.small_dz}</td>
                                        <td className="py-2 pr-4 font-medium">{formatCurrency(p.total_amount)}</td>
                                        <td className="py-2 pr-4">{formatCurrency(p.amount_paid)}</td>
                                        <td className={`py-2 font-medium ${due > 0 ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'}`}>
                                          {formatCurrency(due)}
                                        </td>
                                      </tr>
                                    );
                                  })}
                                </tbody>
                              </table>
                            </div>
                          )}
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete Supplier"
        message={`Are you sure you want to delete "${deleteTarget?.name}"? This action cannot be undone.`}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
        loading={deleting}
      />
    </div>
  );
}
