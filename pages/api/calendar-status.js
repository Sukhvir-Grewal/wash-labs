import { google } from 'googleapis';
import { getCalendarClient } from '../../lib/googleCalendar';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }

  const {
    GOOGLE_SERVICE_ACCOUNT_EMAIL,
    GOOGLE_PRIVATE_KEY,
    GOOGLE_CALENDAR_ID,
  } = process.env;

  if (!GOOGLE_SERVICE_ACCOUNT_EMAIL || !GOOGLE_PRIVATE_KEY || !GOOGLE_CALENDAR_ID) {
    return res.status(200).json({ ok: false, error: 'missing_env', message: 'Google Calendar not configured (missing Service Account env vars)' });
  }

  try {
    const client = getCalendarClient();
    if (!client) {
      return res.status(200).json({ ok: false, error: 'auth_error', message: 'Failed to create Google Calendar client' });
    }
    const calendar = google.calendar({ version: 'v3', auth: client });

    // Try a light-weight request: list events for today (no heavy data)
    const today = new Date();
    const timeMin = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 0, 0, 0).toISOString();
    const timeMax = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59).toISOString();
    const resp = await calendar.events.list({ calendarId: GOOGLE_CALENDAR_ID, timeMin, timeMax, maxResults: 1, singleEvents: true });
    // If we got here, creds are valid
    return res.status(200).json({ ok: true });
  } catch (err) {
    const body = err?.response?.data || err?.message || String(err);
    // detect invalid_grant specifically
    const message = typeof body === 'string' ? body : JSON.stringify(body);
    if (message.toLowerCase().includes('invalid_grant') || (err?.code && Number(err.code) === 401)) {
      return res.status(200).json({ ok: false, error: 'invalid_grant', message: 'Google Service Account credentials are invalid' });
    }
    return res.status(200).json({ ok: false, error: 'api_error', message });
  }
}
