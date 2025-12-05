import { requireAuth } from "../../lib/auth";
import { addBookingToCalendar } from '../../lib/googleCalendar';
import connectMongoose from "../../lib/mongoose";
import BookingModel from "../../models/Booking";
import CustomerModel from "../../models/Customer";
import { getDb } from "../../lib/mongodb";

const uri = process.env.MONGODB_URI || process.env.MONGODB_URL;
const dbName = process.env.MONGODB_DB || process.env.DB_NAME || "washlabs";

async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }
  const booking = req.body;
  if (!uri || !dbName) {
    return res.status(500).json({ error: "Missing MongoDB config" });
  }
  try {
    await connectMongoose();

    const phoneParts = [booking.countryCode, booking.phone]
      .map((part) => (part || "").trim())
      .filter(Boolean);
    const phoneForMatching = phoneParts.join(" ").replace(/\s+/g, " ").trim();
    const emailForMatching = (booking.email || "").trim().toLowerCase();

    const bookingPayload = {
      ...booking,
      phone: phoneForMatching || booking.phone,
      email: booking.email ? booking.email.trim() : booking.email,
      createdAt: booking.createdAt || new Date().toISOString(),
      source: booking.source || "admin",
    };

    const bookingRecord = await BookingModel.create(bookingPayload);

    const identifiers = [];
    if (phoneForMatching) identifiers.push({ phone: phoneForMatching });
    if (emailForMatching) identifiers.push({ email: emailForMatching });

    if (identifiers.length) {
      const bookingSnapshot = bookingRecord.toObject({ versionKey: false });
      const primaryVehicleName = Array.isArray(bookingRecord.vehicles) && bookingRecord.vehicles.length > 0
        ? bookingRecord.vehicles[0]?.name || bookingRecord.carName || ""
        : bookingRecord.carName || "";
      const customerLocation = bookingRecord.location || "";

      const setFields = {};
      if (bookingRecord.name) setFields.name = bookingRecord.name;
      if (phoneForMatching) setFields.phone = phoneForMatching;
      if (emailForMatching) setFields.email = emailForMatching;
      if (customerLocation) setFields.location = customerLocation;
      if (primaryVehicleName) setFields.car = primaryVehicleName;

      const nowIso = new Date().toISOString();
      setFields.updatedAt = nowIso;

      const update = {
        $push: { bookings: bookingSnapshot },
        $setOnInsert: { createdAt: nowIso },
      };
      if (Object.keys(setFields).length) update.$set = setFields;

      await CustomerModel.findOneAndUpdate(
        identifiers.length === 1 ? identifiers[0] : { $or: identifiers },
        update,
        { upsert: true, new: true }
      );
    }

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
              const svcDb = await getDb();
              const svcCol = svcDb.collection("services");
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

    res.status(200).json({ success: true, insertedId: bookingRecord._id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// Wrap with authentication
export default requireAuth(handler);
