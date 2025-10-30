import { MongoClient, ObjectId } from "mongodb";
import { requireAuth } from "../../lib/auth";

const uri = process.env.MONGODB_URI;
const dbName = process.env.MONGODB_DB;

async function handler(req, res) {
  if (req.method !== "PATCH") {
    return res.status(405).json({ error: "Method not allowed" });
  }
  const { id } = req.query;
  const update = req.body;
  if (!uri || !dbName) {
    return res.status(500).json({ error: "Missing MongoDB config" });
  }
  if (!id) {
    return res.status(400).json({ error: "Missing booking id" });
  }
  let client;
  try {
    client = await MongoClient.connect(uri, { useNewUrlParser: true, useUnifiedTopology: true });
    const db = client.db(dbName);
    const collection = db.collection("bookings");
    const { _id, id: _ignore, ...updateFields } = update;
    const result = await collection.updateOne(
      { _id: new ObjectId(id) },
      { $set: updateFields }
    );
    if (result.matchedCount === 1) {
      res.status(200).json({ success: true });
    } else {
      res.status(404).json({ error: "Booking not found" });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  } finally {
    if (client) await client.close();
  }
}

// Wrap with authentication
export default requireAuth(handler);
