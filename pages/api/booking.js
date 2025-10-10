import nodemailer from "nodemailer";

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

export default async function handler(req, res) {
    if (req.method !== "POST") {
        return res.status(405).json({ message: "Method not allowed" });
    }

    const clientId = getClientIdentifier(req);
    if (isRateLimited(clientId)) {
        return res
            .status(429)
            .json({ message: "Too many booking requests. Please try again soon." });
    }

    const { service, vehicle, dateTime, userInfo } = req.body;

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

    try {
        console.info("[booking] Configuring email transporter", {
            service: service?.title,
            hasUser: true,
        });

        const transporter = nodemailer.createTransport({
            service: "gmail",
            auth: {
                user: EMAIL_USER,
                pass: EMAIL_PASS,
            },
        });

        // 📩 Admin notification email
        const totalPrice =
            typeof service.totalPrice === "number"
                ? service.totalPrice
                : typeof service.basePrice === "number"
                ? service.basePrice
                : null;
        const formattedTotalPrice =
            typeof totalPrice === "number" ? `$${totalPrice}` : "Not specified";

        const adminMail = {
            from: `"WashLabs Booking" <${EMAIL_USER}>`,
            to: "washlabs.ca@gmail.com",
            subject: `✅ New Booking Request - ${service.title}`,
            html: `
        <h2 style="color:#22c55e;">New Booking Request</h2>

        <h3 style="color:#f97316;">Service</h3>
        <p><strong>${service.title}</strong></p>
        <p><strong>Total Price:</strong> ${formattedTotalPrice}</p>

        <h3 style="color:#f97316;">Vehicle</h3>
        <p>${vehicle.year} ${vehicle.name}</p>

        <h3 style="color:#f97316;">Date & Time</h3>
        <p>${dateTime.date || "N/A"} at ${dateTime.time || "N/A"}</p>

        <h3 style="color:#f97316;">Client Information</h3>
        <p><strong>Name:</strong> ${userInfo.name}</p>
        <p><strong>Email:</strong> ${userInfo.email}</p>
        <p><strong>Phone:</strong> ${userInfo.countryCode || ""} ${
                userInfo.phone
            }</p>
        ${
            userInfo.message
                ? `<p><strong>Notes:</strong><br/>${userInfo.message}</p>`
                : ""
        }

        <hr />
        <p style="font-size:0.9rem;color:gray;">
          This booking was submitted from the WashLabs website booking form.
        </p>
      `,
            replyTo: userInfo.email, // ✅ lets you reply directly to client
        };

        await transporter.sendMail(adminMail);

        // 📩 Confirmation email to applicant (No Reply)
        const confirmationMail = {
            from: `"WashLabs (No Reply)" <no-reply@washlabs.ca>`, // ✅ noreply
            to: userInfo.email,
            subject: `🧽 Booking Confirmation - ${service.title}`,
            html: `
        <div style="font-family:Arial, sans-serif; line-height:1.6; color:#333;">
          <h2 style="color:#22c55e;">Thank you for your booking, ${
              userInfo.name
          }! 🎉</h2>
          <p>We’ve received your request and our team will contact you if any additional details are needed.</p>

          <h3 style="color:#f97316;">Booking Summary</h3>
          <p><strong>Service:</strong> ${service.title}</p>
          <p><strong>Total Price:</strong> ${formattedTotalPrice}</p>
          <p><strong>Vehicle:</strong> ${vehicle.year} ${vehicle.name}</p>
          <p><strong>Date & Time:</strong> ${dateTime.date || "N/A"} at ${
                dateTime.time || "N/A"
            }</p>

          ${
              userInfo.message
                  ? `<p><strong>Your Notes:</strong><br/>${userInfo.message}</p>`
                  : ""
          }

          <hr/>
          <p style="font-size:0.9rem; color:gray;">
            WashLabs Team<br/>
            📍 Halifax / Dartmouth / Bedford<br/>
            ✉️ washlabs.ca@gmail.com<br/>
            ⚠️ This is an automated message from a no-reply address. Please do not reply directly.
          </p>
        </div>
      `,
        };

        await transporter.sendMail(confirmationMail);

        return res
            .status(200)
            .json({ message: "Booking and confirmation sent successfully" });
    } catch (error) {
        console.error("[booking] Error sending booking email", {
            error: error instanceof Error ? error.message : error,
            service: service?.title,
            client: clientId,
        });
        return res.status(500).json({ message: "Failed to send booking" });
    }
}
