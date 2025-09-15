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

        // Compose the booking email
        const mailOptions = {
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
        };

        await transporter.sendMail(mailOptions);

        return res.status(200).json({ message: "Booking sent successfully" });
    } catch (error) {
        console.error("Error sending booking email:", error);
        return res.status(500).json({ message: "Failed to send booking" });
    }
}
