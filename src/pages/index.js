import Head from 'next/head';
import { useState } from 'react';

export default function IndexPage() {
  const [domain, setDomain] = useState('');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState(null);
  const [error, setError] = useState(null);

  async function runTestDrive(e) {
    e && e.preventDefault();
    setError(null);
    const d = (domain || '').trim();
    if (!d) {
      setError('Please enter a domain to search (e.g. coca-cola.com).');
      return;
    }
    setLoading(true);
    setResults(null);
    try {
      const res = await fetch(`/api/search?domain=${encodeURIComponent(d)}`);
      const json = await res.json();
      if (!res.ok) {
        setError(json.error || 'Search failed');
      } else {
        setResults(json);
      }
    } catch (err) {
      console.error('Search error', err);
      setError('Network error — please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <Head>
        <title>NovaHunt.ai</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="description" content="Find business emails instantly" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800&display=swap"
          rel="stylesheet"
        />
      </Head>

      <main className="page-root">
        <h1>NovaHunt.ai</h1>
        <p>
          Find business emails instantly. Enter a company domain and get professional contacts.
        </p>

        <form className="domain-form" onSubmit={runTestDrive}>
          <label htmlFor="domainInput" className="visually-hidden">Company domain</label>
          <input
            id="domainInput"
            name="domain"
            type="text"
            inputMode="url"
            placeholder="Enter domain, e.g. coca-cola.com"
            value={domain}
            onChange={(e) => setDomain(e.target.value)}
            aria-label="Company domain"
            autoComplete="off"
          />

          <div className="actions-row">
            <button
              type="submit"
              className="test-drive"
              aria-label="Take us for a test drive"
              disabled={loading}
            >
              {loading ? 'Searching…' : 'Take us for a test drive'}
            </button>

            <a className="primary-cta" href="/checkout" aria-label="Choose your plan">
              Choose Your Plan
            </a>
          </div>
        </form>

        {error && <div className="msg msg-error" role="alert">{error}</div>}

        {results && (
          <section className="results" aria-live="polite">
            <h2>Search results for <span className="muted">{results.query || domain}</span></h2>

            {results.total && <p className="muted">Found {results.total} emails — showing up to 10</p>}

            {results.emails && results.emails.length > 0 ? (
              <ul className="email-list">
                {results.emails.map((e, idx) => (
                  <li key={idx} className="email-card">
                    <div className="email-row">
                      <div className="email-address">{e.value}</div>
                      {e.confidence != null && <div className="badge">{e.confidence}%</div>}
                    </div>
                    <div className="meta">
                      {e.first_name || e.last_name ? (
                        <div className="name">{[e.first_name, e.last_name].filter(Boolean).join(' ')}</div>
                      ) : null}
                      {e.position ? <div className="position">{e.position}</div> : null}
                      {e.sources && e.sources.length > 0 ? (
                        <div className="source">Source: {e.sources[0].domain || e.sources[0].url}</div>
                      ) : null}
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="muted">No emails found for this domain in a quick search.</p>
            )}
          </section>
        )}
      </main>

      <style jsx>{`
        .visually-hidden { position: absolute !important; height: 1px; width: 1px; overflow: hidden; clip: rect(1px, 1px, 1px, 1px); white-space: nowrap; }
        * { box-sizing: border-box; }
        html, body, #__next { height: 100%; }
        body { margin: 0; font-family: 'Inter', system-ui, -apple-system, sans-serif; background: #f9fafb; color: #111827; -webkit-font-smoothing: antialiased; -moz-osx-font-smoothing: grayscale; }

        .page-root {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: flex-start;
          min-height: 100vh;
          text-align: center;
          padding: 48px 20px;
        }

        h1 { font-size: 72px; font-weight: 800; margin: 8px 0 16px; line-height: 1; }
        p { font-size: 28px; color: #4b5563; max-width: 820px; margin: 0 0 36px; }

        .domain-form { width: 100%; max-width: 820px; display: flex; flex-direction: column; align-items: center; }
        input[type="text"] {
          width: 100%;
          max-width: 680px;
          padding: 20px;
          font-size: 22px;
          border: 2px solid #d1d5db;
          border-radius: 16px;
          margin-bottom: 18px;
          outline: none;
        }
        input[type="text"]:focus { box-shadow: 0 0 0 6px rgba(0,102,255,0.06); border-color: #0066ff; }

        .actions-row { display:flex; gap: 16px; align-items:center; flex-wrap:wrap; justify-content:center; }
        .test-drive {
          background: #fff;
          color: #0066ff;
          border: 2px solid #0066ff;
          font-size: 20px;
          padding: 14px 28px;
          border-radius: 12px;
          cursor: pointer;
          font-weight: 700;
        }
        .test-drive[disabled] { opacity: 0.7; cursor: default; }

        .primary-cta {
          display:inline-block;
          background: #0066ff;
          color: white;
          font-weight: 700;
          padding: 16px 30px;
          border-radius: 14px;
          text-decoration: none;
          font-size: 20px;
        }

        .msg { max-width: 820px; margin-top: 16px; padding: 12px 16px; border-radius: 10px; }
        .msg-error { background: #fff1f2; color: #9b1c1c; border: 1px solid #ffd6d9; }

        .results { width: 100%; max-width: 820px; margin-top: 28px; text-align: left; }
        .results h2 { font-size: 18px; margin: 0 0 6px; }
        .muted { color: #6b7280; font-size: 14px; margin-top: 6px; }

        .email-list { list-style: none; padding: 0; margin: 16px 0 0; display: grid; gap: 12px; }
        .email-card { background: white; border-radius: 12px; padding: 12px 14px; box-shadow: 0 6px 16px rgba(15,23,42,0.04); }
        .email-row { display:flex; justify-content:space-between; align-items:center; gap: 12px; }
        .email-address { font-weight: 700; color: #0f172a; font-size: 16px; word-break: break-all; }
        .badge { background: rgba(0,102,255,0.08); color: #0049b3; font-weight: 700; padding: 6px 10px; border-radius: 999px; font-size: 13px; }

        .meta { margin-top: 8px; color: #6b7280; font-size: 13px; display:flex; flex-direction:column; gap:4px; }
        .position { font-size: 13px; color: #374151; }
        .source { font-size: 12px; color: #6b7280; }

        @media (max-width: 768px) {
          .page-root { padding: 32px 16px; }
          h1 { font-size: 48px; }
          p { font-size: 20px; margin-bottom: 28px; }
          input[type="text"] { font-size: 18px; padding: 16px; }
          .test-drive, .primary-cta { font-size: 18px; padding: 12px 20px; }
          .primary-cta { padding: 12px 18px; }
        }

        @media (max-width: 420px) {
          input[type="text"] { max-width: 100%; }
          .actions-row { flex-direction: column; gap: 12px; }
          .primary-cta { width: 100%; text-align:center; }
        }
      `}</style>
    </>
  );
}
