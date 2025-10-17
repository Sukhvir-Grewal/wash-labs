import { getDb } from "../../lib/mongodb";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }
  try {
    const db = await getDb();
    const bookings = await db
      .collection("bookings")
      .find({})
      .sort({ date: -1, time: -1 })
      .toArray();
    return res.status(200).json({ success: true, bookings });
  } catch (err) {
    console.error("[get-bookings] error:", err);
    const message = err && (err.message || err.name) ? `${err.name || "Error"}: ${err.message || "Unknown"}` : "Unknown error";
    return res.status(500).json({ error: message });
  }
}
