import Head from 'next/head';
import { useState, useMemo, useEffect } from 'react';

/*
  Updated homepage search UI — Search results refinements requested:
  - "Showing X of Y" uses Hunter total (payload.total)
  - Departments list and headings use same visual style (Executives header used for all)
  - Trust % moved to the right side of the card (separated from email)
  - Save/Reveal button reduced in size
  - Save button placed on the left inside card; "source" link placed on the right
  - "Upgrade your plan to see all" placed inline next to "Showing X of Y"
  - Initial preview shows 5 results (not signed in)
  - Department headings aligned and use consistent font/size/style
  - Wider, centered results area and mobile-friendly layout
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
  const [revealed, setRevealed] = useState({}); // email => boolean
  const [savedSet, setSavedSet] = useState(new Set()); // saved emails (local placeholder)
  const [expandedDeps, setExpandedDeps] = useState({}); // dept => bool

  useEffect(() => {
    try {
      const raw = localStorage.getItem('nova_saved_contacts');
      if (raw) {
        const arr = JSON.parse(raw);
        if (Array.isArray(arr)) setSavedSet(new Set(arr));
      }
    } catch (err) { /* ignore */ }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem('nova_saved_contacts', JSON.stringify(Array.from(savedSet)));
    } catch (err) { /* ignore */ }
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
        // API returns { query, total, emails }
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

  // Build groups from payload, preserving Executives first
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
    // sort items within departments
    Object.keys(deptMap).forEach((k) => {
      deptMap[k].sort((a, b) => {
        if ((a.position || '') < (b.position || '')) return -1;
        if ((a.position || '') > (b.position || '')) return 1;
        const na = `${a.first_name || ''} ${a.last_name || ''}`.trim();
        const nb = `${b.first_name || ''} ${b.last_name || ''}`.trim();
        return na.localeCompare(nb);
      });
    });
    // sort department names alphabetically
    const sorted = {};
    const names = Object.keys(deptMap).sort((a, b) => a.localeCompare(b));
    for (const n of names) sorted[n] = deptMap[n];
    return { total: payload.total || emails.length, executives, departments: sorted };
  }, [payload]);

  // initial preview limit: 5 for not-signed-in users
  const initialLimit = 5;
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

  // Email card component — smaller save button, trust moved right, source on far-right
  function EmailCard({ e }) {
    const email = e.value;
    const isRevealed = !!revealed[email];
    const isSaved = savedSet.has(email);
    return (
      <li className="email-card">
        <div className="email-left">
          <div className="email-address-row">
            <div className="email-address">{isRevealed ? email : maskEmail(email)}</div>
          </div>

          <div className="meta-and-actions">
            <div className="meta">
              <div className="name-position">
                <span className="name">{[e.first_name, e.last_name].filter(Boolean).join(' ')}</span>
                {e.position ? <span className="position"> — {e.position}</span> : null}
              </div>
              {/* do not display 'Other' as a department badge under person's title */}
              {e.department && e.department !== 'Other' ? <div className="department">{e.department}</div> : null}
            </div>

            <div className="left-action">
              {!isRevealed ? (
                <button className="btn-save small ghost" onClick={() => toggleReveal(email)} type="button">Reveal</button>
              ) : !isSaved ? (
                <button className="btn-save small primary" onClick={() => handleSave(email)} type="button">Save</button>
              ) : (
                <button className="btn-save small saved" type="button" disabled>Saved</button>
              )}
            </div>
          </div>
        </div>

        <div className="email-right">
          {e.confidence != null && <div className="trust-badge">{e.confidence}%</div>}
          <a className="source-link" href={linkedinSearchUrl(e, payload?.query)} target="_blank" rel="noopener noreferrer">source</a>
        </div>
      </li>
    );
  }

  const displayedCount = Object.values(initialGrouped).flat().length;
  const totalCount = groups.total || 0;

  // Build department summary (show all departments + their counts, Executives first)
  const departmentSummary = useMemo(() => {
    if (!payload?.emails) return [];
    const entries = [];
    if (groups.executives && groups.executives.length > 0) {
      entries.push(['Executives', groups.executives.length]);
    }
    for (const [dept, items] of Object.entries(groups.departments || {})) {
      entries.push([dept, items.length]);
    }
    return entries;
  }, [groups, payload]);

  return (
    <>
      <Head>
        <title>NovaHunt.ai</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="description" content="Find business emails instantly" />
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

          <div className="hint">Try a domain (e.g. coca-cola.com) to do a quick search.</div>

          <div className="actions-row">
            <button type="submit" className="cta primary" disabled={loading}>
              {loading ? 'Searching…' : 'Take us for a test drive'}
            </button>

            <a className="cta primary" href="/checkout" role="button">Choose Your Plan</a>
          </div>
        </form>

        {/* Summary with upgrade link placed inline left of summary text */}
        {payload && (
          <div className="summary">
            <div className="summary-left">
              Showing <strong>{displayedCount}</strong> of <strong>{totalCount}</strong>
              <span className="upgrade-inline"> — <a href="/checkout" className="upgrade">Upgrade your plan to see all</a></span>
            </div>

            {/* department summary (Executives + departments) displayed to the right but in same line on wide screens */}
            <div className="dept-summary">
              {departmentSummary.map(([name, count]) => (
                <div className="dept-pill" key={name}>
                  <span className="dept-name">{name}</span> <span className="dept-num">({count})</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {error && <div className="msg msg-error" role="alert">{error}</div>}

        <div className="results-wrap">
          {/* initial grouped preview with department headings above each group */}
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
        * { box-sizing: border-box; }
        html, body, #__next { height: 100%; }
        body { margin: 0; font-family: 'Inter', system-ui, -apple-system, sans-serif; background: #f9fafb; color: #111827; -webkit-font-smoothing:antialiased; -moz-osx-font-smoothing:grayscale; }

        .page-root { display:flex; flex-direction:column; align-items:center; justify-content:flex-start; min-height:100vh; padding:56px 20px; text-align:center; }

        .brand { font-size:72px; font-weight:800; margin:0 0 8px; line-height:1; }
        .lead { font-weight:500; font-size:28px; color:#4b5563; max-width:920px; margin:0 0 18px; }

        .domain-form { width:100%; max-width:1080px; display:flex; flex-direction:column; align-items:center; }
        input[type="text"] {
          width:100%;
          max-width:920px;
          padding:28px 26px;
          font-size:24px;
          border:2px solid #d1d5db;
          border-radius:28px;
          margin-bottom:10px;
          outline:none;
          box-shadow: 0 14px 40px rgba(2,6,23,0.06);
        }

        .hint { margin:8px 0 16px; color:#6b7280; font-size:15px; text-align:center; max-width:860px; }

        .actions-row { display:flex; gap:16px; align-items:center; justify-content:center; flex-wrap:wrap; margin-top:8px; }
        .cta { display:inline-flex; align-items:center; justify-content:center; gap:8px; border-radius:16px; padding:16px 36px; font-weight:800; font-size:18px; text-decoration:none; cursor:pointer; border:none; background: linear-gradient(180deg,#007bff,#0066ff); color:#fff; box-shadow: 0 32px 80px rgba(0,102,255,0.22), 0 10px 30px rgba(0,102,255,0.12); }

        .summary { width:100%; max-width:920px; margin-top:20px; display:flex; justify-content:space-between; align-items:center; gap:16px; }
        .summary-left { color:#374151; font-size:15px; display:flex; align-items:center; gap:8px; }
        .upgrade-inline .upgrade { color:#ffd166; font-weight:700; text-decoration:underline; margin-left:6px; }

        /* Department summary (pill list) */
        .dept-summary { display:flex; gap:8px; flex-wrap:wrap; justify-content:flex-end; }
        .dept-pill { background:transparent; padding:6px 8px; border-radius:8px; font-weight:700; color:#0f172a; display:flex; gap:6px; align-items:center; }
        .dept-name { font-weight:800; font-size:15px; }
        .dept-num { color:#6b7280; font-weight:700; font-size:13px; }

        .results-wrap { width:100%; max-width:920px; margin-top:22px; display:flex; flex-direction:column; align-items:center; }

        /* Department heading uses same style as Executives heading */
        .dept-heading { font-weight:800; font-size:18px; color:#0f172a; margin-bottom:8px; display:flex; align-items:center; gap:10px; }
        .dept-count { color:#6b7280; font-weight:600; font-size:13px; }

        .email-list { list-style:none; padding:0; margin:12px 0 0; display:grid; gap:18px; width:100%; }
        .email-card {
          background:white;
          border-radius:16px;
          padding:18px 20px;
          box-shadow:0 18px 44px rgba(15,23,42,0.06);
          display:flex;
          gap:16px;
          align-items:flex-start;
          justify-content:space-between;
        }

        .email-left { flex:1 1 auto; min-width:0; display:flex; flex-direction:column; gap:8px; }
        .email-address-row { display:flex; justify-content:flex-start; align-items:center; gap:12px; }
        .email-address { font-weight:800; color:#0f172a; font-size:16px; word-break:break-word; }

        .meta-and-actions { display:flex; align-items:center; justify-content:space-between; gap:12px; }
        .meta { color:#6b7280; font-size:13px; display:flex; flex-direction:column; gap:6px; text-align:left; }
        .name { color:#111827; font-weight:700; }
        .position { color:#374151; font-weight:600; }
        .department { color:#6b7280; font-size:13px; }

        /* Left small save button */
        .left-action { display:flex; align-items:center; gap:8px; }
        .btn-save.small {
          padding:6px 10px;
          font-size:13px;
          border-radius:8px;
          font-weight:700;
          cursor:pointer;
          border: 1px solid rgba(0,0,0,0.06);
          background: #fff;
        }
        .btn-save.small.primary { background:#0066ff; color:#fff; border-color:#0066ff; box-shadow: 0 8px 20px rgba(0,102,255,0.10); }
        .btn-save.small.saved { background:#10b981; color:#fff; border-color:#10b981; }

        /* Right area: trust + source */
        .email-right { display:flex; flex-direction:column; align-items:flex-end; gap:8px; flex:0 0 auto; min-width:96px; }
        .trust-badge {
          background: rgba(0,102,255,0.08);
          color:#0049b3;
          font-weight:800;
          padding:6px 8px;
          border-radius:999px;
          font-size:13px;
        }
        .source-link { color:#0066ff; text-decoration:underline; font-weight:700; }

        /* Group headers */
        .group-header { margin-bottom:8px; }
        .group-toggle { background:linear-gradient(180deg,#ffffff,#fbfbfb); border:1px solid #e6e8eb; padding:8px 12px; border-radius:10px; cursor:pointer; font-weight:800; color:#0f172a; font-size:15px; }

        /* Responsive adjustments */
        @media (max-width:920px) {
          .domain-form { max-width:96%; }
          input[type="text"] { max-width:92%; padding:22px 18px; font-size:20px; }
          .summary { flex-direction:column; align-items:center; gap:10px; }
          .dept-summary { justify-content:center; }
        }
        @media (max-width:768px) {
          .brand { font-size:48px; }
          .lead { font-size:22px; }
          .cta { padding:12px 20px; font-size:16px; }
          .email-card { padding:12px; flex-direction:column; align-items:flex-start; }
          .email-right { align-self:stretch; flex-direction:row; justify-content:space-between; width:100%; margin-top:8px; }
        }
      `}</style>
    </>
  );
}
