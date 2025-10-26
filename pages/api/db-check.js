import { Client } from 'pg';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    return res.status(400).json({ error: 'DATABASE_URL is not set in your environment' });
  }

  const client = new Client({ connectionString, ssl: { rejectUnauthorized: false } });

  try {
    await client.connect();
    const result = await client.query('select now() as now, current_user as user');
    const row = result.rows?.[0] || {};
    return res.status(200).json({ ok: true, now: row.now, user: row.user });
  } catch (error) {
    return res.status(500).json({ ok: false, error: error.message || 'Failed to connect' });
  } finally {
    try { await client.end(); } catch {}
  }
}
