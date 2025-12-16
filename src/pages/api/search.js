// Next.js API route: /api/search?domain=example.com
// - Normalizes Hunter responses to always return { query, total, emails }
// - Supports debug mode: /api/search?domain=...&debug=true returns raw Hunter payload
// - If HUNTER_API_KEY is missing returns a realistic demo payload (total=545) so the UI can render properly
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
        total: 545,
        emails: [
          {
            value: `jane.doe@${domain}`,
            first_name: 'Jane',
            last_name: 'Doe',
            position: 'Head of Growth',
            confidence: 90,
            department: 'Marketing',
            sources: [{ domain, url: `https://${domain}/team/jane-doe` }],
          },
          {
            value: `john.smith@${domain}`,
            first_name: 'John',
            last_name: 'Smith',
            position: 'CEO',
            confidence: 99,
            department: 'Executive',
            sources: [{ domain, url: `https://${domain}/about` }],
          },
          {
            value: `alex.engineer@${domain}`,
            first_name: 'Alex',
            last_name: 'Engineer',
            position: 'Senior Engineer',
            confidence: 88,
            department: 'Engineering',
            sources: [{ domain, url: `https://${domain}/team/alex` }],
          },
          {
            value: `sam.sales@${domain}`,
            first_name: 'Sam',
            last_name: 'Sales',
            position: 'Account Executive',
            confidence: 78,
            department: 'Sales',
            sources: [{ domain, url: `https://${domain}/team/sam` }],
          },
          {
            value: `pat.hr@${domain}`,
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

    // Call Hunter domain-search v2. Request limit to get representative emails; Hunter returns `total` separately.
    const hunterUrl = `https://api.hunter.io/v2/domain-search?domain=${encodeURIComponent(domain)}&api_key=${encodeURIComponent(key)}&limit=100`;

    const resp = await fetch(hunterUrl, { method: 'GET' });
    const text = await resp.text();

    let data;
    try {
      data = JSON.parse(text);
    } catch (err) {
      // If Hunter returned non-JSON or an error body, return the raw text as an error
      console.error('Hunter returned non-JSON response', text);
      return res.status(resp.status).json({ error: `Hunter API error: ${text}` });
    }

    // If debug requested return raw Hunter response (useful for immediate troubleshooting)
    if (debug) {
      return res.status(200).json({ debug: true, raw: data });
    }

    // Normalize common Hunter payload shapes
    // Hunter v2 usually returns { data: { emails: [...], total: 545, ... } }
    const payload = data?.data ?? data;

    // Resolve total from common places
    const rawTotal =
      payload?.total ??
      payload?.meta?.total ??
      data?.total ??
      payload?.summary?.total ??
      payload?.pagination?.total ??
      0;

    const total = Number(rawTotal || 0);

    // Extract emails: support several possible keys
    const rawEmails = payload?.emails ?? payload?.results ?? payload?.data?.emails ?? [];

    const emails = (Array.isArray(rawEmails) ? rawEmails : []).map((e) => ({
      value: e?.value ?? e?.email ?? '',
      first_name: e?.first_name ?? e?.firstName ?? '',
      last_name: e?.last_name ?? e?.lastName ?? '',
      position: e?.position ?? e?.title ?? e?.job_title ?? '',
      department: e?.department ?? e?.job_department ?? '',
      confidence: e?.confidence ?? e?.score ?? null,
      sources: e?.sources ?? e?.source ?? [],
    }));

    return res.status(200).json({
      query: domain,
      total,
      emails,
    });
  } catch (err) {
    console.error('Search API error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
