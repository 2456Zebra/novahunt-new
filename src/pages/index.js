import Head from 'next/head';
import { useState, useMemo, useEffect } from 'react';

/* Homepage — consistent Inter font, identical CTA styles, mobile friendly */

/* Helpers (mask, exec detection, dept detection, linkedin search) */
function maskEmail(email) {
  if (!email) return '';
  const [local, domain] = email.split('@');
  if (!local || !domain) return '***';
  if (local.length <= 2) return local[0] + '***@' + domain;
  return local[0] + '***' + local.slice(-1) + '@' + domain;
}
function isExecutive(position = '') {
  if (!position) return false;
  const p = position.toLowerCase();
  return (
    p.includes('ceo') ||
    p.includes('chief') ||
    p.includes('cfo') ||
    p.includes('cto') ||
    p.includes('coo') ||
    p.includes('founder') ||
    p.includes('president') ||
    p.includes('vp ') ||
    p.includes('vice president') ||
    p.includes('principal')
  );
}
function detectDepartment(emailItem = {}) {
  if (emailItem.department && emailItem.department.trim()) return emailItem.department.trim();
  const pos = (emailItem.position || '').toLowerCase();
  const depts = ['engineering', 'product', 'marketing', 'sales', 'finance', 'legal', 'operations', 'hr', 'people', 'support', 'customer', 'design', 'research'];
  for (const d of depts) {
    if (pos.includes(d)) return d[0].toUpperCase() + d.slice(1);
  }
  return 'Other';
}
function linkedinSearchUrl(person, domain) {
  let query = domain || '';
  if (person?.first_name || person?.last_name) {
    query = `${person.first_name || ''} ${person.last_name || ''} ${domain}`.trim();
  } else if (person?.value) {
    query = `${person.value} ${domain}`.trim();
  }
  return 'https://www.google.com/search?q=' + encodeURIComponent(`site:linkedin.com ${query}`);
}

export default function IndexPage() {
  const [domain, setDomain] = useState('');
  const [loading, setLoading] = useState(false);
  const [payload, setPayload] = useState(null);
  const [error, setError] = useState(null);
  const [revealed, setRevealed] = useState({});
  const [savedSet, setSavedSet] = useState(new Set());
  const [expandedDeps, setExpandedDeps] = useState({});

  useEffect(() => {
    try {
      const raw = localStorage.getItem('nova_saved_contacts');
      if (raw) {
        const arr = JSON.parse(raw);
        if (Array.isArray(arr)) setSavedSet(new Set(arr));
      }
    } catch (err) {}
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem('nova_saved_contacts', JSON.stringify(Array.from(savedSet)));
    } catch (err) {}
  }, [savedSet]);

  async function runTestDrive(e) {
    e && e.preventDefault();
    setError(null);
    const d = (domain || '').trim();
    if (!d) {
      setError('Please enter a domain to search (e.g. coca-cola.com).');
      return;
    }
    setLoading(true);
    setPayload(null);
    try {
      const res = await fetch(`/api/search?domain=${encodeURIComponent(d)}`);
      const json = await res.json();
      if (!res.ok) setError(json.error || 'Search failed');
      else {
        setPayload(json);
        setExpandedDeps({});
        setRevealed({});
      }
    } catch (err) {
      console.error('Search error', err);
      setError('Network error — please try again.');
    } finally {
      setLoading(false);
    }
  }

  const groups = useMemo(() => {
    if (!payload?.emails) return { total: payload?.total || 0, executives: [], departments: {} };
    const emails = payload.emails.map((e, i) => ({ ...e, __idx: i }));
    const executives = [];
    const deptMap = {};
    for (const e of emails) {
      if (isExecutive(e.position)) executives.push(e);
      else {
        const dept = detectDepartment(e);
        if (!deptMap[dept]) deptMap[dept] = [];
        deptMap[dept].push(e);
      }
    }
    Object.keys(deptMap).forEach((k) => {
      deptMap[k].sort((a, b) => {
        if ((a.position || '') < (b.position || '')) return -1;
        if ((a.position || '') > (b.position || '')) return 1;
        const na = `${a.first_name || ''} ${a.last_name || ''}`.trim();
        const nb = `${b.first_name || ''} ${b.last_name || ''}`.trim();
        return na.localeCompare(nb);
      });
    });
    const sortedDeptMap = {};
    const deptNames = Object.keys(deptMap).sort((a, b) => a.localeCompare(b));
    for (const name of deptNames) sortedDeptMap[name] = deptMap[name];
    return { total: payload.total || emails.length, executives, departments: sortedDeptMap };
  }, [payload]);

  const initialLimit = 5; // show 5 initially for not-signed-in
  const initialGrouped = useMemo(() => {
    if (!payload?.emails) return {};
    let remaining = initialLimit;
    const grouped = {};
    for (const e of groups.executives || []) {
      if (remaining <= 0) break;
      grouped['Executives'] = grouped['Executives'] || [];
      grouped['Executives'].push(e);
      remaining--;
    }
    for (const [dept, items] of Object.entries(groups.departments || {})) {
      if (remaining <= 0) break;
      for (const e of items) {
        if (remaining <= 0) break;
        grouped[dept] = grouped[dept] || [];
        grouped[dept].push(e);
        remaining--;
      }
      if (remaining <= 0) break;
    }
    return grouped;
  }, [groups, payload]);

  function toggleReveal(email) {
    setRevealed((p) => ({ ...p, [email]: true }));
  }
  function handleSave(email) {
    setSavedSet((s) => {
      const next = new Set(s);
      next.add(email);
      return next;
    });
  }
  function toggleDept(dep) {
    setExpandedDeps((s) => ({ ...s, [dep]: !s[dep] }));
  }

  function EmailCard({ e }) {
    const email = e.value;
    const isRevealed = !!revealed[email];
    const isSaved = savedSet.has(email);
    return (
      <li className="email-card">
        <div className="email-left">
          <div className="email-row-top">
            <div className="email-address">
              {isRevealed ? email : maskEmail(email)}
              {e.confidence != null && <span className="trust">{e.confidence}%</span>}
            </div>
            <div className="meta">
              <div className="name-position">
                <span className="name">{[e.first_name, e.last_name].filter(Boolean).join(' ')}</span>
                {e.position ? <span className="position"> — {e.position}</span> : null}
              </div>
              {e.department && e.department !== 'Other' ? <div className="department">{e.department}</div> : null}
            </div>
          </div>

          <div className="email-actions">
            {!isRevealed ? (
              <button className="cta primary ghost" onClick={() => toggleReveal(email)} type="button">Reveal</button>
            ) : !isSaved ? (
              <button className="cta primary" onClick={() => handleSave(email)} type="button">Save</button>
            ) : (
              <button className="cta saved" type="button" disabled>Saved</button>
            )}

            <a className="source" href={linkedinSearchUrl(e, payload?.query)} target="_blank" rel="noopener noreferrer">source</a>
          </div>
        </div>
      </li>
    );
  }

  const displayedCount = Object.values(initialGrouped).flat().length;
  const totalCount = groups.total || 0;

  return (
    <>
      <Head>
        <title>NovaHunt.ai</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800&display=swap" rel="stylesheet" />
      </Head>

      <main className="page-root">
        <h1 className="brand">NovaHunt.ai</h1>
        <p className="lead">Find business emails instantly. Enter a company domain and get professional contacts.</p>

        <form className="domain-form" onSubmit={runTestDrive}>
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

          <div className="hint muted">Try a domain (e.g. coca-cola.com) to do a quick search.</div>

          <div className="actions-row">
            {/* both controls use the same CTA styling and font so they look identical */}
            <button type="submit" className="cta primary" disabled={loading}>
              {loading ? 'Searching…' : 'Take us for a test drive'}
            </button>

            <a className="cta primary" href="/checkout" role="button">Choose Your Plan</a>
          </div>
        </form>

        {payload && (
          <div className="summary centered">
            <div className="summary-left">Showing <strong>{displayedCount}</strong> of <strong>{totalCount}</strong></div>
            <div className="summary-right"><a className="upgrade" href="/checkout">Upgrade your plan to see all</a></div>
          </div>
        )}

        {error && <div className="msg msg-error" role="alert">{error}</div>}

        <div className="results-wrap">
          {payload && Object.keys(initialGrouped).length > 0 && (
            <section className="results initial" aria-live="polite">
              {Object.entries(initialGrouped).map(([dept, items]) => (
                <div key={dept} className="initial-group">
                  <div className="dept-heading">{dept} <span className="dept-count">({items.length})</span></div>
                  <ul className="email-list">
                    {items.map((e) => <EmailCard key={`${dept}-${e.__idx}`} e={e} />)}
                  </ul>
                </div>
              ))}
            </section>
          )}

          {payload && (Object.keys(groups.departments || {}).length > 0 || (groups.executives && groups.executives.length > 0)) && (
            <section className="groups">
              {groups.executives && groups.executives.length > 0 && (
                <div className="group">
                  <div className="group-header">
                    <button className="group-toggle" onClick={() => toggleDept('Executives')} type="button">Executives ({groups.executives.length})</button>
                  </div>
                  {expandedDeps['Executives'] && (
                    <ul className="email-list small">
                      {groups.executives.map((e) => <EmailCard key={`exec-${e.__idx}`} e={e} />)}
                    </ul>
                  )}
                </div>
              )}

              {Object.entries(groups.departments).map(([dept, items]) => (
                <div className="group" key={dept}>
                  <div className="group-header">
                    <button className="group-toggle" onClick={() => toggleDept(dept)} type="button">{dept} ({items.length})</button>
                  </div>

                  {expandedDeps[dept] && (
                    <ul className="email-list small">
                      {items.map((e) => <EmailCard key={`${dept}-${e.__idx}`} e={e} />)}
                    </ul>
                  )}
                </div>
              ))}
            </section>
          )}
        </div>
      </main>

      <style jsx>{`
        /* global / layout */
        * { box-sizing: border-box; }
        html, body, #__next { height: 100%; }
        body { margin: 0; font-family: 'Inter', system-ui, -apple-system, sans-serif; background: #f9fafb; color: #111827; -webkit-font-smoothing:antialiased; -moz-osx-font-smoothing:grayscale; }

        .page-root { display:flex; flex-direction:column; align-items:center; justify-content:flex-start; min-height:100vh; padding:56px 20px; text-align:center; }

        /* BRAND: restored large size and Inter font */
        .brand { font-size:72px; font-weight:800; margin:0 0 8px; line-height:1; font-family: 'Inter', system-ui, -apple-system, sans-serif; }
        .lead { font-size:28px; color:#4b5563; max-width:920px; margin:0 0 18px; }

        /* FORM/UI */
        .domain-form { width:100%; max-width:980px; display:flex; flex-direction:column; align-items:center; }
        input[type="text"] { width:100%; max-width:820px; padding:18px; font-size:20px; border:2px solid #d1d5db; border-radius:18px; margin-bottom:8px; outline:none; font-family: 'Inter', system-ui, -apple-system, sans-serif; }
        input[type="text"]:focus { box-shadow:0 18px 36px rgba(0,102,255,0.09); border-color:#0066ff; }

        .hint { margin:8px 0 14px; color:#6b7280; font-size:14px; max-width:820px; text-align:left; }

        .actions-row { display:flex; gap:16px; align-items:center; justify-content:center; flex-wrap:wrap; margin-top:12px; }

        /* single CTA style applied to both button and anchor */
        .cta {
          display:inline-flex;
          align-items:center;
          justify-content:center;
          gap:8px;
          border-radius:14px;
          padding:14px 32px;
          font-weight:800;
          font-size:18px;
          text-decoration:none;
          cursor:pointer;
          border:none;
          font-family: 'Inter', system-ui, -apple-system, sans-serif;
          line-height:1;
        }
        .cta.primary {
          background: linear-gradient(180deg, #007bff, #0066ff);
          color: #fff;
          box-shadow: 0 22px 48px rgba(0,102,255,0.24), 0 8px 22px rgba(0,102,255,0.12);
        }
        .cta.primary:hover { transform: translateY(-2px); box-shadow: 0 30px 72px rgba(0,102,255,0.28), 0 10px 26px rgba(0,102,255,0.14); }
        .cta.ghost { background: #fff; color:#0066ff; border: 1px solid rgba(0,102,255,0.08); }
        .cta.saved { background:#10b981; color:#fff; }

        /* Summary & results */
        .summary.centered { display:flex; flex-direction:row; justify-content:space-between; gap:20px; align-items:center; margin-top:20px; width:100%; max-width:920px; }
        .summary-left { color:#374151; font-size:15px; }
        .upgrade { color:#ffd166; font-weight:800; text-decoration:underline; }

        .results-wrap { width:100%; max-width:920px; margin-top:20px; display:flex; flex-direction:column; align-items:center; }

        .dept-heading { font-weight:800; font-size:18px; color:#0f172a; margin-bottom:8px; display:flex; align-items:center; gap:10px; }
        .dept-count { color:#6b7280; font-weight:600; font-size:13px; }

        .groups { width:100%; margin-top:18px; }

        .group-toggle { background:linear-gradient(180deg,#ffffff,#fbfbfb); border:1px solid #e6e8eb; padding:8px 12px; border-radius:10px; cursor:pointer; font-weight:800; color:#0f172a; font-size:15px; }

        .email-list { list-style:none; padding:0; margin:12px 0 0; display:grid; gap:16px; width:100%; }
        .email-card { background:white; border-radius:14px; padding:14px 18px; box-shadow:0 14px 34px rgba(15,23,42,0.06); display:flex; align-items:flex-start; justify-content:space-between; gap:12px; }
        .email-row-top { display:flex; gap:12px; width:100%; flex-direction:column; align-items:flex-start; }

        .email-address { font-weight:800; color:#0f172a; font-size:16px; word-break:break-word; display:flex; align-items:center; gap:8px; }
        .trust { background: rgba(0,102,255,0.08); color:#0049b3; font-weight:800; padding:4px 8px; border-radius:999px; font-size:12px; margin-left:8px; }

        .email-actions { display:flex; gap:10px; align-items:center; margin-top:12px; }
        .source { color:#0066ff; text-decoration:underline; font-weight:700; }

        .meta { margin-top:10px; color:#6b7280; font-size:13px; display:flex; flex-direction:column; gap:6px; }
        .name { color:#111827; font-weight:700; }
        .position { color:#374151; font-weight:600; }
        .department { color:#6b7280; font-size:13px; }

        /* mobile adjustments */
        @media (max-width:920px) {
          .domain-form { max-width:96%; }
          .lead { max-width:96%; font-size:22px; }
          .summary.centered { flex-direction:column; align-items:center; gap:8px; }
        }
        @media (max-width:768px) {
          .page-root { padding:34px 16px; }
          .brand { font-size:48px; }
          .lead { font-size:20px; margin-bottom:12px; }
          input[type="text"] { font-size:18px; padding:14px; }
          .cta { padding:12px 20px; font-size:16px; }
          .email-card { padding:12px; }
          .email-actions { width:100%; justify-content:space-between; }
        }
        @media (max-width:420px) {
          .actions-row { flex-direction:column; gap:12px; }
          .email-card { flex-direction:column; align-items:flex-start; }
        }
      `}</style>
    </>
  );
}
