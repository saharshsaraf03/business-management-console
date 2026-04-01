import { useState, useEffect, useMemo } from 'react';
import { supabase } from '../supabaseClient';
import { useApp } from '../context/AppContext';
import { PageSpinner } from '../components/Spinner';
import Spinner from '../components/Spinner';
import SearchableDropdown from '../components/SearchableDropdown';
import StatusBadge from '../components/StatusBadge';
import Pagination from '../components/Pagination';
import ExportButtons from '../components/ExportButtons';
import ConfirmDialog from '../components/ConfirmDialog';
import { formatCurrency, formatDate, todayISO } from '../utils/formatCurrency';

const SIZES = ['Jumbo', 'Large', 'Medium', 'Small'];
const PAYMENT_STATUSES = ['Paid', 'Due', 'Partial'];
const PAYMENT_METHODS = ['UPI', 'Cash', 'Bank Transfer', 'Other'];
const DELIVERY_STATUSES = ['Delivered', 'Pending', 'Scheduled'];
const ROWS_PER_PAGE = 20;

const emptyForm = {
  date: todayISO(),
  customer_id: '',
  newCustomerName: '',
  newCustomerAddress: '',
  address: '',
  size: '',
  quantity_dz: '',
  amount: '',
  payment_status: '',
  payment_method: '',
  delivery_status: '',
  delivery_date: '',
  notes: ''
};

export default function SalesOrders() {
  const { user, isOwner, mangoRates, addToast } = useApp();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [orders, setOrders] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [form, setForm] = useState({ ...emptyForm });
  const [editingId, setEditingId] = useState(null);
  const [errors, setErrors] = useState({});
  const [showAddCustomer, setShowAddCustomer] = useState(false);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [filterSize, setFilterSize] = useState('');
  const [filterPayment, setFilterPayment] = useState('');
  const [filterDelivery, setFilterDelivery] = useState('');
  const [filterDateFrom, setFilterDateFrom] = useState('');
  const [filterDateTo, setFilterDateTo] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  // Delete
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [ordersRes, custRes] = await Promise.all([
        supabase.from('sales_orders').select('*, customers(name, address)').order('serial_number', { ascending: false }),
        supabase.from('customers').select('*').order('name')
      ]);
      if (ordersRes.error) throw ordersRes.error;
      if (custRes.error) throw custRes.error;
      setOrders(ordersRes.data || []);
      setCustomers(custRes.data || []);
    } catch (err) {
      addToast('Failed to load sales orders: ' + err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  // Auto-suggest amount based on rate
  useEffect(() => {
    if (form.size && form.quantity_dz && !editingId) {
      const rate = mangoRates.find(r => r.size === form.size);
      if (rate) {
        const suggested = Number(rate.sell_price_per_dz) * Number(form.quantity_dz);
        setForm(prev => ({ ...prev, amount: String(suggested) }));
      }
    }
  }, [form.size, form.quantity_dz, mangoRates]);

  // Auto-fill address when customer selected
  useEffect(() => {
    if (form.customer_id) {
      const cust = customers.find(c => c.customer_id === form.customer_id);
      if (cust) {
        setForm(prev => ({ ...prev, address: cust.address || '' }));
      }
    }
  }, [form.customer_id, customers]);

  const customerOptions = useMemo(() =>
    customers.map(c => ({
      value: c.customer_id,
      label: c.name,
      subtitle: c.address || ''
    })),
    [customers]
  );

  const validate = () => {
    const errs = {};
    if (!form.date) errs.date = 'Date is required';
    if (!form.customer_id && !form.newCustomerName.trim()) errs.customer = 'Select or add a customer';
    if (showAddCustomer && !form.newCustomerName.trim()) errs.newCustomerName = 'Customer name is required';
    if (!form.size) errs.size = 'Select a mango size';
    if (!form.quantity_dz || Number(form.quantity_dz) < 0.5) errs.quantity_dz = 'Quantity must be at least 0.5 dozen';
    if (!form.amount || Number(form.amount) <= 0) errs.amount = 'Amount must be greater than 0';
    if (!form.payment_status) errs.payment_status = 'Select payment status';
    if (!form.payment_method) errs.payment_method = 'Select payment method';
    if (!form.delivery_status) errs.delivery_status = 'Select delivery status';
    if (form.delivery_status === 'Scheduled' && !form.delivery_date) errs.delivery_date = 'Delivery date required for scheduled orders';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    setSaving(true);
    try {
      let customerId = form.customer_id;

      // Create new customer if needed
      if (showAddCustomer && form.newCustomerName.trim()) {
        const { data: newCust, error: custErr } = await supabase
          .from('customers')
          .insert({ name: form.newCustomerName.trim(), address: form.newCustomerAddress.trim() })
          .select()
          .single();
        if (custErr) throw custErr;
        customerId = newCust.customer_id;
      }

      const orderData = {
        date: form.date,
        customer_id: customerId,
        size: form.size,
        quantity_dz: Number(form.quantity_dz),
        amount: Number(form.amount),
        payment_status: form.payment_status,
        payment_method: form.payment_method,
        delivery_status: form.delivery_status,
        delivery_date: form.delivery_status === 'Scheduled' ? form.delivery_date : null,
        notes: form.notes.trim(),
        created_by: user.id
      };

      if (editingId) {
        const { error } = await supabase
          .from('sales_orders')
          .update(orderData)
          .eq('order_id', editingId);
        if (error) throw error;
        addToast('Sale order updated successfully');
      } else {
        const { error } = await supabase
          .from('sales_orders')
          .insert(orderData);
        if (error) throw error;
        addToast('Sale order created successfully');
      }

      setForm({ ...emptyForm });
      setEditingId(null);
      setShowAddCustomer(false);
      setErrors({});
      await fetchData();
    } catch (err) {
      addToast('Error saving order: ' + err.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (order) => {
    setEditingId(order.order_id);
    setShowAddCustomer(false);
    setForm({
      date: order.date,
      customer_id: order.customer_id || '',
      newCustomerName: '',
      newCustomerAddress: '',
      address: order.customers?.address || '',
      size: order.size,
      quantity_dz: String(order.quantity_dz),
      amount: String(order.amount),
      payment_status: order.payment_status,
      payment_method: order.payment_method || '',
      delivery_status: order.delivery_status,
      delivery_date: order.delivery_date || '',
      notes: order.notes || ''
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const { error } = await supabase
        .from('sales_orders')
        .delete()
        .eq('order_id', deleteTarget.order_id);
      if (error) throw error;
      addToast('Sale order deleted successfully');
      setDeleteTarget(null);
      await fetchData();
    } catch (err) {
      addToast('Error deleting order: ' + err.message, 'error');
    } finally {
      setDeleting(false);
    }
  };

  const handleCancel = () => {
    setForm({ ...emptyForm });
    setEditingId(null);
    setShowAddCustomer(false);
    setErrors({});
  };

  // Filtered orders
  const filteredOrders = useMemo(() => {
    let result = [...orders];

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(o =>
        (o.customers?.name || '').toLowerCase().includes(q) ||
        (o.customers?.address || '').toLowerCase().includes(q)
      );
    }
    if (filterSize) result = result.filter(o => o.size === filterSize);
    if (filterPayment) result = result.filter(o => o.payment_status === filterPayment);
    if (filterDelivery) result = result.filter(o => o.delivery_status === filterDelivery);
    if (filterDateFrom) result = result.filter(o => o.date >= filterDateFrom);
    if (filterDateTo) result = result.filter(o => o.date <= filterDateTo);

    return result;
  }, [orders, searchQuery, filterSize, filterPayment, filterDelivery, filterDateFrom, filterDateTo]);

  const totalPages = Math.ceil(filteredOrders.length / ROWS_PER_PAGE);
  const paginatedOrders = filteredOrders.slice(
    (currentPage - 1) * ROWS_PER_PAGE,
    currentPage * ROWS_PER_PAGE
  );

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, filterSize, filterPayment, filterDelivery, filterDateFrom, filterDateTo]);

  // Export columns
  const exportColumns = [
    { header: 'Sr. No.', key: 'serial_number' },
    { header: 'Date', key: 'dateFormatted' },
    { header: 'Customer', key: 'customerName' },
    { header: 'Address', key: 'customerAddress' },
    { header: 'Size', key: 'size' },
    { header: 'Qty (dz)', key: 'quantity_dz' },
    { header: 'Amount (₹)', key: 'amount' },
    { header: 'Payment', key: 'payment_status' },
    { header: 'Method', key: 'payment_method' },
    { header: 'Delivery', key: 'delivery_status' },
    { header: 'Delivery Date', key: 'deliveryDateFormatted' },
    { header: 'Notes', key: 'notes' }
  ];

  const exportData = filteredOrders.map(o => ({
    ...o,
    dateFormatted: formatDate(o.date),
    customerName: o.customers?.name || '',
    customerAddress: o.customers?.address || '',
    deliveryDateFormatted: formatDate(o.delivery_date)
  }));

  if (loading) return <PageSpinner />;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Add / Edit Form */}
      <div className="card">
        <div className="card-header">
          <h2 className="section-title">{editingId ? 'Edit Sale Order' : 'Add New Sale'}</h2>
        </div>
        <div className="card-body">
          <form onSubmit={handleSubmit}>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {/* Date */}
              <div>
                <label className="form-label">Date *</label>
                <input
                  type="date"
                  className="input-field"
                  value={form.date}
                  onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
                />
                {errors.date && <p className="form-error">{errors.date}</p>}
              </div>

              {/* Customer */}
              <div>
                <label className="form-label">Customer *</label>
                {showAddCustomer ? (
                  <div className="space-y-2">
                    <input
                      type="text"
                      className="input-field"
                      placeholder="Customer name"
                      value={form.newCustomerName}
                      onChange={e => setForm(f => ({ ...f, newCustomerName: e.target.value }))}
                    />
                    {errors.newCustomerName && <p className="form-error">{errors.newCustomerName}</p>}
                    <input
                      type="text"
                      className="input-field"
                      placeholder="Customer address"
                      value={form.newCustomerAddress}
                      onChange={e => setForm(f => ({ ...f, newCustomerAddress: e.target.value }))}
                    />
                    <button
                      type="button"
                      className="text-xs text-green-700 dark:text-green-400 hover:underline"
                      onClick={() => { setShowAddCustomer(false); setForm(f => ({ ...f, newCustomerName: '', newCustomerAddress: '' })); }}
                    >
                      ← Back to search
                    </button>
                  </div>
                ) : (
                  <SearchableDropdown
                    options={customerOptions}
                    value={form.customer_id}
                    onChange={(val) => setForm(f => ({ ...f, customer_id: val }))}
                    placeholder="Search customers..."
                    showAddNew
                    onAddNewClick={() => setShowAddCustomer(true)}
                  />
                )}
                {errors.customer && <p className="form-error">{errors.customer}</p>}
              </div>

              {/* Address */}
              <div>
                <label className="form-label">Address</label>
                <input
                  type="text"
                  className="input-field"
                  placeholder="Address"
                  value={showAddCustomer ? form.newCustomerAddress : form.address}
                  onChange={e => {
                    if (showAddCustomer) {
                      setForm(f => ({ ...f, newCustomerAddress: e.target.value }));
                    } else {
                      setForm(f => ({ ...f, address: e.target.value }));
                    }
                  }}
                  readOnly={!showAddCustomer && !form.customer_id}
                />
              </div>

              {/* Size */}
              <div>
                <label className="form-label">Size *</label>
                <select
                  className="select-field"
                  value={form.size}
                  onChange={e => setForm(f => ({ ...f, size: e.target.value }))}
                >
                  <option value="">Select size</option>
                  {SIZES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
                {errors.size && <p className="form-error">{errors.size}</p>}
              </div>

              {/* Quantity */}
              <div>
                <label className="form-label">Quantity (dozens) *</label>
                <input
                  type="number"
                  className="input-field"
                  placeholder="0.5"
                  min="0.5"
                  step="0.5"
                  value={form.quantity_dz}
                  onChange={e => setForm(f => ({ ...f, quantity_dz: e.target.value }))}
                />
                {errors.quantity_dz && <p className="form-error">{errors.quantity_dz}</p>}
              </div>

              {/* Amount */}
              <div>
                <label className="form-label">
                  Amount (₹) *
                  {form.size && form.quantity_dz && !editingId && (
                    <span className="ml-1 text-xs text-gray-400 dark:text-slate-500 font-normal">(auto-suggested)</span>
                  )}
                </label>
                <input
                  type="number"
                  className="input-field"
                  placeholder="0"
                  min="0"
                  step="1"
                  value={form.amount}
                  onChange={e => setForm(f => ({ ...f, amount: e.target.value }))}
                />
                {errors.amount && <p className="form-error">{errors.amount}</p>}
              </div>

              {/* Payment Status */}
              <div>
                <label className="form-label">Payment Status *</label>
                <select
                  className="select-field"
                  value={form.payment_status}
                  onChange={e => setForm(f => ({ ...f, payment_status: e.target.value }))}
                >
                  <option value="">Select status</option>
                  {PAYMENT_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
                {errors.payment_status && <p className="form-error">{errors.payment_status}</p>}
              </div>

              {/* Payment Method */}
              <div>
                <label className="form-label">Payment Method *</label>
                <select
                  className="select-field"
                  value={form.payment_method}
                  onChange={e => setForm(f => ({ ...f, payment_method: e.target.value }))}
                >
                  <option value="">Select method</option>
                  {PAYMENT_METHODS.map(m => <option key={m} value={m}>{m}</option>)}
                </select>
                {errors.payment_method && <p className="form-error">{errors.payment_method}</p>}
              </div>

              {/* Delivery Status */}
              <div>
                <label className="form-label">Delivery Status *</label>
                <select
                  className="select-field"
                  value={form.delivery_status}
                  onChange={e => setForm(f => ({ ...f, delivery_status: e.target.value }))}
                >
                  <option value="">Select status</option>
                  {DELIVERY_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
                {errors.delivery_status && <p className="form-error">{errors.delivery_status}</p>}
              </div>

              {/* Delivery Date — conditional */}
              {form.delivery_status === 'Scheduled' && (
                <div>
                  <label className="form-label">Delivery Date *</label>
                  <input
                    type="date"
                    className="input-field"
                    value={form.delivery_date}
                    onChange={e => setForm(f => ({ ...f, delivery_date: e.target.value }))}
                  />
                  {errors.delivery_date && <p className="form-error">{errors.delivery_date}</p>}
                </div>
              )}

              {/* Notes */}
              <div className={form.delivery_status !== 'Scheduled' ? 'lg:col-span-2' : ''}>
                <label className="form-label">Notes</label>
                <input
                  type="text"
                  className="input-field"
                  placeholder="Optional notes"
                  value={form.notes}
                  onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                />
              </div>
            </div>

            <div className="flex items-center gap-3 mt-5">
              <button type="submit" disabled={saving} className="btn-primary flex items-center gap-2">
                {saving && <Spinner size="sm" />}
                {editingId ? 'Update Order' : 'Add Sale'}
              </button>
              {editingId && (
                <button type="button" onClick={handleCancel} className="btn-secondary">Cancel</button>
              )}
            </div>
          </form>
        </div>
      </div>

      {/* Filters + Export */}
      <div className="card">
        <div className="card-body">
          <div className="flex flex-col lg:flex-row lg:items-end gap-4">
            {/* Search */}
            <div className="flex-1">
              <label className="form-label">Search</label>
              <input
                type="text"
                className="input-field"
                placeholder="Search by customer name or address..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
              />
            </div>
            {/* Date range */}
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
            {/* Size */}
            <div>
              <label className="form-label">Size</label>
              <select className="select-field" value={filterSize}
                onChange={e => setFilterSize(e.target.value)}>
                <option value="">All</option>
                {SIZES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            {/* Payment */}
            <div>
              <label className="form-label">Payment</label>
              <select className="select-field" value={filterPayment}
                onChange={e => setFilterPayment(e.target.value)}>
                <option value="">All</option>
                {PAYMENT_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            {/* Delivery */}
            <div>
              <label className="form-label">Delivery</label>
              <select className="select-field" value={filterDelivery}
                onChange={e => setFilterDelivery(e.target.value)}>
                <option value="">All</option>
                {DELIVERY_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            {/* Export */}
            <ExportButtons data={exportData} columns={exportColumns} fileName="sales_orders" title="Sales Orders Report" />
          </div>
        </div>
      </div>

      {/* Sales Table */}
      <div className="table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th>Sr.</th>
              <th>Date</th>
              <th>Customer</th>
              <th>Address</th>
              <th>Size</th>
              <th>Qty (dz)</th>
              <th>Amount (₹)</th>
              <th>Payment</th>
              <th>Method</th>
              <th>Delivery</th>
              <th>Del. Date</th>
              <th>Notes</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {paginatedOrders.length === 0 ? (
              <tr><td colSpan={13} className="text-center py-8 text-gray-400 dark:text-slate-500">No sales orders found</td></tr>
            ) : (
              paginatedOrders.map(order => (
                <tr key={order.order_id}>
                  <td className="font-medium">{order.serial_number}</td>
                  <td>{formatDate(order.date)}</td>
                  <td className="font-medium">{order.customers?.name || '—'}</td>
                  <td className="max-w-[150px] truncate">{order.customers?.address || '—'}</td>
                  <td>{order.size}</td>
                  <td>{order.quantity_dz}</td>
                  <td className="font-semibold">{formatCurrency(order.amount)}</td>
                  <td><StatusBadge status={order.payment_status} /></td>
                  <td>{order.payment_method || '—'}</td>
                  <td><StatusBadge status={order.delivery_status} /></td>
                  <td>{formatDate(order.delivery_date)}</td>
                  <td className="max-w-[120px] truncate">{order.notes || '—'}</td>
                  <td>
                    <div className="flex items-center gap-1">
                      <button onClick={() => handleEdit(order)} className="p-1.5 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/30 text-blue-600 dark:text-blue-400 transition-colors duration-200" title="Edit">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                            d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </button>
                      {isOwner && (
                        <button onClick={() => setDeleteTarget(order)} className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/30 text-red-600 dark:text-red-400 transition-colors duration-200" title="Delete">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                              d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <Pagination
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={setCurrentPage}
      />

      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete Sale Order"
        message={`Are you sure you want to delete sale #${deleteTarget?.serial_number}? This action cannot be undone.`}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
        loading={deleting}
      />
    </div>
  );
}
