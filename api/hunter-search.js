// api/hunter-search.js
import fetch from 'node-fetch';

export default async function handler(req, res) {
  const { domain } = req.body;

  try {
    const response = await fetch(
      `https://api.hunter.io/v2/domain-search?domain=${encodeURIComponent(domain)}&offset=0&limit=250&api_key=${process.env.HUNTER_API_KEY}`
    );
    const data = await response.json();

    if (!data || !data.data) {
      return res.status(500).json({ error: 'No data returned from Hunter.io' });
    }

    const result = data.data;
    let customStatus = result.status;
    let emails = result.emails || [];

    // Handle accept-all domains
    if (result.accept_all) {
      customStatus = 'accept-all';
      emails = emails.map(e => ({ ...e, confidence: Math.min(e.confidence || 0, 70) }));
    }

    res.status(200).json({
      status: customStatus,
      emails,
      total: emails.length
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Verification failed' });
  }
}
