
import { useMemo, useState } from 'react';
import { Line, Bar, Doughnut } from 'react-chartjs-2';
import {
  Chart,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';

Chart.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, ArcElement, Tooltip, Legend, Filler);

function groupByWeek(bookings) {
  // Returns { 'YYYY-WW': sum }
  const weekMap = {};
  bookings.forEach(b => {
    const amount = Number(b.amount);
    if (b.date && !Number.isNaN(amount)) {
      const d = new Date(b.date);
      const year = d.getFullYear();
      const onejan = new Date(d.getFullYear(),0,1);
      const week = Math.ceil((((d - onejan) / 86400000) + onejan.getDay()+1)/7);
      const key = `${year}-W${week}`;
      weekMap[key] = (weekMap[key] || 0) + amount;
    }
  });
  return weekMap;
}

function groupByMonth(bookings) {
  // Returns { 'YYYY-MM': sum }
  const monthMap = {};
  bookings.forEach(b => {
    const amount = Number(b.amount);
    if (b.date && !Number.isNaN(amount)) {
      const parts = b.date.split('-');
      if (parts.length === 3) {
        const key = `${parts[0]}-${parts[1]}`;
        monthMap[key] = (monthMap[key] || 0) + amount;
      }
    }
  });
  return monthMap;
}

export default function RevenueChart({
  bookings,
  status = 'complete',
  datasetLabel = 'Revenue',
  borderColor = 'rgb(37, 99, 235)',
  backgroundColor = 'rgba(37,99,235,0.2)',
  pointBackgroundColor = 'rgb(37,99,235)',
  accentColor = '#2563eb',
  chartType = 'line',
}) {
  const [interval, setInterval] = useState('date'); // 'date' | 'week' | 'month'
  const filtered = status === 'all' ? bookings : bookings.filter(b => b.status === status);

  const timelineData = useMemo(() => {
    const next = { labels: [], amounts: [] };
    if (chartType === 'doughnut') {
      // build service distribution, ignore timeline intervals
      const serviceMap = {};
      filtered.forEach((booking) => {
        const amount = Number(booking.amount);
        if (booking.service && !Number.isNaN(amount)) {
          serviceMap[booking.service] = (serviceMap[booking.service] || 0) + amount;
        }
      });
      const entries = Object.entries(serviceMap).sort((a, b) => b[1] - a[1]);
      next.labels = entries.map(([service]) => service);
      next.amounts = entries.map(([, total]) => total);
      return next;
    }

    if (interval === 'date') {
    // Group by date
    const dateMap = {};
    filtered.forEach(b => {
        const amount = Number(b.amount);
        if (b.date && !Number.isNaN(amount)) {
          dateMap[b.date] = (dateMap[b.date] || 0) + amount;
      }
    });
    const rawDates = Object.keys(dateMap).sort();
    const months = ["jan","feb","mar","apr","may","jun","jul","aug","sep","oct","nov","dec"];
      next.labels = rawDates.map(dateStr => {
      const parts = dateStr.split("-");
      if (parts.length === 3) {
        const d = parts[2];
        const m = months[parseInt(parts[1], 10) - 1];
        return `${d}${m}`;
      }
      return dateStr;
    });
      next.amounts = rawDates.map(date => Number(dateMap[date]) || 0);
      return next;
    }

    if (interval === 'week') {
    const weekMap = groupByWeek(filtered);
      const rawWeeks = Object.keys(weekMap).sort();
      // Format as 'monAbbr (startDay-endDay)' e.g. 'oct (15-21)'
      next.labels = rawWeeks.map(wstr => {
        // wstr: 'YYYY-WW'
        const [year, w] = wstr.split('-W');
        if (year && w) {
          // Get start/end date of week
          const weekNum = parseInt(w, 10);
          const jan1 = new Date(Number(year), 0, 1);
          const start = new Date(jan1.getTime() + (weekNum - 1) * 7 * 86400000);
          // Adjust to week start (Monday)
          const dayOfWeek = start.getDay();
          const weekStart = new Date(start);
          weekStart.setDate(start.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));
          const weekEnd = new Date(weekStart);
          weekEnd.setDate(weekStart.getDate() + 6);
          const months = ["jan","feb","mar","apr","may","jun","jul","aug","sep","oct","nov","dec"];
          const mAbbr = months[weekStart.getMonth()];
          return `${mAbbr} (${weekStart.getDate()}-${weekEnd.getDate()})`;
        }
        return wstr;
      });
      next.amounts = rawWeeks.map(w => Number(weekMap[w]) || 0);
      return next;
    }

    if (interval === 'month') {
    const monthMap = groupByMonth(filtered);
    const rawMonths = Object.keys(monthMap).sort();
    const months = ["jan","feb","mar","apr","may","jun","jul","aug","sep","oct","nov","dec"];
      next.labels = rawMonths.map(mstr => {
      const parts = mstr.split('-');
      if (parts.length === 2) {
        return `${months[parseInt(parts[1],10)-1]} ${parts[0]}`;
      }
      return mstr;
    });
      next.amounts = rawMonths.map(m => Number(monthMap[m]) || 0);
      return next;
    }

    return next;
  }, [filtered, interval, chartType]);

  const labels = timelineData.labels;
  const amounts = timelineData.amounts;

  const timelineDataset = {
    label: datasetLabel,
    data: amounts,
    borderColor,
    backgroundColor: chartType === 'bar' ? 'rgba(37, 99, 235, 0.7)' : backgroundColor,
    tension: 0.25,
    pointRadius: chartType === 'bar' ? 0 : 4,
    pointBackgroundColor,
    borderWidth: chartType === 'bar' ? 0 : 2,
    fill: chartType === 'area',
  };

  const chartData = {
    labels,
    datasets:
      chartType === 'doughnut'
        ? [
            {
              label: datasetLabel,
              data: amounts,
              backgroundColor: amounts.map((_, index) => {
                const base = [
                  '#2563eb',
                  '#1d4ed8',
                  '#38bdf8',
                  '#0ea5e9',
                  '#6366f1',
                  '#3b82f6',
                  '#60a5fa',
                ];
                return base[index % base.length];
              }),
              borderColor: '#ffffff',
              borderWidth: 2,
            },
          ]
        : [timelineDataset],
  };

  const commonTimelineOptions = {
    responsive: true,
    interaction: {
      mode: 'index',
      intersect: false,
      axis: 'x',
    },
    plugins: {
      legend: { display: false },
      tooltip: {
        enabled: true,
        mode: 'index',
        intersect: false,
        backgroundColor: '#0f172a',
        titleColor: '#f8fafc',
        bodyColor: '#f8fafc',
        borderColor: '#0f172a',
        borderWidth: 1,
      },
    },
    scales: {
      x: {
        title: { display: true, text: interval === 'date' ? 'Date' : interval === 'week' ? 'Week' : 'Month' },
        ticks: { color: '#0f172a' },
        grid: { color: '#e2e8f0' },
      },
      y: {
        title: { display: true, text: 'Revenue ($)' },
        beginAtZero: true,
        ticks: { color: '#0f172a' },
        grid: { color: '#f1f5f9' },
      },
    },
  };

  const doughnutOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: 'right',
        labels: {
          boxWidth: 12,
          boxHeight: 12,
          color: '#0f172a',
          font: { size: 11 },
        },
      },
      tooltip: {
        enabled: true,
        callbacks: {
          label: ({ label, formattedValue }) => `${label}: $${Number(formattedValue).toLocaleString()}`,
        },
      },
    },
  };

  const ChartComponent = chartType === 'bar' ? Bar : chartType === 'doughnut' ? Doughnut : Line;
  const options = chartType === 'doughnut' ? doughnutOptions : commonTimelineOptions;

  const showIntervalControls = chartType !== 'doughnut';

  const buttonBaseClass = 'px-3 py-1 rounded-full text-xs font-semibold border transition';
  const buttonStyle = (active) =>
    active
      ? {
          backgroundColor: accentColor,
          borderColor: accentColor,
          color: '#ffffff',
          boxShadow: `0 8px 18px ${accentColor}33`,
        }
      : {
          backgroundColor: '#ffffff',
          borderColor: `${accentColor}33`,
          color: accentColor,
        };

  return (
    <div style={{ width: '100%', minHeight: 180 }}>
      {showIntervalControls && (
        <div className="mb-3 flex justify-end gap-2">
          <button
            className={buttonBaseClass}
            style={buttonStyle(interval === 'date')}
            onClick={() => setInterval('date')}
          >
            Dates
          </button>
          <button
            className={buttonBaseClass}
            style={buttonStyle(interval === 'week')}
            onClick={() => setInterval('week')}
          >
            Weeks
          </button>
          <button
            className={buttonBaseClass}
            style={buttonStyle(interval === 'month')}
            onClick={() => setInterval('month')}
          >
            Months
          </button>
        </div>
      )}
      <ChartComponent data={chartData} options={options} />
    </div>
  );
}
