import { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { supabase } from '../supabaseClient';
import { PageSpinner } from '../components/Spinner';
import KPICard from '../components/KPICard';
import StockCard from '../components/StockCard';
import StatusBadge from '../components/StatusBadge';
import { formatCurrency, formatDate } from '../utils/formatCurrency';
import {
  calculateStockStatus, calculateRevenue, calculateCOGS,
  calculateProfitability, calculateOutstandingDues, calculateDailyVelocity,
  calculateStockoutDays, calculateProjectedRevenue, calculateProfitabilityBySize,
  getDailyRevenueData, getRevenueBySizeData, getTopCustomers,
  getTotalExpenses, getNetProfit, getNetMargin, getExpensesByCategory
} from '../utils/calculations';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from 'recharts';

export default function Dashboard() {
  const { user, isOwner, mangoRates, addToast } = useApp();
  const [loading, setLoading] = useState(true);
  const [sales, setSales] = useState([]);
  const [purchases, setPurchases] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [stockStatus, setStockStatus] = useState({});
  const [kpis, setKpis] = useState({});
  const [chartData, setChartData] = useState({ daily: [], bySize: [], topCustomers: [] });
  const [predictions, setPredictions] = useState({});
  const [profitBySize, setProfitBySize] = useState([]);
  const [pendingActions, setPendingActions] = useState({ unpaid: [], scheduledDeliveries: [], supplierDues: [] });
  const [expenses, setExpenses] = useState([]);

  useEffect(() => {
    fetchDashboardData();
  }, [mangoRates]);

  // Fetch expenses separately
  useEffect(() => {
    const fetchExpenses = async () => {
      const { data, error } = await supabase
        .from('expenses')
        .select('*');
      if (!error && data) setExpenses(data);
    };
    if (user) fetchExpenses();
  }, [user]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const [salesRes, purchasesRes, customersRes] = await Promise.all([
        supabase.from('sales_orders').select('*, customers(name, address)').order('date', { ascending: false }),
        supabase.from('stock_purchases').select('*, suppliers(name)').order('date', { ascending: false }),
        supabase.from('customers').select('*')
      ]);

      if (salesRes.error) throw salesRes.error;
      if (purchasesRes.error) throw purchasesRes.error;
      if (customersRes.error) throw customersRes.error;

      const allSales = salesRes.data || [];
      const allPurchases = purchasesRes.data || [];
      const allCustomers = customersRes.data || [];

      setSales(allSales);
      setPurchases(allPurchases);
      setCustomers(allCustomers);

      // Stock status
      const stock = calculateStockStatus(allPurchases, allSales);
      setStockStatus(stock);

      // KPIs
      const revenue = calculateRevenue(allSales);
      const cogs = calculateCOGS(allSales, mangoRates);
      const { grossProfit, grossMargin } = calculateProfitability(revenue, cogs);
      const outstandingDues = calculateOutstandingDues(allSales);
      setKpis({ revenue, cogs, grossProfit, grossMargin, outstandingDues });

      // Charts
      const dailyRevenue = getDailyRevenueData(allSales, 30);
      const revBySize = getRevenueBySizeData(allSales);
      const topCust = getTopCustomers(allSales, allCustomers, 5);
      setChartData({ daily: dailyRevenue, bySize: revBySize, topCustomers: topCust });

      // Profitability by size
      const profBySz = calculateProfitabilityBySize(mangoRates);
      setProfitBySize(profBySz);

      // Predictions
      const velocity = calculateDailyVelocity(allSales);
      const stockoutDays = calculateStockoutDays(stock, velocity);
      const projectedRevenue = calculateProjectedRevenue(stock, mangoRates);
      setPredictions({ velocity, stockoutDays, projectedRevenue });

      // Pending actions
      const unpaid = allSales
        .filter(s => s.payment_status === 'Due' || s.payment_status === 'Partial')
        .slice(0, 10);

      const scheduledDeliveries = allSales
        .filter(s => s.delivery_status === 'Scheduled' && s.delivery_date)
        .sort((a, b) => new Date(a.delivery_date) - new Date(b.delivery_date))
        .slice(0, 10);

      const supplierDues = allPurchases
        .filter(p => {
          const due = Number(p.total_amount || 0) - Number(p.amount_paid || 0);
          return due > 0;
        })
        .slice(0, 10);

      setPendingActions({ unpaid, scheduledDeliveries, supplierDues });

    } catch (err) {
      addToast('Failed to load dashboard data: ' + err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <PageSpinner />;

  const DONUT_COLORS = ['#166534', '#15803d', '#d97706', '#f59e0b'];
  const sizes = ['Jumbo', 'Large', 'Medium', 'Small'];
  const highestMarginSize = profitBySize.length > 0
    ? profitBySize.reduce((max, s) => Number(s.margin) > Number(max.margin) ? s : max, profitBySize[0])
    : null;

  // Expense-derived KPIs
  const totalExpenses = getTotalExpenses(expenses);
  const netProfit = getNetProfit(kpis.grossProfit || 0, totalExpenses);
  const netMargin = getNetMargin(netProfit, kpis.revenue || 0);
  const expensesByCategory = getExpensesByCategory(expenses);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* KPI Cards — Row 1 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <KPICard title="Total Revenue" value={kpis.revenue} icon="₹" color="primary" />
        <KPICard title="Cost of Goods Sold" value={kpis.cogs} icon="📦" color="blue" />
        <KPICard
          title="Gross Profit & Margin"
          value={isOwner ? kpis.grossProfit : 0}
          icon="📈"
          color="accent"
          locked={!isOwner}
          subtitle={isOwner ? `Margin: ${kpis.grossMargin}%` : undefined}
        />
        <KPICard title="Outstanding Dues" value={kpis.outstandingDues} icon="⏳" color="red" />
      </div>

      {/* KPI Cards — Row 2 (Expense-based) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        {/* Operating Expenses */}
        {isOwner ? (
          <div className="bg-white dark:bg-slate-800 rounded-xl p-6 border border-gray-200 dark:border-slate-700 shadow-sm hover:shadow-md dark:shadow-none transition-all duration-300 hover:-translate-y-0.5 border-t-4 border-t-orange-500">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-medium text-gray-500 dark:text-slate-400 mb-2">Operating Expenses</p>
              <div className="p-3 rounded-xl bg-orange-100 dark:bg-orange-900/40 text-orange-700 dark:text-orange-400">
                <span className="text-lg">💸</span>
              </div>
            </div>
            <p className="text-3xl font-bold text-gray-900 dark:text-slate-100 animate-count">{formatCurrency(totalExpenses)}</p>
            <p className="text-xs text-gray-500 dark:text-slate-400 mt-1">{expenses.length} expense entries</p>
          </div>
        ) : (
          <div className="bg-white dark:bg-slate-800 rounded-xl p-6 border border-gray-200 dark:border-slate-700 shadow-sm dark:shadow-none transition-all duration-300 border-t-4 border-t-gray-300 dark:border-t-slate-600">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-medium text-gray-500 dark:text-slate-400 mb-2">Operating Expenses</p>
              <div className="p-3 rounded-xl bg-gray-100 dark:bg-slate-700">
                <svg className="w-5 h-5 text-gray-400 dark:text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
            </div>
            <p className="text-sm text-gray-400 dark:text-slate-500 italic">Owner access only</p>
          </div>
        )}

        {/* True Net Profit */}
        {isOwner ? (
          <div className="bg-white dark:bg-slate-800 rounded-xl p-6 border border-gray-200 dark:border-slate-700 shadow-sm hover:shadow-md dark:shadow-none transition-all duration-300 hover:-translate-y-0.5 border-t-4 border-t-teal-500">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-medium text-gray-500 dark:text-slate-400 mb-2">True Net Profit</p>
              <div className="p-3 rounded-xl bg-teal-100 dark:bg-teal-900/40 text-teal-700 dark:text-teal-400">
                <span className="text-lg">💰</span>
              </div>
            </div>
            <p className={`text-3xl font-bold animate-count ${netProfit >= 0 ? 'text-green-700 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
              {formatCurrency(netProfit)}
            </p>
            <p className="text-xs text-gray-500 dark:text-slate-400 mt-1">Net Margin: {netMargin.toFixed(2)}%</p>
          </div>
        ) : (
          <div className="bg-white dark:bg-slate-800 rounded-xl p-6 border border-gray-200 dark:border-slate-700 shadow-sm dark:shadow-none transition-all duration-300 border-t-4 border-t-gray-300 dark:border-t-slate-600">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-medium text-gray-500 dark:text-slate-400 mb-2">True Net Profit</p>
              <div className="p-3 rounded-xl bg-gray-100 dark:bg-slate-700">
                <svg className="w-5 h-5 text-gray-400 dark:text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
            </div>
            <p className="text-sm text-gray-400 dark:text-slate-500 italic">Owner access only</p>
          </div>
        )}
      </div>

      {/* Stock Status */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 dark:text-slate-100 mb-4">Stock Status</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {sizes.map(size => (
            <StockCard key={size} size={size} {...(stockStatus[size] || {})} />
          ))}
        </div>
      </div>

      {/* Expense Breakdown — Owner only */}
      {isOwner && expenses.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-slate-100 mb-4">Expense Breakdown</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { cat: 'Transport', icon: '🚛', bg: 'bg-amber-100 dark:bg-amber-900/40', text: 'text-amber-700 dark:text-amber-400', border: 'border-amber-200 dark:border-amber-800' },
              { cat: 'Packaging', icon: '📦', bg: 'bg-blue-100 dark:bg-blue-900/40', text: 'text-blue-700 dark:text-blue-400', border: 'border-blue-200 dark:border-blue-800' },
              { cat: 'Labor', icon: '👷', bg: 'bg-purple-100 dark:bg-purple-900/40', text: 'text-purple-700 dark:text-purple-400', border: 'border-purple-200 dark:border-purple-800' },
              { cat: 'Other', icon: '📋', bg: 'bg-gray-100 dark:bg-slate-700', text: 'text-gray-700 dark:text-slate-300', border: 'border-gray-200 dark:border-slate-600' }
            ].map(({ cat, icon, bg, text, border }) => (
              <div key={cat} className={`bg-white dark:bg-slate-800 rounded-xl p-4 border ${border} shadow-sm dark:shadow-none transition-all duration-300`}>
                <div className="flex items-center gap-2 mb-2">
                  <div className={`w-8 h-8 rounded-lg ${bg} flex items-center justify-center`}>
                    <span className="text-sm">{icon}</span>
                  </div>
                  <span className={`text-sm font-medium ${text}`}>{cat}</span>
                </div>
                <p className="text-xl font-bold text-gray-900 dark:text-slate-100">{formatCurrency(expensesByCategory[cat] || 0)}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Sales Analytics */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Daily Revenue Chart */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm dark:shadow-none p-6 transition-colors duration-300">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-slate-100 mb-4">Daily Revenue (Last 30 Days)</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={chartData.daily} style={{ background: 'transparent' }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} interval="preserveStartEnd" />
              <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `₹${(v/1000).toFixed(0)}k`} />
              <Tooltip
                formatter={(val) => [`₹${Number(val).toLocaleString('en-IN')}`, 'Revenue']}
                contentStyle={{ borderRadius: 8, border: '1px solid #e5e7eb', fontSize: 12 }}
              />
              <Line
                type="monotone"
                dataKey="revenue"
                stroke="#166534"
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 5, fill: '#166534' }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Revenue by Size Donut */}
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm dark:shadow-none p-6 transition-colors duration-300">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-slate-100 mb-4">Revenue by Size</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart style={{ background: 'transparent' }}>
              <Pie
                data={chartData.bySize}
                innerRadius={60}
                outerRadius={90}
                paddingAngle={4}
                dataKey="value"
              >
                {chartData.bySize.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={DONUT_COLORS[index]} />
                ))}
              </Pie>
              <Tooltip formatter={(val) => formatCurrency(val)} />
              <Legend
                verticalAlign="bottom"
                iconType="circle"
                formatter={(value) => <span className="text-xs text-gray-600 dark:text-slate-400">{value}</span>}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Top 5 Customers */}
      <div className="card">
        <div className="card-header">
          <h3 className="section-title">Top 5 Customers by Order Value</h3>
        </div>
        <div className="card-body">
          {chartData.topCustomers.length === 0 ? (
            <p className="text-sm text-gray-400 dark:text-slate-500">No sales data yet</p>
          ) : (
            <div className="space-y-3">
              {chartData.topCustomers.map((c, i) => (
                <div key={i} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                      i === 0 ? 'bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-400' : 'bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-slate-400'
                    }`}>
                      {i + 1}
                    </span>
                    <span className="text-sm font-medium text-gray-900 dark:text-slate-100">{c.name || 'Unknown'}</span>
                  </div>
                  <span className="text-sm font-semibold text-gray-700 dark:text-slate-300">{formatCurrency(c.total)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Profitability by Size - Owner only */}
      {isOwner && (
        <div className="card">
          <div className="card-header">
            <h3 className="section-title">Profitability by Size</h3>
          </div>
          <div className="card-body overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Size</th>
                  <th>Cost/dz</th>
                  <th>Sell/dz</th>
                  <th>Profit/dz</th>
                  <th>Margin %</th>
                </tr>
              </thead>
              <tbody>
                {profitBySize.map(s => (
                  <tr key={s.size}>
                    <td className="font-medium">
                      {s.size}
                      {highestMarginSize && highestMarginSize.size === s.size && (
                        <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-400">
                          Highest Margin
                        </span>
                      )}
                    </td>
                    <td>{formatCurrency(s.costPrice)}</td>
                    <td>{formatCurrency(s.sellPrice)}</td>
                    <td className="font-semibold text-green-700 dark:text-green-400">{formatCurrency(s.profitPerDz)}</td>
                    <td className="font-bold">{s.margin}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Predictions */}
      <div className="card">
        <div className="card-header">
          <h3 className="section-title">Predictions & Velocity</h3>
        </div>
        <div className="card-body">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Projected Revenue */}
            <div className="bg-green-50 dark:bg-green-900/20 rounded-xl p-4 border border-green-100 dark:border-green-900/40 transition-colors duration-200">
              <p className="text-xs font-medium text-green-600 dark:text-green-400 uppercase tracking-wider mb-1">Projected Revenue</p>
              <p className="text-2xl font-bold text-green-800 dark:text-green-300">{formatCurrency(predictions.projectedRevenue || 0)}</p>
              <p className="text-xs text-green-500 dark:text-green-500 mt-1">If all remaining stock sold at current rates</p>
            </div>

            {/* Average Daily Velocity */}
            <div className="bg-amber-50 dark:bg-amber-900/20 rounded-xl p-4 border border-amber-100 dark:border-amber-900/40 transition-colors duration-200">
              <p className="text-xs font-medium text-amber-600 dark:text-amber-400 uppercase tracking-wider mb-2">Avg Daily Velocity (last 7 days)</p>
              <div className="space-y-1">
                {sizes.map(size => (
                  <div key={size} className="flex justify-between text-sm">
                    <span className="text-gray-600 dark:text-slate-400">{size}</span>
                    <span className="font-medium text-gray-900 dark:text-slate-100">{(predictions.velocity?.[size] || 0).toFixed(1)} dz/day</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Stockout Estimates */}
            <div className="bg-gray-50 dark:bg-slate-700/50 rounded-xl p-4 border border-gray-200 dark:border-slate-600 transition-colors duration-200">
              <p className="text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wider mb-2">Est. Days Until Stockout</p>
              <div className="space-y-1">
                {sizes.map(size => {
                  const days = predictions.stockoutDays?.[size];
                  const isUrgent = typeof days === 'number' && days < 7;
                  return (
                    <div key={size} className="flex justify-between text-sm">
                      <span className="text-gray-600 dark:text-slate-400">{size}</span>
                      <span className={`font-medium ${isUrgent ? 'text-red-600 dark:text-red-400' : 'text-gray-900 dark:text-slate-100'}`}>
                        {days === '∞' ? '∞' : `${days} days`}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Pending Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Unpaid / Partial Orders */}
        <div className="card border-l-4 border-l-red-500">
          <div className="card-header flex items-center justify-between">
            <h3 className="section-title text-base">Unpaid Orders</h3>
            <span className="bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-400 text-xs font-bold px-2 py-0.5 rounded-full">
              {pendingActions.unpaid.length}
            </span>
          </div>
          <div className="card-body max-h-64 overflow-y-auto">
            {pendingActions.unpaid.length === 0 ? (
              <p className="text-sm text-gray-400 dark:text-slate-500">All orders are paid ✓</p>
            ) : (
              <div className="space-y-3">
                {pendingActions.unpaid.map(order => (
                  <div key={order.order_id} className="flex items-center justify-between text-sm">
                    <div>
                      <p className="font-medium text-gray-900 dark:text-slate-100">{order.customers?.name || 'Unknown'}</p>
                      <p className="text-xs text-gray-400 dark:text-slate-500">{formatDate(order.date)}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-red-600 dark:text-red-400">{formatCurrency(order.amount)}</p>
                      <StatusBadge status={order.payment_status} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Scheduled Deliveries */}
        <div className="card border-l-4 border-l-blue-500">
          <div className="card-header flex items-center justify-between">
            <h3 className="section-title text-base">Scheduled Deliveries</h3>
            <span className="bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-400 text-xs font-bold px-2 py-0.5 rounded-full">
              {pendingActions.scheduledDeliveries.length}
            </span>
          </div>
          <div className="card-body max-h-64 overflow-y-auto">
            {pendingActions.scheduledDeliveries.length === 0 ? (
              <p className="text-sm text-gray-400 dark:text-slate-500">No scheduled deliveries</p>
            ) : (
              <div className="space-y-3">
                {pendingActions.scheduledDeliveries.map(order => (
                  <div key={order.order_id} className="flex items-center justify-between text-sm">
                    <div>
                      <p className="font-medium text-gray-900 dark:text-slate-100">{order.customers?.name || 'Unknown'}</p>
                      <p className="text-xs text-gray-400 dark:text-slate-500">{order.size} · {order.quantity_dz} dz</p>
                    </div>
                    <p className="text-sm font-medium text-blue-600 dark:text-blue-400">{formatDate(order.delivery_date)}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Supplier Dues */}
        <div className="card border-l-4 border-l-amber-500">
          <div className="card-header flex items-center justify-between">
            <h3 className="section-title text-base">Supplier Dues</h3>
            <span className="bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-400 text-xs font-bold px-2 py-0.5 rounded-full">
              {pendingActions.supplierDues.length}
            </span>
          </div>
          <div className="card-body max-h-64 overflow-y-auto">
            {pendingActions.supplierDues.length === 0 ? (
              <p className="text-sm text-gray-400 dark:text-slate-500">No outstanding supplier payments</p>
            ) : (
              <div className="space-y-3">
                {pendingActions.supplierDues.map(p => {
                  const due = Number(p.total_amount || 0) - Number(p.amount_paid || 0);
                  return (
                    <div key={p.purchase_id} className="flex items-center justify-between text-sm">
                      <div>
                        <p className="font-medium text-gray-900 dark:text-slate-100">{p.suppliers?.name || 'Unknown'}</p>
                        <p className="text-xs text-gray-400 dark:text-slate-500">{formatDate(p.date)}</p>
                      </div>
                      <p className="font-semibold text-amber-600 dark:text-amber-400">{formatCurrency(due)}</p>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
