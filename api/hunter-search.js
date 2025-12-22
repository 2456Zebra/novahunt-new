export default async function handler(req, res) {
  try {
    // Default limit = 100 (your paid Starter plan allows up to 100 per request)
    const { domain, offset = 0, limit = 100 } = req.query;

    if (!domain) {
      return res.status(400).json({ error: "Missing domain parameter" });
    }

    // Your Hunter.io API key (hard-coded for now – works immediately)
    const apiKey = "b2eb114113547c1eeb296f358fb10653acc0727a";

    const url = `https://api.hunter.io/v2/domain-search?domain=${encodeURIComponent(domain)}&offset=${offset}&limit=${limit}&api_key=${apiKey}`;

    const response = await fetch(url);
    const data = await response.json();

    return res.status(200).json(data);
  } catch (err) {
    return res.status(500).json({ error: "Server error", details: err.message });
  }
}
