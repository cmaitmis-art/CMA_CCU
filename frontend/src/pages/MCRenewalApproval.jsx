import { useEffect, useState, useRef } from 'react';
import { hasPermission } from '../utils/roleLabel.js';
import * as XLSX from 'xlsx';
import GenericExportModal from '../components/GenericExportModal.jsx';
import RichTextToolbar from '../components/RichTextToolbar.jsx';

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

import { fetchRenewals, approveRenewal, rejectRenewal, deleteRenewal } from '../api.js';
import { ViewField, SectionLabel, overlayStyle, modalStyle, modalHeader, closeBtnStyle, formatDotDate, formatOrdinalDate } from '../components/mc-management/MCManagementShared.jsx';
import '../components/mc-management/MCManagement.css';
import { CMA_LOGO_BASE64 } from '../utils/logoBase64.js';
import { LETTERHEAD_BASE64 } from '../utils/letterHeadBase64.js';


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
  async delete(refNo) {
    return await deleteRenewal(refNo);
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
  const isAdmin = String(currentUser?.role || '').trim().toLowerCase() === 'admin';
  const canEdit = hasPermission(currentUser, 'renewal_approval', 'edit');
  const canDelete = hasPermission(currentUser, 'renewal_approval', 'delete');
  const canCreate = hasPermission(currentUser, 'renewal_approval', 'create');
  const canApprove = hasPermission(currentUser, 'renewal_approval', 'approve');
  const canViewRecord = hasPermission(currentUser, 'renewal_approval', 'view');
  // Separate granular permissions for Print Receipt and Acknowledgement Letter:
  const canReceipt = isAdmin || hasPermission(currentUser, 'renewal_approval', 'receipt');
  const canAcknowledgement = isAdmin || hasPermission(currentUser, 'renewal_approval', 'acknowledgement');
  const canViewOnly = !canEdit && !canDelete && !canCreate && !canApprove && !canReceipt && !canAcknowledgement;
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('pending_approval'); // pending_approval | active | rejected
  const [searchTerm, setSearchTerm] = useState('');
  const [exportModalOpen, setExportModalOpen] = useState(false);
  const [selected, setSelected] = useState(null);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
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

  const [ackModalOpen, setAckModalOpen] = useState(false);
  const [ackOverrides, setAckOverrides] = useState({});
  const [emailPreview, setEmailPreview] = useState(null);
  const [sendingEmail, setSendingEmail] = useState(false);
  const [viewRecord, setViewRecord] = useState(null);
  const [selectedRowForAck, setSelectedRowForAck] = useState(null);
  const [showAckToolbar, setShowAckToolbar] = useState(false);
  const [ackSaved, setAckSaved] = useState(false);
  const [ackDefaultOverrides, setAckDefaultOverrides] = useState(null);
  const [ackCustomHtml, setAckCustomHtml] = useState(null);
  const [ackRenderKey, setAckRenderKey] = useState(0);
  const ackOverridesRef = useRef(ackOverrides);
  ackOverridesRef.current = ackOverrides;

  function getAckStorageKey(record, r) {
    const isMcom = (r?.mc_type === 'M.Com') || (record?.mc_type === 'M.Com');
    const id = record?.new_file_no || record?.old_file_no || record?.file_no || record?.id || record?.acknowledgement_no || 'default';
    return isMcom ? `mcom_ack_overrides_${id}` : `ack_overrides_${id}`;
  }

  function loadAckOverrides(record, r) {
    try {
      const key = getAckStorageKey(record, r);
      const saved = localStorage.getItem(key);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && parsed.signName === 'Samantha Ampaala') {
          parsed.signName = 'Samantha Ampagala';
        }
        return parsed;
      }
    } catch {}
    return null;
  }

  function saveAckOverrides(record, r, overrides) {
    try {
      const key = getAckStorageKey(record, r);
      localStorage.setItem(key, JSON.stringify(overrides));
    } catch {}
  }

  const handleSaveAck = () => {
    if (!viewRecord) return;
    const rendered = document.getElementById('ack-letter-content-render');
    const customHtml = rendered ? rendered.innerHTML : null;
    const toSave = {
      ...ackOverridesRef.current,
      customLetterHtml: customHtml
    };
    ackOverridesRef.current = toSave;
    setAckOverrides(toSave);
    setAckCustomHtml(customHtml);
    saveAckOverrides(viewRecord, selectedRowForAck, toSave);
    setAckSaved(true);
    setToast({ type: 'success', msg: 'Acknowledgement letter saved successfully! ✅' });
  };

  const handleUndoAck = () => {
    if (!viewRecord) return;
    const resetDefaults = { ...(ackDefaultOverrides || {}), customLetterHtml: null };
    ackOverridesRef.current = resetDefaults;
    setAckOverrides(resetDefaults);
    setAckCustomHtml(null);
    try {
      localStorage.removeItem(getAckStorageKey(viewRecord, selectedRowForAck));
    } catch {}
    setAckSaved(false);
    setAckRenderKey(prev => prev + 1);
    setToast({ type: 'info', msg: 'Reset letter back to original defaults! ↺' });
  };

  async function handleOpenAck(r) {
    if (!r.mc_id) return;
    setLoading(true);
    try {
      const type = r.mc_type === 'M.Com' ? 'mcom' : 'mc';
      const API_BASE = import.meta.env.VITE_API_URL ?? '/api';
      const response = await fetch(`${API_BASE}/${type}/${r.mc_id}`);
      if (response.ok) {
        const mcData = await response.json();
        setViewRecord(mcData);
        setSelectedRowForAck(r);
        const ackYearFrom = r.years && r.years.length > 0 ? Math.min(...r.years) : new Date().getFullYear();
        const ackYearTo = r.years && r.years.length > 0 ? Math.max(...r.years) : new Date().getFullYear();
        const cleanAckDefaults = {
          toEmail: r.applicant_email || mcData.email_address || mcData.secretary_email || '',
          refNo: mcData.new_file_no || mcData.old_file_no || mcData.file_no || mcData.id,
          amount: money(r.amount).replace('Rs. ', ''),
          yearFrom: ackYearFrom,
          yearTo: ackYearTo,
          year: ackYearTo,
          date: new Date().toISOString().slice(0, 10),
          paidDate: new Date(r.created_at || new Date()).toISOString().slice(0, 10),
          signName: 'Samantha Ampagala',
          signTitle1: 'Assistant General Manager (Customer Care)',
          signTitle2: 'Condominium Management Authority',
          customLetterHtml: null
        };
        const savedAck = loadAckOverrides(mcData, r);
        const activeAck = savedAck ? { ...cleanAckDefaults, ...savedAck } : { ...cleanAckDefaults };

        setAckDefaultOverrides(cleanAckDefaults);
        setAckOverrides(activeAck);
        ackOverridesRef.current = activeAck;
        setAckCustomHtml(savedAck?.customLetterHtml || null);
        setAckSaved(!!savedAck);
        setAckRenderKey(prev => prev + 1);
        setShowAckToolbar(false);
        setAckModalOpen(true);
      }
    } catch (e) {
      console.error(e);
      setToast({ type: 'error', msg: 'Failed to load MC details for acknowledgement' });
    }
    setLoading(false);
  }

  function escapeHtml(unsafe) {
    if (!unsafe) return '';
    return String(unsafe).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;").replace(/\n/g, "<br/>");
  }

  function renderAcknowledgementLetter(mc) {
    if (!mc) return null;
    const addressLines = String(mc.address || '').split(/\r?\n|,/).map((l) => l.trim()).filter(Boolean);
    const ackYearFrom = ackOverrides.yearFrom || ackOverrides.year;
    const ackYearTo = ackOverrides.yearTo || ackOverrides.year;
    const isMultiYearAck = ackYearFrom && ackYearTo && String(ackYearFrom) !== String(ackYearTo);
    const isMcom = (selectedRowForAck?.mc_type === 'M.Com') || (mc?.mc_type === 'M.Com');

    if (ackCustomHtml) {
      return (
        <div
          className="official-letter"
          id="ack-letter-content-render"
          contentEditable
          suppressContentEditableWarning
          style={{ fontFamily: 'Times New Roman, serif', fontSize: 16, lineHeight: 1.6, padding: '24px 28px', outline: 'none' }}
          dangerouslySetInnerHTML={{ __html: ackCustomHtml }}
          onInput={() => setAckSaved(false)}
        />
      );
    }

    return (
      <div className="official-letter" id="ack-letter-content-render" style={{ fontFamily: 'Times New Roman, serif', fontSize: 16, lineHeight: 1.6, padding: '24px 28px' }} onInput={() => setAckSaved(false)}>
        <div className="ol-ref" style={{ overflow: 'hidden', marginBottom: '25px' }}>
          <span contentEditable suppressContentEditableWarning style={{ float: 'left', outline: 'none' }}>{ackOverrides.refNo}</span>
          <span contentEditable suppressContentEditableWarning style={{ float: 'right', outline: 'none' }}>{formatDotDate(ackOverrides.date)}</span>
        </div>
        <div className="ol-addr" contentEditable suppressContentEditableWarning style={{ outline: 'none' }}>
          <div>The Secretary,</div>
          {isMcom && <div>The Management Committee</div>}
          {(() => {
            const n = mc.management_corporation_name || mc.name || '-';
            if (n.includes(' - ')) {
              const idx = n.indexOf(' - ');
              return (
                <>
                  <div>{n.substring(0, idx)}</div>
                  <div>{n.substring(idx + 3)}</div>
                </>
              );
            }
            return <div>{n}</div>;
          })()}
          {addressLines.map((line, idx) => <div key={idx}>{line}</div>)}
        </div>
        <p className="ol-para" contentEditable suppressContentEditableWarning style={{ outline: 'none' }}>Dear Sir/Madam,</p>
        <div className="ol-title" contentEditable suppressContentEditableWarning style={{ fontWeight: 'bold', textDecoration: 'underline', outline: 'none' }}>
          {isMcom ? 'RENEWAL OF REGISTRATION OF THE MANAGEMENT COMMITTEE' : 'RENEWAL OF REGISTRATION OF THE MANAGEMENT CORPORATION'}<br />
          <div className="ol-yearline">
            {isMultiYearAck
              ? `(01 January ${ackYearFrom} – 31 December ${ackYearTo})`
              : `(01 January ${ackYearTo} – 31 December ${ackYearTo})`
            }
          </div>
        </div>
        <p className="ol-para" contentEditable suppressContentEditableWarning style={{ outline: 'none' }}>
          We acknowledge with thanks the receipt of the {isMcom ? 'Management Committee' : 'Management Corporation'} Registration Renewal Fee amounting to Rs. {ackOverrides.amount}, which was received on <span style={{ whiteSpace: 'nowrap' }}>{formatOrdinalDate(ackOverrides.paidDate)}</span>.
        </p>
        <p className="ol-para" contentEditable suppressContentEditableWarning style={{ outline: 'none' }}>
          Accordingly, the registration of the {isMcom ? 'Management Committee' : 'Management Corporation'} has been renewed and is valid until <span style={{ whiteSpace: 'nowrap' }}>31<sup>st</sup> December {ackYearTo}</span>. Please note that the registration shall be renewed annually.
        </p>
        <p className="ol-para" contentEditable suppressContentEditableWarning style={{ outline: 'none' }}>Thank you.</p>
        <p className="ol-para" contentEditable suppressContentEditableWarning style={{ outline: 'none' }}>Yours faithfully,</p>
        <div className="ol-sign" contentEditable suppressContentEditableWarning style={{ outline: 'none' }}>
          <div className="ol-sign-space"></div>
          <div><strong>{ackOverrides.signName}</strong></div>
          <div><strong>{ackOverrides.signTitle1}</strong></div>
          <div><strong>{ackOverrides.signTitle2}</strong></div>
        </div>
      </div>
    );
  }

  function printAcknowledgement() {
    if (!viewRecord) return;
    const renderedContent = document.getElementById('ack-letter-content-render');
    let html = '';
    if (renderedContent) {
      const customHtml = renderedContent.innerHTML;
      const toSave = {
        ...ackOverridesRef.current,
        customLetterHtml: customHtml
      };
      ackOverridesRef.current = toSave;
      setAckOverrides(toSave);
      setAckCustomHtml(customHtml);
      saveAckOverrides(viewRecord, selectedRowForAck, toSave);
      setAckSaved(true);

      html = `<!DOCTYPE html>
<html><head><meta charset="utf-8" />
<title>Acknowledgement Letter - ${escapeHtml(ackOverrides.refNo)}</title>
<style>
@page { size: A4; margin: 0mm !important; }
* { box-sizing: border-box; }
body { margin: 0; padding: 0; font-family: 'Times New Roman', serif; color: #111; background: #fff; }
.doc-page { padding: 0; margin: 0; min-height: 100vh; }
.official-letter { width: 100%; max-width: 210mm; margin: 0; padding-top: 2.7in; padding-left: 1.2in; padding-right: 0.8in; padding-bottom: 20mm; font-family: 'Times New Roman', serif; font-size: 16px; line-height: 1.6; box-sizing: border-box; }
.ol-ref { display: flex; justify-content: space-between; margin-bottom: 25px; font-weight: normal; }
.ol-addr { margin-bottom: 25px; }
.ol-addr div { margin: 3px 0; }
.ol-title { font-weight: 700; text-decoration: underline; margin: 25px 0; line-height: 1.4; text-align: left; }
.ol-para { margin: 20px 0; text-align: justify; }
.ol-sign { margin-top: 40px; page-break-inside: avoid; break-inside: avoid; }
.ol-sign div { margin: 2px 0; }
.ol-sign-space { height: 60px; }
</style></head>
<body><div class="doc-page"><div class="official-letter">${customHtml}</div></div>
<script>window.addEventListener('load', function() { setTimeout(function() { window.focus(); window.print(); }, 500); });</script>
</body></html>`;
    }
    const blob = new Blob([html], { type: 'text/html' });
    const blobUrl = URL.createObjectURL(blob);
    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed'; iframe.style.right = '0'; iframe.style.bottom = '0'; iframe.style.width = '0'; iframe.style.height = '0'; iframe.style.border = '0';
    iframe.src = blobUrl;
    document.body.appendChild(iframe);
    setTimeout(() => { if (document.body.contains(iframe)) document.body.removeChild(iframe); URL.revokeObjectURL(blobUrl); }, 10000);
  }

  function printPaymentReceipt() {
    if (!selected) return;
    const r = selected;
    const yearsStr = Array.isArray(r.years) ? r.years.join(', ') : (r.years || '-');
    const amountStr = money(r.amount);
    const submittedStr = r.created_at ? new Date(r.created_at).toLocaleString('en-LK') : '-';
    const approvedStr = r.approved_at ? new Date(r.approved_at).toLocaleString('en-LK') : '-';
    const approvedBy = r.action_by || '-';
    const today = new Date().toLocaleDateString('en-LK', { year: 'numeric', month: 'long', day: 'numeric' });

    const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8" />
<title>Payment Receipt - ${escapeHtml(r.ref_no)}</title>
<style>
@page { size: A4 portrait; margin: 0; }
* { box-sizing: border-box; margin: 0; padding: 0; }
body { font-family: Arial, Helvetica, sans-serif; background: #fff; color: #1a1a2e;
  -webkit-print-color-adjust: exact !important;
  print-color-adjust: exact !important;
  color-adjust: exact !important;
}
.page { width: 210mm; height: 297mm; overflow: hidden; display: flex; flex-direction: column; }
.hdr {
  background-color: #1a3a6b !important;
  -webkit-print-color-adjust: exact !important;
  print-color-adjust: exact !important;
  color: #ffffff !important;
  padding: 10mm 14mm 8mm 14mm;
  display: flex; justify-content: space-between; align-items: center;
}
.hdr-left { display: flex; align-items: center; gap: 12px; }
.hdr-logo { width: 58px; height: 58px; object-fit: contain; background: #fff !important; border-radius: 50%; padding: 4px; }
.hdr-title h1 { font-size: 17px; font-weight: 800; letter-spacing: 0.5px; line-height: 1.25; color: #fff !important; }
.hdr-title p { font-size: 10px; opacity: 0.85; margin-top: 3px; letter-spacing: 0.3px; color: #fff !important; }
.hdr-right { text-align: right; }
.hdr-right .rlabel { font-size: 9.5px; opacity: 0.75; text-transform: uppercase; letter-spacing: 2px; margin-bottom: 5px; color: #fff !important; }
.hdr-right .rtype { font-size: 28px; font-weight: 900; letter-spacing: 2px; line-height: 1; color: #fff !important; }
.hdr-right .rdate { font-size: 9.5px; opacity: 0.8; margin-top: 5px; color: #fff !important; }
.ref-band {
  background-color: #eef2ff !important;
  -webkit-print-color-adjust: exact !important;
  print-color-adjust: exact !important;
  border-bottom: 2px solid #c7d7f5;
  padding: 5mm 14mm;
  display: flex; align-items: center; justify-content: space-between;
}
.rnolbl { font-size: 8.5px; color: #2563eb !important; font-weight: 700; text-transform: uppercase; letter-spacing: 1.5px; margin-bottom: 4px; }
.rnoval { font-size: 28px; font-weight: 900; color: #1a3a6b !important; letter-spacing: 3px; }
.spill {
  background-color: #16a34a !important;
  -webkit-print-color-adjust: exact !important;
  print-color-adjust: exact !important;
  color: #ffffff !important;
  font-size: 10.5px; font-weight: 700; padding: 5px 18px; border-radius: 20px; letter-spacing: 0.5px;
}
.body { padding: 7mm 14mm; flex: 1; }
.two-col { display: flex; gap: 10mm; margin-bottom: 7mm; }
.two-col .col { flex: 1; }
.shdr {
  background-color: #1a3a6b !important;
  -webkit-print-color-adjust: exact !important;
  print-color-adjust: exact !important;
  color: #ffffff !important;
  font-size: 8.5px; font-weight: 700; text-transform: uppercase; letter-spacing: 1.5px;
  padding: 4px 10px; border-radius: 3px; margin-bottom: 4mm;
}
.itbl { width: 100%; border-collapse: collapse; }
.itbl tr td { padding: 4px 0; font-size: 11px; vertical-align: top; border-bottom: 1px solid #e8edf4; }
.itbl tr td:first-child { color: #6b7280 !important; width: 45%; font-weight: 500; }
.itbl tr td:last-child { color: #111827 !important; font-weight: 700; text-align: right; }
.itbl tr:last-child td { border-bottom: none; }
.atbl { width: 100%; border-collapse: collapse; }
.atbl tr td { padding: 5px 0; font-size: 11.5px; vertical-align: middle; border-bottom: 1px solid #e8edf4; }
.atbl tr td:first-child { color: #6b7280 !important; font-weight: 500; }
.atbl tr td:last-child { text-align: right; font-weight: 700; color: #111827 !important; }
.atbl .trow td {
  font-size: 15px; font-weight: 900;
  color: #1a3a6b !important;
  border-top: 2.5px solid #1a3a6b !important;
  border-bottom: 2.5px solid #1a3a6b !important;
  padding: 6px 0;
}
.decl {
  border: 1px solid #e2e8f0;
  border-radius: 6px;
  background-color: #f8fafc !important;
  -webkit-print-color-adjust: exact !important;
  print-color-adjust: exact !important;
  padding: 4mm 6mm;
  font-size: 9.5px; color: #4b5563 !important; line-height: 1.65;
  margin-top: 6mm; margin-bottom: 6mm;
}
.decl strong { color: #1a3a6b !important; }
.ftr {
  background-color: #1a3a6b !important;
  -webkit-print-color-adjust: exact !important;
  print-color-adjust: exact !important;
  color: rgba(255,255,255,0.9) !important;
  padding: 5mm 14mm;
  display: flex; justify-content: space-between; align-items: center;
  margin-top: auto;
}
.ftr-left p { font-size: 9px; line-height: 1.75; color: rgba(255,255,255,0.9) !important; }
.ftr-right { text-align: right; font-size: 8.5px; opacity: 0.8; color: #fff !important; }
.fdiv { width: 1px; background: rgba(255,255,255,0.3) !important; align-self: stretch; margin: 0 8mm; }
</style>
</head><body>
<div class="page">
  <div class="hdr">
    <div class="hdr-left">
      <img class="hdr-logo" src="${CMA_LOGO_BASE64}" alt="CMA Logo" />
      <div class="hdr-title">
        <h1>CONDOMINIUM<br>MANAGEMENT AUTHORITY</h1>
        <p>Customer Care Unit &mdash; Sri Lanka</p>
      </div>
    </div>
    <div class="hdr-right">
      <div class="rlabel">Document Type</div>
      <div class="rtype">RECEIPT</div>
      <div class="rdate">Printed: ${escapeHtml(today)}</div>
    </div>
  </div>
  <div class="ref-band">
    <div>
      <div class="rnolbl">Reference No.</div>
      <div class="rnoval">${escapeHtml(r.ref_no)}</div>
    </div>
    <span class="spill">&#10003;&nbsp; ACTIVE &nbsp;/&nbsp; APPROVED</span>
  </div>
  <div class="body">
    <div class="two-col">
      <div class="col">
        <div class="shdr">Management Corporation / M.Com</div>
        <table class="itbl">
          <tr><td>MC / M.Com Name</td><td>${escapeHtml(r.mc_name || '-')}</td></tr>
          <tr><td>Plan / File No</td><td>${escapeHtml(String(r.plan_no || '-'))}</td></tr>
          <tr><td>MC Type</td><td>${escapeHtml(r.mc_type || '-')}</td></tr>
        </table>
      </div>
      <div class="col">
        <div class="shdr">Applicant Details</div>
        <table class="itbl">
          <tr><td>Applicant Name</td><td>${escapeHtml(r.applicant_name || '-')}</td></tr>
          <tr><td>Phone</td><td>${escapeHtml(r.applicant_phone || '-')}</td></tr>
          <tr><td>Email</td><td>${escapeHtml(r.applicant_email || '-')}</td></tr>
        </table>
      </div>
    </div>
    <div class="shdr">Payment Details</div>
    <table class="atbl">
      <tr><td>Renewal Year(s)</td><td>${escapeHtml(yearsStr)}</td></tr>
      <tr><td>Payment Submitted</td><td>${escapeHtml(submittedStr)}</td></tr>
      <tr><td>Approved On</td><td>${escapeHtml(approvedStr)}</td></tr>
      <tr><td>Approved By</td><td>${escapeHtml(approvedBy)}</td></tr>
      <tr class="trow"><td>TOTAL AMOUNT RECEIVED</td><td>${escapeHtml(amountStr)}</td></tr>
    </table>
    <div class="decl">
      <strong>Declaration:</strong> This is an official payment receipt issued by the <strong>Condominium Management Authority (CMA)</strong>, Sri Lanka, confirming receipt of the Management Corporation Registration Renewal Fee for the year(s) stated above. This document is computer-generated and is valid without a physical signature.
    </div>
  </div>
  <div class="ftr">
    <div class="ftr-left">
      <p><strong style="color:#fff;">Condominium Management Authority</strong></p>
      <p>Customer Care Unit &nbsp;|&nbsp; Sri Lanka</p>
      <p>www.condominium.lk &nbsp;|&nbsp; www.ccu.cma.lk</p>
    </div>
    <div class="fdiv"></div>
    <div class="ftr-right">
      <p>Generated by the CCU Management System.</p>
      <p style="margin-top:4px;">Reference: ${escapeHtml(r.ref_no)}</p>
    </div>
  </div>
</div>
<script>window.addEventListener('load',function(){setTimeout(function(){window.focus();window.print();},500);});</script>
</body></html>`;

    const blob = new Blob([html], { type: 'text/html' });
    const blobUrl = URL.createObjectURL(blob);
    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed'; iframe.style.right = '0'; iframe.style.bottom = '0'; iframe.style.width = '0'; iframe.style.height = '0'; iframe.style.border = '0';
    iframe.src = blobUrl;
    document.body.appendChild(iframe);
    setTimeout(() => { if (document.body.contains(iframe)) document.body.removeChild(iframe); URL.revokeObjectURL(blobUrl); }, 10000);
  }


  async function emailAcknowledgement() {
    if (!viewRecord) return;
    let toEmail = ackOverrides.toEmail;
    if (!toEmail) setToast({ type: 'error', msg: 'No recipient email found. Please enter an email address in the Recipient Email field.' });

    const fileNo = viewRecord.new_file_no || viewRecord.old_file_no || viewRecord.file_no || '';
    const ackNo = (ackOverrides.refNo || '').replace(/^ACK\/?/i, '').trim();
    const mcName = viewRecord.management_corporation_name || viewRecord.name || '';
    const subject = `Acknowledgement Letter - ${fileNo}`;
    const bodyText = `Dear Sir/Madam,\n\nWe acknowledge with thanks the receipt of the Management Corporation Registration Renewal Fee for ${mcName}.\n\nAcknowledgement No: ${ackNo}\n\nCondominium Management Authority\nCustomer Care Unit`;

    setToast({ type: 'success', msg: 'Preparing email and PDF...' });
    try {
      const { jsPDF } = await import('jspdf');
      const doc = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait', compress: true });
      const mc = viewRecord;
      const addressLines = String(mc.address || '').split(/\r?\n|,/).map((l) => l.trim()).filter(Boolean);
      const mcName2 = mc.management_corporation_name || mc.name || '-';
      const left = 35; const right = 210 - 20; const lineH = 7; const paraH = 10; let y = 72;

      const writeLine = (text, x, fontSize = 12, style = 'normal') => { doc.setFont('times', style); doc.setFontSize(fontSize); doc.text(text, x, y); y += lineH; };
      const writeWrapped = (text, fontSize = 12, style = 'normal', align = 'left') => { doc.setFont('times', style); doc.setFontSize(fontSize); const lines = doc.splitTextToSize(text, right - left); doc.text(lines, left, y, { align }); y += lines.length * lineH + 2; };
      const skip = (h = paraH) => { y += h; };

      try { doc.addImage(LETTERHEAD_BASE64, 'PNG', 0, 0, 210, 297, undefined, 'FAST'); } catch (err) { }

      doc.setFont('times', 'normal'); doc.setFontSize(12);
      doc.text(ackOverrides.refNo || '', left, y); doc.text(formatDotDate(ackOverrides.date), right, y, { align: 'right' }); y += lineH; skip(paraH);
      writeLine('The Secretary,', left);
      if (mcName2.includes(' - ')) { const idx = mcName2.indexOf(' - '); writeLine(mcName2.substring(0, idx), left); writeLine(`${mcName2.substring(idx + 3)}`, left); } else { writeLine(`${mcName2}`, left); }
      addressLines.forEach((l) => writeLine(`${l}`, left)); skip(paraH);
      writeLine('Dear Sir/Madam,', left); skip(paraH);

      const ackYearFrom = ackOverrides.yearFrom || ackOverrides.year;
      const ackYearTo = ackOverrides.yearTo || ackOverrides.year;
      const isMultiYearAck = ackYearFrom && ackYearTo && String(ackYearFrom) !== String(ackYearTo);

      doc.setFont('times', 'bold'); doc.setFontSize(12); doc.setLineWidth(0.3);
      const subjectLine1 = 'RENEWAL OF REGISTRATION OF THE MANAGEMENT CORPORATION';
      const subjectLine2 = isMultiYearAck
        ? `(01 January ${ackYearFrom} - 31 December ${ackYearTo})`
        : `(01 January ${ackYearTo} - 31 December ${ackYearTo})`;
      const sl1w = doc.getTextWidth(subjectLine1); doc.text(subjectLine1, left, y); doc.line(left, y + 0.8, left + sl1w, y + 0.8); y += lineH;
      const sl2w = doc.getTextWidth(subjectLine2); doc.text(subjectLine2, left, y); doc.line(left, y + 0.8, left + sl2w, y + 0.8); y += lineH; skip(paraH);

      writeWrapped(`We acknowledge with thanks the receipt of the Management Corporation Registration Renewal Fee amounting to Rs. ${ackOverrides.amount}, which was received on ${formatOrdinalDate(ackOverrides.paidDate)}.`); skip(4);
      writeWrapped(`Accordingly, the registration of the Management Corporation has been renewed and is valid until 31st December ${ackYearTo}. Please note that the registration shall be renewed annually.`); skip(4);
      writeLine('Thank you.', left); skip(4); writeLine('Yours faithfully,', left); skip(20);

      writeLine(ackOverrides.signName, left, 12, 'normal'); doc.setFont('times', 'bold'); doc.setFontSize(12);
      doc.text(ackOverrides.signTitle1, left, y); y += lineH; doc.text(ackOverrides.signTitle2, left, y); y += lineH;
      doc.setFont('times', 'italic'); doc.setFontSize(10); doc.setTextColor(100, 100, 100);
      doc.text('This is a system generated document and signature is not required.', left, y + 2);
      doc.setTextColor(17, 17, 17); // Reset to default black

      const safeFileNo = fileNo.replace(/[\/\\: ]/g, '_');
      const pdfFileName = `Acknowledgement_${safeFileNo}.pdf`;
      const pdfDataUri = doc.output('datauristring');
      const pdfBase64 = pdfDataUri.split(',')[1];
      const htmlBody = `
              <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.05);">
                  <div style="background-color: #1a3a6b; color: white; padding: 20px; text-align: center;">
                      <img src="${CMA_LOGO_BASE64}" alt="CMA Logo" style="height: 65px; margin-bottom: 12px; display: inline-block; background-color: white; border-radius: 50%; padding: 4px;" />
                      <h2 style="margin: 0; font-size: 20px;">Condominium Management Authority</h2>
                      <p style="margin: 5px 0 0 0; font-size: 14px; opacity: 0.8;">Acknowledgement of Registration Renewal</p>
                  </div>
                  <div style="padding: 24px; background-color: #ffffff;">
                      <p>Dear Sir/Madam,</p>
                      <p>Please find attached the official Acknowledgement of Registration Renewal for <strong>${mcName2}</strong> (File No: ${fileNo}).</p>
                      <p>This is an automated email. Please do not reply directly to this message.</p>
                      <div style="margin-top: 30px; border-top: 1px solid #cbd5e1; padding-top: 15px; font-size: 12px; color: #64748b;">
                          <p style="margin: 0;">Customer Care Unit</p>
                          <p style="margin: 2px 0 0 0;">Condominium Management Authority</p>
                      </div>
                  </div>
              </div>`;
      setEmailPreview({ toEmail, subject, htmlBody, pdfBase64, pdfFileName });
    } catch (error) {
      console.error(error);
      setToast({ type: 'error', msg: 'Failed to prepare email: ' + error.message });
    }
  }

  async function confirmSendEmail() {
    if (!emailPreview) return;
    setSendingEmail(true);
    try {
      const API_BASE = import.meta.env.VITE_API_URL ?? '/api';
      const response = await fetch(`${API_BASE}/send-email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(emailPreview)
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) {
        const errDetail = result.error || (response.status === 413 ? 'Attachment too large for server' : response.statusText);
        throw new Error(errDetail || 'Failed to send email');
      }
      setToast({ type: 'success', msg: 'Email sent successfully! ✅' });
      setEmailPreview(null);
    } catch (error) {
      console.error('Send email error:', error);
      setToast({ type: 'error', msg: 'Failed to send email: ' + error.message });
    } finally {
      setSendingEmail(false);
    }
  }

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

  async function handleDelete() {
    if (!selected) return;
    setBusyRef(selected.ref_no);
    try {
      await approvalApi.delete(selected.ref_no);
      setToast({ type: 'success', msg: 'Renewal deleted successfully.' });
      setDeleteOpen(false);
      setSelected(null);
      load();
    } catch (e) {
      setToast({ type: 'error', msg: e.message || 'Deletion failed' });
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
            <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
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
                  padding: '5px 12px', fontSize: 12, borderRadius: 6, cursor: 'pointer'
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
                  padding: '5px 12px', fontSize: 12, borderRadius: 6, cursor: 'pointer'
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
                  <tr
                    key={r.ref_no}
                    onClick={() => { if (canViewRecord) setSelected(r); }}
                    onMouseEnter={(e) => {
                      if (canViewRecord) {
                        e.currentTarget.style.background = '#f0f4ff';
                        const stickyCells = e.currentTarget.querySelectorAll('td[style*="sticky"]');
                        stickyCells.forEach(cell => cell.style.background = '#f0f4ff');
                      }
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = '#ffffff';
                      const stickyCells = e.currentTarget.querySelectorAll('td[style*="sticky"]');
                      stickyCells.forEach(cell => cell.style.background = '#ffffff');
                    }}
                    style={{
                      background: '#fff',
                      cursor: canViewRecord ? 'pointer' : 'default',
                      transition: 'background 0.15s ease'
                    }}
                  >
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
                        {canViewRecord && (
                          <button
                            onClick={(e) => { e.stopPropagation(); setSelected(r); }}
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
                        )}
                        {canAcknowledgement && (
                          <button
                            onClick={(e) => { e.stopPropagation(); handleOpenAck(r); }}
                            title="Acknowledgement Letter"
                            style={{
                              background: 'transparent',
                              border: 'none',
                              color: '#3b82f6',
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
                            <i className="fas fa-envelope" />
                          </button>
                        )}
                        {canApprove && r.status === 'pending_approval' && (
                          <>
                            <button
                              onClick={(e) => { e.stopPropagation(); setSelected(r); setApproveOpen(true); }}
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
                              onClick={(e) => { e.stopPropagation(); setSelected(r); setRejectOpen(true); }}
                              disabled={busyRef === r.ref_no}
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
                                opacity: busyRef === r.ref_no ? 0.6 : 1
                              }}
                            >
                              <i className="fas fa-times" />
                            </button>
                          </>
                        )}
                        {/* Delete Button */}
                        {canDelete && (
                          <button
                            onClick={(e) => { e.stopPropagation(); setSelected(r); setDeleteOpen(true); }}
                            disabled={busyRef === r.ref_no}
                            title="Delete"
                            style={{
                              background: 'transparent',
                              border: 'none',
                              color: theme.red,
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
                            <i className="fas fa-trash" />
                          </button>
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
        {selected && !rejectOpen && !approveOpen && !deleteOpen && (
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
                  <ViewField label="Email" value={selected.applicant_email || '-'} />
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

                {selected.status === 'active' && (
                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 16, paddingTop: 16, borderTop: `1px solid ${theme.border}`, flexWrap: 'wrap' }}>
                    {canReceipt && (
                      <button
                        onClick={printPaymentReceipt}
                        style={{ background: '#0f766e', color: '#fff', border: 'none', padding: '8px 18px', borderRadius: 4, cursor: 'pointer', fontWeight: 600, fontSize: 13, display: 'flex', alignItems: 'center', gap: 8 }}
                        title="Print Payment Receipt"
                      >
                        <i className="fas fa-receipt" /> Print Receipt
                      </button>
                    )}
                    {canAcknowledgement && (
                      <button
                        onClick={() => handleOpenAck(selected)}
                        style={{ background: '#3b82f6', color: '#fff', border: 'none', padding: '8px 18px', borderRadius: 4, cursor: 'pointer', fontWeight: 600, fontSize: 13, display: 'flex', alignItems: 'center', gap: 8 }}
                        title="View or send Acknowledgement Letter"
                      >
                        <i className="fas fa-envelope" /> Acknowledgement Letter
                      </button>
                    )}
                  </div>
                )}

                {selected.status === 'pending_approval' && (canApprove || canAcknowledgement || canReceipt) && (
                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 16, paddingTop: 16, borderTop: `1px solid ${theme.border}`, flexWrap: 'wrap' }}>
                    {canReceipt && (
                      <button
                        onClick={printPaymentReceipt}
                        style={{ background: '#0f766e', color: '#fff', border: 'none', padding: '8px 18px', borderRadius: 4, cursor: 'pointer', fontWeight: 600, fontSize: 13, display: 'flex', alignItems: 'center', gap: 8 }}
                        title="Print Payment Receipt"
                      >
                        <i className="fas fa-receipt" /> Print Receipt
                      </button>
                    )}
                    {canAcknowledgement && (
                      <button
                        onClick={() => handleOpenAck(selected)}
                        style={{ background: '#3b82f6', color: '#fff', border: 'none', padding: '8px 18px', borderRadius: 4, cursor: 'pointer', fontWeight: 600, fontSize: 13, display: 'flex', alignItems: 'center', gap: 8 }}
                        title="View or send Acknowledgement Letter"
                      >
                        <i className="fas fa-envelope" /> Acknowledgement
                      </button>
                    )}
                    {canApprove && (
                      <button
                        onClick={() => setRejectOpen(true)}
                        style={{ background: '#cb4335', color: '#fff', border: 'none', padding: '8px 18px', borderRadius: 4, cursor: 'pointer', fontWeight: 600, fontSize: 13 }}
                      >
                        Reject
                      </button>
                    )}
                    {canApprove && (
                      <button
                        onClick={() => setApproveOpen(true)}
                        disabled={busyRef === selected.ref_no}
                        style={{ background: '#4ade80', color: '#1f2937', border: 'none', padding: '8px 18px', borderRadius: 4, cursor: 'pointer', fontWeight: 600, fontSize: 13 }}
                      >
                        Approve
                      </button>
                    )}
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

        {/* Delete modal */}
        {deleteOpen && selected && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,.5)', zIndex: 410, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
            <div style={{ background: '#fff', borderRadius: 12, width: '100%', maxWidth: 420, padding: '24px 24px 20px 24px', boxShadow: '0 24px 70px rgba(0,0,0,.3)' }}>
              <div style={{ fontWeight: 700, fontSize: 18, color: '#111827', marginBottom: 16 }}>Delete Renewal Record</div>
              <div style={{ fontSize: 14, color: '#4b5563', marginBottom: 24 }}>Delete this renewal record? This action cannot be undone.</div>
              
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
                <button onClick={() => { setDeleteOpen(false); setSelected(null); }} style={{ ...outlineBtn, padding: '8px 16px', borderRadius: 6 }}>Cancel</button>
                <button onClick={handleDelete} disabled={busyRef === selected.ref_no} style={{ ...solidBtn(theme.red), padding: '8px 16px', borderRadius: 6, cursor: busyRef === selected.ref_no ? 'not-allowed' : 'pointer', opacity: busyRef === selected.ref_no ? 0.6 : 1 }}>
                  {busyRef === selected.ref_no ? 'Deleting…' : 'Delete'}
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

        {/* Acknowledgement Modal */}
        {ackModalOpen && viewRecord && (
          <div className="mc-overlay" onClick={(e) => e.target === e.currentTarget && setAckModalOpen(false)} style={overlayStyle}>
            <div className="mc-modal" style={{ ...modalStyle, maxWidth: 820, display: 'flex', flexDirection: 'column', maxHeight: '90vh' }}>
              <div className="mc-modal-header" style={modalHeader}>
                <span style={{ fontSize: 16, fontWeight: 700, color: theme.text }}>Acknowledgement Letter</span>
                <button onClick={() => setAckModalOpen(false)} style={closeBtnStyle}><i className="fas fa-times" /></button>
              </div>
              <div style={{ padding: 22, overflowY: 'auto', flex: 1 }}>
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginBottom: 14, alignItems: 'center', flexWrap: 'nowrap', overflowX: 'auto', paddingBottom: 2 }}>
                  {ackSaved && (
                    <div style={{ fontSize: 12, color: '#16a34a', display: 'flex', alignItems: 'center', gap: 5, marginRight: 'auto', flexShrink: 0, whiteSpace: 'nowrap' }}>
                      <i className="fas fa-check-circle" /> Saved locally
                    </div>
                  )}
                  <button
                    onClick={() => setShowAckToolbar(prev => !prev)}
                    className="mc-btn-outline"
                    style={{ padding: '6px 11px', borderRadius: '5px', display: 'flex', alignItems: 'center', gap: 6, color: '#0284c7', borderColor: '#0284c7', background: '#fff', cursor: 'pointer', fontWeight: 600, fontSize: 12, whiteSpace: 'nowrap', flexShrink: 0 }}
                    title="Toggle text editing formatting tools"
                  >
                    <i className="fas fa-edit" /> {showAckToolbar ? 'Hide Tools' : 'Edit Tools'}
                  </button>
                  <button
                    onClick={handleUndoAck}
                    className="mc-btn-outline"
                    style={{ padding: '6px 11px', borderRadius: '5px', color: '#b45309', borderColor: '#d97706', display: 'flex', alignItems: 'center', gap: 6, background: '#fff', cursor: 'pointer', fontWeight: 600, fontSize: 12, whiteSpace: 'nowrap', flexShrink: 0 }}
                    title="Reset all edits back to defaults"
                  >
                    <i className="fas fa-undo" /> Undo All
                  </button>
                  <button
                    onClick={handleSaveAck}
                    className="mc-btn-outline"
                    style={{ padding: '6px 11px', borderRadius: '5px', display: 'flex', alignItems: 'center', gap: 6, background: '#fff', cursor: 'pointer', fontWeight: 600, fontSize: 12, whiteSpace: 'nowrap', flexShrink: 0 }}
                    title="Save letter changes"
                  >
                    <i className="fas fa-save" /> Save Changes
                  </button>
                  <button onClick={emailAcknowledgement} style={{ padding: '6px 11px', background: '#3b82f6', color: '#fff', border: 'none', borderRadius: '5px', cursor: 'pointer', fontWeight: 600, fontSize: 12, display: 'flex', alignItems: 'center', gap: 6, whiteSpace: 'nowrap', flexShrink: 0 }}><i className="fas fa-envelope" /> Email Acknowledgement</button>
                  <button onClick={printAcknowledgement} style={{ padding: '6px 11px', background: '#3b82f6', color: '#fff', border: 'none', borderRadius: '5px', cursor: 'pointer', fontWeight: 600, fontSize: 12, display: 'flex', alignItems: 'center', gap: 6, whiteSpace: 'nowrap', flexShrink: 0 }}><i className="fas fa-print" /> Print Acknowledgement</button>
                </div>
                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 15, background: '#f8fafc', padding: 15, borderRadius: 8, border: '1px solid #e2e8f0' }}>
                  <div style={{ width: '100%', fontSize: 13, fontWeight: 'bold', marginBottom: 5, color: '#334155' }}>Edit Letter Variables:</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 5, flex: '1 1 200px' }}>
                    <label style={{ fontSize: 11, fontWeight: 'bold', color: '#64748b' }}>Recipient Email</label>
                    <input type="text" className="mc-input" value={ackOverrides.toEmail ?? ''} onChange={(e) => setAckOverrides({ ...ackOverrides, toEmail: e.target.value })} />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 5, flex: '1 1 200px' }}>
                    <label style={{ fontSize: 11, fontWeight: 'bold', color: '#64748b' }}>Reference No.</label>
                    <input type="text" className="mc-input" value={ackOverrides.refNo} onChange={(e) => setAckOverrides({ ...ackOverrides, refNo: e.target.value })} />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 5, flex: '1 1 120px' }}>
                    <label style={{ fontSize: 11, fontWeight: 'bold', color: '#64748b' }}>Letter Date</label>
                    <input type="date" className="mc-input" value={ackOverrides.date} onChange={(e) => setAckOverrides({ ...ackOverrides, date: e.target.value })} />
                  </div>
                  {/* Year From */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 5, flex: '1 1 100px' }}>
                    <label style={{ fontSize: 11, fontWeight: 'bold', color: '#64748b' }}>Year (From)</label>
                    <select className="mc-input" value={ackOverrides.yearFrom || ackOverrides.year} onChange={(e) => setAckOverrides({ ...ackOverrides, yearFrom: e.target.value })}>
                      {Array.from({ length: new Date().getFullYear() + 3 - 2010 }, (_, i) => new Date().getFullYear() + 2 - i).map(y => (
                        <option key={y} value={y}>{y}</option>
                      ))}
                    </select>
                  </div>
                  {/* Year To */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 5, flex: '1 1 100px' }}>
                    <label style={{ fontSize: 11, fontWeight: 'bold', color: '#64748b' }}>Year (To)</label>
                    <select className="mc-input" value={ackOverrides.yearTo || ackOverrides.year} onChange={(e) => setAckOverrides({ ...ackOverrides, yearTo: e.target.value, year: e.target.value })}>
                      {Array.from({ length: new Date().getFullYear() + 3 - 2010 }, (_, i) => new Date().getFullYear() + 2 - i).map(y => (
                        <option key={y} value={y}>{y}</option>
                      ))}
                    </select>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 5, flex: '1 1 120px' }}>
                    <label style={{ fontSize: 11, fontWeight: 'bold', color: '#64748b' }}>Amount (Rs.)</label>
                    <input type="text" className="mc-input" value={ackOverrides.amount} onChange={(e) => setAckOverrides({ ...ackOverrides, amount: e.target.value })} />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 5, flex: '1 1 120px' }}>
                    <label style={{ fontSize: 11, fontWeight: 'bold', color: '#64748b' }}>Paid Date</label>
                    <input type="date" className="mc-input" value={ackOverrides.paidDate} onChange={(e) => setAckOverrides({ ...ackOverrides, paidDate: e.target.value })} />
                  </div>
                  {/* Signatory row */}
                  <div style={{ width: '100%', display: 'flex', gap: 10, marginTop: 5 }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 5, flex: 1 }}>
                      <label style={{ fontSize: 11, fontWeight: 'bold', color: '#64748b' }}>Signatory Name</label>
                      <input type="text" className="mc-input" value={ackOverrides.signName || ''} onChange={(e) => setAckOverrides({ ...ackOverrides, signName: e.target.value })} />
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 5, flex: 1 }}>
                      <label style={{ fontSize: 11, fontWeight: 'bold', color: '#64748b' }}>Signatory Title 1</label>
                      <input type="text" className="mc-input" value={ackOverrides.signTitle1 || ''} onChange={(e) => setAckOverrides({ ...ackOverrides, signTitle1: e.target.value })} />
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 5, flex: 1 }}>
                      <label style={{ fontSize: 11, fontWeight: 'bold', color: '#64748b' }}>Signatory Title 2</label>
                      <input type="text" className="mc-input" value={ackOverrides.signTitle2 || ''} onChange={(e) => setAckOverrides({ ...ackOverrides, signTitle2: e.target.value })} />
                    </div>
                  </div>
                </div>
                <div style={{ marginBottom: 10, padding: '8px 12px', background: '#f0f9ff', border: '1px solid #bae6fd', borderRadius: 8, fontSize: 12, color: '#0369a1', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <i className="fas fa-pencil-alt" style={{ fontSize: 11 }} />
                  <span>Click on any text in the letter below to edit it directly. Click <strong>Edit Tools</strong> above to style text.</span>
                </div>
                {showAckToolbar && <RichTextToolbar style={{ marginBottom: 0, borderRadius: '8px 8px 0 0' }} />}
                <div key={ackRenderKey} style={{ border: `1px solid ${theme.border}`, borderTop: showAckToolbar ? 'none' : `1px solid ${theme.border}`, borderRadius: showAckToolbar ? '0 0 8px 8px' : 10, background: '#fff' }}>
                  {renderAcknowledgementLetter(viewRecord)}
                </div>
                <div style={{ display: 'none' }} className="print-ack">{renderAcknowledgementLetter(viewRecord)}</div>
              </div>
            </div>
          </div>
        )}

        {/* Email Preview Modal */}
        {emailPreview && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,.5)', zIndex: 500, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
            <div style={{ background: '#fff', borderRadius: 12, width: '100%', maxWidth: 650, padding: 0, boxShadow: '0 24px 70px rgba(0,0,0,.3)', overflow: 'hidden', display: 'flex', flexDirection: 'column', maxHeight: '90vh' }}>
              <div style={{ padding: '16px 20px', borderBottom: `1px solid ${theme.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f8fafc' }}>
                <span style={{ fontSize: 16, fontWeight: 700, color: theme.navy }}><i className="fas fa-paper-plane" style={{ marginRight: 8, color: '#3b82f6' }} /> Preview Email</span>
                <button onClick={() => !sendingEmail && setEmailPreview(null)} style={{ background: 'none', border: 'none', fontSize: 16, cursor: 'pointer', color: theme.text3 }}>✕</button>
              </div>

              <div style={{ padding: 20, overflowY: 'auto', flex: 1 }}>
                <div style={{ marginBottom: 12 }}>
                  <div style={{ fontSize: 12, color: theme.text2, fontWeight: 600, marginBottom: 4 }}>To:</div>
                  <div style={{ padding: '8px 12px', background: '#f1f5f9', borderRadius: 6, fontSize: 14, border: `1px solid ${theme.border}` }}>
                    {emailPreview.toEmail}
                  </div>
                </div>
                <div style={{ marginBottom: 16 }}>
                  <div style={{ fontSize: 12, color: theme.text2, fontWeight: 600, marginBottom: 4 }}>Subject:</div>
                  <div style={{ padding: '8px 12px', background: '#f1f5f9', borderRadius: 6, fontSize: 14, border: `1px solid ${theme.border}`, fontWeight: 600 }}>
                    {emailPreview.subject}
                  </div>
                </div>

                <div style={{ fontSize: 12, color: theme.text2, fontWeight: 600, marginBottom: 4 }}>Attachment:</div>
                <div
                  onClick={() => {
                    if (!emailPreview?.pdfBase64) return;
                    let b64 = emailPreview.pdfBase64;
                    if (b64.includes(',')) b64 = b64.split(',')[1];
                    const byteCharacters = atob(b64);
                    const byteNumbers = new Array(byteCharacters.length);
                    for (let i = 0; i < byteCharacters.length; i++) {
                      byteNumbers[i] = byteCharacters.charCodeAt(i);
                    }
                    const byteArray = new Uint8Array(byteNumbers);
                    const blob = new Blob([byteArray], { type: 'application/pdf' });
                    const blobUrl = URL.createObjectURL(blob);
                    window.open(blobUrl, '_blank');
                  }}
                  style={{ padding: '10px 14px', background: '#e0e7ff', border: '1px solid #c7d2fe', borderRadius: 6, display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16, cursor: 'pointer', transition: '0.2s' }}
                  onMouseEnter={(e) => e.currentTarget.style.background = '#c7d2fe'}
                  onMouseLeave={(e) => e.currentTarget.style.background = '#e0e7ff'}
                  title="Click to view/download PDF"
                >
                  <i className="fas fa-file-pdf" style={{ color: '#ef4444', fontSize: 20 }} />
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: '#4338ca' }}>{emailPreview.pdfFileName}</div>
                    <div style={{ fontSize: 11, color: '#6366f1' }}>PDF Document (Click to view/download)</div>
                  </div>
                </div>

                <div style={{ fontSize: 12, color: theme.text2, fontWeight: 600, marginBottom: 4 }}>Email Body:</div>
                <div style={{ border: `1px solid ${theme.border}`, borderRadius: 8, padding: 16, background: '#fff' }} dangerouslySetInnerHTML={{ __html: emailPreview.htmlBody }} />
              </div>

              <div style={{ padding: '14px 20px', borderTop: `1px solid ${theme.border}`, background: '#f8fafc', display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
                <button onClick={() => setEmailPreview(null)} disabled={sendingEmail} className="mc-btn-outline" style={{ padding: '8px 16px', borderRadius: 6, border: '1px solid #cbd5e1', cursor: sendingEmail ? 'not-allowed' : 'pointer', background: '#fff' }}>Cancel</button>
                <button onClick={confirmSendEmail} disabled={sendingEmail} className="mc-btn-primary" style={{ padding: '8px 18px', borderRadius: 6, background: '#3b82f6', color: '#fff', border: 'none', fontWeight: 600, cursor: sendingEmail ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: 8, opacity: sendingEmail ? 0.7 : 1 }}>
                  {sendingEmail ? <i className="fas fa-spinner fa-spin" /> : <i className="fas fa-paper-plane" />}
                  {sendingEmail ? 'Sending...' : 'Confirm & Send Email'}
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

            if (exportFormat === 'excel') {
              const ws = XLSX.utils.json_to_sheet(data);
              const wb = XLSX.utils.book_new();
              XLSX.utils.book_append_sheet(wb, ws, "Approvals");
              XLSX.writeFile(wb, "Renewal_Approvals.xlsx");
            } else if (exportFormat === 'pdf') {
              const printWindow = window.open('', '_blank');
              if (!printWindow) {
                setToast({ type: 'error', msg: 'Please allow popups to print PDF' });
                return;
              }
              const dateStr = new Date().toISOString().split('T')[0];
              let html = `
                    <html><head><title>Renewal Approvals - ${dateStr}</title>
                    <style>
                        body { font-family: Arial, sans-serif; padding: 20px; font-size: 11px; }
                        h2 { text-align: center; color: #1a3a6b; margin-bottom: 20px; }
                        table { width: 100%; border-collapse: collapse; margin-bottom: 20px; table-layout: fixed; }
                        th, td { border: 1px solid #ccc; padding: 8px; text-align: left; word-wrap: break-word; overflow-wrap: break-word; }
                        th { background: #f4f7f9; color: #333; }
                        @media print { @page { size: A4 landscape; margin: 10mm; } }
                    </style>
                    </head><body>
                    <h2>Renewal Approvals List - ${dateStr}</h2>
                    <table>
                        <thead><tr>${selectedCols.map(c => `<th>${c}</th>`).join('')}</tr></thead>
                        <tbody>
                            ${data.map(r => `<tr>${selectedCols.map(c => `<td>${r[c] || ''}</td>`).join('')}</tr>`).join('')}
                        </tbody>
                    </table>
                    <script>
                        window.onload = function() {
                            setTimeout(function() {
                                window.print();
                                window.close();
                            }, 300);
                        }
                    </script>
                    </body></html>
                `;
              printWindow.document.write(html);
              printWindow.document.close();
            }
            setExportModalOpen(false);
          }}
        />
      )}
    </div>
  );
}