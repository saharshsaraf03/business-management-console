/**
 * Calculate stock remaining per size.
 * @param {Array} purchases - stock_purchases rows
 * @param {Array} sales - sales_orders rows
 * @returns {Object} { Jumbo: { purchased, sold, remaining }, ... }
 */
export function calculateStockStatus(purchases, sales) {
  const sizes = ['Jumbo', 'Large', 'Medium', 'Small'];
  const sizeKeyMap = {
    Jumbo: 'jumbo_dz',
    Large: 'large_dz',
    Medium: 'medium_dz',
    Small: 'small_dz'
  };

  const result = {};

  sizes.forEach(size => {
    const purchased = (purchases || []).reduce(
      (sum, p) => sum + Number(p[sizeKeyMap[size]] || 0),
      0
    );
    const sold = (sales || [])
      .filter(s => s.size === size)
      .reduce((sum, s) => sum + Number(s.quantity_dz || 0), 0);
    const remaining = purchased - sold;
    const percentSold = purchased > 0 ? ((sold / purchased) * 100) : 0;

    result[size] = {
      purchased,
      sold,
      remaining,
      percentSold: Math.min(percentSold, 100).toFixed(1),
      lowStock: remaining < 5
    };
  });

  return result;
}

/**
 * Calculate total revenue (sum of amount where payment = 'Paid').
 */
export function calculateRevenue(sales) {
  return (sales || [])
    .filter(s => s.payment_status === 'Paid')
    .reduce((sum, s) => sum + Number(s.amount || 0), 0);
}

/**
 * Calculate COGS (sum of quantity_dz × cost_price for all sales regardless of payment).
 * @param {Array} sales
 * @param {Array} rates - mango_rates rows
 */
export function calculateCOGS(sales, rates) {
  const rateMap = {};
  (rates || []).forEach(r => { rateMap[r.size] = Number(r.cost_price_per_dz || 0); });

  return (sales || []).reduce((sum, s) => {
    const costPerDz = rateMap[s.size] || 0;
    return sum + (Number(s.quantity_dz || 0) * costPerDz);
  }, 0);
}

/**
 * Calculate gross profit and margin.
 */
export function calculateProfitability(revenue, cogs) {
  const grossProfit = revenue - cogs;
  const grossMargin = revenue > 0
    ? ((grossProfit / revenue) * 100).toFixed(2)
    : '0.00';
  return { grossProfit, grossMargin };
}

/**
 * Calculate outstanding dues (Due + Partial — full amount for Partial).
 */
export function calculateOutstandingDues(sales) {
  return (sales || [])
    .filter(s => s.payment_status === 'Due' || s.payment_status === 'Partial')
    .reduce((sum, s) => sum + Number(s.amount || 0), 0);
}

/**
 * Calculate daily sales velocity per size over the last 7 days.
 * @returns {Object} { Jumbo: number, Large: number, ... }
 */
export function calculateDailyVelocity(sales) {
  const sizes = ['Jumbo', 'Large', 'Medium', 'Small'];
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  const cutoff = sevenDaysAgo.toISOString().split('T')[0];

  const result = {};
  sizes.forEach(size => {
    const totalDz = (sales || [])
      .filter(s => s.size === size && s.date >= cutoff)
      .reduce((sum, s) => sum + Number(s.quantity_dz || 0), 0);
    result[size] = totalDz / 7;
  });

  return result;
}

/**
 * Calculate estimated days until stockout per size.
 * @returns {Object} { Jumbo: number|'∞', ... }
 */
export function calculateStockoutDays(stockStatus, velocity) {
  const sizes = ['Jumbo', 'Large', 'Medium', 'Small'];
  const result = {};

  sizes.forEach(size => {
    const remaining = stockStatus[size]?.remaining || 0;
    const vel = velocity[size] || 0;

    if (vel === 0) {
      result[size] = '∞';
    } else {
      result[size] = Math.round(remaining / vel);
    }
  });

  return result;
}

/**
 * Calculate projected revenue if all remaining stock is sold at current rates.
 */
export function calculateProjectedRevenue(stockStatus, rates) {
  const rateMap = {};
  (rates || []).forEach(r => { rateMap[r.size] = Number(r.sell_price_per_dz || 0); });

  const sizes = ['Jumbo', 'Large', 'Medium', 'Small'];
  return sizes.reduce((sum, size) => {
    const remaining = stockStatus[size]?.remaining || 0;
    const sellPrice = rateMap[size] || 0;
    return sum + (remaining > 0 ? remaining * sellPrice : 0);
  }, 0);
}

/**
 * Get profitability by size with margin details.
 */
export function calculateProfitabilityBySize(rates) {
  return (rates || []).map(r => {
    const sell = Number(r.sell_price_per_dz || 0);
    const cost = Number(r.cost_price_per_dz || 0);
    const profit = sell - cost;
    const margin = sell > 0 ? ((profit / sell) * 100).toFixed(2) : '0.00';
    return {
      size: r.size,
      sellPrice: sell,
      costPrice: cost,
      profitPerDz: profit,
      margin
    };
  });
}

/**
 * Get daily revenue data for last N days for chart.
 */
export function getDailyRevenueData(sales, days = 30) {
  const result = [];
  const today = new Date();

  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().split('T')[0];
    const dayLabel = `${d.getDate()}/${d.getMonth() + 1}`;

    const dayRevenue = (sales || [])
      .filter(s => s.date === dateStr && s.payment_status === 'Paid')
      .reduce((sum, s) => sum + Number(s.amount || 0), 0);

    result.push({ date: dayLabel, revenue: dayRevenue });
  }

  return result;
}

/**
 * Get revenue split by size for donut chart.
 */
export function getRevenueBySizeData(sales) {
  const sizes = ['Jumbo', 'Large', 'Medium', 'Small'];
  const colors = ['#166534', '#15803d', '#d97706', '#f59e0b'];

  return sizes.map((size, i) => {
    const revenue = (sales || [])
      .filter(s => s.size === size && s.payment_status === 'Paid')
      .reduce((sum, s) => sum + Number(s.amount || 0), 0);
    return { name: size, value: revenue, fill: colors[i] };
  });
}

/**
 * Get top N customers by total order value.
 */
export function getTopCustomers(sales, customers, n = 5) {
  const customerTotals = {};

  (sales || []).forEach(s => {
    if (!s.customer_id) return;
    if (!customerTotals[s.customer_id]) {
      customerTotals[s.customer_id] = { total: 0, name: '' };
    }
    customerTotals[s.customer_id].total += Number(s.amount || 0);
  });

  // Map customer names
  (customers || []).forEach(c => {
    if (customerTotals[c.customer_id]) {
      customerTotals[c.customer_id].name = c.name;
    }
  });

  return Object.values(customerTotals)
    .sort((a, b) => b.total - a.total)
    .slice(0, n);
}

/**
 * Get total operating expenses.
 */
export function getTotalExpenses(expenses = []) {
  return expenses.reduce((sum, e) => sum + (parseFloat(e.amount) || 0), 0);
}

/**
 * Get net profit (gross profit minus expenses).
 */
export function getNetProfit(grossProfit, totalExpenses) {
  return grossProfit - totalExpenses;
}

/**
 * Get net margin as a percentage.
 */
export function getNetMargin(netProfit, revenue) {
  if (!revenue || revenue === 0) return 0;
  return (netProfit / revenue) * 100;
}

/**
 * Get expenses grouped by category.
 */
export function getExpensesByCategory(expenses = []) {
  const categories = { Transport: 0, Packaging: 0, Labor: 0, Other: 0 };
  expenses.forEach(e => {
    if (categories[e.category] !== undefined) {
      categories[e.category] += parseFloat(e.amount) || 0;
    }
  });
  return categories;
}
