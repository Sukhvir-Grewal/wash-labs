import fs from "fs";
import path from "path";
import dotenv from "dotenv";
import mongoose from "mongoose";
import connectMongoose from "../lib/mongoose.js";
import BookingModel from "../models/Booking.js";
import CustomerModel from "../models/Customer.js";

const BUSINESS_LOCATION = "53 Vitalia Ct, Halifax, NS";
const DEFAULT_CUSTOMER_NAME = "CUS";
const DEFAULT_CAR_NAME = "Sedan/SUV/Truck";

function loadEnvFiles() {
  const cwd = process.cwd();
  const envPath = path.join(cwd, ".env");
  const envLocalPath = path.join(cwd, ".env.local");
  if (fs.existsSync(envPath)) dotenv.config({ path: envPath });
  if (fs.existsSync(envLocalPath)) dotenv.config({ path: envLocalPath, override: true });
}

function normalizePhone(rawPhone = "") {
  return rawPhone.trim().replace(/\s+/g, " ");
}

function normalizeEmail(rawEmail = "") {
  return rawEmail.trim().toLowerCase();
}

function deriveCarName(booking) {
  if (!booking) return null;
  if (Array.isArray(booking.vehicles) && booking.vehicles.length > 0) {
    const veh = booking.vehicles.find((v) => v?.name) || booking.vehicles[0];
    if (veh?.name) return veh.name.trim();
  }
  if (booking.carName) return booking.carName.trim();
  if (booking.carType) return booking.carType.trim();
  return null;
}

function deriveLocation(booking) {
  if (!booking) return null;
  const loc = booking.location || booking.address;
  if (typeof loc === "string" && loc.trim()) return loc.trim();
  return null;
}

function sanitizeBookingSnapshot(bookingDoc) {
  const snapshot = { ...bookingDoc };
  delete snapshot.__v;
  return snapshot;
}

loadEnvFiles();

async function run() {
  await connectMongoose();

  const bookings = await BookingModel.find({}).lean();
  console.log(`[backfill] Loaded ${bookings.length} bookings`);

  const aggregates = new Map();
  let skipped = 0;

  // Group bookings by normalized phone/email so we can build one customer per contact.
  for (const booking of bookings) {
    const phone = normalizePhone(booking.phone || "");
    const email = normalizeEmail(booking.email || "");

    if (!phone && !email) {
      skipped += 1;
      continue;
    }

    const key = `${phone}::${email}`;
    if (!aggregates.has(key)) {
      aggregates.set(key, {
        phone,
        email,
        name: null,
        car: null,
        location: null,
        bookings: [],
      });
    }

    const agg = aggregates.get(key);
    if (!agg.name && booking.name && booking.name.trim()) agg.name = booking.name.trim();
    const derivedCar = deriveCarName(booking);
    if (!agg.car && derivedCar) agg.car = derivedCar;
    const derivedLoc = deriveLocation(booking);
    if (!agg.location && derivedLoc) agg.location = derivedLoc;

    agg.bookings.push(sanitizeBookingSnapshot(booking));
  }

  console.log(`[backfill] Prepared ${aggregates.size} customer aggregates`);

  let processed = 0;
  for (const agg of aggregates.values()) {
    const identifiers = [];
    if (agg.phone) identifiers.push({ phone: agg.phone });
    if (agg.email) identifiers.push({ email: agg.email });

    if (!identifiers.length) continue;

    const selector = identifiers.length === 1 ? identifiers[0] : { $or: identifiers };

    const name = agg.name || DEFAULT_CUSTOMER_NAME;
    const car = agg.car || DEFAULT_CAR_NAME;
    const location = agg.location || BUSINESS_LOCATION;

    const update = {
      $set: {
        name,
        car,
        location,
        bookings: agg.bookings,
      },
    };

    if (agg.phone) update.$set.phone = agg.phone;
    if (agg.email) update.$set.email = agg.email;

    await CustomerModel.findOneAndUpdate(
      selector,
      update,
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    processed += 1;
  }

  console.log(`[backfill] Upserted ${processed} customers`);
  if (skipped) {
    console.log(`[backfill] Skipped ${skipped} bookings without phone/email`);
  }

  await mongoose.connection.close();
  console.log("[backfill] Done");
}

run().catch((error) => {
  console.error("[backfill] Failed:", error);
  mongoose.connection.close().finally(() => process.exit(1));
});
