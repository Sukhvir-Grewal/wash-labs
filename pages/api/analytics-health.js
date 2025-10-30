import { BetaAnalyticsDataClient } from '@google-analytics/data';
import { requireAuth } from '../../lib/auth';

function summarizeEnv() {
  const clientEmail = process.env.GA4_CLIENT_EMAIL || '';
  const privateKey = process.env.GA4_PRIVATE_KEY || '';
  const propertyId = process.env.GA4_PROPERTY_ID || '';

  const containsEscapedNewlines = privateKey.includes('\\n');
  const containsRealNewlines = privateKey.includes('\n');
  const wrappedInQuotes = (privateKey.startsWith('"') && privateKey.endsWith('"')) || (privateKey.startsWith("'") && privateKey.endsWith("'"));

  // Mask email for safety: show first 3 chars and domain
  let maskedEmail = '';
  if (clientEmail) {
    const [name, domain] = clientEmail.split('@');
    const head = (name || '').slice(0, 3);
    maskedEmail = `${head}${name && name.length > 3 ? '***' : ''}@${domain || ''}`;
  }

  return {
    hasPropertyId: Boolean(propertyId),
    hasClientEmail: Boolean(clientEmail),
    hasPrivateKey: Boolean(privateKey),
    clientEmailMasked: maskedEmail,
    privateKeyHeuristics: {
      containsEscapedNewlines,
      containsRealNewlines,
      wrappedInQuotes,
      length: privateKey ? privateKey.length : 0,
    },
  };
}

async function handler(req, res) {
  try {
    const envSummary = summarizeEnv();
    let canInitClient = false;
    if (envSummary.hasClientEmail && envSummary.hasPrivateKey) {
      try {
        const key = (() => {
          let k = process.env.GA4_PRIVATE_KEY;
          if (!k) return k;
          // Trim and normalize common misformatting
          k = k.trim();
          if ((k.startsWith('"') && k.endsWith('"')) || (k.startsWith("'") && k.endsWith("'"))) {
            k = k.slice(1, -1);
          }
          if (k.includes('\\n')) k = k.replace(/\\n/g, '\n');
          return k;
        })();
        // Attempt to construct the client (no network call)
        // If this throws, credentials are malformed
        // eslint-disable-next-line no-new
        new BetaAnalyticsDataClient({
          credentials: {
            client_email: process.env.GA4_CLIENT_EMAIL,
            private_key: key,
          },
        });
        canInitClient = true;
      } catch (err) {
        canInitClient = false;
      }
    }

    res.status(200).json({ success: true, env: envSummary, canInitClient });
  } catch (e) {
    res.status(500).json({ success: false, error: e?.message || 'Unknown error' });
  }
}

// Wrap with authentication
export default requireAuth(handler);
