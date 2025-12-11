import nodemailer from "nodemailer";
import PDFDocument from "pdfkit";
import connectMongoose from "../../lib/mongoose";
import BookingModel from "../../models/Booking";

const formatCurrency = (value) => {
  if (typeof value !== "number" || Number.isNaN(value)) return "--";
  return `$${value.toFixed(2)}`;
};

const buildAddOnList = (booking) => {
  const items = [];
  const process = (collection) => {
    if (!Array.isArray(collection)) return;
    collection.forEach((entry) => {
      if (!entry) return;
      if (Array.isArray(entry)) {
        process(entry);
        return;
      }
      const rawName = entry.name || entry.label || entry.title;
      const name = typeof rawName === "string" ? rawName.trim() : "";
      if (!name) return;
      const rawPrice =
        entry.price ?? entry.amount ?? entry.total ?? entry.value ?? entry.cost ?? null;
      const price = typeof rawPrice === "number" && Number.isFinite(rawPrice)
        ? rawPrice
        : null;
      const key = name.toLowerCase();
      if (!items.find((item) => item.key === key)) {
        items.push({ key, name, price });
      } else {
        const existing = items.find((item) => item.key === key);
        if (existing && (existing.price == null) && price != null) {
          existing.price = price;
        }
      }
    });
  };

  if (Array.isArray(booking.addOns)) process(booking.addOns);
  if (Array.isArray(booking.vehicles)) {
    booking.vehicles.forEach((vehicle) => process(vehicle?.addOns));
  }

  return items.map(({ name, price }) => ({ name, price }));
};

const createInvoicePdf = (booking, brand, meta) =>
  new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: "A4", margin: 48 });
    const buffers = [];

    doc.on("data", (chunk) => buffers.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(buffers)));
    doc.on("error", reject);

    const accent = brand.color;
    const neutral = "#0f172a";
    const subtext = "#475569";

    doc.fontSize(28).fillColor(neutral).font("Helvetica-Bold").text(brand.name.toUpperCase());
    doc.moveDown(0.25);
    doc.fontSize(12).fillColor(subtext).font("Helvetica").text(brand.tagline);

    doc.moveDown(1);
    doc.fillColor(neutral).fontSize(20).font("Helvetica-Bold").text("Invoice", { align: "right" });
    doc.fontSize(11).fillColor(subtext).font("Helvetica").text(`Invoice #: ${meta.invoiceNumber}`, {
      align: "right",
    });
    doc.text(`Issued: ${meta.issueDate}`, { align: "right" });
    doc.text(`Due: ${meta.dueDate}`, { align: "right" });

    doc.moveDown(1.5);
    doc.fontSize(12).fillColor(neutral).font("Helvetica-Bold").text("Bill To");
    doc.moveDown(0.3);
    doc.font("Helvetica").fillColor(subtext);
    doc.text(booking.name || "Client");
    if (booking.email) doc.text(booking.email);
    if (booking.phone) doc.text(booking.phone);
    if (booking.location) doc.text(booking.location);

    doc.moveDown(1);
    doc.fontSize(12).fillColor(neutral).font("Helvetica-Bold").text("Summary");
    doc.moveDown(0.5);

    const lineItems = [];
    if (Array.isArray(booking.vehicles) && booking.vehicles.length) {
      booking.vehicles.forEach((vehicle, index) => {
        const labelBase = vehicle?.name || `Vehicle ${index + 1}`;
        const description = `${labelBase} • ${booking.service}`;
        const amount =
          typeof vehicle?.lineTotal === "number"
            ? vehicle.lineTotal
            : booking.perCarTotals?.[index];
        if (amount != null) {
          lineItems.push({ description, amount });
        }
      });
    }

    if (!lineItems.length) {
      const amount = typeof booking.baseSum === "number" ? booking.baseSum : booking.amount;
      lineItems.push({ description: booking.service || "Detailing", amount });
    }

    const addOns = buildAddOnList(booking);
    addOns.forEach((addon) => {
      lineItems.push({
        description: `Add-on • ${addon.name}`,
        amount: addon.price ?? null,
      });
    });

    const hasTravel = typeof booking.travelExpense === "number" && booking.travelExpense > 0.009;
    if (hasTravel) {
      lineItems.push({ description: "Travel Expense", amount: booking.travelExpense });
    }

    const hasDiscount = typeof booking.discount === "number" && booking.discount > 0.009;
    if (hasDiscount) {
      lineItems.push({ description: "Discount", amount: -Math.abs(booking.discount) });
    }

    const amountColumnX = 400;
    const tableStartY = doc.y;
    const rowHeight = 20;

    doc.font("Helvetica-Bold").fontSize(11).fillColor(neutral);
    doc.text("Description", 48, tableStartY);
    doc.text("Amount", amountColumnX, tableStartY, { align: "right" });
    doc.moveTo(48, tableStartY + 18).lineTo(547, tableStartY + 18).strokeColor(accent).stroke();

    doc.font("Helvetica").fontSize(11).fillColor(subtext);
    let cursorY = tableStartY + 26;
    lineItems.forEach((item) => {
      doc.text(item.description, 48, cursorY, { width: amountColumnX - 60 });
      const amountText =
        typeof item.amount === "number" && Number.isFinite(item.amount)
          ? formatCurrency(item.amount)
          : "--";
      doc.text(amountText, amountColumnX, cursorY, { align: "right" });
      cursorY += rowHeight;
    });

    const computedTotal =
      typeof booking.amount === "number"
        ? booking.amount
        : (typeof booking.baseSum === "number" ? booking.baseSum : 0) +
          (hasTravel ? booking.travelExpense : 0) -
          (hasDiscount ? booking.discount : 0);

    doc.moveTo(48, cursorY).lineTo(547, cursorY).strokeColor("#e2e8f0").stroke();
    cursorY += 12;
    doc.font("Helvetica-Bold").fillColor(neutral);
    doc.text("Total Due", 48, cursorY);
    doc.text(formatCurrency(computedTotal), amountColumnX, cursorY, { align: "right" });

    cursorY += 32;
    doc.font("Helvetica").fontSize(10).fillColor(subtext);
    doc.text(`Notes: ${meta.notes}`, 48, cursorY, { width: 500 });

    cursorY += 40;
    doc.fontSize(10).fillColor(subtext).text(brand.address);
    doc.text(`Phone: ${brand.phone}`);
    doc.text(`Email: ${brand.email}`);
    doc.text(`Hours: ${brand.hours}`);

    doc.end();
  });

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ success: false, message: "Method not allowed" });
  }

  const { bookingId } = req.body || {};
  if (!bookingId) {
    return res.status(400).json({ success: false, message: "Missing bookingId" });
  }

  try {
    await connectMongoose();
    const booking = await BookingModel.findById(bookingId).lean();
    if (!booking) {
      return res.status(404).json({ success: false, message: "Booking not found" });
    }

    if (!booking.email) {
      return res.status(400).json({ success: false, message: "No email on file for this booking." });
    }

    const brand = {
      name: "Wash Labs",
      tagline: "Mobile Detailing & Ceramic Protection",
      color: "#0076ff",
      email: "washlabs.ca@gmail.com",
      phone: "+1 782-827-5010",
      address: "53 Vitalia Ct, Halifax, NS B3S 0H4",
      hours: "7:00 AM – 7:00 PM (Mon–Sun)",
    };

    const invoiceNumber = `INV-${new Date().toISOString().slice(0, 10).replace(/-/g, "")}-${String(booking._id).slice(-6).toUpperCase()}`;
    const issueDate = new Date();
    const dueDate = new Date(issueDate.getTime() + 7 * 24 * 60 * 60 * 1000);

    const totalDisplayAmount =
      typeof booking.amount === "number"
        ? booking.amount
        : typeof booking.baseSum === "number"
        ? booking.baseSum
        : 0;

    const pdfBuffer = await createInvoicePdf(booking, brand, {
      invoiceNumber,
      issueDate: issueDate.toLocaleDateString("en-CA"),
      dueDate: dueDate.toLocaleDateString("en-CA"),
      notes: "Payment is due within 7 days. Reply to this email with any questions.",
    });

    const { EMAIL_USER, EMAIL_PASS } = process.env;
    if (!EMAIL_USER || !EMAIL_PASS) {
      return res.status(500).json({
        success: false,
        message: "Email service is not configured. Please update EMAIL_USER and EMAIL_PASS.",
      });
    }

    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: EMAIL_USER,
        pass: EMAIL_PASS,
      },
    });

    const mailOptions = {
      from: `"Wash Labs" <${EMAIL_USER}>`,
      to: booking.email,
      subject: `Invoice ${invoiceNumber} — ${booking.service}`,
      text: `Hi ${booking.name || "there"},\n\nPlease find your invoice attached for ${booking.service}.\n\nTotal due: ${formatCurrency(totalDisplayAmount)}\nInvoice #: ${invoiceNumber}\n\nThank you for choosing Wash Labs!\n`,
      html: `<!doctype html><html><body style="font-family:Inter,Arial,sans-serif;color:#0f172a;">` +
        `<p>Hi ${booking.name || "there"},</p>` +
        `<p>Please find your invoice attached for <strong>${booking.service}</strong>.</p>` +
        `<p><strong>Total due:</strong> ${formatCurrency(totalDisplayAmount)}<br/>` +
        `<strong>Invoice #:</strong> ${invoiceNumber}</p>` +
        `<p>Payment is due within 7 days. Reply to this email if you have any questions.</p>` +
        `<p>— Wash Labs</p></body></html>`,
      attachments: [
        {
          filename: `WashLabs-Invoice-${invoiceNumber}.pdf`,
          content: pdfBuffer,
        },
      ],
    };

    await transporter.sendMail(mailOptions);

    return res.status(200).json({ success: true, message: "Invoice sent successfully." });
  } catch (error) {
    console.error("[send-invoice]", error);
    return res.status(500).json({ success: false, message: error.message || "Failed to send invoice" });
  }
}
