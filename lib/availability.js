import { google } from 'googleapis';
import { getDb } from './mongodb';
import { getCalendarClient } from './googleCalendar';

const TIMEZONE = 'America/Halifax';

// date: 'YYYY-MM-DD'
export async function getOccupiedSlotsForDate(date) {
  const results = [];

  // 1) Fetch Google Calendar events for that day (if credentials present)
  try {
    const { GOOGLE_CALENDAR_ID } = process.env;
    const client = getCalendarClient();
    if (GOOGLE_CALENDAR_ID && client) {
      const calendar = google.calendar({ version: 'v3', auth: client });
      const timeMin = new Date(`${date}T00:00:00`).toISOString();
      const timeMax = new Date(`${date}T23:59:59`).toISOString();
      const resp = await calendar.events.list({
        calendarId: GOOGLE_CALENDAR_ID,
        timeMin,
        timeMax,
        singleEvents: true,
        orderBy: 'startTime',
      });
      const items = resp.data.items || [];
      items.forEach((ev) => {
        // support all-day and dateTime events
        const start = ev.start?.dateTime || ev.start?.date; // date for all-day
        const end = ev.end?.dateTime || ev.end?.date;
        if (start && end) {
          results.push({ start: new Date(start).toISOString(), end: new Date(end).toISOString(), source: 'calendar', title: ev.summary || '' });
        }
      });
    }
  } catch (err) {
    // Common cause: invalid_grant when refresh token is revoked/expired
    if (String(err?.message || '').toLowerCase().includes('invalid_grant') || err?.code === 401) {
      console.error('[availability] Failed to fetch Google Calendar events: invalid_grant (Google refresh token may be expired or revoked).');
      console.error('[availability] To fix: regenerate a refresh token and update env (see google_oauth_test.js).');
    } else {
      console.error('[availability] Failed to fetch Google Calendar events', err?.response?.data || err?.message || err);
    }
  }

  // 2) Fetch internal bookings from MongoDB for that date
  try {
    const db = await getDb();
    const bookings = await db.collection('bookings').find({ date }).toArray();
    if (Array.isArray(bookings)) {
      // For each booking try to resolve duration from services collection
      const svcCol = db.collection('services');
      for (const b of bookings) {
        const timeStr = b.time; // eg '7:00 AM' or '07:00'
        if (!timeStr) continue;
        // Resolve service duration
        let durationMinutes = 60; // fallback
        try {
          const svc = await svcCol.findOne({ title: { $regex: `^${b.service}$`, $options: 'i' } });
          if (svc && typeof svc.durationMinutes === 'number') durationMinutes = svc.durationMinutes;
        } catch (e) {}

        // Construct ISO start/end using local server timezone
        const start = new Date(`${b.date}T00:00:00`);
        // parse time like '7:00 AM' to 24h
        const timeParts = String(b.time).trim();
        let hours = 0;
        let minutes = 0;
        const ampmMatch = timeParts.match(/(AM|PM)$/i);
        if (ampmMatch) {
          const [timeOnly, period] = timeParts.split(/\s+/);
          const [h, m] = timeOnly.split(':');
          hours = parseInt(h || '0', 10);
          minutes = parseInt(m || '0', 10);
          if (/pm/i.test(period) && hours !== 12) hours += 12;
          if (/am/i.test(period) && hours === 12) hours = 0;
        } else {
          const [h, m] = timeParts.split(':');
          hours = parseInt(h || '0', 10);
          minutes = parseInt(m || '0', 10);
        }
        start.setHours(hours, minutes, 0, 0);
        const end = new Date(start.getTime() + durationMinutes * 60 * 1000);
        results.push({ start: start.toISOString(), end: end.toISOString(), source: 'booking', id: b._id?.toString?.() || null });
      }
    }
  } catch (err) {
    console.error('[availability] Failed to fetch bookings from DB', err?.message || err);
  }

  return results;
}

export function isSlotConflicting(slotStartISO, slotEndISO, occupiedSlots, bufferMinutes = 30) {
  const slotStart = new Date(slotStartISO).getTime();
  const slotEnd = new Date(slotEndISO).getTime();
  const bufferMs = bufferMinutes * 60 * 1000;
  for (const occ of occupiedSlots) {
    const occStart = new Date(occ.start).getTime();
    const occEnd = new Date(occ.end).getTime();
    const occStartWithBuffer = occStart - bufferMs;
    const occEndWithBuffer = occEnd + bufferMs;
    if (slotStart < occEndWithBuffer && slotEnd > occStartWithBuffer) return true;
  }
  return false;
}
