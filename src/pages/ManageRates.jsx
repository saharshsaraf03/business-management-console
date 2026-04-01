import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { useApp } from '../context/AppContext';
import { PageSpinner } from '../components/Spinner';
import Spinner from '../components/Spinner';
import { formatCurrency, formatDate } from '../utils/formatCurrency';

const SIZES = ['Jumbo', 'Large', 'Medium', 'Small'];

export default function ManageRates() {
  const { user, mangoRates, fetchMangoRates, addToast } = useApp();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [rates, setRates] = useState({});
  const [history, setHistory] = useState([]);
  const [historyProfiles, setHistoryProfiles] = useState({});

  useEffect(() => {
    fetchData();
  }, [mangoRates]);

  const fetchData = async () => {
    try {
      setLoading(true);

      // Initialize rate form from context
      const rateForm = {};
      mangoRates.forEach(r => {
        rateForm[r.size] = {
          rate_id: r.rate_id,
          sell_price_per_dz: String(r.sell_price_per_dz),
          cost_price_per_dz: String(r.cost_price_per_dz)
        };
      });
      setRates(rateForm);

      // Fetch rate history
      const { data: histData, error: histErr } = await supabase
        .from('rate_history')
        .select('*')
        .order('changed_at', { ascending: false })
        .limit(10);

      if (histErr) throw histErr;
      setHistory(histData || []);

      // Fetch profile names for history
      const userIds = [...new Set((histData || []).map(h => h.changed_by).filter(Boolean))];
      if (userIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, full_name')
          .in('id', userIds);
        const profileMap = {};
        (profiles || []).forEach(p => { profileMap[p.id] = p.full_name; });
        setHistoryProfiles(profileMap);
      }
    } catch (err) {
      addToast('Failed to load rates: ' + err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      for (const size of SIZES) {
        const current = mangoRates.find(r => r.size === size);
        const updated = rates[size];
        if (!current || !updated) continue;

        const newSell = Number(updated.sell_price_per_dz);
        const newCost = Number(updated.cost_price_per_dz);
        const oldSell = Number(current.sell_price_per_dz);
        const oldCost = Number(current.cost_price_per_dz);

        // Only update if changed
        if (newSell !== oldSell || newCost !== oldCost) {
          // Update rate
          const { error: updateErr } = await supabase
            .from('mango_rates')
            .update({
              sell_price_per_dz: newSell,
              cost_price_per_dz: newCost,
              updated_at: new Date().toISOString(),
              updated_by: user.id
            })
            .eq('rate_id', current.rate_id);

          if (updateErr) throw updateErr;

          // Log history
          const { error: histErr } = await supabase
            .from('rate_history')
            .insert({
              size,
              old_sell: oldSell,
              new_sell: newSell,
              old_cost: oldCost,
              new_cost: newCost,
              changed_by: user.id
            });

          if (histErr) throw histErr;
        }
      }

      addToast('Rates updated successfully');
      await fetchMangoRates();
      await fetchData();
    } catch (err) {
      addToast('Error updating rates: ' + err.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <PageSpinner />;

  return (
    <div className="space-y-6 animate-fade-in">
      <h1 className="page-title">Manage Rates</h1>

      {/* Rate Form */}
      <div className="card">
        <div className="card-header">
          <h2 className="section-title">Current Mango Rates</h2>
          <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">These rates drive the auto-suggest pricing in sales and all profit calculations</p>
        </div>
        <div className="card-body">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {SIZES.map(size => (
              <div key={size} className="bg-gray-50 dark:bg-slate-700/50 rounded-xl p-4 border border-gray-200 dark:border-slate-600 transition-colors duration-200">
                <div className="flex items-center gap-2 mb-4">
                  <div className={`w-3 h-3 rounded-full ${
                    size === 'Jumbo' ? 'bg-primary-800' :
                    size === 'Large' ? 'bg-primary-600' :
                    size === 'Medium' ? 'bg-accent-600' : 'bg-amber-500'
                  }`} />
                  <h3 className="font-semibold text-gray-900 dark:text-slate-100">{size}</h3>
                </div>
                <div className="space-y-3">
                  <div>
                    <label className="text-xs font-medium text-gray-500 dark:text-slate-400 uppercase">Sell Price / dz (₹)</label>
                    <input
                      type="number"
                      className="input-field mt-1"
                      min="0"
                      step="1"
                      value={rates[size]?.sell_price_per_dz || ''}
                      onChange={e => setRates(r => ({
                        ...r,
                        [size]: { ...r[size], sell_price_per_dz: e.target.value }
                      }))}
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-500 dark:text-slate-400 uppercase">Cost Price / dz (₹)</label>
                    <input
                      type="number"
                      className="input-field mt-1"
                      min="0"
                      step="1"
                      value={rates[size]?.cost_price_per_dz || ''}
                      onChange={e => setRates(r => ({
                        ...r,
                        [size]: { ...r[size], cost_price_per_dz: e.target.value }
                      }))}
                    />
                  </div>
                  {rates[size] && (
                    <div className="pt-2 border-t border-gray-200 dark:border-slate-600">
                      <div className="flex justify-between text-xs">
                        <span className="text-gray-500 dark:text-slate-400">Profit/dz</span>
                        <span className="font-bold text-green-700 dark:text-green-400">
                          {formatCurrency(Number(rates[size].sell_price_per_dz || 0) - Number(rates[size].cost_price_per_dz || 0))}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          <div className="mt-6">
            <button onClick={handleSave} disabled={saving} className="btn-primary flex items-center gap-2">
              {saving && <Spinner size="sm" />}
              Save All Rates
            </button>
          </div>
        </div>
      </div>

      {/* Rate Change History */}
      <div className="card">
        <div className="card-header">
          <h2 className="section-title">Rate Change History (Last 10)</h2>
        </div>
        <div className="card-body overflow-x-auto">
          {history.length === 0 ? (
            <p className="text-sm text-gray-400 dark:text-slate-500">No rate changes recorded yet</p>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Size</th>
                  <th>Old Sell</th>
                  <th>New Sell</th>
                  <th>Old Cost</th>
                  <th>New Cost</th>
                  <th>Changed At</th>
                  <th>Changed By</th>
                </tr>
              </thead>
              <tbody>
                {history.map(h => (
                  <tr key={h.rate_history_id}>
                    <td className="font-medium">{h.size}</td>
                    <td>{formatCurrency(h.old_sell)}</td>
                    <td className={Number(h.new_sell) !== Number(h.old_sell) ? 'font-bold text-green-700 dark:text-green-400' : ''}>
                      {formatCurrency(h.new_sell)}
                    </td>
                    <td>{formatCurrency(h.old_cost)}</td>
                    <td className={Number(h.new_cost) !== Number(h.old_cost) ? 'font-bold text-amber-700 dark:text-amber-400' : ''}>
                      {formatCurrency(h.new_cost)}
                    </td>
                    <td>{new Date(h.changed_at).toLocaleString('en-IN')}</td>
                    <td>{historyProfiles[h.changed_by] || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
