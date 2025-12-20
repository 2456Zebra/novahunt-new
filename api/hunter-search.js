export default async function handler(req, res) {
  try {
    const domain = req.method === 'POST' ? req.body.domain : req.query.domain;

    if (!domain) {
      res.status(400).json({ error: 'Missing domain parameter.' });
      return;
    }

    const apiKey = process.env.HUNTER_API_KEY;
    if (!apiKey) {
      res.status(500).json({ error: 'Server missing Hunter API key.' });
      return;
    }

    const url = `https://api.hunter.io/v2/domain-search?domain=${encodeURIComponent(domain)}&api_key=${apiKey}`;

    const response = await fetch(url);
    const data = await response.json();

    if (!response.ok) {
      res.status(response.status).json({ error: data && data.errors ? JSON.stringify(data.errors) : 'Hunter API error.' });
      return;
    }

    res.status(200).json(data);
  } catch (err) {
    console.error('Hunter search error:', err);
    res.status(500).json({ error: 'Unexpected server error.' });
  }
}
