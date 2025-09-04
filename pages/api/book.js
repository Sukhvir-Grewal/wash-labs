import nodemailer from "nodemailer";

export default async function handler(req, res) {
  if (req.method === "POST") {
    const { name, email, date, time } = req.body;

    try {
      let transporter = nodemailer.createTransport({
        service: "gmail",
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASS,
        },
      });

      await transporter.sendMail({
        from: process.env.EMAIL_USER,
        to: "washlabs.ca@gmail.com",
        subject: "New Booking Request",
        text: `
          Name: ${name}
          Email: ${email}
          Date: ${new Date(date).toDateString()}
          Time: ${time}
        `,
      });

      return res.status(200).json({ message: "Booking sent" });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  } else {
    res.status(405).json({ error: "Method not allowed" });
  }
}
