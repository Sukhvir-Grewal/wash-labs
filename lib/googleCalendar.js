import { google } from 'googleapis';
import dotenv from 'dotenv';
dotenv.config();

export async function addBookingToCalendar({
  summary,
  description,
  location,
  startDateTime,
  endDateTime,
  calendarId,
}) {
  const {
    GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET,
    GOOGLE_REDIRECT_URI,
    GOOGLE_REFRESH_TOKEN
  } = process.env;

  const oAuth2Client = new google.auth.OAuth2(
    GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET,
    GOOGLE_REDIRECT_URI
  );
  oAuth2Client.setCredentials({ refresh_token: GOOGLE_REFRESH_TOKEN });

  const calendar = google.calendar({ version: 'v3', auth: oAuth2Client });
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
