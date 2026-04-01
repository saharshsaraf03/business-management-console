import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { useApp } from '../context/AppContext';
import { PageSpinner } from '../components/Spinner';
import Spinner from '../components/Spinner';
import StatusBadge from '../components/StatusBadge';
import ConfirmDialog from '../components/ConfirmDialog';
import { formatDate } from '../utils/formatCurrency';

export default function ManageUsers() {
  const { user, addToast } = useApp();
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [toggling, setToggling] = useState(null);
  const [form, setForm] = useState({ full_name: '', email: '', password: '' });
  const [errors, setErrors] = useState({});

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      setUsers(data || []);
    } catch (err) {
      addToast('Failed to load users: ' + err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const validate = () => {
    const errs = {};
    if (!form.full_name.trim()) errs.full_name = 'Full name is required';
    if (!form.email.trim()) errs.email = 'Email is required';
    else if (!/\S+@\S+\.\S+/.test(form.email)) errs.email = 'Enter a valid email address';
    if (!form.password) errs.password = 'Password is required';
    else if (form.password.length < 6) errs.password = 'Password must be at least 6 characters';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleCreateUser = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    setSaving(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;

      if (!token) {
        addToast('Authentication error. Please log in again.', 'error');
        setSaving(false);
        return;
      }

      // Call the Edge Function
      const response = await fetch(
        `${supabase.supabaseUrl}/functions/v1/create-user`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
            'apikey': supabase.supabaseKey
          },
          body: JSON.stringify({
            full_name: form.full_name.trim(),
            email: form.email.trim(),
            password: form.password
          })
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to create user');
      }

      addToast(`Employee "${form.full_name.trim()}" created successfully`);
      setForm({ full_name: '', email: '', password: '' });
      setShowAddForm(false);
      setErrors({});

      // Wait a moment for the trigger to create the profile, then refresh
      setTimeout(fetchUsers, 1000);
    } catch (err) {
      addToast('Error creating user: ' + err.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (profile) => {
    // Prevent self-deactivation
    if (profile.id === user.id) {
      addToast('You cannot deactivate your own account', 'warning');
      return;
    }

    setToggling(profile.id);
    try {
      const newStatus = !profile.is_active;
      const { error } = await supabase
        .from('profiles')
        .update({ is_active: newStatus })
        .eq('id', profile.id);

      if (error) throw error;
      addToast(`User ${newStatus ? 'activated' : 'deactivated'} successfully`);
      await fetchUsers();
    } catch (err) {
      addToast('Error updating user status: ' + err.message, 'error');
    } finally {
      setToggling(null);
    }
  };

  if (loading) return <PageSpinner />;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <h1 className="page-title mb-0">Manage Users</h1>
        {!showAddForm && (
          <button onClick={() => setShowAddForm(true)} className="btn-primary flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
            </svg>
            Add Employee
          </button>
        )}
      </div>

      {/* Add Employee Form */}
      {showAddForm && (
        <div className="card animate-slide-up">
          <div className="card-header">
            <h2 className="section-title">Add New Employee</h2>
            <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">The employee will be able to log in immediately with these credentials</p>
          </div>
          <div className="card-body">
            <form onSubmit={handleCreateUser}>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="form-label">Full Name *</label>
                  <input type="text" className="input-field" placeholder="Employee name"
                    value={form.full_name}
                    onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))} />
                  {errors.full_name && <p className="form-error">{errors.full_name}</p>}
                </div>
                <div>
                  <label className="form-label">Email *</label>
                  <input type="email" className="input-field" placeholder="employee@example.com"
                    value={form.email}
                    onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
                  {errors.email && <p className="form-error">{errors.email}</p>}
                </div>
                <div>
                  <label className="form-label">Password *</label>
                  <input type="password" className="input-field" placeholder="Min 6 characters"
                    value={form.password}
                    onChange={e => setForm(f => ({ ...f, password: e.target.value }))} />
                  {errors.password && <p className="form-error">{errors.password}</p>}
                </div>
              </div>
              <div className="flex items-center gap-3 mt-4">
                <button type="submit" disabled={saving} className="btn-primary flex items-center gap-2">
                  {saving && <Spinner size="sm" />}
                  Create Employee
                </button>
                <button type="button" onClick={() => { setShowAddForm(false); setErrors({}); setForm({ full_name: '', email: '', password: '' }); }}
                  className="btn-secondary">
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Users Table */}
      <div className="table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th>Full Name</th>
              <th>Role</th>
              <th>Status</th>
              <th>Date Created</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.length === 0 ? (
              <tr><td colSpan={5} className="text-center py-8 text-gray-400 dark:text-slate-500">No users found</td></tr>
            ) : (
              users.map(u => (
                <tr key={u.id}>
                  <td>
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-green-100 dark:bg-green-900/40 flex items-center justify-center">
                        <span className="text-green-800 dark:text-green-400 text-sm font-bold">
                          {(u.full_name || '?')[0].toUpperCase()}
                        </span>
                      </div>
                      <div>
                        <p className="font-medium text-gray-900 dark:text-slate-100">{u.full_name}</p>
                        {u.id === user.id && (
                          <span className="text-xs text-gray-400 dark:text-slate-500">(You)</span>
                        )}
                      </div>
                    </div>
                  </td>
                  <td><StatusBadge status={u.role} /></td>
                  <td><StatusBadge status={u.is_active ? 'Active' : 'Inactive'} /></td>
                  <td>{formatDate(u.created_at)}</td>
                  <td>
                    {u.id !== user.id && u.role !== 'owner' && (
                      <button
                        onClick={() => handleToggleActive(u)}
                        disabled={toggling === u.id}
                        className={`text-sm font-medium px-3 py-1 rounded-lg transition-colors duration-200 ${
                          u.is_active
                            ? 'text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 border border-red-200 dark:border-red-800'
                            : 'text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/20 border border-green-200 dark:border-green-800'
                        }`}
                      >
                        {toggling === u.id ? (
                          <Spinner size="sm" />
                        ) : (
                          u.is_active ? 'Deactivate' : 'Activate'
                        )}
                      </button>
                    )}
                    {u.id === user.id && (
                      <span className="text-xs text-gray-400 dark:text-slate-500 italic">Cannot modify self</span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
