import React from 'react';

export default function IndexPage() {
  return (
    <main style={{ padding: 24, fontFamily: 'Inter, system-ui, -apple-system, sans-serif', textAlign: 'center' }}>
      <h1 style={{ fontSize: 48, marginBottom: 12 }}>NovaHunt.ai</h1>
      <p style={{ fontSize: 20, color: '#4b5563', maxWidth: 800, margin: '0 auto 40px' }}>
        Find business emails instantly. Enter a company domain and get professional contacts.
      </p>

      <input
        id="domainInput"
        type="text"
        placeholder="Enter domain, e.g. coca-cola.com"
        style={{
          width: '100%',
          maxWidth: 600,
          padding: 16,
          fontSize: 18,
          border: '2px solid #d1d5db',
          borderRadius: 12,
          marginBottom: 24
        }}
      />

      <div>
        <button
          onClick={() => {
            const d = (document.getElementById('domainInput')?.value || '').trim();
            const url = d ? `/checkout?domain=${encodeURIComponent(d)}` : '/checkout';
            window.location.href = url;
          }}
          style={{
            background: '#0066ff',
            color: 'white',
            fontSize: 20,
            fontWeight: 700,
            padding: '16px 36px',
            border: 'none',
            borderRadius: 16,
            cursor: 'pointer'
          }}
        >
          Get Started — Choose Your Plan
        </button>
      </div>

      <div style={{ marginTop: 24 }}>
        <a href="/checkout" style={{ color: '#0066ff', textDecoration: 'underline', fontSize: 18 }}>
          Or view plans
        </a>
      </div>
    </main>
  );
}
