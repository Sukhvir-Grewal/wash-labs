import { useEffect, useMemo, useState } from 'react';
import { Bar } from 'react-chartjs-2';
import { Chart, CategoryScale, LinearScale, BarElement, Tooltip, Legend } from 'chart.js';
import EyeToggle from './EyeToggle';
Chart.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend);

const CATEGORIES = [
  { key: 'one-time', label: 'Equipment' }, // one-time purchases like vacuum
  { key: 'chemicals', label: 'Chemicals' },
  { key: 'other', label: 'Other' },
];

export default function ExpensesCard() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showChart, setShowChart] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch('/api/expenses');
      const data = await res.json();
      if (res.ok && data.success) setItems(data.items || []);
      else setError(data.error || 'Failed to load expenses');
    } catch (e) {
      setError(e.message || 'Failed to load expenses');
    } finally { setLoading(false); }
  }

  useEffect(() => { load(); }, []);

  const monthly = useMemo(() => {
    const map = {};
    for (const it of items) {
      const key = (it.date || '').slice(0,7); // YYYY-MM
      const cat = it.category || 'other';
      if (!map[key]) map[key] = { total: 0, byCat: { 'one-time': 0, 'chemicals': 0, 'other': 0 } };
      map[key].total += Number(it.amount || 0);
      map[key].byCat[cat] += Number(it.amount || 0);
    }
    const keys = Object.keys(map).sort();
    return { keys, map };
  }, [items]);

  const chartData = useMemo(() => {
    const labels = monthly.keys;
    const data = {
      labels,
      datasets: [
        {
          label: 'Expenses',
          data: labels.map(k => monthly.map[k].total),
          backgroundColor: '#ef4444',
          borderColor: '#ef4444',
          borderWidth: 1,
        },
      ],
    };
    return data;
  }, [monthly]);

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
    },
  };
  const totalSpent = useMemo(() => {
    const sum = items.reduce((acc, item) => acc + (Number(item.amount) || 0), 0);
    return sum.toFixed(2);
  }, [items]);

  return (
    <div
      className="text-white rounded-xl shadow p-6"
      style={{ backgroundColor: '#ef4444' }}
    >
      <div className="flex items-start justify-between mb-2">
        <div className="text-lg font-semibold">Expenses</div>
        <EyeToggle
          open={showChart}
          onToggle={() => setShowChart(prev => !prev)}
          label="expenses chart"
        />
      </div>
  <div className="text-2xl font-bold text-white">${totalSpent}</div>
  {error && <div className="text-white/90 text-sm mb-2">{error}</div>}
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
          <Bar data={chartData} options={chartOptions} />
        </div>
      </div>
    </div>
  );
}
