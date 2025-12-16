import Head from 'next/head';
import { useState, useMemo } from 'react';

/**
 * Homepage with Hunt.io search + grouped results view.
 * Features:
 * - Masked emails with reveal button
 * - "Showing X of Y - Upgrade your plan to see all" with link to /checkout
 * - Source links open Google LinkedIn search results for the person
 * - Group results by department; "Executives" prioritized at top
 * - Departments show counts and can be expanded
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
  // common department keywords
  const depts = ['engineering', 'product', 'marketing', 'sales', 'finance', 'legal', 'operations', 'hr', 'people', 'support', 'customer', 'design', 'research'];
  for (const d of depts) {
    if (pos.includes(d)) return d[0].toUpperCase() + d.slice(1);
  }
  // fallback
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
  const [payload, setPayload] = useState(null); // { query, total, emails: [...] }
  const [error, setError] = useState(null);
  const [revealed, setRevealed] = useState({}); // map email->bool
  const [expandedDeps, setExpandedDeps] = useState({}); // dept->bool

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
        setExpandedDeps({}); // reset expansions
        setRevealed({}); // reset reveal state
      }
    } catch (err) {
      console.error('Search error', err);
      setError('Network error — please try again.');
    } finally {
      setLoading(false);
    }
  }

  // compute grouping and displayed counts
  const groups = useMemo(() => {
    if (!payload?.emails) return { total: payload?.total || 0, executives: [], departments: {} };
    const emails = payload.emails.map((e, i) => ({ ...e, __idx: i }));
    const executives = [];
    const deptMap = {}; // {deptName: [items]}

    for (const e of emails) {
      if (isExecutive(e.position)) {
        executives.push(e);
      } else {
        const dept = detectDepartment(e);
        if (!deptMap[dept]) deptMap[dept] = [];
        deptMap[dept].push(e);
      }
    }

    // sort items inside departments by position/title then name
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
    const sortedDeptMap = {};
    const deptNames = Object.keys(deptMap).sort((a, b) => a.localeCompare(b));
    for (const name of deptNames) sortedDeptMap[name] = deptMap[name];

    return { total: payload.total || (emails.length), executives, departments: sortedDeptMap };
  }, [payload]);

  // how many results we show initially globally
  const initialDisplayLimit = 10;
  const shownTotal = Math.min(initialDisplayLimit, groups.total || 0);

  // build display list for initial view: executives first up to limit
  const initialDisplayItems = useMemo(() => {
    const list = [];
    let remaining = initialDisplayLimit;
    // take execs first
    for (const e of groups.executives || []) {
      if (remaining <= 0) break;
      list.push({ ...e, __group: 'Executives' });
      remaining--;
    }
    // fill from departments in alphabetical order
    if (remaining > 0) {
      for (const [dept, items] of Object.entries(groups.departments || {})) {
        for (const e of items) {
          if (remaining <= 0) break;
          list.push({ ...e, __group: dept });
          remaining--;
        }
        if (remaining <= 0) break;
      }
    }
    return list;
  }, [groups]);

  function toggleReveal(email) {
    setRevealed((prev) => ({ ...prev, [email]: !prev[email] }));
  }

  function toggleDept(dep) {
    setExpandedDeps((s) => ({ ...s, [dep]: !s[dep] }));
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
        <p>Find business emails instantly. Enter a company domain and get professional contacts.</p>

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

          <div className="actions-row">
            <button type="submit" className="test-drive" disabled={loading}>
              {loading ? 'Searching…' : 'Take us for a test drive'}
            </button>

            <a className="primary-cta" href="/checkout">Choose Your Plan</a>
          </div>
        </form>

        {payload && (
          <div className="summary">
            <div className="summary-left">
              Showing <strong>{shownTotal}</strong> of <strong>{groups.total || 0}</strong>
            </div>
            <div className="summary-right">
              <a className="upgrade" href="/checkout">Upgrade your plan to see all</a>
            </div>
          </div>
        )}

        {error && <div className="msg msg-error" role="alert">{error}</div>}

        {/* If we have no payload yet, nothing to show */}
        {!payload && !loading && <div className="hint muted">Try a domain (e.g. coca-cola.com) to do a quick search.</div>}

        {/* Initial inline list of shown items (executives-first, up to 10) */}
        {payload && initialDisplayItems.length > 0 && (
          <section className="results initial" aria-live="polite">
            <h2>Quick preview</h2>
            <ul className="email-list">
              {initialDisplayItems.map((e) => (
                <li key={e.__idx} className="email-card">
                  <div className="email-row">
                    <div className="email-address">
                      {revealed[e.value] ? e.value : maskEmail(e.value)}
                    </div>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button className="reveal-btn" onClick={() => toggleReveal(e.value)} type="button">
                        {revealed[e.value] ? 'Hide' : 'Reveal'}
                      </button>

                      <a className="source-link" href={linkedinSearchUrl(e, payload.query)} target="_blank" rel="noopener noreferrer">
                        View LinkedIn
                      </a>
                    </div>
                  </div>
                  <div className="meta">
                    <div className="name-position">
                      <span className="name">{[e.first_name, e.last_name].filter(Boolean).join(' ')}</span>
                      {e.position ? <span className="position"> — {e.position}</span> : null}
                    </div>
                    <div className="department">{e.department ? e.department : detectDepartment(e)}</div>
                  </div>
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* Department groups (collapsed by default; executives also shown as group if more exist beyond shown preview) */}
        {payload && (Object.keys(groups.departments || {}).length > 0 || (groups.executives && groups.executives.length > 0)) && (
          <section className="groups">
            {/* Executives group (if any) */}
            {groups.executives && groups.executives.length > 0 && (
              <div className="group">
                <div className="group-header">
                  <button className="group-toggle" onClick={() => toggleDept('Executives')} type="button">
                    Executives ({groups.executives.length})
                  </button>
                </div>
                {expandedDeps['Executives'] && (
                  <ul className="email-list small">
                    {groups.executives.map((e) => (
                      <li key={`exec-${e.__idx}`} className="email-card">
                        <div className="email-row">
                          <div className="email-address">{revealed[e.value] ? e.value : maskEmail(e.value)}</div>
                          <div style={{ display: 'flex', gap: 8 }}>
                            <button className="reveal-btn" onClick={() => toggleReveal(e.value)} type="button">
                              {revealed[e.value] ? 'Hide' : 'Reveal'}
                            </button>
                            <a className="source-link" href={linkedinSearchUrl(e, payload.query)} target="_blank" rel="noopener noreferrer">
                              View LinkedIn
                            </a>
                          </div>
                        </div>
                        <div className="meta">
                          <div className="name-position">
                            <span className="name">{[e.first_name, e.last_name].filter(Boolean).join(' ')}</span>
                            {e.position ? <span className="position"> — {e.position}</span> : null}
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}

            {/* Departments */}
            {Object.entries(groups.departments).map(([dept, items]) => (
              <div className="group" key={dept}>
                <div className="group-header">
                  <button className="group-toggle" onClick={() => toggleDept(dept)} type="button">
                    {dept} ({items.length})
                  </button>
                </div>

                {expandedDeps[dept] && (
                  <ul className="email-list small">
                    {items.map((e) => (
                      <li key={`${dept}-${e.__idx}`} className="email-card">
                        <div className="email-row">
                          <div className="email-address">{revealed[e.value] ? e.value : maskEmail(e.value)}</div>
                          <div style={{ display: 'flex', gap: 8 }}>
                            <button className="reveal-btn" onClick={() => toggleReveal(e.value)} type="button">
                              {revealed[e.value] ? 'Hide' : 'Reveal'}
                            </button>
                            <a className="source-link" href={linkedinSearchUrl(e, payload.query)} target="_blank" rel="noopener noreferrer">
                              View LinkedIn
                            </a>
                          </div>
                        </div>
                        <div className="meta">
                          <div className="name-position">
                            <span className="name">{[e.first_name, e.last_name].filter(Boolean).join(' ')}</span>
                            {e.position ? <span className="position"> — {e.position}</span> : null}
                          </div>
                        </div>
                      </li>
                    ))}
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
        .page-root { display:flex; flex-direction:column; align-items:center; justify-content:flex-start; min-height:100vh; padding:48px 20px; text-align:center; }
        h1 { font-size:72px; font-weight:800; margin:8px 0 12px; line-height:1; }
        p { font-size:28px; color:#4b5563; max-width:820px; margin:0 0 24px; }

        .domain-form { width:100%; max-width:820px; display:flex; flex-direction:column; align-items:center; }
        input[type="text"] { width:100%; max-width:680px; padding:20px; font-size:22px; border:2px solid #d1d5db; border-radius:16px; margin-bottom:18px; outline:none; }
        input[type="text"]:focus { box-shadow:0 0 0 6px rgba(0,102,255,0.06); border-color:#0066ff; }

        .actions-row { display:flex; gap:16px; align-items:center; justify-content:center; flex-wrap:wrap; }
        .test-drive { background:#fff; color:#0066ff; border:2px solid #0066ff; font-size:20px; padding:14px 28px; border-radius:12px; cursor:pointer; font-weight:700; }
        .test-drive[disabled] { opacity:0.7; cursor:default; }
        .primary-cta { display:inline-block; background:#0066ff; color:white; font-weight:700; padding:16px 30px; border-radius:14px; text-decoration:none; font-size:20px; }

        .summary { display:flex; justify-content:center; gap:20px; align-items:center; margin-top:18px; width:100%; max-width:820px; }
        .summary-left { color:#374151; }
        .upgrade { color:#d97706; font-weight:700; text-decoration:underline; }

        .msg { max-width:820px; margin-top:16px; padding:12px 16px; border-radius:10px; }
        .msg-error { background:#fff1f2; color:#9b1c1c; border:1px solid #ffd6d9; }

        .results h2 { font-size:18px; margin:18px 0 8px; text-align:left; width:100%; max-width:820px; }

        .groups { width:100%; max-width:820px; margin-top:20px; text-align:left; }

        .group { margin-bottom:12px; }
        .group-header { display:flex; align-items:center; gap:12px; }
        .group-toggle { background:#fff; border:1px solid #e5e7eb; padding:10px 12px; border-radius:10px; cursor:pointer; font-weight:700; }

        .email-list { list-style:none; padding:0; margin:12px 0 0; display:grid; gap:12px; }
        .email-list.small { margin-top:8px; }
        .email-card { background:white; border-radius:12px; padding:12px 14px; box-shadow:0 6px 16px rgba(15,23,42,0.04); }
        .email-row { display:flex; justify-content:space-between; align-items:center; gap:12px; }
        .email-address { font-weight:700; color:#0f172a; font-size:16px; word-break:break-all; }
        .reveal-btn { background:transparent; border:1px solid #e5e7eb; padding:6px 10px; border-radius:8px; cursor:pointer; }
        .source-link { color:#0066ff; text-decoration:underline; font-size:13px; }

        .meta { margin-top:8px; color:#6b7280; font-size:13px; display:flex; flex-direction:column; gap:4px; }
        .name { color:#111827; font-weight:600; }
        .position { color:#374151; font-weight:500; }
        .department { color:#6b7280; font-size:13px; }

        @media (max-width:768px) {
          .page-root { padding:32px 16px; }
          h1 { font-size:48px; }
          p { font-size:20px; margin-bottom:18px; }
          input[type="text"] { font-size:18px; padding:16px; }
          .test-drive, .primary-cta { font-size:18px; padding:12px 20px; }
          .primary-cta { padding:12px 18px; }
          .summary { flex-direction:column; gap:8px; align-items:center; }
        }

        @media (max-width:420px) {
          .actions-row { flex-direction:column; gap:12px; }
          .primary-cta { width:100%; text-align:center; }
        }
      `}</style>
    </>
  );
}
