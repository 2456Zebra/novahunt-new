// Next.js API route: /api/search?domain=example.com
// Uses HUNTER_API_KEY server env var. If missing, returns a small demo payload.
export default async function handler(req, res) {
  try {
    const domain = (req.query.domain || '').toString().trim();
    if (!domain) {
      return res.status(400).json({ error: 'Missing domain query parameter' });
    }

    const key = process.env.HUNTER_API_KEY;
    if (!key) {
      // Demo fallback so the UI can be tested even without keys.
      console.warn('HUNTER_API_KEY not configured — returning demo data for', domain);
      return res.status(200).json({
        query: domain,
        total: 2,
        emails: [
          {
            value: 'jane.doe@' + domain,
            first_name: 'Jane',
            last_name: 'Doe',
            position: 'Head of Growth',
            confidence: 90,
            sources: [{ domain, url: `https://${domain}/team/jane-doe` }],
          },
          {
            value: 'john.smith@' + domain,
            first_name: 'John',
            last_name: 'Smith',
            position: 'CEO',
            confidence: 75,
            sources: [{ domain, url: `https://${domain}/about` }],
          },
        ],
      });
    }

    // Hunter API v2 domain-search endpoint
    const hunterUrl = `https://api.hunter.io/v2/domain-search?domain=${encodeURIComponent(domain)}&api_key=${encodeURIComponent(key)}&limit=10`;

    const resp = await fetch(hunterUrl, { method: 'GET' });
    if (!resp.ok) {
      const txt = await resp.text().catch(() => '');
      return res.status(resp.status).json({ error: `Hunter API error: ${txt || resp.status}` });
    }

    const data = await resp.json().catch(() => null);
    // Hunter API returns data under data.data (the v2 payload)
    const payload = data?.data || data;
    const total = payload?.total || (payload?.emails ? payload.emails.length : 0);
    const emails = (payload?.emails || []).map((e) => ({
      value: e.value,
      first_name: e.first_name,
      last_name: e.last_name,
      position: e.position,
      confidence: e.confidence,
      sources: e.sources || [],
    }));

    return res.status(200).json({ query: domain, total, emails });
  } catch (err) {
    console.error('Search API error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
