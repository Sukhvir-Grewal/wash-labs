import { getDb } from "../../lib/mongodb";
import { ObjectId } from "mongodb";
import { requireAuth } from "../../lib/auth";

// Expected expense shape: { date: 'YYYY-MM-DD', amount: number, category: 'one-time'|'chemicals'|'other', note?: string }
async function handler(req, res) {
  try {
    const db = await getDb();
    const col = db.collection('expenses');
    if (req.method === 'GET') {
      const items = await col.find({}).sort({ date: -1, _id: -1 }).toArray();
      return res.status(200).json({ success: true, items });
    }
    if (req.method === 'POST') {
      const { date, amount, category, note, supplier, productName, taxIncluded, taxRate, baseAmount } = req.body || {};
      if (!date || !/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(date)) {
        return res.status(400).json({ success: false, error: 'Invalid or missing date (YYYY-MM-DD)' });
      }
      const amt = Number(amount);
      if (!Number.isFinite(amt) || amt < 0) {
        return res.status(400).json({ success: false, error: 'Invalid amount' });
      }
      const allowed = ['one-time', 'chemicals', 'other'];
      const cat = String(category || '').toLowerCase();
      if (!allowed.includes(cat)) {
        return res.status(400).json({ success: false, error: 'Invalid category' });
      }
      const doc = {
        date,
        amount: amt,
        category: cat,
        // Optional fields
        supplier: (supplier ? String(supplier) : '').trim(),
        productName: (productName ? String(productName) : '').trim(),
        note: note ? String(note) : '',
        // Tax metadata (optional)
        taxIncluded: !!taxIncluded,
        taxRate: Number.isFinite(Number(taxRate)) ? Number(taxRate) : (taxIncluded ? 0.15 : 0),
        baseAmount: Number.isFinite(Number(baseAmount)) ? Number(baseAmount) : undefined,
        createdAt: new Date().toISOString(),
      };
      const result = await col.insertOne(doc);
      return res.status(200).json({ success: true, insertedId: result.insertedId, item: { ...doc, _id: result.insertedId } });
    }
    if (req.method === 'DELETE') {
      const { id } = req.query || {};
      if (!id || typeof id !== 'string') {
        return res.status(400).json({ success: false, error: 'Missing expense id' });
      }
      try {
        const result = await col.deleteOne({ _id: new ObjectId(id) });
        if (result.deletedCount === 1) {
          return res.status(200).json({ success: true });
        }
        return res.status(404).json({ success: false, error: 'Expense not found' });
      } catch (err) {
        return res.status(400).json({ success: false, error: 'Invalid expense id' });
      }
    }
    res.setHeader('Allow', ['GET', 'POST', 'DELETE']);
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  } catch (e) {
    console.error('[expenses] error', e);
    return res.status(500).json({ success: false, error: e?.message || 'Server error' });
  }
}

// Wrap with authentication
export default requireAuth(handler);
