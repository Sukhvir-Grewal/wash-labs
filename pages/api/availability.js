import { getOccupiedSlotsForDate } from '../../lib/availability';

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
  const date = req.query.date;
  if (!date || typeof date !== 'string') return res.status(400).json({ error: 'Missing date (YYYY-MM-DD)' });
  try {
    const occupied = await getOccupiedSlotsForDate(date);
    return res.status(200).json({ occupied });
  } catch (err) {
    console.error('[api/availability] error', err?.message || err);
    return res.status(500).json({ error: 'Failed to compute availability' });
  }
}
