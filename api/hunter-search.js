// api/hunter-search.js
import fetch from 'node-fetch';

export default async function handler(req, res) {
  const { email, domain } = req.body;

  try {
    // Call Hunter.io API
    const response = await fetch(
      `https://api.hunter.io/v2/email-verifier?email=${encodeURIComponent(email)}&api_key=${process.env.HUNTER_API_KEY}`
    );
    const data = await response.json();

    if (!data || !data.data) {
      return res.status(500).json({ error: 'No data returned from Hunter.io' });
    }

    const result = data.data;
    let customStatus = result.status;
    let confidence = result.score || 0;
    let message = 'Verified with Hunter.io';

    // Handle accept-all domains
    if (result.accept_all) {
      customStatus = 'accept-all';
      confidence = Math.min(confidence, 70); // cap confidence
      message = '⚠️ This domain accepts all emails. Actual existence cannot be confirmed.';
    }

    // Optional: enforce known format for financeofamerica.com
    if (domain === 'financeofamerica.com') {
      const pattern = /^[a-z]+\.[a-z]+@financeofamerica\.com$/i;
      if (!pattern.test(email)) {
        customStatus = 'format-mismatch';
        confidence = 50;
        message = 'Email does not match known company format (first.last@financeofamerica.com).';
      }
    }

    res.status(200).json({
      email,
      domain,
      status: customStatus,
      confidence,
      message,
      raw: result // keep raw Hunter.io data for debugging
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Verification failed' });
  }
}
