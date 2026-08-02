import { useEffect, useState } from 'react';

/* ============================================================================
   MC / M.Com RENEWAL — APPROVAL QUEUE (internal / officer view)

   Shows every renewal payment submitted through MCRenewalPortal.jsx that is
   still "pending_approval". Approving a row flips it to "active" (with an
   approvedAt timestamp) which the citizen's Portal picks up automatically
   via its polling — approving here is what unlocks their "Renewal Active"
   screen and receipt download.

   DESIGN
   Restyled to match the MC Management admin screen (MCManagement.jsx) —
   light background, navy/blue accents, breadcrumb + header pattern, and a
   plain bordered table — instead of the citizen-facing maroon/gold theme.

   BACKEND INTEGRATION
   Reads/writes the same "cma_pending_renewals" localStorage key used by the
   Portal for now. Replace `approvalApi` methods with real endpoints
   (e.g. GET /api/renewals/pending, POST /api/renewals/:refNo/approve,
   POST /api/renewals/:refNo/reject) — the rest of the component is unchanged.
============================================================================ */

const theme = {
  navy: '#1a3a6b',
  blue: '#2563eb',
  bg: '#f5f6f8',
  card: '#ffffff',
  text: '#1f2937',
  text2: '#5b6472',
  text3: '#8a9099',
  border: '#e2e8f0',
  green: '#16a34a',
  greenBg: '#f0fdf4',
  red: '#dc2626',
  redBg: '#fef2f2',
  amberBg: '#fef3c7',
  amber: '#8a6d00',
};
const fontMono = "'Roboto Mono', 'Courier New', monospace";
const money = (n) => 'Rs. ' + Number(n || 0).toLocaleString('en-LK', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

import { fetchRenewals, approveRenewal, rejectRenewal } from '../api.js';

const approvalApi = {
  async fetchAll() {
    return await fetchRenewals();
  },
  async approve(refNo) {
    return await approveRenewal(refNo);
  },
  async reject(refNo, reason) {
    return await rejectRenewal(refNo, reason);
  },
};

const outlineBtn = {
  display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 16px', borderRadius: 6,
  fontSize: 12.5, fontWeight: 600, cursor: 'pointer', border: `1px solid ${theme.border}`,
  background: '#fff', color: theme.text2,
};

const solidBtn = (color) => ({
  display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 16px', borderRadius: 6,
  fontSize: 12.5, fontWeight: 600, cursor: 'pointer', border: `1px solid ${color}`,
  background: color, color: '#fff',
});

const STATUS_STYLES = {
  pending_approval: { bg: theme.amberBg, color: theme.amber, label: 'Pending Approval' },
  active: { bg: theme.greenBg, color: theme.green, label: 'Active' },
  rejected: { bg: theme.redBg, color: theme.red, label: 'Rejected' },
};

function StatusPill({ status }) {
  const s = STATUS_STYLES[status] || STATUS_STYLES.pending_approval;
  return (
    <span style={{ background: s.bg, color: s.color, padding: '3px 12px', borderRadius: 999, fontSize: 11.5, fontWeight: 700 }}>
      {s.label}
    </span>
  );
}

export default function MCRenewalApproval({ currentUser }) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('pending_approval'); // pending_approval | active | rejected
  const [selected, setSelected] = useState(null);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [busyRef, setBusyRef] = useState(null);
  const [toast, setToast] = useState(null);

  async function load() {
    setLoading(true);
    const data = await approvalApi.fetchAll();
    setRows(data);
    setLoading(false);
  }

  useEffect(() => {
    load();
    const t = setInterval(load, 4000); // pick up new submissions from the Portal
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2600);
    return () => clearTimeout(t);
  }, [toast]);

  const filtered = rows.filter(r => r.status === tab);

  async function handleApprove(refNo) {
    setBusyRef(refNo);
    try {
      await approvalApi.approve(refNo);
      setToast({ type: 'success', msg: 'Renewal approved — now active.' });
      setSelected(null);
      load();
    } catch (e) {
      setToast({ type: 'error', msg: e.message || 'Approval failed' });
    } finally {
      setBusyRef(null);
    }
  }

  async function handleReject() {
    if (!selected) return;
    setBusyRef(selected.refNo);
    try {
      await approvalApi.reject(selected.refNo, rejectReason);
      setToast({ type: 'success', msg: 'Renewal rejected.' });
      setRejectOpen(false);
      setSelected(null);
      setRejectReason('');
      load();
    } catch (e) {
      setToast({ type: 'error', msg: e.message || 'Rejection failed' });
    } finally {
      setBusyRef(null);
    }
  }

  const counts = {
    pending_approval: rows.filter(r => r.status === 'pending_approval').length,
    active: rows.filter(r => r.status === 'active').length,
    rejected: rows.filter(r => r.status === 'rejected').length,
  };

  return (
    <div style={{ padding: 20, fontFamily: "var(--font-sans)", background: theme.bg, minHeight: '100vh' }}>
      {/* Breadcrumb */}
      <div style={{ fontSize: 12, color: '#999', marginBottom: 16 }}>
        <span>Home</span> / <span>Renewal Approval</span>
      </div>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 10 }}>
        <div>
          <h2 style={{ fontSize: 19, fontWeight: 600, margin: 0, color: theme.text }}>Renewal Approval Queue</h2>
          <p style={{ color: '#999', fontSize: 13, margin: '4px 0 0 0' }}>Review GovPay renewal payments submitted by MC / M.Com applicants and approve or reject them.</p>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 18 }}>
        {[
          { key: 'pending_approval', label: 'Pending Approval' },
          { key: 'active', label: 'Active' },
          { key: 'rejected', label: 'Rejected' },
        ].map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            style={{
              padding: '9px 18px', borderRadius: 6, fontSize: 13, fontWeight: 600, cursor: 'pointer',
              border: `1px solid ${tab === t.key ? theme.navy : theme.border}`,
              background: tab === t.key ? theme.navy : '#fff',
              color: tab === t.key ? '#fff' : theme.text2,
            }}
          >
            {t.label} <span style={{ opacity: .75 }}>({counts[t.key] || 0})</span>
          </button>
        ))}
      </div>

      {/* Table */}
      <div style={{ background: theme.card, border: `1px solid ${theme.border}`, borderRadius: 10, overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, minWidth: 900 }}>
          <thead>
            <tr style={{ background: '#fafbfc' }}>
              {['Reference No', 'MC / M.Com', 'Applicant', 'Years', 'Amount', 'Submitted', 'Status', ''].map(h => (
                <th key={h} style={{ textAlign: 'left', padding: '12px 16px', fontSize: 11.5, color: theme.text2, textTransform: 'uppercase', letterSpacing: '.4px', borderBottom: `1px solid ${theme.border}` }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr><td colSpan={8} style={{ padding: 24, textAlign: 'center', color: theme.text3 }}>Loading…</td></tr>
            )}
            {!loading && filtered.length === 0 && (
              <tr><td colSpan={8} style={{ padding: 24, textAlign: 'center', color: theme.text3 }}>No records in this tab.</td></tr>
            )}
            {!loading && filtered.map(r => (
              <tr key={r.ref_no} style={{ borderBottom: `1px solid ${theme.border}` }}>
                <td style={{ padding: '12px 16px', fontFamily: fontMono, color: theme.navy, fontWeight: 700 }}>{r.ref_no}</td>
                <td style={{ padding: '12px 16px' }}>
                  <div style={{ fontWeight: 600 }}>{r.mc_name}</div>
                  <div style={{ fontSize: 11.5, color: theme.text3, fontFamily: fontMono }}>{r.plan_no}</div>
                </td>
                <td style={{ padding: '12px 16px' }}>
                  <div>{r.applicant_name}</div>
                  <div style={{ fontSize: 11.5, color: theme.text3 }}>{r.applicant_phone}</div>
                </td>
                <td style={{ padding: '12px 16px', fontFamily: fontMono }}>{r.years?.join(', ')}</td>
                <td style={{ padding: '12px 16px', fontFamily: fontMono, fontWeight: 700 }}>{money(r.amount)}</td>
                <td style={{ padding: '12px 16px', fontSize: 12, color: theme.text2 }}>{new Date(r.created_at).toLocaleString('en-LK')}</td>
                <td style={{ padding: '12px 16px' }}><StatusPill status={r.status} /></td>
                <td style={{ padding: '12px 16px' }}>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button onClick={() => setSelected(r)} style={outlineBtn}>View</button>
                    {r.status === 'pending_approval' && (
                      <>
                        <button
                          onClick={() => handleApprove(r.ref_no)}
                          disabled={busyRef === r.ref_no}
                          style={solidBtn(theme.green)}
                        >
                          {busyRef === r.ref_no ? '…' : 'Approve'}
                        </button>
                        <button
                          onClick={() => { setSelected(r); setRejectOpen(true); }}
                          disabled={busyRef === r.refNo}
                          style={{ ...outlineBtn, color: theme.red, borderColor: theme.red }}
                        >
                          Reject
                        </button>
                      </>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Detail modal */}
      {selected && !rejectOpen && (
        <div onClick={(e) => e.target === e.currentTarget && setSelected(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,.5)', zIndex: 400, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div style={{ background: '#fff', borderRadius: 12, width: '100%', maxWidth: 520, boxShadow: '0 24px 70px rgba(0,0,0,.3)', overflow: 'hidden' }}>
            <div style={{ background: theme.navy, padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ color: '#fff', fontWeight: 700, fontSize: 14.5 }}>Renewal Payment Details</span>
              <button onClick={() => setSelected(null)} style={{ background: 'rgba(255,255,255,.2)', border: 'none', color: '#fff', width: 26, height: 26, borderRadius: 6, cursor: 'pointer' }}>✕</button>
            </div>
            <div style={{ padding: 20, fontSize: 13 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px 20px', marginBottom: 14 }}>
                <div><b style={{ color: theme.text2 }}>Reference No</b><div style={{ fontFamily: fontMono, color: theme.navy, fontWeight: 700 }}>{selected.ref_no}</div></div>
                <div><b style={{ color: theme.text2 }}>Status</b><div><StatusPill status={selected.status} /></div></div>
                <div><b style={{ color: theme.text2 }}>MC / M.Com</b><div>{selected.mc_name}</div></div>
                <div><b style={{ color: theme.text2 }}>Plan No</b><div style={{ fontFamily: fontMono }}>{selected.plan_no}</div></div>
                <div><b style={{ color: theme.text2 }}>Applicant</b><div>{selected.applicant_name}</div></div>
                <div><b style={{ color: theme.text2 }}>Phone</b><div>{selected.applicant_phone}</div></div>
                <div><b style={{ color: theme.text2 }}>Years</b><div>{selected.years?.join(', ')}</div></div>
                <div><b style={{ color: theme.text2 }}>Amount</b><div style={{ fontFamily: fontMono, fontWeight: 700, color: theme.navy }}>{money(selected.amount)}</div></div>
                <div><b style={{ color: theme.text2 }}>Submitted</b><div>{new Date(selected.created_at).toLocaleString('en-LK')}</div></div>
                <div><b style={{ color: theme.text2 }}>Approved</b><div>{selected.approved_at ? new Date(selected.approved_at).toLocaleString('en-LK') : '-'}</div></div>
                {selected.status === 'rejected' && selected.reject_reason && (
                  <div style={{ gridColumn: '1 / -1' }}><b style={{ color: theme.red }}>Reject Reason:</b> {selected.reject_reason}</div>
                )}
              </div>
              {selected.status === 'pending_approval' && (
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 6 }}>
                  <button onClick={() => setRejectOpen(true)} style={{ ...outlineBtn, color: theme.red, borderColor: theme.red }}>Reject</button>
                  <button onClick={() => handleApprove(selected.ref_no)} disabled={busyRef === selected.ref_no} style={solidBtn(theme.green)}>
                    {busyRef === selected.ref_no ? 'Approving…' : 'Approve'}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Reject reason modal */}
      {rejectOpen && selected && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,.5)', zIndex: 410, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div style={{ background: '#fff', borderRadius: 12, width: '100%', maxWidth: 420, padding: 20, boxShadow: '0 24px 70px rgba(0,0,0,.3)' }}>
            <div style={{ fontWeight: 700, fontSize: 14.5, color: theme.text, marginBottom: 10 }}>Reject Renewal Payment</div>
            <textarea
              id="mca_reject_reason"
              name="rejectReason"
              rows={3}
              placeholder="Reason for rejection (optional)"
              value={rejectReason}
              onChange={e => setRejectReason(e.target.value)}
              style={{ width: '100%', border: `1px solid ${theme.border}`, borderRadius: 8, padding: '10px 12px', fontSize: 13, boxSizing: 'border-box', resize: 'vertical' }}
            />
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 14 }}>
              <button onClick={() => { setRejectOpen(false); setRejectReason(''); }} style={outlineBtn}>Cancel</button>
              <button onClick={handleReject} disabled={busyRef === selected.refNo} style={solidBtn(theme.red)}>
                {busyRef === selected.refNo ? 'Rejecting…' : 'Confirm Reject'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div style={{
          position: 'fixed', bottom: 22, right: 22, zIndex: 999, background: '#fff',
          border: `1px solid ${theme.border}`, borderLeft: `4px solid ${toast.type === 'error' ? theme.red : theme.green}`,
          borderRadius: 10, padding: '12px 16px', boxShadow: '0 8px 30px rgba(0,0,0,.12)', fontSize: 13, fontWeight: 600,
        }}>
          {toast.msg}
        </div>
      )}
    </div>
  );
}