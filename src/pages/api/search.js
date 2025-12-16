// Next.js API route: /api/search?domain=example.com
// - Normalizes Hunter responses to always return { query, total, emails }
// - If HUNTER_API_KEY is not configured returns demo data (safe for preview)
// - If `?debug=true` is passed and running in Preview, returns the raw Hunter response for troubleshooting
export default async function handler(req, res) {
  try {
    const domain = (req.query.domain || '').toString().trim();
    const debug = req.query.debug === 'true';
    if (!domain) {
      return res.status(400).json({ error: 'Missing domain query parameter' });
    }

    const key = process.env.HUNTER_API_KEY;
    if (!key) {
      // Demo fallback so the UI can be tested even without keys.
      console.warn('HUNTER_API_KEY not configured — returning demo data for', domain);
      return res.status(200).json({
        query: domain,
        total: 545, // realistic demo total so UI shows "Showing 5 of 545"
        emails: [
          {
            value: 'jane.doe@' + domain,
            first_name: 'Jane',
            last_name: 'Doe',
            position: 'Head of Growth',
            confidence: 90,
            department: 'Marketing',
            sources: [{ domain, url: `https://${domain}/team/jane-doe` }],
          },
          {
            value: 'john.smith@' + domain,
            first_name: 'John',
            last_name: 'Smith',
            position: 'CEO',
            confidence: 99,
            department: 'Executive',
            sources: [{ domain, url: `https://${domain}/about` }],
          },
          {
            value: 'alex.engineer@' + domain,
            first_name: 'Alex',
            last_name: 'Engineer',
            position: 'Senior Engineer',
            confidence: 88,
            department: 'Engineering',
            sources: [{ domain, url: `https://${domain}/team/alex` }],
          },
          {
            value: 'sam.sales@' + domain,
            first_name: 'Sam',
            last_name: 'Sales',
            position: 'Account Executive',
            confidence: 78,
            department: 'Sales',
            sources: [{ domain, url: `https://${domain}/team/sam` }],
          },
          {
            value: 'pat.hr@' + domain,
            first_name: 'Pat',
            last_name: 'People',
            position: 'HR Manager',
            confidence: 72,
            department: 'People',
            sources: [{ domain, url: `https://${domain}/team/pat` }],
          },
        ],
      });
    }

    // Call Hunter domain-search v2. Limit to 100 to retrieve representative emails; Hunter returns `total` count separately.
    const hunterUrl = `https://api.hunter.io/v2/domain-search?domain=${encodeURIComponent(domain)}&api_key=${encodeURIComponent(key)}&limit=100`;

    const resp = await fetch(hunterUrl, { method: 'GET' });
    const text = await resp.text();
    let data = null;
    try {
      data = JSON.parse(text);
    } catch (err) {
      // not JSON — return raw text as error
      return res.status(resp.status).json({ error: `Hunter API error: ${text}` });
    }

    // Optionally return raw Hunter payload for debug when requested and allowed
    if (debug && process.env.NODE_ENV !== 'production') {
      return res.status(200).json({ debug: true, raw: data });
    }

    // Normalize Hunter's payload structure (hunter v2 commonly returns data.data)
    const payload = data?.data || data;

    // Determine total count from common places
    const total =
      payload?.total ??
      payload?.meta?.total ??
      data?.total ??
      (Array.isArray(payload?.emails) ? payload.emails.length : undefined) ??
      (Array.isArray(payload?.results) ? payload.results.length : undefined) ??
      0;

    // Extract emails array in a normalized shape
    const rawEmails = payload?.emails || payload?.results || payload?.data?.emails || [];

    const emails = (Array.isArray(rawEmails) ? rawEmails : []).map((e) => ({
      value: e.value || e.email || '',
      first_name: e.first_name || e.firstName || '',
      last_name: e.last_name || e.lastName || '',
      position: e.position || e.title || e.job_title || '',
      department: e.department || e.job_department || '',
      confidence: e.confidence || e.score || null,
      sources: e.sources || e.source || [],
    }));

    return res.status(200).json({
      query: domain,
      total: Number(total || 0),
      emails,
    });
  } catch (err) {
    console.error('Search API error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
