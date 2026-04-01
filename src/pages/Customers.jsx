import { useState, useEffect, useMemo } from 'react';
import { supabase } from '../supabaseClient';
import { useApp } from '../context/AppContext';
import { PageSpinner } from '../components/Spinner';
import Spinner from '../components/Spinner';
import StatusBadge from '../components/StatusBadge';
import { formatCurrency, formatDate } from '../utils/formatCurrency';

export default function Customers() {
  const { isOwner, addToast } = useApp();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [customers, setCustomers] = useState([]);
  const [orders, setOrders] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedId, setExpandedId] = useState(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({ name: '', address: '' });
  const [errors, setErrors] = useState({});

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [custRes, ordRes] = await Promise.all([
        supabase.from('customers').select('*').order('name'),
        supabase.from('sales_orders').select('*').order('date', { ascending: false })
      ]);
      if (custRes.error) throw custRes.error;
      if (ordRes.error) throw ordRes.error;
      setCustomers(custRes.data || []);
      setOrders(ordRes.data || []);
    } catch (err) {
      addToast('Failed to load customers: ' + err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const customerStats = useMemo(() => {
    const stats = {};
    customers.forEach(c => {
      const custOrders = orders.filter(o => o.customer_id === c.customer_id);
      const totalValue = custOrders.reduce((s, o) => s + Number(o.amount || 0), 0);
      const lastOrder = custOrders.length > 0 ? custOrders[0].date : null;
      stats[c.customer_id] = {
        totalOrders: custOrders.length,
        totalValue,
        lastOrder
      };
    });
    return stats;
  }, [customers, orders]);

  const filteredCustomers = useMemo(() => {
    if (!searchQuery.trim()) return customers;
    const q = searchQuery.toLowerCase();
    return customers.filter(c =>
      c.name.toLowerCase().includes(q) ||
      (c.address || '').toLowerCase().includes(q)
    );
  }, [customers, searchQuery]);

  const validate = () => {
    const errs = {};
    if (!form.name.trim()) errs.name = 'Customer name is required';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    setSaving(true);
    try {
      if (editingId) {
        const { error } = await supabase
          .from('customers')
          .update({ name: form.name.trim(), address: form.address.trim() })
          .eq('customer_id', editingId);
        if (error) throw error;
        addToast('Customer updated successfully');
      } else {
        const { error } = await supabase
          .from('customers')
          .insert({ name: form.name.trim(), address: form.address.trim() });
        if (error) throw error;
        addToast('Customer added successfully');
      }

      setForm({ name: '', address: '' });
      setEditingId(null);
      setShowAddForm(false);
      setErrors({});
      await fetchData();
    } catch (err) {
      addToast('Error saving customer: ' + err.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (customer) => {
    setEditingId(customer.customer_id);
    setForm({ name: customer.name, address: customer.address || '' });
    setShowAddForm(true);
  };

  const handleCancel = () => {
    setForm({ name: '', address: '' });
    setEditingId(null);
    setShowAddForm(false);
    setErrors({});
  };

  const getCustomerOrders = (customerId) => {
    return orders.filter(o => o.customer_id === customerId);
  };

  if (loading) return <PageSpinner />;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <h1 className="page-title mb-0">Customers</h1>
        {!showAddForm && (
          <button onClick={() => setShowAddForm(true)} className="btn-primary flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
            </svg>
            Add Customer
          </button>
        )}
      </div>

      {/* Add / Edit Form */}
      {showAddForm && (
        <div className="card animate-slide-up">
          <div className="card-header">
            <h2 className="section-title">{editingId ? 'Edit Customer' : 'Add New Customer'}</h2>
          </div>
          <div className="card-body">
            <form onSubmit={handleSubmit}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="form-label">Name *</label>
                  <input type="text" className="input-field" placeholder="Customer name"
                    value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
                  {errors.name && <p className="form-error">{errors.name}</p>}
                </div>
                <div>
                  <label className="form-label">Address</label>
                  <input type="text" className="input-field" placeholder="Address"
                    value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} />
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

      {/* Search */}
      <div>
        <input type="text" className="input-field max-w-md" placeholder="Search by name or address..."
          value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
      </div>

      {/* Customers Table */}
      <div className="table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th></th>
              <th>Name</th>
              <th>Address</th>
              <th>Total Orders</th>
              <th>Total Value (₹)</th>
              <th>Last Order</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredCustomers.length === 0 ? (
              <tr><td colSpan={7} className="text-center py-8 text-gray-400 dark:text-slate-500">No customers found</td></tr>
            ) : (
              filteredCustomers.map(c => {
                const stats = customerStats[c.customer_id] || {};
                const isExpanded = expandedId === c.customer_id;
                const custOrders = isExpanded ? getCustomerOrders(c.customer_id) : [];

                return (
                  <tr key={c.customer_id} className="group">
                    <td colSpan={7} className="p-0">
                      {/* Main row */}
                      <div className="flex items-center px-4 py-3 cursor-pointer hover:bg-gray-50 dark:hover:bg-slate-700/50 transition-colors duration-150"
                        onClick={() => setExpandedId(isExpanded ? null : c.customer_id)}>
                        <div className="w-8">
                          <svg className={`w-4 h-4 text-gray-400 dark:text-slate-500 transition-transform ${isExpanded ? 'rotate-90' : ''}`}
                            fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                          </svg>
                        </div>
                        <div className="flex-1 grid grid-cols-6 gap-4 items-center">
                          <span className="font-medium text-gray-900 dark:text-slate-100">{c.name}</span>
                          <span className="text-gray-600 dark:text-slate-400 truncate">{c.address || '—'}</span>
                          <span>{stats.totalOrders || 0}</span>
                          <span className="font-semibold">{formatCurrency(stats.totalValue || 0)}</span>
                          <span>{formatDate(stats.lastOrder)}</span>
                          <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
                            <button onClick={() => handleEdit(c)} className="p-1.5 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/30 text-blue-600 dark:text-blue-400 transition-colors duration-200" title="Edit">
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                                  d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                              </svg>
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* Expanded order history */}
                      {isExpanded && (
                        <div className="bg-gray-50 dark:bg-slate-700/50 px-12 py-4 border-t border-gray-100 dark:border-slate-700 animate-slide-up">
                          <h4 className="text-sm font-semibold text-gray-700 dark:text-slate-300 mb-3">Order History</h4>
                          {custOrders.length === 0 ? (
                            <p className="text-sm text-gray-400 dark:text-slate-500">No orders yet</p>
                          ) : (
                            <div className="overflow-x-auto">
                              <table className="w-full text-sm">
                                <thead>
                                  <tr className="text-xs text-gray-500 dark:text-slate-400 uppercase">
                                    <th className="text-left py-2 pr-4">Date</th>
                                    <th className="text-left py-2 pr-4">Size</th>
                                    <th className="text-left py-2 pr-4">Qty (dz)</th>
                                    <th className="text-left py-2 pr-4">Amount</th>
                                    <th className="text-left py-2 pr-4">Payment</th>
                                    <th className="text-left py-2">Delivery</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {custOrders.map(o => (
                                    <tr key={o.order_id} className="border-t border-gray-100 dark:border-slate-700">
                                      <td className="py-2 pr-4">{formatDate(o.date)}</td>
                                      <td className="py-2 pr-4">{o.size}</td>
                                      <td className="py-2 pr-4">{o.quantity_dz}</td>
                                      <td className="py-2 pr-4 font-medium">{formatCurrency(o.amount)}</td>
                                      <td className="py-2 pr-4"><StatusBadge status={o.payment_status} /></td>
                                      <td className="py-2"><StatusBadge status={o.delivery_status} /></td>
                                    </tr>
                                  ))}
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
    </div>
  );
}
