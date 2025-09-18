import nodemailer from "nodemailer";

export default async function handler(req, res) {
    if (req.method !== "POST") {
        return res.status(405).json({ message: "Method not allowed" });
    }

    const { service, vehicle, dateTime, userInfo } = req.body;

    if (!service || !vehicle || !dateTime || !userInfo) {
        return res.status(400).json({ message: "Missing booking details" });
    }

    try {
        const transporter = nodemailer.createTransport({
            service: "gmail",
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASS,
            },
        });

        // 📩 Admin notification email
        const adminMail = {
            from: `"WashLabs Booking" <${process.env.EMAIL_USER}>`,
            to: "washlabs.ca@gmail.com",
            subject: `✅ New Booking Request - ${service.title}`,
            html: `
        <h2 style="color:#22c55e;">New Booking Request</h2>
        
        <h3 style="color:#f97316;">Service</h3>
        <p><strong>${service.title}</strong></p>
        <p>${service.price ? "Price: $" + service.price : ""}</p>

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
          <p><strong>Service:</strong> ${service.title} ${
                service.price ? `- $${service.price}` : ""
            }</p>
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
        console.error("Error sending booking email:", error);
        return res.status(500).json({ message: "Failed to send booking" });
    }
}
