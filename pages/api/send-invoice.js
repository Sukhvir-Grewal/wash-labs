import fs from "fs";
import path from "path";
import mongoose from "mongoose";
import nodemailer from "nodemailer";
import PDFDocument from "pdfkit";
import connectMongoose from "../../lib/mongoose";
import BookingModel from "../../models/Booking";

export const currencyFormatter = new Intl.NumberFormat("en-CA", {
  style: "currency",
  currency: "CAD",
});

const MIN_INVOICE_NUMBER = 120261;
let interFontWarningLogged = false;

export const formatCurrency = (value) => {
  const numeric = typeof value === "number" ? value : Number(value);
  return currencyFormatter.format(Number.isFinite(numeric) ? numeric : 0);
};

const resolveExistingFontPath = (root, candidates) => {
  for (const candidate of candidates) {
    const candidatePath = path.join(root, candidate);
    if (fs.existsSync(candidatePath)) return candidatePath;
  }
  return null;
};

const registerInterFonts = (doc) => {
  const searchRoots = [
    path.join(process.cwd(), "public", "fonts"),
    path.join(process.cwd(), "public"),
    path.join(process.cwd(), "fonts"),
  ];

  for (const root of searchRoots) {
    const regularPath = resolveExistingFontPath(root, [
      "Inter-Regular.ttf",
      "Inter-Regular.otf",
      "Inter-Regular-400.ttf",
      "Inter-Regular-400.otf",
    ]);
    const boldPath = resolveExistingFontPath(root, [
      "Inter-Bold.ttf",
      "Inter-Bold.otf",
      "Inter-Bold-700.ttf",
      "Inter-Bold-700.otf",
      "Inter-700.ttf",
      "Inter-700.otf",
    ]);
    if (regularPath && boldPath) {
      try {
        doc.registerFont("Inter-Regular", regularPath);
        doc.registerFont("Inter-Bold", boldPath);
        return { regular: "Inter-Regular", bold: "Inter-Bold" };
      } catch (error) {
        if (!interFontWarningLogged) {
          console.warn(
            "[send-invoice] Unable to register Inter font files. Falling back to Helvetica.",
            error,
          );
          interFontWarningLogged = true;
        }
      }
    }
  }

  if (!interFontWarningLogged) {
    console.warn(
      "[send-invoice] Inter font files not found in public/fonts. Falling back to Helvetica.",
    );
    interFontWarningLogged = true;
  }

  return { regular: "Helvetica", bold: "Helvetica-Bold" };
};

const normalizeInvoiceNumberValue = (value) => {
  if (value == null) return null;
  const digits = String(value).replace(/\D/g, "");
  if (!digits) return null;
  const numeric = Number(digits);
  if (!Number.isFinite(numeric)) return null;
  const integer = Math.trunc(numeric);
  return integer >= MIN_INVOICE_NUMBER ? integer : null;
};

const ensureInvoiceNumber = async (bookingId, existingValue) => {
  const currentInvoice = normalizeInvoiceNumberValue(existingValue);
  if (currentInvoice) return currentInvoice;

  const countersCollection = mongoose.connection.collection("counters");

  await countersCollection.updateOne(
    { _id: "invoiceSequence" },
    { $setOnInsert: { value: MIN_INVOICE_NUMBER - 1 } },
    { upsert: true },
  );

  for (let attempt = 0; attempt < 5; attempt += 1) {
    const sequenceResult = await countersCollection.findOneAndUpdate(
      { _id: "invoiceSequence" },
      { $inc: { value: 1 } },
      { upsert: true, returnDocument: "after" },
    );

    const rawCandidate = sequenceResult?.value?.value ?? sequenceResult?.value;
    const numericCandidate = Number(rawCandidate);
    if (!Number.isFinite(numericCandidate)) {
      continue;
    }

    let candidate = Math.trunc(numericCandidate);
    if (candidate < MIN_INVOICE_NUMBER) {
      const correctionResult = await countersCollection.findOneAndUpdate(
        { _id: "invoiceSequence" },
        { $set: { value: MIN_INVOICE_NUMBER } },
        { returnDocument: "after" },
      );
      const correctedValue =
        correctionResult?.value?.value ??
        correctionResult?.value ??
        MIN_INVOICE_NUMBER;
      const correctedNumeric = Number(correctedValue);
      candidate = Number.isFinite(correctedNumeric)
        ? Math.max(MIN_INVOICE_NUMBER, Math.trunc(correctedNumeric))
        : MIN_INVOICE_NUMBER;
    }

    const updateResult = await BookingModel.findOneAndUpdate(
      {
        _id: bookingId,
        $or: [
          { invoiceNumber: { $exists: false } },
          { invoiceNumber: null },
          { invoiceNumber: { $lt: MIN_INVOICE_NUMBER } },
        ],
      },
      { $set: { invoiceNumber: candidate } },
      { new: true },
    )
      .select({ invoiceNumber: 1 })
      .lean();

    const updatedValue = normalizeInvoiceNumberValue(
      updateResult?.invoiceNumber,
    );
    if (updatedValue) return updatedValue;

    const refreshedBooking = await BookingModel.findById(bookingId, {
      invoiceNumber: 1,
    }).lean();
    const refreshedValue = normalizeInvoiceNumberValue(
      refreshedBooking?.invoiceNumber,
    );
    if (refreshedValue) return refreshedValue;
  }

  throw new Error("Unable to assign invoice number");
};

export const buildInvoicePdf = (booking, brand, meta) =>
  new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: "A4", margin: 48 });
    const fonts = registerInterFonts(doc);
    const pickFont = (weight) =>
      weight === "bold" ? fonts.bold : fonts.regular;
    const buffers = [];

    doc.on("data", (chunk) => buffers.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(buffers)));
    doc.on("error", reject);

    const pageWidth = doc.page.width;
    const margin = doc.page.margins.left;
    const usableWidth = pageWidth - margin * 2;
    const neutral = "#0f172a";
    const subtext = "#64748b";
    const light = "#e2e8f0";
    const accent = brand.color || "#0076ff";

    const normalizeNumber = (value) => {
      if (typeof value === "number" && Number.isFinite(value)) return value;
      const parsed = Number(value);
      return Number.isFinite(parsed) ? parsed : null;
    };

    const perCarTotalsRaw = Array.isArray(booking.perCarTotals)
      ? booking.perCarTotals
      : [];
    const perCarTotals = perCarTotalsRaw.map(
      (value) => normalizeNumber(value) ?? 0,
    );

    const vehiclesSource =
      Array.isArray(booking.vehicles) && booking.vehicles.length
        ? booking.vehicles
        : Array.isArray(booking.cars) && booking.cars.length
          ? booking.cars
          : [];

    const addOnAccumulator = new Map();
    const addAddOn = (entry, { increment = true } = {}) => {
      if (!entry) return;
      const rawName = entry.name || entry.label || entry.title;
      const name = typeof rawName === "string" ? rawName.trim() : "";
      if (!name) return;
      const rawPrice =
        entry.price ??
        entry.amount ??
        entry.total ??
        entry.value ??
        entry.cost ??
        null;
      const price = normalizeNumber(rawPrice);
      const key = `${name.toLowerCase()}|${price != null ? price : "null"}`;
      const quantityRaw = Number(entry.quantity);
      const quantityToAdd =
        Number.isFinite(quantityRaw) && quantityRaw > 0 ? quantityRaw : 1;
      if (addOnAccumulator.has(key)) {
        if (increment) addOnAccumulator.get(key).quantity += quantityToAdd;
        return;
      }
      addOnAccumulator.set(key, { name, price, quantity: quantityToAdd });
    };

    const lineItems = [];

    if (vehiclesSource.length) {
      vehiclesSource.forEach((vehicle, index) => {
        const perCarTotal = normalizeNumber(
          typeof vehicle?.lineTotal === "number"
            ? vehicle.lineTotal
            : perCarTotals[index],
        );
        const vehicleAddOns = Array.isArray(vehicle?.addOns)
          ? vehicle.addOns
          : [];
        let addOnSum = 0;
        vehicleAddOns.forEach((addon) => {
          addAddOn(addon);
          const price = normalizeNumber(
            addon?.price ??
              addon?.amount ??
              addon?.total ??
              addon?.value ??
              addon?.cost,
          );
          if (price != null) addOnSum += price;
        });

        const basePrice =
          perCarTotal != null && perCarTotal > 0
            ? Math.max(perCarTotal - addOnSum, 0)
            : null;

        const serviceLabel =
          (typeof booking.service === "string" && booking.service) ||
          booking.service?.title ||
          booking.service?.name ||
          "Detailing Service";

        const vehicleType = vehicle?.type || `Vehicle ${index + 1}`;
        const isRevivePlan =
          Boolean(vehicle?.revivePlan) ||
          /revive/i.test(String(vehicle?.plan || ""));
        const planTag = isRevivePlan ? "<REVIVE>" : "<BASIC>";

        if (basePrice != null && basePrice > 0.009) {
          lineItems.push({
            description: serviceLabel,
            secondaryDescription: `${planTag} - ${vehicleType}`,
            quantity: 1,
            rate: basePrice,
            total: basePrice,
            emphasis: "service",
          });
        } else if (perCarTotal != null && perCarTotal > 0.009) {
          lineItems.push({
            description: serviceLabel,
            secondaryDescription: `${planTag} - ${vehicleType}`,
            quantity: 1,
            rate: perCarTotal,
            total: perCarTotal,
            emphasis: "service",
          });
        }
      });
    }

    const aggregateAddOnCollections = [];
    if (Array.isArray(booking.addOns))
      aggregateAddOnCollections.push(booking.addOns);
    if (Array.isArray(booking.selectedAddOns))
      aggregateAddOnCollections.push(booking.selectedAddOns);
    if (Array.isArray(booking.service?.selectedAddOns))
      aggregateAddOnCollections.push(booking.service.selectedAddOns);
    if (Array.isArray(booking.service?.addOns))
      aggregateAddOnCollections.push(booking.service.addOns);

    aggregateAddOnCollections.forEach((collection) => {
      collection.forEach((entry) => addAddOn(entry, { increment: false }));
    });

    const addOnLines = [];
    addOnAccumulator.forEach((addon) => {
      const total = addon.price != null ? addon.price * addon.quantity : null;
      const tag = addon.price == null ? "<ADD ON INCLUDED>" : "<ADD ON>";
      addOnLines.push({
        description: `${addon.name} ${tag}`,
        quantity: addon.quantity,
        rate: addon.price,
        rateLabel: addon.price == null ? "Included" : undefined,
        total,
        totalLabel: addon.price == null ? "Included" : undefined,
        emphasis: "addon",
      });
    });
    addOnLines.sort((a, b) => a.description.localeCompare(b.description));
    addOnLines.forEach((item) => lineItems.push(item));

    if (!lineItems.length) {
      const fallbackAmount =
        normalizeNumber(booking.baseSum) ??
        normalizeNumber(booking.amount) ??
        normalizeNumber(booking.service?.basePrice) ??
        0;
      if (fallbackAmount > 0.009) {
        lineItems.push({
          description:
            booking.service?.title || booking.service || "Detailing Service",
          quantity: 1,
          rate: fallbackAmount,
          total: fallbackAmount,
          emphasis: "service",
        });
      }
    }

    const lineSubtotal = lineItems.reduce((sum, item) => {
      const totalValue = normalizeNumber(item.total);
      return totalValue != null ? sum + totalValue : sum;
    }, 0);

    const travelAmount = normalizeNumber(booking.travelExpense) ?? 0;
    const discountAmount = normalizeNumber(booking.discount) ?? 0;
    const tipAmount = normalizeNumber(booking.tip) ?? 0;
    const taxAmount = normalizeNumber(booking.taxAmount) ?? 0;
    const subtotalValue =
      lineSubtotal + travelAmount - discountAmount + tipAmount;
    const totalValue = subtotalValue + taxAmount;
    const finalLabel = meta.status === "paid" ? "Amount paid" : "Amount due";

    const logoPath = path.join(process.cwd(), "public", "images", "logo.png");
    if (fs.existsSync(logoPath)) {
      const logoSize = 96;
      const titleBlockHeight = 56;
      const availableHeight = Math.max(titleBlockHeight, logoSize);
      const blockTop = margin - 40;
      const logoY = blockTop + (availableHeight - logoSize) / 2;
      const logoX = pageWidth - margin - logoSize;
      doc.image(logoPath, logoX, logoY, {
        fit: [logoSize, logoSize],
        align: "right",
      });
    }

    doc
      .fillColor(neutral)
      .font(fonts.bold)
      .fontSize(24)
      .text("INVOICE", margin, margin);
    doc
      .font(pickFont())
      .fontSize(11)
      .fillColor(subtext)
      .text(`#${meta.invoiceNumber}`, margin, doc.y + 6);

    // Paid badge removed per preview feedback.

    const columnTop = doc.y + 24;

    const writeColumn = (title, lines, x, width) => {
      const sanitizedLines = lines.filter(
        (line) => line && String(line).trim().length,
      );
      const isSectionTitle =
        title === "Issued" || title.startsWith("Billed") || title === "From";
      doc
        .fillColor(neutral)
        .font(pickFont("bold"))
        .fontSize(10)
        .text(title, x, columnTop);
      doc
        .fillColor(subtext)
        .font(pickFont())
        .fontSize(10)
        .text(sanitizedLines.join("\n"), x, columnTop + 14, {
          width,
          lineGap: 4,
        });
      return doc.y;
    };

    const columnWidth = usableWidth / 3 - 8;
    const issuedDisplay =
      typeof meta.issueDate === "string"
        ? meta.issueDate.trim()
        : meta.issueDate != null
          ? String(meta.issueDate).trim()
          : "";
    const col1Lines = issuedDisplay ? [issuedDisplay] : [];
    const clientName = booking.name || booking.customerName || "Client";
    const col2Lines = [
      booking.company ? booking.company : null,
      booking.location,
      booking.email,
      booking.phone,
    ];
    const col3Lines = [brand.address, brand.email, brand.phone];
    const fromLabel = `From — ${brand.name}`;

    const col1Bottom = writeColumn("Issued", col1Lines, margin, columnWidth);
    const col2Bottom = writeColumn(
      `Billed to — ${clientName}`,
      col2Lines,
      margin + columnWidth + 12,
      columnWidth,
    );
    const col3Bottom = writeColumn(
      fromLabel,
      col3Lines,
      margin + (columnWidth + 12) * 2,
      columnWidth,
    );

    const detailBottom = Math.max(col1Bottom, col2Bottom, col3Bottom);
    const boxTop = columnTop - 10;
    const boxBottom = detailBottom + 10;

    doc.save();
    doc.strokeColor(light).lineWidth(1);
    doc
      .moveTo(margin, boxTop)
      .lineTo(pageWidth - margin, boxTop)
      .stroke();
    doc
      .moveTo(margin, boxBottom)
      .lineTo(pageWidth - margin, boxBottom)
      .stroke();
    const separatorPositions = [
      margin + columnWidth + 6,
      margin + (columnWidth + 12) * 2 - 6,
    ];
    separatorPositions.forEach((xPosition) => {
      doc.moveTo(xPosition, boxTop).lineTo(xPosition, boxBottom).stroke();
    });
    doc.restore();

    const tableTop = detailBottom + 24;

    const descX = margin;
    const qtyX = margin + 260;
    const rateX = qtyX + 60;
    const totalX = pageWidth - margin - 80;
    const rowHeight = 24;

    doc.fillColor(neutral).font(pickFont("bold")).fontSize(9);
    doc.text("Service", descX, tableTop, { width: qtyX - descX - 8 });
    doc.text("Qty", qtyX, tableTop, { width: 50, align: "right" });
    doc.text("Rate", rateX, tableTop, { width: 80, align: "right" });
    doc.text("Line total", totalX, tableTop, { width: 80, align: "right" });

    let rowY = tableTop + 14;
    doc
      .moveTo(margin, rowY + 4)
      .lineTo(pageWidth - margin, rowY + 4)
      .strokeColor(light)
      .stroke();
    rowY += 10;

    const formatAmount = (amount, label) => {
      if (label) return label;
      const numeric = normalizeNumber(amount);
      return numeric != null ? formatCurrency(numeric) : "--";
    };

    const descriptionWidth = qtyX - descX - 12;
    lineItems.forEach((item) => {
      if (item.emphasis === "service") {
        doc
          .fillColor(neutral)
          .font(pickFont("bold"))
          .fontSize(10)
          .text(item.description, descX + 4, rowY, {
            width: descriptionWidth,
            continued: Boolean(item.secondaryDescription),
          });
        if (item.secondaryDescription) {
          doc
            .fillColor(subtext)
            .font(pickFont())
            .fontSize(10)
            .text(` ${item.secondaryDescription}`, {
              width: descriptionWidth,
            });
        }
      } else {
        let addOnMain = item.description;
        let addOnTag = "";
        const tagMatch = addOnMain.match(/( <ADD ON(?: INCLUDED)?>)$/);
        if (tagMatch) {
          addOnMain = addOnMain.slice(0, -tagMatch[1].length);
          addOnTag = tagMatch[1];
        }

        doc
          .fillColor(neutral)
          .font(pickFont())
          .fontSize(10)
          .text(addOnMain, descX + 4, rowY, {
            width: descriptionWidth,
            continued: Boolean(addOnTag),
          });
        if (addOnTag) {
          doc.fillColor(subtext).font(pickFont()).fontSize(10).text(addOnTag, {
            width: descriptionWidth,
          });
        }
      }
      doc.text(String(item.quantity || 1), qtyX, rowY, {
        width: 50,
        align: "right",
      });
      doc
        .fillColor(neutral)
        .font(pickFont())
        .fontSize(10)
        .text(formatAmount(item.rate, item.rateLabel), rateX, rowY, {
          width: 80,
          align: "right",
        });
      doc
        .fillColor(subtext)
        .font(pickFont())
        .fontSize(10)
        .text(formatAmount(item.total, item.totalLabel), totalX, rowY, {
          width: 80,
          align: "right",
        });
      rowY += rowHeight;
    });

    doc
      .moveTo(margin, rowY - 6)
      .lineTo(pageWidth - margin, rowY - 6)
      .strokeColor(light)
      .stroke();

    const summaryStart = rowY + 16;
    const summaryLabelX = rateX;
    const summaryValueX = totalX;
    const summaryRows = [
      { label: "Travel", value: travelAmount },
      ...(discountAmount > 0
        ? [{ label: "Discount", value: -discountAmount }]
        : []),
      { label: "Subtotal", value: subtotalValue },
      { label: "Tax (HST)", value: taxAmount },
      { label: "Total", value: totalValue },
      { label: finalLabel, value: totalValue, bold: true, highlight: true },
    ];

    const summaryLeft = summaryLabelX;
    const summaryRight = summaryValueX + 80;
    const summaryRowSpacing = 20;

    let summaryY = summaryStart - 6;
    summaryRows.forEach((row, index) => {
      const isFinalRow = index === summaryRows.length - 1;
      const topLineY = summaryY - 6;
      if (index > 0) {
        const topLineStart = summaryLeft;
        const topLineColor = isFinalRow ? neutral : light;
        const topLineWidth = isFinalRow ? 1.4 : 1;
        doc.strokeColor(topLineColor).lineWidth(topLineWidth);
        doc
          .moveTo(topLineStart, topLineY)
          .lineTo(summaryRight, topLineY)
          .stroke();
      }

      const valueText = formatAmount(row.value);
      doc.font(pickFont(row.bold ? "bold" : undefined));
      doc.fillColor(neutral).text(row.label, summaryLeft, summaryY, {
        width: summaryValueX - summaryLeft - 4,
        align: "left",
      });
      doc
        .fillColor(row.bold ? neutral : subtext)
        .font(pickFont(row.bold ? "bold" : undefined))
        .text(valueText, summaryValueX, summaryY, {
          width: summaryRight - summaryValueX,
          align: "right",
        });

      const bottomLineY = summaryY + summaryRowSpacing - 6;
      const bottomLineStart = summaryLeft;
      const bottomLineColor = isFinalRow ? neutral : light;
      const bottomLineWidth = isFinalRow ? 1.4 : 1;
      doc.strokeColor(bottomLineColor).lineWidth(bottomLineWidth);
      doc
        .moveTo(bottomLineStart, bottomLineY)
        .lineTo(summaryRight, bottomLineY)
        .stroke();

      summaryY += summaryRowSpacing;
    });

    const footerTop = doc.page.height - 96;
    doc
      .moveTo(margin, footerTop)
      .lineTo(pageWidth - margin, footerTop)
      .strokeColor(light)
      .stroke();
    doc
      .fillColor(subtext)
      .font(pickFont())
      .fontSize(10)
      .text("Thank you for your business!", margin, footerTop + 12, {
        width: usableWidth,
      });

    doc.end();
  });

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res
      .status(405)
      .json({ success: false, message: "Method not allowed" });
  }

  const { bookingId, invoiceType } = req.body || {};
  if (!bookingId) {
    return res
      .status(400)
      .json({ success: false, message: "Missing bookingId" });
  }

  const normalizedType =
    typeof invoiceType === "string" ? invoiceType.trim().toLowerCase() : "due";
  const invoiceStatus = normalizedType === "paid" ? "paid" : "due";

  try {
    await connectMongoose();
    const booking = await BookingModel.findById(bookingId).lean();
    if (!booking) {
      return res
        .status(404)
        .json({ success: false, message: "Booking not found" });
    }

    if (!booking.email) {
      return res.status(400).json({
        success: false,
        message: "No email on file for this booking.",
      });
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

    const assignedInvoiceNumber = await ensureInvoiceNumber(
      bookingId,
      booking.invoiceNumber,
    );
    booking.invoiceNumber = assignedInvoiceNumber;

    const invoiceNumberString = String(assignedInvoiceNumber).padStart(6, "0");

    const serviceLabel =
      (typeof booking.service === "string" && booking.service) ||
      booking.service?.title ||
      booking.service?.name ||
      "Detailing Service";

    const issueDate = new Date();
    const dueDate = new Date(issueDate.getTime() + 7 * 24 * 60 * 60 * 1000);

    const travelAmount =
      typeof booking.travelExpense === "number" ? booking.travelExpense : 0;
    const discountAmount =
      typeof booking.discount === "number" ? booking.discount : 0;
    const tipAmount = typeof booking.tip === "number" ? booking.tip : 0;

    const baseSubtotal =
      typeof booking.baseSum === "number"
        ? booking.baseSum
        : Array.isArray(booking.perCarTotals)
          ? booking.perCarTotals.reduce((sum, value) => {
              const numeric = typeof value === "number" ? value : Number(value);
              return Number.isFinite(numeric) ? sum + numeric : sum;
            }, 0)
          : 0;

    const totalDisplayAmount =
      typeof booking.amount === "number"
        ? booking.amount
        : baseSubtotal + travelAmount - discountAmount + tipAmount;

    const pdfBuffer = await buildInvoicePdf(booking, brand, {
      invoiceNumber: invoiceNumberString,
      issueDate: issueDate.toLocaleDateString("en-CA"),
      dueDate: dueDate.toLocaleDateString("en-CA"),
      notes:
        invoiceStatus === "paid"
          ? "Marked as paid. Thank you for your business!"
          : "Payment is due within 7 days. Reply to this email with any questions.",
      status: invoiceStatus,
    });

    const { EMAIL_USER, EMAIL_PASS } = process.env;
    if (!EMAIL_USER || !EMAIL_PASS) {
      return res.status(500).json({
        success: false,
        message:
          "Email service is not configured. Please update EMAIL_USER and EMAIL_PASS.",
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
      subject: `Invoice #${invoiceNumberString} — ${serviceLabel}`,
      text: `Hi ${booking.name || "there"},\n\nPlease find your invoice attached for ${serviceLabel}.\n\nTotal ${invoiceStatus === "paid" ? "recorded" : "due"}: ${formatCurrency(totalDisplayAmount)}\nInvoice #: ${invoiceNumberString}\n\nThank you for choosing Wash Labs!\n`,
      html:
        `<!doctype html><html><body style="font-family:Inter,Arial,sans-serif;color:#0f172a;">` +
        `<p>Hi ${booking.name || "there"},</p>` +
        `<p>Please find your invoice attached for <strong>${serviceLabel}</strong>.</p>` +
        `<p><strong>Total ${invoiceStatus === "paid" ? "recorded" : "due"}:</strong> ${formatCurrency(totalDisplayAmount)}<br/>` +
        `<strong>Invoice #:</strong> ${invoiceNumberString}</p>` +
        `<p>${invoiceStatus === "paid" ? "This invoice is marked as paid. Thank you!" : "Payment is due within 7 days. Reply to this email if you have any questions."}</p>` +
        `<p>— Wash Labs</p></body></html>`,
      attachments: [
        {
          filename: `WashLabs-Invoice-${invoiceNumberString}.pdf`,
          content: pdfBuffer,
        },
      ],
    };

    await transporter.sendMail(mailOptions);

    return res
      .status(200)
      .json({ success: true, message: "Invoice sent successfully." });
  } catch (error) {
    console.error("[send-invoice]", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to send invoice",
    });
  }
}
