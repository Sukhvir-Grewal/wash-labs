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
        console.info("[contact] Configuring email transporter", {
            hasUser: true,
        });

        const transporter = nodemailer.createTransport({
            service: "gmail",
            auth: {
                user: EMAIL_USER, // e.g., washlabs.ca@gmail.com
                pass: EMAIL_PASS, // Gmail app password
            },
        });

        // 📩 Send to Admin
        const adminMail = {
            from: `"WashLabs Contact Form" <${process.env.EMAIL_USER}>`,
            to: "washlabs.ca@gmail.com", // your inbox
            subject: `📩 New Contact Message from ${name}`,
            html: `
        <h2 style="color:#f97316;">New Contact Form Submission</h2>
        <p><strong>Name:</strong> ${name}</p>
        <p><strong>Email:</strong> ${email}</p>
        <p><strong>Message:</strong></p>
        <p style="white-space: pre-line;">${message}</p>
        <hr />
        <p style="font-size:0.9rem;color:gray;">
          This message was sent from the WashLabs website contact form.
        </p>
      `,
            replyTo: email, // ✅ allows you to reply directly to the sender
        };

        await transporter.sendMail(adminMail);

        // 📩 Confirmation to User (No Reply)
        const confirmationMail = {
            from: `"WashLabs (No Reply)" <no-reply@washlabs.ca>`, // ✅ noreply sender
            to: email,
            subject: "✅ We’ve received your message",
            html: `
        <div style="font-family:Arial, sans-serif; line-height:1.6; color:#333;">
          <h2 style="color:#22c55e;">Hello ${name},</h2>
          <p>Thank you for contacting <strong>WashLabs</strong>. We’ve received your message and our team will review it shortly.</p>
          
          <h3 style="color:#f97316;">Your Message</h3>
          <p style="white-space: pre-line; border-left:3px solid #f97316; padding-left:8px; color:#444;">
            ${message}
          </p>
          
          <hr/>
          <p style="font-size:0.9rem; color:gray;">
            WashLabs Team<br/>
            📍 Halifax / Dartmouth / Bedford<br/>
            ✉️ washlabs.ca@gmail.com<br/>
            ⚠️ This is an automated email from a no-reply address. Please do not reply directly.
          </p>
        </div>
      `,
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
