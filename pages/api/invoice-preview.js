import { buildInvoicePdf } from "./send-invoice";
import connectMongoose from "../../lib/mongoose";
import BookingModel from "../../models/Booking";

const BRAND_PROFILE = {
  name: "Wash Labs",
  tagline: "Mobile Detailing & Ceramic Protection",
  color: "#0076ff",
  email: "washlabs.ca@gmail.com",
  phone: "+1 782-827-5010",
  address: "53 Vitalia Ct, Halifax, NS B3S 0H4",
  hours: "7:00 AM – 7:00 PM (Mon–Sun)",
};

const SAMPLE_BRAND = {
  name: "Wash Labs",
  tagline: "Mobile Detailing & Ceramic Protection",
  color: "#0076ff",
  email: "washlabs.ca@gmail.com",
  phone: "+1 782-827-5010",
  address: "53 Vitalia Ct, Halifax, NS B3S 0H4",
  hours: "7:00 AM – 7:00 PM (Mon–Sun)",
};

const createSampleBooking = () => ({
  name: "Jordan Matthews",
  customerName: "Jordan Matthews",
  company: "Harbourview Realty Inc.",
  email: "jordan.matthews@example.com",
  phone: "+1 (782) 555-9321",
  location: "123 Waterfront Ave, Halifax, NS B3H 4R2",
  service: "Ultimate Detail Package",
  date: "2025-01-15",
  time: "09:30",
  travelExpense: 45,
  discount: 25,
  tip: 40,
  taxAmount: 68.5,
  baseSum: 639.49,
  perCarTotals: [474.99, 329.5],
  amount: 1167.99,
  vehicles: [
    {
      name: "Tesla Model S",
      type: "Sedan",
      year: 2023,
      color: "Midnight Silver",
      revivePlan: true,
      lineTotal: 474.99,
      addOns: [
        { name: "Interior Shampoo", price: 80 },
        { name: "Pet Hair Removal", price: 45 },
      ],
    },
    {
      name: "Ford F-150",
      type: "Truck",
      year: 2021,
      color: "Oxford White",
      revivePlan: false,
      lineTotal: 329.5,
      addOns: [
        { name: "Headlight Restoration", price: 40 },
        { name: "Carpet Guard", price: null },
      ],
    },
  ],
  addOns: [
    { name: "Engine Bay Detail", price: 60 },
    { name: "Ceramic Spray Sealant", price: 75 },
  ],
  selectedAddOns: [
    { name: "Ceramic Spray Sealant", price: 75 },
    { name: "Odour Neutralizer", price: 25 },
  ],
});

export default async function handler(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res
      .status(405)
      .json({ success: false, message: "Method not allowed" });
  }

  try {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Expose-Headers", "Content-Disposition");
    const rawStatus =
      typeof req.query.status === "string"
        ? req.query.status.toLowerCase()
        : "due";
    const invoiceStatus = rawStatus === "paid" ? "paid" : "due";
    const bookingId =
      typeof req.query.bookingId === "string"
        ? req.query.bookingId.trim()
        : "";

    let pdfBuffer;

    if (bookingId) {
      await connectMongoose();
      const booking = await BookingModel.findById(bookingId).lean();
      if (!booking) {
        return res
          .status(404)
          .json({ success: false, message: "Booking not found" });
      }

      const invoiceNumber = booking.invoiceNumber
        ? String(booking.invoiceNumber).padStart(6, "0")
        : "PREVIEW";
      const issueDate = new Date();
      const dueDate = new Date(issueDate.getTime() + 7 * 24 * 60 * 60 * 1000);

      pdfBuffer = await buildInvoicePdf(booking, BRAND_PROFILE, {
        invoiceNumber,
        issueDate: issueDate.toLocaleDateString("en-CA"),
        dueDate: dueDate.toLocaleDateString("en-CA"),
        notes:
          invoiceStatus === "paid"
            ? "Preview copy marked as paid. No email sent."
            : "Preview copy. Payment would be due within 7 days.",
        status: invoiceStatus,
      });
    } else {
      const sampleBooking = createSampleBooking();
      const issueDate = new Date("2025-01-12T09:00:00-04:00");
      const dueDate = new Date(issueDate.getTime() + 7 * 24 * 60 * 60 * 1000);

      pdfBuffer = await buildInvoicePdf(sampleBooking, SAMPLE_BRAND, {
        invoiceNumber: "120261",
        issueDate: issueDate.toLocaleDateString("en-CA"),
        dueDate: dueDate.toLocaleDateString("en-CA"),
        notes:
          invoiceStatus === "paid"
            ? "Marked as paid for preview purposes."
            : "Preview invoice: payment would be due within 7 days.",
        status: invoiceStatus,
      });
    }

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Accept-Ranges", "bytes");
    res.setHeader(
      "Content-Disposition",
      "inline; filename=washlabs-invoice-preview.pdf",
    );
    res.setHeader("Cache-Control", "no-store, max-age=0");
    return res.send(pdfBuffer);
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error("[invoice-preview]", error);
    return res
      .status(500)
      .json({ success: false, message: "Failed to generate preview" });
  }
}
