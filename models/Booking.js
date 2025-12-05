import mongoose from "mongoose";

const { Schema } = mongoose;

const VehicleSchema = new Schema(
  {
    name: { type: String, trim: true },
    type: { type: String, trim: true },
    lineTotal: { type: Number },
    addOns: { type: [Schema.Types.Mixed], default: undefined },
    revivePlan: { type: Boolean },
  },
  { _id: false }
);

const BookingSchema = new Schema(
  {
    name: { type: String, trim: true },
    carName: { type: String, trim: true },
    service: { type: String, trim: true },
    date: { type: String, trim: true },
    time: { type: String, trim: true },
    timeValue: { type: String, trim: true },
    timeISO: { type: String, trim: true },
    timeZone: { type: String, trim: true },
    amount: { type: Number },
    baseSum: { type: Number },
    travelExpense: { type: Number },
    discount: { type: Number },
    vehicles: { type: [VehicleSchema], default: undefined },
    perCarTotals: { type: [Number], default: undefined },
    status: { type: String, trim: true, default: "pending" },
    phone: { type: String, trim: true },
    email: { type: String, trim: true, lowercase: true },
    location: { type: String, trim: true },
    addOns: { type: [Schema.Types.Mixed], default: undefined },
    carType: { type: String, trim: true },
    createdAt: { type: String, default: () => new Date().toISOString() },
    source: { type: String, trim: true, default: "online" },
  },
  {
    collection: "bookings",
    minimize: false,
  }
);

const BookingModel = mongoose.models.Booking || mongoose.model("Booking", BookingSchema);

export default BookingModel;
export { BookingSchema };
