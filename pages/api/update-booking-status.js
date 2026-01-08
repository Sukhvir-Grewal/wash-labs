import { MongoClient, ObjectId } from "mongodb";
import { requireAuth } from "../../lib/auth";

const uri = process.env.MONGODB_URI;
const dbName = process.env.MONGODB_DB;

async function handler(req, res) {
  if (req.method !== "PATCH") {
    return res.status(405).json({ error: "Method not allowed" });
  }
  const { id, status } = req.query;
  if (!uri || !dbName) {
    return res.status(500).json({ error: "Missing MongoDB config" });
  }
  if (!id || !status) {
    return res.status(400).json({ error: "Missing id or status" });
  }
  let client;
  try {
    client = new MongoClient(uri);
    await client.connect();
    const db = client.db(dbName);
    const collection = db.collection("bookings");

    let filter;
    if (ObjectId.isValid(id)) {
      filter = { _id: new ObjectId(id) };
    } else {
      filter = { id };
    }

    let result = await collection.updateOne(filter, { $set: { status } });

    if (result.matchedCount === 0 && filter._id) {
      result = await collection.updateOne({ id }, { $set: { status } });
    }

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
