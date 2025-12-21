export default async function handler(req, res) {
  try {
    const domain = req.method === 'POST' ? req.body.domain : req.query.domain;
    const offset = req.query.offset || 0;
    const limit = 50; // always return 50

    if (!domain) {
      res.status(400).json({ error: 'Missing domain parameter.' });
      return;
    }

    const apiKey = process.env.HUNTER_API_KEY;
    if (!apiKey) {
      res.status(500).json({ error: 'Server missing Hunter API key.' });
      return;
    }

    // ✅ MUST include type=personal,generic or Hunter forces limit=10
    const url = `https://api.hunter.io/v2/domain-search?domain=${encodeURIComponent(
      domain
    )}&api_key=${apiKey}&type=personal,generic&offset=${offset}&limit=${limit}`;

    const response = await fetch(url);
    const data = await response.json();

    if (!response.ok) {
      res.status(response.status).json({
        error: data?.errors ? JSON.stringify(data.errors) : 'Hunter API error.',
      });
      return;
    }

    // ✅ Return simplified structure for your frontend
    res.status(200).json({
      results: data.data.emails || [],
      total: data.data.meta.results || 0,
    });
  } catch (err) {
    console.error('Hunter search error:', err);
    res.status(500).json({ error: 'Unexpected server error.' });
  }
}
