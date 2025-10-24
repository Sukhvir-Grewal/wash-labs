import { useEffect, useState } from 'react';
import { Line } from 'react-chartjs-2';
import { Chart, CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Legend } from 'chart.js';
import EyeToggle from './EyeToggle';
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
  const [mode, setMode] = useState('trend'); // 'live' | 'trend'
  const [showChart, setShowChart] = useState(false);
  const excludeMe = true;
  const [live, setLive] = useState({ active: 0 });

  // Fetch trend data once
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

  // Poll realtime when in live
  useEffect(() => {
    let mounted = true;
    let timer;
    async function loadRealtime() {
      try {
        const url = new URL('/api/analytics-realtime', window.location.origin);
        url.searchParams.set('excludeMe', excludeMe ? '1' : '0');
        const resp = await fetch(url.toString());
        const data = await resp.json();
        if (!mounted) return;
        if (resp.ok && data.success) {
          setLive({ active: data.totalActive || 0 });
        } else {
          setError(data.error || 'Failed to fetch realtime');
        }
      } catch (e) {
        if (mounted) setError(e.message || 'Failed to fetch realtime');
      }
    }
    if (mode === 'live') {
      loadRealtime();
      timer = setInterval(loadRealtime, 10000); // 10s
    }
    return () => { mounted = false; if (timer) clearInterval(timer); };
  }, [mode, excludeMe]);

  let labels = [], values = [];
  const months = ['jan','feb','mar','apr','may','jun','jul','aug','sep','oct','nov','dec'];

  const interval = 'day';
  if (mode === 'trend') {
    // daily trend view
    labels = rawSeries.map(p => `${p.date?.slice(6,8)}${months[Number(p.date?.slice(4,6))-1]}`);
    values = rawSeries.map(p => p.users);
  }

  const accentColor = '#e4c59c';

  const data = {
    labels,
    datasets: [{
      label: mode === 'trend' ? 'Visitors' : 'Live',
      data: mode === 'trend' ? values : [],
      borderColor: accentColor,
      backgroundColor: 'rgba(228, 197, 156, 0.25)',
      pointBackgroundColor: accentColor,
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

  return (
    <div
      className="shadow-md rounded-lg p-6"
      style={{ backgroundColor: accentColor }}
    >
      <div className="flex justify-between items-start mb-4">
        <div>
          <h2 className="text-xl font-semibold text-stone-800">Visitors</h2>
        </div>
        <div className="flex gap-2 items-center">
          <button
            onClick={() => setMode('trend')}
            className={`px-3 py-1 text-sm rounded ${mode === 'trend' ? 'bg-stone-700 text-white' : 'bg-stone-200 text-stone-700'}`}
          >
            Trend
          </button>
          <button
            onClick={() => setMode('live')}
            className={`px-3 py-1 text-sm rounded ${mode === 'live' ? 'bg-stone-700 text-white' : 'bg-stone-200 text-stone-700'}`}
          >
            Live
          </button>
          <EyeToggle
            open={showChart}
            onToggle={() => setShowChart(prev => !prev)}
            label="visitors chart"
          />
        </div>
      </div>
      {loading && <p className="text-stone-700/80">Loading analytics...</p>}
      {error && <p className="text-red-600">Error: {error}</p>}
      {!loading && !error && (
        <div>
          {mode === 'trend' ? (
            <>
              <div className="text-2xl font-bold text-stone-900">{total.toLocaleString()}</div>
              <div
                style={{
                  width: '100%',
                  overflow: 'hidden',
                  transition: 'max-height 0.35s ease, margin-top 0.2s ease',
                  maxHeight: showChart ? '320px' : '0px',
                  marginTop: showChart ? '16px' : '0px',
                }}
              >
                <div className="w-full bg-white rounded-lg p-2" style={{ height: '280px' }}>
                  <Line data={data} options={options} />
                </div>
              </div>
            </>
          ) : (
            <>
              <div className="text-2xl font-bold text-stone-900">{live.active}</div>
              <p className="text-sm text-stone-700/80">Realtime active users</p>
            </>
          )}
        </div>
      )}
    </div>
  );
}
