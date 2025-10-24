import { useEffect, useMemo, useState } from 'react';
import { Bar } from 'react-chartjs-2';
import { Chart, CategoryScale, LinearScale, BarElement, Tooltip, Legend } from 'chart.js';
import EyeToggle from './EyeToggle';
Chart.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend);

function getMonthKey(dateStr) {
  // bookings have YYYY-MM-DD; expenses use same
  return (dateStr || '').slice(0,7); // YYYY-MM
}

export default function ProfitsCard({ bookings }) {
  const [expenses, setExpenses] = useState([]);
  const [error, setError] = useState('');
  const [showChart, setShowChart] = useState(false);

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
    keys.forEach(k => {
      const net = (rev[k] || 0) - (exp[k] || 0);
      profit[k] = Number(net.toFixed(2));
    });
    return { keys, rev, exp, profit };
  }, [bookings, expenses]);

  const totalProfit = useMemo(() => {
    const total = monthly.keys.reduce((s,k)=> s + (monthly.profit[k] || 0), 0);
    return Number(total.toFixed(2));
  }, [monthly]);

  const data = useMemo(() => {
    const labels = monthly.keys;
    const profitBackground = labels.map(k => {
      const value = monthly.profit[k] || 0;
      return value < 0 ? 'rgba(239,68,68,0.7)' : 'rgba(74,222,128,0.7)';
    });
    const profitBorder = labels.map(k => {
      const value = monthly.profit[k] || 0;
      return value < 0 ? 'rgb(220,38,38)' : 'rgb(34,197,94)';
    });
    return {
      labels,
      datasets: [
        {
          label: 'Revenue',
          data: labels.map(k => monthly.rev[k] || 0),
          backgroundColor: 'rgba(37,99,235,0.6)',
          borderColor: 'rgb(37,99,235)',
          borderWidth: 1,
        },
        {
          label: 'Expenses',
          data: labels.map(k => monthly.exp[k] || 0),
          backgroundColor: 'rgba(239,68,68,0.6)',
          borderColor: 'rgb(239,68,68)',
          borderWidth: 1,
        },
        {
          label: 'Profit',
          data: labels.map(k => monthly.profit[k] || 0),
          backgroundColor: profitBackground,
          borderColor: profitBorder,
          borderWidth: 1,
        },
      ],
    };
  }, [monthly]);

  const hasPositiveProfit = useMemo(
    () => monthly.keys.some(k => (monthly.profit[k] || 0) > 0),
    [monthly],
  );
  const hasNegativeProfit = useMemo(
    () => monthly.keys.some(k => (monthly.profit[k] || 0) < 0),
    [monthly],
  );

  const options = { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } };

  return (
    <div
      className="rounded-xl shadow p-6"
      style={{ backgroundColor: '#bbf7d0' }}
    >
      <div className="flex items-start justify-between mb-2">
        <div>
          <div className="text-lg font-semibold text-emerald-900">Profits</div>
          <div className={`text-xl font-bold ${totalProfit < 0 ? 'text-red-600' : 'text-emerald-900'}`}>
            ${totalProfit.toFixed(2)}
          </div>
        </div>
        <EyeToggle
          open={showChart}
          onToggle={() => setShowChart(prev => !prev)}
          label="profit chart"
        />
      </div>
      {error && <div className="text-red-600 text-sm mb-2">{error}</div>}
      <div
        style={{
          width: '100%',
          overflow: 'hidden',
          transition: 'max-height 0.35s ease, margin-top 0.2s ease',
          maxHeight: showChart ? '260px' : '0px',
          marginTop: showChart ? '16px' : '0px',
        }}
      >
        <div className="w-full bg-white rounded-lg p-2" style={{ height: '240px' }}>
          <Bar data={data} options={options} />
        </div>
      </div>
  <div className="flex flex-wrap gap-4 mt-4 text-sm text-emerald-900">
        <div className="flex items-center gap-1">
          <span className="inline-block w-3 h-3 rounded-sm" style={{ backgroundColor: 'rgba(37,99,235,0.6)' }} />
          Revenue
        </div>
        <div className="flex items-center gap-1">
          <span className="inline-block w-3 h-3 rounded-sm" style={{ backgroundColor: 'rgba(239,68,68,0.6)' }} />
          Expenses
        </div>
        {hasPositiveProfit && (
          <div className="flex items-center gap-1">
            <span className="inline-block w-3 h-3 rounded-sm" style={{ backgroundColor: 'rgba(74,222,128,0.7)' }} />
            Profit (+)
          </div>
        )}
        {hasNegativeProfit && (
          <div className="flex items-center gap-1">
            <span className="inline-block w-3 h-3 rounded-sm" style={{ backgroundColor: 'rgba(239,68,68,0.7)' }} />
            Profit (-)
          </div>
        )}
      </div>
    </div>
  );
}
