import { useEffect, useState } from 'react';
import { hasPermission } from '../utils/roleLabel.js';
import * as XLSX from 'xlsx';
import GenericExportModal from '../components/GenericExportModal.jsx';

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
import { ViewField, SectionLabel, overlayStyle, modalStyle, modalHeader, closeBtnStyle } from '../components/mc-management/MCManagementShared.jsx';
import '../components/mc-management/MCManagement.css';

const approvalApi = {
  async fetchAll() {
    return await fetchRenewals();
  },
  async approve(refNo, actionBy) {
    return await approveRenewal(refNo, actionBy);
  },
  async reject(refNo, reason, actionBy) {
    return await rejectRenewal(refNo, reason, actionBy);
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
  const canEdit = hasPermission(currentUser, 'renewal_approval', 'edit');
  const canDelete = hasPermission(currentUser, 'renewal_approval', 'delete');
  const canCreate = hasPermission(currentUser, 'renewal_approval', 'create');
  const canApprove = hasPermission(currentUser, 'renewal_approval', 'approve');
  const canViewOnly = !canEdit && !canDelete && !canCreate && !canApprove;
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('pending_approval'); // pending_approval | active | rejected
  const [searchTerm, setSearchTerm] = useState('');
  const [exportModalOpen, setExportModalOpen] = useState(false);
  const [selected, setSelected] = useState(null);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [approveOpen, setApproveOpen] = useState(false);
  const [busyRef, setBusyRef] = useState(null);
  const [toast, setToast] = useState(null);

  async function load() {
    setLoading(true);
    const data = await approvalApi.fetchAll();
    setRows(data);
    setLoading(false);

    try {
      const openRef = sessionStorage.getItem('cma_open_renewal_ref');
      if (openRef) {
        const found = data.find(r => r.ref_no === openRef);
        if (found) {
          setSelected(found);
          setTab(found.status);
        }
        sessionStorage.removeItem('cma_open_renewal_ref');
      }
    } catch (e) { }
  }

  const [page, setPage] = useState(1);
  const [viewAll, setViewAll] = useState(false);
  const [isZoomed, setIsZoomed] = useState(false);

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    function handleOpenRef(e) {
      const refNo = e.detail;
      if (refNo && rows.length > 0) {
        const found = rows.find(r => r.ref_no === refNo);
        if (found) {
          setSelected(found);
          setTab(found.status);
        }
      }
    }
    window.addEventListener('cma:open-renewal-ref', handleOpenRef);
    return () => window.removeEventListener('cma:open-renewal-ref', handleOpenRef);
  }, [rows]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2600);
    return () => clearTimeout(t);
  }, [toast]);

  const filtered = rows.filter(r => r.status === tab && (
    !searchTerm ||
    (r.ref_no && r.ref_no.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (r.mc_name && r.mc_name.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (r.applicant_name && r.applicant_name.toLowerCase().includes(searchTerm.toLowerCase()))
  ));

  const pageSize = viewAll ? 999999 : 20;
  const totalCount = filtered.length;
  const totalPages = Math.ceil(totalCount / pageSize) || 1;

  // Reset page to 1 when tab changes
  useEffect(() => {
    setPage(1);
  }, [tab]);

  const paginatedRows = filtered.slice((page - 1) * pageSize, page * pageSize);

  async function handleApprove() {
    if (!selected) return;
    setBusyRef(selected.ref_no);
    try {
      await approvalApi.approve(selected.ref_no, currentUser.name);
      setToast({ type: 'success', msg: 'Renewal approved — now active.' });
      setApproveOpen(false);
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
    setBusyRef(selected.ref_no);
    try {
      await approvalApi.reject(selected.ref_no, rejectReason, currentUser.name);
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
      <div>
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
          <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
            <button onClick={() => setExportModalOpen(true)} style={outlineBtn}>
              <i className="fas fa-file-export" /> Export
            </button>
          </div>
        </div>

        {/* Stats Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))', gap: 14, marginBottom: 16 }}>
          {[
            { label: 'TOTAL REQUESTS', value: rows.length, icon: 'fa-folder-open', color: theme.blue },
            { label: 'PENDING APPROVAL', value: counts.pending_approval, icon: 'fa-hourglass-half', color: theme.amber },
            { label: 'ACTIVE (APPROVED)', value: counts.active, icon: 'fa-check-circle', color: theme.green },
            { label: 'REJECTED', value: counts.rejected, icon: 'fa-times-circle', color: theme.red },
          ].map(({ label, value, icon, color }) => (
            <div key={label} style={{ background: theme.card, borderRadius: 12, padding: 18, border: `1px solid ${theme.border}` }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ fontSize: 24, color: color || theme.blue, opacity: 0.7 }}><i className={`fas ${icon}`} /></div>
                <div>
                  <div style={{ fontSize: 11, color: theme.text3, textTransform: 'uppercase', letterSpacing: '.8px', fontWeight: 500 }}>{label}</div>
                  <div style={{ fontSize: 22, fontWeight: 700, color: color || theme.text }}>{value}</div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Container for Zoom Support */}
        <div className={`cma-table-card-container ${isZoomed ? 'table-fullscreen-mode' : ''}`} style={{ background: theme.card, borderRadius: 12, border: `1px solid ${theme.border}`, boxShadow: '0 2px 12px rgba(0,0,0,.07)', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>

          {/* Table Header Bar (Search & Tabs) */}
          <div style={{ padding: '10px 14px', borderBottom: `1px solid ${theme.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: theme.text, whiteSpace: 'nowrap', marginRight: 4 }}>Approval Records</div>
            <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap', flex: '1 1 auto', justifyContent: 'flex-end' }}>
              {/* Search */}
              <div style={{ position: 'relative', flex: '1 1 180px', maxWidth: 260 }}>
                <i className="fas fa-search" style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#999', fontSize: 12 }}></i>
                <input
                  id="approvalSearchTerm"
                  name="approvalSearchTerm"
                  type="text"
                  placeholder="Search approvals…"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  style={{ padding: '5px 8px 5px 28px', height: 30, borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 12, width: '100%', boxSizing: 'border-box', outline: 'none', transition: 'border-color 0.2s', boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.02)' }}
                  onFocus={(e) => e.target.style.borderColor = '#3b82f6'}
                  onBlur={(e) => e.target.style.borderColor = '#cbd5e1'}
                />
              </div>

              {/* Tabs on the right */}
              <div style={{ display: 'flex', gap: 4, background: '#f1f5f9', padding: 3, borderRadius: 8 }}>
                {[
                  { key: 'pending_approval', label: `Pending (${counts.pending_approval || 0})` },
                  { key: 'active', label: `Active (${counts.active || 0})` },
                  { key: 'rejected', label: `Rejected (${counts.rejected || 0})` },
                ].map(t => (
                  <button
                    key={t.key}
                    onClick={() => setTab(t.key)}
                    style={{
                      padding: '5px 12px', borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: 'pointer', border: 'none',
                      background: tab === t.key ? '#ffffff' : 'transparent',
                      color: tab === t.key ? theme.navy : theme.text2,
                      boxShadow: tab === t.key ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                    }}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Pagination and Zoom Controls */}
          <div style={{ padding: '10px 16px', borderBottom: `1px solid ${theme.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
            <div style={{ fontSize: 13, color: theme.text2 }}>
              Showing <strong>{loading ? 0 : paginatedRows.length}</strong> of <strong>{totalCount}</strong> records
            </div>
            <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
              {!viewAll && (
                <>
                  <button disabled={page === 1} onClick={() => setPage(p => Math.max(1, p - 1))} style={{ padding: '5px 12px', fontSize: 12, borderRadius: 6, border: `1px solid ${theme.border}`, background: page === 1 ? '#f8fafc' : '#fff', color: page === 1 ? '#94a3b8' : theme.text, cursor: page === 1 ? 'not-allowed' : 'pointer' }}>Prev</button>
                  <span style={{ fontSize: 12, color: theme.text2, margin: '0 4px' }}>Page <b>{page}</b> / {totalPages}</span>
                  <button disabled={page === totalPages} onClick={() => setPage(p => Math.min(totalPages, p + 1))} style={{ padding: '5px 12px', fontSize: 12, borderRadius: 6, border: `1px solid ${theme.border}`, background: page === totalPages ? '#f8fafc' : '#fff', color: page === totalPages ? '#94a3b8' : theme.text, cursor: page === totalPages ? 'not-allowed' : 'pointer' }}>Next</button>
                </>
              )}
              <button
                onClick={() => setViewAll(v => !v)}
                style={{
                  background: viewAll ? '#10b981' : '#f1f5f9',
                  color: viewAll ? '#ffffff' : '#334155',
                  border: viewAll ? 'none' : '1px solid #cbd5e1',
                  padding: '5px 12px', fontSize: 12, borderRadius: 6, marginLeft: 8, cursor: 'pointer'
                }}
              >
                <i className={viewAll ? 'fas fa-check-circle' : 'fas fa-list'} style={{ marginRight: 5 }} />
                {viewAll ? 'Showing All Records' : 'View All Records'}
              </button>
              <button
                onClick={() => {
                  const next = !isZoomed;
                  setIsZoomed(next);
                  setViewAll(next);
                }}
                style={{
                  background: '#e0e7ff', color: '#4338ca', border: '1px solid #c7d2fe',
                  padding: '5px 12px', fontSize: 12, borderRadius: 6, marginLeft: 8, cursor: 'pointer'
                }}
              >
                {isZoomed ? (
                  <><i className="fas fa-compress" style={{ marginRight: 6 }} /> Exit Zoom</>
                ) : (
                  <><i className="fas fa-expand" style={{ marginRight: 6 }} /> Zoom Table</>
                )}
              </button>
            </div>
          </div>

          {/* Table */}
          <div style={{ background: theme.card, overflowX: 'auto', maxHeight: 'calc(100vh - 340px)', minHeight: '200px', position: 'relative', borderBottom: `1px solid ${theme.border}`, borderRadius: '0 0 8px 8px' }}>
            <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: 0, fontSize: 13, minWidth: 1000 }}>
              <thead>
                <tr style={{ background: '#fafbfc' }}>
                  {['Reference No', 'MC / M.Com', 'Applicant', 'Years', 'Amount', 'Submitted', 'Action By', 'Status', 'Action'].map((h, i) => {
                    const isStatus = h === 'Status';
                    const isAction = h === 'Action';

                    let thStyle = {
                      textAlign: 'left',
                      padding: '12px 16px',
                      fontSize: 11.5,
                      color: theme.text2,
                      textTransform: 'uppercase',
                      letterSpacing: '.4px',
                      borderBottom: `1px solid ${theme.border}`,
                      background: '#fafbfc',
                      position: (isStatus || isAction) ? 'sticky' : 'static',
                      right: isAction ? 0 : (isStatus ? 120 : 'auto'),
                      width: isAction ? 120 : (isStatus ? 140 : 'auto'),
                      minWidth: isAction ? 120 : (isStatus ? 140 : 'auto'),
                      maxWidth: isAction ? 120 : (isStatus ? 140 : 'auto'),
                      zIndex: (isStatus || isAction) ? 30 : 10,
                    };
                    if (isStatus || isAction) {
                      thStyle.borderLeft = `1px solid ${theme.border}`;
                      thStyle.backgroundClip = 'padding-box';
                    }

                    return (
                      <th key={i} style={thStyle}>
                        {h}
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                {loading && (
                  <tr><td colSpan={9} style={{ padding: 24, textAlign: 'center', color: theme.text3 }}>Loading…</td></tr>
                )}
                {!loading && paginatedRows.length === 0 && (
                  <tr><td colSpan={9} style={{ padding: 24, textAlign: 'center', color: theme.text3 }}>No records in this tab.</td></tr>
                )}
                {!loading && paginatedRows.map(r => (
                  <tr key={r.ref_no} style={{ background: '#fff' }}>
                    <td style={{ padding: '12px 16px', fontFamily: fontMono, color: theme.navy, fontWeight: 700, borderBottom: `1px solid ${theme.border}` }}>{r.ref_no}</td>
                    <td style={{ padding: '12px 16px', borderBottom: `1px solid ${theme.border}` }}>
                      <div style={{ fontWeight: 600 }}>{r.mc_name}</div>
                      <div style={{ fontSize: 11.5, color: theme.text3, fontFamily: fontMono }}>{r.plan_no}</div>
                    </td>
                    <td style={{ padding: '12px 16px', borderBottom: `1px solid ${theme.border}` }}>
                      <div>{r.applicant_name}</div>
                      <div style={{ fontSize: 11.5, color: theme.text3 }}>{r.applicant_phone}</div>
                    </td>
                    <td style={{ padding: '12px 16px', fontFamily: fontMono, borderBottom: `1px solid ${theme.border}` }}>{r.years?.join(', ')}</td>
                    <td style={{ padding: '12px 16px', fontFamily: fontMono, fontWeight: 700, borderBottom: `1px solid ${theme.border}` }}>{money(r.amount)}</td>
                    <td style={{ padding: '12px 16px', fontSize: 12, color: theme.text2, borderBottom: `1px solid ${theme.border}` }}>{new Date(r.created_at).toLocaleString('en-LK')}</td>
                    <td style={{ padding: '12px 16px', fontSize: 12, color: theme.text2, borderBottom: `1px solid ${theme.border}` }}>{r.action_by || '-'}</td>
                    <td style={{
                      padding: '12px 16px',
                      borderBottom: `1px solid ${theme.border}`,
                      position: 'sticky',
                      right: 120,
                      width: 140,
                      minWidth: 140,
                      maxWidth: 140,
                      zIndex: 10,
                      background: '#ffffff',
                      borderLeft: `1px solid ${theme.border}`,
                      backgroundClip: 'padding-box'
                    }}><StatusPill status={r.status} /></td>
                    <td className="mc-td-actions" style={{
                      padding: '12px 16px',
                      borderBottom: `1px solid ${theme.border}`,
                      position: 'sticky',
                      right: 0,
                      width: 120,
                      minWidth: 120,
                      maxWidth: 120,
                      zIndex: 10,
                      background: '#ffffff',
                      borderLeft: `1px solid ${theme.border}`,
                      backgroundClip: 'padding-box'
                    }}>
                      <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                        <button
                          onClick={() => setSelected(r)}
                          title="View Details"
                          style={{
                            background: 'transparent',
                            border: 'none',
                            color: theme.blue,
                            cursor: 'pointer',
                            width: 26,
                            height: 26,
                            borderRadius: '50%',
                            fontSize: 14,
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            padding: 0
                          }}
                        >
                          <i className="fas fa-eye" />
                        </button>
                        {canApprove && r.status === 'pending_approval' && (
                          <>
                            <button
                              onClick={() => { setSelected(r); setApproveOpen(true); }}
                              disabled={busyRef === r.ref_no}
                              title="Approve"
                              style={{
                                background: 'transparent',
                                border: 'none',
                                color: '#16a34a',
                                cursor: busyRef === r.ref_no ? 'wait' : 'pointer',
                                width: 26,
                                height: 26,
                                borderRadius: '50%',
                                fontSize: 14,
                                display: 'inline-flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                padding: 0,
                                opacity: busyRef === r.ref_no ? 0.6 : 1
                              }}
                            >
                              <i className="fas fa-check" />
                            </button>
                            <button
                              onClick={() => { setSelected(r); setRejectOpen(true); }}
                              disabled={busyRef === r.refNo}
                              title="Reject"
                              style={{
                                background: 'transparent',
                                border: 'none',
                                color: '#cb4335',
                                cursor: busyRef === r.ref_no ? 'wait' : 'pointer',
                                width: 26,
                                height: 26,
                                borderRadius: '50%',
                                fontSize: 14,
                                display: 'inline-flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                padding: 0,
                                opacity: busyRef === r.refNo ? 0.6 : 1
                              }}
                            >
                              <i className="fas fa-times" />
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
        </div>

        {/* Detail modal */}
        {selected && !rejectOpen && !approveOpen && (
          <div style={overlayStyle} onClick={(e) => e.target === e.currentTarget && setSelected(null)}>
            <div style={{ ...modalStyle, maxWidth: 650 }}>
              <div style={modalHeader}>
                <h2 style={{ margin: 0, fontSize: 16, color: theme.text, fontWeight: 600 }}>Renewal Payment Details</h2>
                <button onClick={() => setSelected(null)} style={closeBtnStyle}>✕</button>
              </div>
              <div style={{ padding: 24 }}>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <SectionLabel>Renewal Payment Details</SectionLabel>
                  <ViewField label="Reference No" value={selected.ref_no} />
                  <ViewField label="Status" value={<StatusPill status={selected.status} />} />
                  <ViewField label="MC / M.Com" value={selected.mc_name} />
                  <ViewField label="Plan No" value={selected.plan_no} />
                  <ViewField label="Applicant" value={selected.applicant_name} />
                  <ViewField label="Phone" value={selected.applicant_phone} />
                  <ViewField label="Years" value={selected.years?.join(', ')} />
                  <ViewField label="Amount" value={money(selected.amount)} />
                  <ViewField label="Submitted" value={new Date(selected.created_at).toLocaleString('en-LK')} />
                  {selected.status === 'active' && <ViewField label="Approved" value={selected.approved_at ? new Date(selected.approved_at).toLocaleString('en-LK') : '-'} />}
                  {selected.status === 'active' && <ViewField label="Approved By" value={selected.action_by || '-'} />}

                  {selected.status === 'rejected' && <ViewField label="Rejected" value={new Date(selected.updated_at).toLocaleString('en-LK')} />}
                  {selected.status === 'rejected' && <ViewField label="Rejected By" value={selected.action_by || '-'} />}

                  {selected.status === 'rejected' && selected.reject_reason && (
                    <ViewField label="Reject Reason" value={selected.reject_reason} />
                  )}
                </div>

                {selected.status === 'pending_approval' && (
                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 16, paddingTop: 16, borderTop: `1px solid ${theme.border}` }}>
                    <button
                      onClick={() => setRejectOpen(true)}
                      style={{ background: '#cb4335', color: '#fff', border: 'none', padding: '8px 20px', borderRadius: 4, cursor: 'pointer', fontWeight: 600, fontSize: 13 }}
                    >
                      Reject
                    </button>
                    <button
                      onClick={() => setApproveOpen(true)}
                      disabled={busyRef === selected.ref_no}
                      style={{ background: '#4ade80', color: '#1f2937', border: 'none', padding: '8px 20px', borderRadius: 4, cursor: 'pointer', fontWeight: 600, fontSize: 13 }}
                    >
                      Approve
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
                placeholder="Reason for rejection (Required)"
                value={rejectReason}
                onChange={e => setRejectReason(e.target.value)}
                style={{ width: '100%', border: `1px solid ${theme.border}`, borderRadius: 8, padding: '10px 12px', fontSize: 13, boxSizing: 'border-box', resize: 'vertical' }}
              />
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 14 }}>
                <button onClick={() => { setRejectOpen(false); setRejectReason(''); setSelected(null); }} style={outlineBtn}>Cancel</button>
                <button onClick={handleReject} disabled={busyRef === selected.ref_no || !rejectReason.trim()} style={{ ...solidBtn(theme.red), cursor: (busyRef === selected.ref_no || !rejectReason.trim()) ? 'not-allowed' : 'pointer', opacity: (busyRef === selected.ref_no || !rejectReason.trim()) ? 0.6 : 1 }}>
                  {busyRef === selected.ref_no ? 'Rejecting…' : 'Confirm Reject'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Approve confirmation modal */}
        {approveOpen && selected && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,.5)', zIndex: 410, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
            <div style={{ background: '#fff', borderRadius: 12, width: '100%', maxWidth: 420, padding: 20, boxShadow: '0 24px 70px rgba(0,0,0,.3)' }}>
              <div style={{ fontWeight: 700, fontSize: 14.5, color: theme.text, marginBottom: 10 }}>Confirm Approval</div>
              <p style={{ fontSize: 13, color: theme.text2, margin: '0 0 16px 0', lineHeight: 1.5 }}>
                Are you sure you want to approve this renewal payment for <strong>{selected.mc_name}</strong>? This will activate the renewal for the selected years.
              </p>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 14 }}>
                <button onClick={() => { setApproveOpen(false); setSelected(null); }} style={outlineBtn}>Cancel</button>
                <button onClick={handleApprove} disabled={busyRef === selected.ref_no} style={solidBtn(theme.green)}>
                  {busyRef === selected.ref_no ? 'Approving…' : 'Confirm Approve'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Toast */}
        {toast && (
          <div style={{ position: 'fixed', bottom: 20, left: '50%', transform: 'translateX(-50%)', background: toast.type === 'error' ? theme.red : theme.navy, color: '#fff', padding: '10px 20px', borderRadius: 8, fontSize: 13, fontWeight: 600, boxShadow: '0 4px 12px rgba(0,0,0,.15)', zIndex: 1000, display: 'flex', alignItems: 'center', gap: 8 }}>
            <i className={`fas ${toast.type === 'error' ? 'fa-exclamation-circle' : 'fa-check-circle'}`} /> {toast.msg}
          </div>
        )}
      </div>

      {exportModalOpen && (
        <GenericExportModal
          isOpen={exportModalOpen}
          onClose={() => setExportModalOpen(false)}
          title="Export Approvals"
          fields={['Reference No', 'MC / M.Com', 'Plan No', 'Applicant', 'Phone', 'Years', 'Amount', 'Status', 'Submitted']}
          onExport={(exportFormat, selectedCols) => {
            if (exportFormat === 'pdf') {
              setToast({ type: 'error', msg: 'PDF export not supported yet for approvals' });
              return;
            }
            if (filtered.length === 0) {
              setToast({ type: 'error', msg: 'No data to export' });
              return;
            }
            const data = filtered.map(r => {
              const row = {
                'Reference No': r.ref_no,
                'MC / M.Com': r.mc_name,
                'Plan No': r.plan_no,
                'Applicant': r.applicant_name,
                'Phone': r.applicant_phone,
                'Years': r.years?.join(', '),
                'Amount': r.amount,
                'Status': r.status,
                'Submitted': r.created_at ? new Date(r.created_at).toLocaleString('en-LK') : '',
              };
              const filteredRow = {};
              selectedCols.forEach(col => { if (row[col] !== undefined) filteredRow[col] = row[col]; });
              return filteredRow;
            });
            const ws = XLSX.utils.json_to_sheet(data);
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, "Approvals");
            XLSX.writeFile(wb, "Renewal_Approvals.xlsx");
            setExportModalOpen(false);
          }}
        />
      )}
    </div>
  );
}