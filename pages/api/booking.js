import nodemailer from "nodemailer";
import { addBookingToCalendar } from '../../lib/googleCalendar';
import { getOccupiedSlotsForDate, isSlotConflicting } from '../../lib/availability';
import { SERVICE_TIME_ZONE, zonedDateToUtc, formatTimeInZone, normalizeTo24Hour } from '../../lib/timezone';
import connectMongoose from "../../lib/mongoose";
import BookingModel from "../../models/Booking";
import CustomerModel from "../../models/Customer";

const RATE_LIMIT_WINDOW_MS = 60 * 1000;
const RATE_LIMIT_MAX_REQUESTS = 5;
const bookingRequestLog = new Map();

const getClientIdentifier = (req) => {
    const forwarded = req.headers["x-forwarded-for"];
    if (typeof forwarded === "string" && forwarded.length > 0) {
        return forwarded.split(",")[0].trim();
    }
    return req.socket?.remoteAddress || "unknown";
};

const isRateLimited = (identifier) => {
    const now = Date.now();
    const windowStart = now - RATE_LIMIT_WINDOW_MS;
    const timestamps = bookingRequestLog.get(identifier) || [];
    const recent = timestamps.filter((timestamp) => timestamp > windowStart);

    if (recent.length >= RATE_LIMIT_MAX_REQUESTS) {
        bookingRequestLog.set(identifier, recent);
        return true;
    }

    recent.push(now);
    bookingRequestLog.set(identifier, recent);
    return false;
};

// Basic HTML escape for safe email content
const escapeHtml = (str = "") =>
    String(str)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");

// Convert a 24-hour HH:MM string into a friendly 12-hour display
const formatDisplayTime = (time24h) => {
  if (!time24h || !/^\d{2}:\d{2}$/.test(time24h)) return null;
  const [hStr, mStr] = time24h.split(":");
  const hours = Number(hStr);
  const minutes = Number(mStr);
  if (!Number.isInteger(hours) || !Number.isInteger(minutes)) return null;
  const period = hours >= 12 ? "PM" : "AM";
  const displayHour = hours % 12 === 0 ? 12 : hours % 12;
  return `${displayHour}:${mStr} ${period}`;
};

const stripEndsSuffix = (label) => {
  if (!label) return null;
  return String(label).replace(/\s*[\-–—]\s*Ends:?[^]*$/i, "").trim() || null;
};

export default async function handler(req, res) {
    if (req.method !== "POST") {
        return res.status(405).json({ message: "Method not allowed" });
    }

    const clientId = getClientIdentifier(req);
    if (isRateLimited(clientId)) {
        return res
            .status(429)
            .json({
                message: "Too many booking requests. Please try again soon.",
            });
    }

  const { service, vehicle, dateTime, location, userInfo, source: reqSource, status: reqStatus } = req.body;
  // New admin fields (optional)
  const vehicles = Array.isArray(req.body.vehicles) ? req.body.vehicles : null;
  const carsInput = Array.isArray(req.body.cars) ? req.body.cars : null;
  const perCarTotals = Array.isArray(req.body.perCarTotals) ? req.body.perCarTotals : null;
  const baseSumRaw = typeof req.body.baseSum === 'number' ? req.body.baseSum : null;
  const travelExpenseRaw = Number(req.body.travelExpense || 0);
  const discountRaw = Number(req.body.discount || 0);
  const tipRaw = Number(req.body.tip || 0);

    if (!service || !vehicle || !dateTime || !userInfo) {
        return res.status(400).json({ message: "Missing booking details" });
    }

    const { EMAIL_USER, EMAIL_PASS } = process.env;
    if (!EMAIL_USER || !EMAIL_PASS) {
        console.error("[booking] Missing email credentials", {
            hasUser: Boolean(EMAIL_USER),
            hasPass: Boolean(EMAIL_PASS),
        });
        return res.status(500).json({
            message:
                "Our booking inbox is temporarily unavailable. Please contact us directly while we resolve this.",
        });
    }

  // Helpers
  const isNA = (v) => typeof v === 'string' && v.trim().toLowerCase() === 'n/a';
  const hasValue = (v) => v !== undefined && v !== null && String(v).trim() !== '' && !isNA(String(v));
  const isValidEmail = (v) => hasValue(v) && /.+@.+\..+/.test(String(v));

  // Sanitize inputs and compute meta
    const safeService = {
        title: escapeHtml(service.title || ""),
    };
    const safeVehicleName = escapeHtml(vehicle?.name || "");
    const safeVehicleYear =
        vehicle?.year && vehicle.year !== "NA"
            ? escapeHtml(String(vehicle.year))
            : "";
    const vehicleDisplay = [safeVehicleYear || null, safeVehicleName]
      .filter(Boolean)
      .join(" ");
    const plainDate = hasValue(dateTime?.date) ? String(dateTime.date).trim() : "N/A";
    const safeDate = escapeHtml(plainDate);
    const timeCandidates = [dateTime?.timeValue, dateTime?.time];
    let normalizedTime24 = null;
    for (const candidate of timeCandidates) {
      const parsed = normalizeTo24Hour(candidate);
        if (parsed) {
            normalizedTime24 = parsed;
            break;
        }
    }
    if (!normalizedTime24 && dateTime?.timeISO) {
      try {
        const isoDate = new Date(dateTime.timeISO);
        if (!Number.isNaN(isoDate.getTime())) {
          const formatter = new Intl.DateTimeFormat('en-US', {
            timeZone: SERVICE_TIME_ZONE,
            hour: '2-digit',
            minute: '2-digit',
            hour12: false,
          });
          const fallback = formatter.format(isoDate);
          const normalized = normalizeTo24Hour(fallback);
          if (normalized) normalizedTime24 = normalized;
        }
      } catch (isoErr) {
        console.warn('[booking] Failed to derive normalized time from ISO', isoErr);
      }
    }
    const canonicalStartUtc = normalizedTime24 ? zonedDateToUtc(dateTime.date, normalizedTime24, SERVICE_TIME_ZONE) : null;
    const normalizedDisplay = normalizedTime24 ? formatDisplayTime(normalizedTime24) : null;
    const cleanedTimeLabel = stripEndsSuffix(dateTime?.time);
    const displayTime = normalizedDisplay || cleanedTimeLabel;
    const plainTime = displayTime || "N/A";
    const safeTime = escapeHtml(plainTime);
    // compute end time string if possible (use service.durationMinutes when available, else try DB)
    let endTimeDisplay = null;
    try {
      if (canonicalStartUtc) {
        let durationMinutesForEmail = typeof service?.durationMinutes === 'number' ? service.durationMinutes : null;
        if (!durationMinutesForEmail) {
          try {
            const db = await (await import("../../lib/mongodb")).getDb();
            const svcDoc = await db.collection('services').findOne({ title: { $regex: `^${service.title}$`, $options: 'i' } });
            if (svcDoc && typeof svcDoc.durationMinutes === 'number') durationMinutesForEmail = svcDoc.durationMinutes;
          } catch (e) {
            // ignore
          }
        }
        if (!durationMinutesForEmail) durationMinutesForEmail = 60;
        if (canonicalStartUtc) {
          const endDateUtc = new Date(canonicalStartUtc.getTime() + durationMinutesForEmail * 60 * 1000);
          endTimeDisplay = formatTimeInZone(endDateUtc, SERVICE_TIME_ZONE);
        }
      }
    } catch (e) {
      endTimeDisplay = null;
    }
    const safeEndTime = endTimeDisplay ? escapeHtml(endTimeDisplay) : null;
  const safeLocation = escapeHtml(location?.address || "N/A");
  const safeName = escapeHtml(userInfo?.name || "");
  const rawEmail = userInfo?.email || "";
  const safeEmail = escapeHtml(rawEmail);
    const safePhone = `${escapeHtml(userInfo?.countryCode || "")} ${escapeHtml(
        userInfo?.phone || ""
    )}`.trim();
    const safeNotes = escapeHtml(userInfo?.message || "");

    const parseNumericAmount = (value) => {
      if (typeof value === "number" && Number.isFinite(value)) return value;
      if (typeof value === "string") {
        const cleaned = value.replace(/[^0-9.-]/g, "").trim();
        if (!cleaned) return null;
        const parsed = Number(cleaned);
        return Number.isFinite(parsed) ? parsed : null;
      }
      return null;
    };

    const normalizeAddOnList = (list) => {
      if (!Array.isArray(list)) return [];
      const dedup = new Map();
      list.forEach((item) => {
        if (!item) return;
        if (Array.isArray(item)) {
          normalizeAddOnList(item).forEach((nested) => {
            if (!nested || !nested.name) return;
            const key = nested.name.toLowerCase();
            if (!dedup.has(key)) {
              dedup.set(key, nested);
            } else if (dedup.get(key).price == null && nested.price != null) {
              dedup.set(key, nested);
            }
          });
          return;
        }
        if (typeof item === "string") {
          const name = item.trim();
          if (!name) return;
          const key = name.toLowerCase();
          if (!dedup.has(key)) dedup.set(key, { name, price: null });
          return;
        }
        if (typeof item === "object") {
          const rawName = item.name ?? item.label ?? item.title ?? "";
          const name = typeof rawName === "string" ? rawName.trim() : "";
          if (!name) return;
          const priceValue = parseNumericAmount(
            item.price ?? item.amount ?? item.total ?? item.value ?? item.cost ?? null
          );
          const key = name.toLowerCase();
          if (!dedup.has(key)) {
            dedup.set(key, { name, price: priceValue });
          } else if (dedup.get(key).price == null && priceValue != null) {
            dedup.set(key, { name, price: priceValue });
          }
        }
      });
      return Array.from(dedup.values());
    };

    const serviceSelectedAddOns = normalizeAddOnList(service?.selectedAddOns);
    const serviceMarkedAddOns = normalizeAddOnList(
      Array.isArray(service?.addOns)
        ? service.addOns.filter((addon) => addon?.selected || addon?.isSelected || addon?.checked)
        : []
    );
    const vehicleSelectedAddOns = normalizeAddOnList(
      Array.isArray(vehicles) ? vehicles.flatMap((v) => v?.addOns || []) : []
    );
    const carSelectedAddOns = normalizeAddOnList(
      Array.isArray(carsInput) ? carsInput.flatMap((car) => car?.addOns || []) : []
    );

    const selectedAddOns =
      (serviceSelectedAddOns.length && serviceSelectedAddOns) ||
      (serviceMarkedAddOns.length && serviceMarkedAddOns) ||
      (vehicleSelectedAddOns.length && vehicleSelectedAddOns) ||
      carSelectedAddOns;

    // Determine server-trusted pricing breakdown
    const computedBaseSum = baseSumRaw ?? (Array.isArray(perCarTotals) ? perCarTotals.reduce((s,v)=>s+Number(v||0),0) : (typeof service.basePrice === 'number' ? service.basePrice : null));
    const travelExpense = Number(travelExpenseRaw || 0);
    const discount = Number(discountRaw || 0);
    const tip = Number(tipRaw || 0);
    
    // Calculate add-ons total from selectedAddOns
    let addOnsTotal = 0;
    if (Array.isArray(selectedAddOns)) {
      addOnsTotal = selectedAddOns.reduce((sum, addon) => {
        const price = typeof addon.price === 'number' ? addon.price : 0;
        return sum + price;
      }, 0);
    }

    // If the client already sent a baseSum/perCarTotals, those totals include add-ons.
    // Avoid double-counting add-ons by only adding them when we computed baseSum from service base price.
    const baseIncludesAddOns = baseSumRaw != null || (Array.isArray(perCarTotals) && perCarTotals.length > 0);
    const addOnsContribution = baseIncludesAddOns ? 0 : addOnsTotal;

    // Compute final amount: baseSum (+ addOns when not already included) + travel - discount + tip
    const finalAmount = typeof computedBaseSum === 'number'
      ? Math.max(0, computedBaseSum + addOnsContribution + travelExpense - discount + tip)
      : null;

    const formatMoney = (n) => (typeof n === 'number' ? `$${n.toFixed(2)}` : 'Not specified');
    const formattedTotalPrice = formatMoney(finalAmount);
    const formattedBaseSum = formatMoney(computedBaseSum);
    const formattedTravel = formatMoney(travelExpense);
    const formattedDiscount = formatMoney(discount);
    const formattedTip = formatMoney(tip);

    const hasNonZero = (val) => typeof val === "number" && Math.abs(val) >= 0.01;
    const showTravelLine = hasNonZero(travelExpense) && travelExpense > 0;
    const showDiscountLine = hasNonZero(discount) && discount > 0;
    const showTipLine = hasNonZero(tip) && tip > 0;

  // Server-side availability check (avoid race conditions)
  // Skip availability check for admin bookings to allow overrides
  try {
    if (reqSource !== 'admin' && dateTime?.date && normalizedTime24) {
      // Determine duration: try to fetch from services collection
      let durationMinutes = 60;
      try {
        const db = await (await import("../../lib/mongodb")).getDb();
        const svcDoc = await db.collection('services').findOne({ title: { $regex: `^${service.title}$`, $options: 'i' } });
        if (svcDoc && typeof svcDoc.durationMinutes === 'number') durationMinutes = svcDoc.durationMinutes;
      } catch (e) {}
      const startDateUtc = canonicalStartUtc;
      if (!startDateUtc) {
        console.warn('[booking] Unable to parse normalized time for availability check', {
          date: dateTime.date,
          timeValue: dateTime.timeValue,
          timeLabel: dateTime.time,
          normalizedTime24,
        });
      } else {
        const slotStartISO = startDateUtc.toISOString();
        const slotEndISO = new Date(startDateUtc.getTime() + durationMinutes * 60 * 1000).toISOString();

        const occupied = await getOccupiedSlotsForDate(dateTime.date);
        // Reject bookings on Tuesdays (2) and Fridays (5)
        const checkDate = new Date(`${dateTime.date}T00:00:00`);
        const w = checkDate.getDay();
        if (w === 2 || w === 5) {
          return res.status(400).json({ message: 'Bookings are not allowed on Tuesdays or Fridays.' });
        }
        const bufferMinutes = 30;
        const conflict = isSlotConflicting(slotStartISO, slotEndISO, occupied, bufferMinutes);
        if (conflict) {
          const bufferMs = bufferMinutes * 60 * 1000;
          const slotStartMs = new Date(slotStartISO).getTime();
          const slotEndMs = new Date(slotEndISO).getTime();
          const conflicting = occupied.filter((occ) => {
            const occStart = new Date(occ.start).getTime();
            const occEnd = new Date(occ.end).getTime();
            return slotStartMs < occEnd + bufferMs && slotEndMs > occStart - bufferMs;
          });
          try {
            console.warn('[booking] slot conflict', {
              requested: {
                date: dateTime.date,
                time: dateTime.time,
                normalizedTime: normalizedTime24,
                timeZone: SERVICE_TIME_ZONE,
                start: slotStartISO,
                end: slotEndISO,
                durationMinutes,
              },
              occupied: occupied.map((occ) => ({
                start: occ.start,
                end: occ.end,
                source: occ.source,
                title: occ.title,
                id: occ.id,
              })),
              conflicting,
            });
          } catch (logErr) {
            console.error('[booking] failed to log conflict details', logErr);
          }
          return res.status(409).json({
            message: 'Requested time slot is no longer available. Please choose another time.',
            details: {
              requested: {
                start: slotStartISO,
                end: slotEndISO,
                normalizedTime: normalizedTime24,
              },
              conflicting: conflicting.map((occ) => ({
                start: occ.start,
                end: occ.end,
                source: occ.source,
                title: occ.title,
                id: occ.id,
              })),
            },
          });
        }
      }
    }
  } catch (e) {
    // If availability check fails, continue but log (best-effort)
    console.error('[booking] availability check failed', e?.message || e);
  }

    const receivedAt = new Date().toLocaleString("en-CA", {
        timeZone: "America/Halifax",
        hour12: false,
    });
    const userAgent = (req.headers["user-agent"] || "").slice(0, 300);
    const referer = req.headers["referer"] || req.headers["referrer"] || "N/A";

    const baseUrl = "https://washlabs.ca";
    const brand = {
        name: "Wash Labs",
        color: "#0076ff",
        logo: `${baseUrl}/images/logo.png`,
        instagram: "https://www.instagram.com/wash_labs",
        facebook: "https://www.facebook.com/people/Wash-Labs/61581335875166/",
        tiktok: "https://www.tiktok.com/@wash__labs",
        email: "washlabs.ca@gmail.com",
        phone: "+1 782-827-5010",
        areas: "Halifax • Dartmouth • Bedford • Sackville • Clayton Park • Cole Harbour • Hammonds Plains",
        hours: "7:00 AM – 7:00 PM (Mon–Sun)",
        address: "53 Vitalia Ct, Halifax, NS B3S 0H4",
    };

  let calendarWarning = null;
  try {
        const transporter = nodemailer.createTransport({
            service: "gmail",
            auth: {
                user: EMAIL_USER,
                pass: EMAIL_PASS,
            },
        });

        // Admin notification (branded + detailed)
        const adminSubject = `New Booking Request — ${safeService.title}`;
        const mapsHrefRaw = hasValue(location?.address)
          ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(location.address)}`
          : null;

        const adminTextLines = [
          'New booking request',
          '',
          `Service: ${service.title}`,
        ];
        if (typeof computedBaseSum === 'number') {
          adminTextLines.push(`Subtotal: ${formattedBaseSum}`);
        }
        if (selectedAddOns.length) {
          adminTextLines.push('Add-ons:');
          selectedAddOns.forEach((addon) => {
            const priceText = typeof addon.price === 'number' ? formatMoney(addon.price) : '';
            adminTextLines.push(` - ${addon.name}${priceText ? ` — ${priceText}` : ''}`);
          });
        }
        if (showTravelLine) {
          adminTextLines.push(`Travel expense: ${formattedTravel}`);
        }
        if (showDiscountLine) {
          adminTextLines.push(`Discount: ${formattedDiscount}`);
        }
        if (showTipLine) {
          adminTextLines.push(`Tip: ${formattedTip}`);
        }
        if (formattedTotalPrice !== 'Not specified') {
          adminTextLines.push(`Total: ${formattedTotalPrice}`);
        }
        adminTextLines.push(`Business hours: 8:00 AM – 6:00 PM (Tues & Fri closed)`);
        adminTextLines.push('');
        // List vehicles if provided
        if (vehicles) {
          vehicles.forEach((v, i) => {
            const name = escapeHtml(v.name || `Vehicle ${i+1}`);
            const type = escapeHtml(v.type || 'N/A');
            const lineTotal = typeof v.lineTotal === 'number' ? formatMoney(v.lineTotal) : (Array.isArray(perCarTotals) && typeof perCarTotals[i] === 'number' ? formatMoney(perCarTotals[i]) : 'N/A');
            adminTextLines.push(` - ${name} (${type}) — ${lineTotal}`);
          });
        } else {
          adminTextLines.push(`Vehicle: ${vehicleDisplay}`);
        }
        // Date/time and location
        if (hasValue(plainDate) || hasValue(plainTime)) adminTextLines.push(`Date & Time: ${plainDate} at ${plainTime}`);
        if (hasValue(location?.address)) {
          adminTextLines.push(`Location: ${location.address}`);
          if (mapsHrefRaw) adminTextLines.push(`Map: ${mapsHrefRaw}`);
        }
        adminTextLines.push('', 'Client:');
        if (hasValue(userInfo.name)) adminTextLines.push(`Name: ${userInfo.name}`);
        if (hasValue(rawEmail)) adminTextLines.push(`Email: ${rawEmail}`);
        if (hasValue(userInfo.phone) || hasValue(userInfo.countryCode)) adminTextLines.push(`Phone: ${userInfo.countryCode || ''} ${userInfo.phone || ''}`.trim());
        if (userInfo.message && !isNA(userInfo.message)) adminTextLines.push(`Notes:\n${userInfo.message}\n`);
        adminTextLines.push('---', `Received: ${receivedAt}`, `Client IP: ${clientId}`, `User-Agent: ${userAgent}`, `Referrer: ${referer}`);
        // filter
        const adminText = adminTextLines.filter(Boolean).join('\n');

        const locationLinkMarkup = mapsHrefRaw
          ? `<a href="${escapeHtml(mapsHrefRaw)}" style="color:${brand.color};text-decoration:none;">${escapeHtml(location.address)}</a>`
          : escapeHtml(location?.address || "");
        const adminSubtotalRow = typeof computedBaseSum === 'number'
          ? `<tr><td style="padding:6px 0;"><strong>Subtotal:</strong> ${escapeHtml(formattedBaseSum)}</td></tr>`
          : '';
        const adminAddOnsRows = selectedAddOns.length
          ? [
              `<tr><td style="padding:6px 0;"><strong>Add-ons:</strong></td></tr>`,
              ...selectedAddOns.map((addon) => {
                const priceSuffix =
                  typeof addon.price === 'number'
                    ? ` — ${escapeHtml(formatMoney(addon.price))}`
                    : '';
                return `<tr><td style="padding:6px 0;padding-left:16px;">${escapeHtml(addon.name)}${priceSuffix}</td></tr>`;
              }),
            ].join('\n')
          : '';
        const adminTravelRow = showTravelLine
          ? `<tr><td style="padding:6px 0;"><strong>Travel expense:</strong> ${escapeHtml(formattedTravel)}</td></tr>`
          : '';
        const adminDiscountRow = showDiscountLine
          ? `<tr><td style="padding:6px 0;"><strong>Discount:</strong> ${escapeHtml(formattedDiscount)}</td></tr>`
          : '';
        const adminTipRow = showTipLine
          ? `<tr><td style="padding:6px 0;"><strong>Tip:</strong> ${escapeHtml(formattedTip)}</td></tr>`
          : '';
        let adminTotalRow = '';
        if (formattedTotalPrice !== 'Not specified') {
          const totalValueHtml = `<strong style="color:${brand.color};">${escapeHtml(formattedTotalPrice)}</strong>`;
          adminTotalRow = showDiscountLine && typeof computedBaseSum === 'number'
            ? `<tr><td style="padding:6px 0;"><strong>Total:</strong> <span style="text-decoration:line-through;color:#9ca3af;margin-right:8px;">${escapeHtml(formattedBaseSum)}</span> ${totalValueHtml}</td></tr>`
            : `<tr><td style="padding:6px 0;"><strong>Total:</strong> ${totalValueHtml}</td></tr>`;
        }
        const adminVehiclesHtmlBlock = vehicles
          ? [`<tr><td style="padding:6px 0;"><strong>Vehicles:</strong></td></tr>`,
              ...vehicles.map((v, i) => {
                const lineTotal =
                  typeof v.lineTotal === 'number'
                    ? formatMoney(v.lineTotal)
                    : Array.isArray(perCarTotals) && typeof perCarTotals[i] === 'number'
                    ? formatMoney(perCarTotals[i])
                    : 'N/A';
                return `<tr><td style="padding:6px 0;padding-left:16px;">${escapeHtml(v.name || 'N/A')} (${escapeHtml(v.type || '')}) — ${escapeHtml(lineTotal)}</td></tr>`;
              }),
            ].join('\n')
          : `<tr><td style="padding:6px 0;"><strong>Vehicle:</strong> ${vehicleDisplay}</td></tr>`;
        const adminDateTimeRow =
          hasValue(safeDate) || hasValue(safeTime)
            ? `<tr><td style="padding:6px 0;"><strong>Date &amp; Time:</strong> ${safeDate} at ${safeTime}</td></tr>`
            : '';
        const adminLocationRow = hasValue(location?.address)
          ? `<tr><td style="padding:6px 0;"><strong>Location:</strong> ${locationLinkMarkup}</td></tr>`
          : '';
        const adminBookingSummaryHtmlRows = [
          `<tr><td style="padding:6px 0;"><strong>Service:</strong> ${safeService.title}</td></tr>`,
          adminSubtotalRow,
          adminAddOnsRows,
          adminTravelRow,
          adminDiscountRow,
          adminTipRow,
          adminTotalRow,
          adminVehiclesHtmlBlock,
          adminDateTimeRow,
          adminLocationRow,
        ]
          .filter(Boolean)
          .join('\n');

        const adminHtml = `
<!doctype html>
<html>
  <body style="margin:0;padding:0;background:#f6f9fc;font-family:Inter,Arial,sans-serif;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f6f9fc;padding:24px 0;">
      <tr>
        <td align="center">
          <table role="presentation" width="640" cellpadding="0" cellspacing="0" style="background:#ffffff;border:1px solid #e6effe;border-radius:12px;overflow:hidden;">
            <tr>
              <td style="padding:24px;background:#eff6ff;color:#0f172a;">
                <table width="100%">
                  <tr>
                    <td align="center" style="vertical-align:middle;">
                      <table role="presentation" cellpadding="0" cellspacing="0" align="center">
                        <tr>
                          <td align="center" valign="middle" style="padding-right:10px;">
                            <img src="${brand.logo}" alt="${brand.name}" height="52" style="display:block;border:0;"/>
                          </td>
                          <td align="center" valign="middle" style="padding-left:10px;">
                            <div style="font-size:26px;line-height:1;font-weight:900;letter-spacing:0.6px;white-space:nowrap;">
                              <span style="color:#000;">WASH</span> <span style="color:${brand.color};">LABS</span>
                            </div>
                          </td>
                        </tr>
                      </table>
                      <div style="text-align:center;font-size:14px;color:#334155;margin-top:8px;">${brand.hours}</div>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td style="padding:24px 24px 8px 24px;">
                <h1 style="margin:0 0 8px 0;font-size:20px;color:#0f172a;">New Booking Request</h1>
                <p style="margin:0;color:#334155;font-size:14px;">Received: <strong>${receivedAt}</strong></p>
              </td>
            </tr>
            <tr>
              <td style="padding:8px 24px 0 24px;">
                <table width="100%" cellpadding="0" cellspacing="0" style="font-size:14px;color:#0f172a;">
                  ${adminBookingSummaryHtmlRows}
                </table>
              </td>
            </tr>
            <tr>
              <td style="padding:16px 24px 0 24px;">
                <h2 style="margin:0 0 8px 0;font-size:16px;color:#0f172a;">Client</h2>
                ${hasValue(safeName) ? `<p style="margin:0;color:#475569;font-size:13px;"><strong>Name:</strong> ${safeName}</p>` : ''}
                ${isValidEmail(rawEmail) ? `<p style="margin:0;color:#475569;font-size:13px;"><strong>Email:</strong> <a href="mailto:${safeEmail}" style="color:${brand.color};text-decoration:none;">${safeEmail}</a></p>` : ''}
                ${hasValue(safePhone) ? `<p style="margin:0;color:#475569;font-size:13px;"><strong>Phone:</strong> ${escapeHtml(safePhone)}</p>` : ''}
                ${hasValue(safeNotes) ? `<div style="margin-top:8px;padding:12px;border-left:3px solid ${brand.color};background:#f8fbff;color:#334155;white-space:pre-wrap;"><strong>Notes:</strong>\n${safeNotes}</div>` : ''}
              </td>
            </tr>
            <tr>
              <td style="padding:16px 24px 24px 24px;">
                <h2 style="margin:0 0 8px 0;font-size:16px;color:#0f172a;">Context</h2>
                <p style="margin:0;color:#475569;font-size:13px;"><strong>Client IP:</strong> ${escapeHtml(clientId)}</p>
                <p style="margin:0;color:#475569;font-size:13px;"><strong>User-Agent:</strong> ${escapeHtml(userAgent)}</p>
                <p style="margin:0;color:#475569;font-size:13px;"><strong>Referrer:</strong> ${escapeHtml(referer)}</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;

        const adminMail = {
            from: `"Wash Labs" <${EMAIL_USER}>`,
            to: brand.email,
            subject: adminSubject,
            text: adminText,
            html: adminHtml,
            replyTo: isValidEmail(rawEmail) ? rawEmail : undefined,
        };

        await transporter.sendMail(adminMail);

        // Customer confirmation (send only if email provided and valid)
        const shouldEmailCustomer = isValidEmail(rawEmail);
        if (shouldEmailCustomer) {
          const userSubject = `Booking received — ${safeService.title} | Wash Labs`;
          const userTextLines = [
            `Hello ${userInfo.name || 'there'},`,
            '',
            "Thanks for booking with Wash Labs. We've received your request and will follow up shortly.",
            '',
            'Booking Summary',
            `Service: ${service.title}`,
          ];
          if (typeof computedBaseSum === 'number') {
            userTextLines.push(`Subtotal: ${formattedBaseSum}`);
          }
          if (selectedAddOns.length) {
            userTextLines.push('Add-ons:');
            selectedAddOns.forEach((addon) => {
              const priceText = typeof addon.price === 'number' ? formatMoney(addon.price) : '';
              userTextLines.push(` - ${addon.name}${priceText ? ` — ${priceText}` : ''}`);
            });
          }
          if (showTravelLine) {
            userTextLines.push(`Travel expense: ${formattedTravel}`);
          }
          if (showDiscountLine) {
            userTextLines.push(`Discount: ${formattedDiscount}`);
          }
          if (showTipLine) {
            userTextLines.push(`Tip: ${formattedTip}`);
          }
          if (formattedTotalPrice !== 'Not specified') {
            userTextLines.push(`Total: ${formattedTotalPrice}`);
          }
          userTextLines.push(`Business hours: 8:00 AM – 6:00 PM (Tues & Fri closed)`);
          if (vehicles) {
            userTextLines.push('Vehicles:');
            vehicles.forEach((v, i) => {
              const lineTotal = typeof v.lineTotal === 'number' ? formatMoney(v.lineTotal) : (Array.isArray(perCarTotals) && typeof perCarTotals[i] === 'number' ? formatMoney(perCarTotals[i]) : 'N/A');
              userTextLines.push(` - ${v.name || `Vehicle ${i+1}`} (${v.type || 'N/A'}) — ${lineTotal}`);
            });
          } else {
            userTextLines.push(`Vehicle: ${vehicleDisplay}`);
          }
          if (hasValue(plainDate) || hasValue(plainTime)) userTextLines.push(`Date & Time: ${plainDate} at ${plainTime}`);
          if (hasValue(location?.address)) userTextLines.push(`Location: ${location.address}`);
          userTextLines.push('', 'Need anything else?', `Phone: ${brand.phone}`, `Email: ${brand.email}`, `Website: ${baseUrl}`, '', '— Wash Labs, Halifax NS');
          const userText = userTextLines.filter(Boolean).join('\n');

          const showSubtotalLine = typeof computedBaseSum === 'number';
          const subtotalHtmlRow = showSubtotalLine
            ? `<tr><td style="padding:4px 0;"><strong>Subtotal:</strong> ${escapeHtml(formattedBaseSum)}</td></tr>`
            : '';
          const addOnsHtmlRows = selectedAddOns.length
            ? [
                `<tr><td style="padding:4px 0;"><strong>Add-ons:</strong></td></tr>`,
                ...selectedAddOns.map((addon) => {
                  const priceSuffix =
                    typeof addon.price === 'number'
                      ? ` — ${escapeHtml(formatMoney(addon.price))}`
                      : '';
                  return `<tr><td style="padding:4px 0;padding-left:12px;">${escapeHtml(addon.name)}${priceSuffix}</td></tr>`;
                }),
              ].join('\n')
            : '';
          const travelHtmlRow = showTravelLine
            ? `<tr><td style="padding:4px 0;"><strong>Travel expense:</strong> ${escapeHtml(formattedTravel)}</td></tr>`
            : '';
          const discountHtmlRow = showDiscountLine
            ? `<tr><td style="padding:4px 0;"><strong>Discount:</strong> ${escapeHtml(formattedDiscount)}</td></tr>`
            : '';
          const tipHtmlRow = showTipLine
            ? `<tr><td style="padding:4px 0;"><strong>Tip:</strong> ${escapeHtml(formattedTip)}</td></tr>`
            : '';
          let totalHtmlRow = '';
          if (formattedTotalPrice !== 'Not specified') {
            const totalValueHtml = `<strong style="color:${brand.color};">${escapeHtml(formattedTotalPrice)}</strong>`;
            totalHtmlRow = showDiscountLine && showSubtotalLine
              ? `<tr><td style="padding:4px 0;"><strong>Total:</strong> <span style="text-decoration:line-through;color:#9ca3af;margin-right:8px;">${escapeHtml(formattedBaseSum)}</span> ${totalValueHtml}</td></tr>`
              : `<tr><td style="padding:4px 0;"><strong>Total:</strong> ${totalValueHtml}</td></tr>`;
          }
          const vehiclesHtmlBlock = vehicles
            ? [`<tr><td style="padding:4px 0;"><strong>Vehicles:</strong></td></tr>`,
                ...vehicles.map((v, i) => {
                  const lineTotal =
                    typeof v.lineTotal === 'number'
                      ? formatMoney(v.lineTotal)
                      : Array.isArray(perCarTotals) && typeof perCarTotals[i] === 'number'
                      ? formatMoney(perCarTotals[i])
                      : 'N/A';
                  return `<tr><td style="padding:4px 0;padding-left:12px;">${escapeHtml(v.name || 'N/A')} (${escapeHtml(v.type || '')}) — ${escapeHtml(lineTotal)}</td></tr>`;
                }),
              ].join('\n')
            : `<tr><td style="padding:4px 0;"><strong>Vehicle:</strong> ${vehicleDisplay}</td></tr>`;
          const dateTimeHtmlRow =
            hasValue(safeDate) || hasValue(safeTime)
              ? `<tr><td style="padding:4px 0;"><strong>Date &amp; Time:</strong> ${safeDate} at ${safeTime}</td></tr>`
              : '';
          const locationHtmlRow = hasValue(location?.address)
            ? `<tr><td style="padding:4px 0;"><strong>Location:</strong> ${escapeHtml(location.address)}</td></tr>`
            : '';
          const bookingSummaryHtmlRows = [
            `<tr><td style="padding:4px 0;"><strong>Service:</strong> ${safeService.title}</td></tr>`,
            subtotalHtmlRow,
            addOnsHtmlRows,
            travelHtmlRow,
            discountHtmlRow,
            tipHtmlRow,
            totalHtmlRow,
            vehiclesHtmlBlock,
            dateTimeHtmlRow,
            locationHtmlRow,
          ]
            .filter(Boolean)
            .join('\n');

          const userHtml = `
<!doctype html>
<html>
  <body style="margin:0;padding:0;background:#f6f9fc;font-family:Inter,Arial,sans-serif;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f6f9fc;padding:24px 0;">
      <tr>
        <td align="center">
          <table role="presentation" width="640" cellpadding="0" cellspacing="0" style="background:#ffffff;border:1px solid #e6effe;border-radius:12px;overflow:hidden;">
            <tr>
              <td style="padding:24px;background:#eff6ff;color:#0f172a;">
                <table width="100%">
                  <tr>
                    <td align="center" style="vertical-align:middle;">
                      <a href="${baseUrl}" style="text-decoration:none;color:#0f172a;">
                        <table role="presentation" cellpadding="0" cellspacing="0" align="center">
                          <tr>
                            <td align="center" valign="middle" style="padding-right:10px;">
                              <img src="${brand.logo}" alt="${brand.name}" height="52" style="display:block;border:0;"/>
                            </td>
                            <td align="center" valign="middle" style="padding-left:10px;">
                              <div style="font-size:26px;line-height:1;font-weight:900;letter-spacing:0.6px;white-space:nowrap;">
                                <span style="color:#000;">WASH</span> <span style="color:${brand.color};">LABS</span>
                              </div>
                            </td>
                          </tr>
                        </table>
                      </a>
                      <div style="text-align:center;font-size:14px;color:#334155;margin-top:8px;">${brand.hours}</div>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td style="padding:24px;">
                <h1 style="margin:0 0 8px 0;font-size:20px;color:#0f172a;">Thanks for your booking, ${safeName || 'there'}!</h1>
                <p style="margin:0 0 14px 0;color:#334155;font-size:14px;">We’ve received your request and will follow up shortly.</p>
                <h2 style="margin:0 0 8px 0;font-size:16px;color:#0f172a;">Booking Summary</h2>
                <table cellpadding="0" cellspacing="0" style="font-size:14px;color:#0f172a;">
                  ${bookingSummaryHtmlRows}
                </table>
                ${hasValue(safeNotes) ? `<div style="margin-top:12px;padding:12px;border-left:3px solid ${brand.color};background:#f8fbff;color:#334155;white-space:pre-wrap;"><strong>Your Notes:</strong>\n${safeNotes}</div>` : ''}
                <p style="margin:16px 0 0 0;color:#475569;font-size:13px;">Sent on: <strong>${receivedAt}</strong></p>
              </td>
            </tr>
            <tr>
              <td style="padding:0 24px 24px 24px;">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f8fbff;border:1px solid #e6effe;border-radius:10px;">
                  <tr>
                    <td style="padding:14px 16px;">
                      <p style="margin:0 0 6px 0;color:#0f172a;font-size:14px;"><strong>Need to reach us?</strong></p>
                      <p style="margin:0;color:#334155;font-size:13px;">📞 ${brand.phone} • ✉️ ${brand.email}</p>
                      <p style="margin:6px 0 0 0;color:#334155;font-size:13px;">Book another service: <a href="${baseUrl}/#services" style="color:${brand.color};text-decoration:none;">washlabs.ca/#services</a></p>
                      <p style="margin:8px 0 0 0;">
                        <a href="${brand.instagram}" style="color:${brand.color};text-decoration:none;">Instagram</a> ·
                        <a href="${brand.facebook}" style="color:${brand.color};text-decoration:none;">Facebook</a> ·
                        <a href="${brand.tiktok}" style="color:${brand.color};text-decoration:none;">TikTok</a>
                      </p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
          const confirmationMail = {
              from: `"Wash Labs" <${EMAIL_USER}>`,
              to: rawEmail,
              subject: userSubject,
              text: userText,
              html: userHtml,
              replyTo: brand.email, // allow replies to your main inbox
          };

          await transporter.sendMail(confirmationMail);
        }

    // Insert booking into MongoDB (best-effort, after emails)
    const uri = process.env.MONGODB_URI || process.env.MONGODB_URL;
    const dbName = process.env.MONGODB_DB || process.env.DB_NAME || "washlabs";
    let insertedId = null;
    if (uri && dbName) {
      try {
        await connectMongoose();

        const phoneComponents = [userInfo.countryCode, userInfo.phone]
          .map((part) => (part || "").trim())
          .filter(Boolean);
        const phoneForMatching = phoneComponents.join(" ").replace(/\s+/g, " ").trim();
        const emailForMatching = isValidEmail(rawEmail) ? rawEmail.trim().toLowerCase() : "";

        const doc = {
          // Align with admin schema and store pricing breakdown
          name: userInfo.name,
          carName: vehicleDisplay,
          service: service.title,
          date: dateTime.date,
          time: dateTime.time,
          timeValue: normalizedTime24 || undefined,
          timeISO: (canonicalStartUtc ? canonicalStartUtc.toISOString() : dateTime.timeISO) || undefined,
          timeZone: SERVICE_TIME_ZONE,
          amount: typeof finalAmount === 'number' ? finalAmount : undefined,
          baseSum: typeof computedBaseSum === 'number' ? computedBaseSum : undefined,
          travelExpense: travelExpense || 0,
          discount: discount || 0,
          tip: tip || 0,
          vehicles: vehicles || (vehicle ? [{ name: vehicleDisplay, type: vehicle?.type || '', lineTotal: typeof finalAmount === 'number' ? finalAmount : undefined }] : []),
          perCarTotals: perCarTotals || undefined,
          status: reqStatus === 'complete' ? 'complete' : 'pending',
          phone: phoneForMatching || userInfo.phone,
          email: rawEmail?.trim() || userInfo.email,
          location: location?.address || "",
          selectedAddOns: selectedAddOns || [],
          carType: vehicle?.type || "",
          createdAt: new Date().toISOString(),
          source: reqSource || "online",
        };

        const bookingRecord = await BookingModel.create(doc);
        insertedId = bookingRecord._id;

        const identifiers = [];
        if (phoneForMatching) identifiers.push({ phone: phoneForMatching });
        if (emailForMatching) identifiers.push({ email: emailForMatching });

        if (identifiers.length) {
          const bookingSnapshot = bookingRecord.toObject({ versionKey: false });
          const primaryVehicleName = vehicles?.[0]?.name || vehicleDisplay || "";
          const customerLocation = location?.address || "";

          const setFields = {};
          if (userInfo.name) setFields.name = userInfo.name;
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
      } catch (dbErr) {
        console.error("[booking] DB insert failed:", dbErr?.message || dbErr);
      }
    } else {
      console.warn("[booking] Skipping DB insert: missing MONGODB config");
    }

    // Add to Google Calendar (best-effort, after DB insert)
    try {
      const {
        GOOGLE_SERVICE_ACCOUNT_EMAIL,
        GOOGLE_PRIVATE_KEY,
        GOOGLE_CALENDAR_ID
      } = process.env;
      const hasCalendarCreds = Boolean(
        GOOGLE_SERVICE_ACCOUNT_EMAIL && GOOGLE_PRIVATE_KEY && GOOGLE_CALENDAR_ID
      );
      if (hasCalendarCreds) {
        if (dateTime.date && (normalizedTime24 || dateTime.time)) {
          const calendarTime = normalizedTime24 || normalizeTo24Hour(dateTime.time);
          if (!calendarTime) {
            console.error('[booking] Unable to determine calendar start time', {
              date: dateTime.date,
              timeValue: dateTime.timeValue,
              timeLabel: dateTime.time,
            });
          } else {
            const startDateUtc = canonicalStartUtc || zonedDateToUtc(dateTime.date, calendarTime, SERVICE_TIME_ZONE);
            if (startDateUtc) {
            // Fetch the service duration from MongoDB
            let durationHours = 2; // fallback default
            try {
              const db = await (await import("../../lib/mongodb")).getDb();
              const svcCol = db.collection("services");
              // Try to match by title (case-insensitive)
              const svcDoc = await svcCol.findOne({ title: { $regex: `^${service.title}$`, $options: "i" } });
              if (svcDoc && typeof svcDoc.duration === "number" && svcDoc.duration > 0) {
                durationHours = svcDoc.duration;
              }
            } catch (svcErr) {
              console.error("[booking] Failed to fetch service duration from DB", svcErr);
            }
            const endDateUtc = new Date(startDateUtc.getTime() + durationHours * 60 * 60 * 1000);
            // Build a description with vehicle list and pricing summary when available
            let calendarDescription = `Service: ${service.title}`;
            if (vehicles) {
              calendarDescription += `\nVehicles:`;
              vehicles.forEach((v,i)=>{
                calendarDescription += `\n - ${v.name || `Vehicle ${i+1}`} (${v.type || 'N/A'}) — ${typeof v.lineTotal === 'number' ? formatMoney(v.lineTotal) : 'N/A'}`;
              });
            } else {
              calendarDescription += `\nVehicle: ${vehicleDisplay}`;
            }
            calendarDescription += `\nPhone: ${userInfo.phone || ''}`;
            calendarDescription += `\nEmail: ${userInfo.email || ''}`;
            if (userInfo.message) calendarDescription += `\nNotes: ${userInfo.message}`;
            if (showTravelLine) calendarDescription += `\nTravel: ${formattedTravel}`;
            if (showDiscountLine) calendarDescription += `\nDiscount: ${formattedDiscount}`;
            if (showTipLine) calendarDescription += `\nTip: ${formattedTip}`;
            calendarDescription += `\nTotal: ${formattedTotalPrice}`;

            await addBookingToCalendar({
              summary: `${service.title} for ${userInfo.name}`,
              description: calendarDescription,
              location: location?.address || '',
              startDateTime: startDateUtc.toISOString(),
              endDateTime: endDateUtc.toISOString(),
              calendarId: GOOGLE_CALENDAR_ID
            });
            } else {
              console.error('[booking] Invalid start date/time for Google Calendar event:', {
                date: dateTime.date,
                timeValue: dateTime.timeValue,
                timeLabel: dateTime.time,
                calendarTime,
                timeZone: SERVICE_TIME_ZONE,
              });
            }
          }
        } else {
          console.error('[booking] Missing date or time for Google Calendar event:', dateTime);
        }
      } else {
        console.warn('[booking] Skipping Google Calendar insert: missing service account env vars');
      }
    } catch (calendarErr) {
      // Capture calendar insertion errors but do not fail the booking
      try {
        const details = calendarErr?.message || calendarErr?.response?.data || calendarErr;
        calendarWarning = typeof details === 'string' ? details : JSON.stringify(details);
      } catch (e) {
        calendarWarning = 'Google Calendar insert failed';
      }
      console.error('[booking] Failed to add to Google Calendar', calendarWarning);
    }
    const responseMsg = isValidEmail(rawEmail)
      ? "Booking and confirmation sent successfully"
      : "Booking saved and admin notified; customer email not sent (no valid email)";
    // Always return success for booking creation; include calendar warning if calendar insert failed
    const respBody = { message: responseMsg, insertedId };
    if (calendarWarning) respBody.calendarWarning = calendarWarning;
    return res.status(200).json(respBody);
    } catch (error) {
        console.error("[booking] Error sending booking email", {
            error: error instanceof Error ? error.message : error,
            service: service?.title,
            client: clientId,
        });
        return res.status(500).json({ message: "Failed to send booking" });
    }
}
