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
  return calendar.events.insert({
    calendarId,
    resource: event,
  });
}
