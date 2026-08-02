import { useEffect, useMemo, useState, useCallback } from 'react';
import {
  fetchMComs,
  importMComsBulk,
  deleteMComsBulk,
} from '../api';
import { useConfirmDialog } from '../ConfirmDialogContext.jsx';
import '../CMAStyles.css';
import * as XLSX from 'xlsx';
import HistoryModal from '../components/HistoryModal.jsx';
import StatusPill from '../components/StatusPill.jsx';
import { exportToPdfPrint } from '../utils/pdfExport';
import GenericExportModal from '../components/GenericExportModal.jsx';
import { useAutoRefresh } from '../utils/useAutoRefresh';

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

const tableWrapperStyle = {
  overflowX: 'auto',
  maxHeight: 'calc(100vh - 240px)',
  overflowY: 'auto',
  border: `1px solid ${theme.border}`,
  borderRadius: 10,
  background: '#fff',
};

const tableStyle = {
  width: '100%',
  borderCollapse: 'collapse',
  fontSize: 12,
  fontFamily: "'Inter', 'Segoe UI', sans-serif",
  tableLayout: 'fixed',
};

// Compact cell style - fixed width columns with truncation
const cellStyle = {
  padding: '8px 8px',
  fontSize: 12,
  fontFamily: "'Inter', 'Segoe UI', sans-serif",
  lineHeight: 1.35,
  whiteSpace: 'nowrap',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  maxWidth: 0,
};

const thStyle = {
  textAlign: 'left',
  padding: '8px 8px',
  fontSize: 11,
  fontFamily: "'Inter', 'Segoe UI', sans-serif",
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

const thActionsStyle = {
  ...thStyle,
  position: 'sticky',
  top: 0,
  right: 0,
  zIndex: 3,
  background: '#f8fafc',
  borderLeft: `1px solid ${theme.border}`,
};

const tdActionsStyle = {
  ...cellStyle,
  position: 'sticky',
  right: 0,
  zIndex: 1,
  background: '#ffffff',
  borderLeft: `1px solid ${theme.border}`,
  overflow: 'visible',
};

// Column widths (px) - must sum to a reasonable table width
const COL_WIDTHS = {
  'REG DATE': 88,
  'OLD FILE NO': 90,
  'NEW FILE NO': 90,
  'MANAGEMENT CORPORATION': 180,
  'PLAN NO': 72,
  'UNITS': 52,
  'SECRETARY': 110,
  'TOWN': 80,
  'STATUS': 84,
  'ACTIONS': 72,
};

function ActionBtn({ icon, color, title, onClick }) {
  return (
    <button onClick={onClick} title={title} style={{ background: 'none', border: 'none', cursor: 'pointer', color, width: 24, minWidth: 24, height: 24, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, padding: 0, flexShrink: 0 }}>
      <i className={icon} />
    </button>
  );
}

function FormField({ label, value, onChange, type = 'text', span2 }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 5, gridColumn: span2 ? 'span 2' : undefined }}>
      <label style={{ fontSize: 12, fontWeight: 500, color: theme.text2 }}>{label}</label>
      <input type={type} value={value ?? ''} onChange={(e) => onChange(e.target.value)} style={inputStyle} />
    </div>
  );
}

function FormSelect({ label, value, onChange, options }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
      <label style={{ fontSize: 12, fontWeight: 500, color: theme.text2 }}>{label}</label>
      <select value={value ?? ''} onChange={(e) => onChange(e.target.value)} style={inputStyle}>
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
      <div style={{ color: theme.text, wordBreak: 'break-word', flex: 1 }}>{value == null || String(value).trim() === '' ? '-' : String(value)}</div>
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
  const headers = (table[headerIndex] || []).map((h, idx) => normalizeHeaderName(h) || `col${idx}`);
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
  // 1. If it's a direct 4-digit year, return it immediately
  const yearMatch = s.match(/^\s*(19|20)\d{2}\s*$/);
  if (yearMatch) return Number(yearMatch[0].trim());

  // 2. Otherwise, check if there's a 4-digit year inside (like a formatted date string)
  const innerMatch = s.match(/(19|20)\d{2}/);
  if (innerMatch) return Number(innerMatch[0]);

  // 3. Try to parse it as a date using coerceDateText (handles Excel serial numbers)
  const d = coerceDateText(s);
  if (d) {
    const dateMatch = d.match(/^(\d{4})-\d{2}-\d{2}$/);
    if (dateMatch) {
      const parsedYear = Number(dateMatch[1]);
      if (parsedYear >= 1900 && parsedYear <= 2100) return parsedYear;
    }
  }

  const n = Number(s);
  if (Number.isFinite(n) && n >= 1900 && n <= 2100) return n;
  return null;
}

function coerceDateText(v) {
  if (v === null || v === undefined || v === '') return '';
  if (v instanceof Date && !Number.isNaN(v.getTime())) {
    return v.toISOString().slice(0, 10);
  }
  const text = String(v).trim();
  if (/^(19|20)\d{2}$/.test(text)) {
    return `${text}-01-01`;
  }
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

// M.Com Renewal fee schedule - Flat annual fee based on number of parcels (units)
// Source: CMA rate chart (from 01.03.2023)
// Before 2023:
//   - Government M.Com: flat Rs. 250/year
//   - Private M.Com:    same bracket table as MC (Rs. 1,000 – Rs. 20,000 based on units)
const MCOM_RENEWAL_RATES_2023 = [
  { maxUnits: null, minUnits: 101, fee: 20000 }, // 101+ parcels
  { maxUnits: 100, minUnits: 76, fee: 10000 }, // 76-100 parcels
  { maxUnits: 75, minUnits: 51, fee: 7500 }, // 51-75 parcels
  { maxUnits: 50, minUnits: 41, fee: 5000 }, // 41-50 parcels
  { maxUnits: 40, minUnits: 31, fee: 3500 }, // 31-40 parcels
  { maxUnits: 30, minUnits: 21, fee: 2500 }, // 21-30 parcels
  { maxUnits: 20, minUnits: 11, fee: 1500 }, // 11-20 parcels
  { maxUnits: 10, minUnits: 1, fee: 1000 }, // up to 10 parcels
  { maxUnits: 0, minUnits: 0, fee: 250 }, // Government / NHDA M.Com (0 units)
];

// Bracket table for private M.Com pre-2023 (same as MC old rates)
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

// isGov: true → flat Rs. 250/yr (pre-2023 government M.Com)
//        false → bracket table by parcel count (pre-2023 private M.Com)
function getMcomFeeForYear(units, year, isGov) {
  const u = parseInt(units) || 0;
  if (year < 2023) {
    if (isGov) return 250;
    const match = MCOM_OLD_BRACKET_PRE2023.find(r => u >= r.minUnits && (r.maxUnits === null || u <= r.maxUnits));
    return match ? match.fee : 250;
  }
  // New tiered rates from 2023 onwards (both gov & private use same rate card)
  const match = MCOM_RENEWAL_RATES_2023.find(r => u >= r.minUnits && (r.maxUnits === null || u <= r.maxUnits));
  return match ? match.fee : 250;
}

function getMcomAnnualFeeInfo(mc) {
  const units = parseInt(mc?.units) || 0;
  const currentYear = new Date().getFullYear();
  const isGov = String(mc?.mc_mcom || '').toUpperCase().includes('GOV') || String(mc?.category || '').toLowerCase().includes('government');
  const feePerYear = getMcomFeeForYear(units, currentYear, isGov);
  return { units, feePerYear };
}

// Builds multi-year renewal rows for all unpaid years - same logic as MC:
// - renewal_period (last year found + 1) takes priority as start year
// - Falls back to reg_date year
// - paidYear override if system has a manual renewal_paid_year recorded
// Pre-2023 fee:
//   Gov M.Com  → Rs. 250/yr flat
//   Pvt M.Com  → bracket table (same as MC: Rs. 1,000–Rs. 20,000 by unit count)
// 2023+ → parcel-based rate card (both gov & pvt)
function buildMcomMultiYearRows(mc) {
  const units = parseInt(mc?.units) || 0;
  const currentYear = new Date().getFullYear();
  const isGov = String(mc?.mc_mcom || '').toUpperCase().includes('GOV') || String(mc?.category || '').toLowerCase().includes('government');

  // Determine start year - same priority logic as MC's buildMultiYearRenewalRows:
  // 1. renewal_period (extract last 4-digit year, add 1)
  // 2. reg_date year
  let startYear = currentYear;
  const rawPeriod = mc?.renewal_period;
  if (rawPeriod) {
    const periodStr = String(rawPeriod).trim();
    const yearMatches = periodStr.match(/\b(19|20)\d{2}\b/g);
    if (yearMatches && yearMatches.length > 0) {
      // Take the last year found (e.g. "13.10.2011 13.10.2012" → 2012 → start from 2013)
      startYear = parseInt(yearMatches[yearMatches.length - 1]) + 1;
    } else if (/^\d{4}$/.test(periodStr)) {
      startYear = parseInt(periodStr) + 1;
    }
  } else if (mc?.reg_date) {
    const d = new Date(mc.reg_date);
    if (!Number.isNaN(d.getTime())) startYear = d.getFullYear();
  }

  // If system has a recorded paid year from manual payment entry, respect it
  const paidYear = mc?.renewal_paid_year ? parseInt(mc.renewal_paid_year) : null;
  if (paidYear && paidYear >= startYear) startYear = paidYear + 1;

  // End year = current year
  const endYear = currentYear;

  if (startYear > endYear) return [];

  const rows = [];
  for (let year = startYear; year <= endYear; year++) {
    const fee = getMcomFeeForYear(units, year, isGov);
    const sscl = parseFloat((fee * 0.025).toFixed(2));
    const vat = parseFloat(((fee + sscl) * 0.18).toFixed(2));
    const total = parseFloat((fee + sscl + vat).toFixed(2));
    rows.push({ year, units, fee, sscl, vat, total, isGov });
  }
  return rows;
}


// Renewal periods run to 31 December of the registration/renewal year (per CMA's actual
// receipt period, e.g. "01.06.2026 - 31.12.2026"). If that date has already passed and
// the record hasn't been renewed since, roll forward year by year to the next 31 December.
function getRenewalDueDate(mc) {
  const raw = mc?.renewal_date_vise || mc?.next_renewal_date || mc?.reg_date;
  const base = coerceDateText(raw);
  if (!base) return null;
  const baseDate = new Date(base);
  if (Number.isNaN(baseDate.getTime())) return null;

  let dueYear = baseDate.getFullYear();
  let due = new Date(dueYear, 11, 31);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  due.setHours(0, 0, 0, 0);

  while (due < today) {
    dueYear += 1;
    due = new Date(dueYear, 11, 31);
    due.setHours(0, 0, 0, 0);
  }
  return due;
}

// M.Com records only carry a single `agm_date` field (no separate "next" field),
// so that value is treated directly as the scheduled/upcoming AGM date.
function getAgmDueDate(mc) {
  const raw = mc?.next_agm_date || mc?.agm_date_vise || mc?.agm_date;
  const base = coerceDateText(raw);
  if (!base) return null;
  const d = new Date(base);
  return Number.isNaN(d.getTime()) ? null : d;
}

function daysUntil(date) {
  if (!date) return null;
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const target = new Date(date);
  target.setHours(0, 0, 0, 0);
  return Math.round((target - now) / (1000 * 60 * 60 * 24));
}

function formatDisplayDate(d) {
  if (!d) return '-';
  const dt = new Date(d);
  if (Number.isNaN(dt.getTime())) return '-';
  return dt.toISOString().slice(0, 10);
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
    remark: toText(getCell(row, 'remark', 'Remark')) || null,
    new_file_no: newFile || null,
    management_corporation_name:
      toText(getCell(row, 'management_corporation_name', 'Management Corporation Name', 'Name of Management Corporation - New', 'management_corporation_name')) || null,
    address: toText(getCell(row, 'address', 'Address')) || null,
    units: toText(getCell(row, 'units', 'Units')) || null,
    plan_no: toText(getCell(row, 'plan_no', 'Plan No', 'Plan No.')) || null,

    secretary: toText(getCell(row, 'secretary', 'Secretary')) || null,
    secretary_unit_no: toText(getCell(row, 'secretary_unit_no', 'Secretary unit No.', 'Secretary Unit No.')) || null,

    treasurer: toText(getCell(row, 'treasurer', 'Treasurer')) || null,
    treasurer_unit_no: toText(getCell(row, 'treasurer_unit_no', 'Treasurer unit No.', 'Treasurer Unit No.')) || null,

    renewal_period: toText(getCell(row, 'renewal_period', 'Renewal Period')) || null,
    agm_date: coerceDateText(getCell(row, 'agm_date', 'AGM Date')) || null,
    agm_minutes: toText(getCell(row, 'agm_minutes', 'AGM Minutes')) || null,
    attendance: toText(getCell(row, 'attendance', 'Attendance')) || null,

    audited_account: toText(getCell(row, 'audited_account', 'Audited Account', 'Audited_Account')) || null,
    building_insurance: toText(getCell(row, 'building_insurance', 'Building Insurance')) || null,
    renewal_status: toText(getCell(row, 'renewal_status', 'Renewal Status')) || null,
    agm_status: toText(getCell(row, 'agm_status', 'AGM Status')) || null,

    mc_mcom: toText(getCell(row, 'mc_mcom', 'MC', 'MC/M.Com', 'mc_mcom')) || null,
    engineer: toText(getCell(row, 'engineer', 'Engineer', 'Eng.')) || null,
    management_assistant: toText(getCell(row, 'management_assistant', 'MA', 'Management Assistant')) || null,

    town: toText(getCell(row, 'town', 'Town')) || null,
    council: toText(getCell(row, 'council', 'Council')) || null,

    certificate_file_no: toText(getCell(row, 'certificate_file_no', 'Certificate File No.', 'Certificate_File_No')) || null,
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

export { coerceDateText, getRenewalDueDate };

export default function MComManagement({ currentUser, isViewOnly }) {
  const auditUserLabel = currentUser?.name && currentUser?.username
    ? `${currentUser.name} (${currentUser.username})`
    : currentUser?.name || currentUser?.username || '';

  const [mcs, setMcs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshTick, setRefreshTick] = useState(0);

  const [searchTerm, setSearchTerm] = useState(() => {
    const nav = localStorage.getItem('cma_mcom_navigate_search');
    if (nav) {
      localStorage.removeItem('cma_mcom_navigate_search');
      return nav;
    }
    return '';
  });
  const [statusFilter, setStatusFilter] = useState(() => {
    const filter = localStorage.getItem('cma_mcom_filter');
    if (filter) {
      localStorage.removeItem('cma_mcom_filter');
      return filter;
    }
    return '';
  });
  const [yearFilter, setYearFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');

  const [page, setPage] = useState(1);
  const pageSizeDefault = 20;
  const [viewAll, setViewAll] = useState(false);
  const pageSize = viewAll ? 1000 : pageSizeDefault;
  const [totalCount, setTotalCount] = useState(0);

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

  // --- Renewal & AGM Reminders (scanned independently of the visible filters/pagination) ---
  const [reminderMcs, setReminderMcs] = useState([]);
  const [showRenewalPanel, setShowRenewalPanel] = useState(false);
  const [showAgmPanel, setShowAgmPanel] = useState(false);
  const RENEWAL_WINDOW_DAYS = 30; // reminder window before the "31 December" renewal due date
  const AGM_WINDOW_DAYS = 30; // reminder window before the AGM date (one month ahead)

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
    return reminderMcs
      .map((mc) => ({ mc, dueDate: getRenewalDueDate(mc) }))
      .filter((r) => r.dueDate)
      .map((r) => ({ ...r, days: daysUntil(r.dueDate) }))
      .filter((r) => r.days <= RENEWAL_WINDOW_DAYS)
      .sort((a, b) => a.days - b.days);
  }, [reminderMcs]);

  const agmReminders = useMemo(() => {
    return reminderMcs
      .map((mc) => ({ mc, dueDate: getAgmDueDate(mc) }))
      .filter((r) => r.dueDate)
      .map((r) => ({ ...r, days: daysUntil(r.dueDate) }))
      .filter((r) => r.days >= 0 && r.days <= AGM_WINDOW_DAYS)
      .sort((a, b) => a.days - b.days);
  }, [reminderMcs]);

  // Proactively surface a toast the first time reminders are found (in addition to the on-demand bell panels)
  useEffect(() => {
    if (agmReminders.length > 0) {
      showToast(`${agmReminders.length} AGM(s) coming up within ${AGM_WINDOW_DAYS} days`, 'info');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [agmReminders.length]);

  useEffect(() => {
    if (renewalReminders.length > 0) {
      showToast(`${renewalReminders.length} M.Com renewal(s) due by 31 December`, 'info');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [renewalReminders.length]);

  const stats = useMemo(() => {
    const total = totalCount;
    const active = mcs.filter((r) => String(r.status).toLowerCase() === 'active').length;
    // M.Com requested statuses are New/Open/Pending/Close, so keep simple:
    const open = mcs.filter((r) => String(r.status).toLowerCase() === 'open').length;
    const pending = mcs.filter((r) => String(r.status).toLowerCase() === 'pending').length;
    return { total, active: open, inactive: total - open, pending };
  }, [mcs, totalCount]);

  const filtered = mcs || [];

  const API_BASE = (import.meta.env.VITE_API_URL || '/api').trim();

  async function load() {
    setLoading(true);
    try {
      const data = await fetchMComs({
        year: yearFilter || undefined,
        mc_mcom: categoryFilter?.trim() || undefined,
        status: statusFilter || undefined,
        q: searchTerm?.trim() || undefined,
        page: viewAll ? 1 : page,
        limit: pageSize,
      });

      // backend returns {rows,total}
      const rows = data?.rows ?? [];
      setMcs(rows);
      setTotalCount(data?.total ?? 0);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    setPage(1);
  }, [statusFilter, yearFilter, categoryFilter, searchTerm, viewAll]);

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter, yearFilter, categoryFilter, searchTerm, page, viewAll, refreshTick]);

  async function openViewById(id) {
    if (!id) return;
    const matched = mcs.find((item) => String(item.id) === String(id));
    if (matched) {
      openView(matched);
      return;
    }

    const API_BASE = (import.meta.env.VITE_API_URL || '/api').trim();
    try {
      const response = await fetch(`${API_BASE}/mcom/${encodeURIComponent(id)}`);
      if (!response.ok) return;
      const mc = await response.json();
      if (mc) openView(mc);
    } catch (e) {
      console.error('Failed to open MCom by id:', e);
    }
  }

  useEffect(() => {
    const pendingId = sessionStorage.getItem('cma_open_mcom_id');
    if (pendingId) {
      sessionStorage.removeItem('cma_open_mcom_id');
      openViewById(pendingId);
    }
  }, [mcs]);

  useEffect(() => {
    const handleOpenEvent = (event) => {
      openViewById(event?.detail);
    };
    window.addEventListener('cma:open-mcom-id', handleOpenEvent);
    return () => window.removeEventListener('cma:open-mcom-id', handleOpenEvent);
  }, [mcs]);

  useEffect(() => {
    const handleFilterEvent = (event) => {
      if (event?.detail) {
        setStatusFilter(event.detail);
        setSearchTerm('');
        setYearFilter('');
        setCategoryFilter('');
      }
    };
    window.addEventListener('cma:filter-mcom', handleFilterEvent);
    return () => window.removeEventListener('cma:filter-mcom', handleFilterEvent);
  }, []);

  // Auto-refresh every 30 seconds
  const triggerRefresh = useCallback(() => setRefreshTick(t => t + 1), []);
  useAutoRefresh(triggerRefresh, 30000);

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
        showToast('M.Com updated successfully');
      } else {
        const r = await fetch(`${API_BASE}/mcom`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        const body = await r.json().catch(() => ({}));
        if (!r.ok) throw new Error(body.error || 'Create failed');
        showToast('M.Com created successfully');
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
    const endYear = multiRows.length > 0 ? multiRows[multiRows.length - 1].year : new Date().getFullYear();

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
      const payload = {
        renewal_paid: true,
        renewal_paid_date: new Date().toISOString().slice(0, 10),
        renewal_paid_amount: parseFloat(grandTotal.toFixed(2)),
        renewal_paid_year: endYear,
        renewal_payment_status: 'Pending Approval',
        next_renewal_date: `${endYear + 1}-01-01`,
        modified_by: auditUserLabel || 'system',
      };
      const r = await fetch(`${API_BASE}/mcom/${mc.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const body = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(body.error || 'Update failed');

      // Notify AGM that the payment is recorded and needs approval
      fetch(`${API_BASE}/notifications`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'info',
          title: 'M.Com Renewal Payment Pending Approval',
          message: `Renewal payment of Rs. ${Number(grandTotal || 0).toLocaleString('en-LK', { minimumFractionDigits: 2 })} for ${mc.management_corporation_name || mc.name || 'M.Com'} (File No: ${mc.new_file_no || mc.file_no || '-'}) has been recorded by ${auditUserLabel}. Please review and approve.`,
          target_role: 'AGM',
          link: `mcom:${mc.id}`,
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

  async function approveRenewalPayment(mc) {
    setMarkingRenewalPaid(true);
    try {
      const ackNo = `ACK/MCOM/${mc.new_file_no || mc.file_no || mc.id}/${new Date().getFullYear()}`;
      const payload = {
        renewal_payment_status: 'Approved',
        acknowledgement_no: ackNo,
        acknowledgement_date: new Date().toISOString().slice(0, 10),
        renewal_paid: true,
        modified_by: auditUserLabel || 'system',
      };
      const r = await fetch(`${API_BASE}/mcom/${mc.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const body = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(body.error || 'Approve failed');

      // Notify MA that the payment is approved and Acknowledgement is ready
      fetch(`${API_BASE}/notifications`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'success',
          title: 'M.Com Renewal Payment Approved',
          message: `Renewal payment for ${mc.management_corporation_name || mc.name || 'M.Com'} (File No: ${mc.new_file_no || mc.file_no || '-'}) has been approved by the AGM. Acknowledgement No: ${ackNo}. You can now download the Acknowledgement letter.`,
          target_role: 'MA',
          link: `mcom:${mc.id}`,
        }),
      }).catch(() => { });

      showToast('Renewal payment approved successfully');
      setRenewalModalOpen(false);
      await load();
    } catch (e) {
      showToast(e.message || 'Failed to approve', 'error');
    } finally {
      setMarkingRenewalPaid(false);
    }
  }

  function printRenewalLetter(mc, multiRows) {
    const fmt = (n) => (n != null ? Number(n).toLocaleString('en-LK', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '-');
    const formatDotDate = (dStr) => {
      if (!dStr) return '';
      const d = new Date(dStr);
      if (Number.isNaN(d.getTime())) return dStr;
      return d.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' }).replace(/\//g, '.');
    };
    const escapeHtml = (unsafe) => String(unsafe).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;');

    const fileNo = escapeHtml(mc.new_file_no || mc.file_no || mc.old_file_no || '-');
    const today = new Date().toISOString().slice(0, 10);
    const addressLines = String(mc.address || '').split(/\r?\n|,/).map((l) => l.trim()).filter(Boolean);
    const planNoStr = mc.plan_no ? ` Plan No. ${escapeHtml(mc.plan_no)},` : ',';

    // Rows
    const preRows = multiRows.filter(r => r.year < 2023);
    const postRows = multiRows.filter(r => r.year >= 2023);

    const preFee = preRows.reduce((s, r) => s + r.fee, 0);
    const preSscl = preRows.reduce((s, r) => s + r.sscl, 0);
    const preVat = preRows.reduce((s, r) => s + r.vat, 0);
    const preTotal = preRows.reduce((s, r) => s + r.total, 0);

    const postFee = postRows.reduce((s, r) => s + r.fee, 0);
    const postSscl = postRows.reduce((s, r) => s + r.sscl, 0);
    const postVat = postRows.reduce((s, r) => s + r.vat, 0);
    const postTotal = postRows.reduce((s, r) => s + r.total, 0);

    const grandTotal = multiRows.reduce((s, r) => s + r.total, 0);
    const firstYear = multiRows.length > 0 ? multiRows[0].year : new Date().getFullYear();
    const lastYear = multiRows.length > 0 ? multiRows[multiRows.length - 1].year : new Date().getFullYear();
    const prevYear = firstYear - 1;

    const periodLabel = firstYear === lastYear
      ? `(01/01/${lastYear} - 31/12/${lastYear})`
      : `(01/01/${firstYear} - 31/12/${lastYear})`;

    // Pre-2023 Table (Flat rate 500/yr for M.Com, same header structure as image)
    const preTable = preRows.length > 0 ? `
        <p class="ol-section">Period ${preRows[0].year}${preRows.length > 1 ? ` - ${preRows[preRows.length - 1].year}` : ''}</p>
        <table class="ol-table">
          <thead>
            <tr>
              <th rowspan="2" style="min-width:55px">Year</th>
              <th colspan="5">Renewal fee</th>
            </tr>
            <tr>
              <th style="min-width:80px">No of Units</th>
              <th>Amount<br/>Rs:&nbsp;&nbsp;Cts:</th>
              <th>SSCL<br/>(2.5%)</th>
              <th>VAT<br/>18%</th>
              <th>Total<br/>Rs:&nbsp;&nbsp;Cts:</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>${preRows[0].year}${preRows.length > 1 ? `-${preRows[preRows.length - 1].year}` : ''}</td>
              <td>${preRows.length > 1 ? `${preRows.length} Years` : '1 Year'}</td>
              <td>${fmt(preFee)}</td>
              <td>${fmt(preSscl)}</td>
              <td>${fmt(preVat)}</td>
              <td>${fmt(preTotal)}</td>
            </tr>
            <tr class="ol-total-row">
              <td colspan="2">Total</td>
              <td>${fmt(preFee)}</td>
              <td>${fmt(preSscl)}</td>
              <td>${fmt(preVat)}</td>
              <td>${fmt(preTotal)}</td>
            </tr>
          </tbody>
        </table>` : '';

    const transitionNote = (preRows.length > 0 && postRows.length > 0)
      ? `<p class="ol-para">We wish to inform you that charges have been revised and are applicable per unit basis from 01.03.2023 as follows.</p>`
      : '';

    // Post-2023 Table - exact format from image: Period YYYY heading, Year rowspan=2, Renewal fee colspan=5
    const postTable = postRows.length > 0 ? `
        <p class="ol-section">Period ${postRows[0].year}${postRows.length > 1 ? ` - ${postRows[postRows.length - 1].year}` : ''}</p>
        <table class="ol-table">
          <thead>
            <tr>
              <th rowspan="2" style="min-width:55px">Year</th>
              <th colspan="5">Renewal fee</th>
            </tr>
            <tr>
              <th style="min-width:80px">No of Units</th>
              <th>Amount<br/>Rs:&nbsp;&nbsp;Cts:</th>
              <th>SSCL<br/>(2.5%)</th>
              <th>VAT<br/>18%</th>
              <th>Total<br/>Rs:&nbsp;&nbsp;Cts:</th>
            </tr>
          </thead>
          <tbody>
            ${postRows.map(r => `
            <tr>
              <td>${r.year}</td>
              <td>${r.units}</td>
              <td>${fmt(r.fee)}</td>
              <td>${fmt(r.sscl)}</td>
              <td>${fmt(r.vat)}</td>
              <td>${fmt(r.total)}</td>
            </tr>`).join('')}
            <tr class="ol-total-row">
              <td colspan="2">Total</td>
              <td>${fmt(postFee)}</td>
              <td>${fmt(postSscl)}</td>
              <td>${fmt(postVat)}</td>
              <td>${fmt(postTotal)}</td>
            </tr>
          </tbody>
        </table>` : '';

    const letterHtml = `
      <div class="official-letter">
        <div class="ol-ref"><span>${fileNo}</span><span>${formatDotDate(today)}</span></div>
        <div class="ol-addr">
          <div>The Secretary,</div>
          <div>The Management Corporation${planNoStr}</div>
          <div>&quot;${escapeHtml(mc.management_corporation_name || '-')}&quot;,</div>
          ${addressLines.map(l => `<div>${escapeHtml(l)},</div>`).join('')}
        </div>
        <div class="ol-title">RENEWAL REGISTRATION OF THE MANAGEMENT CORPORATION FOR YEAR<br/>${periodLabel}</div>
        <p class="ol-para">The Registration of your Management Corporation has been expired on 31.12.${prevYear}. Therefore, please make arrangements to renew the registration of your Management Corporation up to 31.12.${lastYear}.</p>
        
        ${preTable}
        ${transitionNote}
        ${postTable}

        <p class="ol-para">Every management corporation is required to pay the registration fees for the year before 31<sup>st</sup> March ${lastYear}. But since you have failed to pay the said fees so far, I hereby request you to take necessary steps to pay some of <strong>Rs. ${fmt(grandTotal)}</strong> as soon as possible with duly prepared application form (annex-01).</p>
        <p class="ol-para">Payment with regard to the above can be paid by cash or cheque in favor of &quot;<strong>Condominium Management Authority</strong>&quot;</p>
        <div class="ol-footer" style="page-break-inside: avoid;">
          <p class="ol-para">Thank You.</p>
          <p class="ol-para">Yours Faithfully,</p>
          <div class="ol-sign">
            <div class="ol-sign-space"></div>
            <div><strong>Arct.M.T. Kapila Priyantha</strong></div>
            <div><strong>General Manager</strong></div>
            <div><strong>Condominium Management Authority</strong></div>
          </div>
        </div>
      </div>
    `;

    const receiptHtml = `
      <div class="print-receipt">
        <div class="rc-topline"><span class="rc-regno">No. ${fileNo}</span></div>
        <div class="rc-head">
          <div class="rc-logo"><img src="/assets/cma-logo.png" alt="CMA Logo" /></div>
          <div class="rc-title">CONDOMINIUM MANAGEMENT AUTHORITY</div>
          <div class="rc-sub">Customer Care Division / Legal Division</div>
        </div>
        <div class="rc-row"><span class="rc-fill-label">DGM Finance / Shroff</span><span class="rc-fill-line"></span></div>
        <div class="rc-checkline">
          <span>Registration of Management Corporation</span><span class="rc-box"></span>
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
            <tr><td class="rc-label">Fee Rs.</td><td>${fmt(preFee + postFee)}</td></tr>
            <tr><td class="rc-label">Other Tax - SSCL (2.5%)</td><td>${fmt(preSscl + postSscl)}</td></tr>
            <tr><td class="rc-label">VAT (18%)</td><td>${fmt(preVat + postVat)}</td></tr>
            <tr class="rc-total"><td>Total Amount Rs.</td><td>${fmt(grandTotal)}</td></tr>
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
  
  .doc-page { 
    padding: 15mm; 
    min-height: 100vh;
    position: relative;
    page-break-after: always; 
    break-after: page; 
  }
  .doc-page:first-child {
    padding-top: 2.5in;
  }
  .doc-page:last-child {
    page-break-after: auto;
    break-after: auto;
  }
  
  @media print {
    body { min-height: 100vh; }
    .doc-page { 
      page-break-after: always; 
      break-after: page; 
      display: block; 
    }
  }

  /* - Covering Letter - */
  .official-letter { max-width: 700px; margin: 0 auto; padding: 10px; font-family: Garamond, 'Times New Roman', serif; font-size: 13px; line-height: 1.4; }
  .official-letter .ol-ref { display: flex; justify-content: space-between; font-weight: 700; margin-bottom: 12px; }
  .official-letter .ol-addr { margin-bottom: 12px; }
  .official-letter .ol-addr div { margin: 2px 0; }
  .official-letter .ol-title { text-align: left; font-weight: 700; text-decoration: underline; margin: 12px 0; }
  .official-letter .ol-yearline { font-weight: 700; margin: 6px 0; }
  .official-letter .ol-section { font-weight: 700; margin: 10px 0 2px; font-size: 13px; text-indent: 0; }
  .official-letter .ol-para { margin: 8px 0; text-align: justify; }
  .official-letter table.ol-table { width: 100%; border-collapse: collapse; margin: 2px 0 10px; font-size: 12px; }
  .official-letter table.ol-table th, .official-letter table.ol-table td { border: 1px solid #000; padding: 3px 6px; text-align: center; vertical-align: middle; }
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
  <div class="doc-page">${letterHtml}</div>
  <div class="doc-page">${receiptHtml}</div>
  <script>
    window.addEventListener('load', function() {
      setTimeout(function() {
        window.focus();
        window.print();
      }, 400);
    });
  </script>
</body>
</html>`;

    const blob = new Blob([html], { type: 'text/html' });
    const blobUrl = URL.createObjectURL(blob);
    const printWin = window.open(blobUrl, '_blank', 'noopener,noreferrer');
    if (!printWin) {
      showToast('Please allow pop-ups to print the renewal receipt', 'error');
      return;
    }
    setTimeout(() => URL.revokeObjectURL(blobUrl), 10000);
  }

  async function handleExport(format) {
    try {
      setExporting(true);
      showToast('Preparing export...');

      const response = await fetch(`${API_BASE}/mcom?limit=999999`);
      const result = await response.json();
      const allRecords = result.rows || result || [];

      const rows = (allRecords || []).map((r) => ({
        file_no: r.file_no ?? '',
        reg_date: r.reg_date ?? '',
        old_file_no: r.old_file_no ?? '',
        remark: r.remark ?? '',
        new_file_no: r.new_file_no ?? '',
        management_corporation_name: r.management_corporation_name ?? '',
        address: r.address ?? '',
        units: r.units ?? '',
        plan_no: r.plan_no ?? '',
        secretary: r.secretary ?? '',
        secretary_unit_no: r.secretary_unit_no ?? '',
        treasurer: r.treasurer ?? '',
        treasurer_unit_no: r.treasurer_unit_no ?? '',
        renewal_period: r.renewal_period ?? '',
        agm_date: r.agm_date ?? '',
        agm_minutes: r.agm_minutes ?? '',
        attendance: r.attendance ?? '',
        audited_account: r.audited_account ?? '',
        building_insurance: r.building_insurance ?? '',
        renewal_status: r.renewal_status ?? '',
        agm_status: r.agm_status ?? '',
        mc_mcom: r.mc_mcom ?? '',
        engineer: r.engineer ?? '',
        management_assistant: r.management_assistant ?? '',
        town: r.town ?? '',
        council: r.council ?? '',
        certificate_file_no: r.certificate_file_no ?? '',
        email_address: r.email_address ?? '',
        awareness_date: r.awareness_date ?? '',
        category: r.category ?? '',
        year: r.year ?? '',
        status: r.status ?? '',
        created_by: r.created_by ?? '',
        modified_by: r.modified_by ?? '',
        created_at: r.created_at ?? '',
        updated_at: r.updated_at ?? '',
      }));

      if (format === 'pdf') {
        exportToPdfPrint('M.Com Records', rows);
        setExportModalOpen(false);
        showToast('PDF print dialog opened successfully');
        return;
      }

      const ws = window.XLSX.utils.json_to_sheet(rows);
      const wb = window.XLSX.utils.book_new();
      window.XLSX.utils.book_append_sheet(wb, ws, 'MCom');
      window.XLSX.writeFile(wb, `CMA_MComRecords_${new Date().toISOString().split('T')[0]}.xlsx`);
      setExportModalOpen(false);
      showToast('Exported successfully');
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
      // Don-t block import only because `management_corporation_name` didn-t map.
      const records = allRows
        .map(toBackendRecordFromExcelRow)
        .filter((r) => toText(r.file_no) || toText(r.new_file_no) || toText(r.old_file_no))
        .map((record) => ({
          ...record,
          ...(auditUserLabel ? { created_by: auditUserLabel, modified_by: auditUserLabel } : {}),
        }));

      if (!records.length) return showToast('No valid records found (missing file_no)', 'error');

      await importMComsBulk(records);
      showToast(`Imported ${records.length} records -`);
      setLastImportedFileNos(records.map((x) => x.file_no).filter(Boolean));
      await load();
    } catch (err) {
      showToast(err.message || 'Import failed', 'error');
    } finally {
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
      showToast(`Deleted ${res.deleted || lastImportedFileNos.length} records -`, 'success');
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
      const r = await fetch(`${API_BASE}/mcom`, { method: 'DELETE' });
      const res = await r.json();
      if (!r.ok) throw new Error(res.error || 'Delete all failed');
      showToast(`Deleted all M.Com records -`);
      setLastImportedFileNos([]);
      await load();
    } catch (err) {
      showToast(err.message || 'Delete all failed', 'error');
    }
  }

  const TABLE_HEADERS = [
    'REG DATE',
    'OLD FILE NO',
    'NEW FILE NO',
    'MANAGEMENT CORPORATION',
    'PLAN NO',
    'UNITS',
    'SECRETARY',
    'TOWN',
    'STATUS',
    'ACTIONS',
  ];

  const maxPage = Math.max(1, Math.ceil(totalCount / pageSize));

  return (
    <div style={{ padding: 20, fontFamily: "'Inter', 'Segoe UI', sans-serif", background: theme.bg, minHeight: '100vh' }}>
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
          {!isViewOnly && (
            <label style={{ ...btnOutline, cursor: 'pointer', margin: 0 }}>
              <i className="fas fa-download" /> Import
              <input type="file" accept=".xlsx,.xls" style={{ display: 'none' }} onChange={importExcel} />
            </label>
          )}
          {!isViewOnly && (
            <button onClick={handleDeleteAll} style={{ ...btnOutline, color: theme.red, borderColor: theme.red }} title="Delete all M.Com Records">
              <i className="fas fa-trash" /> Delete All
            </button>
          )}
          {!isViewOnly && lastImportedFileNos && lastImportedFileNos.length > 0 && (
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
                  const info = getRenewalAmountInfo(mc);
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
                  <div key={mc.id} style={{ padding: '10px 14px', borderBottom: `1px solid ${theme.border}`, cursor: 'pointer' }} onClick={() => { openView(mc); setShowAgmPanel(false); }}>
                    <div style={{ fontSize: 12.5, fontWeight: 600, color: theme.text }}>{mc.management_corporation_name || mc.name}</div>
                    <div style={{ fontSize: 10.5, color: theme.text3 }}>File No: {mc.new_file_no || mc.file_no || mc.old_file_no || '-'}</div>
                    <div style={{ fontSize: 11, color: theme.text2, marginTop: 2 }}>
                      {days === 0 ? 'AGM today' : `AGM in ${days} day(s)`} &middot; {formatDisplayDate(getAgmDueDate(mc))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {!isViewOnly && <button onClick={openAdd} style={btnPrimary}>
            <i className="fas fa-plus" /> Add M.Com
          </button>}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))', gap: 14, marginBottom: 16 }}>
        {[
          { label: 'TOTAL MCOM', value: stats.total, icon: 'fa-folder-open', color: theme.blue },
          { label: 'ACTIVE', value: stats.active, icon: 'fa-check-circle', color: theme.green },
          { label: 'NON ACTIVE', value: stats.inactive, icon: 'fa-ban', color: theme.text2 },
          { label: 'PENDING', value: stats.pending, icon: 'fa-exclamation', color: theme.red },
        ].map(({ label, value, icon, color }) => (
          <div key={label} style={{ background: theme.card, borderRadius: 12, padding: 18, border: `1px solid ${theme.border}` }}>
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
        ))}
      </div>

      <div style={{ background: theme.card, borderRadius: 12, border: `1px solid ${theme.border}`, boxShadow: '0 2px 12px rgba(0,0,0,.07)', overflow: 'hidden' }}>
        <div style={{ padding: '16px 18px', borderBottom: `1px solid ${theme.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
          <span style={{ fontSize: 14, fontWeight: 600, color: theme.text }}>All M.Com Records</span>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
            <input
              type="text"
              placeholder="Search M.Com..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{ padding: '8px 12px', borderRadius: 4, border: '1px solid #ddd', fontSize: 12, width: 160 }}
            />
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} style={{ padding: '8px 12px', borderRadius: 4, border: '1px solid #ddd', fontSize: 12, minWidth: 120 }}>
              <option value="">All Status</option>
              <option value="New">New</option>
              <option value="Open">Open</option>
              <option value="Pending">Pending</option>
              <option value="Close">Close</option>
            </select>
            <select
              value={yearFilter}
              onChange={(e) => setYearFilter(e.target.value)}
              style={{ padding: '8px 12px', borderRadius: 4, border: '1px solid #ddd', fontSize: 12, minWidth: 95 }}
            >
              <option value="">All Years</option>
              {Array.from({ length: new Date().getFullYear() - 2000 + 1 }, (_, i) => new Date().getFullYear() - i).map((y) => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              style={{ padding: '8px 12px', borderRadius: 4, border: '1px solid #ddd', fontSize: 12, minWidth: 130 }}
            >
              <option value="">All MC/M.Com</option>
              <option value="GOV M.COM">GOV M.COM</option>
              <option value="PVT M.COM">PVT M.COM</option>
            </select>
            <button onClick={() => setViewAll((v) => !v)} style={viewAll ? btnPrimary : btnOutline} title="Load up to 1000 rows">
              {viewAll ? 'View Paging' : 'View All (1000)'}
            </button>
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
            {viewAll && (
              <span style={{ fontSize: 12, color: theme.text3 }}><strong style={{ color: theme.text }}>All (up to 1000)</strong></span>
            )}
          
                {/* ZOOM BUTTON */}
                <button
                  onClick={(e) => {
                    let container = e.currentTarget;
                    let wrapper = null;
                    while (container && !wrapper) {
                      wrapper = container.querySelector('div[style*="tableWrapperStyle"]') || container.querySelector('div[style*="overflow"]');
                      container = container.parentElement;
                    }
                    wrapper = wrapper || document.querySelector('div[style*="overflow"]');
                    
                    if(wrapper) {
                      wrapper.classList.toggle('table-fullscreen-mode');
                      e.currentTarget.classList.toggle('zoom-btn-floating');
                      const i = e.currentTarget.querySelector('i');
                      if (wrapper.classList.contains('table-fullscreen-mode')) {
                        i.className = 'fas fa-compress';
                        e.currentTarget.innerHTML = '<i class="fas fa-compress"></i> Exit Zoom';
                      } else {
                        i.className = 'fas fa-expand';
                        e.currentTarget.innerHTML = '<i class="fas fa-expand"></i> Zoom Table';
                      }
                    }
                  }}
                  className="mc-btn-base"
                  style={{ background: '#e0e7ff', color: '#4338ca', border: '1px solid #c7d2fe', padding: '5px 12px', fontSize: 12, marginLeft: 8 }}
                >
                  <i className="fas fa-expand" /> Zoom Table
                </button>
</div>
        </div>

        <div style={tableWrapperStyle}>
          <table style={tableStyle}>
            <colgroup>
              {TABLE_HEADERS.map((h) => (
                <col key={h} style={{ width: COL_WIDTHS[h] }} />
              ))}
            </colgroup>
            <thead>
              <tr>
                {TABLE_HEADERS.map((h) => (
                  <th key={h} style={h === 'ACTIONS' ? thActionsStyle : thStyle}>
                  {h}
                </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={TABLE_HEADERS.length} style={{ padding: 24, textAlign: 'center', color: theme.text3 }}>Loading...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={TABLE_HEADERS.length} style={{ padding: 24, textAlign: 'center', color: theme.text3 }}>No M.Com records found</td></tr>
              ) : (
                filtered.map((mc) => (
                  <tr key={mc.id} style={{ borderBottom: `1px solid ${theme.border}` }}
                    onMouseEnter={(e) => e.currentTarget.style.background = '#f8fafc'}
                    onMouseLeave={(e) => e.currentTarget.style.background = ''}
                  >
                    <td style={cellStyle} title={mc.reg_date || '-'}>{mc.reg_date || '-'}</td>
                    <td style={cellStyle} title={mc.old_file_no || '-'}>{mc.old_file_no || '-'}</td>
                    <td style={cellStyle} title={mc.new_file_no || '-'}>{mc.new_file_no || '-'}</td>
                    <td style={cellStyle} title={mc.management_corporation_name || '-'}>{mc.management_corporation_name || '-'}</td>
                    <td style={cellStyle} title={mc.plan_no || '-'}>{mc.plan_no || '-'}</td>
                    <td style={cellStyle}>{mc.units ?? '-'}</td>
                    <td style={cellStyle} title={mc.secretary || '-'}>{mc.secretary || '-'}</td>
                    <td style={cellStyle} title={mc.town || '-'}>{mc.town || '-'}</td>
                    <td style={{ ...cellStyle, overflow: 'visible' }}><StatusPill status={mc.status} /></td>
                    <td style={{ ...tdActionsStyle, background: '#ffffff' }}>
                      <div style={{ display: 'flex', gap: 2 }}>
                        <ActionBtn icon="fas fa-eye" color="#2563eb" title="View" onClick={() => openView(mc)} />
                        <ActionBtn icon="fas fa-history" color="#8b5cf6" title="History" onClick={() => { setSelectedHistoryRecord(mc); setShowHistoryModal(true); }} />
                        {!isViewOnly && <ActionBtn icon="fas fa-edit" color="#f59e0b" title="Edit" onClick={() => openEdit(mc)} />}
                        {!isViewOnly && <ActionBtn icon="fas fa-trash" color={theme.red} title="Delete" onClick={() => remove(mc.id)} />}
                        <ActionBtn icon="fas fa-sync-alt" color={theme.green} title="Renewal" onClick={() => openRenewal(mc)} />
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
          <div style={{ ...modalStyle, maxWidth: 580, display: 'flex', flexDirection: 'column', maxHeight: '90vh' }}>
            <div style={modalHeader}>
              <span style={{ fontSize: 16, fontWeight: 700 }}>{editingId ? 'Edit M.Com Record' : 'Add M.Com Record'}</span>
              <button onClick={() => setModalOpen(false)} style={closeBtnStyle}><i className="fas fa-times" /></button>
            </div>

            <div style={{ padding: '0 22px', borderBottom: `1px solid ${theme.border}`, display: 'flex', background: theme.bg, position: 'sticky', top: 0, zIndex: 10, justifyContent: 'flex-end' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 0' }}>
                <span style={{ fontSize: 12, fontWeight: 600, color: theme.text2 }}>Status:</span>
                <select
                  value={formData.status || 'New'}
                  onChange={e => field('status')(e.target.value)}
                  disabled={!editingId}
                  style={{ width: 130, padding: '5px 10px', borderRadius: 6, border: `1px solid ${theme.border}`, background: '#fff', outline: 'none', fontSize: 13, fontWeight: 700, color: formData.status === 'Open' ? theme.blue : formData.status === 'New' ? theme.green : formData.status === 'Pending' ? '#d97706' : theme.text, opacity: !editingId ? 0.7 : 1, cursor: !editingId ? 'not-allowed' : 'pointer' }}
                >
                  <option value="New" disabled={!editingId}>New</option>
                  <option value="Open">Open</option>
                  <option value="Pending">Pending</option>
                  <option value="Close">Close</option>
                </select>
              </div>
            </div>

            <div style={{ padding: 22, display: 'flex', flexDirection: 'column', gap: 14, overflowY: 'auto', flex: 1 }}>
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
              <FormSelect
                label="MC/M.Com"
                value={formData.mc_mcom}
                onChange={field('mc_mcom')}
                options={['GOV M.COM', 'PVT M.COM']}
              />

              <SectionLabel>AGM / Renewal</SectionLabel>
              <FormField label="Renewal Period" value={formData.renewal_period} onChange={field('renewal_period')} />
              <FormField label="AGM Date" value={formData.agm_date} onChange={field('agm_date')} />
              <FormField label="AGM Minutes" value={formData.agm_minutes} onChange={field('agm_minutes')} />
              <FormField label="Attendance" value={formData.attendance} onChange={field('attendance')} />
              <FormField label="Renewal Status" value={formData.renewal_status} onChange={field('renewal_status')} />
              <FormField label="AGM Status" value={formData.agm_status} onChange={field('agm_status')} />
              <FormField label="Audited Account" value={formData.audited_account} onChange={field('audited_account')} />
              <FormField label="Building Insurance" value={formData.building_insurance} onChange={field('building_insurance')} />

              <SectionLabel>Category / Status</SectionLabel>
              <FormField label="Year" type="number" value={formData.year} onChange={field('year')} />
            </div>

            <div style={{ padding: '14px 22px', borderTop: `1px solid ${theme.border}`, display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button onClick={() => setModalOpen(false)} style={btnOutline}>Cancel</button>
              <button onClick={save} style={btnPrimary}>
                <i className="fas fa-save" /> {editingId ? 'Update' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}

      {viewModalOpen && viewRecord && (
        <div style={overlayStyle} onClick={(e) => e.target === e.currentTarget && setViewModalOpen(false)}>
          <div style={{ ...modalStyle, maxWidth: 720, display: 'flex', flexDirection: 'column', maxHeight: '90vh' }}>
            <div style={modalHeader}>
              <span style={{ fontSize: 16, fontWeight: 700 }}>M.Com Record Details</span>
              <button onClick={() => setViewModalOpen(false)} style={closeBtnStyle}><i className="fas fa-times" /></button>
            </div>

            <div style={{ padding: 22, overflowY: 'auto', flex: 1 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: theme.navy, textTransform: 'uppercase', letterSpacing: '1px', borderBottom: `1px solid ${theme.border}`, paddingBottom: 6, marginBottom: 12 }}>
                Identity &amp; Filing
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 0, marginBottom: 20 }}>
                <ViewField label="Reg Date" value={viewRecord.reg_date} />
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
                <ViewField label="Awareness Date" value={viewRecord.awareness_date} />
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
                <ViewField label="AGM Date" value={viewRecord.agm_date} />
                <ViewField label="AGM Minutes" value={viewRecord.agm_minutes} />
                <ViewField label="Attendance" value={viewRecord.attendance} />
                <ViewField label="Audited Account" value={viewRecord.audited_account} />
                <ViewField label="Building Insurance" value={viewRecord.building_insurance} />
                <ViewField label="Renewal Status" value={viewRecord.renewal_status} />
                <ViewField label="AGM Status" value={viewRecord.agm_status} />
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 10 }}>
                <span style={{ fontSize: 12, fontWeight: 500, color: theme.text2 }}>Status:</span>
                <StatusPill status={viewRecord.status} />
              </div>

              {/* Audit / timestamps */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginTop: 10 }}>
                <ViewField label="Created At" value={viewRecord.created_at || '-'} />
                <ViewField label="Updated At" value={viewRecord.updated_at || '-'} />
              </div>
            </div>

            <div style={{ padding: '14px 22px', borderTop: `1px solid ${theme.border}`, display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              {!isViewOnly && <button onClick={() => { setViewModalOpen(false); openEdit(viewRecord); }} style={btnPrimary}>
                <i className="fas fa-edit" /> Edit
              </button>}
              <button onClick={() => setViewModalOpen(false)} style={btnOutline}>Close</button>
            </div>
          </div>
        </div>
      )}

      {showHistoryModal && selectedHistoryRecord && (
        <HistoryModal
          isOpen={showHistoryModal}
          onClose={() => { setShowHistoryModal(false); setSelectedHistoryRecord(null); }}
          record={selectedHistoryRecord}
          theme={theme}
        />
      )}

      {exportModalOpen && (
        <GenericExportModal
          title="Export M.Com Records"
          subject="all M.Com Records"
          exporting={exporting}
          onExport={handleExport}
          onClose={() => setExportModalOpen(false)}
        />
      )}

      {/* - Renewal Modal - */}
      {renewalModalOpen && renewalRecord && (() => {
        const mc = renewalRecord;
        const multiRows = buildMcomMultiYearRows(mc);
        const grandTotal = multiRows.reduce((s, r) => s + r.total, 0);
        const startYr = multiRows.length > 0 ? multiRows[0].year : new Date().getFullYear();
        const endYr = multiRows.length > 0 ? multiRows[multiRows.length - 1].year : new Date().getFullYear();
        const payStatus = mc.renewal_payment_status;
        const fmt = (n) => Number(n).toLocaleString('en-LK', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

        // Year selection helpers
        const selectedRows = multiRows.filter(r => selectedRenewalYears.includes(r.year));
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
          <div style={overlayStyle} onClick={(e) => e.target === e.currentTarget && setRenewalModalOpen(false)}>
            <div style={{ ...modalStyle, maxWidth: 720, display: 'flex', flexDirection: 'column', maxHeight: '90vh' }}>

              {/* Header - same as MC invoice modal */}
              <div style={modalHeader}>
                <span style={{ fontSize: 16, fontWeight: 700 }}>Renewal Receipt</span>
                <button onClick={() => { setRenewalModalOpen(false); setSelectedRenewalYears([]); }} style={closeBtnStyle}><i className="fas fa-times" /></button>
              </div>

              <div style={{ padding: 22, overflowY: 'auto', flex: 1 }}>

                {/* Receipt number + Print button row */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 18 }}>
                  <div>
                    <div style={{ fontSize: 13, color: theme.text2, marginBottom: 4 }}>Receipt Number</div>
                    <div style={{ fontSize: 18, fontWeight: 700, color: theme.navy }}>{mc.new_file_no || mc.file_no || mc.old_file_no || '-'}</div>
                    <div style={{ fontSize: 12, color: theme.text3, marginTop: 2 }}>{mc.management_corporation_name}</div>
                  </div>
                  {multiRows.length > 0 && (
                    <button
                      onClick={() => printRenewalLetter(mc, someSelected ? selectedRows : multiRows)}
                      disabled={someSelected && selectedRows.length === 0}
                      style={{ ...btnPrimary, padding: '9px 14px', gap: 6, opacity: (!someSelected || selectedRows.length > 0) ? 1 : 0.5 }}
                    >
                      <i className="fas fa-print" />
                      {someSelected ? `Print Selected (${selectedRenewalYears.length})` : 'Print Receipt'}
                    </button>
                  )}
                </div>

                {/* Payable Summary card - same style as MC */}
                <div style={{ border: `1px solid ${theme.border}`, borderRadius: 10, background: '#f8fafc', padding: 16, marginBottom: 20 }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: theme.navy, marginBottom: 12 }}>Payable Summary</div>

                  {/* Year selection bar */}
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
                      <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '480px', fontSize: 13 }}>
                        <thead>
                          <tr style={{ background: '#f1f5f9' }}>
                            {multiRows.length > 1 && <th style={{ padding: '6px 6px', borderBottom: `1px solid ${theme.border}`, width: 28 }}></th>}
                            <th style={{ padding: '6px 8px', borderBottom: `1px solid ${theme.border}`, textAlign: 'left', fontSize: 12, fontWeight: 600, color: theme.text2 }}>Year</th>
                            <th style={{ padding: '6px 8px', borderBottom: `1px solid ${theme.border}`, textAlign: 'right', fontSize: 12, fontWeight: 600, color: theme.text2 }}>Units</th>
                            <th style={{ padding: '6px 8px', borderBottom: `1px solid ${theme.border}`, textAlign: 'right', fontSize: 12, fontWeight: 600, color: theme.text2 }}>Fee (Rs.)</th>
                            <th style={{ padding: '6px 8px', borderBottom: `1px solid ${theme.border}`, textAlign: 'right', fontSize: 12, fontWeight: 600, color: theme.text2 }}>SSCL 2.5%</th>
                            <th style={{ padding: '6px 8px', borderBottom: `1px solid ${theme.border}`, textAlign: 'right', fontSize: 12, fontWeight: 600, color: theme.text2 }}>VAT 18%</th>
                            <th style={{ padding: '6px 8px', borderBottom: `1px solid ${theme.border}`, textAlign: 'right', fontSize: 12, fontWeight: 600, color: theme.text2 }}>Total (Rs.)</th>
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
                                  outline: isSelected ? `2px solid ${row.year < 2023 ? theme.orange : theme.green}` : 'none',
                                  outlineOffset: -1,
                                  transition: 'background 0.15s'
                                }}
                              >
                                {multiRows.length > 1 && (
                                  <td style={{ padding: '6px 6px', textAlign: 'center' }}>
                                    <input type="checkbox" checked={isSelected} onChange={() => toggleYear(row.year)}
                                      onClick={e => e.stopPropagation()}
                                      style={{ width: 13, height: 13, cursor: 'pointer', accentColor: row.year < 2023 ? theme.orange : theme.green }} />
                                  </td>
                                )}
                                <td style={{ padding: '6px 8px', fontSize: 12 }}>
                                  <span style={{ fontWeight: 600 }}>{row.year}</span>
                                  {row.year < 2023 && <span style={{ marginLeft: 5, fontSize: 9.5, color: theme.orange, background: '#fff7ed', border: '1px solid #fde68a', borderRadius: 3, padding: '1px 4px' }}>Old rate</span>}
                                  {row.year >= 2023 && <span style={{ marginLeft: 5, fontSize: 9.5, color: theme.green, background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 3, padding: '1px 4px' }}>New rate</span>}
                                </td>
                                <td style={{ padding: '6px 8px', fontSize: 12, textAlign: 'right' }}>{row.units}</td>
                                <td style={{ padding: '6px 8px', fontSize: 12, textAlign: 'right' }}>{fmt(row.fee)}</td>
                                <td style={{ padding: '6px 8px', fontSize: 12, textAlign: 'right' }}>{fmt(row.sscl)}</td>
                                <td style={{ padding: '6px 8px', fontSize: 12, textAlign: 'right' }}>{fmt(row.vat)}</td>
                                <td style={{ padding: '6px 8px', fontSize: 12, textAlign: 'right', fontWeight: 600 }}>{fmt(row.total)}</td>
                              </tr>
                            );
                          })}
                          {/* Grand total row */}
                          <tr>
                            {multiRows.length > 1 && <td style={{ padding: '8px', borderTop: `1px solid ${theme.border}` }}></td>}
                            <td colSpan={multiRows.length > 1 ? 5 : 6} style={{ padding: '8px', borderTop: `1px solid ${theme.border}`, fontWeight: 700, color: theme.navy, fontSize: 13 }}>
                              {someSelected && selectedTotal !== grandTotal ? `Selected (${selectedRenewalYears.length} yr) Total` : 'Total Amount Payable'}
                            </td>
                            <td style={{ padding: '8px', borderTop: `1px solid ${theme.border}`, fontWeight: 700, color: theme.navy, fontSize: 13, textAlign: 'right' }}>
                              Rs. {fmt(someSelected && selectedTotal !== grandTotal ? selectedTotal : grandTotal)}
                            </td>
                          </tr>
                          {someSelected && selectedTotal !== grandTotal && (
                            <tr>
                              {multiRows.length > 1 && <td style={{ padding: '4px 8px', borderBottom: `1px solid ${theme.border}` }}></td>}
                              <td colSpan={multiRows.length > 1 ? 5 : 6} style={{ padding: '4px 8px', borderBottom: `1px solid ${theme.border}`, fontSize: 11, color: theme.text3 }}>Grand Total (all {multiRows.length} years)</td>
                              <td style={{ padding: '4px 8px', borderBottom: `1px solid ${theme.border}`, fontSize: 11, color: theme.text3, textAlign: 'right' }}>Rs. {fmt(grandTotal)}</td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    ) : mc.renewal_payment_status ? (
                      <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '480px', fontSize: 13 }}>
                          <tbody>
                            <tr>
                              <td style={{ padding: '6px 8px', borderBottom: `1px solid ${theme.border}`, fontSize: 12 }}>Category</td>
                              <td style={{ padding: '6px 8px', borderBottom: `1px solid ${theme.border}`, fontSize: 12 }}>{mc.category || '-'}</td>
                            </tr>
                            <tr>
                              <td style={{ padding: '6px 8px', borderBottom: `1px solid ${theme.border}`, fontSize: 12 }}>Number of Parcels (Units)</td>
                              <td style={{ padding: '6px 8px', borderBottom: `1px solid ${theme.border}`, fontSize: 12 }}>{mc.units || '-'}</td>
                            </tr>
                            <tr>
                              <td style={{ padding: '6px 8px', borderBottom: `1px solid ${theme.border}`, fontSize: 12 }}>Covering Year</td>
                              <td style={{ padding: '6px 8px', borderBottom: `1px solid ${theme.border}`, fontSize: 12 }}>Up to {mc.renewal_paid_year || '-'}</td>
                            </tr>
                            <tr>
                              <td style={{ padding: '8px', borderBottom: `1px solid ${theme.border}`, fontWeight: 700, color: theme.navy, fontSize: 13 }}>Total Amount Paid</td>
                              <td style={{ padding: '8px', borderBottom: `1px solid ${theme.border}`, fontWeight: 700, color: theme.navy, fontSize: 13 }}>Rs. {fmt(mc.renewal_paid_amount)}</td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <div style={{ padding: 20, textAlign: 'center', color: theme.green }}>
                        <i className="fas fa-check-circle" style={{ fontSize: 22, marginBottom: 6, display: 'block' }} />
                        <strong>No pending renewal dues</strong>
                        <div style={{ fontSize: 12, color: theme.text3, marginTop: 4 }}>Renewals are up to date</div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Renewal Approval Workflow */}
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
                            {payStatus === 'Approved' ? `Approved on ${mc.acknowledgement_date || '-'}` : payStatus === 'Pending Approval' ? 'AGM will be notified to review' : '-'}
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

                {/* Payment status banner + action buttons - same as MC */}
                <div style={{ border: `1px solid ${theme.border}`, borderRadius: 10, background: payStatus === 'Approved' ? '#f0fdf4' : payStatus === 'Pending Approval' ? '#fffbeb' : '#fff7ed', padding: 14, marginBottom: 4, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 700, color: payStatus === 'Approved' ? theme.green : theme.orange }}>
                      <i className={`fas ${payStatus === 'Approved' ? 'fa-check-circle' : payStatus === 'Pending Approval' ? 'fa-hourglass-half' : 'fa-clock'}`} style={{ marginRight: 6 }} />
                      {payStatus === 'Approved' ? 'Renewal Fee Paid & Approved' : payStatus === 'Pending Approval' ? 'Payment Pending AGM Approval' : 'Renewal Fee Not Yet Paid'}
                    </div>
                    {payStatus === 'Approved' && (
                      <div style={{ fontSize: 11.5, color: theme.text2, marginTop: 4 }}>
                        Paid on {mc.renewal_paid_date} - Acknowledgement No: {mc.acknowledgement_no || '-'}
                      </div>
                    )}
                    {payStatus === 'Pending Approval' && (
                      <div style={{ fontSize: 11.5, color: theme.text2, marginTop: 4 }}>
                        Payment recorded on {mc.renewal_paid_date}
                      </div>
                    )}
                  </div>
                  {!isViewOnly && multiRows.length > 0 && (
                    payStatus === 'Approved' ? null :
                      payStatus === 'Pending Approval' ? (
                        <button onClick={() => approveRenewalPayment(mc)} disabled={markingRenewalPaid}
                          style={{ ...btnPrimary, background: theme.green, padding: '8px 14px', gap: 6 }}>
                          {markingRenewalPaid ? <><i className="fas fa-spinner fa-spin" /> Saving...</> : <><i className="fas fa-check-double" /> Approve Payment</>}
                        </button>
                      ) : (
                        <button
                          onClick={() => markRenewalPaid(mc, someSelected ? selectedRows : multiRows)}
                          disabled={markingRenewalPaid || (someSelected && selectedRows.length === 0)}
                          style={{ ...btnPrimary, padding: '8px 14px', gap: 6, opacity: (markingRenewalPaid || (someSelected && selectedRows.length === 0)) ? 0.6 : 1 }}
                        >
                          {markingRenewalPaid ? <><i className="fas fa-spinner fa-spin" /> Saving...</> : <><i className="fas fa-hand-holding-usd" /> {someSelected ? `Mark Selected Paid - Rs. ${fmt(selectedTotal)}` : 'Mark as Paid'}</>}
                        </button>
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
    </div>
  );
}
