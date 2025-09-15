import nodemailer from "nodemailer";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  const { name, email, message } = req.body;

  if (!name || !email || !message) {
    return res.status(400).json({ message: "All fields are required" });
  }

  try {
    // Configure your transporter (use your Gmail credentials or environment variables)
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL_USER, // e.g., washlabs.ca@gmail.com
        pass: process.env.EMAIL_PASS, // Gmail app password
      },
    });

    // Compose the email
    const mailOptions = {
      from: `"WashLabs Contact Form" <${process.env.EMAIL_USER}>`,
      to: "washlabs.ca@gmail.com", // your inbox
      subject: `📩 New Contact Message from ${name}`, // clear subject
      html: `
        <h2 style="color:#f97316;">New Contact Form Submission</h2>
        <p><strong>Name:</strong> ${name}</p>
        <p><strong>Email:</strong> ${email}</p>
        <p><strong>Message:</strong></p>
        <p style="white-space: pre-line;">${message}</p>
        <hr />
        <p style="font-size:0.9rem;color:gray;">This message was sent from the WashLabs website contact form.</p>
      `,
    };

    // Send the email
    await transporter.sendMail(mailOptions);

    return res.status(200).json({ message: "Message sent successfully" });
  } catch (error) {
    console.error("Error sending email:", error);
    return res.status(500).json({ message: "Failed to send message" });
  }
}
