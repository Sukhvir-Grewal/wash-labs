// Minimal GA4 Data API proxy. Requires env vars:
// GA4_PROPERTY_ID, GA4_CLIENT_EMAIL, GA4_PRIVATE_KEY (JSON escaped or raw with \n)
// This endpoint returns last 30 days total users and daily users.

import { BetaAnalyticsDataClient } from '@google-analytics/data';

function normalizePrivateKey(raw) {
  if (!raw) return raw;
  let key = raw.trim();
  // Remove wrapping quotes if set in env: "-----BEGIN ... -----END ..."
  if ((key.startsWith('"') && key.endsWith('"')) || (key.startsWith("'") && key.endsWith("'"))) {
    key = key.slice(1, -1);
  }
  // If the key has literal \n sequences, convert them to newlines
  if (key.includes('\\n')) {
    key = key.replace(/\\n/g, '\n');
  }
  return key;
}

function getAnalyticsClient() {
  const propertyId = process.env.GA4_PROPERTY_ID;
  const clientEmail = process.env.GA4_CLIENT_EMAIL;
  let privateKey = normalizePrivateKey(process.env.GA4_PRIVATE_KEY);
  if (!propertyId || !clientEmail || !privateKey) {
    throw new Error('Missing GA4 credentials in environment');
  }
  const client = new BetaAnalyticsDataClient({
    credentials: {
      client_email: clientEmail,
      private_key: privateKey,
    },
  });
  return { client, propertyId };
}

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
  try {
    const { client, propertyId } = getAnalyticsClient();

    // Total users last 30 days
    const [totals] = await client.runReport({
      property: `properties/${propertyId}`,
      dateRanges: [{ startDate: '30daysAgo', endDate: 'today' }],
      metrics: [{ name: 'totalUsers' }],
    });
    const totalUsers = totals?.rows?.[0]?.metricValues?.[0]?.value || '0';

    // Daily users last 14 days
    const [daily] = await client.runReport({
      property: `properties/${propertyId}`,
      dateRanges: [{ startDate: '14daysAgo', endDate: 'today' }],
      dimensions: [{ name: 'date' }],
      metrics: [{ name: 'totalUsers' }],
      orderBys: [{ dimension: { dimensionName: 'date' } }],
    });

    const dailySeries = (daily?.rows || []).map(r => ({
      date: r.dimensionValues?.[0]?.value,
      users: Number(r.metricValues?.[0]?.value || 0),
    }));

    res.status(200).json({ success: true, totalUsers: Number(totalUsers), daily: dailySeries });
  } catch (e) {
    const name = e?.name || 'Error';
    const message = e?.message || 'Unknown error';
    const details = Array.isArray(e?.errors) && e.errors.length ? e.errors[0]?.message : undefined;
    res.status(500).json({ success: false, error: `${name}: ${message}`, details });
  }
}
