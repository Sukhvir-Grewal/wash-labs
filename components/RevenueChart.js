
import { useState } from 'react';
import { Line } from 'react-chartjs-2';
import { Chart, CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Legend } from 'chart.js';
Chart.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Legend);

function groupByWeek(bookings) {
  // Returns { 'YYYY-WW': sum }
  const weekMap = {};
  bookings.forEach(b => {
    if (b.date && b.amount) {
      const d = new Date(b.date);
      const year = d.getFullYear();
      const onejan = new Date(d.getFullYear(),0,1);
      const week = Math.ceil((((d - onejan) / 86400000) + onejan.getDay()+1)/7);
      const key = `${year}-W${week}`;
      weekMap[key] = (weekMap[key] || 0) + b.amount;
    }
  });
  return weekMap;
}

function groupByMonth(bookings) {
  // Returns { 'YYYY-MM': sum }
  const monthMap = {};
  bookings.forEach(b => {
    if (b.date && b.amount) {
      const parts = b.date.split('-');
      if (parts.length === 3) {
        const key = `${parts[0]}-${parts[1]}`;
        monthMap[key] = (monthMap[key] || 0) + b.amount;
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
}) {
  const [interval, setInterval] = useState('date'); // 'date' | 'week' | 'month'
  const filtered = status === 'all' ? bookings : bookings.filter(b => b.status === status);

  let labels = [], amounts = [];
  if (interval === 'date') {
    // Group by date
    const dateMap = {};
    filtered.forEach(b => {
      if (b.date && b.amount) {
        dateMap[b.date] = (dateMap[b.date] || 0) + b.amount;
      }
    });
    const rawDates = Object.keys(dateMap).sort();
    const months = ["jan","feb","mar","apr","may","jun","jul","aug","sep","oct","nov","dec"];
    labels = rawDates.map(dateStr => {
      const parts = dateStr.split("-");
      if (parts.length === 3) {
        const d = parts[2];
        const m = months[parseInt(parts[1], 10) - 1];
        return `${d}${m}`;
      }
      return dateStr;
    });
    amounts = rawDates.map(date => dateMap[date]);
  } else if (interval === 'week') {
    const weekMap = groupByWeek(filtered);
      const rawWeeks = Object.keys(weekMap).sort();
      // Format as 'monAbbr (startDay-endDay)' e.g. 'oct (15-21)'
      labels = rawWeeks.map(wstr => {
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
      amounts = rawWeeks.map(w => weekMap[w]);
  } else if (interval === 'month') {
    const monthMap = groupByMonth(filtered);
    const rawMonths = Object.keys(monthMap).sort();
    const months = ["jan","feb","mar","apr","may","jun","jul","aug","sep","oct","nov","dec"];
    labels = rawMonths.map(mstr => {
      const parts = mstr.split('-');
      if (parts.length === 2) {
        return `${months[parseInt(parts[1],10)-1]} ${parts[0]}`;
      }
      return mstr;
    });
    amounts = rawMonths.map(m => monthMap[m]);
  }

  const data = {
    labels,
    datasets: [
      {
        label: datasetLabel,
        data: amounts,
        fill: false,
        borderColor: borderColor,
        backgroundColor: backgroundColor,
        tension: 0.2,
        pointRadius: 4,
        pointBackgroundColor: pointBackgroundColor,
      },
    ],
  };

  const options = {
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
      <Line data={data} options={options} />
    </div>
  );
}
