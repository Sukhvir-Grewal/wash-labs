import nodemailer from "nodemailer";

const RATE_LIMIT_WINDOW_MS = 60 * 1000;
const RATE_LIMIT_MAX_REQUESTS = 5;
const contactRequestLog = new Map();

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
    const timestamps = contactRequestLog.get(identifier) || [];
    const recent = timestamps.filter((timestamp) => timestamp > windowStart);

    if (recent.length >= RATE_LIMIT_MAX_REQUESTS) {
        contactRequestLog.set(identifier, recent);
        return true;
    }

    recent.push(now);
    contactRequestLog.set(identifier, recent);
    return false;
};

// Basic HTML escape to prevent injection in emails
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
            .json({ message: "Too many messages received. Please try again soon." });
    }

    const { name, email, message } = req.body;

    if (!name || !email || !message) {
        return res.status(400).json({ message: "All fields are required" });
    }

    // Sanitize inputs for email content
    const safeName = escapeHtml(name);
    const safeEmail = escapeHtml(email);
    const safeMessage = escapeHtml(message);

    // Meta/context for admin
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

    const { EMAIL_USER, EMAIL_PASS } = process.env;
    if (!EMAIL_USER || !EMAIL_PASS) {
        console.error("[contact] Missing email credentials", {
            hasUser: Boolean(EMAIL_USER),
            hasPass: Boolean(EMAIL_PASS),
        });
        return res.status(500).json({
            message:
                "Our contact inbox is temporarily unavailable. Please reach out via phone or social in the meantime.",
        });
    }

    try {
        console.info("[contact] Configuring email transporter", { hasUser: true });

        const transporter = nodemailer.createTransport({
            service: "gmail",
            auth: {
                user: EMAIL_USER,
                pass: EMAIL_PASS,
            },
        });

        // Admin email (detailed + branded)
        const adminSubject = `New Contact Message — ${safeName}`;
        const adminText = `New contact form submission

Name: ${name}
Email: ${email}
Message:
${message}

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
              <td style="padding:20px 24px;background:${brand.color};color:#fff;">
                <table width="100%">
                  <tr>
                    <td align="left" style="vertical-align:middle;">
                      <img src="${brand.logo}" alt="${brand.name}" height="40" style="display:block;border:0;"/>
                    </td>
                    <td align="right" style="font-size:14px;opacity:0.9;">${brand.hours}</td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td style="padding:24px 24px 8px 24px;">
                <h1 style="margin:0 0 8px 0;font-size:20px;color:#0f172a;">New Contact Form Submission</h1>
                <p style="margin:0;color:#334155;font-size:14px;">Received: <strong>${receivedAt}</strong></p>
              </td>
            </tr>
            <tr>
              <td style="padding:8px 24px 0 24px;">
                <table width="100%" cellpadding="0" cellspacing="0" style="font-size:14px;color:#0f172a;">
                  <tr><td style="padding:6px 0;"><strong>Name:</strong> ${safeName}</td></tr>
                  <tr><td style="padding:6px 0;"><strong>Email:</strong> <a href="mailto:${safeEmail}" style="color:${brand.color};text-decoration:none;">${safeEmail}</a></td></tr>
                  <tr><td style="padding:6px 0;"><strong>Message:</strong></td></tr>
                  <tr>
                    <td style="padding:12px;border-left:3px solid ${brand.color};background:#f8fbff;color:#334155;white-space:pre-wrap;">${safeMessage}</td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td style="padding:16px 24px 0 24px;">
                <h2 style="margin:0 0 8px 0;font-size:16px;color:#0f172a;">Context</h2>
                <p style="margin:0;color:#475569;font-size:13px;"><strong>Client IP:</strong> ${clientId}</p>
                <p style="margin:0;color:#475569;font-size:13px;"><strong>User-Agent:</strong> ${escapeHtml(userAgent)}</p>
                <p style="margin:0;color:#475569;font-size:13px;"><strong>Referrer:</strong> ${escapeHtml(referer)}</p>
              </td>
            </tr>
            <tr>
              <td style="padding:20px 24px 24px 24px;">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f8fbff;border:1px solid #e6effe;border-radius:10px;">
                  <tr>
                    <td style="padding:14px 16px;">
                      <p style="margin:0 0 6px 0;color:#0f172a;font-size:14px;"><strong>${brand.name}</strong></p>
                      <p style="margin:0;color:#334155;font-size:13px;">${brand.address}</p>
                      <p style="margin:6px 0 0 0;color:#334155;font-size:13px;">Areas: ${brand.areas}</p>
                      <p style="margin:6px 0 0 0;color:#334155;font-size:13px;">📞 ${brand.phone} • ✉️ ${brand.email}</p>
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

        const adminMail = {
            from: `"Wash Labs" <${EMAIL_USER}>`,
            to: brand.email,
            subject: adminSubject,
            text: adminText,
            html: adminHtml,
            replyTo: email, // reply directly to sender
        };

        await transporter.sendMail(adminMail);

        // Confirmation email (polished + branded)
        const userSubject = "We’ve received your message — Wash Labs";
        const userText = `Hello ${name},

Thanks for reaching out to Wash Labs. We’ve received your message and will get back to you shortly.

Your Message:
${message}

Hours: ${brand.hours}
Phone: ${brand.phone}
Email: ${brand.email}
Website: ${baseUrl}

If this wasn’t you, please ignore this email.

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
              <td style="padding:20px 24px;background:${brand.color};color:#fff;">
                <table width="100%">
                  <tr>
                    <td align="left" style="vertical-align:middle;">
                      <a href="${baseUrl}" style="text-decoration:none;color:#fff;">
                        <img src="${brand.logo}" alt="${brand.name}" height="40" style="display:block;border:0;"/>
                      </a>
                    </td>
                    <td align="right" style="font-size:14px;opacity:0.9;">${brand.hours}</td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td style="padding:24px;">
                <h1 style="margin:0 0 8px 0;font-size:20px;color:#0f172a;">Thanks for contacting ${brand.name}, ${safeName}!</h1>
                <p style="margin:0 0 14px 0;color:#334155;font-size:14px;">
                  We’ve received your message and our team will get back to you soon.
                </p>
                <h2 style="margin:0 0 8px 0;font-size:16px;color:#0f172a;">Your Message</h2>
                <div style="padding:12px;border-left:3px solid ${brand.color};background:#f8fbff;color:#334155;white-space:pre-wrap;">
                  ${safeMessage}
                </div>
                <p style="margin:16px 0 0 0;color:#475569;font-size:13px;">Sent on: <strong>${receivedAt}</strong></p>
              </td>
            </tr>
            <tr>
              <td style="padding:0 24px 24px 24px;">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f8fbff;border:1px solid #e6effe;border-radius:10px;">
                  <tr>
                    <td style="padding:14px 16px;">
                      <p style="margin:0 0 6px 0;color:#0f172a;font-size:14px;"><strong>Need to reach us sooner?</strong></p>
                      <p style="margin:0;color:#334155;font-size:13px;">📞 ${brand.phone} • ✉️ ${brand.email}</p>
                      <p style="margin:6px 0 0 0;color:#334155;font-size:13px;">Book directly: <a href="${baseUrl}/#services" style="color:${brand.color};text-decoration:none;">washlabs.ca/#services</a></p>
                      <p style="margin:8px 0 0 0;">
                        <a href="${brand.instagram}" style="color:${brand.color};text-decoration:none;">Instagram</a> ·
                        <a href="${brand.facebook}" style="color:${brand.color};text-decoration:none;">Facebook</a> ·
                        <a href="${brand.tiktok}" style="color:${brand.color};text-decoration:none;">TikTok</a>
                      </p>
                      <p style="margin:12px 0 0 0;color:#64748b;font-size:12px;">
                        This is an automated confirmation. Please don’t reply to this email.
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
            to: email,
            subject: userSubject,
            text: userText,
            html: userHtml,
            replyTo: `${brand.email}`, // direct replies go to your inbox
        };

        await transporter.sendMail(confirmationMail);

        return res
            .status(200)
            .json({ message: "Message and confirmation sent successfully" });
    } catch (error) {
        console.error("[contact] Error sending email", {
            error: error instanceof Error ? error.message : error,
            client: clientId,
        });
        return res.status(500).json({ message: "Failed to send message" });
    }
}
