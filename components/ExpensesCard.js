import { useEffect, useMemo, useState } from 'react';
import { Bar } from 'react-chartjs-2';
import { Chart, CategoryScale, LinearScale, BarElement, Tooltip, Legend } from 'chart.js';
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
        { label: 'Total', data: labels.map(k => monthly.map[k].total), backgroundColor: 'rgba(239,68,68,0.6)' },
      ],
    };
    return data;
  }, [monthly]);

  const chartOptions = { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: true } } };

  return (
    <div className="bg-white rounded-xl shadow p-6 border border-blue-100">
      <div className="flex items-center justify-between mb-4">
        <div className="text-lg font-semibold text-blue-700">Expenses</div>
      </div>
      {/* Graph only */}
      <div className="w-full mt-2 bg-white rounded-lg p-2" style={{ height: '240px' }}>
        <Bar data={chartData} options={chartOptions} />
      </div>
    </div>
  );
}
