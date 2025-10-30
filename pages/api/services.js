import { getDb } from "../../lib/mongodb";
import { isAuthenticated } from "../../lib/auth";

export default async function handler(req, res) {
  const method = req.method;
  try {
    const db = await getDb();
    const col = db.collection("services");

    if (method === "GET") {
      const services = await col.find({}).sort({ title: 1 }).toArray();
      res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=300');
      return res.status(200).json({ services });
    }

    if (method === "PUT") {
      // Require authentication for PUT (admin only)
      if (!isAuthenticated(req)) {
        return res.status(401).json({ error: 'Unauthorized. Please login.' });
      }
      
      const body = req.body || {};
      const services = Array.isArray(body.services) ? body.services : [];
      if (!services.length) {
        return res.status(400).json({ error: "No services provided" });
      }
      // Remove _id from each service to avoid immutable field error
      const bulkOps = services.map((svc) => {
        const { _id, ...rest } = svc;
        return {
          updateOne: {
            filter: { id: rest.id },
            update: { $set: rest },
            upsert: true,
          },
        };
      });
      await col.bulkWrite(bulkOps, { ordered: false });
      const updated = await col.find({}).sort({ title: 1 }).toArray();
      return res.status(200).json({ services: updated });
    }

    res.setHeader("Allow", ["GET", "PUT"]);
    return res.status(405).json({ error: `Method ${method} Not Allowed` });
  } catch (err) {
    console.error("/api/services error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}
