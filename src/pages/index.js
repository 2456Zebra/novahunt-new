import Head from 'next/head';
import { useState, useMemo, useEffect } from 'react';

/**
 * Updated homepage search UI with:
 * - initial preview shows 5 results (not-signed-in)
 * - "Showing X of Y — Upgrade your plan to see all" pulls Y from Hunter total
 * - initial preview grouped by department with department headings
 * - "source" single-word link that opens a Google LinkedIn search for the person
 * - confidence/trust % shown as a badge
 * - email masked by default, "Reveal" reveals it and then button becomes "Save" to persist (localStorage)
 * - removed display of "Other" as department under person's meta
 * - improved department typography and wider layout while remaining mobile friendly
 *
 * Save behavior:
 * - saves to localStorage under 'nova_saved_contacts' (placeholder for account integration)
 * - Saved contacts will be reflected in the button state ("Saved")
 */

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
  const [payload, setPayload] = useState(null); // { query, total, emails }
  const [error, setError] = useState(null);
  const [revealed, setRevealed] = useState({}); // email => boolean (revealed)
  const [savedSet, setSavedSet] = useState(new Set()); // saved emails (from localStorage)
  const [expandedDeps, setExpandedDeps] = useState({}); // dept => bool

  // load saved contacts from localStorage (placeholder account storage)
  useEffect(() => {
    try {
      const raw = localStorage.getItem('nova_saved_contacts');
      if (raw) {
        const arr = JSON.parse(raw);
        if (Array.isArray(arr)) setSavedSet(new Set(arr));
      }
    } catch (err) {
      // ignore
    }
  }, []);

  // persist savedSet when changed
  useEffect(() => {
    try {
      localStorage.setItem('nova_saved_contacts', JSON.stringify(Array.from(savedSet)));
    } catch (err) {
      // ignore
    }
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
      if (!res.ok) {
        setError(json.error || 'Search failed');
      } else {
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

  // Grouping logic
  const groups = useMemo(() => {
    if (!payload?.emails) return { total: payload?.total || 0, executives: [], departments: {} };
    const emails = payload.emails.map((e, i) => ({ ...e, __idx: i }));
    const executives = [];
    const deptMap = {};
    for (const e of emails) {
      if (isExecutive(e.position)) {
        executives.push(e);
      } else {
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

  // initial preview limit: 5 for not-signed-in (per request)
  const initialDisplayLimit = 5;
  const shownTotal = payload ? Math.min(initialDisplayLimit, (groups.total || 0)) : 0;

  // Build grouped initial preview: executives first then fill from departments
  const initialGrouped = useMemo(() => {
    if (!payload?.emails) return {};
    let remaining = initialDisplayLimit;
    const grouped = {};
    // executives
    for (const e of groups.executives || []) {
      if (remaining <= 0) break;
      const g = 'Executives';
      grouped[g] = grouped[g] || [];
      grouped[g].push(e);
      remaining--;
    }
    // departments in alphabetical order
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
    return grouped; // {deptName: [items]}
  }, [groups, payload]);

  function toggleReveal(email) {
    // if not revealed -> reveal; if revealed and not saved -> keep revealed and allow Save
    setRevealed((prev) => ({ ...prev, [email]: true }));
  }

  function handleSave(email, item) {
    // save to placeholder storage (localStorage) and update savedSet
    setSavedSet((s) => {
      const next = new Set(s);
      next.add(email);
      return next;
    });
    // Optionally send to server in future
  }

  function toggleDept(dep) {
    setExpandedDeps((s) => ({ ...s, [dep]: !s[dep] }));
  }

  // helper to render a single email card
  function EmailCard({ e, compact = false }) {
    const email = e.value;
    const isRevealed = !!revealed[email];
    const isSaved = savedSet.has(email);
    return (
      <li className="email-card">
        <div className="email-row">
          <div className="email-address">
            {isRevealed ? email : maskEmail(email)}
            {e.confidence != null && <span className="trust"> {e.confidence}%</span>}
          </div>
          <div className="email-actions">
            {!isRevealed ? (
              <button className="reveal-btn" onClick={() => toggleReveal(email)} type="button">Reveal</button>
            ) : !isSaved ? (
              <button className="save-btn" onClick={() => handleSave(email, e)} type="button">Save</button>
            ) : (
              <button className="saved-btn" type="button" disabled>Saved</button>
            )}
            <a className="source-link" href={linkedinSearchUrl(e, payload?.query)} target="_blank" rel="noopener noreferrer">source</a>
          </div>
        </div>

        <div className="meta">
          <div className="name-position">
            <span className="name">{[e.first_name, e.last_name].filter(Boolean).join(' ')}</span>
            {e.position ? <span className="position"> — {e.position}</span> : null}
          </div>
          {/* show department only if not 'Other' */}
          {e.department ? (e.department !== 'Other' && <div className="department">{e.department}</div>) : null}
        </div>
      </li>
    );
  }

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

          {/* hint just below the input */}
          <div className="hint muted">Try a domain (e.g. coca-cola.com) to do a quick search.</div>

          {/* move buttons down for better spacing */}
          <div className="actions-row">
            <button type="submit" className="test-drive" disabled={loading}>
              {loading ? 'Searching…' : 'Take us for a test drive'}
            </button>

            <a className="primary-cta" href="/checkout">Choose Your Plan</a>
          </div>
        </form>

        {/* Summary */}
        {payload && (
          <div className="summary">
            <div className="summary-left">Showing <strong>{Object.values(initialGrouped).flat().length}</strong> of <strong>{groups.total || 0}</strong></div>
            <div className="summary-right"><a className="upgrade" href="/checkout">Upgrade your plan to see all</a></div>
          </div>
        )}

        {error && <div className="msg msg-error" role="alert">{error}</div>}

        {/* initial grouped preview with department headings */}
        {payload && Object.keys(initialGrouped).length > 0 && (
          <section className="results initial" aria-live="polite">
            <h2>Quick preview</h2>

            {/* render each dept header above its items */}
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

        {/* Expanded groups below */}
        {payload && (Object.keys(groups.departments || {}).length > 0 || (groups.executives && groups.executives.length > 0)) && (
          <section className="groups">
            {groups.executives && groups.executives.length > 0 && (
              <div className="group">
                <div className="group-header">
                  <button className="group-toggle" onClick={() => toggleDept('Executives')} type="button">
                    Executives ({groups.executives.length})
                  </button>
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
                  <button className="group-toggle" onClick={() => toggleDept(dept)} type="button">
                    {dept} ({items.length})
                  </button>
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
      </main>

      <style jsx>{`
        * { box-sizing: border-box; }
        html, body, #__next { height: 100%; }
        body { margin: 0; font-family: 'Inter', system-ui, -apple-system, sans-serif; background: #f9fafb; color: #111827; -webkit-font-smoothing: antialiased; -moz-osx-font-smoothing: grayscale; }

        .page-root {
          display:flex;
          flex-direction:column;
          align-items:center;
          justify-content:flex-start;
          min-height:100vh;
          padding:48px 20px;
          text-align:center;
          max-width: 100%;
        }

        /* widen container but keep mobile friendly */
        .lead { font-size:28px; color:#4b5563; max-width:920px; margin: 0 0 18px; }

        .domain-form { width:100%; max-width:920px; display:flex; flex-direction:column; align-items:center; }
        input[type="text"] { width:100%; max-width:760px; padding:18px; font-size:20px; border:2px solid #d1d5db; border-radius:16px; margin-bottom:8px; outline:none; }
        input[type="text"]:focus { box-shadow:0 0 0 6px rgba(0,102,255,0.06); border-color:#0066ff; }

        .hint { margin:8px 0 14px; color:#6b7280; font-size:14px; max-width:760px; text-align:left; }

        .actions-row { display:flex; gap:16px; align-items:center; justify-content:center; flex-wrap:wrap; margin-top:12px; }
        .test-drive { background:#fff; color:#0066ff; border:2px solid #0066ff; font-size:18px; padding:12px 22px; border-radius:12px; cursor:pointer; font-weight:700; }
        .test-drive[disabled] { opacity:0.7; cursor:default; }

        .primary-cta { display:inline-block; background:#0066ff; color:white; font-weight:700; padding:14px 26px; border-radius:14px; text-decoration:none; font-size:18px; }

        .summary { display:flex; justify-content:space-between; gap:20px; align-items:center; margin-top:18px; width:100%; max-width:920px; }
        .summary-left { color:#374151; font-size:15px; }
        .summary-right { text-align:right; }
        .upgrade { color:#d97706; font-weight:700; text-decoration:underline; }

        .msg { max-width:920px; margin-top:16px; padding:12px 16px; border-radius:10px; }
        .msg-error { background:#fff1f2; color:#9b1c1c; border:1px solid #ffd6d9; }

        .results { width:100%; max-width:920px; margin-top:18px; text-align:left; }
        .results h2 { font-size:18px; margin:8px 0 12px; }

        /* initial grouped preview styling */
        .initial-group { margin-bottom:14px; }
        .dept-heading { font-weight:800; font-size:16px; color:#0f172a; margin-bottom:8px; display:flex; align-items:center; gap:8px; }
        .dept-count { color:#6b7280; font-weight:600; font-size:13px; }

        .groups { width:100%; max-width:920px; margin-top:20px; text-align:left; }

        .group { margin-bottom:12px; }
        .group-header { display:flex; align-items:center; gap:12px; margin-bottom:8px; }
        .group-toggle {
          background:linear-gradient(180deg,#ffffff,#fbfbfb);
          border:1px solid #e6e8eb;
          padding:8px 12px;
          border-radius:10px;
          cursor:pointer;
          font-weight:800;
          color:#0f172a;
          font-size:15px;
        }

        .email-list { list-style:none; padding:0; margin:12px 0 0; display:grid; gap:12px; }
        .email-list.small { margin-top:8px; }
        .email-card { background:white; border-radius:12px; padding:12px 14px; box-shadow:0 8px 20px rgba(15,23,42,0.04); }
        .email-row { display:flex; justify-content:space-between; align-items:center; gap:12px; }
        .email-address { font-weight:700; color:#0f172a; font-size:16px; word-break:break-all; display:flex; align-items:center; gap:8px; }
        .trust { background: rgba(0,102,255,0.08); color:#0049b3; font-weight:700; padding:4px 8px; border-radius:999px; font-size:12px; margin-left:8px; }

        .email-actions { display:flex; gap:8px; align-items:center; }
        .reveal-btn, .save-btn, .saved-btn { background:transparent; border:1px solid #e5e7eb; padding:6px 10px; border-radius:8px; cursor:pointer; font-weight:700; }
        .save-btn { background:#0066ff; color:white; border-color:#0066ff; }
        .saved-btn { background:#10b981; color:white; border-color:#10b981; opacity:0.9; }

        .source-link { color:#0066ff; text-decoration:underline; font-size:13px; }

        .meta { margin-top:8px; color:#6b7280; font-size:13px; display:flex; flex-direction:column; gap:4px; }
        .name { color:#111827; font-weight:700; }
        .position { color:#374151; font-weight:500; }
        .department { color:#6b7280; font-size:13px; }

        @media (max-width: 920px) {
          .domain-form { max-width: 92%; }
          .lead { max-width: 92%; font-size:22px; }
          .summary { flex-direction:column; align-items:center; gap:8px; }
        }

        @media (max-width:768px) {
          .page-root { padding:32px 16px; }
          h1 { font-size:48px; }
          .lead { font-size:20px; margin-bottom:12px; }
          input[type="text"] { font-size:18px; padding:14px; }
          .test-drive, .primary-cta { font-size:16px; padding:10px 18px; }
        }

        @media (max-width:420px) {
          .actions-row { flex-direction:column; gap:12px; }
          .primary-cta { width:100%; text-align:center; }
          .email-row { flex-direction:column; align-items:flex-start; gap:8px; }
          .email-actions { align-self:flex-end; }
        }
      `}</style>
    </>
  );
}
