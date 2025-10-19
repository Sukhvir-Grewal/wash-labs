import { useEffect, useMemo, useState } from 'react';
import { Bar } from 'react-chartjs-2';
import { Chart, CategoryScale, LinearScale, BarElement, Tooltip, Legend } from 'chart.js';
Chart.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend);

function getMonthKey(dateStr) {
  // bookings have YYYY-MM-DD; expenses use same
  return (dateStr || '').slice(0,7); // YYYY-MM
}

export default function ProfitsCard({ bookings }) {
  const [expenses, setExpenses] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/expenses');
        const data = await res.json();
        if (res.ok && data.success) setExpenses(data.items || []);
        else setError(data.error || 'Failed to load expenses');
      } catch (e) { setError(e.message || 'Failed to load expenses'); }
    })();
  }, []);

  const monthly = useMemo(() => {
    const rev = {}; // completed revenue by month
    const exp = {}; // expenses by month
    (bookings || []).forEach(b => {
      if (b.status !== 'complete') return;
      const key = getMonthKey(b.date);
      if (!rev[key]) rev[key] = 0;
      const amt = Number(b.amount || 0) || 0;
      rev[key] += amt;
    });
    (expenses || []).forEach(it => {
      const key = getMonthKey(it.date);
      if (!exp[key]) exp[key] = 0;
      exp[key] += Number(it.amount || 0) || 0;
    });
    const keys = Array.from(new Set([...Object.keys(rev), ...Object.keys(exp)])).sort();
    const profit = {};
    keys.forEach(k => { profit[k] = (rev[k] || 0) - (exp[k] || 0); });
    return { keys, rev, exp, profit };
  }, [bookings, expenses]);

  const totalProfit = useMemo(() => monthly.keys.reduce((s,k)=> s + (monthly.profit[k] || 0), 0), [monthly]);

  const data = useMemo(() => ({
    labels: monthly.keys,
    datasets: [
      { label: 'Revenue (completed)', data: monthly.keys.map(k => monthly.rev[k] || 0), backgroundColor: 'rgba(37,99,235,0.6)' },
      { label: 'Expenses', data: monthly.keys.map(k => monthly.exp[k] || 0), backgroundColor: 'rgba(239,68,68,0.6)' },
      { label: 'Profit', data: monthly.keys.map(k => monthly.profit[k] || 0), backgroundColor: 'rgba(16,185,129,0.6)' },
    ],
  }), [monthly]);

  const options = { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: true } } };

  return (
    <div className="bg-white rounded-xl shadow p-6 border border-blue-100">
      <div className="flex items-center justify-between mb-2">
        <div className="text-lg font-semibold text-blue-700">Profits</div>
        <div className="text-xl font-bold text-green-700">${totalProfit}</div>
      </div>
      {error && <div className="text-red-600 text-sm mb-2">{error}</div>}
      <div className="w-full mt-2 bg-white rounded-lg p-2" style={{ height: '240px' }}>
        <Bar data={data} options={options} />
      </div>
    </div>
  );
}
