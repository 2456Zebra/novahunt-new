export async function POST(req) {
  const { domain } = await req.json();

  if (!domain) return new Response('Missing domain', { status: 400 });

  try {
    const res = await fetch(`https://api.hunter.io/v2/domain-search?domain=${domain}&api_key=${process.env.HUNTER_API_KEY}`);
    const data = await res.json();
    return new Response(JSON.stringify({ emails: data.data.emails }), { status: 200 });
  } catch (err) {
    console.error(err);
    return new Response('Failed', { status: 500 });
  }
}
