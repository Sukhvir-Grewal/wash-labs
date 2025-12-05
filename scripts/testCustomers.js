import fs from "fs";
import path from "path";
import dotenv from "dotenv";
import mongoose from "mongoose";
import connectMongoose from "../lib/mongoose.js";
import BookingModel from "../models/Booking.js";
import CustomerModel from "../models/Customer.js";

function loadEnvFiles() {
  const cwd = process.cwd();
  const envPath = path.join(cwd, ".env");
  const envLocalPath = path.join(cwd, ".env.local");
  if (fs.existsSync(envPath)) dotenv.config({ path: envPath });
  if (fs.existsSync(envLocalPath)) dotenv.config({ path: envLocalPath, override: true });
}

loadEnvFiles();

async function run() {
  await connectMongoose();

  const samplePhone = "+1 555-0100";
  const sampleEmail = "sample.customer@washlabs.dev";

  const sampleBooking = {
    name: "Sample Customer",
    carName: "Sedan",
    service: "Deluxe Wash",
    date: "2025-01-15",
    time: "10:00",
    amount: 189,
    status: "pending",
    phone: samplePhone,
    email: sampleEmail,
    location: "123 Sample Street, Halifax",
    vehicles: [
      {
        name: "Sedan",
        type: "Car",
        lineTotal: 189,
      },
    ],
    createdAt: new Date().toISOString(),
    source: "script-test",
  };

  const bookingRecord = await BookingModel.create(sampleBooking);
  const bookingSnapshot = bookingRecord.toObject({ versionKey: false });

  const identifiers = [];
  if (samplePhone) identifiers.push({ phone: samplePhone });
  if (sampleEmail) identifiers.push({ email: sampleEmail.toLowerCase() });

  const setFields = {};
  if (sampleBooking.name) setFields.name = sampleBooking.name;
  if (samplePhone) setFields.phone = samplePhone;
  if (sampleEmail) setFields.email = sampleEmail.toLowerCase();
  if (sampleBooking.location) setFields.location = sampleBooking.location;
  if (sampleBooking.carName) setFields.car = sampleBooking.carName;

  const nowIso = new Date().toISOString();
  setFields.updatedAt = nowIso;

  const update = {
    $push: { bookings: bookingSnapshot },
    $setOnInsert: { createdAt: nowIso },
  };

  if (Object.keys(setFields).length) {
    update.$set = setFields;
  }

  if (!identifiers.length) {
    throw new Error("No identifiers available for customer lookup");
  }

  const selector = identifiers.length === 1 ? identifiers[0] : { $or: identifiers };

  const customer = await CustomerModel.findOneAndUpdate(
    selector,
    update,
    { upsert: true, new: true }
  ).lean();

  console.log("Customer profile updated:", {
    id: customer?._id,
    name: customer?.name,
    bookingCount: customer?.bookings?.length,
  });

  await mongoose.connection.close();
}

run().catch((error) => {
  console.error("Customer test script failed:", error);
  mongoose.connection.close().finally(() => process.exit(1));
}).then(() => {
  process.exit(0);
});
