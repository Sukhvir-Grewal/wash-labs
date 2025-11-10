import { MongoClient } from "mongodb";
import { requireAuth } from "../../lib/auth";
import { addBookingToCalendar } from '../../lib/googleCalendar';

const uri = process.env.MONGODB_URI;
const dbName = process.env.MONGODB_DB;

async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }
  const booking = req.body;
  if (!uri || !dbName) {
    return res.status(500).json({ error: "Missing MongoDB config" });
  }
  let client;
  try {
    client = await MongoClient.connect(uri, { useNewUrlParser: true, useUnifiedTopology: true });
    const db = client.db(dbName);
    const collection = db.collection("bookings");
    const result = await collection.insertOne(booking);

    // Add to Google Calendar
    try {
      const {
        GOOGLE_CLIENT_ID,
        GOOGLE_CLIENT_SECRET,
        GOOGLE_REDIRECT_URI,
        GOOGLE_CALENDAR_ID
      } = process.env;

      if (GOOGLE_CLIENT_ID && GOOGLE_CLIENT_SECRET && GOOGLE_REDIRECT_URI && GOOGLE_CALENDAR_ID) {
        if (booking.date && booking.time) {
          // Convert time to 24hr format if needed
          let time24hr = booking.time;
          if (booking.time.match(/AM|PM/i)) {
            const [time, period] = booking.time.split(/\s+/);
            let [hours, minutes] = time.split(':');
            hours = parseInt(hours, 10);
            
            if (period.toUpperCase() === 'PM' && hours !== 12) {
              hours += 12;
            } else if (period.toUpperCase() === 'AM' && hours === 12) {
              hours = 0;
            }
            
            time24hr = `${hours.toString().padStart(2, '0')}:${minutes || '00'}`;
          }
          
          const startDateTime = new Date(`${booking.date}T${time24hr}`);
          if (!isNaN(startDateTime.getTime())) {
            // Fetch the service duration from MongoDB
            let durationHours = 2; // fallback default
            try {
              // Try to match by title (case-insensitive)
              const svcCol = db.collection("services");
              const svcDoc = await svcCol.findOne({ title: { $regex: `^${booking.service}$`, $options: "i" } });
              if (svcDoc && typeof svcDoc.duration === "number" && svcDoc.duration > 0) {
                durationHours = svcDoc.duration;
              }
            } catch (svcErr) {
              console.error("[admin-booking] Failed to fetch service duration from DB", svcErr);
            }

            const endDateTime = new Date(startDateTime.getTime() + durationHours * 60 * 60 * 1000);
            
            await addBookingToCalendar({
              summary: `${booking.service} for ${booking.name}`,
              description: `Service: ${booking.service}\nVehicle: ${booking.carName}\nPhone: ${booking.phone}\nEmail: ${booking.email}\nNotes: ${booking.notes || ''}`,
              location: booking.location || '',
              startDateTime: startDateTime.toISOString(),
              endDateTime: endDateTime.toISOString(),
              calendarId: GOOGLE_CALENDAR_ID
            });
          } else {
            console.error('[admin-booking] Invalid start date/time for Google Calendar event:', { date: booking.date, time: booking.time });
          }
        }
      }
    } catch (calendarErr) {
      console.error('[admin-booking] Failed to add to Google Calendar:', calendarErr);
      // Don't fail the whole request if calendar add fails
    }

    res.status(200).json({ success: true, insertedId: result.insertedId });
  } catch (err) {
    res.status(500).json({ error: err.message });
  } finally {
    if (client) await client.close();
  }
}

// Wrap with authentication
export default requireAuth(handler);
