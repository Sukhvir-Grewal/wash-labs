import { google } from 'googleapis';

const SCOPES = ['https://www.googleapis.com/auth/calendar'];

export function getCalendarClient() {
  const { GOOGLE_SERVICE_ACCOUNT_EMAIL, GOOGLE_PRIVATE_KEY } = process.env;
  if (!GOOGLE_SERVICE_ACCOUNT_EMAIL || !GOOGLE_PRIVATE_KEY) {
    console.warn('[googleCalendar] Missing Service Account credentials');
    return null;
  }

  // Handle private key newlines and potential wrapping quotes
  let privateKey = GOOGLE_PRIVATE_KEY;
  if (privateKey.startsWith('"') && privateKey.endsWith('"')) {
    privateKey = privateKey.slice(1, -1);
  }
  privateKey = privateKey.replace(/\\n/g, '\n');

  try {
    // Use GoogleAuth for better project detection and credential handling
    const auth = new google.auth.GoogleAuth({
      credentials: {
        client_email: GOOGLE_SERVICE_ACCOUNT_EMAIL,
        private_key: privateKey,
      },
      scopes: SCOPES,
      // Explicitly set projectId from email if possible to avoid "unregistered caller"
      projectId: GOOGLE_SERVICE_ACCOUNT_EMAIL.split('@')[1]?.split('.')[0]
    });

    return auth;
  } catch (e) {
    console.error('[googleCalendar] Error initializing GoogleAuth client:', e);
    return null;
  }
}

export async function addBookingToCalendar({
  summary,
  description,
  location,
  startDateTime,
  endDateTime,
  calendarId,
}) {
  const auth = getCalendarClient();
  if (!auth) {
    throw new Error('Google Calendar Service Account not configured');
  }

  const calendar = google.calendar({ version: 'v3', auth });
  const event = {
    summary,
    location,
    description,
    start: {
      dateTime: startDateTime,
      timeZone: 'America/Halifax',
    },
    end: {
      dateTime: endDateTime,
      timeZone: 'America/Halifax',
    },
    colorId: '11',
  };
  if (!calendarId) {
    const msg = 'Missing calendarId for Google Calendar event';
    console.error('[googleCalendar] ' + msg);
    throw new Error(msg);
  }

  try {
    const resp = await calendar.events.insert({
      calendarId,
      resource: event,
    });
    return resp;
  } catch (err) {
    // Normalize google api errors so callers can log useful info
    try {
      const details = err?.response?.data || err?.message || err;
      console.error('[googleCalendar] Failed to insert event:', details);
      throw new Error(`Google Calendar insert failed: ${JSON.stringify(details)}`);
    } catch (e) {
      // Fallback
      console.error('[googleCalendar] Failed to insert event (unknown error)', err);
      throw new Error('Google Calendar insert failed');
    }
  }
}
