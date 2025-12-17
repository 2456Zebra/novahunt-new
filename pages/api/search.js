export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { first_name, last_name, domain } = req.query;

  if (!first_name || !last_name || !domain) {
    return res.status(400).json({ error: 'Missing required params' });
  }

  const url = new URL('https://api.hunter.io/v2/email-finder');
  url.searchParams.append('first_name', first_name);
  url.searchParams.append('last_name', last_name);
  url.searchParams.append('domain', domain);
  url.searchParams.append('api_key', process.env.HUNTER_API_KEY);

  try {
    const response = await fetch(url.toString());
    if (!response.ok) {
      const errorData = await response.json();
      return res.status(response.status).json({ error: errorData.message || 'Hunter API error' });
    }
    const data = await response.json();
    return res.status(200).json(data.data || {});
  } catch (error) {
    console.error('Hunter API fetch error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
