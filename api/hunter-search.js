export default async function handler(req, res) {
  try {
    const { domain, offset = 0, limit = 100 } = req.query; // Changed default to 100
    if (!domain) {
      return res.status(400).json({ error: "Missing domain parameter" });
    }
    const apiKey = process.env.HUNTER_API_KEY; // Fixed: use process.env.HUNTER_API_KEY (see note below)
    if (!apiKey) {
      return res.status(500).json({ error: "Missing Hunter.io API key" });
    }
    const url = `https://api.hunter.io/v2/domain-search?domain=${encodeURIComponent(
      domain
    )}&offset=${offset}&limit=${limit}&api_key=${apiKey}`;
    const response = await fetch(url);
    const data = await response.json();
    return res.status(200).json(data);
  } catch (err) {
    return res.status(500).json({ error: "Server error", details: err.message });
  }
}
