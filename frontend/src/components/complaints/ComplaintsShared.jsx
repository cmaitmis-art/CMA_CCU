import React, { useState, useEffect } from 'react';

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
const tdStatusStyle = { padding: '8px 8px', fontSize: 12, fontFamily: "var(--font-sans)", position: 'sticky', right: STATUS_COL_RIGHT_OFFSET, width: 195, minWidth: 195, maxWidth: 195, zIndex: 10, background: '#ffffff', borderLeft: '1px solid #e2e8f0', boxShadow: 'none', backgroundClip: 'padding-box', overflow: 'hidden' };

function ActionBtn({ icon, color, title, onClick }) {
  return (
    <button onClick={onClick} title={title} style={{ background: 'none', border: 'none', cursor: 'pointer', color, width: 18, minWidth: 18, height: 20, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, padding: 0, flexShrink: 0 }}>
      <i className={icon} />
    </button>
  );
}

const thStatusStyle = {
  ...thStyle,
  position: 'sticky',
  right: STATUS_COL_RIGHT_OFFSET,
  zIndex: 30,
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
  'ACTIONS': 260,
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
const STATUS_OPTIONS = ['New', 'Open', 'Pending', 'Transferred', 'Closed'];
const STATUS_COLORS = {
  'New': '#2563eb',
  'Open': '#f59e0b',
  'Pending': '#ef4444',
  'Transferred': '#8b5cf6',
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

function ViewModal({ isOpen, onClose, record = null, onEdit, onDelete, canEdit }) {
  if (!isOpen || !record) return null;

  const daysElapsed = calculateDaysElapsed(record.received_ccu);
  const isPending = record.status === 'Pending' && daysElapsed > 15;

  let transferredBy = '';
  let transferredTo = record.assigned_department || '';
  let transferredFrom = '';
  if (record.status === 'Transferred' && record.history) {
    try {
      const historyArr = typeof record.history === 'string' ? JSON.parse(record.history) : record.history;
      if (Array.isArray(historyArr)) {
        const transferAction = [...historyArr].reverse().find(h => h.action === 'Transferred');
        if (transferAction) {
          transferredBy = transferAction.name || 'System';
          transferredFrom = transferAction.from_department || 'ADMIN';
          if (!transferredTo && transferAction.note) {
            transferredTo = transferAction.note.replace('Transferred to ', '');
          }
        }
      }
    } catch (e) {}
  }

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
          {record.status === 'Transferred' && (
            <>
              <ViewRow label="Transferred From" value={transferredFrom} />
              <ViewRow label="Transferred To" value={transferredTo} />
              <ViewRow label="Transferred By" value={transferredBy} />
            </>
          )}
          <ViewRow label="Letter Date" value={formatDisplayDate(record.letter_date)} />
          <ViewRow label="Received CCU" value={`${formatDisplayDate(record.received_ccu)}${daysElapsed !== null ? ` (${daysElapsed} days overdue)` : ''}`} />
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
          <ViewRow label="Created At" value={record.created_at ? `${formatDisplayDate(record.created_at)} (By: ${record.created_by || 'System'})` : '—'} />
          <ViewRow label="Updated At" value={record.updated_at ? `${formatDisplayDate(record.updated_at)} (By: ${record.updated_by || record.modified_by || 'System'})` : '—'} />

          {record.status === 'Closed' && (
            <>
              <div style={{ fontSize: 12, fontWeight: 700, color: theme.green, textTransform: 'uppercase', letterSpacing: '1px', borderBottom: `1px solid ${theme.border}`, paddingBottom: 6, marginBottom: 12, marginTop: 20 }}>Closure Details</div>
              <ViewRow label="Closed By" value={record.closed_by ? `${record.closed_by} (${record.closed_department || 'ADMIN'})` : 'System'} />
              <ViewRow label="Resolution Reason" value={record.closed_reason || '—'} />
              <ViewRow label="Closure Document" value={record.closed_document_path ? (
                <a
                  href={`${(import.meta.env.VITE_API_URL ?? '/api').trim().replace(/\/api\/?$/, '')}/${record.closed_document_path}`}
                  target="_blank"
                  rel="noreferrer"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 10px', background: `${theme.green}10`, color: theme.green, borderRadius: 6, textDecoration: 'none', fontWeight: 500, fontSize: 13 }}
                >
                  <i className="fas fa-file-download" /> {record.closed_document_name || 'Download Closure Document'}
                </a>
              ) : 'No closure document attached'} />
            </>
          )}
        </div>

        <div style={{ padding: '14px 22px', borderTop: `1px solid ${theme.border}`, display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
          {canEdit && (
            <button onClick={() => { onDelete(record.id); onClose(); }} style={{ ...btnOutline, color: theme.red, borderColor: theme.red }}>
              <i className="fas fa-trash" /> Delete
            </button>
          )}
          {canEdit && (
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

function TransferModal({ isOpen, onClose, onSave, record, currentUser }) {
  const userDept = (currentUser?.department || '').toUpperCase();

  // Build transfer options based on who is logged in
  const deptOptions = userDept === 'LEGAL'
    ? [{ value: 'TECHNICAL', label: 'Technical Department' }, { value: 'CCU', label: 'CCU (Back to Admin)' }]
    : userDept === 'TECHNICAL'
    ? [{ value: 'LEGAL', label: 'Legal Department' }, { value: 'CCU', label: 'CCU (Back to Admin)' }]
    : [
        { value: 'LEGAL', label: 'Legal Department' },
        { value: 'TECHNICAL', label: 'Technical Department' },
      ];

  const [department, setDepartment] = useState(deptOptions[0]?.value || 'LEGAL');

  if (!isOpen || !record) return null;

  return (
    <div style={overlayStyle} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div style={{ ...modalStyle, maxWidth: 500, display: 'flex', flexDirection: 'column' }}>
        <div style={modalHeader}>
          <span style={{ fontSize: 16, fontWeight: 700 }}>Transfer Complaint</span>
          <button onClick={onClose} style={closeBtnStyle}>✕</button>
        </div>
        <div style={{ padding: 22 }}>
          <div style={{ marginBottom: 15, fontSize: 13, color: theme.text2 }}>
            Transfer <strong>{record.serial_no}</strong> to a department for further action.
          </div>
          <FormField label="Assign to Department">
            <select
              value={department}
              onChange={(e) => setDepartment(e.target.value)}
              style={inputStyle}
            >
              {deptOptions.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </FormField>
        </div>
        <div style={{ padding: '14px 22px', borderTop: `1px solid ${theme.border}`, display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
          <button onClick={onClose} style={btnOutline}>Cancel</button>
          <button onClick={() => onSave(department)} style={btnPrimary}><i className="fas fa-share" /> Transfer</button>
        </div>
      </div>
    </div>
  );
}

function CloseModal({ isOpen, onClose, onSave, record }) {
  const [reason, setReason] = useState('');
  const [fileObj, setFileObj] = useState(null);

  if (!isOpen || !record) return null;

  return (
    <div style={overlayStyle} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div style={{ ...modalStyle, maxWidth: 500, display: 'flex', flexDirection: 'column' }}>
        <div style={modalHeader}>
          <span style={{ fontSize: 16, fontWeight: 700 }}>Close Complaint</span>
          <button onClick={onClose} style={closeBtnStyle}>✕</button>
        </div>
        <div style={{ padding: 22, display: 'flex', flexDirection: 'column', gap: 15 }}>
          <div style={{ fontSize: 13, color: theme.text2 }}>
            Closing <strong>{record.serial_no}</strong>. Please provide a resolution reason and upload any supporting document.
          </div>
          <FormField label="Resolution Reason *" type="textarea" value={reason} onChange={setReason} rows={4} placeholder="Describe how this issue was resolved..." />
          <div style={{ padding: '12px 14px', background: `${theme.blue}08`, border: `1px dashed ${theme.blue}40`, borderRadius: 8 }}>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 8, color: theme.navy }}>
              <i className="fas fa-paperclip" style={{ marginRight: 6 }} /> Attach Final Document (Optional)
            </label>
            <input
              type="file"
              onChange={(e) => {
                if (e.target.files && e.target.files[0]) {
                  setFileObj(e.target.files[0]);
                }
              }}
              style={{ fontSize: 13, width: '100%' }}
            />
            {fileObj && (
              <div style={{ marginTop: 6, fontSize: 12, color: theme.green, fontWeight: 500 }}>
                ✓ Selected: {fileObj.name}
              </div>
            )}
          </div>
        </div>
        <div style={{ padding: '14px 22px', borderTop: `1px solid ${theme.border}`, display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
          <button onClick={onClose} style={btnOutline}>Cancel</button>
          <button onClick={() => onSave(reason, fileObj)} style={{...btnPrimary, background: theme.green}} disabled={!reason.trim()}><i className="fas fa-check-circle" /> Close Case</button>
        </div>
      </div>
    </div>
  );
}
export {
  theme,
  btnBase,
  btnPrimary,
  btnOutline,
  overlayStyle,
  modalStyle,
  modalHeader,
  closeBtnStyle,
  inputStyle,
  sectionLabelStyle,
  tableWrapperStyle,
  tableStyle,
  thStyle,
  thActionsStyle,
  tdActionsStyle,
  STATUS_COL_RIGHT_OFFSET,
  tdStatusStyle,
  ActionBtn,
  thStatusStyle,
  cellStyle,
  tdCheckStyle,
  COL_WIDTHS,
  CATEGORIES_BY_SECTION,
  ALL_CATEGORIES,
  STATUS_OPTIONS,
  STATUS_COLORS,
  pad2,
  normalizeKey,
  getCell,
  toText,
  toBool,
  findHeaderRowIndex,
  sheetToRowObjects,
  calculateDaysElapsed,
  toBackendRecordFromExcelRow,
  FormField,
  CheckField,
  SectionLabel,
  FormModal,
  ViewModal,
  TransferModal,
  CloseModal
};
