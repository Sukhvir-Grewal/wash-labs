import { BetaAnalyticsDataClient } from '@google-analytics/data';

function normalizePrivateKey(raw) {
  if (!raw) return raw;
  let key = raw.trim();
  if ((key.startsWith('"') && key.endsWith('"')) || (key.startsWith("'") && key.endsWith("'"))) {
    key = key.slice(1, -1);
  }
  if (key.includes('\\n')) {
    key = key.replace(/\\n/g, '\n');
  }
  return key;
}

function getClientAndProperty() {
  const propertyId = process.env.GA4_PROPERTY_ID;
  const clientEmail = process.env.GA4_CLIENT_EMAIL;
  const privateKey = normalizePrivateKey(process.env.GA4_PRIVATE_KEY);
  if (!propertyId || !clientEmail || !privateKey) {
    throw new Error('Missing GA4 credentials in environment');
  }
  const client = new BetaAnalyticsDataClient({
    credentials: { client_email: clientEmail, private_key: privateKey },
  });
  return { client, propertyId };
}

export default async function handler(req, res) {
  try {
    const { client, propertyId } = getClientAndProperty();
    const { excludeMe } = req.query || {};

    // 1) Total active users (no dimensions)
    const [totalResp] = await client.runRealtimeReport({
      property: `properties/${propertyId}`,
      metrics: [{ name: 'activeUsers' }],
    });
    let totalActive = 0;
    // Prefer metricTotals if present
    if (Array.isArray(totalResp?.totals) && totalResp.totals[0]?.metricValues?.[0]?.value) {
      totalActive = Number(totalResp.totals[0].metricValues[0].value) || 0;
    } else if (Array.isArray(totalResp?.rows)) {
      totalActive = totalResp.rows.reduce((sum, r) => sum + Number(r.metricValues?.[0]?.value || 0), 0);
    }

    if (excludeMe && totalActive > 0) totalActive = totalActive - 1;
    if (totalActive < 0) totalActive = 0;

    res.status(200).json({ success: true, totalActive });
  } catch (e) {
    const name = e?.name || 'Error';
    const message = e?.message || 'Unknown error';
    const details = Array.isArray(e?.errors) && e.errors.length ? e.errors[0]?.message : undefined;
    res.status(500).json({ success: false, error: `${name}: ${message}`, details });
  }
}
