import nodemailer from "nodemailer";
import { MongoClient } from "mongodb";

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

    const { service, vehicle, dateTime, location, userInfo } = req.body;

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
    const safeDate = escapeHtml(dateTime?.date || "N/A");
    const safeTime = escapeHtml(dateTime?.time || "N/A");
    const safeLocation = escapeHtml(location?.address || "Not specified");
    const safeName = escapeHtml(userInfo?.name || "");
    const safeEmail = escapeHtml(userInfo?.email || "");
    const safePhone = `${escapeHtml(userInfo?.countryCode || "")} ${escapeHtml(
        userInfo?.phone || ""
    )}`.trim();
    const safeNotes = escapeHtml(userInfo?.message || "");

    const totalPrice =
        typeof service.totalPrice === "number"
            ? service.totalPrice
            : typeof service.basePrice === "number"
            ? service.basePrice
            : null;
    const formattedTotalPrice =
        typeof totalPrice === "number" ? `$${totalPrice}` : "Not specified";

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

  let client;
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
        const adminText = `New booking request

Service: ${service.title}
Total Price: ${formattedTotalPrice}
Vehicle: ${vehicleDisplay}
Date & Time: ${safeDate} at ${safeTime}
Location: ${location?.address || "Not specified"}

Client:
Name: ${userInfo.name}
Email: ${userInfo.email}
Phone: ${userInfo.countryCode || ""} ${userInfo.phone}
${userInfo.message ? `Notes:\n${userInfo.message}\n` : ""}
---
Received: ${receivedAt}
Client IP: ${clientId}
User-Agent: ${userAgent}
Referrer: ${referer}
`;

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
                  <tr><td style="padding:6px 0;"><strong>Service:</strong> ${safeService.title}</td></tr>
                  <tr><td style="padding:6px 0;"><strong>Total Price:</strong> ${escapeHtml(formattedTotalPrice)}</td></tr>
                  <tr><td style="padding:6px 0;"><strong>Vehicle:</strong> ${vehicleDisplay}</td></tr>
                  <tr><td style="padding:6px 0;"><strong>Date &amp; Time:</strong> ${safeDate} at ${safeTime}</td></tr>
                  <tr><td style="padding:6px 0;"><strong>Location:</strong> ${safeLocation}</td></tr>
                </table>
              </td>
            </tr>
            <tr>
              <td style="padding:16px 24px 0 24px;">
                <h2 style="margin:0 0 8px 0;font-size:16px;color:#0f172a;">Client</h2>
                <p style="margin:0;color:#475569;font-size:13px;"><strong>Name:</strong> ${safeName}</p>
                <p style="margin:0;color:#475569;font-size:13px;"><strong>Email:</strong> <a href="mailto:${safeEmail}" style="color:${brand.color};text-decoration:none;">${safeEmail}</a></p>
                <p style="margin:0;color:#475569;font-size:13px;"><strong>Phone:</strong> ${escapeHtml(safePhone)}</p>
                ${safeNotes ? `<div style="margin-top:8px;padding:12px;border-left:3px solid ${brand.color};background:#f8fbff;color:#334155;white-space:pre-wrap;"><strong>Notes:</strong>\n${safeNotes}</div>` : ""}
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
            replyTo: userInfo.email,
        };

        await transporter.sendMail(adminMail);

        // Customer confirmation (branded + logo, professional tone)
        const userSubject = `Booking received — ${safeService.title} | Wash Labs`;
        const userText = `Hello ${userInfo.name},

Thanks for booking with Wash Labs. We've received your request and will follow up shortly.

Booking Summary
Service: ${service.title}
Total Price: ${formattedTotalPrice}
Vehicle: ${vehicleDisplay}
Date & Time: ${safeDate} at ${safeTime}
Location: ${location?.address || "Not specified"}

Need anything else?
Phone: ${brand.phone}
Email: ${brand.email}
Website: ${baseUrl}

— Wash Labs, Halifax NS`;

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
                <h1 style="margin:0 0 8px 0;font-size:20px;color:#0f172a;">Thanks for your booking, ${safeName}!</h1>
                <p style="margin:0 0 14px 0;color:#334155;font-size:14px;">We’ve received your request and will follow up shortly.</p>
                <h2 style="margin:0 0 8px 0;font-size:16px;color:#0f172a;">Booking Summary</h2>
                <table cellpadding="0" cellspacing="0" style="font-size:14px;color:#0f172a;">
                  <tr><td style="padding:4px 0;"><strong>Service:</strong> ${safeService.title}</td></tr>
                  <tr><td style="padding:4px 0;"><strong>Total Price:</strong> ${escapeHtml(formattedTotalPrice)}</td></tr>
                  <tr><td style="padding:4px 0;"><strong>Vehicle:</strong> ${vehicleDisplay}</td></tr>
                  <tr><td style="padding:4px 0;"><strong>Date &amp; Time:</strong> ${safeDate} at ${safeTime}</td></tr>
                  <tr><td style="padding:4px 0;"><strong>Location:</strong> ${safeLocation}</td></tr>
                </table>
                ${safeNotes ? `<div style="margin-top:12px;padding:12px;border-left:3px solid ${brand.color};background:#f8fbff;color:#334155;white-space:pre-wrap;"><strong>Your Notes:</strong>\n${safeNotes}</div>` : ""}
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
            to: userInfo.email,
            subject: userSubject,
            text: userText,
            html: userHtml,
            replyTo: brand.email, // allow replies to your main inbox
        };

    await transporter.sendMail(confirmationMail);

    // Insert booking into MongoDB (best-effort, after emails)
    const uri = process.env.MONGODB_URI;
    const dbName = process.env.MONGODB_DB;
    let insertedId = null;
    if (uri && dbName) {
      try {
        client = await MongoClient.connect(uri, { useNewUrlParser: true, useUnifiedTopology: true });
        const db = client.db(dbName);
        const collection = db.collection("bookings");
        const doc = {
          // Align with admin schema
          name: userInfo.name,
          carName: vehicleDisplay,
          service: service.title,
          date: dateTime.date,
          time: dateTime.time,
          amount: totalPrice ?? undefined,
          status: "pending",
          phone: userInfo.phone,
          email: userInfo.email,
          location: location?.address || "",
          addOns: Array.isArray(service?.addOns) ? service.addOns : [],
          carType: vehicle?.type || "",
          createdAt: new Date().toISOString(),
          source: "online",
        };
        const result = await collection.insertOne(doc);
        insertedId = result.insertedId;
      } catch (dbErr) {
        console.error("[booking] DB insert failed:", dbErr?.message || dbErr);
      } finally {
        if (client) await client.close();
      }
    } else {
      console.warn("[booking] Skipping DB insert: missing MONGODB config");
    }

    return res
      .status(200)
      .json({ message: "Booking and confirmation sent successfully", insertedId });
    } catch (error) {
        console.error("[booking] Error sending booking email", {
            error: error instanceof Error ? error.message : error,
            service: service?.title,
            client: clientId,
        });
        return res.status(500).json({ message: "Failed to send booking" });
    }
}
