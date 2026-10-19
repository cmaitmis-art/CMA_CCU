import React from 'react';

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

export function StatusPill({ status, renewalStatus, record }) {
  let s = String(status || '').toLowerCase().trim();

  // If active_non_active field explicitly says non active, override — but not for Pending or New
  if (record && String(record.active_non_active || '').toLowerCase() === 'non active' && s !== 'pending' && s !== 'new') {
    s = 'non active';
  }

  const isNew = s === 'new';
  const isNonActive = !isNew && (s === 'non active' || s.includes('non'));
  const isPending = !isNew && s.includes('pending');
  const isActive = !isNew && !isNonActive && !isPending;

  // Sky-blue for New, green for Active, red for Non Active, orange for Pending
  const bg      = isNew ? '#e0f2fe' : isPending ? '#fff7ed' : isNonActive ? '#fef2f2' : '#f0fdf4';
  const color   = isNew ? '#0369a1' : isPending ? '#b45309' : isNonActive ? theme.red   : theme.green;
  const border  = isNew ? '#bae6fd' : isPending ? '#fed7aa' : isNonActive ? '#fecaca'  : '#bbf7d0';
  const dotBg   = isNew ? '#0284c7' : isPending ? '#ea580c' : isNonActive ? '#dc2626'  : '#16a34a';
  const label   = isNew ? 'New'     : isNonActive ? 'Non Active' : isPending ? 'Pending' : 'Active';

  const isApproved = renewalStatus === 'Approved';

  let approvalElement = null;
  if (isPending) {
    approvalElement = (
      <div style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 11, fontWeight: 600, color: '#475569', whiteSpace: 'nowrap', marginTop: 1 }}>
        <i className="fas fa-hourglass-half" style={{ color: '#d97706', fontSize: 11 }} /> Waiting AGM Approval
      </div>
    );
  } else if (renewalStatus === 'Pending Approval') {
    approvalElement = (
      <div style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 11, fontWeight: 600, color: '#475569', whiteSpace: 'nowrap', marginTop: 1 }}>
        <i className="fas fa-clock" style={{ color: '#ea580c', fontSize: 11 }} /> Renewal Pending
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 2 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '2px 8px', borderRadius: 999, background: bg, border: `1px solid ${border}`, color, fontWeight: 700, fontSize: 11, whiteSpace: 'nowrap' }}>
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: dotBg }} />
          {label}
        </span>
        {isApproved && (
          <span style={{ display: 'inline-flex', alignItems: 'center', color: '#16a34a', fontSize: 14 }} title="Renewal Approved">
            <i className="fas fa-check-circle" />
          </span>
        )}
      </div>
      {approvalElement}
    </div>
  );
}

function ActionBtn({ icon, color, title, onClick }) {
  return (
    <button onClick={onClick} title={title} style={{ background: 'none', border: 'none', cursor: 'pointer', color, width: 20, minWidth: 20, height: 20, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, padding: 0, flexShrink: 0 }}>
      <i className={icon} />
    </button>
  );
}

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
  if (!text) return '';
  if (/^[_\-.\/\s]+$/.test(text) || /^(n\/?a|nil|none|null|undefined|pending|tbd|\?|0000-00-00|00\/00\/0000|not\s+applicable|not\s+yet)$/i.test(text)) {
    return '';
  }
  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) return text;
  const isoMatch = text.match(/^(\d{4}-\d{2}-\d{2})[T\s]/);
  if (isoMatch) return isoMatch[1];
  const ymdMatch = text.match(/^(\d{4})[./](\d{1,2})[./](\d{1,2})$/);
  if (ymdMatch) {
    const y = ymdMatch[1];
    const m = ymdMatch[2].padStart(2, '0');
    const d = ymdMatch[3].padStart(2, '0');
    if (parseInt(m, 10) >= 1 && parseInt(m, 10) <= 12 && parseInt(d, 10) >= 1 && parseInt(d, 10) <= 31) {
      return `${y}-${m}-${d}`;
    }
  }
  const dmyMatch = text.match(/^(\d{1,2})[./-](\d{1,2})[./-](\d{4})$/);
  if (dmyMatch) {
    const day = parseInt(dmyMatch[1], 10);
    const month = parseInt(dmyMatch[2], 10);
    const year = parseInt(dmyMatch[3], 10);
    if (month >= 1 && month <= 12 && day >= 1 && day <= 31 && year >= 1900 && year <= 2100) {
      return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    }
  }
  const numeric = Number(text);
  if (!Number.isNaN(numeric) && numeric > 1000 && numeric < 100000) {
    const epoch = new Date(Date.UTC(1899, 11, 30));
    epoch.setUTCDate(epoch.getUTCDate() + Math.floor(numeric));
    return epoch.toISOString().slice(0, 10);
  }
  const parsed = new Date(text);
  if (!Number.isNaN(parsed.getTime())) {
    const yr = parsed.getFullYear();
    if (yr >= 1900 && yr <= 2100) {
      return parsed.toISOString().slice(0, 10);
    }
  }
  return '';
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


function getMcomFeeForYear(units, year, isGov, settings) {
  const u = parseInt(units) || 0;
  const rates2023 = settings?.mcom_rates_2023 || MCOM_RENEWAL_RATES_2023;
  const ratesPre2023 = settings?.mcom_rates_pre2023 || MCOM_OLD_BRACKET_PRE2023;

  if (year < 2023) {
    if (isGov) return 250;
    const match = ratesPre2023.find(r => u >= r.minUnits && (r.maxUnits === null || u <= r.maxUnits));
    return match ? match.fee : 250;
  }
  const match = rates2023.find(r => u >= r.minUnits && (r.maxUnits === null || u <= r.maxUnits));
  return match ? match.fee : 250;
}

function getMcomAnnualFeeInfo(mc, settings) {
  const units = parseInt(mc?.units) || 0;
  const currentYear = new Date().getFullYear();
  const isGov = String(mc?.mc_mcom || '').toUpperCase().includes('GOV') || String(mc?.category || '').toLowerCase().includes('government');
  const feePerYear = getMcomFeeForYear(units, currentYear, isGov, settings);
  return { units, feePerYear };
}

function getRenewalAmountInfo(mc, settings) {
  const { feePerYear } = getMcomAnnualFeeInfo(mc, settings);
  return { annual: feePerYear, monthly: feePerYear / 12 };
}

function buildMcomMultiYearRows(mc, settings) {
  const units = parseInt(mc?.units) || 0;
  const currentYear = new Date().getFullYear();
  const isGov = String(mc?.mc_mcom || '').toUpperCase().includes('GOV') || String(mc?.category || '').toLowerCase().includes('government');

  let startYear = currentYear;
  const rawPeriod = mc?.renewal_period;
  if (rawPeriod) {
    const periodStr = String(rawPeriod).trim();
    const yearMatches = periodStr.match(/\b(19|20)\d{2}\b/g);
    if (yearMatches && yearMatches.length > 0) {
      startYear = parseInt(yearMatches[yearMatches.length - 1]);
    } else if (/^\d{4}$/.test(periodStr)) {
      startYear = parseInt(periodStr);
    }
  } else if (mc?.reg_date) {
    const d = new Date(mc.reg_date);
    if (!Number.isNaN(d.getTime())) startYear = d.getFullYear();
  }

  const paidYear = mc?.renewal_paid_year ? parseInt(mc.renewal_paid_year) : null;
  if (paidYear && paidYear >= startYear) startYear = paidYear + 1;

  const endYear = currentYear;

  if (startYear > endYear) return [];

  const ssclRate = settings?.sscl_rate ?? 0.025;
  const vatRate = settings?.vat_rate ?? 0.18;
  const rows = [];
  for (let year = startYear; year <= endYear; year++) {
    const fee = getMcomFeeForYear(units, year, isGov, settings);
    const sscl = parseFloat((fee * ssclRate).toFixed(2));
    const vat = parseFloat(((fee + sscl) * vatRate).toFixed(2));
    const total = parseFloat((fee + sscl + vat).toFixed(2));
    rows.push({ year, units, fee, sscl, vat, total, isGov });
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
    renewal_date_vise: (() => {
      const exp = toText(getCell(row, 'renewal_date_vise', 'Renewal Date Vise', 'renewal date vise', 'Renewal Date Wise', 'renewal_date_wise'));
      if (exp) return (exp.toLowerCase().includes('non') || exp.toLowerCase().includes('inactive')) ? 'Non Active' : 'Active';
      const rp = toText(getCell(row, 'renewal_period', 'Renewal Period'));
      if (rp) {
        const m = String(rp).match(/\b(19|20)\d{2}\b/g);
        const y = m ? parseInt(m[m.length - 1], 10) : parseInt(rp, 10);
        if (!isNaN(y)) return y >= new Date().getFullYear() ? 'Active' : 'Non Active';
      }
      return 'Active';
    })(),
    agm_date_vise: (() => {
      const exp = toText(getCell(row, 'agm_date_vise', 'AGM Date Vise', 'agm date vise', 'AGM Date Wise', 'agm date wise'));
      if (exp) return (exp.toLowerCase().includes('non') || exp.toLowerCase().includes('inactive')) ? 'Non Active' : 'Active';
      const nextAgm = coerceDateText(getCell(row, 'next_agm_date', 'Next AGM Date', 'next_agm_date'));
      if (nextAgm) {
        const nd = new Date(nextAgm);
        const td = new Date();
        td.setHours(0, 0, 0, 0);
        return (!Number.isNaN(nd.getTime()) && nd >= td) ? 'Active' : 'Non Active';
      }
      const agmD = coerceDateText(getCell(row, 'agm_date', 'AGM Date'));
      if (agmD) {
        const d = new Date(agmD);
        const oneYearAgo = new Date();
        oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
        return (!Number.isNaN(d.getTime()) && d >= oneYearAgo) ? 'Active' : 'Non Active';
      }
      return 'Active';
    })(),
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

export {
  theme,
  MCOM_EXPORT_FIELDS,
  btnBase,
  btnPrimary,
  btnOutline,
  overlayStyle,
  modalStyle,
  modalHeader,
  closeBtnStyle,
  inputStyle,
  sectionLabelStyle,
  COL_WIDTHS,
  StatusPill,
  ActionBtn,
  FormField,
  FormSelect,
  SectionLabel,
  ViewField,
  normalizeKey,
  normalizeHeaderName,
  findHeaderRow,
  parseSheetRows,
  getCell,
  toText,
  toIntOrNull,
  deriveYear,
  coerceDateText,
  deriveStatus,
  MCOM_RENEWAL_RATES_2023,
  MCOM_OLD_BRACKET_PRE2023,
  getMcomFeeForYear,
  getMcomAnnualFeeInfo,
  getRenewalAmountInfo,
  buildMcomMultiYearRows,
  getRenewalDueDate,
  blankForm,
  BACKEND_FIELDS,
  toBackendRecordFromExcelRow
};
