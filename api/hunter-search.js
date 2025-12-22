export default async function handler(req, res) {
  try {
    const { domain, offset = 0, limit = 10 } = req.query;

    if (!domain) {
      return res.status(400).json({ error: "Missing domain parameter" });
    }

    const apiKey = process.env."b2eb114113547c1eeb296f358fb10653acc0727a";
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
