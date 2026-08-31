import { useEffect, useMemo, useState, useRef } from 'react';
import { getServerDate } from '../utils/serverTime.js';
import {
  fetchMComs,
  importMComsBulk,
  deleteMComsBulk,
} from '../api';
import { useConfirmDialog } from '../ConfirmDialogContext.jsx';
import '../CMAStyles.css';
import '../components/mc-management/MCManagement.css';
import * as XLSX from 'xlsx';
import HistoryModal from '../components/HistoryModal.jsx';
import { exportToPdfPrint } from '../utils/pdfExport';
import html2pdf from 'html2pdf.js';
import { MONTH_OPTIONS, getYearFilterOptions } from '../utils/filterConstants';
import GenericExportModal from '../components/GenericExportModal.jsx';
import { useSettings } from '../SettingsContext.jsx';
import { hasPermission } from '../utils/roleLabel.js';
import { CMA_LOGO_BASE64 } from '../utils/logoBase64.js';
import { LETTERHEAD_BASE64 } from '../utils/letterheadBase64.js';
import {
  getAgmDueDate,
  daysUntil,
  cellStyle,
  thStyle,
  thStatusStyle,
  tdStatusStyle,
  thActionsStyle,
  tdActionsStyle,
  getDetailedRenewalStatusText,
  formatDisplayDate,
  formatOrdinalDate,
  StatusPill,
  ActionBtn,
} from '../components/mc-management/MCManagementShared.jsx';

// NOTE: This page is intentionally aligned with MCManagement UI/UX.
// It uses M.Com backend endpoints: /api/mcom and /api/mcom/bulk.

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
  orange: '#f59e0b',
};

const MCOM_EXPORT_FIELDS = [
  'File No', 'Reg Date', 'Old File No', 'New File No', 'MC Name', 'Remark', 'Address',
  'Units', 'Plan No', 'Secretary', 'Secretary Unit No', 'Treasurer', 'Treasurer Unit No',
  'Renewal Period', 'AGM Date', 'AGM Minutes', 'Attendance', 'Audited Accounts', 'Building Insurance',
  'Active / Non Active', 'Renewal Date Vise', 'AGM Date Vise', 'Renewal Status', 'AGM Status',
  'MC/M.Com', 'Engineer', 'MA', 'Town', 'Council', 'Cert File No', 'Email', 'Awareness Date',
  'Category', 'Year', 'Status'
];

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
  maxWidth: 980,
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

const inputStyle = {
  padding: '8px 11px',
  border: `1px solid ${theme.border}`,
  borderRadius: 8,
  fontSize: 13,
  fontFamily: 'inherit',
  color: theme.text,
  background: theme.card,
  width: '100%',
  boxSizing: 'border-box',
};

const sectionLabelStyle = {
  fontSize: 11,
  fontWeight: 700,
  color: theme.navy,
  textTransform: 'uppercase',
  letterSpacing: '1px',
  gridColumn: 'span 2',
  borderBottom: `1px solid ${theme.border}`,
  paddingBottom: 6,
  marginTop: 8,
};

// Column widths (px) — must sum to a reasonable table width
const COL_WIDTHS = {
  'REG DATE': 110,
  'OLD FILE NO': 130,
  'REMARK': 160,
  'NEW FILE NO': 130,
  'MANAGEMENT CORPORATION': 220,
  'ADDRESS': 220,
  'UNITS': 80,
  'PLAN NO': 110,
  'SECRETARY': 130,
  'SEC UNIT NO': 130,
  'TREASURER': 130,
  'TREAS UNIT NO': 140,
  'RENEWAL PERIOD': 160,
  'AGM DATE': 110,
  'AGM MINUTES': 130,
  'ATTENDANCE': 130,
  'AUDITED ACCOUNT': 160,
  'INSURANCE': 120,
  'ACTIVE/NON ACTIVE': 170,
  'RENEWAL DATE VISE': 170,
  'AGM DATE VISE': 150,
  'MC/M.COM': 110,
  'ENGINEER': 120,
  'MA': 110,
  'TOWN': 110,
  'COUNCIL': 140,
  'CERT FILE NO': 140,
  'EMAIL': 160,
  'AWARENESS DATE': 160,
  'STATUS': 195,
  'ACTIONS': 210,
};





function FormField({ label, value, onChange, type = 'text', span2 }) {
  const inputId = 'mcom_form_' + String(label || '').toLowerCase().replace(/[^a-z0-9]/g, '_').replace(/_+/g, '_').replace(/^_+|_+$/g, '');
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 5, gridColumn: span2 ? 'span 2' : undefined }}>
      <label htmlFor={inputId} style={{ fontSize: 12, fontWeight: 500, color: theme.text2 }}>{label}</label>
      <input id={inputId} name={inputId} type={type} value={value ?? ''} onChange={(e) => onChange(e.target.value)} style={inputStyle} />
    </div>
  );
}

function FormSelect({ label, value, onChange, options }) {
  const inputId = 'mcom_form_' + String(label || '').toLowerCase().replace(/[^a-z0-9]/g, '_').replace(/_+/g, '_').replace(/^_+|_+$/g, '');
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
      <label htmlFor={inputId} style={{ fontSize: 12, fontWeight: 500, color: theme.text2 }}>{label}</label>
      <select id={inputId} name={inputId} value={value ?? ''} onChange={(e) => onChange(e.target.value)} style={inputStyle}>
        {options.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
    </div>
  );
}

function SectionLabel({ children }) {
  return <div style={sectionLabelStyle}>{children}</div>;
}

function ViewField({ label, value }) {
  return (
    <div style={{ display: 'flex', borderBottom: `1px solid ${theme.border}`, padding: '9px 4px', fontSize: 13, alignItems: 'flex-start' }}>
      <div style={{ width: '240px', color: theme.text2, fontWeight: 600, flexShrink: 0 }}>{label}</div>
      <div style={{ color: theme.text, wordBreak: 'break-word', flex: 1 }}>{value == null || String(value).trim() === '' ? '—' : String(value)}</div>
    </div>
  );
}

function normalizeKey(k) {
  return String(k || '')
    .trim()
    .replace(/[_.\-\/]+/g, ' ')
    .replace(/\s+/g, ' ')
    .toLowerCase();
}

function normalizeHeaderName(value) {
  return normalizeKey(value);
}

function findHeaderRow(table) {
  if (!Array.isArray(table)) return -1;
  const expected = ['reg date', 'management corporation name', 'new file no', 'old file no'];
  for (let i = 0; i < Math.min(table.length, 6); i += 1) {
    const row = table[i] || [];
    const normalized = row.map(normalizeHeaderName);
    const matches = expected.filter((key) => normalized.includes(key));
    if (matches.length >= 2) return i;
  }
  return -1;
}

function parseSheetRows(ws) {
  const table = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '', raw: false });
  const headerIndex = findHeaderRow(table);
  if (headerIndex < 0) return [];
  const rawHeaders = table[headerIndex] || [];
  const headers = [];
  for (let idx = 0; idx < rawHeaders.length; idx += 1) {
    let norm = normalizeHeaderName(rawHeaders[idx]) || `col${idx}`;
    if (norm === 'unit no') {
      let prev = '';
      for (let k = idx - 1; k >= 0; k -= 1) {
        if (headers[k] && (headers[k].includes('secretary') || headers[k].includes('treasurer'))) {
          prev = headers[k];
          break;
        }
      }
      if (prev.includes('secretary')) norm = 'secretary_unit_no';
      else if (prev.includes('treasurer')) norm = 'treasurer_unit_no';
    }
    headers.push(norm);
  }
  return table.slice(headerIndex + 1).map((row) => {
    const record = {};
    for (let col = 0; col < headers.length; col += 1) {
      record[headers[col]] = row[col] ?? '';
    }
    return record;
  });
}

function getCell(row, ...keys) {
  const rk = Object.keys(row || {});
  const map = new Map(rk.map((k) => [normalizeKey(k), k]));
  for (const key of keys) {
    const found = map.get(normalizeKey(key));
    if (found) return row[found];
  }
  return '';
}

function toText(v) {
  return v === null || v === undefined ? '' : String(v).trim();
}

function toIntOrNull(v) {
  const s = toText(v);
  if (!s) return null;
  const n = Number(String(s).replace(/,/g, ''));
  return Number.isFinite(n) ? Math.trunc(n) : null;
}

function deriveYear(v) {
  const s = toText(v);
  if (!s) return null;
  const m = s.match(/(19|20)\d{2}/);
  if (m) return Number(m[0]);
  const n = Number(s);
  return Number.isFinite(n) ? Math.trunc(n) : null;
}

function coerceDateText(v) {
  if (v === null || v === undefined || v === '') return '';
  if (v instanceof Date && !Number.isNaN(v.getTime())) {
    return v.toISOString().slice(0, 10);
  }
  const text = String(v).trim();
  const numeric = Number(text);
  if (!Number.isNaN(numeric) && numeric > 1000 && numeric < 100000) {
    const epoch = new Date(Date.UTC(1899, 11, 30));
    epoch.setUTCDate(epoch.getUTCDate() + Math.floor(numeric));
    return epoch.toISOString().slice(0, 10);
  }
  const parsed = new Date(text);
  if (!Number.isNaN(parsed.getTime())) {
    return parsed.toISOString().slice(0, 10);
  }
  return text;
}

function deriveStatus(v) {
  const s = toText(v).toLowerCase();
  if (!s) return 'New';
  if (s.includes('open')) return 'Open';
  if (s.includes('pending')) return 'Pending';
  if (s.includes('close')) return 'Close';
  if (s.includes('new')) return 'New';
  return toText(v);
}

const MCOM_RENEWAL_RATES_2023 = [
  { maxUnits: null, minUnits: 101, fee: 20000 },
  { maxUnits: 100, minUnits: 76, fee: 10000 },
  { maxUnits: 75, minUnits: 51, fee: 7500 },
  { maxUnits: 50, minUnits: 41, fee: 5000 },
  { maxUnits: 40, minUnits: 31, fee: 3500 },
  { maxUnits: 30, minUnits: 21, fee: 2500 },
  { maxUnits: 20, minUnits: 11, fee: 1500 },
  { maxUnits: 10, minUnits: 1, fee: 1000 },
  { maxUnits: 0, minUnits: 0, fee: 250 },
];

const MCOM_OLD_BRACKET_PRE2023 = [
  { maxUnits: null, minUnits: 101, fee: 20000 },
  { maxUnits: 100, minUnits: 76, fee: 10000 },
  { maxUnits: 75, minUnits: 51, fee: 7500 },
  { maxUnits: 50, minUnits: 41, fee: 5000 },
  { maxUnits: 40, minUnits: 31, fee: 3500 },
  { maxUnits: 30, minUnits: 21, fee: 2500 },
  { maxUnits: 20, minUnits: 11, fee: 1500 },
  { maxUnits: 10, minUnits: 1, fee: 1000 },
];

function getMcomFeeForYear(units, year, isGov, settings, mc) {
  const u = parseInt(units) || 0;
  const rates2023 = settings?.mcom_rates_2023 || MCOM_RENEWAL_RATES_2023;
  const ratesPre2023 = settings?.mcom_rates_pre2023 || MCOM_OLD_BRACKET_PRE2023;

  const isNhda = String(mc?.mc_mcom || '').toUpperCase().includes('NHDA')
    || String(mc?.category || '').toLowerCase().includes('nhda')
    || String(mc?.file_no || '').toUpperCase().includes('NHDA')
    || String(mc?.old_file_no || '').toUpperCase().includes('NHDA')
    || String(mc?.new_file_no || '').toUpperCase().includes('NHDA');

  if (year < 2023) {
    if (isNhda || isGov) return settings?.mcom_gov_nhda_pre2023_rate ?? 250;
    const match = ratesPre2023.find(r => u >= r.minUnits && (r.maxUnits === null || u <= r.maxUnits));
    return match ? match.fee : 250;
  }

  const match = rates2023.find(r => u >= r.minUnits && (r.maxUnits === null || u <= r.maxUnits));
  return match ? match.fee : 250;
}

function getMcomAnnualFeeInfo(mc, settings) {
  const units = parseInt(mc?.units) || 0;
  const currentYear = getServerDate().getFullYear();
  const isGov = String(mc?.mc_mcom || '').toUpperCase().includes('GOV') || String(mc?.category || '').toLowerCase().includes('government');
  const feePerYear = getMcomFeeForYear(units, currentYear, isGov, settings, mc);
  return { units, feePerYear };
}

function getRenewalAmountInfo(mc, settings) {
  const { feePerYear } = getMcomAnnualFeeInfo(mc, settings);
  return { annual: feePerYear, monthly: feePerYear / 12 };
}

function buildMcomMultiYearRows(mc, settings, overrideEndYear = null) {
  const units = parseInt(mc?.units) || 0;
  const currentYear = getServerDate().getFullYear();
  const isGov = String(mc?.mc_mcom || '').toUpperCase().includes('GOV') || String(mc?.category || '').toLowerCase().includes('government');
  const isNhda = String(mc?.mc_mcom || '').toUpperCase().includes('NHDA')
    || String(mc?.category || '').toLowerCase().includes('nhda')
    || String(mc?.file_no || '').toUpperCase().includes('NHDA')
    || String(mc?.old_file_no || '').toUpperCase().includes('NHDA')
    || String(mc?.new_file_no || '').toUpperCase().includes('NHDA');

  // ── Determine the effective "last paid year" ─────────────────────────────
  // Check renewal_paid_year first, then renewal_paid_years CSV, then renewal_period text.
  function getEffectivePaidYear() {
    if (mc?.renewal_paid_year) {
      const y = parseInt(mc.renewal_paid_year);
      if (!isNaN(y) && y > 1990) return y;
    }
    if (mc?.renewal_paid_years) {
      const ys = String(mc.renewal_paid_years).split(',').map(y => parseInt(y.trim(), 10)).filter(y => !isNaN(y) && y > 1990);
      if (ys.length > 0) return Math.max(...ys);
    }
    return null;
  }

  const effectivePaidYear = getEffectivePaidYear();

  // ── If payment is approved/pending AND covers the current year → no dues ──
  // Return empty rows to show "up to date" in the modal (prevents "2027" row).
  if (effectivePaidYear !== null && effectivePaidYear >= currentYear) {
    if (mc?.renewal_payment_status === 'Approved' || mc?.renewal_payment_status === 'Pending Approval') {
      return [];
    }
  }

  let startYear = currentYear;
  if (mc?.reg_date) {
    // Attempt to extract year from "YYYY-MM-DD" or similar formats
    const yearMatch = String(mc.reg_date).trim().match(/^(\d{4})/);
    if (yearMatch) {
      startYear = parseInt(yearMatch[1], 10);
    } else {
      const d = new Date(mc.reg_date);
      if (!Number.isNaN(d.getTime())) startYear = d.getFullYear();
    }
    // Advance to the year after registration
    startYear++;
  }

  // Advance startYear past any already-paid years
  if (effectivePaidYear && effectivePaidYear >= startYear) startYear = effectivePaidYear + 1;

  // Only generate rows up to and including the end year (never future years unless overridden)
  const endYear = overrideEndYear || currentYear;
  if (startYear > endYear) return []; // All paid up

  const ssclRate = settings?.sscl_rate ?? 0.025;
  const vatRate = settings?.vat_rate ?? 0.18;
  const rows = [];
  for (let year = startYear; year <= endYear; year++) {
    const fee = getMcomFeeForYear(units, year, isGov, settings, mc);
    const sscl = parseFloat((fee * ssclRate).toFixed(2));
    const vat = parseFloat(((fee + sscl) * vatRate).toFixed(2));
    const total = parseFloat((fee + sscl + vat).toFixed(2));
    const showUnits = (year < 2023 && (isGov || isNhda)) ? '-' : units;
    rows.push({ year, units: showUnits, fee, sscl, vat, total, isGov });
  }
  return rows;
}

function getRenewalDueDate(mc) {
  const raw = mc?.renewal_date_vise || mc?.next_renewal_date || mc?.reg_date;
  const base = coerceDateText(raw);
  if (!base) return null;
  const baseDate = new Date(base);
  if (Number.isNaN(baseDate.getTime())) return null;

  let due = new Date(baseDate.getFullYear(), 11, 31);
  due.setHours(0, 0, 0, 0);

  return due;
}

function blankForm() {
  return {
    // requested fields
    reg_date: '',
    old_file_no: '',
    remark: '',
    new_file_no: '',
    management_corporation_name: '',
    address: '',
    units: '',
    plan_no: '',
    secretary: '',
    secretary_unit_no: '',
    treasurer: '',
    treasurer_unit_no: '',
    renewal_period: '',
    agm_date: '',
    agm_minutes: '',
    attendance: '',
    audited_account: '',
    building_insurance: '',
    active_non_active: '',
    renewal_date_vise: '',
    agm_date_vise: '',
    renewal_status: '',
    agm_status: '',
    mc_mcom: '',
    engineer: '',
    management_assistant: '',
    town: '',
    council: '',
    certificate_file_no: '',
    email_address: '',
    awareness_date: '',

    category: '',
    year: '',
    status: 'New',
  };
}

const BACKEND_FIELDS = [
  'reg_date',
  'old_file_no',
  'remark',
  'new_file_no',
  'management_corporation_name',
  'address',
  'units',
  'plan_no',
  'secretary',
  'secretary_unit_no',
  'treasurer',
  'treasurer_unit_no',
  'renewal_period',
  'agm_date',
  'agm_minutes',
  'attendance',
  'audited_account',
  'building_insurance',
  'active_non_active',
  'renewal_date_vise',
  'agm_date_vise',
  'renewal_status',
  'agm_status',
  'mc_mcom',
  'engineer',
  'management_assistant',
  'town',
  'council',
  'certificate_file_no',
  'email_address',
  'awareness_date',
  // filtering
  'category',
  'year',
  'status',
];

function toBackendRecordFromExcelRow(row) {
  const rawFile = toText(getCell(row,
    'file_no', 'File No', 'File Number', 'file number', 'FILE_NO', 'FILE NUMBER'));
  const newFile = toText(getCell(row,
    'New File No.', 'New File No', 'New_File_No', 'new_file_no', 'New File Number', 'new file number'));
  const oldFile = toText(getCell(row,
    'Old File No.', 'Old File No', 'Old_File_No', 'old_file_no', 'Old File Number', 'old file number'));

  const file_no = rawFile || newFile || oldFile;

  const reg_date = coerceDateText(getCell(row, 'reg_date', 'Reg_Date', 'Reg. Date', 'REG_DATE'));
  const year = deriveYear(reg_date);

  const rec = {
    file_no,
    reg_date: reg_date || null,
    old_file_no: oldFile || null,
    remark: toText(getCell(row, 'remark', 'remarks', 'Remark', 'Remarks', 'REMARK', 'REMARKS', 'Re - mark', 're mark', 'Re-mark', 'Note', 'Notes', 'note', 'notes', 'Comment', 'Comments', 'comment', 'comments', 'remarks / notes', 'remark / note')) || null,
    new_file_no: newFile || null,
    management_corporation_name:
      toText(getCell(row, 'management_corporation_name', 'Management Corporation Name', 'Name of Management Corporation - New', 'management_corporation_name')) || null,
    address: toText(getCell(row, 'address', 'Address')) || null,
    units: toText(getCell(row, 'units', 'Units')) || null,
    plan_no: toText(getCell(row, 'plan_no', 'Plan No', 'Plan No.')) || null,

    secretary: toText(getCell(row, 'secretary', 'Secretary')) || null,
    secretary_unit_no: toText(getCell(row, 'secretary_unit_no', 'Secretary unit No.', 'Secretary Unit No.', 'secretary unit no')) || null,

    treasurer: toText(getCell(row, 'treasurer', 'Treasurer')) || null,
    treasurer_unit_no: toText(getCell(row, 'treasurer_unit_no', 'Treasurer unit No.', 'Treasurer Unit No.', 'treasurer unit no')) || null,

    renewal_period: toText(getCell(row, 'renewal_period', 'Renewal Period')) || null,
    agm_date: coerceDateText(getCell(row, 'agm_date', 'AGM Date')) || null,
    agm_minutes: toText(getCell(row, 'agm_minutes', 'AGM Minutes')) || null,
    attendance: toText(getCell(row, 'attendance', 'Attendance', 'attendence', 'Attendence')) || null,

    audited_account: toText(getCell(row, 'audited_account', 'Audited Account', 'Audited_Account')) || null,
    building_insurance: toText(getCell(row, 'building_insurance', 'Building Insurance', 'Building Insuarance', 'building insuarance')) || null,
    active_non_active: toText(getCell(row, 'active_non_active', 'Active / Non Active', 'Active/Non Active', 'active non active', 'Active / Non Active')) || null,
    renewal_date_vise: toText(getCell(row, 'renewal_date_vise', 'Renewal Date Vise', 'renewal date vise')) || null,
    agm_date_vise: toText(getCell(row, 'agm_date_vise', 'AGM Date Vise', 'agm date vise')) || null,
    renewal_status: toText(getCell(row, 'renewal_status', 'Renewal Status')) || null,
    agm_status: toText(getCell(row, 'agm_status', 'AGM Status')) || null,

    mc_mcom: toText(getCell(row, 'mc_mcom', 'MC', 'MC/M.Com', 'mc_mcom', 'MC / M.Com')) || null,
    engineer: toText(getCell(row, 'engineer', 'Engineer', 'Eng.', 'Eng')) || null,
    management_assistant: toText(getCell(row, 'management_assistant', 'MA', 'Management Assistant')) || null,

    town: toText(getCell(row, 'town', 'Town')) || null,
    council: toText(getCell(row, 'council', 'Council', 'Municipal Council /Pradeshiya Saba limits', 'Municipal Council / Pradeshiya Saba limits')) || null,

    certificate_file_no: toText(getCell(row, 'certificate_file_no', 'Certificate File No.', 'Certificate_File_No', 'Certificate Division File No.', 'Certificate Division File No')) || null,
    email_address: toText(getCell(row, 'email_address', 'Email Address', 'Email_Address')) || null,

    awareness_date: coerceDateText(getCell(row, 'awareness_date', 'Awareness Date')) || null,

    // optional: category/status if sheet has them
    category: toText(getCell(row, 'category', 'Category')) || null,
    year: year || null,

    status: deriveStatus(getCell(row, 'status', 'Status')),
  };

  // Ensure all keys exist (helps bulk import)
  for (const k of BACKEND_FIELDS) {
    if (!(k in rec)) rec[k] = null;
  }

  return rec;
}

export default function MComManagement({ currentUser }) {
  const { settings } = useSettings();
  const SSCL_RATE = settings?.sscl_rate ?? 0.025;
  const VAT_RATE = settings?.vat_rate ?? 0.18;

  const auditUserLabel = currentUser?.name && currentUser?.username
    ? `${currentUser.name} (${currentUser.username})`
    : currentUser?.name || currentUser?.username || '';

  const isAGM = String(currentUser?.role || '').trim().toUpperCase() === 'AGM';
  const canEdit = hasPermission(currentUser, 'mcom', 'edit');
  const canDelete = hasPermission(currentUser, 'mcom', 'delete');
  const canCreate = hasPermission(currentUser, 'mcom', 'create');
  const canApprove = hasPermission(currentUser, 'mcom', 'approve') || isAGM;
  const canViewRecord = hasPermission(currentUser, 'mcom', 'view_record');
  const canHistory = hasPermission(currentUser, 'mcom', 'history');
  const canRenewal = hasPermission(currentUser, 'mcom', 'renewal');

  const [mcs, setMcs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isImporting, setIsImporting] = useState(false);

  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [mcToReject, setMcToReject] = useState(null);

  const [searchTerm, setSearchTerm] = useState(() => {
    const nav = localStorage.getItem('cma_mcom_navigate_search');
    if (nav) {
      localStorage.removeItem('cma_mcom_navigate_search');
      return nav;
    }
    return sessionStorage.getItem('cma_mcom_searchTerm') || '';
  });
  const [statusFilter, setStatusFilter] = useState(() => {
    const filter = localStorage.getItem('cma_mcom_filter');
    if (filter) {
      localStorage.removeItem('cma_mcom_filter');
      return filter;
    }
    return sessionStorage.getItem('cma_mcom_statusFilter') || '';
  });
  const [yearFilter, setYearFilter] = useState(() => {
    return sessionStorage.getItem('cma_mcom_yearFilter') || '';
  });
  const [monthFilter, setMonthFilter] = useState(() => {
    return sessionStorage.getItem('cma_mcom_monthFilter') || '';
  });
  const [categoryFilter, setCategoryFilter] = useState(() => {
    return sessionStorage.getItem('cma_mcom_categoryFilter') || '';
  });

  const [page, setPage] = useState(1);
  const pageSizeDefault = 20;
  const [viewAll, setViewAll] = useState(() => {
    return sessionStorage.getItem('cma_mcom_viewAll') === 'true';
  });
  const [isZoomed, setIsZoomed] = useState(() => {
    return sessionStorage.getItem('cma_mcom_isZoomed') === 'true';
  });
  const pageSize = viewAll ? 999999 : pageSizeDefault;
  const [totalCount, setTotalCount] = useState(0);
  const [globalStats, setGlobalStats] = useState([]);

  const [modalOpen, setModalOpen] = useState(false);
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [exportModalOpen, setExportModalOpen] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [editingId, setEditingId] = useState(null);

  const [formData, setFormData] = useState(blankForm());
  const [viewRecord, setViewRecord] = useState(null);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [selectedHistoryRecord, setSelectedHistoryRecord] = useState(null);
  const [toast, setToast] = useState(null);
  const [lastImportedFileNos, setLastImportedFileNos] = useState([]);
  const confirm = useConfirmDialog();

  // Renewal modal state
  const [renewalModalOpen, setRenewalModalOpen] = useState(false);
  const [renewalRecord, setRenewalRecord] = useState(null);
  const [markingRenewalPaid, setMarkingRenewalPaid] = useState(false);
  const [selectedRenewalYears, setSelectedRenewalYears] = useState([]);
  const [manualPaidYears, setManualPaidYears] = useState('');

  // - Acknowledgement letter (NEW) -
  const [ackModalOpen, setAckModalOpen] = useState(false);
  const [printingAck, setPrintingAck] = useState(false);
  const [emailPreview, setEmailPreview] = useState(null);
  const [sendingEmail, setSendingEmail] = useState(false);
  const [ackOverrides, setAckOverrides] = useState({
    refNo: '',
    date: getServerDate().toISOString().slice(0, 10),
    year: '',
    yearFrom: '',
    yearTo: '',
    amount: '0.00',
    paidDate: getServerDate().toISOString().slice(0, 10),
    signName: 'Samantha Ampagala',
    signTitle1: 'Assistant General Manager (Customer Care) ',
    signTitle2: 'Condominium Management Authority',
    toEmail: ''
  });
  // - Renewal covering letter edit overrides -
  const [rlOverrides, setRlOverrides] = useState({
    refNo: '',
    date: getServerDate().toISOString().slice(0, 10),
    signName: 'Arct.M.T. Kapila Priyantha',
    signTitle1: 'General Manager',
    signTitle2: 'Condominium Management Authority',
  });
  const [rlDefaultOverrides, setRlDefaultOverrides] = useState(null); // for undo
  const [rlLetterModalOpen, setRlLetterModalOpen] = useState(false);
  const [rlLetterRecord, setRlLetterRecord] = useState(null); // { mc, multiRows }
  const [rlSaved, setRlSaved] = useState(false);

  // --- Renewal & AGM Reminders ---
  const [reminderMcs, setReminderMcs] = useState([]);
  const [showRenewalPanel, setShowRenewalPanel] = useState(() => {
    return sessionStorage.getItem('cma_mcom_showRenewalPanel') === 'true';
  });
  const [showAgmPanel, setShowAgmPanel] = useState(() => {
    return sessionStorage.getItem('cma_mcom_showAgmPanel') === 'true';
  });

  useEffect(() => {
    try {
      sessionStorage.setItem('cma_mcom_searchTerm', searchTerm);
      sessionStorage.setItem('cma_mcom_statusFilter', statusFilter);
      sessionStorage.setItem('cma_mcom_yearFilter', yearFilter);
      sessionStorage.setItem('cma_mcom_monthFilter', monthFilter);
      sessionStorage.setItem('cma_mcom_categoryFilter', categoryFilter);
      sessionStorage.setItem('cma_mcom_viewAll', String(viewAll));
      sessionStorage.setItem('cma_mcom_isZoomed', String(isZoomed));
      sessionStorage.setItem('cma_mcom_showRenewalPanel', String(showRenewalPanel));
      sessionStorage.setItem('cma_mcom_showAgmPanel', String(showAgmPanel));
    } catch (e) { }
  }, [searchTerm, statusFilter, yearFilter, monthFilter, categoryFilter, viewAll, isZoomed, showRenewalPanel, showAgmPanel]);

  const RENEWAL_WINDOW_DAYS = 30;
  const AGM_WINDOW_DAYS = 30;

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await fetchMComs({ page: 1, limit: 1000 });
        if (!cancelled) setReminderMcs(data?.rows ?? []);
      } catch (e) {
        // reminders are a convenience feature - fail silently
      }
    })();
    return () => { cancelled = true; };
  }, [mcs]);

  const renewalReminders = useMemo(() => {
    return (reminderMcs.length > 0 ? reminderMcs : mcs || [])
      .map((mc) => ({ mc, dueDate: getRenewalDueDate(mc) }))
      .filter((r) => r.dueDate)
      .map((r) => ({ ...r, days: daysUntil(r.dueDate) }))
      .filter((r) => r.days !== null && r.days <= RENEWAL_WINDOW_DAYS)
      .sort((a, b) => a.days - b.days);
  }, [reminderMcs, mcs]);

  const [dismissedAgmReminders, setDismissedAgmReminders] = useState(() => {
    const saved = localStorage.getItem('cma_mcom_dismissed_agms');
    return saved ? JSON.parse(saved) : [];
  });

  const handleDismissAgm = (e, id) => {
    e.stopPropagation();
    const next = [...dismissedAgmReminders, id];
    setDismissedAgmReminders(next);
    localStorage.setItem('cma_mcom_dismissed_agms', JSON.stringify(next));
  };

  const agmReminders = useMemo(() => {
    return (reminderMcs.length > 0 ? reminderMcs : mcs || [])
      .filter((mc) => !dismissedAgmReminders.includes(mc.id))
      .map((mc) => ({ mc, dueDate: getAgmDueDate(mc) }))
      .filter((r) => r.dueDate)
      .map((r) => ({ ...r, days: daysUntil(r.dueDate) }))
      .filter((r) => r.days !== null && r.days >= 0 && r.days <= AGM_WINDOW_DAYS)
      .sort((a, b) => a.days - b.days);
  }, [reminderMcs, mcs, dismissedAgmReminders]);

  useEffect(() => {
    if (agmReminders.length > 0) {
      showToast(`${agmReminders.length} AGM(s) coming up within ${AGM_WINDOW_DAYS} days`, 'info');
    }
  }, [agmReminders.length]);

  useEffect(() => {
    if (renewalReminders.length > 0) {
      showToast(`${renewalReminders.length} M.Com renewal(s) due by 31 December`, 'info');
    }
  }, [renewalReminders.length]);

  const stats = useMemo(() => {
    const dataSource = globalStats.length > 0 ? globalStats : mcs;
    const active = dataSource.filter((r) => String(r.status).toLowerCase().trim() === 'active').length;
    const inactive = dataSource.filter((r) => String(r.status).toLowerCase().trim() === 'non active').length;
    const pending = dataSource.filter((r) => String(r.status).toLowerCase().trim() === 'pending').length;
    const total = dataSource.length;
    return { total, active, inactive, pending };
  }, [mcs, globalStats]);

  const filtered = mcs || [];

  const API_BASE = (import.meta.env.VITE_API_URL || '/api').trim();

  async function load() {
    setLoading(true);
    try {
      const data = await fetchMComs({
        year: yearFilter || undefined,
        month: monthFilter || undefined,
        category: categoryFilter || undefined,
        status: statusFilter || undefined,
        q: searchTerm ? searchTerm.trim() : undefined,
        page: viewAll ? 1 : page,
        limit: pageSize,
      });

      // backend returns {rows,total}
      const rows = data?.rows ?? [];
      setMcs(rows);
      setTotalCount(data?.total ?? 0);

      const allDataRes = await fetch(`${API_BASE}/mcom?limit=999999&page=1`);
      const allData = await allDataRes.json();
      setGlobalStats(allData?.rows || []);

    } catch (err) {
      // stats fetch failed — silently ignore, cards will show last known values
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    setPage(1);
  }, [statusFilter, yearFilter, monthFilter, categoryFilter, searchTerm, viewAll]);

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter, yearFilter, monthFilter, categoryFilter, searchTerm, page, viewAll]);

  function showToast(msg, type = 'success') {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 2500);
  }

  function field(key) {
    return (v) => setFormData((p) => ({ ...p, [key]: v }));
  }

  function openAdd() {
    setEditingId(null);
    setFormData(blankForm());
    setModalOpen(true);
  }

  function openEdit(mc) {
    setEditingId(mc.id);
    const f = blankForm();
    Object.keys(f).forEach((k) => {
      f[k] = mc[k] ?? '';
    });
    setFormData(f);
    setModalOpen(true);
  }

  function openView(mc) {
    setViewRecord(mc);
    setViewModalOpen(true);
  }

  async function save() {
    const file_no = toText(formData.new_file_no || formData.old_file_no).trim();
    const management_corporation_name = toText(formData.management_corporation_name).trim();

    if (!file_no) return showToast('File number is required', 'error');
    if (!management_corporation_name) return showToast('Management Corporation Name is required', 'error');

    const payload = {
      ...formData,
      file_no,
      management_corporation_name,
      units: formData.units === '' ? null : toIntOrNull(formData.units),
      year: formData.year === '' ? null : deriveYear(formData.year),
      status: formData.status || 'New',
      ...(auditUserLabel ? { created_by: auditUserLabel, modified_by: auditUserLabel } : {}),
    };

    try {
      if (editingId) {
        const r = await fetch(`${API_BASE}/mcom/${editingId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        const body = await r.json().catch(() => ({}));
        if (!r.ok) throw new Error(body.error || 'Update failed');
        showToast('M.Com updated ✅');
      } else {
        const r = await fetch(`${API_BASE}/mcom`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        const body = await r.json().catch(() => ({}));
        if (!r.ok) throw new Error(body.error || 'Create failed');
        showToast('M.Com created ✅');
      }

      setModalOpen(false);
      await load();
    } catch (e) {
      showToast(e.message || 'Save failed', 'error');
    }
  }

  async function remove(id) {
    const confirmed = await confirm({
      title: 'Delete M.Com record',
      message: 'Delete this M.Com record? This action cannot be undone.',
      confirmLabel: 'Delete',
      cancelLabel: 'Cancel',
    });
    if (!confirmed) return;
    try {
      const r = await fetch(`${API_BASE}/mcom/${id}`, { method: 'DELETE' });
      const body = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(body.error || 'Delete failed');
      showToast('Record deleted', 'error');
      await load();
    } catch (e) {
      showToast(e.message || 'Delete failed', 'error');
    }
  }

  function openRenewal(mc) {
    setRenewalRecord(mc);
    setRenewalModalOpen(true);
  }

  async function markRenewalPaid(mc, multiRows) {
    const grandTotal = multiRows.reduce((s, r) => s + r.total, 0);
    const endYear = multiRows.length > 0 ? multiRows[multiRows.length - 1].year : getServerDate().getFullYear();

    const confirmed = await confirm({
      title: 'Record Renewal Payment',
      message: `Confirm that Rs. ${Number(grandTotal || 0).toLocaleString('en-LK', { minimumFractionDigits: 2 })} has been received for this renewal? This will submit the payment for AGM approval.`,
      confirmLabel: 'Mark as Paid',
      cancelLabel: 'Cancel',
      confirmVariant: 'danger',
    });
    if (!confirmed) return;

    setMarkingRenewalPaid(true);
    try {
      const existingPaidYears = mc.renewal_paid_years ? mc.renewal_paid_years.split(',').map(y => parseInt(y.trim(), 10)).filter(y => !isNaN(y)) : [];
      let newPaidYears = manualPaidYears ? manualPaidYears.split(',').map(y => parseInt(y.trim(), 10)).filter(y => !isNaN(y)) : (multiRows.length > 0 ? multiRows.map(r => r.year) : [endYear]);
      const combinedYears = Array.from(new Set([...existingPaidYears, ...newPaidYears])).sort((a, b) => a - b);
      const latestYear = combinedYears.length > 0 ? combinedYears[combinedYears.length - 1] : endYear;

      const isActive = latestYear >= getServerDate().getFullYear();
      const targetStatus = isActive ? 'Active' : 'Non Active';

      const payload = {
        renewal_paid: true,
        renewal_paid_date: getServerDate().toISOString().slice(0, 10),
        renewal_paid_amount: parseFloat(grandTotal.toFixed(2)),
        renewal_paid_year: latestYear,
        renewal_paid_years: combinedYears.join(', '),
        renewal_payment_status: 'Pending Approval',
        renewal_period: latestYear.toString(),
        next_renewal_date: `${latestYear}-12-31`,  // Valid until Dec 31 of the latest paid year
        modified_by: auditUserLabel || 'system',
        active_non_active: targetStatus,
        renewal_date_vise: targetStatus,
        status: 'Pending',
      };
      const r = await fetch(`${API_BASE}/mcom/${mc.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const body = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(body.error || 'Update failed');

      fetch(`${API_BASE}/notifications`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'info',
          title: 'M.Com Renewal Payment Pending Approval',
          message: `Renewal payment of Rs. ${Number(grandTotal || 0).toLocaleString('en-LK', { minimumFractionDigits: 2 })} for ${mc.management_corporation_name || mc.name || 'M.Com'} (File No: ${mc.new_file_no || mc.file_no || '-'}) has been recorded by ${auditUserLabel}. Please review and approve.`,
          target_role: 'AGM',
          link: `mcom-renewal:${mc.id}`,
        }),
      }).catch(() => { });

      showToast('Renewal marked as paid successfully');
      setRenewalModalOpen(false);
      await load();
    } catch (e) {
      showToast(e.message || 'Failed to save', 'error');
    } finally {
      setMarkingRenewalPaid(false);
    }
  }

  async function approveRenewalPayment(mc, transactionRows) {
    const confirmed = await confirm({
      title: 'Approve Renewal Payment',
      message: `Are you sure you want to approve this renewal payment? This will generate the Acknowledgement letter.`,
      confirmLabel: 'Approve',
      cancelLabel: 'Cancel',
    });
    if (!confirmed) return;

    setMarkingRenewalPaid(true);
    try {
      const year = mc.renewal_paid_year || getServerDate().getFullYear();
      const isActive = year >= getServerDate().getFullYear();
      const targetStatus = isActive ? 'Active' : 'Non Active';
      const ackNo = `ACK/MCOM/${mc.new_file_no || mc.file_no || mc.id}/${year}`;
      const payload = {
        renewal_payment_status: 'Approved',
        acknowledgement_no: ackNo,
        acknowledgement_date: getServerDate().toISOString().slice(0, 10),
        renewal_paid: true,
        modified_by: auditUserLabel || 'system',
        renewal_status: targetStatus,
        renewal_date_vise: targetStatus,
        active_non_active: targetStatus,
        status: targetStatus,
        renewal_period: year.toString(),
        next_renewal_date: `${year}-12-31`  // Valid until Dec 31 of the paid year

      };
      const r = await fetch(`${API_BASE}/mcom/${mc.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const body = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(body.error || 'Approve failed');

      fetch(`${API_BASE}/notifications`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'success',
          title: 'M.Com Renewal Payment Approved',
          message: `Renewal payment for ${mc.management_corporation_name || mc.name || 'M.Com'} (File No: ${mc.new_file_no || mc.file_no || '-'}) has been approved by the AGM. Acknowledgement No: ${ackNo}. You can now download the Acknowledgement letter.`,
          target_role: 'MA',
          link: `mcom-renewal:${mc.id}`,
        }),
      }).catch(() => { });

      showToast('Renewal payment approved successfully');
      setRenewalModalOpen(false);
      await load();

      const yearsList = transactionRows ? transactionRows.map(r => r.year) : [];
      const startPaidYear = yearsList.length > 0 ? Math.min(...yearsList) : (mc.renewal_paid_year || getServerDate().getFullYear());
      const endPaidYear = mc.renewal_paid_year || (yearsList.length > 0 ? Math.max(...yearsList) : getServerDate().getFullYear());

      // Open Acknowledgement Modal
      setAckOverrides({
        refNo: mc.new_file_no || mc.file_no || ackNo,
        date: getServerDate().toISOString().slice(0, 10),
        year: String(endPaidYear),
        yearFrom: String(startPaidYear),
        yearTo: String(endPaidYear),
        amount: mc.renewal_paid_amount ? Number(mc.renewal_paid_amount).toLocaleString('en-LK', { minimumFractionDigits: 2 }) : '0.00',
        paidDate: mc.renewal_paid_date || getServerDate().toISOString().slice(0, 10),
        signName: 'Samantha Ampagala',
        signTitle1: 'Assistant General Manager (Customer Care) ',
        signTitle2: 'Condominium Management Authority',
        toEmail: mc.email_address || mc.secretary_email || ''
      });
      const updatedMc = { ...mc, ...payload };
      setViewRecord(updatedMc);
      setAckModalOpen(true);
    } catch (e) {
      showToast(e.message || 'Failed to approve', 'error');
    } finally {
      setMarkingRenewalPaid(false);
    }
  }

  async function rejectRenewalPayment(mc, reason) {
    if (!mc || !mc.id) return;
    setMarkingRenewalPaid(true);
    try {
      const payload = {
        renewal_paid: false,
        renewal_payment_status: 'Rejected',
        renewal_rejection_reason: reason,
        status: 'Non Active',
        renewal_date_vise: 'Non Active',
        active_non_active: 'Non Active'
      };
      const r = await fetch(`${API_BASE}/mcom/${mc.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const body = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(body.error || 'Failed to reject payment');

      fetch(`${API_BASE}/notifications`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'error',
          title: 'M.Com Renewal Payment Rejected',
          message: `Renewal payment for ${mc.management_corporation_name || mc.name || 'M.Com'} (File No: ${mc.new_file_no || mc.file_no || '-'}) was rejected by AGM. Reason: ${reason}. Please review and re-submit.`,
          target_role: 'MA',
          link: `mcom-renewal:${mc.id}`,
        }),
      }).catch(() => { });

      showToast('Renewal payment rejected.');
      setRenewalModalOpen(false);
      await load();
    } catch (e) {
      showToast(e.message || 'Failed to reject payment', 'error');
    } finally {
      setMarkingRenewalPaid(false);
    }
  }

  const formatDotDate = (dStr) => {
    if (!dStr) return '';
    const d = new Date(dStr);
    if (isNaN(d)) return dStr;
    const day = String(d.getDate()).padStart(2, '0');
    const mo = String(d.getMonth() + 1).padStart(2, '0');
    return `${day}.${mo}.${d.getFullYear()}`;
  };

  const escapeHtml = (unsafe) => {
    return (unsafe || '').toString()
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  };

  function renderAcknowledgementLetter(mc) {
    if (!mc) return null;
    const addressLines = String(mc.address || '')
      .split(/\r?\n|,/)
      .map((l) => l.trim())
      .filter(Boolean);
    const ackYearFrom = ackOverrides.yearFrom || ackOverrides.year;
    const ackYearTo = ackOverrides.yearTo || ackOverrides.year;
    const isMultiYearAck = ackYearFrom && ackYearTo && String(ackYearFrom) !== String(ackYearTo);

    return (
      <div className="official-letter" id="ack-letter-content-render">
        <div className="ol-ref" style={{ overflow: 'hidden', marginBottom: '25px' }}>
          <span contentEditable suppressContentEditableWarning style={{ float: 'left' }}>{ackOverrides.refNo}</span>
          <span contentEditable suppressContentEditableWarning style={{ float: 'right' }}>{formatDotDate(ackOverrides.date)}</span>
        </div>

        <div className="ol-addr" contentEditable suppressContentEditableWarning>
          <div>The Secretary,</div>
          <div>The Management Committee</div>
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
            return <div>&quot;{n}&quot;</div>;
          })()}
          {addressLines.map((line, i) => <div key={i}>{line},</div>)}
        </div>

        <p className="ol-para" contentEditable suppressContentEditableWarning>Dear Sir/Madam,</p>

        <div className="ol-title" contentEditable suppressContentEditableWarning style={{ fontWeight: 'bold', textDecoration: 'underline' }}>
          RENEWAL OF REGISTRATION OF THE MANAGEMENT COMMITTEE<br />
          {isMultiYearAck
            ? `(01 January ${ackYearFrom} – 31 December ${ackYearTo})`
            : `(01 January ${ackYearTo} – 31 December ${ackYearTo})`
          }
        </div>

        <p className="ol-para" contentEditable suppressContentEditableWarning>
          We acknowledge with thanks the receipt of the Management Committee Registration Renewal Fee amounting to Rs. {ackOverrides.amount}, which was received on <span style={{ whiteSpace: 'nowrap' }}>{formatOrdinalDate(ackOverrides.paidDate)}</span>.
        </p>

        <p className="ol-para" contentEditable suppressContentEditableWarning>
          Accordingly, the registration of the Management Committee has been renewed and is valid until <span style={{ whiteSpace: 'nowrap' }}>31<sup>st</sup> December {ackYearTo}</span>. Please note that the registration shall be renewed annually.
        </p>

        <p className="ol-para" contentEditable suppressContentEditableWarning>Thank you.</p>
        <p className="ol-para" contentEditable suppressContentEditableWarning>Yours faithfully,</p>

        <div className="ol-sign" contentEditable suppressContentEditableWarning>
          <div>{ackOverrides.signName}</div>
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
      html = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8" />
<title>Acknowledgement Letter - ${escapeHtml(viewRecord.acknowledgement_no || '')}</title>
<style>
  @page { size: A4; margin: 0; }
  * { box-sizing: border-box; }
  body { margin: 0; padding: 0; font-family: 'Times New Roman', serif; color: #111; background: #fff; }
  .doc-page { padding: 15mm; min-height: 100vh; }
  .official-letter { max-width: 680px; margin: 0 auto; padding-top: 2.2in; font-family: 'Times New Roman', serif; font-size: 16px; line-height: 1.6; }
  .ol-ref { display: flex; justify-content: space-between; margin-bottom: 25px; }
  .ol-addr { margin-bottom: 25px; }
  .ol-addr div { margin: 3px 0; }
  .ol-title { font-weight: 700; text-decoration: underline; margin: 25px 0; line-height: 1.4; text-align: left; }
  .ol-para { margin: 20px 0; text-align: justify; }
  .ol-sign { margin-top: 40px; page-break-inside: avoid; break-inside: avoid; }
  .ol-sign div { margin: 2px 0; }
  .ol-sign-space { height: 60px; }
</style>
</head>
<body>
  <div class="doc-page">
    <div class="official-letter">
      ${renderedContent.innerHTML}
    </div>
  </div>
  <script>
    window.addEventListener('load', function() {
      setTimeout(function() {
        window.focus();
        window.print();
      }, 500);
    });
  </script>
</body>
</html>`;
    }

    const blob = new Blob([html], { type: 'text/html' });
    const blobUrl = URL.createObjectURL(blob);

    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    iframe.src = blobUrl;
    document.body.appendChild(iframe);

    // The HTML itself contains a script that calls window.print() after 500ms.
    // We just clean up the hidden iframe after 10 seconds.
    setTimeout(() => {
        if (document.body.contains(iframe)) {
            document.body.removeChild(iframe);
        }
        URL.revokeObjectURL(blobUrl);
    }, 10000);
  }

  async function emailAcknowledgement() {
    if (!viewRecord) return;

    const mc = viewRecord;
    const overrides = ackOverrides || {};
    let toEmail = overrides.toEmail || mc.email_address || mc.secretary_email || '';
    if (!toEmail) {
      showToast('No email address found. Please enter a recipient email.', 'error');
      return;
    }

    const fileNo = mc.new_file_no || mc.file_no || '';
    const mcName = mc.management_corporation_name || mc.name || '';
    const subject = `Acknowledgement Letter - ${fileNo}`;

    showToast('Generating PDF and sending email...', 'info');

    try {
      const addressLines = String(mc.address || '').split(/\r?\n|,/).map((l) => l.trim()).filter(Boolean);
      const ackYearFrom = overrides.yearFrom || overrides.year || getServerDate().getFullYear();
      const ackYearTo = overrides.yearTo || overrides.year || getServerDate().getFullYear();
      const isMultiYear = String(ackYearFrom) !== String(ackYearTo);
      const yearRangeStr = isMultiYear
        ? `(01 January ${ackYearFrom} - 31 December ${ackYearTo})`
        : `(01 January ${ackYearTo} - 31 December ${ackYearTo})`;
      const displayRefNo = overrides.refNo || (String(mc.new_file_no || mc.file_no || '').startsWith('CMA/') ? (mc.new_file_no || mc.file_no || '') : `CMA/CCU/12/MCOM/${mc.new_file_no || mc.file_no || ''}`);
      const letterAmount = overrides.amount || '-';
      const letterPaidDate = overrides.paidDate ? formatOrdinalDate(overrides.paidDate) : '-';
      const letterDate = overrides.date ? formatDotDate(overrides.date) : formatDotDate(getServerDate().toISOString().slice(0, 10));
      const signName = overrides.signName || 'Samantha Ampagala';
      const signTitle1 = overrides.signTitle1 || 'Assistant General Manager (Customer Care)';
      const signTitle2 = overrides.signTitle2 || 'Condominium Management Authority';
      const mcName2 = mcName || '-';

      const { jsPDF } = await import('jspdf');
      const doc = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' });

      const pageW = 210;
      const left = 25;
      const right = pageW - 25;
      const lineH = 7;
      const paraH = 10;
      let y = 72;

      const writeLine = (text, x, fontSize = 12, style = 'normal') => {
        doc.setFont('times', style);
        doc.setFontSize(fontSize);
        doc.text(text, x, y);
        y += lineH;
      };
      const writeWrapped = (text, fontSize = 12, style = 'normal', align = 'left') => {
        doc.setFont('times', style);
        doc.setFontSize(fontSize);
        const lines = doc.splitTextToSize(text, right - left);
        doc.text(lines, left, y, { align });
        y += lines.length * lineH + 2;
      };
      const skip = (h = paraH) => { y += h; };

      try {
        doc.addImage(LETTERHEAD_BASE64, 'PNG', 0, 0, 210, 297);
      } catch (err) {
        console.warn('Letterhead image could not be loaded:', err);
      }

      doc.setFont('times', 'normal');
      doc.setFontSize(12);
      doc.text(displayRefNo, left, y);
      doc.text(letterDate, right, y, { align: 'right' });
      y += lineH;
      skip(paraH);

      writeLine('The Secretary,', left);
      if (mcName2.includes(' - ')) {
        const idx = mcName2.indexOf(' - ');
        writeLine(mcName2.substring(0, idx), left);
        writeLine(`${mcName2.substring(idx + 3)}`, left);
      } else {
        writeLine(`${mcName2}`, left);
      }
      addressLines.forEach((l) => writeLine(`${l}`, left));
      skip(paraH);

      writeLine('Dear Sir/Madam,', left);
      skip(paraH);

      doc.setFont('times', 'bold');
      doc.setFontSize(12);
      doc.setLineWidth(0.3);
      const subjectLine1 = 'RENEWAL OF REGISTRATION OF THE MANAGEMENT COMMITTEE';
      const subjectLine2 = yearRangeStr;

      const sl1w = doc.getTextWidth(subjectLine1);
      doc.text(subjectLine1, left, y);
      doc.line(left, y + 0.8, left + sl1w, y + 0.8);
      y += lineH;

      const sl2w = doc.getTextWidth(subjectLine2);
      doc.text(subjectLine2, left, y);
      doc.line(left, y + 0.8, left + sl2w, y + 0.8);
      y += lineH;
      skip(paraH);

      writeWrapped(
        `We acknowledge with thanks the receipt of the Management Committee Registration Renewal Fee amounting to Rs. ${letterAmount}, which was received on ${letterPaidDate}.`
      );
      skip(4);
      writeWrapped(
        `Accordingly, the registration of the Management Committee has been renewed and is valid until 31st December ${ackYearTo}. Please note that the registration shall be renewed annually.`
      );
      skip(4);
      writeLine('Thank you.', left);
      skip(4);
      writeLine('Yours faithfully,', left);
      skip(20);

      writeLine(signName, left, 12, 'normal');
      doc.setFont('times', 'bold');
      doc.setFontSize(12);
      doc.text(signTitle1, left, y); y += lineH;
      doc.text(signTitle2, left, y); y += lineH;

      const safeFileNo = fileNo.replace(/[/\\: ]/g, '_');
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
                      <p>Please find attached the official Acknowledgement of Registration Renewal for <strong>${mcName}</strong> (File No: ${fileNo}).</p>
                      <p>This is an automated email. Please do not reply directly to this message.</p>
                      <div style="margin-top: 30px; border-top: 1px solid #cbd5e1; padding-top: 15px; font-size: 12px; color: #64748b;">
                          <p style="margin: 0;">Customer Care Unit</p>
                          <p style="margin: 2px 0 0 0;">Condominium Management Authority</p>
                      </div>
                  </div>
              </div>
          `;

      // Show Preview Modal instead of sending immediately
      setEmailPreview({
        toEmail,
        subject,
        htmlBody,
        pdfBase64,
        pdfFileName
      });

    } catch (error) {
      console.error('Email preparation error:', error);
      showToast('Failed to prepare email: ' + error.message, 'error');
    }
  }

  async function confirmSendEmail() {
    if (!emailPreview) return;
    setSendingEmail(true);
    try {
      const response = await fetch(`${API_BASE}/send-email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(emailPreview)
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || 'Failed to send email');

      showToast('Email sent successfully! ✅');
      setEmailPreview(null);
    } catch (error) {
      console.error('Email sending error:', error);
      showToast('Failed to send email: ' + error.message, 'error');
    } finally {
      setSendingEmail(false);
    }
  }

  // ── Renewal Letter helpers (MCom) ───────────────────────────────────────────
  function getMComRlStorageKey(mc) {
    return `mcom_rl_overrides_${mc?.new_file_no || mc?.file_no || mc?.id || 'default'}`;
  }

  function loadMComRlOverrides(mc) {
    try {
      const saved = localStorage.getItem(getMComRlStorageKey(mc));
      if (saved) return JSON.parse(saved);
    } catch { }
    return null;
  }

  function saveMComRlOverrides(mc, overrides) {
    try {
      localStorage.setItem(getMComRlStorageKey(mc), JSON.stringify(overrides));
    } catch { }
  }

  function openRlLetterModal(mc, multiRows) {
    if (!mc) return;
    const saved = loadMComRlOverrides(mc);
    const fileNo = mc.new_file_no || mc.file_no || mc.old_file_no || '';

    // Calculate defaults
    const grandTotal = Array.isArray(multiRows) ? multiRows.reduce((s, r) => s + (r.total || 0), 0) : 0;
    const firstYear = Array.isArray(multiRows) && multiRows.length > 0 ? multiRows[0].year : getServerDate().getFullYear();
    const lastYear = Array.isArray(multiRows) && multiRows.length > 0 ? multiRows[multiRows.length - 1].year : getServerDate().getFullYear();
    const prevYear = firstYear - 1;
    const fmt = (n) => (n != null ? Number(n).toLocaleString('en-LK', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '-');

    const defaultBodyParagraph1 = `The Registration of your Management Committee has been expired on 31.12.${prevYear}. Therefore, please make arrangements to renew the registration of your Management Committee up to 31.12.${lastYear}.`;
    const defaultBodyParagraph2 = `Every management committee is required to pay the registration fees for the year before 31st March ${lastYear}. But since you have failed to pay the said fees so far, I hereby request you to take necessary steps to pay some of Rs. ${fmt(grandTotal)} as soon as possible with duly prepared application form (annex-01).`;

    const preRows = Array.isArray(multiRows) ? multiRows.filter(r => r.year < 2023) : [];
    const postRows = Array.isArray(multiRows) ? multiRows.filter(r => r.year >= 2023) : [];

    const preFee = preRows.reduce((s, r) => s + (r.fee || 0), 0);
    const preSscl = preRows.reduce((s, r) => s + (r.sscl || 0), 0);
    const preVat = preRows.reduce((s, r) => s + (r.vat || 0), 0);
    const preTotal = preRows.reduce((s, r) => s + (r.total || 0), 0);

    const groupRows = (rows) => {
      const groups = [];
      let cur = null;
      for (const r of rows) {
        if (cur && cur.baseFee === r.fee && cur.units === r.units) {
          cur.endYear = r.year;
          cur.fee += r.fee || 0; cur.sscl += r.sscl || 0; cur.vat += r.vat || 0; cur.total += r.total || 0;
          cur.count++;
        } else {
          cur = { ...r, startYear: r.year, endYear: r.year, count: 1, baseFee: r.fee };
          groups.push(cur);
        }
      }
      return groups;
    };

    const initialTableRows = [];
    for (const g of groupRows(preRows)) {
      initialTableRows.push({
        isPre: true,
        yearLabel: g.startYear === g.endYear ? String(g.startYear) : `${g.startYear}-${g.endYear}`,
        units: g.units,
        fee: g.fee,
        sscl: g.sscl,
        vat: g.vat,
        total: g.total
      });
    }
    for (const g of groupRows(postRows)) {
      initialTableRows.push({
        isPre: false,
        yearLabel: g.startYear === g.endYear ? String(g.startYear) : `${g.startYear}-${g.endYear}`,
        units: g.units,
        fee: g.fee,
        sscl: g.sscl,
        vat: g.vat,
        total: g.total
      });
    }

    const finalOverrides = {
      refNo: fileNo,
      date: getServerDate().toISOString().slice(0, 10),
      signName: 'Arct.M.T. Kapila Priyantha',
      signTitle1: 'General Manager',
      signTitle2: 'Condominium Management Authority',
      bodyParagraph1: defaultBodyParagraph1,
      bodyParagraph2: defaultBodyParagraph2,
      tableRows: initialTableRows,
      ...saved
    };
    if (!finalOverrides.bodyParagraph1) finalOverrides.bodyParagraph1 = defaultBodyParagraph1;
    if (!finalOverrides.bodyParagraph2) finalOverrides.bodyParagraph2 = defaultBodyParagraph2;
    if (!finalOverrides.tableRows || !finalOverrides.tableRows.length) finalOverrides.tableRows = initialTableRows;

    setRlOverrides(finalOverrides);
    setRlDefaultOverrides(finalOverrides);
    setRlLetterRecord({ mc, multiRows });
    setRlSaved(false);
    setRlLetterModalOpen(true);
  }

  function printRenewalLetter(mc, multiRows, overrides) {
    const fmt = (n) => (n != null ? Number(n).toLocaleString('en-LK', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '-');
    const formatDotDate = (dStr) => {
      if (!dStr) return '';
      const d = new Date(dStr);
      if (Number.isNaN(d.getTime())) return dStr;
      return d.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' }).replace(/\//g, '.');
    };
    const escapeHtml = (unsafe) => String(unsafe).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;');

    const fileNo = escapeHtml(mc.new_file_no || mc.file_no || mc.old_file_no || '-');
    const today = getServerDate().toISOString().slice(0, 10);
    const addressLines = String(mc.address || '').split(/\r?\n|,/).map((l) => l.trim()).filter(Boolean);
    const planNoStr = mc.plan_no ? ` Plan No. ${escapeHtml(mc.plan_no)},` : ',';

    const preRows = Array.isArray(multiRows) ? multiRows.filter(r => r.year < 2023) : [];
    const postRows = Array.isArray(multiRows) ? multiRows.filter(r => r.year >= 2023) : [];

    const preFee = preRows.reduce((s, r) => s + (r.fee || 0), 0);
    const preSscl = preRows.reduce((s, r) => s + (r.sscl || 0), 0);
    const preVat = preRows.reduce((s, r) => s + (r.vat || 0), 0);
    const preTotal = preRows.reduce((s, r) => s + (r.total || 0), 0);

    const postFee = postRows.reduce((s, r) => s + (r.fee || 0), 0);
    const postSscl = postRows.reduce((s, r) => s + (r.sscl || 0), 0);
    const postVat = postRows.reduce((s, r) => s + (r.vat || 0), 0);
    const postTotal = postRows.reduce((s, r) => s + (r.total || 0), 0);

    const grandTotal = Array.isArray(multiRows) ? multiRows.reduce((s, r) => s + (r.total || 0), 0) : 0;
    const firstYear = Array.isArray(multiRows) && multiRows.length > 0 ? multiRows[0].year : getServerDate().getFullYear();
    const lastYear = Array.isArray(multiRows) && multiRows.length > 0 ? multiRows[multiRows.length - 1].year : getServerDate().getFullYear();
    const prevYear = firstYear - 1;
    const periodLabel = firstYear === lastYear ? String(firstYear) : `(${firstYear} - ${lastYear})`;

    const groupRows = (rows) => {
      const groups = [];
      let cur = null;
      for (const r of rows) {
        if (cur && cur.baseFee === r.fee && cur.units === r.units) {
          cur.endYear = r.year;
          cur.fee += r.fee || 0; cur.sscl += r.sscl || 0; cur.vat += r.vat || 0; cur.total += r.total || 0;
          cur.count++;
        } else {
          cur = { ...r, startYear: r.year, endYear: r.year, count: 1, baseFee: r.fee };
          groups.push(cur);
        }
      }
      return groups;
    };

    const hasPre = overrides?.tableRows ? overrides.tableRows.some(r => r.isPre) : preRows.length > 0;
    const hasPost = overrides?.tableRows ? overrides.tableRows.some(r => !r.isPre) : postRows.length > 0;

    let preTable = '';
    if (hasPre) {
      const displayRows = overrides?.tableRows ? overrides.tableRows.filter(r => r.isPre) : groupRows(preRows).map(g => ({
        yearLabel: g.startYear === g.endYear ? String(g.startYear) : `${g.startYear}-${g.endYear}`,
        units: g.units,
        fee: g.fee,
        sscl: g.sscl,
        vat: g.vat,
        total: g.total
      }));
      const prePeriodLabel = displayRows.length > 1 ? `${displayRows[0].yearLabel} - ${displayRows[displayRows.length - 1].yearLabel}` : displayRows[0].yearLabel;

      preTable = `
        <p class="ol-section">Period ${prePeriodLabel}</p>
        <table class="ol-table">
          <thead>
            <tr>
              <th rowspan="2" style="min-width:55px">Year</th>
              <th colspan="5">Renewal fee</th>
            </tr>
            <tr>
              <th style="min-width:80px">No of Units</th>
              <th>Amount<br/>Rs:&nbsp;&nbsp;Cts:</th>
              <th>SSCL<br/>(${SSCL_RATE * 100}%)</th>
              <th>VAT<br/>${VAT_RATE * 100}%</th>
              <th>Total<br/>Rs:&nbsp;&nbsp;Cts:</th>
            </tr>
          </thead>
          <tbody>
            ${displayRows.map(row => `
              <tr>
                <td>${row.yearLabel}</td>
                <td>${row.units}</td>
                <td>${fmt(row.fee)}</td>
                <td>${fmt(row.sscl)}</td>
                <td>${fmt(row.vat)}</td>
                <td>${fmt(row.total)}</td>
              </tr>
            `).join('')}
            <tr class="ol-total-row">
              <td colspan="2">Total</td>
              <td>${fmt(preFee)}</td>
              <td>${fmt(preSscl)}</td>
              <td>${fmt(preVat)}</td>
              <td>${fmt(preTotal)}</td>
            </tr>
          </tbody>
        </table>`;
    }

    const transitionNote = (hasPre && hasPost)
      ? `<p class="ol-para">We wish to inform you that charges have been revised and are applicable per unit basis from 01.03.2023 as follows.</p>`
      : '';

    let postTable = '';
    if (hasPost) {
      const rows = overrides?.tableRows ? overrides.tableRows.filter(r => !r.isPre) : groupRows(postRows).map(g => ({
        yearLabel: g.startYear === g.endYear ? String(g.startYear) : `${g.startYear}-${g.endYear}`,
        units: g.units,
        fee: g.fee,
        sscl: g.sscl,
        vat: g.vat,
        total: g.total
      }));

      const totalFee = rows.reduce((s, r) => s + (parseFloat(r.fee) || 0), 0);
      const totalSscl = rows.reduce((s, r) => s + (parseFloat(r.sscl) || 0), 0);
      const totalVat = rows.reduce((s, r) => s + (parseFloat(r.vat) || 0), 0);
      const totalTotal = rows.reduce((s, r) => s + (parseFloat(r.total) || 0), 0);

      const firstPostYear = rows[0]?.yearLabel || '';
      const lastPostYear = rows[rows.length - 1]?.yearLabel || '';

      postTable = `
        <p class="ol-section">Period ${firstPostYear}${rows.length > 1 ? ` - ${lastPostYear}` : ''}</p>
        <table class="ol-table">
          <thead>
            <tr>
              <th rowspan="2" style="min-width:55px">Year</th>
              <th colspan="5">Renewal fee</th>
            </tr>
            <tr>
              <th style="min-width:80px">No of Units</th>
              <th>Amount<br/>Rs:&nbsp;&nbsp;Cts:</th>
              <th>SSCL<br/>(${SSCL_RATE * 100}%)</th>
              <th>VAT<br/>${VAT_RATE * 100}%</th>
              <th>Total<br/>Rs:&nbsp;&nbsp;Cts:</th>
            </tr>
          </thead>
          <tbody>
            ${rows.map(r => `
            <tr>
              <td>${r.yearLabel}</td>
              <td>${r.units}</td>
              <td>${fmt(r.fee)}</td>
              <td>${fmt(r.sscl)}</td>
              <td>${fmt(r.vat)}</td>
              <td>${fmt(r.total)}</td>
            </tr>`).join('')}
            <tr class="ol-total-row">
              <td colspan="2">Total</td>
              <td>${fmt(totalFee)}</td>
              <td>${fmt(totalSscl)}</td>
              <td>${fmt(totalVat)}</td>
              <td>${fmt(totalTotal)}</td>
            </tr>
          </tbody>
        </table>`;
    }

    const rl = overrides || {};
    const refDisplay = rl.refNo || fileNo;
    const dateDisplay = rl.date ? formatDotDate(rl.date) : formatDotDate(today);
    const signName = rl.signName || 'Arct.M.T. Kapila Priyantha';
    const signTitle1 = rl.signTitle1 || 'General Manager';
    const signTitle2 = rl.signTitle2 || 'Condominium Management Authority';
    const bodyParagraph1 = rl.bodyParagraph1 || `The Registration of your Management Committee has been expired on 31.12.${prevYear}. Therefore, please make arrangements to renew the registration of your Management Committee up to 31.12.${lastYear}.`;
    const bodyParagraph2 = rl.bodyParagraph2 || `Every management committee is required to pay the registration fees for the year before 31<sup>st</sup> March ${lastYear}. But since you have failed to pay the said fees so far, I hereby request you to take necessary steps to pay some of <strong>Rs. ${fmt(grandTotal)}</strong> as soon as possible with duly prepared application form (annex-01).`;

    const letterHtml = `
      <div class="official-letter">
        <div class="ol-ref"><span contenteditable="true">${escapeHtml(refDisplay)}</span><span contenteditable="true">${dateDisplay}</span></div>
        <div class="ol-addr" contenteditable="true">
          <div>The Secretary,</div>
          <div>${escapeHtml(mc.management_corporation_name || '-')}</div>
          ${addressLines.map(l => `<div>${escapeHtml(l)}</div>`).join('')}
        </div>
        <div class="ol-title" contenteditable="true">RENEWAL REGISTRATION OF THE MANAGEMENT COMMITTEE FOR YEAR<br/>${periodLabel}</div>
        <p class="ol-para" contenteditable="true">${bodyParagraph1}</p>
        
        ${preTable}
        ${transitionNote}
        ${postTable}

        <p class="ol-para" contenteditable="true">${bodyParagraph2}</p>
        <p class="ol-para" contenteditable="true">Payment with regard to the above can be paid by cash or cheque in favor of &quot;<strong>Condominium Management Authority</strong>&quot;</p>
        <div class="ol-footer" style="page-break-inside: avoid;">
          <p class="ol-para" contenteditable="true">Thank You.</p>
          <p class="ol-para" contenteditable="true">Yours Faithfully,</p>
          <div class="ol-sign" contenteditable="true">
            <div class="ol-sign-space"></div>
            <div><strong>${escapeHtml(signName)}</strong></div>
            <div><strong>${escapeHtml(signTitle1)}</strong></div>
            <div><strong>${escapeHtml(signTitle2)}</strong></div>
          </div>
        </div>
      </div>
    `;

    const dispFee = overrides?.tableRows ? overrides.tableRows.reduce((s, r) => s + (parseFloat(r.fee) || 0), 0) : (preFee + postFee);
    const dispSscl = overrides?.tableRows ? overrides.tableRows.reduce((s, r) => s + (parseFloat(r.sscl) || 0), 0) : (preSscl + postSscl);
    const dispVat = overrides?.tableRows ? overrides.tableRows.reduce((s, r) => s + (parseFloat(r.vat) || 0), 0) : (preVat + postVat);
    const dispTotal = overrides?.tableRows ? overrides.tableRows.reduce((s, r) => s + (parseFloat(r.total) || 0), 0) : grandTotal;

    const receiptHtml = `
      <div class="print-receipt">
        <div class="rc-topline"><span class="rc-regno">No. ${fileNo}</span></div>
        <div class="rc-head">
          <div class="rc-logo"><img src="${CMA_LOGO_BASE64}" alt="CMA Logo" /></div>
          <div class="rc-title">CONDOMINIUM MANAGEMENT AUTHORITY</div>
          <div class="rc-sub">Customer Care Division / Legal Division</div>
        </div>
        <div class="rc-row"><span class="rc-fill-label">DGM Finance / Shroff</span><span class="rc-fill-line"></span></div>
        <div class="rc-checkline">
          <span>Registration of Management Committee</span><span class="rc-box"></span>
          <span>/ Renewal</span><span class="rc-box">&#10003;</span>
          <span>/ Application Fee</span><span class="rc-box"></span>
          <span>/ Photocopy Charges</span><span class="rc-box"></span>
          <span>/ Others</span><span class="rc-box"></span>
        </div>
        <table>
          <tbody>
            <tr><td class="rc-label">File No</td><td>${fileNo}</td></tr>
            <tr><td class="rc-label">Name of the MC &amp; Address</td><td>${escapeHtml(mc.management_corporation_name || '-')} | ${escapeHtml(mc.plan_no || '-')}</td></tr>
            <tr><td class="rc-label">Period</td><td>01/01/${firstYear} to 31/12/${lastYear}</td></tr>
            <tr><td class="rc-label">Number of Parcels (Units)</td><td>${mc.units || 0}</td></tr>
            <tr><td class="rc-label">Fee Rs.</td><td>${fmt(dispFee)}</td></tr>
            <tr><td class="rc-label">Other Tax - SSCL (${SSCL_RATE * 100}%)</td><td>${fmt(dispSscl)}</td></tr>
            <tr><td class="rc-label">VAT (${VAT_RATE * 100}%)</td><td>${fmt(dispVat)}</td></tr>
            <tr class="rc-total"><td>Total Amount Rs.</td><td>${fmt(dispTotal)}</td></tr>
          </tbody>
        </table>
        <div class="rc-row" style="margin-top:14px"><span>Please accept Rs. ____________________ (Cash / Cheque) Cheque No. ____________________</span></div>
        <div class="rc-row"><span>Cheque Date ____________________ Branch ____________________ from the above MC.</span></div>
        <div class="rc-sign"><div>Authorized Signature</div><div>Date</div></div>
      </div>
    `;

    const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8" />
<title>Renewal Document - ${fileNo}</title>
<style>
  @page { size: A4; margin: 0; }
  * { box-sizing: border-box; }
  body { margin: 0; padding: 0; font-family: 'Times New Roman', serif; color: #111; background: #fff; }

  /* - Edit Toolbar - */
  .edit-toolbar {
    position: fixed; top: 0; left: 0; right: 0; z-index: 9999;
    background: linear-gradient(135deg, #1a1f2e 0%, #2d3550 100%);
    border-bottom: 2px solid #4f6ef7;
    box-shadow: 0 2px 12px rgba(0,0,0,0.35);
    padding: 10px 18px;
    display: flex; align-items: center; justify-content: space-between; gap: 12px;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  }
  .edit-toolbar .et-hint {
    color: #a0b0d0; font-size: 13px; display: flex; align-items: center; gap: 7px;
  }
  .edit-toolbar .et-hint svg { opacity: 0.75; flex-shrink: 0; }
  .edit-toolbar .et-btns { display: flex; gap: 8px; }
  .edit-toolbar .et-btn {
    cursor: pointer; border: none; border-radius: 6px; font-size: 13px;
    font-weight: 600; padding: 7px 16px; display: flex; align-items: center; gap: 6px;
    transition: opacity 0.15s, transform 0.1s;
  }
  .edit-toolbar .et-btn:hover { opacity: 0.85; transform: translateY(-1px); }
  .edit-toolbar .et-btn:active { transform: translateY(0); }
  .edit-toolbar .et-btn-print { background: #4f6ef7; color: #fff; }
  .edit-toolbar .et-btn-close { background: rgba(255,255,255,0.12); color: #cdd8f0; }

  /* editable focus ring */
  [contenteditable]:focus { outline: 2px dashed #4f6ef7; outline-offset: 2px; border-radius: 2px; }
  [contenteditable]:hover:not(:focus) { background: rgba(79,110,247,0.06); border-radius: 2px; }

  @media print {
    @page { margin: 0; }
    .edit-toolbar { display: none !important; }
    body { margin: 0; padding: 0; }
    [contenteditable] { outline: none !important; background: transparent !important; }
    .doc-page { 
      page-break-after: always; 
      break-after: page; 
      display: block; 
      padding-bottom: 5mm !important;
      margin-bottom: 0 !important;
    }
    .doc-page.letter-page {
      padding-top: 2.2in !important;
    }
    .official-letter { font-size: 16px; line-height: 1.25; padding: 0 5px; }
    .official-letter .ol-ref, .official-letter .ol-addr { margin-bottom: 2px; }
    .official-letter .ol-addr div { margin: 0; }
    .official-letter .ol-title { margin: 2px 0; font-size: 16px; }
    .official-letter .ol-para { margin: 4px 0; }
    .official-letter table.ol-table { font-size: 14px; margin: 4px 0; }
    .official-letter table.ol-table th, .official-letter table.ol-table td { padding: 2px 4px; }
    .official-letter .ol-sign { margin-top: 4px; }
    .official-letter .ol-sign-space { height: 10px; }
  }

  .doc-page { 
    padding: 15mm; 
    position: relative;
    page-break-after: always; 
    break-after: page; 
  }
  .doc-page.letter-page {
    padding-top: 2.2in;
    margin-top: 52px;
  }
  .doc-page:last-child {
    page-break-after: auto;
    break-after: auto;
    margin-top: 0;
  }

  /* - Covering Letter - */
  .official-letter { max-width: 700px; margin: 0 auto; padding: 10px; font-family: 'Times New Roman', serif; font-size: 16px; line-height: 1.4; color: #111; }
  .official-letter .ol-ref { display: flex; justify-content: space-between; font-weight: 700; margin-bottom: 12px; }
  .official-letter .ol-addr { margin-bottom: 12px; }
  .official-letter .ol-addr div { margin: 2px 0; }
  .official-letter .ol-title { text-align: left; font-weight: 700; text-decoration: underline; margin: 12px 0; }
  .official-letter .ol-yearline { font-weight: 700; margin: 6px 0; }
  .official-letter .ol-section { font-weight: 700; margin: 10px 0 2px; font-size: 13px; text-indent: 0; }
  .official-letter .ol-para { margin: 8px 0; text-align: justify; }
  .official-letter table.ol-table { width: 100%; border-collapse: collapse; margin: 2px 0 10px; font-size: 13px; }
  .official-letter table.ol-table th, .official-letter table.ol-table td { border: 1px solid #000; padding: 4px 6px; text-align: center; vertical-align: middle; }
  .official-letter table.ol-table th { font-weight: 700; background: #fff; }
  .official-letter table.ol-table td:first-child { text-align: left; font-weight: 600; }
  .official-letter table.ol-table .ol-total-row td { font-weight: 700; background: #f9f9f9; }
  .official-letter table.ol-table .ol-total-row td:first-child { text-align: center; }
  .official-letter .ol-sign { margin-top: 15px; page-break-inside: avoid; }
  .official-letter .ol-sign-space { height: 35px; }

  /* - Receipt - */
  .print-receipt { max-width: 680px; margin: 0 auto; padding: 10px; font-size: 14px; line-height: 1.5; }
  .print-receipt .rc-head { text-align: center; margin-bottom: 18px; }
  .print-receipt .rc-head .rc-logo img { width: 85px; height: auto; margin-bottom: 10px; }
  .print-receipt .rc-head .rc-title { font-size: 18px; font-weight: 700; }
  .print-receipt .rc-head .rc-sub { font-size: 14px; }
  .print-receipt .rc-topline { text-align: right; font-size: 14px; margin-bottom: 8px; }
  .print-receipt .rc-regno { font-weight: 700; }
  .print-receipt .rc-row { margin: 10px 0; display: flex; align-items: center; gap: 8px; }
  .print-receipt .rc-fill-label { white-space: nowrap; }
  .print-receipt .rc-fill-line { flex: 1; border-bottom: 1px dotted #666; height: 1px; margin-top: 14px; }
  .print-receipt .rc-checkline { display: flex; flex-wrap: wrap; align-items: center; gap: 6px; margin: 12px 0; padding: 10px 0; border-top: 1px solid #aaa; border-bottom: 1px solid #aaa; }
  .print-receipt .rc-box { display: inline-block; width: 16px; height: 16px; border: 1px solid #111; text-align: center; line-height: 16px; font-size: 12px; margin-right: 8px; }
  .print-receipt table { width: 100%; border-collapse: collapse; margin-top: 16px; }
  .print-receipt td { padding: 8px 5px; border-bottom: 1px dotted #666; vertical-align: top; }
  .print-receipt .rc-label { font-weight: 700; width: 48%; }
  .print-receipt .rc-total td { border-top: 2px solid #111; font-weight: 700; font-size: 15px; }
  .print-receipt .rc-sign { display: flex; justify-content: space-between; margin-top: 75px; }
  .print-receipt .rc-sign div { border-top: 1px solid #111; padding-top: 5px; width: 45%; text-align: center; }
</style>
</head>
<body>
  <div class="edit-toolbar">
    <span class="et-hint">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
      Click any text on the letter to edit it before printing
    </span>
    <div class="et-btns">
      <button class="et-btn et-btn-print" onclick="window.print()">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>
        Print
      </button>
      <button class="et-btn et-btn-close" onclick="window.close()">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        Close
      </button>
    </div>
  </div>
  <div class="doc-page letter-page">${letterHtml}</div>
  <div class="doc-page doc-page-receipt">${receiptHtml}</div>
  <script>
    window.addEventListener('load', function() {
      // Auto-adjust font size to ensure it fits on one page
      var letter = document.querySelector('.official-letter');
      if (letter) {
        var maxH = 750; // Safe max height that fits even if Chrome "Default" margins are active
        var currentSize = 16;
        while(letter.offsetHeight > maxH && currentSize > 12) {
          currentSize -= 0.2;
          letter.style.fontSize = currentSize + 'px';
          
          var title = letter.querySelector('.ol-title');
          if (title) title.style.fontSize = currentSize + 'px';
          
          var tables = letter.querySelectorAll('.ol-table');
          tables.forEach(function(t) {
            t.style.fontSize = (currentSize - 2) + 'px';
          });
        }
      }

      setTimeout(function() {
        window.focus();
        // window.print() is handled by the outer component
      }, 500);
    });
  </script>
</body>
</html>`;

    // Print directly using a hidden iframe to prevent opening a new tab
    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.right = '200vw'; // push completely off-screen
    iframe.style.bottom = '0';
    iframe.style.width = '210mm'; // Standard A4 width
    iframe.style.height = '297mm'; // Standard A4 height
    iframe.style.border = '0';
    document.body.appendChild(iframe);

    const doc = iframe.contentWindow.document;
    doc.open();
    doc.write(html);
    doc.close();

    iframe.contentWindow.focus();
    setTimeout(() => {
      iframe.contentWindow.print();
      setTimeout(() => {
        document.body.removeChild(iframe);
      }, 1000);
    }, 500);
  }

  async function handleExport(format, selectedFields = null) {
    try {
      setExporting(true);
      showToast('Preparing export...');

      const API_BASE = (import.meta.env.VITE_API_URL || '/api').trim();
      const response = await fetch(`${API_BASE}/mcom?limit=999999`);
      const result = await response.json();
      const allRecords = result.rows || result || [];

      let rows = (allRecords || []).map((r) => ({
        'File No': r.file_no ?? '',
        'Reg Date': r.reg_date ?? '',
        'Old File No': r.old_file_no ?? '',
        'New File No': r.new_file_no ?? '',
        'MC Name': r.management_corporation_name ?? '',
        'Remark': r.remark ?? '',
        'Address': r.address ?? '',
        'Units': r.units ?? '',
        'Plan No': r.plan_no ?? '',
        'Secretary': r.secretary ?? '',
        'Secretary Unit No': r.secretary_unit_no ?? '',
        'Treasurer': r.treasurer ?? '',
        'Treasurer Unit No': r.treasurer_unit_no ?? '',
        'Renewal Period': r.renewal_period ?? '',
        'AGM Date': r.agm_date ?? '',
        'AGM Minutes': r.agm_minutes ?? '',
        'Attendance': r.attendance ?? '',
        'Audited Accounts': r.audited_account ?? '',
        'Building Insurance': r.building_insurance ?? '',
        'Active / Non Active': r.active_non_active ?? '',
        'Renewal Date Vise': r.renewal_date_vise ?? '',
        'AGM Date Vise': r.agm_date_vise ?? '',
        'Renewal Status': r.renewal_status ?? '',
        'AGM Status': r.agm_status ?? '',
        'MC/M.Com': r.mc_mcom ?? '',
        'Engineer': r.engineer ?? '',
        'MA': r.management_assistant ?? '',
        'Town': r.town ?? '',
        'Council': r.council ?? '',
        'Cert File No': r.certificate_file_no ?? '',
        'Email': r.email_address ?? '',
        'Awareness Date': r.awareness_date ?? '',
        'Category': r.category ?? '',
        'Year': r.year ?? '',
        'Status': r.status ?? '',
      }));

      if (selectedFields && selectedFields.length > 0) {
        rows = rows.map((r) => {
          const newRow = {};
          selectedFields.forEach((f) => {
            if (r[f] !== undefined) newRow[f] = r[f];
          });
          return newRow;
        });
      }

      if (format === 'pdf') {
        exportToPdfPrint('M.Com Records', rows);
        setExportModalOpen(false);
        showToast('PDF print dialog opened successfully');
        return;
      }

      const ws = XLSX.utils.json_to_sheet(rows);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'M.Com Records');
      XLSX.writeFile(wb, `CMA_MCom_Records_${getServerDate().toISOString().split('T')[0]}.xlsx`);
      setExportModalOpen(false);
      showToast('Exported ✅');
    } catch (err) {
      showToast(err.message || 'Export failed', 'error');
    } finally {
      setExporting(false);
    }
  }

  async function importExcel(e) {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsImporting(true);
      const buf = await file.arrayBuffer();
      const wb = XLSX.read(new Uint8Array(buf), { type: 'array' });
      let allRows = [];
      for (const sheetName of wb.SheetNames) {
        const ws = wb.Sheets[sheetName];
        const rows = parseSheetRows(ws);
        allRows.push(...rows);
      }
      if (!allRows.length) return showToast('No data found in any sheet', 'error');

      // Some Excel sheets may use different header names for management corporation name.
      // Don’t block import only because `management_corporation_name` didn’t map.
      const records = allRows
        .map(toBackendRecordFromExcelRow)
        .filter((r) => toText(r.file_no) || toText(r.new_file_no) || toText(r.old_file_no))
        .map((record) => ({
          ...record,
          ...(auditUserLabel ? { created_by: auditUserLabel, modified_by: auditUserLabel } : {}),
        }));

      if (!records.length) return showToast('No valid records found (missing file_no)', 'error');

      await importMComsBulk(records);
      showToast(`Imported ${records.length} records ✅`);
      setLastImportedFileNos(records.map((x) => x.file_no).filter(Boolean));
      await load();
    } catch (err) {
      showToast(err.message || 'Import failed', 'error');
    } finally {
      setIsImporting(false);
      e.target.value = '';
    }
  }

  async function handleDeleteImported() {
    if (!lastImportedFileNos.length) return showToast('No imported batch to delete', 'error');
    const confirmed = await confirm({
      title: 'Delete imported M.Com records',
      message: `Delete ${lastImportedFileNos.length} imported records? This cannot be undone.`,
      confirmLabel: 'Delete',
      cancelLabel: 'Cancel',
    });
    if (!confirmed) return;
    try {
      const res = await deleteMComsBulk(lastImportedFileNos);
      showToast(`Deleted ${res.deleted || lastImportedFileNos.length} records ✅`, 'success');
      setLastImportedFileNos([]);
      await load();
    } catch (err) {
      showToast(err.message || 'Delete failed', 'error');
    }
  }

  async function handleDeleteAll() {
    const confirmed = await confirm({
      title: 'Delete all M.Com records',
      message: 'Delete ALL M.Com records? This cannot be undone.',
      confirmLabel: 'Delete all',
      cancelLabel: 'Cancel',
    });
    if (!confirmed) return;
    try {
      const API_BASE = (import.meta.env.VITE_API_URL || '/api').trim();
      const r = await fetch(`${API_BASE}/mcom`, { method: 'DELETE' });
      const res = await r.json();
      if (!r.ok) throw new Error(res.error || 'Delete all failed');
      showToast(`Deleted all M.Com records ✅`);
      setLastImportedFileNos([]);
      await load();
    } catch (err) {
      showToast(err.message || 'Delete all failed', 'error');
    }
  }

  const TABLE_HEADERS = [
    'REG DATE',
    'OLD FILE NO',
    'REMARK',
    'NEW FILE NO',
    'MANAGEMENT CORPORATION',
    'ADDRESS',
    'UNITS',
    'PLAN NO',
    'SECRETARY',
    'SEC UNIT NO',
    'TREASURER',
    'TREAS UNIT NO',
    'RENEWAL PERIOD',
    'AGM DATE',
    'AGM MINUTES',
    'ATTENDANCE',
    'AUDITED ACCOUNT',
    'INSURANCE',
    'ACTIVE/NON ACTIVE',
    'RENEWAL DATE VISE',
    'AGM DATE VISE',
    'MC/M.COM',
    'ENGINEER',
    'MA',
    'TOWN',
    'COUNCIL',
    'CERT FILE NO',
    'EMAIL',
    'AWARENESS DATE',
    'STATUS',
    'ACTIONS',
  ];

  async function openViewById(mcIdOrPlan) {
    if (!mcIdOrPlan) return;
    try {
      const mcIdNum = parseInt(mcIdOrPlan, 10);
      let match = mcs.find(m => m.id === mcIdNum || String(m.plan_no).trim().toLowerCase() === String(mcIdOrPlan).trim().toLowerCase());
      if (!match) {
        const API_BASE = (import.meta.env.VITE_API_URL || '/api').trim();
        try {
          const res = await fetch(`${API_BASE}/mcom/${mcIdOrPlan}`);
          if (res.ok) {
            const data = await res.json();
            if (data && data.id) match = data;
          }
        } catch (e) { }
      }
      if (match) {
        setViewRecord(match);
        setViewModalOpen(true);
      } else {
        setSearchTerm(mcIdOrPlan);
      }
    } catch (e) {
      console.error('Failed to open MCom by id:', e);
    }
  }

  async function openRenewalById(id) {
    if (!id) return;
    const match = mcs.find(m => String(m.id) === String(id));
    if (match) {
      openRlLetterModal(match, buildMcomMultiYearRows(match, settings));
      return;
    }
    const API_BASE = import.meta.env.VITE_API_URL ?? '/api';
    try {
      const response = await fetch(`${API_BASE}/mcom/${encodeURIComponent(id)}`);
      if (!response.ok) return;
      const mc = await response.json();
      if (mc) openRlLetterModal(mc, buildMcomMultiYearRows(mc, settings));
    } catch (e) {
      console.error('Failed to open MCom renewal by id:', e);
    }
  }

  const _pendingOpenHandled = useRef(false);
  useEffect(() => {
    // Only process once, and only after data has loaded (mcs is non-empty or we've waited long enough)
    if (_pendingOpenHandled.current) return;
    const pendingId = sessionStorage.getItem('cma_open_mcom_id');
    const pendingRenewalId = sessionStorage.getItem('cma_open_mcom_renewal_id');
    if (!pendingId && !pendingRenewalId) return; // nothing to do
    
    _pendingOpenHandled.current = true;
    if (pendingId) {
      sessionStorage.removeItem('cma_open_mcom_id');
      openViewById(pendingId);
    }

    if (pendingRenewalId) {
      sessionStorage.removeItem('cma_open_mcom_renewal_id');
      openRenewalById(pendingRenewalId);
    }
  }, [mcs]);

  useEffect(() => {
    const handleOpenEvent = (event) => {
      openViewById(event?.detail);
    };
    const handleOpenRenewalEvent = (event) => {
      openRenewalById(event?.detail);
    };
    window.addEventListener('cma:open-mcom-id', handleOpenEvent);
    window.addEventListener('cma:open-mcom-renewal', handleOpenRenewalEvent);
    return () => {
      window.removeEventListener('cma:open-mcom-id', handleOpenEvent);
      window.removeEventListener('cma:open-mcom-renewal', handleOpenRenewalEvent);
    };
  }, [mcs]);

  useEffect(() => {
    const handleFilterEvent = (event) => {
      if (event?.detail) {
        setStatusFilter(event.detail);
        setSearchTerm('');
        setYearFilter('');
        setMonthFilter('');
        setCategoryFilter('');
      }
    };
    window.addEventListener('cma:filter-mcom', handleFilterEvent);
    return () => window.removeEventListener('cma:filter-mcom', handleFilterEvent);
  }, []);

  const maxPage = Math.max(1, Math.ceil(totalCount / pageSize));

  return (
    <div style={{ padding: 24, fontFamily: "var(--font-sans)", background: theme.bg, minHeight: '100vh' }}>
      <style>{`
        .official-letter { max-width: 680px; margin: 0; padding: 24px; font-family: 'Times New Roman', serif; color: #111; font-size: 16px; line-height: 1.4; }
        .official-letter .ol-ref { display: flex; justify-content: space-between; font-weight: 700; margin-bottom: 12px; }
        .official-letter .ol-addr { margin-bottom: 10px; }
        .official-letter .ol-addr div { margin: 1px 0; }
        .official-letter .ol-title { text-align: left; font-weight: 700; text-decoration: underline; margin: 12px 0; white-space: normal; }
        .official-letter .ol-yearline { font-weight: 700; margin: 4px 0; }
        .official-letter .ol-para { margin: 6px 0; text-align: justify; }
        .official-letter table.ol-table { width: 100%; border-collapse: collapse; margin: 6px 0 10px; font-size: 12px; }
        .official-letter table.ol-table th, .official-letter table.ol-table td { border: 1px solid #444; padding: 4px 5px; text-align: center; }
        .official-letter table.ol-table th { font-weight: 700; background: #f4f4f4; }
        .official-letter table.ol-table .ol-total-row td { font-weight: 700; }
        .official-letter .ol-sign { margin-top: 15px; page-break-inside: avoid; }
        .official-letter .ol-sign-space { height: 35px; }
        @media print {
          .official-letter { padding: 6px 10px; font-size: 13.5px; }
        }
      `}</style>
      <div style={{ fontSize: 12, color: '#999', marginBottom: 16 }}>
        <span>Home</span> / <span>M.Com Management</span>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 10 }}>
        <div>
          <h2 style={{ fontSize: 19, fontWeight: 600, margin: 0, color: theme.text }}>M.Com Management</h2>
          <p style={{ color: '#999', fontSize: 13, margin: '4px 0 0 0' }}>M.Com list records</p>
        </div>

        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          <button onClick={() => setExportModalOpen(true)} style={btnOutline}>
            <i className="fas fa-upload" /> Export
          </button>
          {canCreate && (
            <label style={{ ...btnOutline, cursor: 'pointer', margin: 0 }}>
              <i className="fas fa-upload" /> Import
              <input type="file" accept=".xlsx,.xls" style={{ display: 'none' }} onChange={importExcel} />
            </label>
          )}
          {canDelete && (
            <button onClick={handleDeleteAll} style={{ ...btnOutline, color: theme.red, borderColor: theme.red }} title="Delete all M.Com Records">
              <i className="fas fa-trash" /> Delete All
            </button>
          )}
          {canDelete && lastImportedFileNos && lastImportedFileNos.length > 0 && (
            <button onClick={handleDeleteImported} style={{ ...btnOutline, color: theme.red, borderColor: theme.red }} title="Delete imported batch">
              <i className="fas fa-trash" /> Delete Imported
            </button>
          )}

          {/* Renewal Reminder Bell */}
          <div style={{ position: 'relative' }}>
            <button
              onClick={() => { setShowRenewalPanel((v) => !v); setShowAgmPanel(false); }}
              style={{ ...btnOutline, position: 'relative' }}
              title="Renewal reminders - every renewal period ends 31 December"
            >
              <i className="fas fa-sync-alt" /> Renewals
              {renewalReminders.length > 0 && (
                <span style={{ position: 'absolute', top: -6, right: -6, background: theme.red, color: '#fff', borderRadius: 999, fontSize: 10, fontWeight: 700, minWidth: 16, height: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 4px' }}>
                  {renewalReminders.length}
                </span>
              )}
            </button>
            {showRenewalPanel && (
              <div style={{ position: 'absolute', right: 0, top: '110%', width: 340, maxHeight: 400, overflowY: 'auto', background: '#fff', border: `1px solid ${theme.border}`, borderRadius: 10, boxShadow: '0 12px 34px rgba(0,0,0,.18)', zIndex: 500 }}>
                <div style={{ padding: '10px 14px', fontWeight: 700, fontSize: 13, color: theme.navy, borderBottom: `1px solid ${theme.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span>Renewals - period ends 31 December</span>
                  <button onClick={() => setShowRenewalPanel(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: theme.text3, fontSize: 14, lineHeight: 1, padding: 4 }} title="Close">
                    <i className="fas fa-times" />
                  </button>
                </div>
                {renewalReminders.length === 0 ? (
                  <div style={{ padding: 14, fontSize: 12, color: theme.text3 }}>No renewals due soon.</div>
                ) : renewalReminders.map(({ mc, days }) => {
                  const info = getRenewalAmountInfo(mc, settings);
                  return (
                    <div key={mc.id} style={{ padding: '10px 14px', borderBottom: `1px solid ${theme.border}`, cursor: 'pointer' }} onClick={() => { openView(mc); setShowRenewalPanel(false); }}>
                      <div style={{ fontSize: 12.5, fontWeight: 600, color: theme.text }}>{mc.management_corporation_name || mc.name}</div>
                      <div style={{ fontSize: 10.5, color: theme.text3 }}>File No: {mc.new_file_no || mc.file_no || mc.old_file_no || '-'}</div>
                      <div style={{ fontSize: 11, color: days < 0 ? theme.red : theme.text2, marginTop: 2 }}>
                        {days < 0 ? `Overdue by ${Math.abs(days)} day(s)` : days === 0 ? 'Due today' : `Due in ${days} day(s)`}
                      </div>
                      {info && (
                        <div style={{ fontSize: 11, color: theme.text3, marginTop: 2 }}>
                          Annual: Rs. {info.annual.toFixed(2)} &middot; Monthly: Rs. {info.monthly.toFixed(2)}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* AGM Reminder Bell */}
          <div style={{ position: 'relative' }}>
            <button
              onClick={() => { setShowAgmPanel((v) => !v); setShowRenewalPanel(false); }}
              style={{ ...btnOutline, position: 'relative' }}
              title={`AGM reminders - shown ${AGM_WINDOW_DAYS} days before the AGM date`}
            >
              <i className="fas fa-bell" /> AGM
              {agmReminders.length > 0 && (
                <span style={{ position: 'absolute', top: -6, right: -6, background: theme.blue, color: '#fff', borderRadius: 999, fontSize: 10, fontWeight: 700, minWidth: 16, height: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 4px' }}>
                  {agmReminders.length}
                </span>
              )}
            </button>
            {showAgmPanel && (
              <div style={{ position: 'absolute', right: 0, top: '110%', width: 320, maxHeight: 400, overflowY: 'auto', background: '#fff', border: `1px solid ${theme.border}`, borderRadius: 10, boxShadow: '0 12px 34px rgba(0,0,0,.18)', zIndex: 500 }}>
                <div style={{ padding: '10px 14px', fontWeight: 700, fontSize: 13, color: theme.navy, borderBottom: `1px solid ${theme.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span>AGMs - reminder {AGM_WINDOW_DAYS} days before</span>
                  <button onClick={() => setShowAgmPanel(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: theme.text3, fontSize: 14, lineHeight: 1, padding: 4 }} title="Close">
                    <i className="fas fa-times" />
                  </button>
                </div>
                {agmReminders.length === 0 ? (
                  <div style={{ padding: 14, fontSize: 12, color: theme.text3 }}>No AGMs scheduled soon.</div>
                ) : agmReminders.map(({ mc, days }) => (
                  <div key={mc.id} style={{ padding: '10px 14px', borderBottom: `1px solid ${theme.border}`, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }} onClick={() => { openView(mc); setShowAgmPanel(false); }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 12.5, fontWeight: 600, color: theme.text }}>{mc.management_corporation_name || mc.name || '-'}</div>
                      <div style={{ fontSize: 10.5, color: theme.text3 }}>File No: {mc.new_file_no || mc.file_no || mc.old_file_no || '-'}</div>
                      <div style={{ fontSize: 11, color: days === 0 ? theme.red : theme.text2, marginTop: 2 }}>
                        {days === 0 ? 'AGM is TODAY' : `AGM in ${days} day(s)`} &middot; {mc.agm_date || mc.agm_date_vise || '-'}
                      </div>
                    </div>
                    <button
                      onClick={(e) => handleDismissAgm(e, mc.id)}
                      title="Dismiss reminder"
                      style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, color: theme.text3, opacity: 0.6 }}
                    >
                      <i className="fas fa-times" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {canCreate && (
            <button onClick={openAdd} style={btnPrimary}>
              <i className="fas fa-plus" /> Add M.Com
            </button>
          )}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))', gap: 14, marginBottom: 16 }}>
        {[
          { label: 'TOTAL MCOM', value: stats.total, icon: 'fa-folder-open', color: theme.blue, filterValue: '' },
          { label: 'ACTIVE', value: stats.active, icon: 'fa-check-circle', color: theme.green, filterValue: 'Active' },
          { label: 'NON ACTIVE', value: stats.inactive, icon: 'fa-ban', color: theme.text2, filterValue: 'Non Active' },
          { label: 'PENDING', value: stats.pending, icon: 'fa-exclamation', color: theme.red, filterValue: 'Pending' },
        ].map(({ label, value, icon, color, filterValue }) => {
          const isActive = statusFilter === filterValue;
          return (
            <div
              key={label}
              onClick={() => setStatusFilter(filterValue)}
              style={{
                background: theme.card,
                borderRadius: 12,
                padding: 18,
                border: isActive ? `2px solid ${color || theme.blue}` : `1px solid ${theme.border}`,
                cursor: 'pointer',
                transition: 'box-shadow 0.15s, border 0.15s',
                boxShadow: isActive ? `0 0 0 3px ${(color || theme.blue)}22` : 'none',
              }}
              onMouseEnter={(e) => { if (!isActive) e.currentTarget.style.boxShadow = '0 2px 10px rgba(0,0,0,0.1)'; }}
              onMouseLeave={(e) => { if (!isActive) e.currentTarget.style.boxShadow = 'none'; }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ fontSize: 24, color: color || theme.blue, opacity: 0.7 }}>
                  <i className={`fas ${icon}`} />
                </div>
                <div>
                  <div style={{ fontSize: 11, color: theme.text3, textTransform: 'uppercase', letterSpacing: '.8px', fontWeight: 500 }}>{label}</div>
                  <div style={{ fontSize: 22, fontWeight: 700, color: color || theme.text }}>{value}</div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className={`cma-table-card-container ${isZoomed ? 'table-fullscreen-mode' : ''}`} style={{ background: theme.card, borderRadius: 12, border: `1px solid ${theme.border}`, boxShadow: '0 2px 12px rgba(0,0,0,.07)', overflow: 'hidden' }}>
        <div style={{ padding: '10px 14px', borderBottom: `1px solid ${theme.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: theme.text, whiteSpace: 'nowrap', marginRight: 4 }}>All M.Com Records</div>
          <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap', flex: '1 1 auto', justifyContent: 'flex-end' }}>
            <div style={{ position: 'relative', flex: '1 1 180px', maxWidth: 260 }}>
              <i className="fas fa-search" style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#999', fontSize: 12 }}></i>
              <input
                id="mcom_search_input"
                name="mcom_search_input"
                aria-label="Search M.Com"
                type="text"
                placeholder="Search M.Com…"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{ padding: '5px 8px 5px 28px', height: 30, borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 12, width: '100%', outline: 'none', transition: 'border-color 0.2s', boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.02)' }}
                onFocus={(e) => e.target.style.borderColor = '#3b82f6'}
                onBlur={(e) => e.target.style.borderColor = '#cbd5e1'}
              />
            </div>
            <select
              id="mcom_status_filter"
              name="mcom_status_filter"
              aria-label="Filter Status"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              style={{ padding: '5px 8px', height: 30, borderRadius: 4, border: '1px solid #ddd', fontSize: 12, width: 110 }}
            >
              <option value="">All Status</option>
              <option value="New">New</option>
              <option value="Active">Active</option>
              <option value="Non Active">Non Active</option>
              <option value="Pending">Pending</option>
            </select>
            <select
              id="mcom_year_filter"
              name="mcom_year_filter"
              aria-label="Filter Year"
              value={yearFilter}
              onChange={(e) => setYearFilter(e.target.value)}
              style={{ padding: '5px 8px', height: 30, borderRadius: 4, border: '1px solid #ddd', fontSize: 12, width: 95 }}
            >
              <option value="">All Years</option>
              {getYearFilterOptions().map((y) => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
            <select
              id="mcom_month_filter"
              name="mcom_month_filter"
              aria-label="Filter Month"
              value={monthFilter}
              onChange={(e) => setMonthFilter(e.target.value)}
              style={{ padding: '5px 8px', height: 30, borderRadius: 4, border: '1px solid #ddd', fontSize: 12, width: 110 }}
            >
              <option value="">All Months</option>
              {MONTH_OPTIONS.map((m) => (
                <option key={m.value} value={m.value}>{m.label}</option>
              ))}
            </select>
            <select
              id="mcom_category_filter"
              name="mcom_category_filter"
              aria-label="Filter Category"
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              style={{ padding: '5px 8px', height: 30, borderRadius: 4, border: '1px solid #ddd', fontSize: 12, width: 130 }}
            >
              <option value="">All Categories</option>
              <option value="PVT M.COM">PVT M.COM</option>
              <option value="GOV M.COM">GOV M.COM</option>
            </select>
          </div>
        </div>

        <div style={{ padding: '12px 18px', borderBottom: `1px solid ${theme.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <div style={{ fontSize: 13, color: theme.text2 }}>
            Showing <strong>{loading ? 0 : filtered.length}</strong> of <strong>{totalCount}</strong>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            {!viewAll && (
              <>
                <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}
                  style={page === 1 ? { ...btnOutline, opacity: 0.5, cursor: 'not-allowed', padding: '5px 10px', fontSize: 12 } : { ...btnOutline, padding: '5px 10px', fontSize: 12 }}
                >Prev</button>
                <span style={{ fontSize: 12, color: theme.text3 }}>Page <strong style={{ color: theme.text }}>{page}</strong> / {maxPage}</span>
                <button onClick={() => setPage((p) => Math.min(maxPage, p + 1))} disabled={page >= maxPage}
                  style={page >= maxPage ? { ...btnOutline, opacity: 0.5, cursor: 'not-allowed', padding: '5px 10px', fontSize: 12 } : { ...btnOutline, padding: '5px 10px', fontSize: 12 }}
                >Next</button>
              </>
            )}
            {/* VIEW ALL TOGGLE BUTTON IN PAGINATION */}
            <button
              onClick={() => setViewAll(v => !v)}
              className="mc-btn-base"
              style={viewAll ? { background: '#10b981', color: '#ffffff', border: 'none', padding: '5px 12px', fontSize: 12, marginRight: 8 } : { background: '#f1f5f9', color: '#334155', border: '1px solid #cbd5e1', padding: '5px 12px', fontSize: 12, marginRight: 8 }}
              title="Toggle between showing all records and paginated view"
            >
              <i className={viewAll ? "fas fa-check-circle" : "fas fa-list"} style={{ marginRight: 5 }} />
              {viewAll ? 'Showing All Records (View Paging)' : 'View All Records'}
            </button>
            {/* ZOOM BUTTON */}
            <button
              onClick={() => {
                const next = !isZoomed;
                setIsZoomed(next);
                if (typeof setViewAll === 'function') setViewAll(next);
              }}
              className="mc-btn-base"
              style={{ background: '#e0e7ff', color: '#4338ca', border: '1px solid #c7d2fe', padding: '5px 12px', fontSize: 12, marginLeft: 8 }}
            >
              {isZoomed ? (
                <>
                  <i className="fas fa-compress" style={{ marginRight: 6 }} /> Exit Zoom
                </>
              ) : (
                <>
                  <i className="fas fa-expand" style={{ marginRight: 6 }} /> Zoom Table
                </>
              )}
            </button>
          </div>
        </div>

        <div className="mc-table-wrapper" style={{ overflowX: 'auto', maxHeight: 'calc(100vh - 320px)', overflowY: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12, tableLayout: 'fixed' }}>
            <colgroup>
              {TABLE_HEADERS.map((h) => (
                <col key={h} style={{ width: COL_WIDTHS[h] }} />
              ))}
            </colgroup>
            <thead>
              <tr>
                {TABLE_HEADERS.map((h) => (
                  <th key={h} className={h === 'ACTIONS' ? 'mc-th-actions' : h === 'STATUS' ? 'mc-th-status' : ''} style={h === 'ACTIONS' ? { ...thActionsStyle, width: COL_WIDTHS[h] } : h === 'STATUS' ? { ...thStatusStyle, width: COL_WIDTHS[h] } : { ...thStyle, width: COL_WIDTHS[h] }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={TABLE_HEADERS.length} style={{ padding: 24, textAlign: 'center', color: theme.text3 }}>Loading…</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={TABLE_HEADERS.length} style={{ padding: 24, textAlign: 'center', color: theme.text3 }}>No M.Com records found</td></tr>
              ) : (
                filtered.map((mc) => (
                  <tr key={mc.id} style={{ borderBottom: `1px solid ${theme.border}`, opacity: loading ? 0.6 : 1, transition: 'opacity 0.2s', cursor: 'pointer' }}
                    onClick={() => openView(mc)}
                    onMouseEnter={(e) => e.currentTarget.style.background = '#f0f4ff'}
                    onMouseLeave={(e) => e.currentTarget.style.background = ''}
                  >
                    <td style={cellStyle} title={mc.reg_date || '—'}>{mc.reg_date || '—'}</td>
                    <td style={cellStyle} title={mc.old_file_no || '—'}>{mc.old_file_no || '—'}</td>
                    <td style={cellStyle} title={mc.remark || '—'}>{mc.remark || '—'}</td>
                    <td style={cellStyle} title={mc.new_file_no || '—'}>{mc.new_file_no || '—'}</td>
                    <td style={cellStyle} title={mc.management_corporation_name || '—'}>{mc.management_corporation_name || '—'}</td>
                    <td style={cellStyle} title={mc.address || '—'}>{mc.address || '—'}</td>
                    <td style={cellStyle}>{mc.units ?? '—'}</td>
                    <td style={cellStyle} title={mc.plan_no || '—'}>{mc.plan_no || '—'}</td>
                    <td style={cellStyle} title={mc.secretary || '—'}>{mc.secretary || '—'}</td>
                    <td style={cellStyle} title={mc.secretary_unit_no || '—'}>{mc.secretary_unit_no || '—'}</td>
                    <td style={cellStyle} title={mc.treasurer || '—'}>{mc.treasurer || '—'}</td>
                    <td style={cellStyle} title={mc.treasurer_unit_no || '—'}>{mc.treasurer_unit_no || '—'}</td>
                    <td style={cellStyle} title={mc.renewal_period || '—'}>{mc.renewal_period || '—'}</td>
                    <td style={cellStyle} title={mc.agm_date || '—'}>{mc.agm_date || '—'}</td>
                    <td style={cellStyle} title={mc.agm_minutes || '—'}>{mc.agm_minutes || '—'}</td>
                    <td style={cellStyle} title={mc.attendance || '—'}>{mc.attendance || '—'}</td>
                    <td style={cellStyle} title={mc.audited_account || '—'}>{mc.audited_account || '—'}</td>
                    <td style={cellStyle} title={mc.building_insurance || '—'}>{mc.building_insurance || '—'}</td>
                    <td style={cellStyle} title={mc.active_non_active || '—'}>{mc.active_non_active || '—'}</td>
                    <td style={cellStyle} title={mc.renewal_date_vise || '—'}>{mc.renewal_date_vise || '—'}</td>
                    <td style={cellStyle} title={mc.agm_date_vise || '—'}>{mc.agm_date_vise || '—'}</td>
                    <td style={cellStyle} title={mc.mc_mcom || '—'}>{mc.mc_mcom || '—'}</td>
                    <td style={cellStyle} title={mc.engineer || '—'}>{mc.engineer || '—'}</td>
                    <td style={cellStyle} title={mc.management_assistant || '—'}>{mc.management_assistant || '—'}</td>
                    <td style={cellStyle} title={mc.town || '—'}>{mc.town || '—'}</td>
                    <td style={cellStyle} title={mc.council || '—'}>{mc.council || '—'}</td>
                    <td style={cellStyle} title={mc.certificate_file_no || '—'}>{mc.certificate_file_no || '—'}</td>
                    <td style={cellStyle} title={mc.email_address || '—'}>{mc.email_address || '—'}</td>
                    <td style={cellStyle} title={mc.awareness_date || '—'}>{mc.awareness_date || '—'}</td>
                    <td className="mc-td-status" style={tdStatusStyle}>
                      <StatusPill status={mc.status} renewalStatus={mc.renewal_payment_status} record={mc} />
                    </td>
                    <td className="mc-td-actions" style={tdActionsStyle}>
                      <div style={{ display: 'flex', gap: 2 }}>
                        {canViewRecord ? <ActionBtn icon="fas fa-eye" color={theme.blue} title="View" onClick={() => openView(mc)} /> : <div style={{ width: 18, minWidth: 18, flexShrink: 0 }} />}
                        {canHistory ? <ActionBtn icon="fas fa-history" color={theme.text2} title="History" onClick={() => { setSelectedHistoryRecord(mc); setShowHistoryModal(true); }} /> : <div style={{ width: 18, minWidth: 18, flexShrink: 0 }} />}
                        {canEdit ? <ActionBtn icon="fas fa-edit" color={theme.orange} title="Edit" onClick={() => openEdit(mc)} /> : <div style={{ width: 18, minWidth: 18, flexShrink: 0 }} />}
                        {canDelete ? <ActionBtn icon="fas fa-trash" color={theme.red} title="Delete" onClick={() => remove(mc.id)} /> : <div style={{ width: 18, minWidth: 18, flexShrink: 0 }} />}
                        {(canRenewal || canEdit) && <ActionBtn icon="fas fa-sync-alt" color={theme.green} title="Renewal" onClick={() => openRenewal(mc)} />}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {modalOpen && (
        <div style={overlayStyle} onClick={(e) => e.target === e.currentTarget && setModalOpen(false)}>
          <div style={{ ...modalStyle, maxWidth: 580 }}>
            <div style={modalHeader}>
              <span style={{ fontSize: 16, fontWeight: 700 }}>{editingId ? 'Edit M.Com Record' : 'Add M.Com Record'}</span>
              <button onClick={() => setModalOpen(false)} style={closeBtnStyle}>✕</button>
            </div>

            <div style={{ padding: 22, display: 'flex', flexDirection: 'column', gap: 14, maxHeight: '65vh', overflowY: 'auto' }}>
              <SectionLabel>Identity &amp; Filing</SectionLabel>
              <FormField label="Reg Date" value={formData.reg_date} onChange={field('reg_date')} />
              <FormField label="Old File No" value={formData.old_file_no} onChange={field('old_file_no')} />
              <FormField label="New File No *" value={formData.new_file_no} onChange={field('new_file_no')} />
              <FormField label="Management Corporation Name *" value={formData.management_corporation_name} onChange={field('management_corporation_name')} span2 />
              <FormField label="Address" value={formData.address} onChange={field('address')} span2 />
              <FormField label="Plan No" value={formData.plan_no} onChange={field('plan_no')} />
              <FormField label="Units" value={formData.units} onChange={field('units')} />
              <FormField label="Council" value={formData.council} onChange={field('council')} />
              <FormField label="Town" value={formData.town} onChange={field('town')} />
              <FormField label="Certificate File No" value={formData.certificate_file_no} onChange={field('certificate_file_no')} />
              <FormField label="Email Address" type="email" value={formData.email_address} onChange={field('email_address')} span2 />
              <FormField label="Awareness Date" value={formData.awareness_date} onChange={field('awareness_date')} />
              <FormField label="Remark" value={formData.remark} onChange={field('remark')} span2 />

              <SectionLabel>Personnel</SectionLabel>
              <FormField label="Secretary" value={formData.secretary} onChange={field('secretary')} />
              <FormField label="Secretary Unit No" value={formData.secretary_unit_no} onChange={field('secretary_unit_no')} />
              <FormField label="Treasurer" value={formData.treasurer} onChange={field('treasurer')} />
              <FormField label="Treasurer Unit No" value={formData.treasurer_unit_no} onChange={field('treasurer_unit_no')} />
              <FormField label="Engineer" value={formData.engineer} onChange={field('engineer')} />
              <FormField label="Management Assistant" value={formData.management_assistant} onChange={field('management_assistant')} />
              <FormSelect label="MC/M.Com" value={formData.mc_mcom} onChange={field('mc_mcom')} options={['PVT M.COM', 'GOV M.COM']} />

              <SectionLabel>AGM / Renewal</SectionLabel>
              <FormField label="Renewal Period" value={formData.renewal_period} onChange={field('renewal_period')} />
              <FormField label="AGM Date" value={formData.agm_date} onChange={field('agm_date')} />
              <FormField label="AGM Minutes" value={formData.agm_minutes} onChange={field('agm_minutes')} />
              <FormField label="Attendance" value={formData.attendance} onChange={field('attendance')} />
              <FormField label="Renewal Status" value={formData.renewal_status} onChange={field('renewal_status')} />
              <FormField label="AGM Status" value={formData.agm_status} onChange={field('agm_status')} />
              <FormField label="Audited Account" value={formData.audited_account} onChange={field('audited_account')} />
              <FormField label="Building Insurance" value={formData.building_insurance} onChange={field('building_insurance')} />
              <FormField label="Active / Non Active" value={formData.active_non_active} onChange={field('active_non_active')} />
              <FormSelect label="Renewal Date Vise" value={formData.renewal_date_vise} onChange={field('renewal_date_vise')} options={['', 'Active', 'Non Active']} />
              <FormField label="AGM Date Vise" value={formData.agm_date_vise} onChange={field('agm_date_vise')} />

              <SectionLabel>Category / Status</SectionLabel>
              <FormField label="Year" type="number" value={formData.year} onChange={field('year')} />
              <FormSelect label="Category" value={formData.category} onChange={field('category')} options={['PVT M.COM', 'GOV M.COM']} />
              <FormSelect
                label="Status"
                value={formData.status}
                onChange={field('status')}
                options={['Active', 'Non Active', 'Pending']}
              />
            </div>

            <div style={{ padding: '14px 22px', borderTop: `1px solid ${theme.border}`, display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button onClick={() => setModalOpen(false)} style={btnOutline}>Cancel</button>
              {(editingId ? canEdit : canCreate) && (
                <button onClick={save} style={btnPrimary}>
                  <i className="fas fa-save" /> {editingId ? 'Update' : 'Save'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {viewModalOpen && viewRecord && (
        <div style={overlayStyle} onClick={(e) => e.target === e.currentTarget && setViewModalOpen(false)}>
          <div style={{ ...modalStyle, maxWidth: 720 }}>
            <div style={modalHeader}>
              <span style={{ fontSize: 16, fontWeight: 700 }}>M.Com Record Details</span>
              <button onClick={() => setViewModalOpen(false)} style={closeBtnStyle}>✕</button>
            </div>

            <div style={{ padding: 22, maxHeight: '70vh', overflowY: 'auto' }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: theme.navy, textTransform: 'uppercase', letterSpacing: '1px', borderBottom: `1px solid ${theme.border}`, paddingBottom: 6, marginBottom: 12 }}>
                Identity &amp; Filing
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 0, marginBottom: 20 }}>
                <ViewField label="Reg Date" value={formatDisplayDate(viewRecord.reg_date)} />
                <ViewField label="Old File No" value={viewRecord.old_file_no} />
                <ViewField label="New File No" value={viewRecord.new_file_no} />
                <ViewField label="Management Corporation Name" value={viewRecord.management_corporation_name} />
                <ViewField label="Address" value={viewRecord.address} />
                <ViewField label="Plan No" value={viewRecord.plan_no} />
                <ViewField label="Units" value={viewRecord.units} />
                <ViewField label="Town" value={viewRecord.town} />
                <ViewField label="Council" value={viewRecord.council} />
                <ViewField label="Certificate File No" value={viewRecord.certificate_file_no} />
                <ViewField label="Email Address" value={viewRecord.email_address} />
                <ViewField label="Awareness Date" value={formatDisplayDate(viewRecord.awareness_date)} />
                <ViewField label="Remark" value={viewRecord.remark} />
              </div>

              <div style={{ fontSize: 12, fontWeight: 700, color: theme.navy, textTransform: 'uppercase', letterSpacing: '1px', borderBottom: `1px solid ${theme.border}`, paddingBottom: 6, marginBottom: 12 }}>
                Personnel
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 0, marginBottom: 20 }}>
                <ViewField label="Secretary" value={viewRecord.secretary} />
                <ViewField label="Secretary Unit No" value={viewRecord.secretary_unit_no} />
                <ViewField label="Treasurer" value={viewRecord.treasurer} />
                <ViewField label="Treasurer Unit No" value={viewRecord.treasurer_unit_no} />
                <ViewField label="Engineer" value={viewRecord.engineer} />
                <ViewField label="Management Assistant" value={viewRecord.management_assistant} />
                <ViewField label="MC/M.Com" value={viewRecord.mc_mcom} />
              </div>

              <div style={{ fontSize: 12, fontWeight: 700, color: theme.navy, textTransform: 'uppercase', letterSpacing: '1px', borderBottom: `1px solid ${theme.border}`, paddingBottom: 6, marginBottom: 12 }}>
                AGM / Renewal
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 0, marginBottom: 20 }}>
                <ViewField label="Renewal Period" value={viewRecord.renewal_period} />
                <ViewField label="AGM Date" value={formatDisplayDate(viewRecord.agm_date)} />
                <ViewField label="AGM Minutes" value={viewRecord.agm_minutes} />
                <ViewField label="Attendance" value={viewRecord.attendance} />
                <ViewField label="Audited Account" value={viewRecord.audited_account} />
                <ViewField label="Building Insurance" value={viewRecord.building_insurance} />
                <ViewField label="Active / Non Active" value={viewRecord.active_non_active} />
                <ViewField label="Renewal Date Vise" value={viewRecord.renewal_date_vise} />
                <ViewField label="AGM Date Vise" value={viewRecord.agm_date_vise} />
                <ViewField label="Renewal Status" value={viewRecord.renewal_status} />
                <ViewField label="AGM Status" value={viewRecord.agm_status} />
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 10 }}>
                <span style={{ fontSize: 12, fontWeight: 500, color: theme.text2 }}>Status:</span>
                <StatusPill status={viewRecord.status} record={viewRecord} />
              </div>
              {(() => {
                if (!viewRecord) return null;
                const st = getDetailedRenewalStatusText(viewRecord, viewRecord.status, settings);
                return (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 10 }}>
                    <span style={{ fontSize: 12, fontWeight: 500, color: theme.text2 }}>Renewal Status:</span>
                    <span style={{ fontSize: 12, fontWeight: 700, color: st.isOk ? theme.green : theme.red }}>
                      <i className={`fas ${st.isOk ? 'fa-check-circle' : 'fa-exclamation-circle'}`} style={{ marginRight: 6 }} />
                      {st.text}
                    </span>
                  </div>
                );
              })()}

              {/* Audit / timestamps */}
              {/* Audit / timestamps */}
              <div style={{ fontSize: 12, fontWeight: 700, color: theme.navy, textTransform: 'uppercase', letterSpacing: '1px', borderBottom: `1px solid ${theme.border}`, paddingBottom: 6, marginBottom: 12, marginTop: 20 }}>Audit</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 0, marginTop: 10 }}>
                <ViewField label="Created At" value={viewRecord.created_at ? `${formatDisplayDate(viewRecord.created_at)} (By: ${viewRecord.created_by || 'System'})` : '—'} />
                <ViewField label="Updated At" value={viewRecord.updated_at ? `${formatDisplayDate(viewRecord.updated_at)} (By: ${viewRecord.updated_by || viewRecord.modified_by || 'System'})` : '—'} />
              </div>
            </div>

            <div style={{ padding: '14px 22px', borderTop: `1px solid ${theme.border}`, display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              {canEdit && (
                <button onClick={() => { setViewModalOpen(false); openEdit(viewRecord); }} style={btnPrimary}>
                  <i className="fas fa-edit" /> Edit
                </button>
              )}
              <button onClick={() => setViewModalOpen(false)} style={btnOutline}>Close</button>
            </div>
          </div>
        </div>
      )}

      <HistoryModal
        isOpen={showHistoryModal}
        onClose={() => { setShowHistoryModal(false); setSelectedHistoryRecord(null); }}
        record={selectedHistoryRecord}
        theme={theme}
      />

      {exportModalOpen && (
        <GenericExportModal
          title="Export M.Com Records"
          subject="M.Com Records"
          exporting={exporting}
          fields={MCOM_EXPORT_FIELDS}
          onExport={handleExport}
          onClose={() => setExportModalOpen(false)}
        />
      )}

      {/* - Renewal Modal - */}
      {renewalModalOpen && renewalRecord && (() => {
        const mc = renewalRecord;
        let multiRows = buildMcomMultiYearRows(mc, settings);
        const originalMultiRows = [...multiRows];
        let grandTotal = multiRows.reduce((s, r) => s + r.total, 0);

        const isActiveStatus = String(mc.status || '').toLowerCase() === 'active' || String(mc.renewal_date_vise || '').toLowerCase() === 'active';

        let _paidYearRows = [];
        if (originalMultiRows.length === 0 && (mc?.renewal_paid_amount || isActiveStatus)) {
          let pTotal = parseFloat(mc?.renewal_paid_amount) || 0;
          const isGov = String(mc?.mc_mcom || '').toUpperCase().includes('GOV') || String(mc?.category || '').toLowerCase().includes('government');
          const isNhda = String(mc?.mc_mcom || '').toUpperCase().includes('NHDA') || String(mc?.category || '').toLowerCase().includes('nhda') || String(mc?.file_no || '').toUpperCase().includes('NHDA') || String(mc?.new_file_no || '').toUpperCase().includes('NHDA') || String(mc?.old_file_no || '').toUpperCase().includes('NHDA');
          const units = parseInt(mc?.units) || 0;
          const yr = mc.renewal_paid_year || getServerDate().getFullYear();
          const rate = getMcomFeeForYear(units, yr, isGov, settings, mc);

          if (pTotal === 0 && isActiveStatus) {
            let baseFee = rate * units;
            let baseSscl = baseFee * 0.025;
            let baseVat = (baseFee + baseSscl) * 0.18;
            pTotal = baseFee + baseSscl + baseVat;
          }

          const grandFee = pTotal / 1.2095;
          const grandSscl = grandFee * 0.025;
          const grandVat = (grandFee + grandSscl) * 0.18;

          let calculatedMonths = 12;
          if (rate > 0) {
            calculatedMonths = Math.round(grandFee / (rate / 12));
            if (calculatedMonths < 1) calculatedMonths = 12;
          }

          const numYears = Math.max(1, Math.round(calculatedMonths / 12));
          const startYr = yr - numYears + 1;

          for (let y = startYr; y <= yr; y++) {
            const showUnits = (y < 2023 && (isGov || isNhda)) ? '-' : units;
            _paidYearRows.push({ year: y, units: showUnits, fee: grandFee / numYears, sscl: grandSscl / numYears, vat: grandVat / numYears, total: pTotal / numYears, isGov });
          }

          if (mc.renewal_payment_status === 'Approved' || mc.renewal_payment_status === 'Pending Approval') {
            grandTotal = pTotal;
          }
        }

        if (originalMultiRows.length === 0 && _paidYearRows.length > 0) {
          multiRows = _paidYearRows;
        }

        const payStatus = mc.renewal_payment_status;
        const hasRemainingYears = originalMultiRows && originalMultiRows.length > 0;
        const isApproved = payStatus === 'Approved';
        const isPendingApproval = payStatus === 'Pending Approval';
        const isFullyPaid = (isApproved && !hasRemainingYears) || (isActiveStatus && !hasRemainingYears) || (!hasRemainingYears && !isPendingApproval);
        const isPartiallyPaid = (isApproved && hasRemainingYears) || (isActiveStatus && hasRemainingYears);
        const isRejected = payStatus === 'Rejected';

        const barBg = isFullyPaid ? '#f0fdf4'
          : isPartiallyPaid ? '#eff6ff'
            : isRejected ? '#fef2f2'
              : isPendingApproval ? '#fffbeb'
                : '#fff7ed';

        const barBorder = isFullyPaid ? '#16a34a'
          : isPartiallyPaid ? '#1a3a6b'
            : isRejected ? '#ef4444'
              : isPendingApproval ? '#f59e0b'
                : '#f59e0b';

        const barColor = isFullyPaid ? '#16a34a'
          : isPartiallyPaid ? '#1a3a6b'
            : isRejected ? '#dc2626'
              : '#f59e0b';

        const barIcon = isFullyPaid ? 'fa-check-circle'
          : isPartiallyPaid ? 'fa-check-circle'
            : isRejected ? 'fa-times-circle'
              : isPendingApproval ? 'fa-hourglass-half'
                : 'fa-clock';

        const barText = isFullyPaid ? 'Renewal Fee Paid & Approved'
          : isPartiallyPaid ? 'Renewal Fee Partially Paid'
            : isRejected ? 'Payment Rejected by AGM'
              : isPendingApproval ? 'Payment Pending AGM Approval'
                : 'Renewal Fee Not Yet Paid';

        const fmt = (n) => Number(n).toLocaleString('en-LK', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

        const combinedRows = [...multiRows, ...originalMultiRows].reduce((acc, current) => {
          if (!acc.find(item => item.year === current.year)) acc.push(current);
          return acc;
        }, []);
        const selectedRows = combinedRows.filter(r => selectedRenewalYears.includes(r.year));
        const selectedTotal = selectedRows.reduce((s, r) => s + r.total, 0);
        const allSelected = multiRows.length > 0 && selectedRenewalYears.length === multiRows.length;
        const someSelected = selectedRenewalYears.length > 0;
        const toggleYear = (year) => setSelectedRenewalYears(prev =>
          prev.includes(year) ? prev.filter(y => y !== year) : [...prev, year]
        );
        const toggleAll = () => setSelectedRenewalYears(
          allSelected ? [] : multiRows.map(r => r.year)
        );

        return (
          <div style={overlayStyle} onClick={(e) => { if (e.target === e.currentTarget) { setRenewalModalOpen(false); setSelectedRenewalYears([]); setManualPaidYears(''); } }}>
            <div style={{ ...modalStyle, maxWidth: 780, display: 'flex', flexDirection: 'column', maxHeight: '90vh' }}>

              <div style={modalHeader}>
                <span style={{ fontSize: 16, fontWeight: 700 }}>Renewal Receipt</span>
                <button onClick={() => { setRenewalModalOpen(false); setSelectedRenewalYears([]); setManualPaidYears(''); }} style={closeBtnStyle}><i className="fas fa-times" /></button>
              </div>

              <div style={{ padding: 22, overflowY: 'auto', flex: 1 }}>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 18 }}>
                  <div>
                    <div style={{ fontSize: 13, color: theme.text2, marginBottom: 4 }}>Receipt Number</div>
                    <div style={{ fontSize: 18, fontWeight: 700, color: theme.navy }}>{mc.new_file_no || mc.file_no || mc.old_file_no || '-'}</div>
                    <div style={{ fontSize: 12, color: theme.text3, marginTop: 2 }}>{mc.management_corporation_name}</div>
                  </div>
                  {multiRows.length > 0 && (
                    <button
                      onClick={() => openRlLetterModal(mc, someSelected ? selectedRows : multiRows)}
                      disabled={someSelected && selectedRows.length === 0}
                      style={{ ...btnPrimary, padding: '9px 14px', gap: 6, opacity: (!someSelected || selectedRows.length > 0) ? 1 : 0.5 }}
                    >
                      <i className="fas fa-print" />
                      {someSelected ? `Print Selected (${selectedRenewalYears.length})` : 'Print Receipt'}
                    </button>
                  )}
                </div>

                <div style={{ border: `1px solid ${theme.border}`, borderRadius: 10, background: '#f8fafc', padding: 16, marginBottom: 20 }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: theme.navy, marginBottom: 12 }}>Payable Summary</div>

                  {multiRows.length > 1 && (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8, padding: '5px 8px', background: '#eff6ff', borderRadius: 6, border: '1px solid #bfdbfe', fontSize: 12 }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontWeight: 600, color: theme.navy }}>
                        <input type="checkbox" checked={allSelected} onChange={toggleAll}
                          style={{ width: 14, height: 14, cursor: 'pointer', accentColor: theme.navy }} />
                        Select All Years ({multiRows.length})
                      </label>
                      {someSelected && (
                        <span style={{ color: theme.navy, fontWeight: 700 }}>
                          {selectedRenewalYears.length} yr{selectedRenewalYears.length > 1 ? 's' : ''} - Rs. {fmt(selectedTotal)}
                        </span>
                      )}
                    </div>
                  )}

                  <div style={{ overflowX: 'auto' }}>
                    {multiRows.length > 0 ? (
                      <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '480px', fontSize: 11 }}>
                        <thead>
                          <tr style={{ background: '#f1f5f9' }}>
                            {multiRows.length > 1 && <th style={{ padding: '6px 6px', borderBottom: `1px solid ${theme.border}`, width: 28, whiteSpace: 'nowrap' }}></th>}
                            <th style={{ padding: '6px 8px', borderBottom: `1px solid ${theme.border}`, textAlign: 'left', fontSize: 11, fontWeight: 600, color: theme.text2, whiteSpace: 'nowrap' }}>Year</th>
                            <th style={{ padding: '6px 8px', borderBottom: `1px solid ${theme.border}`, textAlign: 'right', fontSize: 11, fontWeight: 600, color: theme.text2, whiteSpace: 'nowrap' }}>Units</th>
                            <th style={{ padding: '6px 8px', borderBottom: `1px solid ${theme.border}`, textAlign: 'right', fontSize: 11, fontWeight: 600, color: theme.text2, whiteSpace: 'nowrap' }}>Fee (Rs.)</th>
                            <th style={{ padding: '6px 8px', borderBottom: `1px solid ${theme.border}`, textAlign: 'right', fontSize: 11, fontWeight: 600, color: theme.text2, whiteSpace: 'nowrap' }}>SSCL {SSCL_RATE * 100}%</th>
                            <th style={{ padding: '6px 8px', borderBottom: `1px solid ${theme.border}`, textAlign: 'right', fontSize: 11, fontWeight: 600, color: theme.text2, whiteSpace: 'nowrap' }}>VAT {VAT_RATE * 100}%</th>
                            <th style={{ padding: '6px 8px', borderBottom: `1px solid ${theme.border}`, textAlign: 'right', fontSize: 11, fontWeight: 600, color: theme.text2, whiteSpace: 'nowrap' }}>Total (Rs.)</th>
                          </tr>
                        </thead>
                        <tbody>
                          {multiRows.map((row) => {
                            const isSelected = selectedRenewalYears.includes(row.year);
                            return (
                              <tr key={row.year}
                                onClick={() => multiRows.length > 1 && toggleYear(row.year)}
                                style={{
                                  background: isSelected ? (row.year < 2023 ? '#fef3c7' : '#dcfce7') : '#fff',
                                  borderBottom: `1px solid ${theme.border}`,
                                  cursor: multiRows.length > 1 ? 'pointer' : 'default',
                                  outline: isSelected ? `2px solid ${row.year < 2023 ? '#f59e0b' : '#16a34a'}` : 'none',
                                  outlineOffset: -1,
                                  transition: 'background 0.15s'
                                }}
                              >
                                {multiRows.length > 1 && (
                                  <td style={{ padding: '6px 6px', textAlign: 'center', whiteSpace: 'nowrap' }}>
                                    <input type="checkbox" checked={isSelected} onChange={() => toggleYear(row.year)}
                                      onClick={e => e.stopPropagation()}
                                      style={{ width: 13, height: 13, cursor: 'pointer', accentColor: row.year < 2023 ? '#f59e0b' : '#16a34a' }} />
                                  </td>
                                )}
                                <td style={{ padding: '6px 8px', fontSize: 11, whiteSpace: 'nowrap' }}>
                                  <span style={{ fontWeight: 600 }}>{row.year}</span>
                                  {row.year < 2023 && <span style={{ marginLeft: 5, fontSize: 9.5, color: '#f59e0b', background: '#fff7ed', border: '1px solid #fde68a', borderRadius: 3, padding: '1px 4px' }}>Old rate</span>}
                                  {row.year >= 2023 && <span style={{ marginLeft: 5, fontSize: 9.5, color: '#16a34a', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 3, padding: '1px 4px' }}>New rate</span>}
                                </td>
                                <td style={{ padding: '6px 8px', fontSize: 11, textAlign: 'right', whiteSpace: 'nowrap' }}>{row.units}</td>
                                <td style={{ padding: '6px 8px', fontSize: 11, textAlign: 'right', whiteSpace: 'nowrap' }}>{fmt(row.fee)}</td>
                                <td style={{ padding: '6px 8px', fontSize: 11, textAlign: 'right', whiteSpace: 'nowrap' }}>{fmt(row.sscl)}</td>
                                <td style={{ padding: '6px 8px', fontSize: 11, textAlign: 'right', whiteSpace: 'nowrap' }}>{fmt(row.vat)}</td>
                                <td style={{ padding: '6px 8px', fontSize: 11, textAlign: 'right', fontWeight: 600, whiteSpace: 'nowrap' }}>{fmt(row.total)}</td>
                              </tr>
                            );
                          })}
                          <tr>
                            {multiRows.length > 1 && <td style={{ padding: '8px', borderTop: `1px solid ${theme.border}`, whiteSpace: 'nowrap' }}></td>}
                            <td colSpan={multiRows.length > 1 ? 5 : 6} style={{ padding: '8px', borderTop: `1px solid ${theme.border}`, fontWeight: 700, color: theme.navy, fontSize: 11.5, whiteSpace: 'nowrap' }}>
                              {someSelected && selectedTotal !== grandTotal ? `Selected (${selectedRenewalYears.length} yr) Total` : 'Total Amount Payable'}
                            </td>
                            <td style={{ padding: '8px', borderTop: `1px solid ${theme.border}`, fontWeight: 700, color: theme.navy, fontSize: 11.5, textAlign: 'right', whiteSpace: 'nowrap' }}>
                              Rs. {fmt(someSelected && selectedTotal !== grandTotal ? selectedTotal : grandTotal)}
                            </td>
                          </tr>
                          {someSelected && selectedTotal !== grandTotal && (
                            <tr>
                              {multiRows.length > 1 && <td style={{ padding: '4px 8px', borderBottom: `1px solid ${theme.border}`, whiteSpace: 'nowrap' }}></td>}
                              <td colSpan={multiRows.length > 1 ? 5 : 6} style={{ padding: '4px 8px', borderBottom: `1px solid ${theme.border}`, fontSize: 11, color: theme.text3, whiteSpace: 'nowrap' }}>Grand Total (all {multiRows.length} years)</td>
                              <td style={{ padding: '4px 8px', borderBottom: `1px solid ${theme.border}`, fontSize: 11, color: theme.text3, textAlign: 'right', whiteSpace: 'nowrap' }}>Rs. {fmt(grandTotal)}</td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    ) : mc.renewal_payment_status ? (
                      <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '480px', fontSize: 11 }}>
                          <tbody>
                            <tr>
                              <td style={{ padding: '6px 8px', borderBottom: `1px solid ${theme.border}`, fontSize: 11, whiteSpace: 'nowrap' }}>Category</td>
                              <td style={{ padding: '6px 8px', borderBottom: `1px solid ${theme.border}`, fontSize: 11, whiteSpace: 'nowrap' }}>{mc.category || '-'}</td>
                            </tr>
                            <tr>
                              <td style={{ padding: '6px 8px', borderBottom: `1px solid ${theme.border}`, fontSize: 11, whiteSpace: 'nowrap' }}>Number of Parcels (Units)</td>
                              <td style={{ padding: '6px 8px', borderBottom: `1px solid ${theme.border}`, fontSize: 11, whiteSpace: 'nowrap' }}>{mc.units || '-'}</td>
                            </tr>
                            <tr>
                              <td style={{ padding: '6px 8px', borderBottom: `1px solid ${theme.border}`, fontSize: 11, whiteSpace: 'nowrap' }}>Covering Year</td>
                              <td style={{ padding: '6px 8px', borderBottom: `1px solid ${theme.border}`, fontSize: 11, whiteSpace: 'nowrap' }}>Up to {mc.renewal_paid_year || '-'}</td>
                            </tr>
                            <tr>
                              <td style={{ padding: '8px', borderBottom: `1px solid ${theme.border}`, fontWeight: 700, color: theme.navy, fontSize: 11.5, whiteSpace: 'nowrap' }}>Total Amount Paid</td>
                              <td style={{ padding: '8px', borderBottom: `1px solid ${theme.border}`, fontWeight: 700, color: theme.navy, fontSize: 11.5, whiteSpace: 'nowrap' }}>Rs. {fmt(mc.renewal_paid_amount)}</td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <div style={{ padding: 20, textAlign: 'center', color: '#16a34a' }}>
                        <i className="fas fa-check-circle" style={{ fontSize: 22, marginBottom: 6, display: 'block' }} />
                        <strong>No pending renewal dues</strong>
                        <div style={{ fontSize: 12, color: theme.text3, marginTop: 4 }}>Renewals are up to date</div>
                      </div>
                    )}
                  </div>
                </div>

                <div style={{ border: `1px solid ${theme.border}`, borderRadius: 10, background: '#f8fafc', padding: 14, marginBottom: 14 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: theme.navy, marginBottom: 10 }}>Renewal Approval Workflow</div>
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11, minWidth: '480px' }}>
                      <thead>
                        <tr style={{ background: '#f1f5f9' }}>
                          <th style={{ padding: '6px 8px', textAlign: 'left', fontWeight: 600, color: theme.text2, borderBottom: `1px solid ${theme.border}`, fontSize: 11, whiteSpace: 'nowrap', wordBreak: 'normal', minWidth: 45, width: 45 }}>Step</th>
                          <th style={{ padding: '6px 8px', textAlign: 'left', fontWeight: 600, color: theme.text2, borderBottom: `1px solid ${theme.border}`, fontSize: 11, whiteSpace: 'nowrap', wordBreak: 'normal', minWidth: 140 }}>Action</th>
                          <th style={{ padding: '6px 8px', textAlign: 'left', fontWeight: 600, color: theme.text2, borderBottom: `1px solid ${theme.border}`, fontSize: 11, whiteSpace: 'nowrap', wordBreak: 'normal', minWidth: 90 }}>Status</th>
                          <th style={{ padding: '6px 8px', textAlign: 'left', fontWeight: 600, color: theme.text2, borderBottom: `1px solid ${theme.border}`, fontSize: 11, whiteSpace: 'nowrap', wordBreak: 'normal', minWidth: 160 }}>Details</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr style={{ borderBottom: `1px solid ${theme.border}` }}>
                          <td style={{ padding: '6px 8px', fontWeight: 600, color: theme.navy, fontSize: 11, whiteSpace: 'nowrap', wordBreak: 'normal' }}>1</td>
                          <td style={{ padding: '6px 8px', fontSize: 11, whiteSpace: 'nowrap', wordBreak: 'normal' }}>Officer marks payment</td>
                          <td style={{ padding: '6px 8px', whiteSpace: 'nowrap', wordBreak: 'normal' }}>
                            {mc.renewal_payment_status ? (
                              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 6, padding: '2px 8px', fontSize: 10.5, fontWeight: 700, color: '#15803d' }}>
                                <i className="fas fa-check" /> Done
                              </span>
                            ) : (
                              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: '#f1f5f9', border: '1px solid #e2e8f0', borderRadius: 6, padding: '2px 8px', fontSize: 10.5, fontWeight: 600, color: '#64748b' }}>
                                <i className="fas fa-minus" /> Pending
                              </span>
                            )}
                          </td>
                          <td style={{ padding: '6px 8px', color: theme.text2, fontSize: 11, whiteSpace: 'nowrap', wordBreak: 'normal' }}>
                            {mc.renewal_paid_date ? `Recorded on ${mc.renewal_paid_date}` : 'Not yet recorded'}
                          </td>
                        </tr>
                        <tr style={{ borderBottom: `1px solid ${theme.border}` }}>
                          <td style={{ padding: '6px 8px', fontWeight: 600, color: theme.navy, fontSize: 11, whiteSpace: 'nowrap', wordBreak: 'normal' }}>2</td>
                          <td style={{ padding: '6px 8px', fontSize: 11, whiteSpace: 'nowrap', wordBreak: 'normal' }}>AGM approves payment</td>
                          <td style={{ padding: '6px 8px', whiteSpace: 'nowrap', wordBreak: 'normal' }}>
                            {payStatus === 'Approved' ? (
                              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 6, padding: '2px 8px', fontSize: 10.5, fontWeight: 700, color: '#15803d' }}>
                                <i className="fas fa-check" /> Approved
                              </span>
                            ) : payStatus === 'Rejected' ? (
                              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 6, padding: '2px 8px', fontSize: 10.5, fontWeight: 700, color: '#dc2626' }}>
                                <i className="fas fa-times" /> Rejected
                              </span>
                            ) : payStatus === 'Pending Approval' ? (
                              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: '#fff7ed', border: '1px solid #fed7aa', borderRadius: 6, padding: '2px 8px', fontSize: 10.5, fontWeight: 700, color: '#c2410c' }}>
                                <i className="fas fa-hourglass-half" /> Awaiting
                              </span>
                            ) : (
                              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: '#f1f5f9', border: '1px solid #e2e8f0', borderRadius: 6, padding: '2px 8px', fontSize: 10.5, fontWeight: 600, color: '#64748b' }}>
                                <i className="fas fa-minus" /> Pending
                              </span>
                            )}
                          </td>
                          <td style={{ padding: '6px 8px', color: theme.text2, fontSize: 11, whiteSpace: 'nowrap', wordBreak: 'normal' }}>
                            {payStatus === 'Approved' ? `Approved on ${mc.acknowledgement_date || '-'}` : payStatus === 'Rejected' ? `Rejected: ${mc.renewal_rejection_reason || '-'}` : payStatus === 'Pending Approval' ? 'AGM will be notified to review' : '-'}
                          </td>
                        </tr>
                        <tr>
                          <td style={{ padding: '6px 8px', fontWeight: 600, color: theme.navy, fontSize: 11, whiteSpace: 'nowrap', wordBreak: 'normal' }}>3</td>
                          <td style={{ padding: '6px 8px', fontSize: 11, whiteSpace: 'nowrap', wordBreak: 'normal' }}>Acknowledgement generated</td>
                          <td style={{ padding: '6px 8px', whiteSpace: 'nowrap', wordBreak: 'normal' }}>
                            {mc.acknowledgement_no ? (
                              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 6, padding: '2px 8px', fontSize: 10.5, fontWeight: 700, color: '#15803d' }}>
                                <i className="fas fa-check" /> Generated
                              </span>
                            ) : (
                              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: '#f1f5f9', border: '1px solid #e2e8f0', borderRadius: 6, padding: '2px 8px', fontSize: 10.5, fontWeight: 600, color: '#64748b' }}>
                                <i className="fas fa-minus" /> Not yet
                              </span>
                            )}
                          </td>
                          <td style={{ padding: '6px 8px', color: theme.text2, fontSize: 11, whiteSpace: 'nowrap', wordBreak: 'normal' }}>
                            {mc.acknowledgement_no ? `Ack No: ${mc.acknowledgement_no}` : 'Will be generated after AGM approval'}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>

                <div style={{ border: `1px solid ${barBorder}`, borderRadius: 10, background: barBg, padding: 14, marginBottom: 4, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 700, color: barColor }}>
                      <i className={`fas ${barIcon}`} style={{ marginRight: 6 }} />
                      {barText}
                    </div>
                    {(isFullyPaid || isPartiallyPaid) && (
                      <div style={{ fontSize: 11.5, color: theme.text2, marginTop: 4 }}>
                        Paid on {mc.renewal_paid_date || '-'} - Acknowledgement No: {mc.acknowledgement_no || '-'}
                      </div>
                    )}
                    {payStatus === 'Pending Approval' && (
                      <div style={{ fontSize: 11.5, color: theme.text2, marginTop: 4 }}>
                        Payment recorded on {mc.renewal_paid_date}
                      </div>
                    )}
                    {payStatus === 'Rejected' && (
                      <div style={{ fontSize: 11.5, color: '#dc2626', marginTop: 4 }}>
                        Reason: {mc.renewal_rejection_reason || 'No reason provided'}
                      </div>
                    )}
                  </div>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                    {(isFullyPaid || isPartiallyPaid || (payStatus === 'Approved' && mc.acknowledgement_no)) && (
                      <button
                        onClick={() => {
                          const yearsList = multiRows ? multiRows.map(r => r.year) : [];
                          const startPaidYear = yearsList.length > 0 ? Math.min(...yearsList) : (mc.renewal_paid_year || getServerDate().getFullYear());
                          const endPaidYear = mc.renewal_paid_year || (yearsList.length > 0 ? Math.max(...yearsList) : getServerDate().getFullYear());
                          const displayAmount = (mc.renewal_paid_amount && parseFloat(mc.renewal_paid_amount) > 0)
                            ? mc.renewal_paid_amount
                            : grandTotal;

                          setAckOverrides({
                            refNo: mc.new_file_no || mc.file_no || mc.acknowledgement_no || '',
                            date: mc.acknowledgement_date || getServerDate().toISOString().slice(0, 10),
                            year: String(endPaidYear),
                            yearFrom: String(startPaidYear),
                            yearTo: String(endPaidYear),
                            amount: displayAmount ? Number(displayAmount).toLocaleString('en-LK', { minimumFractionDigits: 2 }) : '0.00',
                            paidDate: mc.renewal_paid_date || getServerDate().toISOString().slice(0, 10),
                            signName: 'Samantha Ampagala',
                            signTitle1: 'Assistant General Manager (Customer Care) ',
                            signTitle2: 'Condominium Management Authority',
                            toEmail: mc.email_address || mc.secretary_email || ''
                          });
                          setViewRecord(mc);
                          setAckModalOpen(true);
                        }}
                        style={{ ...btnPrimary, background: '#1a3a6b', padding: '7px 12px', gap: 6, fontSize: 12 }}>
                        <i className="fas fa-file-alt" /> View Acknowledgement
                      </button>
                    )}
                  </div>
                  {multiRows.length > 0 && (
                    (payStatus === 'Pending Approval') ? (
                      canApprove ? (
                        <div style={{ display: 'flex', gap: 8, flexDirection: 'column', alignItems: 'flex-end' }}>
                          <div style={{ display: 'flex', gap: 8 }}>
                            <button onClick={() => {
                              setMcToReject(mc);
                              setRejectReason('');
                              setRejectOpen(true);
                            }} disabled={markingRenewalPaid}
                              style={{ ...btnPrimary, background: 'transparent', color: '#dc2626', border: '1px solid #ef4444', padding: '8px 14px', gap: 6 }}>
                              {markingRenewalPaid ? <><i className="fas fa-spinner fa-spin" /> Saving...</> : <><i className="fas fa-times" /> Reject</>}
                            </button>
                            <button onClick={() => approveRenewalPayment(mc, multiRows)} disabled={markingRenewalPaid}
                              style={{ ...btnPrimary, background: '#16a34a', padding: '8px 14px', gap: 6 }}>
                              {markingRenewalPaid ? <><i className="fas fa-spinner fa-spin" /> Saving...</> : <><i className="fas fa-check-double" /> Approve Payment</>}
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, alignItems: 'flex-end' }}>
                          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: '#fff7ed', border: '1px solid #fed7aa', borderRadius: 8, padding: '8px 14px', fontSize: 12.5, fontWeight: 700, color: '#c2410c' }}>
                            <i className="fas fa-hourglass-half" /> Awaiting AGM Approval
                          </div>
                          <div style={{ fontSize: 11, color: theme.text3 }}>The AGM has been notified. You will receive a notification once approved.</div>
                        </div>
                      )
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, alignItems: 'flex-end', width: '100%' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', flexWrap: 'wrap' }}>
                          <div style={{ fontSize: 12, fontWeight: 700, color: theme.navy, whiteSpace: 'nowrap' }}>
                            <i className="fas fa-calendar-plus" style={{ marginRight: 6 }} />
                            {!hasRemainingYears ? 'Paid Years:' : isPartiallyPaid ? 'Mark Remaining Years as Paid:' : 'Select Years to Mark as Paid:'}
                          </div>
                          {(() => {
                            let unpaidYears = [];
                            if (originalMultiRows && originalMultiRows.length > 0) {
                              unpaidYears = originalMultiRows.map(r => r.year);
                            } else {
                              const currentYear = getServerDate().getFullYear();
                              const regYearStr = mc.reg_date ? mc.reg_date.split('-')[0] : (mc.year ? String(mc.year) : String(currentYear));
                              const regYear = parseInt(regYearStr, 10);
                              const paidYearsStr = mc.renewal_paid_years || String(mc.renewal_paid_year || '');
                              const paidYears = paidYearsStr ? paidYearsStr.split(',').map(y => parseInt(y.trim(), 10)).filter(y => !isNaN(y)) : [];
                              for (let y = regYear; y <= currentYear; y++) {
                                if (!paidYears.includes(y)) unpaidYears.push(y);
                              }
                            }

                            let lastPaidYear = null;
                            if (mc.renewal_period) {
                              const match = String(mc.renewal_period).match(/\b(19|20)\d{2}\b/g);
                              if (match) lastPaidYear = parseInt(match[match.length - 1], 10);
                              else lastPaidYear = parseInt(mc.renewal_period, 10);
                            }
                            if (!lastPaidYear && mc.renewal_paid_year) {
                              lastPaidYear = parseInt(mc.renewal_paid_year, 10);
                            }
                            if (!lastPaidYear && (isFullyPaid || isActiveStatus)) {
                              lastPaidYear = new Date().getFullYear();
                            }

                            const allYears = new Set([...unpaidYears]);
                            if (lastPaidYear && !unpaidYears.includes(lastPaidYear)) {
                              allYears.add(lastPaidYear);
                            }

                            const maxCurrentYear = Math.max(lastPaidYear || new Date().getFullYear(), ...unpaidYears, new Date().getFullYear());
                            allYears.add(maxCurrentYear + 1);
                            allYears.add(maxCurrentYear + 2);

                            const paidYearsStr = mc.renewal_paid_years || String(mc.renewal_paid_year || '');
                            const paidYearsList = paidYearsStr.split(',').map(y => parseInt(y.trim(), 10)).filter(y => !isNaN(y));
                            paidYearsList.forEach(y => allYears.add(y));

                            const sortedYears = Array.from(allYears).sort((a, b) => a - b);

                            if (sortedYears.length === 0) return <span style={{ fontSize: 11, color: theme.text3, fontWeight: 600 }}>No years to display</span>;

                            return (
                              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                                {sortedYears.map(y => {
                                  const isAlreadyPaid = paidYearsList.includes(y) || (lastPaidYear && y <= lastPaidYear && !unpaidYears.includes(y));
                                  const isSel = selectedRenewalYears.includes(y);

                                  if (isAlreadyPaid) {
                                    return (
                                      <button
                                        key={y}
                                        disabled
                                        style={{
                                          padding: '4px 10px',
                                          borderRadius: 6,
                                          border: `1px solid ${theme.green}`,
                                          background: '#f0fdf4',
                                          color: theme.green,
                                          fontSize: 11,
                                          fontWeight: 700,
                                          cursor: 'not-allowed',
                                          display: 'flex',
                                          alignItems: 'center',
                                          gap: 4
                                        }}
                                      >
                                        <i className="fas fa-check" /> {y}
                                      </button>
                                    );
                                  }

                                  return (
                                    <button
                                      key={y}
                                      onClick={() => setSelectedRenewalYears(prev => isSel ? prev.filter(x => x !== y) : [...prev, y])}
                                      style={{
                                        padding: '4px 10px',
                                        borderRadius: 6,
                                        border: `1px solid ${isSel ? theme.navy : theme.border}`,
                                        background: isSel ? theme.navy : '#fff',
                                        color: isSel ? '#fff' : theme.text,
                                        fontSize: 11,
                                        fontWeight: 600,
                                        cursor: 'pointer',
                                        transition: 'all 0.15s'
                                      }}
                                    >
                                      {y}
                                    </button>
                                  );
                                })}
                              </div>
                            );
                          })()}
                        </div>
                        {(canRenewal || canEdit) && (
                          <button
                            disabled={markingRenewalPaid || selectedRenewalYears.length === 0}
                            onClick={() => markRenewalPaid(mc, someSelected ? selectedRows : multiRows)}
                            style={{ background: '#f59e0b', color: '#fff', border: 'none', padding: '8px 14px', borderRadius: 8, fontSize: 13, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6, opacity: (markingRenewalPaid || selectedRenewalYears.length === 0) ? 0.6 : 1, cursor: (markingRenewalPaid || selectedRenewalYears.length === 0) ? 'not-allowed' : 'pointer' }}
                          >
                            {markingRenewalPaid ? <><i className="fas fa-spinner fa-spin" /> Saving...</> : <><i className="fas fa-hand-holding-usd" /> Mark as Paid</>}
                          </button>
                        )}
                      </div>
                    )
                  )}
                </div>

              </div>
            </div>
          </div>
        );
      })()}

      {toast && (
        <div style={{ position: 'fixed', bottom: 22, right: 22, zIndex: 9999, background: '#fff', border: `1px solid ${theme.border}`, borderLeft: `4px solid ${toast.type === 'error' ? theme.red : toast.type === 'info' ? theme.blue : theme.green}`, borderRadius: 10, padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 10, boxShadow: '0 8px 30px rgba(0,0,0,.12)', minWidth: 240 }}>
          <i className={`fas fa-${toast.type === 'error' ? 'times-circle' : 'check-circle'}`} style={{ color: toast.type === 'error' ? theme.red : theme.green, fontSize: 15 }} />
          <span style={{ fontSize: 13, fontWeight: 700 }}>{toast.msg}</span>
        </div>
      )}

      {/* Acknowledgement Letter Modal */}
      {ackModalOpen && viewRecord && (
        <div className="mc-overlay" onClick={(e) => e.target === e.currentTarget && setAckModalOpen(false)}>
          <div className="mc-modal" style={{ maxWidth: 720, display: 'flex', flexDirection: 'column', maxHeight: '90vh' }}>
            <div className="mc-modal-header">
              <span style={{ fontSize: 16, fontWeight: 700 }}>Acknowledgement Letter</span>
              <button onClick={() => setAckModalOpen(false)} className="mc-close-btn"><i className="fas fa-times" /></button>
            </div>
            <div style={{ padding: 22, overflowY: 'auto', flex: 1 }}>
              <>
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginBottom: 14 }}>
                  <button onClick={emailAcknowledgement} className="mc-btn-primary" style={{ padding: '9px 14px', background: '#3b82f6', color: '#fff', border: 'none', borderRadius: '5px' }}><i className="fas fa-envelope" /> Email Acknowledgement</button>
                  <button onClick={printAcknowledgement} className="mc-btn-primary" style={{ padding: '9px 14px' }} disabled={printingAck}><i className="fas fa-print" /> Print Acknowledgement</button>
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
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 5, flex: '1 1 100px' }}>
                    <label style={{ fontSize: 11, fontWeight: 'bold', color: '#64748b' }}>Year (From)</label>
                    <select className="mc-input"
                      value={ackOverrides.yearFrom || ackOverrides.year}
                      onChange={(e) => {
                        const newYearFrom = e.target.value;
                        const newYearTo = ackOverrides.yearTo || ackOverrides.year;
                        let newAmount = ackOverrides.amount;
                        if (viewRecord) {
                          const fromY = parseInt(newYearFrom, 10);
                          const toY = parseInt(newYearTo, 10);
                          const maxYear = Math.max(new Date().getFullYear(), fromY, toY, 2030);
                          const allRows = buildMcomMultiYearRows({ ...viewRecord, renewal_paid_year: '', renewal_paid_years: '', reg_date: '1990-01-01', year: '1990' }, settings, maxYear);
                          if (!isNaN(fromY) && !isNaN(toY) && fromY <= toY) {
                            let total = 0;
                            for (let y = fromY; y <= toY; y++) {
                              let row = allRows.find(r => r.year === y);
                              if (row) {
                                total += (row.total || 0);
                              } else if (allRows.length > 0) {
                                total += (allRows[allRows.length - 1].total || 0);
                              }
                            }
                            if (total > 0) {
                              newAmount = Number(total).toLocaleString('en-LK', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                            }
                          }
                        }
                        setAckOverrides({ ...ackOverrides, yearFrom: newYearFrom, amount: newAmount });
                      }}>
                      {Array.from({ length: getServerDate().getFullYear() + 3 - 2010 }, (_, i) => getServerDate().getFullYear() + 2 - i).map(y => (
                        <option key={y} value={y}>{y}</option>
                      ))}
                    </select>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 5, flex: '1 1 100px' }}>
                    <label style={{ fontSize: 11, fontWeight: 'bold', color: '#64748b' }}>Year (To)</label>
                    <select className="mc-input"
                      value={ackOverrides.yearTo || ackOverrides.year}
                      onChange={(e) => {
                        const newYearTo = e.target.value;
                        const newYearFrom = ackOverrides.yearFrom || ackOverrides.year;
                        let newAmount = ackOverrides.amount;
                        if (viewRecord) {
                          const fromY = parseInt(newYearFrom, 10);
                          const toY = parseInt(newYearTo, 10);
                          const maxYear = Math.max(new Date().getFullYear(), fromY, toY, 2030);
                          const allRows = buildMcomMultiYearRows({ ...viewRecord, renewal_paid_year: '', renewal_paid_years: '', reg_date: '1990-01-01', year: '1990' }, settings, maxYear);
                          if (!isNaN(fromY) && !isNaN(toY) && fromY <= toY) {
                            let total = 0;
                            for (let y = fromY; y <= toY; y++) {
                              let row = allRows.find(r => r.year === y);
                              if (row) {
                                total += (row.total || 0);
                              } else if (allRows.length > 0) {
                                total += (allRows[allRows.length - 1].total || 0);
                              }
                            }
                            if (total > 0) {
                              newAmount = Number(total).toLocaleString('en-LK', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                            }
                          }
                        }
                        setAckOverrides({ ...ackOverrides, yearTo: newYearTo, year: newYearTo, amount: newAmount });
                      }}>
                      {Array.from({ length: getServerDate().getFullYear() + 3 - 2010 }, (_, i) => getServerDate().getFullYear() + 2 - i).map(y => (
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
                  <div style={{ width: '100%', display: 'flex', gap: 10, marginTop: 5 }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 5, flex: 1 }}>
                      <label style={{ fontSize: 11, fontWeight: 'bold', color: '#64748b' }}>Signatory Name</label>
                      <input type="text" className="mc-input" value={ackOverrides.signName} onChange={(e) => setAckOverrides({ ...ackOverrides, signName: e.target.value })} />
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 5, flex: 1 }}>
                      <label style={{ fontSize: 11, fontWeight: 'bold', color: '#64748b' }}>Signatory Title 1</label>
                      <input type="text" className="mc-input" value={ackOverrides.signTitle1} onChange={(e) => setAckOverrides({ ...ackOverrides, signTitle1: e.target.value })} />
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 5, flex: 1 }}>
                      <label style={{ fontSize: 11, fontWeight: 'bold', color: '#64748b' }}>Signatory Title 2</label>
                      <input type="text" className="mc-input" value={ackOverrides.signTitle2} onChange={(e) => setAckOverrides({ ...ackOverrides, signTitle2: e.target.value })} />
                    </div>
                  </div>
                </div>
                <div style={{ border: `1px solid ${theme.border}`, borderRadius: 10 }}>
                  {renderAcknowledgementLetter(viewRecord)}
                </div>
              </>
            </div>
            <div style={{ padding: '14px 22px', borderTop: `1px solid ${theme.border}`, display: 'flex', justifyContent: 'flex-end' }}>
              <button onClick={() => setAckModalOpen(false)} className="mc-btn-outline">Close</button>
            </div>
          </div>
        </div>
      )}

      {/* ── MCom Renewal Letter Edit Modal ─────────────────────────────── */}
      {rlLetterModalOpen && rlLetterRecord && (
        <div className="mc-overlay" onClick={(e) => { if (e.target === e.currentTarget) setRlLetterModalOpen(false); }}>
          <div className="mc-modal" style={{ maxWidth: 720, display: 'flex', flexDirection: 'column', maxHeight: '90vh' }}>
            <div className="mc-modal-header">
              <span style={{ fontSize: 16, fontWeight: 700 }}>Edit Renewal Letter</span>
              <span style={{ fontSize: 12, color: '#64748b', marginLeft: 8 }}>{rlLetterRecord.mc.new_file_no || rlLetterRecord.mc.file_no}</span>
              <button onClick={() => setRlLetterModalOpen(false)} className="mc-close-btn"><i className="fas fa-times" /></button>
            </div>
            <div style={{ padding: 22, overflowY: 'auto', flex: 1 }}>
              <>
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginBottom: 14, alignItems: 'center' }}>
                  {rlSaved && (
                    <div style={{ fontSize: 12, color: '#16a34a', display: 'flex', alignItems: 'center', gap: 5, marginRight: 'auto' }}>
                      <i className="fas fa-check-circle" /> Saved locally
                    </div>
                  )}
                  {/* Undo Button */}
                  <button
                    onClick={() => { setRlOverrides(rlDefaultOverrides); setRlSaved(false); }}
                    className="mc-btn-outline"
                    style={{ padding: '9px 14px', borderRadius: '5px', color: '#b45309', borderColor: '#d97706' }}
                    title="Reset all edits back to defaults"
                  >
                    <i className="fas fa-undo" /> Undo All
                  </button>
                  <button
                    onClick={() => {
                      saveMComRlOverrides(rlLetterRecord.mc, rlOverrides);
                      setRlSaved(true);
                      showToast('Letter settings saved!', 'success');
                    }}
                    className="mc-btn-outline"
                    style={{ padding: '9px 14px', borderRadius: '5px' }}
                  >
                    <i className="fas fa-save" /> Save Changes
                  </button>
                  <button
                    onClick={() => {
                      saveMComRlOverrides(rlLetterRecord.mc, rlOverrides);
                      setRlLetterModalOpen(false);
                      printRenewalLetter(rlLetterRecord.mc, rlLetterRecord.multiRows, rlOverrides);
                    }}
                    className="mc-btn-primary"
                    style={{ padding: '9px 14px' }}
                  >
                    <i className="fas fa-print" /> Print Letter
                  </button>
                </div>

                {(() => {
                  const parseToFloat = (val) => {
                    if (val == null) return 0;
                    const clean = String(val).replace(/,/g, '').replace(/Rs\.?/gi, '').replace(/\/-|=/g, '').trim();
                    const parsed = parseFloat(clean);
                    return isNaN(parsed) ? 0 : parsed;
                  };

                  const formatDotDate = (dStr) => {
                    if (!dStr) return '';
                    const d = new Date(dStr);
                    if (Number.isNaN(d.getTime())) return dStr;
                    return d.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' }).replace(/\//g, '.');
                  };
                  const displayRows = rlOverrides.tableRows || [];
                  const preDisplayRows = displayRows.filter(r => r.isPre);
                  const postDisplayRows = displayRows.filter(r => !r.isPre);

                  const firstYear = rlLetterRecord.multiRows.length > 0 ? rlLetterRecord.multiRows[0].year : getServerDate().getFullYear();
                  const lastYear = rlLetterRecord.multiRows.length > 0 ? rlLetterRecord.multiRows[rlLetterRecord.multiRows.length - 1].year : getServerDate().getFullYear();
                  const periodLabel = firstYear === lastYear
                    ? `(01/01/${lastYear} - 31/12/${lastYear})`
                    : `(01/01/${firstYear} - 31/12/${lastYear})`;

                  const onUpdateOverrides = (patch) => {
                    setRlOverrides(prev => ({ ...prev, ...patch }));
                  };

                  const updateTableCell = (globalIdx, field) => (e) => {
                    const val = e.currentTarget.innerText.trim();
                    const newRows = displayRows.map((r, i) =>
                      i === globalIdx ? { ...r, [field]: val } : r
                    );
                    onUpdateOverrides({ tableRows: newRows });
                  };

                  const tdEdit = (globalIdx, field, value) => (
                    <td
                      contentEditable
                      suppressContentEditableWarning
                      style={{ minWidth: 30, cursor: 'text', outline: 'none' }}
                      onBlur={updateTableCell(globalIdx, field)}
                      dangerouslySetInnerHTML={{ __html: String(value) }}
                    />
                  );

                  const refDisplay = rlOverrides.refNo || (rlLetterRecord.mc.new_file_no || rlLetterRecord.mc.file_no || '-');
                  const dateDisplay = rlOverrides.date ? formatDotDate(rlOverrides.date) : formatDotDate(getServerDate().toISOString().slice(0, 10));
                  const signName = rlOverrides.signName || 'Arct.M.T. Kapila Priyantha';
                  const signTitle1 = rlOverrides.signTitle1 || 'General Manager';
                  const signTitle2 = rlOverrides.signTitle2 || 'Condominium Management Authority';
                  const addressLines = String(rlLetterRecord.mc.address || '').split(/\r?\n|,/).map(l => l.trim()).filter(Boolean);

                  const editableStyle = {
                    outline: 'none',
                    borderRadius: 3,
                    cursor: 'text',
                    minWidth: 10,
                    display: 'inline-block',
                  };
                  const editableBlockStyle = {
                    outline: 'none',
                    borderRadius: 3,
                    cursor: 'text',
                    minWidth: 10,
                  };

                  const fmt = (n) => (n != null ? Number(n).toLocaleString('en-LK', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '-');

                  return (
                    <>
                      <div style={{ marginBottom: 10, padding: '8px 12px', background: '#f0f9ff', border: '1px solid #bae6fd', borderRadius: 8, fontSize: 12, color: '#0369a1', display: 'flex', alignItems: 'center', gap: 6 }}>
                        <i className="fas fa-pencil-alt" style={{ fontSize: 11 }} />
                        Click on any text in the letter below to edit it directly. Changes are reflected immediately.
                      </div>
                      <div style={{ border: `1px solid ${theme.border}`, borderRadius: 10, padding: '20px 24px', background: '#fff' }}>
                        <div className="official-letter" style={{ fontFamily: 'Times New Roman, serif', fontSize: 15, lineHeight: 1.6 }}>
                          <div className="ol-ref" style={{ overflow: 'hidden', fontWeight: 700, marginBottom: 12 }}>
                            <span
                              contentEditable
                              suppressContentEditableWarning
                              style={{ ...editableStyle, float: 'left' }}
                              onBlur={(e) => onUpdateOverrides({ refNo: e.currentTarget.innerText.trim() })}
                            >{refDisplay}</span>
                            <span
                              contentEditable
                              suppressContentEditableWarning
                              style={{ ...editableStyle, float: 'right' }}
                              onBlur={(e) => onUpdateOverrides({ date: e.currentTarget.innerText.trim() })}
                            >{dateDisplay}</span>
                          </div>

                          <div
                            className="ol-addr"
                            contentEditable
                            suppressContentEditableWarning
                            style={{ ...editableBlockStyle, marginBottom: 12 }}
                          >
                            <div>The Secretary,</div>
                            <div>{rlLetterRecord.mc.management_corporation_name}</div>
                            {addressLines.map((l, i) => <div key={i}>{l}</div>)}
                          </div>

                          <div
                            className="ol-title"
                            contentEditable
                            suppressContentEditableWarning
                            style={{ ...editableBlockStyle, fontWeight: 700, textDecoration: 'underline', marginBottom: 10 }}
                          >
                            RENEWAL REGISTRATION OF THE MANAGEMENT COMMITTEE FOR YEAR<br />{periodLabel}
                          </div>

                          <p
                            className="ol-para"
                            contentEditable
                            suppressContentEditableWarning
                            style={{ ...editableBlockStyle, marginBottom: 12 }}
                            onBlur={(e) => onUpdateOverrides({ bodyParagraph1: e.currentTarget.innerText })}
                            dangerouslySetInnerHTML={{ __html: rlOverrides.bodyParagraph1 }}
                          />

                          {/* Pre-2023 grouped table */}
                          {preDisplayRows.length > 0 && (
                            <>
                              <p className="ol-section" style={{ fontWeight: 700, margin: '10px 0 4px' }}>Period {preDisplayRows[0].yearLabel}{preDisplayRows.length > 1 ? ` - ${preDisplayRows[preDisplayRows.length - 1].yearLabel}` : ''}</p>
                              <table className="ol-table" style={{ width: '100%', borderCollapse: 'collapse', margin: '6px 0 12px', fontSize: 13 }}>
                                <thead>
                                  <tr style={{ background: '#f4f4f4' }}>
                                    <th rowSpan="2" style={{ border: '1px solid #444', padding: '4px 6px', fontWeight: 700 }}>Year</th>
                                    <th colSpan="5" style={{ border: '1px solid #444', padding: '4px 6px', fontWeight: 700 }}>Renewal fee</th>
                                  </tr>
                                  <tr style={{ background: '#f4f4f4' }}>
                                    <th style={{ border: '1px solid #444', padding: '4px 6px', fontWeight: 700 }}>No of Units</th>
                                    <th style={{ border: '1px solid #444', padding: '4px 6px', fontWeight: 700 }}>Amount Rs: Cts:</th>
                                    <th style={{ border: '1px solid #444', padding: '4px 6px', fontWeight: 700 }}>SSCL ({SSCL_RATE * 100}%)</th>
                                    <th style={{ border: '1px solid #444', padding: '4px 6px', fontWeight: 700 }}>VAT {VAT_RATE * 100}%</th>
                                    <th style={{ border: '1px solid #444', padding: '4px 6px', fontWeight: 700 }}>Total Rs: Cts:</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {preDisplayRows.map((row, idx) => {
                                    const globalIdx = displayRows.indexOf(row);
                                    return (
                                      <tr key={idx}>
                                        {tdEdit(globalIdx, 'yearLabel', row.yearLabel)}
                                        {tdEdit(globalIdx, 'units', row.units)}
                                        {tdEdit(globalIdx, 'fee', fmt(row.fee))}
                                        {tdEdit(globalIdx, 'sscl', fmt(row.sscl))}
                                        {tdEdit(globalIdx, 'vat', fmt(row.vat))}
                                        {tdEdit(globalIdx, 'total', fmt(row.total))}
                                      </tr>
                                    );
                                  })}
                                  <tr className="ol-total-row" style={{ fontWeight: 700, background: '#f9f9f9' }}>
                                    <td colSpan="2" style={{ border: '1px solid #444', padding: '4px 6px', textAlign: 'center' }}>Total</td>
                                    <td style={{ border: '1px solid #444', padding: '4px 6px', textAlign: 'center' }}>{fmt(preDisplayRows.reduce((s, r) => s + parseToFloat(r.fee), 0))}</td>
                                    <td style={{ border: '1px solid #444', padding: '4px 6px', textAlign: 'center' }}>{fmt(preDisplayRows.reduce((s, r) => s + parseToFloat(r.sscl), 0))}</td>
                                    <td style={{ border: '1px solid #444', padding: '4px 6px', textAlign: 'center' }}>{fmt(preDisplayRows.reduce((s, r) => s + parseToFloat(r.vat), 0))}</td>
                                    <td style={{ border: '1px solid #444', padding: '4px 6px', textAlign: 'center' }}>{fmt(preDisplayRows.reduce((s, r) => s + parseToFloat(r.total), 0))}</td>
                                  </tr>
                                </tbody>
                              </table>
                            </>
                          )}

                          {preDisplayRows.length > 0 && postDisplayRows.length > 0 && (
                            <p className="ol-para" style={{ margin: '14px 0', textAlign: 'justify' }}>We wish to inform you that charges have been revised and are applicable per unit basis from 01.03.2023 as follows.</p>
                          )}

                          {/* Post-2023 individual years table */}
                          {postDisplayRows.length > 0 && (
                            <>
                              <p className="ol-section" style={{ fontWeight: 700, margin: '10px 0 4px' }}>Period {postDisplayRows[0].yearLabel}{postDisplayRows.length > 1 ? ` - ${postDisplayRows[postDisplayRows.length - 1].yearLabel}` : ''}</p>
                              <table className="ol-table" style={{ width: '100%', borderCollapse: 'collapse', margin: '6px 0 12px', fontSize: 13 }}>
                                <thead>
                                  <tr style={{ background: '#f4f4f4' }}>
                                    <th rowSpan="2" style={{ border: '1px solid #444', padding: '4px 6px', fontWeight: 700 }}>Year</th>
                                    <th colSpan="5" style={{ border: '1px solid #444', padding: '4px 6px', fontWeight: 700 }}>Renewal fee</th>
                                  </tr>
                                  <tr style={{ background: '#f4f4f4' }}>
                                    <th style={{ border: '1px solid #444', padding: '4px 6px', fontWeight: 700 }}>No of Units</th>
                                    <th style={{ border: '1px solid #444', padding: '4px 6px', fontWeight: 700 }}>Amount Rs: Cts:</th>
                                    <th style={{ border: '1px solid #444', padding: '4px 6px', fontWeight: 700 }}>SSCL ({SSCL_RATE * 100}%)</th>
                                    <th style={{ border: '1px solid #444', padding: '4px 6px', fontWeight: 700 }}>VAT {VAT_RATE * 100}%</th>
                                    <th style={{ border: '1px solid #444', padding: '4px 6px', fontWeight: 700 }}>Total Rs: Cts:</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {postDisplayRows.map((row, idx) => {
                                    const globalIdx = displayRows.indexOf(row);
                                    return (
                                      <tr key={idx}>
                                        {tdEdit(globalIdx, 'yearLabel', row.yearLabel)}
                                        {tdEdit(globalIdx, 'units', row.units)}
                                        {tdEdit(globalIdx, 'fee', fmt(row.fee))}
                                        {tdEdit(globalIdx, 'sscl', fmt(row.sscl))}
                                        {tdEdit(globalIdx, 'vat', fmt(row.vat))}
                                        {tdEdit(globalIdx, 'total', fmt(row.total))}
                                      </tr>
                                    );
                                  })}
                                  <tr className="ol-total-row" style={{ fontWeight: 700, background: '#f9f9f9' }}>
                                    <td colSpan="2" style={{ border: '1px solid #444', padding: '4px 6px', textAlign: 'center' }}>Total</td>
                                    <td style={{ border: '1px solid #444', padding: '4px 6px', textAlign: 'center' }}>{fmt(postDisplayRows.reduce((s, r) => s + parseToFloat(r.fee), 0))}</td>
                                    <td style={{ border: '1px solid #444', padding: '4px 6px', textAlign: 'center' }}>{fmt(postDisplayRows.reduce((s, r) => s + parseToFloat(r.sscl), 0))}</td>
                                    <td style={{ border: '1px solid #444', padding: '4px 6px', textAlign: 'center' }}>{fmt(postDisplayRows.reduce((s, r) => s + parseToFloat(r.vat), 0))}</td>
                                    <td style={{ border: '1px solid #444', padding: '4px 6px', textAlign: 'center' }}>{fmt(postDisplayRows.reduce((s, r) => s + parseToFloat(r.total), 0))}</td>
                                  </tr>
                                </tbody>
                              </table>
                            </>
                          )}

                          <p
                            className="ol-para"
                            contentEditable
                            suppressContentEditableWarning
                            style={{ ...editableBlockStyle, marginBottom: 12 }}
                            onBlur={(e) => onUpdateOverrides({ bodyParagraph2: e.currentTarget.innerText })}
                            dangerouslySetInnerHTML={{ __html: rlOverrides.bodyParagraph2 }}
                          />

                          <p className="ol-para" style={{ marginBottom: 8 }}>Thank You.</p>
                          <p className="ol-para" style={{ marginBottom: 8 }}>Yours Faithfully,</p>

                          <div
                            className="ol-sign"
                            contentEditable
                            suppressContentEditableWarning
                            style={{ ...editableBlockStyle, marginTop: 20 }}
                            onBlur={(e) => {
                              const lines = e.currentTarget.innerText.split('\n').filter(l => l.trim());
                              onUpdateOverrides({
                                signName: lines[0] || signName,
                                signTitle1: lines[1] || signTitle1,
                                signTitle2: lines[2] || signTitle2,
                              });
                            }}
                          >
                            <div style={{ height: 35 }} />
                            <div><strong>{signName}</strong></div>
                            <div><strong>{signTitle1}</strong></div>
                            <div><strong>{signTitle2}</strong></div>
                          </div>
                        </div>
                      </div>
                    </>
                  );
                })()}
              </>
            </div>
          </div>
        </div>
      )}

      {/* Reject reason modal */}
      {rejectOpen && mcToReject && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,.5)', zIndex: 410, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div style={{ background: '#fff', borderRadius: 12, width: '100%', maxWidth: 420, padding: 20, boxShadow: '0 24px 70px rgba(0,0,0,.3)' }}>
            <div style={{ fontWeight: 700, fontSize: 14.5, color: theme.text, marginBottom: 10 }}>Reject Renewal Payment</div>
            <textarea
              rows={3}
              placeholder="Reason for rejection (Required)"
              value={rejectReason}
              onChange={e => setRejectReason(e.target.value)}
              style={{ width: '100%', border: `1px solid ${theme.border}`, borderRadius: 8, padding: '10px 12px', fontSize: 13, boxSizing: 'border-box', resize: 'vertical' }}
            />
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 14 }}>
              <button onClick={() => { setRejectOpen(false); setRejectReason(''); setMcToReject(null); }} className="mc-btn-outline" style={{ padding: '7px 16px', background: 'transparent', border: '1px solid #d1d5db', borderRadius: 6, cursor: 'pointer' }}>Cancel</button>
              <button onClick={() => {
                rejectRenewalPayment(mcToReject, rejectReason);
                setRejectOpen(false);
              }} disabled={markingRenewalPaid || !rejectReason.trim()} className="mc-btn-primary" style={{ background: '#dc2626', color: '#fff', border: 'none', padding: '7px 16px', borderRadius: 6, cursor: (markingRenewalPaid || !rejectReason.trim()) ? 'not-allowed' : 'pointer', fontWeight: 600, opacity: (markingRenewalPaid || !rejectReason.trim()) ? 0.6 : 1 }}>
                {markingRenewalPaid ? 'Rejecting...' : 'Confirm Reject'}
              </button>
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

      {isImporting && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 10000,
          background: 'rgba(255,255,255,0.82)', backdropFilter: 'blur(6px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <div style={{
            background: '#fff', borderRadius: 18, boxShadow: '0 8px 40px rgba(26,58,107,0.18)',
            padding: '40px 52px', display: 'flex', flexDirection: 'column',
            alignItems: 'center', gap: 18, minWidth: 280,
          }}>
            <div style={{
              width: 56, height: 56, borderRadius: '50%',
              border: '5px solid #e2e8f0', borderTopColor: theme.navy,
              animation: 'cma-spin 0.85s linear infinite',
            }} />
            <div style={{ fontSize: 17, fontWeight: 700, color: theme.text, letterSpacing: 0.1 }}>Importing Data...</div>
            <div style={{ fontSize: 13, color: theme.text2, marginTop: -6 }}>Please wait while the records are being processed.</div>
            <div style={{ width: '100%', height: 4, background: '#e2e8f0', borderRadius: 4, overflow: 'hidden' }}>
              <div style={{
                height: '100%', width: '40%',
                background: `linear-gradient(90deg, ${theme.navy}, #2563eb)`,
                borderRadius: 4,
                animation: 'cma-progress 1.4s ease-in-out infinite',
              }} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
