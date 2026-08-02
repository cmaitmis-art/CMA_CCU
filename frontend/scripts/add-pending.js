const fs = require('fs');
let content = fs.readFileSync('frontend/src/pages/Complaints.jsx', 'utf8');

// 1. Add states
content = content.replace(
  "const [lastImportedSerialNos, setLastImportedSerialNos] = useState([]);",
  `const [lastImportedSerialNos, setLastImportedSerialNos] = useState([]);
  const [showPendingPanel, setShowPendingPanel] = useState(() => {
    return sessionStorage.getItem('cma_complaints_showPendingPanel') === 'true';
  });
  const [overdueList, setOverdueList] = useState([]);`
);

// 1.5 Add session storage effect
content = content.replace(
  "// Auto-refresh every 30 seconds",
  `useEffect(() => {
    sessionStorage.setItem('cma_complaints_showPendingPanel', String(showPendingPanel));
  }, [showPendingPanel]);

  // Auto-refresh every 30 seconds`
);

// 2. Add loadOverdue useEffect
content = content.replace(
  "function showToast(msg, type = 'success') {",
  `useEffect(() => {
    async function loadOverdue() {
      try {
        const API_BASE = (import.meta.env.VITE_API_URL || '/api').trim();
        const r = await fetch(\`\${API_BASE}/complaints?pending_overdue_15=true&limit=999999\`);
        const data = await r.json();
        setOverdueList(data?.rows ?? data ?? []);
      } catch (err) {
        console.error('Failed to load overdue list', err);
      }
    }
    loadOverdue();
  }, [complaints]);

  function showToast(msg, type = 'success') {`
);

// 3. Add stats useMemo
content = content.replace(
  "return (",
  `const stats = useMemo(() => {
    const pending = overdueList.length;
    const categories = new Set(complaints.map((r) => r.category).filter(Boolean));
    const byStatus = {};
    complaints.forEach((r) => {
      byStatus[r.status] = (byStatus[r.status] || 0) + 1;
    });
    return { pending, totalCategories: categories.size, byStatus };
  }, [complaints, overdueList]);

  return (`
);

// 4. Update load() pagination
content = content.replace(
  "const params = new URLSearchParams({",
  `const params = new URLSearchParams({
        limit: pendingOverdueFilter ? 999999 : pageSize,
        page: pendingOverdueFilter ? 1 : page,
      });
      // `
);
content = content.replace(
  "limit: pageSize,\n        page: page,",
  ""
);

// 5. Add Pending Reminder Bell UI
// Find the header section. In Complaints, it is:
// <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 10 }}>
//   <div>
//     <h1 style={{ margin: 0, fontSize: 24, fontWeight: 700, color: theme.navy }}>Complaints Management</h1>
//     ...
//   </div>
//   <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
const bellCode = `
          {/* Pending Reminder Bell */}
          <div style={{ position: 'relative' }}>
            <button
              onClick={() => setShowPendingPanel((v) => !v)}
              style={{
                ...btnOutline,
                padding: '8px 16px',
                borderColor: theme.red,
                color: theme.red,
                fontWeight: 600,
                position: 'relative'
              }}
              title="Pending reminders - complaints pending for more than 15 days"
            >
              <i className="fas fa-bell" /> Pending
              {stats.pending > 0 && (
                <span style={{ position: 'absolute', top: -6, right: -6, background: theme.red, color: '#fff', fontSize: 11, fontWeight: 'bold', padding: '2px 6px', borderRadius: '10px', boxShadow: '0 2px 4px rgba(0,0,0,0.2)' }}>
                  {stats.pending}
                </span>
              )}
            </button>
            {showPendingPanel && (
              <div style={{ position: 'absolute', top: '100%', right: 0, marginTop: 8, width: 320, background: '#fff', border: \`1px solid \${theme.border}\`, borderRadius: 8, boxShadow: '0 10px 25px rgba(0,0,0,0.1)', zIndex: 50, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                <div style={{ padding: '12px 14px', background: theme.red, color: '#fff', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 13, fontWeight: 600 }}>Pending Reminders (&gt;15 days)</span>
                  <button onClick={() => setShowPendingPanel(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#fff', fontSize: 14, lineHeight: 1, padding: 4 }} title="Close">✕</button>
                </div>
                <div style={{ maxHeight: 300, overflowY: 'auto' }}>
                  {stats.pending === 0 ? (
                    <div style={{ padding: 14, fontSize: 12, color: theme.text3 }}>No pending items.</div>
                  ) : overdueList.map((cf) => (
                    <div key={cf.id} style={{ padding: '10px 14px', borderBottom: \`1px solid \${theme.border}\`, fontSize: 13, display: 'flex', flexDirection: 'column', gap: 4, cursor: 'pointer' }}
                      onClick={() => {
                        setShowPendingPanel(false);
                        setSelectedRecord(cf);
                        setShowViewModal(true);
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <strong style={{ color: theme.navy }}>{cf.serial_no}</strong>
                        <span style={{ fontSize: 11, color: theme.red, fontWeight: 600 }}>{calculateDaysElapsed(cf.received_ccu)} days</span>
                      </div>
                      <div style={{ color: theme.text, fontSize: 12 }}>{cf.apartment_name} - {cf.issue_heading}</div>
                    </div>
                  ))}
                </div>
                <div style={{ padding: 10, background: '#f8fafc', borderTop: \`1px solid \${theme.border}\` }}>
                  <button
                    onClick={() => {
                      setPendingOverdueFilter(!pendingOverdueFilter);
                      setShowPendingPanel(false);
                    }}
                    style={{ width: '100%', justifyContent: 'center', ...(pendingOverdueFilter ? { background: '#ef4444', color: '#fff', border: 'none', padding: '8px 14px', borderRadius: 8, fontSize: 13, fontWeight: 500, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6 } : { ...btnPrimary, width: '100%', justifyContent: 'center' }) }}
                  >
                    <i className={pendingOverdueFilter ? "fas fa-times" : "fas fa-filter"} />
                    {pendingOverdueFilter ? 'Clear Table Filter' : 'Filter & View All in Table'}
                  </button>
                </div>
              </div>
            )}
          </div>
`;

content = content.replace(
  "<div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>",
  "<div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>" + bellCode
);

// 6. Stats Grid Updates
content = content.replace(
  "{ label: 'TOTAL', value: totalCount, icon: 'fa-database', color: theme.navy },",
  `{ label: 'TOTAL', value: totalCount, icon: 'fa-database', color: theme.navy },
              { label: 'PENDING', value: stats.pending, icon: 'fa-exclamation', color: theme.red },`
);

// 7. Showing Pending Header
const showingPendingCode = `
          {pendingOverdueFilter ? (
            <span>Showing <strong>{overdueList.length}</strong> pending records (&gt;15 days) <button onClick={() => setPendingOverdueFilter(false)} style={{ background: '#fee2e2', color: '#ef4444', border: '1px solid #fca5a5', padding: '2px 8px', borderRadius: 12, fontSize: 11, fontWeight: 700, cursor: 'pointer', marginLeft: 6 }}>✕ Clear</button></span>
          ) : (
            <span>{totalCount} total record{totalCount !== 1 ? 's' : ''} found</span>
          )}
`;
content = content.replace(
  "<span>{totalCount} total record{totalCount !== 1 ? 's' : ''} found</span>",
  showingPendingCode
);

// 8. Row highlighting
content = content.replace(
  "<tbody>\n              {loading ? (",
  `<tbody>
              {loading ? (`
);

content = content.replace(
  "complaints.map((cf) => (",
  `(pendingOverdueFilter ? overdueList : complaints).map((cf) => {
                  const isPending = cf.status === 'Pending' && calculateDaysElapsed(cf.received_ccu) > 15;
                  return (`
);

// Replace </tr> wrapper in map with highlighted </tr>
// Wait, we need to locate the exact <tr tag
content = content.replace(
  "return (\n                  <tr key={cf.id}",
  "return (\n                  <tr key={cf.id}"
); // Just making sure the regex will find the correct spot

content = content.replace(
  "<tr key={cf.id}\n                    style={{ borderBottom: `1px solid ${theme.border}`, cursor: 'pointer' }}\n                    onMouseEnter={(e) => (e.currentTarget.style.background = '#f8fafc')}\n                    onMouseLeave={(e) => (e.currentTarget.style.background = '')}\n                    onClick={() => { setSelectedRecord(cf); setShowViewModal(true); }}\n                  >",
  `<tr key={cf.id}
                    style={{ borderBottom: \`1px solid \${theme.border}\`, cursor: 'pointer', background: isPending ? '#fffbeb' : 'transparent' }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = isPending ? '#fef3c7' : '#f8fafc')}
                    onMouseLeave={(e) => (e.currentTarget.style.background = isPending ? '#fffbeb' : '')}
                    onClick={() => { setSelectedRecord(cf); setShowViewModal(true); }}
                  >`
);

// Color Serial No and change map end
content = content.replace(
  "<td style={{ ...cellStyle, fontWeight: 600, color: theme.navy }} title={cf.serial_no}>{cf.serial_no}</td>",
  "<td style={{ ...cellStyle, color: isPending ? theme.orange : theme.navy, fontWeight: 600 }} title={cf.serial_no}>{cf.serial_no}</td>"
);

content = content.replace(
  `{/* Actions (View only here) */}`,
  `{/* Actions (View only here) */}` // noop just to make sure it matches
);

content = content.replace(
  "                  </tr>\n                )\n              )}",
  "                  </tr>\n                );\n              })}"
);

fs.writeFileSync('frontend/src/pages/Complaints.jsx', content);
console.log('Done modifying Complaints.jsx');
