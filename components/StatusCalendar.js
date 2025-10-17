import { useMemo, useState } from 'react';
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';

function parseISODate(dateStr) {
  if (!dateStr || typeof dateStr !== 'string') return null;
  const m = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return null;
  const [_, y, mo, d] = m;
  return new Date(Number(y), Number(mo) - 1, Number(d));
}

export default function StatusCalendar({ bookings }) {
  const [value, setValue] = useState(new Date());

  const statusByDay = useMemo(() => {
    const map = {};
    bookings.forEach(b => {
      const dt = parseISODate(b.date);
      if (!dt) return;
      const key = dt.toISOString().slice(0,10);
      // track statuses for each day
      if (!map[key]) map[key] = new Set();
      if (b.status) map[key].add(b.status);
    });
    return map;
  }, [bookings]);

  const getTileContent = ({ date, view }) => {
    if (view !== 'month') return null;
    const key = date.toISOString().slice(0,10);
    const statuses = statusByDay[key];
    if (!statuses) return null;

    const hasPending = statuses.has('pending');
    const hasComplete = statuses.has('complete');

    return (
      <div style={{ display: 'flex', gap: 4, justifyContent: 'center', marginTop: 2 }}>
        {hasComplete && <span className="cal-dot cal-dot-green" />}
        {hasPending && <span className="cal-dot cal-dot-yellow" />}
      </div>
    );
  };

  return (
    <div className="status-calendar">
      <Calendar value={value} onChange={setValue} tileContent={getTileContent} />
      <div className="flex items-center gap-3 mt-2 text-xs text-gray-600">
        <span className="flex items-center gap-1"><span className="cal-dot cal-dot-green" /> Complete</span>
        <span className="flex items-center gap-1"><span className="cal-dot cal-dot-yellow" /> Pending</span>
      </div>
    </div>
  );
}
