import Head from 'next/head';

export default function IndexPage() {
  return (
    <>
      <Head>
        <title>NovaHunt.ai</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="description" content="Find business emails instantly" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800&display=swap" rel="stylesheet" />
      </Head>

      <main className="page-root">
        <h1>NovaHunt.ai</h1>
        <p>Find business emails instantly. Enter a company domain and get professional contacts.</p>

        <form action="/checkout" method="get" className="domain-form" onSubmit={e => {
          // keep default submit behavior so ?domain=... is added; this also preserves direct linking
          const input = document.getElementById('domainInput');
          if (input) input.value = input.value.trim();
        }}>
          <input id="domainInput" name="domain" type="text" placeholder="Enter domain, e.g. coca-cola.com" aria-label="Company domain" />
          <div className="cta-wrap">
            <button type="submit" aria-label="Choose your plan and get started">Get Started — Choose Your Plan</button>
          </div>
        </form>

        <a className="plans-link" href="/checkout">Or view plans</a>
      </main>

      <style jsx global>{`
        * { box-sizing: border-box; }
        html, body, #__next { height: 100%; }
        body {
          margin: 0;
          padding: 0;
          font-family: 'Inter', system-ui, -apple-system, sans-serif;
          background: #f9fafb;
          color: #111827;
          -webkit-font-smoothing: antialiased;
          -moz-osx-font-smoothing: grayscale;
        }

        .page-root {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          min-height: 100vh;
          text-align: center;
          padding: 40px 20px;
        }

        h1 {
          font-size: 72px;
          font-weight: 800;
          margin-bottom: 24px;
          line-height: 1;
        }

        p {
          font-size: 28px;
          color: #4b5563;
          max-width: 800px;
          margin-bottom: 60px;
        }

        .domain-form {
          width: 100%;
          max-width: 760px;
          display: flex;
          flex-direction: column;
          align-items: center;
        }

        input[type="text"] {
          width: 100%;
          max-width: 600px;
          padding: 24px;
          font-size: 24px;
          border: 2px solid #d1d5db;
          border-radius: 20px;
          margin-bottom: 24px;
          outline: none;
        }
        input[type="text"]:focus {
          box-shadow: 0 0 0 4px rgba(0,102,255,0.08);
          border-color: #0066ff;
        }

        .cta-wrap {
          margin-bottom: 20px;
        }

        button[type="submit"] {
          background: #0066ff;
          color: white;
          font-size: 32px;
          font-weight: 700;
          padding: 28px 80px;
          border: none;
          border-radius: 24px;
          cursor: pointer;
          box-shadow: 0 20px 40px rgba(0,102,255,0.3);
          transition: background 0.2s ease;
        }
        button[type="submit"]:hover,
        button[type="submit"]:focus {
          background: #0055dd;
        }

        .plans-link {
          color: #0066ff;
          text-decoration: underline;
          font-size: 24px;
          margin-top: 24px;
        }

        @media (max-width: 768px) {
          h1 { font-size: 48px; }
          p { font-size: 22px; margin-bottom: 40px; }
          input[type="text"] { font-size: 20px; padding: 20px; }
          button[type="submit"] { font-size: 28px; padding: 24px 60px; }
          .plans-link { font-size: 20px; }
        }

        /* Small visual improvement for very small screens */
        @media (max-width: 420px) {
          .page-root { padding: 24px 16px; }
          input[type="text"] { max-width: 100%; }
          button[type="submit"] { padding: 20px 40px; }
        }
      `}</style>
    </>
  );
}
