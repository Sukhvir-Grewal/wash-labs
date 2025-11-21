import { google } from 'googleapis';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }

  const {
    GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET,
    GOOGLE_REDIRECT_URI,
    GOOGLE_REFRESH_TOKEN,
    GOOGLE_CALENDAR_ID,
  } = process.env;

  if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET || !GOOGLE_REFRESH_TOKEN || !GOOGLE_CALENDAR_ID) {
    return res.status(200).json({ ok: false, error: 'missing_env', message: 'Google Calendar not configured (missing env vars)' });
  }

  try {
    const oAuth2Client = new google.auth.OAuth2(GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REDIRECT_URI);
    oAuth2Client.setCredentials({ refresh_token: GOOGLE_REFRESH_TOKEN });
    const calendar = google.calendar({ version: 'v3', auth: oAuth2Client });

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
      return res.status(200).json({ ok: false, error: 'invalid_grant', message: 'Google refresh token is invalid or expired' });
    }
    return res.status(200).json({ ok: false, error: 'api_error', message });
  }
}
