import mongoose from "mongoose";
import { BookingSchema } from "./Booking.js";

const { Schema } = mongoose;

const CustomerSchema = new Schema(
  {
    name: { type: String, trim: true },
    phone: { type: String, trim: true },
    location: { type: String, trim: true },
    car: { type: String, trim: true },
    email: { type: String, trim: true, lowercase: true },
    bookings: { type: [BookingSchema], default: [] },
  },
  {
    collection: "customers",
    timestamps: true,
  }
);

CustomerSchema.index({ phone: 1 }, { sparse: true });
CustomerSchema.index({ email: 1 }, { sparse: true });

const CustomerModel = mongoose.models.Customer || mongoose.model("Customer", CustomerSchema);

export default CustomerModel;
