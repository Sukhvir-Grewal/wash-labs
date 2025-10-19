import { useMemo, useState } from 'react';
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';

function parseISODate(dateStr) {
  if (!dateStr || typeof dateStr !== 'string') return null;
  const norm = dateStr.replace(/\//g, '-');
  const m = norm.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return null;
  const [_, y, mo, d] = m;
  return new Date(Number(y), Number(mo) - 1, Number(d));
}

function fmtCAD(amount) {
  const num = Number(amount || 0);
  return num.toLocaleString('en-CA', { style: 'currency', currency: 'CAD', maximumFractionDigits: 0 });
}

export default function StatusCalendar({ bookings }) {
  const [value, setValue] = useState(new Date());
  const [filter, setFilter] = useState('all'); // 'all' | 'complete' | 'pending'

  const summaryByDay = useMemo(() => {
    const map = {};
    (bookings || []).forEach(b => {
      const dt = parseISODate(b.date);
      if (!dt) return;
      const key = dt.toISOString().slice(0,10);
      const amt = Number(b.amount || 0) || 0;
      if (!map[key]) map[key] = { complete: 0, pending: 0, sumComplete: 0, sumPending: 0 };
      if (b.status === 'complete') {
        map[key].complete += 1;
        map[key].sumComplete += amt;
      } else if (b.status === 'pending') {
        map[key].pending += 1;
        map[key].sumPending += amt;
      }
    });
    return map;
  }, [bookings]);

  const getTileContent = ({ date, view }) => {
    if (view !== 'month') return null;
    const key = date.toISOString().slice(0,10);
    const summary = summaryByDay[key];
    if (!summary) return null;

    const hasPending = summary.pending > 0;
    const hasComplete = summary.complete > 0;

    // Compose hover label based on filter
    let hoverTitle = '';
    if (filter === 'complete' && summary.sumComplete > 0) {
      hoverTitle = `Earned ${fmtCAD(summary.sumComplete)}`;
    } else if (filter === 'pending' && summary.sumPending > 0) {
      hoverTitle = `PE ${fmtCAD(summary.sumPending)}`;
    } else if (filter === 'all') {
      const parts = [];
      if (summary.sumComplete > 0) parts.push(`Earned ${fmtCAD(summary.sumComplete)}`);
      if (summary.sumPending > 0) parts.push(`PE ${fmtCAD(summary.sumPending)}`);
      hoverTitle = parts.join(' | ');
    }

    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginTop: 2 }} title={hoverTitle}>
        <div style={{ display: 'flex', gap: 4, justifyContent: 'center' }}>
          {(filter === 'all' || filter === 'complete') && hasComplete && <span className="cal-dot cal-dot-green" />}
          {(filter === 'all' || filter === 'pending') && hasPending && <span className="cal-dot cal-dot-yellow" />}
        </div>
      </div>
    );
  };

  return (
    <div className="status-calendar">
      {/* Count under the Bookings heading, adapts to filter */}
      {(() => {
        let pending = 0, complete = 0;
        (bookings || []).forEach(b => {
          if (b.status === 'pending') pending += 1;
          else if (b.status === 'complete') complete += 1;
        });
        const displayCount = filter === 'pending' ? pending : filter === 'complete' ? complete : (pending + complete);
        const colorClass = filter === 'complete' ? 'text-green-600' : filter === 'pending' ? 'text-amber-600' : 'text-blue-900';
        return (
          <div className={`text-3xl font-bold text-center mb-2 ${colorClass}`}>{displayCount}</div>
        );
      })()}
      <div className="flex items-center gap-2 mb-2">
        <button onClick={() => setFilter('all')} className={`px-3 py-1 text-sm rounded ${filter === 'all' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700'}`}>All</button>
        <button onClick={() => setFilter('complete')} className={`px-3 py-1 text-sm rounded ${filter === 'complete' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700'}`}>Completed</button>
        <button onClick={() => setFilter('pending')} className={`px-3 py-1 text-sm rounded ${filter === 'pending' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700'}`}>Pending</button>
      </div>
      <Calendar value={value} onChange={setValue} tileContent={getTileContent} />
      <div className="flex items-center gap-3 mt-2 text-xs text-gray-600">
        <span className="flex items-center gap-1"><span className="cal-dot cal-dot-green" /> Complete</span>
        <span className="flex items-center gap-1"><span className="cal-dot cal-dot-yellow" /> Pending</span>
      </div>
    </div>
  );
}
