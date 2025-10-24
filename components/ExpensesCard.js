import { useEffect, useMemo, useState } from 'react';
import { Bar, Pie } from 'react-chartjs-2';
import { Chart, CategoryScale, LinearScale, BarElement, Tooltip, Legend, ArcElement } from 'chart.js';
import EyeToggle from './EyeToggle';
Chart.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend, ArcElement);

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
  const [selectedMonth, setSelectedMonth] = useState('');

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
      if (!map[key].byCat[cat]) map[key].byCat[cat] = 0;
      map[key].byCat[cat] += Number(it.amount || 0);
    }
    const keys = Object.keys(map).sort();
    return { keys, map };
  }, [items]);

  useEffect(() => {
    if (!monthly.keys.length) {
      setSelectedMonth('');
      return;
    }
    const currentKey = new Date().toISOString().slice(0, 7);
    if (monthly.keys.includes(currentKey)) {
      setSelectedMonth(currentKey);
    } else {
      setSelectedMonth(monthly.keys[monthly.keys.length - 1]);
    }
  }, [monthly.keys]);

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
  const formatMonthLabel = (key) => {
    if (!key) return '';
    const [year, month] = key.split('-');
    const monthIndex = Number(month) - 1;
    if (Number.isNaN(monthIndex)) return key;
    const formatter = new Intl.DateTimeFormat('en', { month: 'short' });
    const label = formatter.format(new Date(Number(year), monthIndex, 1));
    return `${label}-${year}`;
  };

  const pieData = useMemo(() => {
    const source = monthly.map[selectedMonth];
    if (!source) return null;
    const dataValues = CATEGORIES.map(cat => source.byCat[cat.key] || 0);
    return {
      labels: CATEGORIES.map(cat => cat.label),
      datasets: [
        {
          data: dataValues,
          backgroundColor: ['#1d4ed8', '#22c55e', '#f97316'],
          borderColor: '#ffffff',
          borderWidth: 1,
        },
      ],
    };
  }, [monthly.map, selectedMonth]);

  const pieOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom',
        labels: {
          color: '#111827',
        },
      },
      tooltip: {
        callbacks: {
          label(context) {
            const value = context.parsed || 0;
            return `${context.label}: $${value.toFixed(2)}`;
          },
        },
      },
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
          maxHeight: showChart && pieData ? '560px' : showChart ? '300px' : '0px',
          marginTop: showChart ? '16px' : '0px',
        }}
      >
        <div className="space-y-4">
          <div className="w-full bg-white rounded-lg p-2" style={{ height: '240px' }}>
            <Bar data={chartData} options={chartOptions} />
          </div>
          {pieData && (
            <div className="bg-white rounded-lg p-4 text-gray-900 shadow-sm">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <div className="text-sm font-semibold text-gray-700">Category Breakdown</div>
                <label className="flex items-center gap-2 text-sm text-gray-600">
                  <span>Month:</span>
                  <select
                    value={selectedMonth}
                    onChange={(event) => setSelectedMonth(event.target.value)}
                    className="px-3 py-1.5 rounded-md border border-gray-200 bg-white text-gray-800 focus:outline-none focus:ring-2 focus:ring-red-400"
                  >
                    {monthly.keys.map(key => (
                      <option key={key} value={key}>{formatMonthLabel(key)}</option>
                    ))}
                  </select>
                </label>
              </div>
              <div className="mt-4" style={{ height: '220px' }}>
                <Pie data={pieData} options={pieOptions} />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
