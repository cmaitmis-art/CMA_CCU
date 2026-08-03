import React, { useEffect, useMemo, useState, useCallback } from 'react';
import * as XLSX from 'xlsx';
import { useConfirmDialog } from '../ConfirmDialogContext.jsx';
import '../CMAStyles.css';
import GenericExportModal from '../components/GenericExportModal.jsx';
import HistoryModal from '../components/HistoryModal.jsx';
import StatusPill from '../components/StatusPill.jsx';
import { useAutoRefresh } from '../utils/useAutoRefresh';
import { exportToPdfPrint } from '../utils/pdfExport';
import { MONTH_OPTIONS, getYearFilterOptions } from '../utils/filterConstants';
window.XLSX = XLSX;

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
  maxWidth: 860,
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
  maxHeight: 'calc(100vh - 390px)',
  minHeight: '200px',
  overflowY: 'auto',
  border: `1px solid ${theme.border}`,
  borderRadius: 10,
  background: '#fff',
};

const tableStyle = {
  width: '100%',
  borderCollapse: 'collapse',
  fontSize: 12,
  fontFamily: "'Inter', 'Noto Sans Sinhala', 'Gemunu Libre', 'Iskoola Pota', 'Segoe UI', sans-serif",
  tableLayout: 'fixed',
  minWidth: 1645,
};

const thStyle = {
  textAlign: 'left',
  padding: '8px 8px',
  fontSize: 11,
  fontFamily: "'Inter', 'Noto Sans Sinhala', 'Gemunu Libre', 'Iskoola Pota', 'Segoe UI', sans-serif",
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
  padding: '7px 8px',
  fontSize: 12,
  whiteSpace: 'nowrap',
  overflow: 'visible',
  position: 'sticky',
  right: 0,
  zIndex: 1,
  background: '#ffffff',
  borderLeft: `1px solid ${theme.border}`,
};

const STATUS_COL_RIGHT_OFFSET = 210; // must match COL_WIDTHS.ACTIONS below

const thStatusStyle = {
  ...thStyle,
  position: 'sticky',
  top: 0,
  right: STATUS_COL_RIGHT_OFFSET,
  zIndex: 3,
  background: '#f8fafc',
  borderLeft: `1px solid ${theme.border}`,
};

const tdStatusStyle = {
  padding: '7px 8px',
  fontSize: 12,
  whiteSpace: 'nowrap',
  overflow: 'visible',
  position: 'sticky',
  right: STATUS_COL_RIGHT_OFFSET,
  zIndex: 1,
  background: '#ffffff',
  borderLeft: `1px solid ${theme.border}`,
};

const cellStyle = {
  padding: '8px 8px',
  fontSize: 12,
  fontFamily: "'Inter', 'Noto Sans Sinhala', 'Gemunu Libre', 'Iskoola Pota', 'Segoe UI', sans-serif",
  lineHeight: 1.5,
  whiteSpace: 'nowrap',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  maxWidth: 0,
  verticalAlign: 'middle',
};

const tdCheckStyle = {
  ...cellStyle,
  textAlign: 'center',
};

// Table fields — match the "Monthly Progress" excel sheet columns exactly
// (Serial No, Letter date, Received CCU, MC No., Apartment Name, Complaint Name,
// Issue/Heading, File, T/R, Reply) plus Status/Actions for workflow tracking.
const COL_WIDTHS = {
  'SERIAL NO': 130,
  'LETTER DATE': 110,
  'RECEIVED CCU': 110,
  'MC NO': 100,
  'APARTMENT NAME': 200,
  'COMPLAINT NAME': 160,
  'ISSUE / HEADING': 'auto',
  'FILE': 70,
  'T/R': 70,
  'REPLY': 70,
  'STATUS': 195,
  'ACTIONS': 210,
};

const CATEGORIES_BY_SECTION = {
  'A. Administration': [
    'Non Payment',
    'Pet Keeping',
    'Parking Issues (Unit Owners)',
    'Accounts related Issues',
    'Council Issues',
    'Garbage Issues',
    'Common Elements Issues',
    'Other Issues',
  ],
  'B. Technical': [
    'Unauthorised Construction',
    'Water Leakage',
    'Sinking Fund',
    'Common area issue',
    'Boundry Issues',
    'Developer Related Issues (Construction)',
    'Other Issues',
  ],
  'C. Legal': [
    'Developer Related Issues (Legal Issue)',
    'Common Elements Issue (Developer)',
    'Non registration of Condominium Plan',
    'Boundry Issues',
    'Business Purpose',
    'Defects',
    'Other Issues',
  ],
};

const ALL_CATEGORIES = Object.values(CATEGORIES_BY_SECTION).flat();
const STATUS_OPTIONS = ['New', 'Open', 'Pending', 'Closed'];
const STATUS_COLORS = {
  'New': '#2563eb',
  'Open': '#f59e0b',
  'Pending': '#ef4444',
  'Closed': '#10b981',
};

// Base year the Year filter list starts from. The list always extends up to the
// current year automatically (computed live), so nothing needs to be updated
// by hand when a new year begins.


function pad2(value) {
  return String(value).padStart(2, '0');
}

export function parseFlexibleDate(value) {
  if (value === null || value === undefined || value === '') return null;
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value;

  // Handle Excel serial numbers (numeric values)
  if (typeof value === 'number') {
    if (window.XLSX && window.XLSX.SSF) {
      try {
        const parsed = window.XLSX.SSF.parse_date_code(value);
        if (parsed && parsed.y && parsed.m && parsed.d) {
          const d = new Date(parsed.y, parsed.m - 1, parsed.d);
          if (!Number.isNaN(d.getTime())) return d;
        }
      } catch (e) {
        console.warn('Failed to parse Excel date code:', value, e);
      }
    }
    // Fallback: treat as days since 1900 (Excel format)
    try {
      const excelEpoch = new Date(1900, 0, 1);
      const d = new Date(excelEpoch.getTime() + (value - 2) * 24 * 60 * 60 * 1000);
      if (!Number.isNaN(d.getTime()) && d.getFullYear() > 1800 && d.getFullYear() < 2100) {
        return d;
      }
    } catch (e) {
      console.warn('Failed to parse numeric date:', value, e);
    }
  }

  const text = toText(value).trim();
  if (!text) return null;

  // Try DD/MM/YYYY or DD-MM-YYYY or DD.MM.YYYY
  const dmy = text.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2,4})$/);
  if (dmy) {
    let [, day, month, year] = dmy;
    day = parseInt(day, 10);
    month = parseInt(month, 10);
    year = parseInt(year, 10);

    if (year < 100) year += 2000;

    if (month >= 1 && month <= 12 && day >= 1 && day <= 31) {
      try {
        const d = new Date(year, month - 1, day);
        if (!Number.isNaN(d.getTime()) && d.getFullYear() === year && d.getMonth() === month - 1 && d.getDate() === day) {
          return d;
        }
      } catch (e) {
        console.warn('Failed to parse DMY date:', text, e);
      }
    }
  }

  // Try YYYY/MM/DD or YYYY-MM-DD or YYYY.MM.DD
  const ymd = text.match(/^(\d{4})[\/\-.](\d{1,2})[\/\-.](\d{1,2})$/);
  if (ymd) {
    let [, year, month, day] = ymd;
    month = parseInt(month, 10);
    day = parseInt(day, 10);

    if (month >= 1 && month <= 12 && day >= 1 && day <= 31) {
      try {
        const d = new Date(year, month - 1, day);
        if (!Number.isNaN(d.getTime()) && d.getFullYear() === parseInt(year, 10)) {
          return d;
        }
      } catch (e) {
        console.warn('Failed to parse YMD date:', text, e);
      }
    }
  }

  // Last resort: try native Date parsing
  try {
    const parsed = new Date(text);
    if (!Number.isNaN(parsed.getTime())) return parsed;
  } catch (e) {
    console.warn('Failed to parse date with native Date:', text, e);
  }

  return null;
}

export function formatDisplayDate(v) {
  if (!v) return '—';
  const date = parseFlexibleDate(v);
  if (date) {
    return `${pad2(date.getDate())}/${pad2(date.getMonth() + 1)}/${date.getFullYear()}`;
  }
  const d = String(v).trim();
  const m = d.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (m) return `${m[3]}/${m[2]}/${m[1]}`;
  return d;
}

function normalizeKey(k) {
  // Normalize header keys: remove diacritics, replace non-alphanumerics with spaces,
  // collapse spaces and lowercase — this makes matching robust to underscores/punctuation/slashes.
  const s = String(k || '');
  let out = s;
  if (typeof out.normalize === 'function') {
    out = out.normalize('NFKD').replace(/[\u0300-\u036f]/g, '');
  }
  return out.replace(/[^a-z0-9]+/gi, ' ').trim().replace(/\s+/g, ' ').toLowerCase();
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

function toBool(v) {
  const t = toText(v).toLowerCase();
  if (!t) return false;
  return ['√', 'y', 'yes', 'true', '1', 'x', 'done', 'ok'].includes(t) || t.length > 0;
}

export function normalizeExcelDate(value) {
  if (value === null || value === undefined || value === '') return '';
  try {
    const date = parseFlexibleDate(value);
    if (date && !Number.isNaN(date.getTime())) {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    }
  } catch (e) {
    console.warn('Error normalizing date:', value, e);
  }
  return '';
}

// Locate the real header row within a raw sheet. The "Monthly Progress" workbook
// has a section-title row (A-Administration / B-Technical / C-Legal) above the
// actual column-header row, so we scan the first few rows for known field names.
function findHeaderRowIndex(rawRows) {
  const keywords = [
    'serial no', 'letter date', 'received ccu', 'mc no', 'apartment name',
    'complaint name', 'issue heading', 'file', 't r', 'reply',
  ];
  const limit = Math.min(5, rawRows.length);
  for (let i = 0; i < limit; i++) {
    const norm = (rawRows[i] || []).map((v) => normalizeKey(toText(v)));
    const matches = norm.filter((h) => keywords.includes(h)).length;
    if (matches >= 3) return i;
  }
  return -1;
}

function sheetToRowObjects(ws) {
  const rawRows = window.XLSX.utils.sheet_to_json(ws, { header: 1, defval: '', raw: false });
  if (!rawRows.length) return [];

  const hIdx = findHeaderRowIndex(rawRows);
  if (hIdx === -1) return []; // sheet doesn't match the complaints layout — skip it

  const headerRow = rawRows[hIdx].map((v) => toText(v));

  // Map category-tick columns (A-Administration / B-Technical / C-Legal headings)
  const categoryColMap = {};
  headerRow.forEach((h, idx) => {
    const norm = normalizeKey(h);
    const catMatch = ALL_CATEGORIES.find((c) => normalizeKey(c) === norm);
    if (catMatch) categoryColMap[idx] = catMatch;
  });

  return rawRows
    .slice(hIdx + 1)
    .map((row) => {
      const obj = {};
      row.forEach((cell, idx) => {
        if (categoryColMap[idx] !== undefined) {
          if (toText(cell)) obj.__category = categoryColMap[idx];
          return;
        }
        const key = normalizeKey(headerRow[idx]) || `__col_${idx}`;
        obj[key] = cell;
      });
      return obj;
    })
    .filter((obj) => Object.values(obj).some((v) => toText(v)));
}

function calculateDaysElapsed(dateStr) {
  if (!dateStr) return null;
  try {
    const d = parseFlexibleDate(dateStr);
    if (!d || Number.isNaN(d.getTime())) return null;
    const now = new Date();
    const days = Math.floor((now - d) / (1000 * 60 * 60 * 24));
    return days;
  } catch (e) {
    console.warn('Error calculating days elapsed:', dateStr, e);
    return null;
  }
}

function toBackendRecordFromExcelRow(row) {
  let serial_no = toText(getCell(row, 'Serial No', 'serial_no', 'SERIAL NO'));
  const letter_date = normalizeExcelDate(getCell(row, 'Letter date', 'letter_date', 'LETTER DATE'));
  const received_ccu = normalizeExcelDate(getCell(row, 'Received CCU', 'received_ccu', 'RECEIVED CCU'));
  const mc_no = toText(getCell(row, 'MC No.', 'MC No', 'mc_no', 'MC NO'));
  const apartment_name = toText(getCell(row, 'Apartment Name', 'apartment_name', 'APARTMENT NAME'));
  const complaint_name = toText(getCell(row, 'Complaint Name', 'complaint_name', 'COMPLAINT NAME'));
  const issue_heading = toText(getCell(row, 'Issue/Heading', 'Issue / Heading', 'issue_heading', 'ISSUE HEADING'));
  const file_marked = toBool(getCell(row, 'File', 'file_marked', 'FILE'));
  const tr_marked = toBool(getCell(row, 'T/R', 'tr_marked', 'T R'));
  const reply_marked = toBool(getCell(row, 'Reply', 'reply_marked', 'REPLY'));
  let remarks = toText(getCell(row, 'Remarks', 'remarks', 'REMARKS'));

  // Category comes from whichever tick-column matched during sheetToRowObjects,
  // fall back to an explicit Category column, then to the issue/heading text.
  let category = row.__category || toText(getCell(row, 'Category', 'category', 'CATEGORY'));
  if (!category && issue_heading) {
    const text = issue_heading.toLowerCase();
    if (text.includes('leak') || text.includes('water') || text.includes('plumbing')) {
      category = 'Water Leakage';
    } else if (text.includes('garbage') || text.includes('waste') || text.includes('trash')) {
      category = 'Garbage Issues';
    } else if (text.includes('construction') || text.includes('unauthoris') || text.includes('unauthoriz')) {
      category = 'Unauthorised Construction';
    } else if (text.includes('common area') || text.includes('lift') || text.includes('elevator') || text.includes('rooftop')) {
      category = 'Common area issue';
    } else if (text.includes('agm') || text.includes('council') || text.includes('committee') || text.includes('election')) {
      category = 'Council Issues';
    } else if (text.includes('account') || text.includes('management fee') || text.includes('payment')) {
      category = 'Accounts related Issues';
    } else if (text.includes('parking')) {
      category = 'Parking Issues (Unit Owners)';
    } else if (text.includes('pet')) {
      category = 'Pet Keeping';
    } else if (text.includes('boundary') || text.includes('boundry') || text.includes('land')) {
      category = 'Boundry Issues';
    } else if (text.includes('utilit') || text.includes('electricity') || text.includes('electracity')) {
      category = 'Other Issues';
    } else {
      category = 'Other Issues';
    }
  }

  // Parse or infer Status
  const statusRaw = toText(getCell(row, 'Status', 'status', 'STATUS'));
  const normalizedStatus = statusRaw.trim().toLowerCase();
  const statusMap = {
    new: 'New',
    open: 'Open',
    pending: 'Pending',
    closed: 'Closed',
    close: 'Closed',
    done: 'Closed',
    resolved: 'Closed',
    'in progress': 'Open',
    inprogress: 'Open',
    ongoing: 'Open',
  };

  let status = 'New';
  if (normalizedStatus) {
    if (statusMap[normalizedStatus]) {
      status = statusMap[normalizedStatus];
    } else if (normalizedStatus.includes('close') || normalizedStatus.includes('done')) {
      status = 'Closed';
    } else if (normalizedStatus.includes('pend') || normalizedStatus.includes('wait')) {
      status = 'Pending';
    } else {
      status = 'Open';
    }
  } else if (reply_marked) {
    status = 'Closed';
  } else if (tr_marked || file_marked) {
    status = 'Open';
  }

  // If serial_no missing, skip the row instead of generating a placeholder
  if (!serial_no) {
    console.warn('Skipped row missing serial_no:', row);
    return null;
  }

  return {
    serial_no,
    letter_date,
    received_ccu,
    mc_no,
    apartment_name,
    complaint_name,
    issue_heading,
    file_marked,
    tr_marked,
    reply_marked,
    remarks,
    category,
    title: apartment_name,
    status,
  };
}

function FormField({ label, value, onChange, type = 'text', placeholder, rows, children }) {
  const inputId = 'complaint_form_' + String(label || '').toLowerCase().replace(/[^a-z0-9]/g, '_').replace(/_+/g, '_').replace(/^_+|_+$/g, '');
  const childWithProps = React.isValidElement(children)
    ? React.cloneElement(children, { id: inputId, name: inputId })
    : children;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
      <label htmlFor={inputId} style={{ fontSize: 12, fontWeight: 500, color: theme.text2 }}>{label}</label>
      {childWithProps || (
        type === 'textarea'
          ? <textarea
            id={inputId}
            name={inputId}
            rows={rows || 3}
            placeholder={placeholder}
            value={value ?? ''}
            onChange={(e) => onChange(e.target.value)}
            style={{ ...inputStyle, minHeight: 90, resize: 'vertical', fontFamily: 'inherit' }}
          />
          : <input
            id={inputId}
            name={inputId}
            type={type}
            placeholder={placeholder}
            value={value ?? ''}
            onChange={(e) => onChange(e.target.value)}
            style={inputStyle}
          />
      )}
    </div>
  );
}

function CheckField({ label, checked, onChange }) {
  const inputId = 'complaint_check_' + String(label || '').toLowerCase().replace(/[^a-z0-9]/g, '_').replace(/_+/g, '_').replace(/^_+|_+$/g, '');
  return (
    <label htmlFor={inputId} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: theme.text, cursor: 'pointer' }}>
      <input id={inputId} name={inputId} type="checkbox" checked={!!checked} onChange={(e) => onChange(e.target.checked)} style={{ width: 16, height: 16 }} />
      {label}
    </label>
  );
}

function SectionLabel({ children }) {
  return <div style={sectionLabelStyle}>{children}</div>;
}

function FormModal({ isOpen, onClose, onSave, initialData = null }) {
  const emptyForm = {
    serial_no: '', letter_date: '', received_ccu: '', mc_no: '',
    apartment_name: '', complaint_name: '', issue_heading: '',
    file_marked: false, tr_marked: false, reply_marked: false,
    remarks: '', category: '', status: 'New',
  };
  const [form, setForm] = useState(initialData || emptyForm);

  useEffect(() => {
    if (initialData) setForm(initialData);
    else setForm(emptyForm);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialData, isOpen]);

  if (!isOpen) return null;

  const setField = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));

  return (
    <div style={overlayStyle} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div style={{ ...modalStyle, display: 'flex', flexDirection: 'column', maxHeight: '90vh' }}>
        <div style={modalHeader}>
          <span style={{ fontSize: 16, fontWeight: 700 }}>{initialData ? 'Edit Complaint' : 'Add Complaint'}</span>
          <button onClick={onClose} style={closeBtnStyle}>✕</button>
        </div>

        <div style={{ padding: '0 22px', borderBottom: `1px solid ${theme.border}`, display: 'flex', background: theme.bg || '#fff', position: 'sticky', top: 0, zIndex: 10, justifyContent: 'flex-end' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 0' }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: theme.text2 }}>Status:</span>
            <select
              value={form.status || 'New'}
              onChange={e => setField('status', e.target.value)}
              disabled={!initialData}
              style={{ width: 130, padding: '5px 10px', borderRadius: 6, border: `1px solid ${theme.border}`, background: '#fff', outline: 'none', fontSize: 13, fontWeight: 700, color: STATUS_COLORS[form.status] || theme.text, opacity: !initialData ? 0.7 : 1, cursor: !initialData ? 'not-allowed' : 'pointer' }}
            >
              <option value="New" disabled={!initialData}>New</option>
              <option value="Open">Open</option>
              <option value="Pending">Pending</option>
              <option value="Closed">Closed</option>
            </select>
          </div>
        </div>

        <div style={{ padding: 22, display: 'flex', flexDirection: 'column', gap: 18, overflowY: 'auto', flex: 1 }}>
          <SectionLabel>File Information</SectionLabel>
          <FormField label="Serial No *" value={form.serial_no} onChange={(v) => setField('serial_no', v)} placeholder="e.g. SAG260101" />
          <FormField label="Letter Date" type="date" value={form.letter_date} onChange={(v) => setField('letter_date', v)} />
          <FormField label="Received CCU" type="date" value={form.received_ccu} onChange={(v) => setField('received_ccu', v)} />
          <FormField label="MC No" value={form.mc_no} onChange={(v) => setField('mc_no', v)} placeholder="e.g. MC/1066" />
          <FormField label="Category">
            <select value={form.category} onChange={(e) => setField('category', e.target.value)} style={inputStyle}>
              <option value="">— Select Category —</option>
              {Object.entries(CATEGORIES_BY_SECTION).map(([section, cats]) => (
                <optgroup key={section} label={section}>
                  {cats.map((cat) => <option key={cat} value={cat}>{cat}</option>)}
                </optgroup>
              ))}
            </select>
          </FormField>

          <SectionLabel>Apartment Details</SectionLabel>
          <FormField label="Apartment Name" value={form.apartment_name} onChange={(v) => setField('apartment_name', v)} placeholder="Enter apartment name" />
          <FormField label="Complaint Name" value={form.complaint_name} onChange={(v) => setField('complaint_name', v)} placeholder="Who raised the complaint (e.g. Secretary, President)" />

          <SectionLabel>Complaint Details</SectionLabel>
          <FormField label="Issue / Heading" type="textarea" value={form.issue_heading} onChange={(v) => setField('issue_heading', v)} placeholder="Describe the issue…" rows={4} />
          <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>
            <CheckField label="File" checked={form.file_marked} onChange={(v) => setField('file_marked', v)} />
            <CheckField label="T/R" checked={form.tr_marked} onChange={(v) => setField('tr_marked', v)} />
            <CheckField label="Reply" checked={form.reply_marked} onChange={(v) => setField('reply_marked', v)} />
          </div>
          <FormField label="Remarks" type="textarea" value={form.remarks} onChange={(v) => setField('remarks', v)} placeholder="Additional remarks…" rows={4} />

          <div style={{ padding: '12px 14px', background: `${theme.blue}08`, border: `1px dashed ${theme.blue}40`, borderRadius: 8, marginTop: 16 }}>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 8, color: theme.navy }}>
              <i className="fas fa-paperclip" style={{ marginRight: 6 }} /> Attach Document (Optional - Image, PDF, Word, Excel, etc.)
            </label>
            {form.document_path && !form.removeDoc ? (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#fff', padding: '8px 12px', borderRadius: 6, border: `1px solid ${theme.border}`, marginBottom: 8 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, overflow: 'hidden' }}>
                  <i className="fas fa-file-alt" style={{ color: theme.blue, fontSize: 16 }} />
                  <a href={`${(import.meta.env.VITE_API_URL ?? '/api').trim().replace(/\/api\/?$/, '')}/${form.document_path}`} target="_blank" rel="noreferrer" style={{ fontSize: 13, color: theme.blue, textDecoration: 'underline', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {form.document_name || 'View Attached Document'}
                  </a>
                </div>
                <button type="button" onClick={() => setForm(p => ({ ...p, removeDoc: true, fileObj: null }))} style={{ background: 'none', border: 'none', color: theme.red, cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>
                  <i className="fas fa-trash" /> Remove
                </button>
              </div>
            ) : null}
            <input
              type="file"
              onChange={(e) => {
                if (e.target.files && e.target.files[0]) {
                  setForm(p => ({ ...p, fileObj: e.target.files[0], removeDoc: false }));
                }
              }}
              style={{ fontSize: 13, width: '100%' }}
            />
            {form.fileObj && (
              <div style={{ marginTop: 6, fontSize: 12, color: theme.green, fontWeight: 500 }}>
                ✓ Selected to upload: {form.fileObj.name}
              </div>
            )}
            {form.removeDoc && (
              <div style={{ marginTop: 6, fontSize: 12, color: theme.red, fontWeight: 500 }}>
                ⚠️ Existing document will be removed upon save.
              </div>
            )}
          </div>
        </div>

        <div style={{ padding: '14px 22px', borderTop: `1px solid ${theme.border}`, display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
          <button onClick={onClose} style={btnOutline}>Cancel</button>
          <button onClick={() => onSave(form)} style={btnPrimary}><i className="fas fa-save" /> {initialData ? 'Update' : 'Save'}</button>
        </div>
      </div>
    </div>
  );
}

function ViewModal({ isOpen, onClose, record = null, onEdit, onDelete, isViewOnly }) {
  if (!isOpen || !record) return null;

  const daysElapsed = calculateDaysElapsed(record.received_ccu);
  const isPending = record.status === 'Pending' && daysElapsed > 15;

  function ViewRow({ label, value }) {
    return (
      <div style={{ display: 'flex', borderBottom: `1px solid ${theme.border}`, padding: '9px 4px', fontSize: 13, alignItems: 'flex-start' }}>
        <div style={{ width: 200, color: theme.text2, fontWeight: 600, flexShrink: 0 }}>{label}</div>
        <div style={{ color: theme.text, wordBreak: 'break-word', flex: 1 }}>{value == null || (typeof value === 'string' && value.trim() === '') ? '—' : value}</div>
      </div>
    );
  }

  return (
    <div style={overlayStyle} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div style={{ ...modalStyle, maxWidth: 680, display: 'flex', flexDirection: 'column', maxHeight: '90vh' }}>
        <div style={modalHeader}>
          <div>
            <span style={{ fontSize: 16, fontWeight: 700, color: theme.text }}>Complaint Details</span>
            <div style={{ fontSize: 12, color: theme.text3, marginTop: 3 }}>{record.serial_no}</div>
          </div>
          <button onClick={onClose} style={closeBtnStyle}>✕</button>
        </div>

        <div style={{ padding: 22, overflowY: 'auto', flex: 1 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: theme.navy, textTransform: 'uppercase', letterSpacing: '1px', borderBottom: `1px solid ${theme.border}`, paddingBottom: 6, marginBottom: 12 }}>File Information</div>
          <ViewRow label="Serial No" value={record.serial_no} />
          <ViewRow label="Status" value={record.status} />
          <ViewRow label="Letter Date" value={formatDisplayDate(record.letter_date)} />
          <ViewRow label="Received CCU" value={`${formatDisplayDate(record.received_ccu)}${daysElapsed !== null ? ` (${daysElapsed} days${isPending ? ' — PENDING' : ''})` : ''}`} />
          <ViewRow label="MC No" value={record.mc_no} />
          <ViewRow label="Category" value={record.category} />

          <div style={{ fontSize: 12, fontWeight: 700, color: theme.navy, textTransform: 'uppercase', letterSpacing: '1px', borderBottom: `1px solid ${theme.border}`, paddingBottom: 6, marginBottom: 12, marginTop: 20 }}>Apartment Details</div>
          <ViewRow label="Apartment Name" value={record.apartment_name} />
          <ViewRow label="Complaint Name" value={record.complaint_name} />

          <div style={{ fontSize: 12, fontWeight: 700, color: theme.navy, textTransform: 'uppercase', letterSpacing: '1px', borderBottom: `1px solid ${theme.border}`, paddingBottom: 6, marginBottom: 12, marginTop: 20 }}>Complaint Details</div>
          <ViewRow label="Issue / Heading" value={record.issue_heading} />
          <ViewRow label="File" value={record.file_marked ? 'Yes' : 'No'} />
          <ViewRow label="T/R" value={record.tr_marked ? 'Yes' : 'No'} />
          <ViewRow label="Reply" value={record.reply_marked ? 'Yes' : 'No'} />
          <ViewRow label="Remarks" value={record.remarks} />
          <ViewRow label="Attached Document" value={record.document_path ? (
            <a href={`${(import.meta.env.VITE_API_URL ?? '/api').trim().replace(/\/api\/?$/, '')}/${record.document_path}`} target="_blank" rel="noreferrer" style={{ color: theme.blue, textDecoration: 'underline' }}>
              {record.document_name || 'View Document'}
            </a>
          ) : 'No document attached'} />

          <div style={{ fontSize: 12, fontWeight: 700, color: theme.navy, textTransform: 'uppercase', letterSpacing: '1px', borderBottom: `1px solid ${theme.border}`, paddingBottom: 6, marginBottom: 12, marginTop: 20 }}>Audit</div>
          <ViewRow label="Created At" value={record.created_at} />
          <ViewRow label="Updated At" value={record.updated_at} />
        </div>

        <div style={{ padding: '14px 22px', borderTop: `1px solid ${theme.border}`, display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
          {!isViewOnly && (
            <button onClick={() => { onDelete(record.id); onClose(); }} style={{ ...btnOutline, color: theme.red, borderColor: theme.red }}>
              <i className="fas fa-trash" /> Delete
            </button>
          )}
          {!isViewOnly && (
            <button onClick={() => { onEdit(record); onClose(); }} style={btnPrimary}>
              <i className="fas fa-edit" /> Edit
            </button>
          )}
          <button onClick={onClose} style={btnOutline}>Close</button>
        </div>
      </div>
    </div>
  );
}

export default function Complaints({ currentUser, onNavigate, isViewOnly }) {
  // Dashboard quick-filter support
  // When user clicks Dashboard card for Complaints, we want ONLY: pending/not closed and > 15 days
  // Card sets localStorage key: cma_complaints_filter=pending_overdue_15
  const [pendingOverdueFilter, setPendingOverdueFilter] = useState(() => {
    const filter = localStorage.getItem('cma_complaints_filter');
    if (filter === 'pending_overdue_15') {
      localStorage.removeItem('cma_complaints_filter');
      return true;
    }
    return false;
  });

  const auditUserLabel = currentUser?.name && currentUser?.username
    ? `${currentUser.name} (${currentUser.username})`
    : currentUser?.name || currentUser?.username || '';

  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshTick, setRefreshTick] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [yearFilter, setYearFilter] = useState('');
  // stored as 'YYYY-MM'
  const [monthFilter, setMonthFilter] = useState('');
  // backs the new Month select dropdown ('01'..'12'); combined with yearFilter
  // below to keep producing monthFilter in the existing 'YYYY-MM' format.
  const [monthOnlyFilter, setMonthOnlyFilter] = useState('');
  const [page, setPage] = useState(1);

  const pageSizeDefault = 20;
  const [totalCount, setTotalCount] = useState(0);
  const [toast, setToast] = useState(null);
  const [exportModalOpen, setExportModalOpen] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [showFormModal, setShowFormModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [selectedHistoryRecord, setSelectedHistoryRecord] = useState(null);
  const [editingRecord, setEditingRecord] = useState(null);
  const [lastImportedSerialNos, setLastImportedSerialNos] = useState([]);
  const [showPendingPanel, setShowPendingPanel] = useState(() => {
    return sessionStorage.getItem('cma_complaints_showPendingPanel') === 'true';
  });
  const [overdueList, setOverdueList] = useState([]);
  // MC NO link popup state: { mcNo, x, y }
  const [mcLinkPopup, setMcLinkPopup] = useState(null);
  const confirm = useConfirmDialog();

  // Navigate to MC or M.Com Management with mc_no pre-filled as search term
  function handleMcNoNavigate(mcNo, page) {
    if (!mcNo || !onNavigate) return;
    const trimmed = String(mcNo).trim();
    if (page === 'mc') {
      localStorage.setItem('cma_mc_navigate_search', trimmed);
      onNavigate('mc');
    } else {
      localStorage.setItem('cma_mcom_navigate_search', trimmed);
      onNavigate('mcom');
    }
    setMcLinkPopup(null);
  }

  const pageSize = pageSizeDefault;
  const maxPage = Math.max(1, Math.ceil(totalCount / pageSize));

  async function load() {
    setLoading(true);
    try {
      const API_BASE = (import.meta.env.VITE_API_URL || '/api').trim();
      const params = new URLSearchParams({
        limit: pendingOverdueFilter ? 999999 : pageSize,
        page: pendingOverdueFilter ? 1 : page,
      });
      if (searchTerm?.trim()) params.append('q', searchTerm.trim());
      if (categoryFilter?.trim()) params.append('category', categoryFilter.trim());
      if (statusFilter) params.append('status', statusFilter);
      if (yearFilter?.trim()) params.append('year', yearFilter.trim());
      if (monthFilter?.trim()) params.append('month', monthFilter.trim());
      if (pendingOverdueFilter) params.append('pending_overdue_15', 'true');


      const r = await fetch(`${API_BASE}/complaints?${params.toString()}`);
      const data = await r.json();
      setComplaints(data?.rows ?? []);
      setTotalCount(data?.total ?? 0);
    } catch (err) {
      showToast('Failed to load Complaints', 'error');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    setPage(1);
  }, [searchTerm, categoryFilter, statusFilter, yearFilter, monthFilter, pendingOverdueFilter]);

  useEffect(() => {
    load();

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, searchTerm, categoryFilter, statusFilter, yearFilter, monthFilter, pendingOverdueFilter, refreshTick]);

  useEffect(() => {
    sessionStorage.setItem('cma_complaints_showPendingPanel', String(showPendingPanel));
  }, [showPendingPanel]);

  // Auto-refresh every 30 seconds
  const triggerRefresh = useCallback(() => setRefreshTick(t => t + 1), []);
  useAutoRefresh(triggerRefresh, 30000);

  // Keep monthFilter (existing 'YYYY-MM' format used by load()) in sync with the
  // new Year / Month select dropdowns, without changing how load() itself works.
  useEffect(() => {
    if (monthOnlyFilter) {
      setMonthFilter(monthOnlyFilter);
    } else {
      setMonthFilter('');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [monthOnlyFilter]);

  // Simple alert: if any loaded complaint is still "New" after more than a month,
  // let the user know. This does not change the existing 15-day Pending logic.
  useEffect(() => {
    if (!loading && complaints.length > 0) {
      const hasMonthOldNew = complaints.some(
        (cf) => cf.status === 'New' && calculateDaysElapsed(cf.received_ccu) > 30
      );
      if (hasMonthOldNew) {
        showToast('New complaints have been waiting for over a month', 'error');
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [complaints, loading]);


  useEffect(() => {
    async function loadOverdue() {
      try {
        const API_BASE = (import.meta.env.VITE_API_URL || '/api').trim();
        const r = await fetch(`${API_BASE}/complaints?pending_overdue_15=true&limit=999999`);
        const data = await r.json();
        setOverdueList(data?.rows ?? data ?? []);
      } catch (err) {
        console.error('Failed to load overdue list', err);
      }
    }
    loadOverdue();
  }, [complaints]);

  function showToast(msg, type = 'success') {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 2500);
  }

  async function handleSaveRecord(record) {
    try {
      const API_BASE = (import.meta.env.VITE_API_URL || '/api').trim();
      let targetId = editingRecord?.id;

      if (editingRecord) {
        const r = await fetch(`${API_BASE}/complaints/${editingRecord.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...record,
            ...(editingRecord ? { created_by: auditUserLabel, modified_by: auditUserLabel } : { modified_by: auditUserLabel }),
          }),
        });
        if (!r.ok) throw new Error('Failed to update');
      } else {
        const r = await fetch(`${API_BASE}/complaints`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...record,
            ...(auditUserLabel ? { created_by: auditUserLabel, modified_by: auditUserLabel } : {}),
          }),
        });
        if (!r.ok) throw new Error('Failed to create');
        const createdData = await r.json();
        targetId = createdData?.id;
      }

      if (record.removeDoc && editingRecord?.id) {
        await fetch(`${API_BASE}/complaints/${editingRecord.id}/document`, {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ user_name: auditUserLabel })
        });
      }

      if (record.fileObj && targetId) {
        const formData = new FormData();
        formData.append('document', record.fileObj);
        formData.append('uploaded_by', auditUserLabel || 'System');
        const uploadRes = await fetch(`${API_BASE}/complaints/${targetId}/upload`, {
          method: 'POST',
          body: formData,
        });
        if (!uploadRes.ok) {
          console.error('Failed to upload attachment');
          showToast('Record saved, but file upload failed', 'warning');
        }
      }

      showToast(editingRecord ? 'Updated ✅' : 'Created ✅');
      setShowFormModal(false);
      setEditingRecord(null);
      load();
    } catch (err) {
      showToast(err.message || 'Save failed', 'error');
    }
  }

  async function handleDeleteRecord(id) {
    const confirmed = await confirm({
      title: 'Delete Complaint',
      message: 'Delete this complaint permanently? This action cannot be undone.',
      confirmLabel: 'Delete',
      cancelLabel: 'Cancel',
    });
    if (!confirmed) return;
    try {
      const API_BASE = (import.meta.env.VITE_API_URL || '/api').trim();
      const r = await fetch(`${API_BASE}/complaints/${id}`, { method: 'DELETE' });
      if (!r.ok) throw new Error('Failed to delete');
      showToast('Deleted ✅');
      load();
    } catch (err) {
      showToast(err.message || 'Delete failed', 'error');
    }
  }

  async function handleDeleteImported() {
    if (!lastImportedSerialNos || !lastImportedSerialNos.length) return showToast('No imported batch to delete', 'error');
    const confirmed = await confirm({
      title: 'Delete imported records',
      message: `Delete ${lastImportedSerialNos.length} imported records? This cannot be undone.`,
      confirmLabel: 'Delete',
      cancelLabel: 'Cancel',
    });
    if (!confirmed) return;
    try {
      const API_BASE = (import.meta.env.VITE_API_URL || '/api').trim();
      const r = await fetch(`${API_BASE}/complaints/bulk-delete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ serial_nos: lastImportedSerialNos }),
      });
      const res = await r.json();
      if (!r.ok) throw new Error(res.error || 'Delete failed');
      showToast(`Deleted ${res.deleted} records ✅`);
      setLastImportedSerialNos([]);
      load();
    } catch (err) {
      showToast(err.message || 'Delete failed', 'error');
    }
  }

  async function handleDeleteAll() {
    const confirmed = await confirm({
      title: 'Delete all Complaints',
      message: 'Delete ALL complaint records? This cannot be undone.',
      confirmLabel: 'Delete all',
      cancelLabel: 'Cancel',
    });
    if (!confirmed) return;
    try {
      const API_BASE = (import.meta.env.VITE_API_URL || '/api').trim();
      const r = await fetch(`${API_BASE}/complaints`, { method: 'DELETE' });
      const res = await r.json();
      if (!r.ok) throw new Error(res.error || 'Delete all failed');
      showToast(`Deleted all Complaints ✅`);
      setLastImportedSerialNos([]);
      load();
    } catch (err) {
      showToast(err.message || 'Delete all failed', 'error');
    }
  }

  async function handleExport(format) {
    try {
      setExporting(true);
      if (typeof window.XLSX === 'undefined') return showToast('XLSX library not loaded', 'error');
      showToast('Preparing export...');

      const API_BASE = (import.meta.env.VITE_API_URL || '/api').trim();
      const response = await fetch(`${API_BASE}/complaints?limit=999999`);
      const result = await response.json();
      const allComplaints = result.rows || result || [];

      const rows = (allComplaints || []).map((r) => ({
        'Serial No': r.serial_no ?? '',
        'Letter date': r.letter_date ?? '',
        'Received CCU': r.received_ccu ?? '',
        'MC No.': r.mc_no ?? '',
        'Apartment Name': r.apartment_name ?? '',
        'Complaint Name': r.complaint_name ?? '',
        'Issue/Heading': r.issue_heading ?? '',
        'File': r.file_marked ? '√' : '',
        'T/R': r.tr_marked ? '√' : '',
        'Reply': r.reply_marked ? '√' : '',
        'Category': r.category ?? '',
        'Remarks': r.remarks ?? '',
        'Status': r.status ?? '',
        'Created By': r.created_by ?? '',
        'Modified By': r.modified_by ?? '',
        'Created At': r.created_at ?? '',
        'Updated At': r.updated_at ?? '',
      }));

      if (format === 'pdf') {
        exportToPdfPrint('Complaints', rows);
        setExportModalOpen(false);
        showToast('PDF print dialog opened ✅');
        return;
      }

      const ws = window.XLSX.utils.json_to_sheet(rows);
      const wb = window.XLSX.utils.book_new();
      window.XLSX.utils.book_append_sheet(wb, ws, 'Complaints');
      window.XLSX.writeFile(wb, `CMA_Complaints_${new Date().toISOString().split('T')[0]}.xlsx`);
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
    if (typeof window.XLSX === 'undefined') return showToast('XLSX library not loaded', 'error');
    try {
      const data = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (ev) => resolve(ev.target.result);
        reader.onerror = (err) => reject(err);
        reader.readAsArrayBuffer(file);
      });
      const wb = window.XLSX.read(new Uint8Array(data), { type: 'array', cellDates: true });
      let allRows = [];
      for (const sheetName of wb.SheetNames) {
        try {
          const ws = wb.Sheets[sheetName];
          const rows = sheetToRowObjects(ws);
          allRows.push(...rows);
        } catch (sheetErr) {
          console.warn(`Error processing sheet "${sheetName}":`, sheetErr);
          showToast(`Warning: Error in sheet "${sheetName}" - continuing with other sheets`, 'error');
        }
      }
      if (!allRows.length) return showToast('No matching complaint rows found in sheets', 'error');

      const records = [];
      const errors = [];

      allRows.forEach((row, idx) => {
        try {
          const record = toBackendRecordFromExcelRow(row);
          if (record) {
            records.push({
              ...record,
              ...(auditUserLabel ? { created_by: auditUserLabel, modified_by: auditUserLabel } : {}),
            });
          }
        } catch (rowErr) {
          console.warn(`Error processing row ${idx}:`, rowErr, row);
          errors.push(`Row ${idx + 1}: ${rowErr.message}`);
        }
      });

      if (!records.length) return showToast('No valid data rows found in sheets', 'error');

      const API_BASE = (import.meta.env.VITE_API_URL || '/api').trim();
      const r = await fetch(`${API_BASE}/complaints/bulk`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(records),
      });
      const result = await r.json();
      if (!r.ok) throw new Error(result.error || 'Import failed');
      showToast(`Imported ${records.length} records ✅`);
      setLastImportedSerialNos(records.map((x) => x.serial_no));
      load();

      if (errors.length > 0) {
        console.warn(`Import succeeded but ${errors.length} rows had issues:`, errors);
      }
    } catch (err) {
      showToast(err.message || 'Import failed', 'error');
      console.error('Import error:', err);
    } finally {
      e.target.value = '';
    }
  }

  const stats = useMemo(() => {
    const pending = complaints.filter((r) => r.status === 'Pending' && calculateDaysElapsed(r.received_ccu) > 15).length;
    const overdue = complaints.filter((r) => r.status === 'Pending' && calculateDaysElapsed(r.received_ccu) > 15).length;
    const closed = complaints.filter((r) => r.status === 'Closed').length;
    const replyDone = complaints.filter((r) => r.reply_marked).length;
    const categories = new Set(complaints.map((r) => r.category).filter(Boolean));
    const byStatus = {};
    complaints.forEach((r) => {
      byStatus[r.status] = (byStatus[r.status] || 0) + 1;
    });
    return { pending, overdue, closed, replyDone, totalCategories: categories.size, byStatus };
  }, [complaints]);

  const pendingByCategory = useMemo(() => {
    if (!categoryFilter) return [];
    return complaints.filter(
      (r) => r.category === categoryFilter && r.status === 'Pending' && calculateDaysElapsed(r.received_ccu) > 15
    );
  }, [complaints, categoryFilter]);

  return (
    <div style={{ padding: 20, fontFamily: "'Inter', 'Segoe UI', sans-serif", background: theme.bg, minHeight: '100vh' }}>
      {/* Breadcrumb */}
      <div style={{ fontSize: 12, color: '#999', marginBottom: 16 }}>
        <span>Home</span> / <span>Complaints Management</span>
      </div>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 10 }}>
        <div>
          <h2 style={{ fontSize: 19, fontWeight: 600, margin: 0, color: theme.text }}>Complaints Management</h2>
          <p style={{ color: '#999', fontSize: 13, margin: '4px 0 0 0' }}>Monthly progress complaint records tracking and management</p>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          <button onClick={() => setExportModalOpen(true)} style={btnOutline}><i className="fas fa-upload" /> Export</button>
          {!isViewOnly && (
            <label style={{ ...btnOutline, cursor: 'pointer', margin: 0 }}>
              <i className="fas fa-download" /> Import
              <input type="file" accept=".xlsx,.xls" style={{ display: 'none' }} onChange={importExcel} />
            </label>
          )}
          {!isViewOnly && (
            <button onClick={handleDeleteAll} style={{ ...btnOutline, color: theme.red, borderColor: theme.red }} title="Delete all Complaints">
              <i className="fas fa-trash" /> Delete All
            </button>
          )}
          {!isViewOnly && lastImportedSerialNos && lastImportedSerialNos.length > 0 && (
            <button onClick={handleDeleteImported} style={{ ...btnOutline, color: theme.red, borderColor: theme.red }} title="Delete imported batch">
              <i className="fas fa-trash" /> Delete Imported
            </button>
          )}
          {/* Pending Reminder Bell */}
          <div style={{ position: 'relative' }}>
            <button
              onClick={() => setShowPendingPanel((v) => !v)}
              style={{ position: 'relative', ...btnOutline }}
              title="Pending reminders - complaints pending for more than 15 days"
            >
              <i className="fas fa-bell" /> Pending
              {stats.pending > 0 && (
                <span style={{ position: 'absolute', top: -6, right: -6, background: '#2563eb', color: '#fff', borderRadius: 999, fontSize: 10, fontWeight: 700, minWidth: 16, height: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 4px' }}>
                  {stats.pending}
                </span>
              )}
            </button>
            {showPendingPanel && (
              <div style={{ position: 'absolute', right: 0, top: '110%', width: 340, maxHeight: 420, overflowY: 'auto', background: '#fff', border: `1px solid ${theme.border}`, borderRadius: 10, boxShadow: '0 12px 34px rgba(0,0,0,.18)', zIndex: 500 }}>
                <div style={{ padding: '10px 14px', fontWeight: 700, fontSize: 13, color: theme.navy, borderBottom: `1px solid ${theme.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span>Pending Reminders (&gt;15 days)</span>
                  <button onClick={() => setShowPendingPanel(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: theme.text3, fontSize: 14, lineHeight: 1, padding: 4 }} title="Close">
                    <i className="fas fa-times" />
                  </button>
                </div>
                <div style={{ padding: '10px 14px', borderBottom: `1px solid ${theme.border}`, background: '#f8fafc', display: 'flex', gap: 8 }}>
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
                {stats.pending === 0 ? (
                  <div style={{ padding: 14, fontSize: 12, color: theme.text3 }}>No pending items.</div>
                ) : overdueList.map((cf) => {
                  const days = calculateDaysElapsed(cf.received_ccu);
                  return (
                    <div
                      key={cf.id}
                      style={{ padding: '10px 14px', borderBottom: `1px solid ${theme.border}`, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between', transition: '.15s background' }}
                      onClick={() => {
                        setSelectedRecord(cf);
                        setShowViewModal(true);
                        setShowPendingPanel(false);
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.background = '#f8fafc'}
                      onMouseLeave={(e) => e.currentTarget.style.background = '#fff'}
                    >
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span style={{ fontSize: 12.5, fontWeight: 600, color: theme.text }}>{cf.serial_no}</span>
                          <span style={{ padding: '1px 6px', borderRadius: 999, background: '#fee2e2', color: '#ef4444', fontSize: 10, fontWeight: 700 }}>{days} days</span>
                        </div>
                        <div style={{ fontSize: 11, color: theme.text2, marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          <strong>Issue:</strong> {cf.issue_heading || '—'}
                        </div>
                        <div style={{ fontSize: 10.5, color: theme.text3, marginTop: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {cf.apartment_name || '—'}
                        </div>
                      </div>
                      <i className="fas fa-chevron-right" style={{ fontSize: 11, color: theme.text3, marginLeft: 8 }} />
                    </div>
                  );
                })}
              </div>
            )}
          </div>
          {!isViewOnly && (
            <button onClick={() => { setEditingRecord(null); setShowFormModal(true); }} style={btnPrimary}>
              <i className="fas fa-plus" /> Add Complaint
            </button>
          )}
        </div>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))', gap: 14, marginBottom: 16 }}>
        {[
          { label: 'TOTAL', value: totalCount, icon: 'fa-folder' },
          { label: 'PENDING', value: stats.pending, icon: 'fa-exclamation', color: theme.red },
          { label: 'CATEGORIES', value: stats.totalCategories, icon: 'fa-tags' },
          { label: 'NEW', value: stats.byStatus['New'] || 0, icon: 'fa-star', color: '#2563eb' },
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

      {/* Pending by Category — only shown when a category is selected */}
      {categoryFilter && pendingByCategory.length > 0 && (
        <div style={{ background: theme.card, borderRadius: 14, border: `1px solid ${theme.border}`, borderLeft: `4px solid ${theme.orange}`, boxShadow: '0 4px 20px rgba(15,23,42,.06)', marginBottom: 16, overflow: 'hidden' }}>
          <div style={{ padding: '14px 20px', display: 'flex', alignItems: 'center', gap: 14, borderBottom: `1px solid ${theme.border}` }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: `${theme.orange}15`, color: theme.orange, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <i className="fas fa-clock" style={{ fontSize: 15 }} />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: theme.text }}>Pending — {categoryFilter}</span>
                <span style={{ padding: '2px 8px', borderRadius: 999, background: `${theme.red}15`, color: theme.red, fontSize: 11, fontWeight: 600 }}>
                  {pendingByCategory.length}
                </span>
              </div>
              <div style={{ fontSize: 12, color: theme.text3, marginTop: 2 }}>Complaints in this category pending more than 15 days</div>
            </div>
          </div>
          <div style={{ maxHeight: 320, overflowY: 'auto' }}>
            {pendingByCategory.map((pending, idx) => {
              const days = calculateDaysElapsed(pending.received_ccu);
              return (
                <div
                  key={pending.id}
                  onClick={() => { setSelectedRecord(pending); setShowViewModal(true); }}
                  style={{ padding: '12px 20px', borderTop: idx === 0 ? 'none' : `1px solid ${theme.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16, cursor: 'pointer', transition: 'background .15s ease' }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = theme.bg)}
                  onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 3 }}>
                      <span style={{ fontSize: 13, fontWeight: 600, color: theme.text }}>{pending.serial_no}</span>
                      <span style={{ fontSize: 12, color: theme.text3 }}>•</span>
                      <span style={{ fontSize: 12, color: theme.text2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{pending.apartment_name || '—'}</span>
                    </div>
                    <div style={{ fontSize: 12, color: theme.text3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{pending.issue_heading || 'No heading provided'}</div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                    <span style={{ padding: '3px 10px', borderRadius: 999, background: `${theme.red}12`, color: theme.red, fontSize: 11, fontWeight: 600 }}>{days} days</span>
                    <i className="fas fa-chevron-right" style={{ fontSize: 11, color: theme.text3 }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Table Card */}
      <div style={{ background: theme.card, borderRadius: 12, border: `1px solid ${theme.border}`, boxShadow: '0 2px 12px rgba(0,0,0,.07)', overflow: 'hidden' }}>

        {/* Filters */}
        <div style={{ padding: '14px 16px', borderBottom: `1px solid ${theme.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 14, fontWeight: 600, color: theme.text }}>Complaint Records</span>
            {pendingOverdueFilter && (
              <span style={{
                fontSize: 11,
                color: theme.orange,
                background: `${theme.orange}15`,
                padding: '3px 10px',
                borderRadius: 12,
                fontWeight: 600,
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
              }}>
                <i className="fas fa-clock" /> Pending &gt; 15 Days
                <button
                  onClick={() => setPendingOverdueFilter(false)}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: theme.orange,
                    cursor: 'pointer',
                    fontSize: 12,
                    marginLeft: 4,
                    padding: 0,
                    fontWeight: 700,
                  }}
                  title="Clear Filter"
                >
                  ✕
                </button>
              </span>
            )}
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            <div style={{ position: 'relative', flex: '1 1 180px', maxWidth: 260 }}>
              <i className="fas fa-search" style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#999', fontSize: 12 }}></i>
              <input
                id="complaint_search_input"
                name="complaint_search_input"
                aria-label="Search Complaints"
                type="text"
                placeholder="Search…"
                value={searchTerm}
                onChange={(e) => { setSearchTerm(e.target.value); setPendingOverdueFilter(false); }}
                style={{ padding: '6px 10px 6px 28px', height: 30, borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 12, width: '100%', outline: 'none', transition: 'border-color 0.2s', boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.02)' }}
                onFocus={(e) => e.target.style.borderColor = '#3b82f6'}
                onBlur={(e) => e.target.style.borderColor = '#cbd5e1'}
              />
            </div>
            <select
              id="complaint_category_filter"
              name="complaint_category_filter"
              aria-label="Filter Category"
              value={categoryFilter}
              onChange={(e) => { setCategoryFilter(e.target.value); setPendingOverdueFilter(false); }}
              style={{ padding: '6px 10px', borderRadius: 4, border: '1px solid #ddd', fontSize: 12, minWidth: 180 }}
            >
              <option value="">All Categories</option>
              {Object.entries(CATEGORIES_BY_SECTION).map(([section, cats]) => (
                <optgroup key={section} label={section}>
                  {cats.map((cat) => <option key={cat} value={cat}>{cat}</option>)}
                </optgroup>
              ))}
            </select>
            <select
              id="complaint_status_filter"
              name="complaint_status_filter"
              aria-label="Filter Status"
              value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value); setPendingOverdueFilter(false); }}
              style={{ padding: '6px 10px', borderRadius: 4, border: '1px solid #ddd', fontSize: 12, minWidth: 120 }}
            >
              <option value="">All Status</option>
              {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>

            <select
              id="complaint_year_filter"
              name="complaint_year_filter"
              aria-label="Filter Year"
              value={yearFilter}
              onChange={(e) => { setYearFilter(e.target.value); setPendingOverdueFilter(false); }}
              style={{ padding: '6px 10px', borderRadius: 4, border: '1px solid #ddd', fontSize: 12, width: 100 }}
            >
              <option value="">All Years</option>
              {getYearFilterOptions().map((y) => <option key={y} value={y}>{y}</option>)}
            </select>

            <select
              id="complaint_month_filter"
              name="complaint_month_filter"
              aria-label="Filter Month"
              value={monthOnlyFilter}
              onChange={(e) => { setMonthOnlyFilter(e.target.value); setPendingOverdueFilter(false); }}
              style={{ padding: '6px 10px', borderRadius: 4, border: '1px solid #ddd', fontSize: 12, width: 140 }}
            >
              <option value="">All Months</option>
              {MONTH_OPTIONS.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
            </select>

          </div>
        </div>

        {/* Pagination */}
        <div style={{ padding: '10px 16px', borderBottom: `1px solid ${theme.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <div style={{ fontSize: 12, color: theme.text2 }}>
            Showing <strong>{loading ? 0 : complaints.length}</strong> of <strong>{totalCount}</strong>
          </div>
          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}
              style={page === 1 ? { ...btnOutline, opacity: 0.5, cursor: 'not-allowed', padding: '5px 10px', fontSize: 12 } : { ...btnOutline, padding: '5px 10px', fontSize: 12 }}>Prev</button>
            <span style={{ fontSize: 12, color: theme.text3 }}>Page <strong style={{ color: theme.text }}>{page}</strong> / {maxPage}</span>
            <button onClick={() => setPage((p) => Math.min(maxPage, p + 1))} disabled={page >= maxPage}
              style={page >= maxPage ? { ...btnOutline, opacity: 0.5, cursor: 'not-allowed', padding: '5px 10px', fontSize: 12 } : { ...btnOutline, padding: '5px 10px', fontSize: 12 }}>Next</button>
          </div>
        </div>

        {/* Table — MC Management pattern: colgroup, sticky header, sticky actions, maxHeight scroll */}
        <div style={tableWrapperStyle}>
          <table style={tableStyle}>
            <colgroup>
              {Object.keys(COL_WIDTHS).map((h) => (
                <col key={h} style={{ width: COL_WIDTHS[h] }} />
              ))}
            </colgroup>
            <thead>
              <tr>
                {Object.keys(COL_WIDTHS).map((label) => (
                  <th key={label} style={label === 'ACTIONS' ? thActionsStyle : label === 'STATUS' ? thStatusStyle : thStyle}>{label}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={Object.keys(COL_WIDTHS).length} style={{ padding: 24, textAlign: 'center', color: theme.text3 }}>Loading…</td></tr>
              ) : complaints.length === 0 ? (
                <tr><td colSpan={Object.keys(COL_WIDTHS).length} style={{ padding: 24, textAlign: 'center', color: theme.text3 }}>No Complaints found</td></tr>
              ) : (
                complaints.map((cf) => {
                  const days = calculateDaysElapsed(cf.received_ccu);
                  const isPending = cf.status === 'Pending' && days > 15;
                  return (
                    <tr
                      key={cf.id}
                      style={{ borderBottom: `1px solid ${theme.border}`, background: isPending ? '#fffbeb' : 'transparent' }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = isPending ? '#fef3c7' : '#f8fafc')}
                      onMouseLeave={(e) => (e.currentTarget.style.background = isPending ? '#fffbeb' : '')}
                    >
                      <td style={{ ...cellStyle, color: isPending ? theme.orange : theme.text, fontWeight: 500 }} title={cf.serial_no}>{cf.serial_no}</td>
                      <td style={cellStyle} title={formatDisplayDate(cf.letter_date)}>{formatDisplayDate(cf.letter_date)}</td>
                      <td style={cellStyle} title={formatDisplayDate(cf.received_ccu)}>{formatDisplayDate(cf.received_ccu)}</td>
                      <td style={cellStyle} title={cf.mc_no ? `Click to find "${cf.mc_no}" in MC Management or M.Com` : ''}>
                        {cf.mc_no ? (
                          <span
                            onClick={(e) => {
                              e.stopPropagation();
                              const rect = e.currentTarget.getBoundingClientRect();
                              setMcLinkPopup(mcLinkPopup?.mcNo === cf.mc_no ? null : { mcNo: cf.mc_no, x: rect.left, y: rect.bottom + 4 });
                            }}
                            style={{
                              color: theme.blue,
                              fontWeight: 600,
                              cursor: 'pointer',
                              textDecoration: 'underline',
                              textDecorationStyle: 'dotted',
                              textUnderlineOffset: 3,
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 4,
                            }}
                          >
                            {cf.mc_no}
                            <i className="fas fa-external-link-alt" style={{ fontSize: 9, opacity: 0.6 }} />
                          </span>
                        ) : '—'}
                      </td>
                      <td style={cellStyle} title={cf.apartment_name}>{cf.apartment_name || '—'}</td>
                      <td style={cellStyle} title={cf.complaint_name}>{cf.complaint_name || '—'}</td>
                      <td style={cellStyle} title={cf.issue_heading}>{cf.issue_heading || '—'}</td>
                      <td style={tdCheckStyle}>{cf.file_marked ? <span style={{ color: theme.green }}>✓</span> : <span style={{ color: theme.text3 }}>—</span>}</td>
                      <td style={tdCheckStyle}>{cf.tr_marked ? <span style={{ color: theme.green }}>✓</span> : <span style={{ color: theme.text3 }}>—</span>}</td>
                      <td style={tdCheckStyle}>{cf.reply_marked ? <span style={{ color: theme.green }}>✓</span> : <span style={{ color: theme.text3 }}>—</span>}</td>
                      <td style={{ ...tdStatusStyle, background: isPending ? '#fffbeb' : '#ffffff' }}>
                        <span style={{
                          display: 'inline-block',
                          padding: '3px 9px',
                          borderRadius: 6,
                          background: `${STATUS_COLORS[cf.status] || theme.blue}15`,
                          color: STATUS_COLORS[cf.status] || theme.blue,
                          fontSize: 12,
                          fontWeight: 600,
                        }}>
                          {cf.status}
                        </span>
                      </td>
                      <td style={{ ...tdActionsStyle, background: isPending ? '#fffbeb' : '#ffffff' }}>
                        <div style={{ display: 'flex', gap: 2, justifyContent: 'flex-start', alignItems: 'center' }}>
                          <button onClick={() => { setSelectedRecord(cf); setShowViewModal(true); }}
                            style={{ background: 'none', border: 'none', color: theme.blue, cursor: 'pointer', fontSize: 14, padding: 4 }} title="View">
                            <i className="fas fa-eye" />
                          </button>
                          <button onClick={() => { setSelectedHistoryRecord(cf); setShowHistoryModal(true); }}
                            style={{ background: 'none', border: 'none', color: theme.text2, cursor: 'pointer', fontSize: 14, padding: 4 }} title="History">
                            <i className="fas fa-history" />
                          </button>
                          {!isViewOnly && (
                            <button onClick={() => { setEditingRecord(cf); setShowFormModal(true); }}
                              style={{ background: 'none', border: 'none', color: theme.orange, cursor: 'pointer', fontSize: 14, padding: 4 }} title="Edit">
                              <i className="fas fa-edit" />
                            </button>
                          )}
                          {!isViewOnly && (
                            <button onClick={() => handleDeleteRecord(cf.id)}
                              style={{ background: 'none', border: 'none', color: theme.red, cursor: 'pointer', fontSize: 14, padding: 4 }} title="Delete">
                              <i className="fas fa-trash" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MC NO Link Popup */}
      {mcLinkPopup && (
        <>
          {/* Backdrop to close on outside click */}
          <div
            onClick={() => setMcLinkPopup(null)}
            style={{ position: 'fixed', inset: 0, zIndex: 9990 }}
          />
          <div
            style={{
              position: 'fixed',
              left: Math.min(mcLinkPopup.x, window.innerWidth - 230),
              top: mcLinkPopup.y,
              zIndex: 9991,
              background: '#fff',
              border: `1px solid ${theme.border}`,
              borderRadius: 10,
              boxShadow: '0 8px 32px rgba(0,0,0,.16)',
              minWidth: 220,
              overflow: 'hidden',
            }}
          >
            <div style={{ padding: '10px 14px 6px', borderBottom: `1px solid ${theme.border}` }}>
              <div style={{ fontSize: 11, color: theme.text3, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.6px' }}>Find File No.</div>
              <div style={{ fontSize: 13, fontWeight: 700, color: theme.navy, marginTop: 2 }}>{mcLinkPopup.mcNo}</div>
            </div>
            <button
              onClick={() => handleMcNoNavigate(mcLinkPopup.mcNo, 'mc')}
              style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '11px 14px', background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, color: theme.text, textAlign: 'left', transition: 'background .15s' }}
              onMouseEnter={e => e.currentTarget.style.background = theme.bg}
              onMouseLeave={e => e.currentTarget.style.background = 'none'}
            >
              <i className="fas fa-building" style={{ color: theme.navy, width: 16, textAlign: 'center' }} />
              <div>
                <div style={{ fontWeight: 600 }}>MC Management</div>
                <div style={{ fontSize: 11, color: theme.text3, marginTop: 1 }}>OLD / NEW FILE NO</div>
              </div>
            </button>
            <button
              onClick={() => handleMcNoNavigate(mcLinkPopup.mcNo, 'mcom')}
              style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '11px 14px', background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, color: theme.text, textAlign: 'left', transition: 'background .15s', borderTop: `1px solid ${theme.border}` }}
              onMouseEnter={e => e.currentTarget.style.background = theme.bg}
              onMouseLeave={e => e.currentTarget.style.background = 'none'}
            >
              <i className="fas fa-file-alt" style={{ color: theme.blue, width: 16, textAlign: 'center' }} />
              <div>
                <div style={{ fontWeight: 600 }}>M.Com Management</div>
                <div style={{ fontSize: 11, color: theme.text3, marginTop: 1 }}>OLD / NEW FILE NO</div>
              </div>
            </button>
          </div>
        </>
      )}

      {/* Modals */}
      <FormModal
        isOpen={showFormModal}
        onClose={() => { setShowFormModal(false); setEditingRecord(null); }}
        onSave={handleSaveRecord}
        initialData={editingRecord}
      />

      <ViewModal
        isOpen={showViewModal}
        onClose={() => setShowViewModal(false)}
        record={selectedRecord}
        onEdit={(rec) => { setEditingRecord(rec); setShowFormModal(true); }}
        onDelete={handleDeleteRecord}
        isViewOnly={isViewOnly}
      />

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
          title="Export Complaints"
          subject="all Complaints"
          exporting={exporting}
          onExport={handleExport}
          onClose={() => setExportModalOpen(false)}
        />
      )}

      {/* Toast — MC Management style */}
      {toast && (
        <div style={{ position: 'fixed', bottom: 22, right: 22, zIndex: 9999, background: '#fff', border: `1px solid ${theme.border}`, borderLeft: `4px solid ${toast.type === 'error' ? theme.red : theme.green}`, borderRadius: 10, padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 10, boxShadow: '0 8px 30px rgba(0,0,0,.12)', minWidth: 240 }}>
          <i className={`fas fa-${toast.type === 'error' ? 'times-circle' : 'check-circle'}`} style={{ color: toast.type === 'error' ? theme.red : theme.green, fontSize: 15 }} />
          <span style={{ fontSize: 13, fontWeight: 700 }}>{toast.msg}</span>
        </div>
      )}
    </div>
  );
}