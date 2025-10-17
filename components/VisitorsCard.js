import { useEffect, useState } from 'react';
import { Line } from 'react-chartjs-2';
import { Chart, CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Legend } from 'chart.js';
Chart.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Legend);

function groupByWeek(daily) {
  // Group daily data into weeks
  const weekMap = {};
  daily.forEach(d => {
    if (!d.date) return;
    const dt = new Date(d.date.slice(0,4), Number(d.date.slice(4,6))-1, Number(d.date.slice(6,8)));
    const year = dt.getFullYear();
    const onejan = new Date(year, 0, 1);
    const week = Math.ceil((((dt - onejan) / 86400000) + onejan.getDay()+1)/7);
    const key = `${year}-W${week}`;
    weekMap[key] = (weekMap[key] || 0) + d.users;
  });
  return weekMap;
}

function groupByMonth(daily) {
  const monthMap = {};
  daily.forEach(d => {
    if (!d.date) return;
    const key = d.date.slice(0,6); // YYYYMM
    monthMap[key] = (monthMap[key] || 0) + d.users;
  });
  return monthMap;
}

export default function VisitorsCard() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [total, setTotal] = useState(0);
  const [rawSeries, setRawSeries] = useState([]);
  const [interval, setInterval] = useState('week'); // 'day' | 'week' | 'month'

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const resp = await fetch('/api/analytics-visitors');
        const data = await resp.json();
        if (!mounted) return;
        if (resp.ok && data.success) {
          setTotal(data.totalUsers || 0);
          setRawSeries(data.daily || []);
        } else {
          setError(data.error || 'Failed to fetch');
        }
      } catch (e) {
        if (mounted) setError(e.message || 'Failed to fetch');
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, []);

  let labels = [], values = [];
  const months = ['jan','feb','mar','apr','may','jun','jul','aug','sep','oct','nov','dec'];

  if (interval === 'day') {
    labels = rawSeries.map(p => `${p.date?.slice(6,8)}${months[Number(p.date?.slice(4,6))-1]}`);
    values = rawSeries.map(p => p.users);
  } else if (interval === 'week') {
    const weekMap = groupByWeek(rawSeries);
    const rawWeeks = Object.keys(weekMap).sort();
    labels = rawWeeks.map(wstr => {
      const [year, w] = wstr.split('-W');
      if (year && w) {
        const weekNum = parseInt(w, 10);
        const jan1 = new Date(Number(year), 0, 1);
        const start = new Date(jan1.getTime() + (weekNum - 1) * 7 * 86400000);
        const dayOfWeek = start.getDay();
        const weekStart = new Date(start);
        weekStart.setDate(start.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekStart.getDate() + 6);
        const mAbbr = months[weekStart.getMonth()];
        return `${mAbbr} (${weekStart.getDate()}-${weekEnd.getDate()})`;
      }
      return wstr;
    });
    values = rawWeeks.map(w => weekMap[w]);
  } else if (interval === 'month') {
    const monthMap = groupByMonth(rawSeries);
    const rawMonths = Object.keys(monthMap).sort();
    labels = rawMonths.map(mstr => {
      if (mstr.length === 6) {
        const y = mstr.slice(0,4);
        const m = months[Number(mstr.slice(4,6))-1];
        return `${m} ${y}`;
      }
      return mstr;
    });
    values = rawMonths.map(m => monthMap[m]);
  }

  const data = {
    labels,
    datasets: [{
      label: 'Visitors',
      data: values,
      borderColor: '#4b5563',
      backgroundColor: 'rgba(75, 85, 99, 0.1)',
      pointBackgroundColor: '#4b5563',
      fill: true,
      tension: 0.3,
    }]
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { 
      legend: { display: false },
      tooltip: {
        callbacks: {
          label: ctx => `${ctx.parsed.y} visitors`,
        }
      }
    },
    scales: {
      x: { grid: { display: false } },
      y: { beginAtZero: true, grid: { color: 'rgba(0,0,0,0.05)' } }
    }
  };

  let intervalLabel = 'Last 14 days (daily view)';
  if (interval === 'week') intervalLabel = `Last ${labels.length} weeks (weekly view)`;
  if (interval === 'month') intervalLabel = `Last ${labels.length} months (monthly view)`;

  return (
    <div className="bg-white shadow-md rounded-lg p-6">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold" style={{ color: '#2563eb' }}>Website Visitors</h2>
        <div className="flex gap-2">
          <button onClick={() => setInterval('day')} className={`px-3 py-1 text-sm rounded ${interval === 'day' ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-700'}`}>
            Daily
          </button>
          <button onClick={() => setInterval('week')} className={`px-3 py-1 text-sm rounded ${interval === 'week' ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-700'}`}>
            Weekly
          </button>
          <button onClick={() => setInterval('month')} className={`px-3 py-1 text-sm rounded ${interval === 'month' ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-700'}`}>
            Monthly
          </button>
        </div>
      </div>
      {loading && <p className="text-gray-500">Loading analytics...</p>}
      {error && <p className="text-red-500">Error: {error}</p>}
      {!loading && !error && (
        <div>
          <div className="text-2xl font-bold text-gray-700">{total.toLocaleString()}</div>
          <p className="text-sm text-gray-600">{intervalLabel}; Total: 30 days</p>
          <div className="w-full mt-4 bg-white rounded-lg p-2" style={{ height: '280px' }}>
            <Line data={data} options={options} />
          </div>
        </div>
      )}
    </div>
  );
}
