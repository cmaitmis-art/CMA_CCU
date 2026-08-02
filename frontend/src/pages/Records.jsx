import React, { useEffect, useMemo, useState } from 'react';
import * as XLSX from 'xlsx';
import '../CMAStyles.css';
import { fetchDiscussions } from '../api';

window.XLSX = XLSX;

/* ------------------------------------------------------------------ */
/*  Theme / shared style tokens — kept identical to the other CMA pages */
/* ------------------------------------------------------------------ */
const theme = {
  navy: '#1a3a6b',
  bg: '#f4f6fb',
  card: '#ffffff',
  text: '#1a1a2e',
  text2: '#5a6478',
  text3: '#94a0b4',
  border: '#e2e8f0',
  green: '#16a34a',
  red: '#dc2626',
  blue: '#2563eb',
  orange: '#ea580c',
  purple: '#7c3aed',
};

const btnBase = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 6,
  padding: '8px 14px',
  borderRadius: 8,
  fontSize: 13,
  fontWeight: 500,
  cursor: 'pointer',
  border: 'none',
  fontFamily: 'inherit',
  transition: '.2s',
};

const btnPrimary = { ...btnBase, background: theme.navy, color: '#fff' };
const btnOutline = { ...btnBase, background: 'transparent', color: theme.text2, border: `1px solid ${theme.border}` };

const overlayStyle = {
  position: 'fixed',
  inset: 0,
  background: 'rgba(0,0,0,.5)',
  zIndex: 200,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: 20,
};

const modalStyle = {
  background: '#fff',
  borderRadius: 16,
  width: '100%',
  maxWidth: 720,
  boxShadow: '0 20px 60px rgba(0,0,0,.2)',
  maxHeight: '90vh',
  overflowY: 'auto',
};

const modalHeader = {
  padding: '18px 22px 14px',
  borderBottom: `1px solid ${theme.border}`,
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  position: 'sticky',
  top: 0,
  background: '#fff',
  zIndex: 1,
};

const closeBtnStyle = {
  background: 'none',
  border: 'none',
  cursor: 'pointer',
  fontSize: 18,
  color: theme.text3,
  padding: 2,
  lineHeight: 1,
};

const tableWrapperStyle = {
  overflowX: 'auto',
  maxHeight: '62vh',
  overflowY: 'auto',
  border: `1px solid ${theme.border}`,
  borderRadius: 10,
  background: '#fff',
};

const tableStyle = {
  width: '100%',
  borderCollapse: 'collapse',
  fontSize: 12,
  fontFamily: "var(--font-sans)",
};

const thStyle = {
  textAlign: 'left',
  padding: '8px 10px',
  fontSize: 11,
  fontWeight: 600,
  color: theme.text3,
  textTransform: 'uppercase',
  letterSpacing: '.6px',
  background: '#f8fafc',
  borderBottom: `1px solid ${theme.border}`,
  whiteSpace: 'nowrap',
  position: 'sticky',
  top: 0,
  zIndex: 1,
};

const cellStyle = {
  padding: '8px 10px',
  fontSize: 12,
  lineHeight: 1.35,
  whiteSpace: 'nowrap',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  maxWidth: 220,
};

/* ------------------------------------------------------------------ */
/*  Module configuration — one entry per database table / page         */
/* ------------------------------------------------------------------ */
const TAB_CONFIG = {
  cfiles: {
    label: 'C-Files',
    icon: 'fa-folder-open',
    color: theme.blue,
    endpoint: 'cfiles',
    responseKey: 'rows',
    columns: [
      { key: 'file_no', label: 'File No' },
      { key: 'name_of_apartment', label: 'Name of Apartment' },
      { key: 'address', label: 'Address' },
      { key: 'date', label: 'Date', type: 'date' },
      { key: 'reason', label: 'Reason' },
      { key: 'complainer_details', label: 'Complainer Details' },
      { key: 'registered_ccu_file_no', label: 'Registered CCU File No' },
      { key: 'remarks', label: 'Remarks' },
      { key: 'category', label: 'Category' },
      { key: 'status', label: 'Status' },
    ],
  },
  mc: {
    label: 'MC Management',
    icon: 'fa-building',
    color: theme.navy,
    endpoint: 'mc',
    responseKey: 'rows',
    columns: [
      { key: 'reg_date', label: 'Reg Date', type: 'date' },
      { key: 'old_file_no', label: 'Old File No' },
      { key: 'new_file_no', label: 'New File No' },
      { key: 'name', label: 'Name' },
      { key: 'plan_no', label: 'Plan No' },
      { key: 'units', label: 'Units' },
      { key: 'residential_units', label: 'Residential' },
      { key: 'non_residential_units', label: 'Non Residential' },
      { key: 'service_units', label: 'Service Units' },
      { key: 'category', label: 'Category' },
      { key: 'secretary', label: 'Secretary' },
      { key: 'town', label: 'Town' },
      { key: 'status', label: 'Status' },
    ],
  },
  mcom: {
    label: 'MCom Management',
    icon: 'fa-city',
    color: theme.purple,
    endpoint: 'mcom',
    responseKey: 'rows',
    columns: [
      { key: 'reg_date', label: 'Reg Date', type: 'date' },
      { key: 'old_file_no', label: 'Old File No' },
      { key: 'remark', label: 'Remark' },
      { key: 'new_file_no', label: 'New File No' },
      { key: 'management_corporation_name', label: 'Management Corporation' },
      { key: 'address', label: 'Address' },
      { key: 'units', label: 'Units' },
      { key: 'plan_no', label: 'Plan No' },
      { key: 'secretary', label: 'Secretary' },
      { key: 'secretary_unit_no', label: 'Secretary Unit No' },
      { key: 'treasurer', label: 'Treasurer' },
      { key: 'treasurer_unit_no', label: 'Treasurer Unit No' },
      { key: 'renewal_period', label: 'Renewal Period' },
      { key: 'agm_date', label: 'AGM Date', type: 'date' },
      { key: 'agm_minutes', label: 'AGM Minutes' },
      { key: 'attendance', label: 'Attendance' },
      { key: 'audited_account', label: 'Audited Account' },
      { key: 'building_insurance', label: 'Insurance' },
      { key: 'active_non_active', label: 'Active / Non Active' },
      { key: 'renewal_date_vise', label: 'Renewal Date Vise' },
      { key: 'agm_date_vise', label: 'AGM Date Vise' },
      { key: 'mc_mcom', label: 'MC/M.Com' },
      { key: 'engineer', label: 'Engineer' },
      { key: 'management_assistant', label: 'MA' },
      { key: 'town', label: 'Town' },
      { key: 'council', label: 'Council' },
      { key: 'certificate_file_no', label: 'Cert File No' },
      { key: 'email_address', label: 'Email' },
      { key: 'awareness_date', label: 'Awareness Date', type: 'date' },
      { key: 'status', label: 'Status' },
    ],
  },
  complaints: {
    label: 'Complaints',
    icon: 'fa-comment-exclamation',
    color: theme.red,
    endpoint: 'complaints',
    responseKey: 'rows',
    columns: [
      { key: 'serial_no', label: 'Serial No' },
      { key: 'complaint_no', label: 'Complaint No' },
      { key: 'mc_no', label: 'MC No' },
      { key: 'apartment_name', label: 'Apartment' },
      { key: 'complaint_name', label: 'Complaint Name' },
      { key: 'letter_date', label: 'Letter Date', type: 'date' },
      { key: 'received_ccu', label: 'Received CCU', type: 'date' },
      { key: 'category', label: 'Category' },
      { key: 'issue_heading', label: 'Issue / Heading' },
      { key: 'remarks', label: 'Remarks' },
      { key: 'status', label: 'Status' },
      { key: 'priority', label: 'Priority' },
    ],
  },
  discussions: {
    icon: 'fa-comments',
    color: theme.orange,
    endpoint: 'discussions',
    responseKey: 'discussions',
    columns: [
      { key: 'date', label: 'Date', type: 'date' },
      { key: 'file_no', label: 'File No' },
      { key: 'appointment', label: 'Appointment' },
      { key: 'complaint', label: 'Complaint' },
      { key: 'respond', label: 'Response' },
      { key: 'meeting_date_time', label: 'Meeting Date / Time' },
      { key: 'venue', label: 'Venue' },
      { key: 'reminder_date', label: 'Reminder Date', type: 'date' },
      { key: 'officer', label: 'Officer' },
      { key: 'status', label: 'Status' },
    ],
  },
};

const TAB_ORDER = ['cfiles', 'mc', 'mcom', 'discussions', 'complaints'];
const PAGE_SIZE = 50;

/* ------------------------------------------------------------------ */
/*  Helpers                                                             */
/* ------------------------------------------------------------------ */
function pad2(v) {
  return String(v).padStart(2, '0');
}

function formatDisplayDate(v) {
  if (!v) return '—';
  const s = String(v).trim();
  const iso = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return `${iso[3]}/${iso[2]}/${iso[1]}`;
  const d = new Date(s);
  if (!Number.isNaN(d.getTime())) return `${pad2(d.getDate())}/${pad2(d.getMonth() + 1)}/${d.getFullYear()}`;
  return s;
}

function prettifyKey(key) {
  return String(key)
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

/* ------------------------------------------------------------------ */
/*  Generic "view all fields" modal — works for any record shape       */
/* ------------------------------------------------------------------ */
function RecordViewModal({ isOpen, onClose, record, config }) {
  if (!isOpen || !record) return null;

  const knownKeys = config.columns.map((c) => c.key);
  const extraKeys = Object.keys(record).filter(
    (k) => !knownKeys.includes(k) && !['id'].includes(k)
  );

  return (
    <div style={overlayStyle} onClick={onClose}>
      <div style={modalStyle} onClick={(e) => e.stopPropagation()}>
        <div style={modalHeader}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <i className={`fas ${config.icon}`} style={{ color: config.color }} />
            <span style={{ fontSize: 15, fontWeight: 700, color: theme.text }}>{config.label} — Record Details</span>
          </div>
          <button style={closeBtnStyle} onClick={onClose}>✕</button>
        </div>
        <div style={{ padding: 20, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px 18px' }}>
          {config.columns.map((col) => (
            <div key={col.key}>
              <div style={{ fontSize: 10.5, fontWeight: 700, color: theme.text3, textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: 3 }}>
                {col.label}
              </div>
              <div style={{ fontSize: 13, color: theme.text, wordBreak: 'break-word' }}>
                {col.type === 'date' ? formatDisplayDate(record[col.key]) : (record[col.key] || '—')}
              </div>
            </div>
          ))}
          {extraKeys.length > 0 && (
            <div style={{ gridColumn: 'span 2', borderTop: `1px solid ${theme.border}`, marginTop: 6, paddingTop: 12 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: theme.navy, textTransform: 'uppercase', letterSpacing: '.6px', marginBottom: 10 }}>
                Other Saved Fields
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px 18px' }}>
                {extraKeys.map((k) => (
                  <div key={k}>
                    <div style={{ fontSize: 10.5, fontWeight: 700, color: theme.text3, textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: 3 }}>
                      {prettifyKey(k)}
                    </div>
                    <div style={{ fontSize: 13, color: theme.text, wordBreak: 'break-word' }}>
                      {record[k] === null || record[k] === undefined || record[k] === '' ? '—' : String(record[k])}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main Records Page                                                   */
/* ------------------------------------------------------------------ */
export default function RecordsPage() {
  const [activeTab, setActiveTab] = useState(() => {
    return sessionStorage.getItem('cma_records_activeTab') || 'cfiles';
  });
  const [dataMap, setDataMap] = useState({ cfiles: [], mc: [], mcom: [], discussions: [] });
  const [loadingMap, setLoadingMap] = useState({});
  const [errorMap, setErrorMap] = useState({});
  const [searchTerm, setSearchTerm] = useState(() => {
    return sessionStorage.getItem('cma_records_searchTerm') || '';
  });
  const [page, setPage] = useState(1);
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [showViewModal, setShowViewModal] = useState(false);

  useEffect(() => {
    try {
      sessionStorage.setItem('cma_records_activeTab', activeTab);
      sessionStorage.setItem('cma_records_searchTerm', searchTerm);
    } catch (e) {}
  }, [activeTab, searchTerm]);

  const API_BASE = (import.meta.env.VITE_API_URL || '/api').trim();

  async function loadTab(tab, force = false) {
    if (!force && dataMap[tab] && dataMap[tab].length > 0) return; // Already loaded

    const cfg = TAB_CONFIG[tab];
    setLoadingMap((m) => ({ ...m, [tab]: true }));
    setErrorMap((m) => ({ ...m, [tab]: null }));
    try {
      let rows = [];
      if (tab === 'discussions') {
        const data = await fetchDiscussions(1, 999999, '');
        rows = data?.[cfg.responseKey] ?? [];
      } else {
        const r = await fetch(`${API_BASE}/${cfg.endpoint}?limit=999999`);
        if (!r.ok) throw new Error(`Failed to load ${cfg.label} (HTTP ${r.status})`);
        const data = await r.json();
        rows = data?.[cfg.responseKey] ?? [];
      }
      setDataMap((m) => ({ ...m, [tab]: Array.isArray(rows) ? rows : [] }));
    } catch (e) {
      setErrorMap((m) => ({ ...m, [tab]: e?.message || 'Failed to load records' }));
    } finally {
      setLoadingMap((m) => ({ ...m, [tab]: false }));
    }
  }

  function loadAll() {
    TAB_ORDER.forEach((t) => loadTab(t, true));
  }

  useEffect(() => {
    loadTab(activeTab);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  useEffect(() => {
    setPage(1);
  }, [activeTab, searchTerm]);

  const config = TAB_CONFIG[activeTab];
  const rows = dataMap[activeTab] || [];
  const loading = !!loadingMap[activeTab];
  const error = errorMap[activeTab];

  const filteredRows = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return rows;
    return rows.filter((row) =>
      config.columns.some((col) => String(row[col.key] ?? '').toLowerCase().includes(term))
    );
  }, [rows, searchTerm, config]);

  const maxPage = Math.max(1, Math.ceil(filteredRows.length / PAGE_SIZE));
  const pagedRows = filteredRows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const grandTotal = TAB_ORDER.reduce((sum, t) => sum + (dataMap[t]?.length || 0), 0);
  const anyLoading = TAB_ORDER.some((t) => !!loadingMap[t]);

  function exportRowsToSheet(wb, key) {
    const cfg = TAB_CONFIG[key];
    const source = dataMap[key] || [];
    const exportData = source.map((row) => {
      const obj = {};
      const knownKeys = new Set();

      // 1. Explicitly configured columns first (properly labeled)
      cfg.columns.forEach((col) => {
        knownKeys.add(col.key);
        obj[col.label] = col.type === 'date' ? formatDisplayDate(row[col.key]) : (row[col.key] ?? '');
      });

      // 2. All remaining fields in the row
      Object.keys(row).forEach((k) => {
        if (!knownKeys.has(k) && k !== 'id') {
          const label = k.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
          let val = row[k];

          if (typeof val === 'boolean') {
            val = val ? 'Yes' : 'No';
          } else if (typeof val === 'string' && val.match(/^\d{4}-\d{2}-\d{2}/)) {
            val = formatDisplayDate(val);
          } else if (val && typeof val === 'object') {
            try { val = JSON.stringify(val); } catch (e) { /* ignore */ }
          }

          obj[label] = val ?? '';
        }
      });

      return obj;
    });
    const ws = XLSX.utils.json_to_sheet(exportData.length ? exportData : [{}]);
    XLSX.utils.book_append_sheet(wb, ws, cfg.label.slice(0, 31));
  }

  function handleExportCurrent() {
    const wb = XLSX.utils.book_new();
    exportRowsToSheet(wb, activeTab);
    XLSX.writeFile(wb, `${config.label.replace(/\s+/g, '_')}_Records.xlsx`);
  }

  function handleExportAll() {
    const wb = XLSX.utils.book_new();
    TAB_ORDER.forEach((t) => exportRowsToSheet(wb, t));
    XLSX.writeFile(wb, `All_CMA_Records_${new Date().toISOString().slice(0, 10)}.xlsx`);
  }

  return (
    <div style={{ padding: 20, background: theme.bg, minHeight: '100%' }}>
      <style>{`
        @keyframes shimmer {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
      `}</style>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10, marginBottom: 16 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: theme.text }}>Records</h2>
          <p style={{ margin: '4px 0 0', fontSize: 13, color: theme.text2 }}>
            View every record saved across all databases in one place
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button style={btnOutline} onClick={loadAll} disabled={anyLoading}>
            <i className={`fas ${anyLoading ? 'fa-spinner fa-spin' : 'fa-sync-alt'}`} /> Refresh
          </button>
          <button style={btnPrimary} onClick={async () => { await Promise.all(TAB_ORDER.map((t) => loadTab(t, true))); handleExportAll(); }}>
            <i className="fas fa-file-export" /> Export All to Excel
          </button>
        </div>
      </div>

      {/* Summary cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12, marginBottom: 18 }}>
        <div style={{ background: theme.card, border: `1px solid ${theme.border}`, borderRadius: 12, padding: '14px 16px' }}>
          <div style={{ fontSize: 11, color: theme.text3, fontWeight: 700, textTransform: 'uppercase' }}>Total Records</div>
          <div style={{ fontSize: 24, fontWeight: 700, color: theme.text, marginTop: 4 }}>{grandTotal}</div>
        </div>
        {TAB_ORDER.map((t) => {
          const cfg = TAB_CONFIG[t];
          const isTabLoading = !!loadingMap[t];
          return (
            <div key={t} style={{ background: theme.card, border: `1px solid ${theme.border}`, borderRadius: 12, padding: '14px 16px', cursor: 'pointer', transition: '.2s', outline: activeTab === t ? `2px solid ${cfg.color}` : 'none' }} onClick={() => setActiveTab(t)}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: theme.text3, fontWeight: 700, textTransform: 'uppercase' }}>
                <i className={`fas ${isTabLoading ? 'fa-spinner fa-spin' : cfg.icon}`} style={{ color: cfg.color }} /> {cfg.label}
              </div>
              <div style={{ fontSize: 24, fontWeight: 700, color: theme.text, marginTop: 4 }}>
                {isTabLoading ? <span style={{ fontSize: 14, color: theme.text3 }}>Loading…</span> : (dataMap[t]?.length || 0)}
              </div>
            </div>
          );
        })}
      </div>

      {/* Table Card */}
      <div style={{ background: theme.card, borderRadius: 12, border: `1px solid ${theme.border}`, boxShadow: '0 2px 12px rgba(0,0,0,.07)', overflow: 'hidden' }}>

        {/* Tabs */}
        <div style={{ display: 'flex', borderBottom: `1px solid ${theme.border}`, overflowX: 'auto' }}>
          {TAB_ORDER.map((t) => {
            const cfg = TAB_CONFIG[t];
            const isActive = activeTab === t;
            return (
              <button
                key={t}
                onClick={() => setActiveTab(t)}
                style={{
                  padding: '13px 18px',
                  border: 'none',
                  borderBottom: isActive ? `2px solid ${cfg.color}` : '2px solid transparent',
                  background: 'transparent',
                  color: isActive ? cfg.color : theme.text2,
                  fontWeight: isActive ? 700 : 500,
                  fontSize: 13,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 7,
                  whiteSpace: 'nowrap',
                }}
              >
                <i className={`fas ${cfg.icon}`} /> {cfg.label}
                <span style={{
                  background: isActive ? `${cfg.color}18` : '#f1f3f8',
                  color: isActive ? cfg.color : theme.text3,
                  borderRadius: 999,
                  padding: '1px 8px',
                  fontSize: 11,
                  fontWeight: 700,
                }}>
                  {dataMap[t]?.length || 0}
                </span>
              </button>
            );
          })}
        </div>

        {/* Filters */}
        <div style={{ padding: '14px 16px', borderBottom: `1px solid ${theme.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
          <input
            id="records_search_input"
            name="records_search_input"
            aria-label={`Search ${config.label}`}
            type="text"
            placeholder={`Search ${config.label}…`}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ padding: '7px 11px', borderRadius: 6, border: '1px solid #ddd', fontSize: 12, width: 240 }}
          />
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <span style={{ fontSize: 12, color: theme.text2 }}>
              Showing <strong>{pagedRows.length}</strong> of <strong>{filteredRows.length}</strong>
            </span>
            <button style={{ ...btnOutline, padding: '6px 12px', fontSize: 12 }} onClick={handleExportCurrent}>
              <i className="fas fa-file-excel" /> Export {config.label}
            </button>
          </div>
        </div>

        {/* Pagination */}
        <div style={{ padding: '8px 16px', borderBottom: `1px solid ${theme.border}`, display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 8 }}>
          <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}
            style={page === 1 ? { ...btnOutline, opacity: 0.5, cursor: 'not-allowed', padding: '5px 10px', fontSize: 12 } : { ...btnOutline, padding: '5px 10px', fontSize: 12 }}>Prev</button>
          <span style={{ fontSize: 12, color: theme.text3 }}>Page <strong style={{ color: theme.text }}>{page}</strong> / {maxPage}</span>
          <button onClick={() => setPage((p) => Math.min(maxPage, p + 1))} disabled={page >= maxPage}
            style={page >= maxPage ? { ...btnOutline, opacity: 0.5, cursor: 'not-allowed', padding: '5px 10px', fontSize: 12 } : { ...btnOutline, padding: '5px 10px', fontSize: 12 }}>Next</button>
        </div>

        {/* Table */}
        <div style={tableWrapperStyle}>
          <table style={tableStyle}>
            <thead>
              <tr>
                {config.columns.map((col) => (
                  <th key={col.key} style={thStyle}>{col.label}</th>
                ))}
                <th style={{ ...thStyle, position: 'sticky', right: 0, background: '#f8fafc', zIndex: 30, borderLeft: '2px solid #94a3b8', boxShadow: '-4px 0 8px rgba(0,0,0,0.06)', backgroundClip: 'padding-box' }}>View</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 8 }).map((_, i) => (
                  <tr key={i} style={{ borderBottom: `1px solid ${theme.border}` }}>
                    {config.columns.map((col) => (
                      <td key={col.key} style={cellStyle}>
                        <div style={{ height: 12, borderRadius: 6, background: 'linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%)', backgroundSize: '200% 100%', animation: 'shimmer 1.5s infinite', width: `${50 + Math.random() * 40}%` }} />
                      </td>
                    ))}
                    <td style={{ ...cellStyle, position: 'sticky', right: 0, background: '#fff', zIndex: 10, borderLeft: '2px solid #94a3b8' }} />
                  </tr>
                ))
              ) : error ? (
                <tr><td colSpan={config.columns.length + 1} style={{ padding: 24, textAlign: 'center', color: theme.red }}>{error}</td></tr>
              ) : pagedRows.length === 0 ? (
                <tr><td colSpan={config.columns.length + 1} style={{ padding: 24, textAlign: 'center', color: theme.text3 }}>No records found</td></tr>
              ) : (
                pagedRows.map((row, idx) => (
                  <tr
                    key={row.id ?? idx}
                    style={{ borderBottom: `1px solid ${theme.border}` }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = '#f8fafc')}
                    onMouseLeave={(e) => (e.currentTarget.style.background = '')}
                  >
                    {config.columns.map((col) => (
                      <td key={col.key} style={cellStyle} title={col.type === 'date' ? formatDisplayDate(row[col.key]) : row[col.key]}>
                        {col.type === 'date' ? formatDisplayDate(row[col.key]) : (row[col.key] || '—')}
                      </td>
                    ))}
                    <td style={{ ...cellStyle, position: 'sticky', right: 0, background: '#fff', zIndex: 10, borderLeft: '2px solid #94a3b8', boxShadow: '-4px 0 8px rgba(0,0,0,0.06)', backgroundClip: 'padding-box' }}>
                      <button
                        onClick={() => { setSelectedRecord(row); setShowViewModal(true); }}
                        style={{ background: 'none', border: 'none', color: theme.blue, cursor: 'pointer', fontSize: 13 }}
                        title="View full record"
                      >
                        <i className="fas fa-eye" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <RecordViewModal
        isOpen={showViewModal}
        onClose={() => setShowViewModal(false)}
        record={selectedRecord}
        config={config}
      />
    </div>
  );
}