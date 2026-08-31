import React, { useEffect, useMemo, useState } from 'react';
import * as XLSX from 'xlsx';
import { useConfirmDialog } from '../ConfirmDialogContext.jsx';
import '../CMAStyles.css';
import HistoryModal from '../components/HistoryModal.jsx';
import GenericExportModal from '../components/GenericExportModal.jsx';
import { exportToPdfPrint } from '../utils/pdfExport.js';
import { MONTH_OPTIONS, getYearFilterOptions } from '../utils/filterConstants';
import {
  cellStyle,
  thStyle,
  thStatusStyle,
  tdStatusStyle,
  thActionsStyle,
  tdActionsStyle,
} from '../components/mc-management/MCManagementShared.jsx';
import { TransferModal, CloseModal, ActionBtn } from '../components/c-files/CFilesShared.jsx';
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
  orange: '#f59e0b',
};

const CFILES_EXPORT_FIELDS = [
  'File No', 'Name of the Apartment', 'Address', 'Date', 'Reason', 'Complainer Details',
  'Registered CCU File No', 'Title', 'File Type', 'Category', 'Remarks', 'Status',
  'Created By', 'Modified By', 'Created At', 'Updated At'
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

const COL_WIDTHS = {
  'FILE NO': 130,
  'NAME OF THE APARTMENT': 220,
  'ADDRESS': 220,
  'DATE': 120,
  'REASON': 220,
  'COMPLAINER DETAILS': 200,
  'REGISTERED CCU FILE NO': 220,
  'REMARKS': 'auto',
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

function pad2(value) {
  return String(value).padStart(2, '0');
}

function parseFlexibleDate(value) {
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

    // Validate
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

    // Validate
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

function formatDisplayDate(v) {
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
  // collapse spaces and lowercase — this makes matching robust to underscores/punctuation.
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

function normalizeExcelDate(value) {
  if (value === null || value === undefined || value === '') return '';
  try {
    const date = parseFlexibleDate(value);
    if (date && !Number.isNaN(date.getTime())) {
      return date.toISOString().slice(0, 10);
    }
  } catch (e) {
    console.warn('Error normalizing date:', value, e);
  }
  // Return empty string for invalid dates instead of raw text
  return '';
}

function buildRowObjectFromArray(row) {
  const values = Array.isArray(row) ? row.map((v) => toText(v)) : [];
  const fileNoIndex = values.findIndex((v) => /^(?:cma\/?ccu|ccu|cf|file)[\s\/-]?\d+/i.test(v));
  if (fileNoIndex >= 0) {
    return {
      file_no: values[fileNoIndex] || '',
      name_of_apartment: values[fileNoIndex + 1] || '',
      address: values[fileNoIndex + 2] || '',
      date: normalizeExcelDate(values[fileNoIndex + 3]) || '',
      reason: values[fileNoIndex + 4] || '',
      complainer_details: values[fileNoIndex + 5] || '',
      registered_ccu_file_no: values[fileNoIndex + 6] || '',
      remarks: values[fileNoIndex + 7] || '',
      status: values[fileNoIndex + 8] || '',
    };
  }

  if (values.length >= 9 && /^[0-9]+$/.test(values[0])) {
    return {
      file_no: values[1] || '',
      name_of_apartment: values[2] || '',
      address: values[3] || '',
      date: normalizeExcelDate(values[4]) || '',
      reason: values[5] || '',
      complainer_details: values[6] || '',
      registered_ccu_file_no: values[7] || '',
      remarks: values[8] || '',
      status: values[9] || '',
    };
  }

  if (values.length >= 8) {
    return {
      file_no: values[0] || '',
      name_of_apartment: values[1] || '',
      address: values[2] || '',
      date: normalizeExcelDate(values[3]) || '',
      reason: values[4] || '',
      complainer_details: values[5] || '',
      registered_ccu_file_no: values[6] || '',
      remarks: values[7] || '',
      status: values[8] || '',
    };
  }

  return null;
}

function sheetToRowObjects(ws) {
  const rawRows = window.XLSX.utils.sheet_to_json(ws, { header: 1, defval: '', raw: false });
  if (!rawRows.length) return [];

  const headerRow = rawRows[0].map((v) => toText(v));
  const normalizedHeaders = headerRow.map(normalizeKey);
  const headerKeywords = [
    'file no', 'file_no', 'file number', 'name of the apartment', 'name of apartment', 'address', 'date', 'reason', 'complainer details', 'complainer', 'complainant', 'registered ccu file no', 'ccu file no', 'remarks', 'status', 'category', 'registered ccu file no', 'registered_ccu_file_no', 'remarks', 'registered ccu file no'
  ];

  const hasKnownHeader = normalizedHeaders.some((value) => headerKeywords.includes(value));
  if (hasKnownHeader) {
    return rawRows.slice(1).map((row) => {
      const obj = {};
      row.forEach((cell, index) => {
        const key = normalizeKey(headerRow[index]) || `__col_${index}`;
        obj[key] = cell;
      });
      return obj;
    });
  }

  return rawRows.map((row) => buildRowObjectFromArray(row)).filter(Boolean);
}

function calculateDaysElapsed(dateStr) {
  if (!dateStr) return 0;
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return 0;
    return Math.max(0, Math.floor((new Date() - d) / (1000 * 60 * 60 * 24)));
  } catch (e) {
    return 0;
  }
}

function isOverduePending(r) {
  return String(r?.status || '').trim().toLowerCase() === 'pending' && calculateDaysElapsed(r?.date) > 15;
}

function toBackendRecordFromExcelRow(row) {
  let file_no = toText(getCell(row, 'File No', 'file_no', 'FILE NO', 'File No.', 'File Number'));
  const name_of_apartment = toText(getCell(row, 'Name of the Apartment', 'name_of_apartment', 'Apartment', 'NAME OF APARTMENT'));
  const address = toText(getCell(row, 'Address', 'address', 'ADDRESS'));
  const date = normalizeExcelDate(getCell(row, 'Date', 'date', 'DATE'));
  const reason = toText(getCell(row, 'Reason', 'reason', 'REASON'));
  const complainer_details = toText(getCell(row, 'Complainer Details', 'complainer_details', 'Complainer', 'Complainer Details', 'COMPLAINER DETAILS', 'COMPLAINANT'));
  const registered_ccu_file_no = toText(getCell(row, 'Registered CCU File No', 'registered_ccu_file_no', 'CCU File No', 'REGISTERED CCU FILE NO'));
  let remarks = toText(getCell(row, 'Remarks', 'remarks', 'REMARKS', 'Remark'));

  // Parse or infer Category
  let category = toText(getCell(row, 'Category', 'category', 'CATEGORY'));
  if (!category && reason) {
    const reasonLower = reason.toLowerCase();
    if (reasonLower.includes('leak') || reasonLower.includes('sewerage') || reasonLower.includes('plumbing') || reasonLower.includes('water')) {
      category = 'Water Leakage';
    } else if (reasonLower.includes('garbage') || reasonLower.includes('waste') || reasonLower.includes('disposal') || reasonLower.includes('trash')) {
      category = 'Garbage Issues';
    } else if (reasonLower.includes('construction') || reasonLower.includes('unauthorised') || reasonLower.includes('unauthorized') || reasonLower.includes('renovation')) {
      category = 'Unauthorised Construction';
    } else if (reasonLower.includes('elevator') || reasonLower.includes('lift') || reasonLower.includes('maintenance') || reasonLower.includes('common area') || reasonLower.includes('corridor') || reasonLower.includes('lobby')) {
      category = 'Common area issue';
    } else if (reasonLower.includes('agm') || reasonLower.includes('council') || reasonLower.includes('committee') || reasonLower.includes('meeting') || reasonLower.includes('election')) {
      category = 'Council Issues';
    } else if (reasonLower.includes('accounts') || reasonLower.includes('finance') || reasonLower.includes('audit') || reasonLower.includes('payment') || reasonLower.includes('non payment')) {
      category = 'Accounts related Issues';
    } else if (reasonLower.includes('parking')) {
      category = 'Parking Issues (Unit Owners)';
    } else if (reasonLower.includes('pet') || reasonLower.includes('dog') || reasonLower.includes('cat')) {
      category = 'Pet Keeping';
    } else if (reasonLower.includes('boundary') || reasonLower.includes('land') || reasonLower.includes('wall')) {
      category = 'Boundry Issues';
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
    'in progress': 'Open',
    inprogress: 'Open',
  };

  let status = 'New';
  if (normalizedStatus && statusMap[normalizedStatus]) {
    status = statusMap[normalizedStatus];
  } else if (remarks) {
    const remLower = remarks.toLowerCase();
    if (remLower.includes('resolved') || remLower.includes('conducted') || remLower.includes('completed') || remLower.includes('settled') || remLower.includes('closed') || remLower.includes('solved') || remLower.includes('done')) {
      status = 'Closed';
    } else if (remLower.includes('pending') || remLower.includes('waiting') || remLower.includes('defer') || remLower.includes('delay')) {
      status = 'Pending';
    } else if (remLower.includes('scheduled') || remLower.includes('issued') || remLower.includes('warned') || remLower.includes('progress') || remLower.includes('ongoing') || remLower.includes('inspection') || remLower.includes('investigating')) {
      status = 'Open';
    }
  }

  // If file_no missing, try to locate it elsewhere in the row values using heuristics
  if (!file_no) {
    const vals = Object.values(row || {}).map((v) => toText(v)).filter(Boolean);
    for (const v of vals) {
      const cand = String(v).trim();
      if (/\bCF[- ]?\d{2,6}[- ]?\d{1,6}\b/i.test(cand) || /\bCCU[- ]?\d{2,6}[- ]?\d{1,6}\b/i.test(cand)) {
        file_no = cand;
        break;
      }
    }
    // broader fallback: any token with letter(s)-digits pattern
    if (!file_no) {
      for (const v of vals) {
        const cand = String(v).trim();
        if (/[A-Za-z]{1,4}[- ]?\d{2,8}[- ]?\d{1,6}/.test(cand)) {
          file_no = cand;
          break;
        }
      }
    }
  }

  // Fallback: if `file_no` missing, use `registered_ccu_file_no` when available
  if (!file_no && registered_ccu_file_no) file_no = registered_ccu_file_no;

  // Final fallback: generate a unique placeholder so import doesn't skip the row
  if (!file_no) {
    file_no = `IMPORT-${new Date().toISOString().replace(/[^0-9]/g, '')}-${Math.floor(Math.random() * 9000) + 1000}`;
    remarks = remarks ? `${remarks} | generated_file_no:${file_no}` : `generated_file_no:${file_no}`;
    console.warn('Generated placeholder file_no for row', { file_no, row });
  }

  return {
    file_no,
    name_of_apartment,
    address,
    date,
    reason,
    complainer_details,
    registered_ccu_file_no,
    remarks,
    category,
    title: name_of_apartment,
    status,
  };
}

const overlayStyle = {
  position: 'fixed',
  inset: 0,
  background: 'rgba(0,0,0,.5)',
  zIndex: 1000,
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
  borderBottom: `1px solid ${theme.border}`,
  paddingBottom: 6,
  marginTop: 8,
};

function SectionLabel({ children }) {
  return <div style={sectionLabelStyle}>{children}</div>;
}

function FormField({ label, value, onChange, type = 'text', placeholder, rows, children }) {
  const inputId = 'cfile_form_' + String(label || '').toLowerCase().replace(/[^a-z0-9]/g, '_').replace(/_+/g, '_').replace(/^_+|_+$/g, '');
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

function ViewRow({ label, value }) {
  return (
    <div style={{ display: 'flex', borderBottom: `1px solid ${theme.border}`, padding: '9px 4px', fontSize: 13, alignItems: 'flex-start' }}>
      <div style={{ width: 200, color: theme.text2, fontWeight: 600, flexShrink: 0 }}>{label}</div>
      <div style={{ color: theme.text, wordBreak: 'break-word', flex: 1 }}>{value == null || String(value).trim() === '' ? '—' : value}</div>
    </div>
  );
}

function FormModal({ isOpen, onClose, onSave, initialData = null }) {
  const [form, setForm] = useState(initialData || {
    file_no: '',
    name_of_apartment: '',
    address: '',
    date: '',
    reason: '',
    complainer_details: '',
    registered_ccu_file_no: '',
    remarks: '',
    category: '',
    status: 'New',
  });

  useEffect(() => {
    if (initialData) setForm(initialData);
  }, [initialData]);

  if (!isOpen) return null;

  const setField = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  return (
    <div style={overlayStyle} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div style={{ ...modalStyle, display: 'flex', flexDirection: 'column', maxHeight: '90vh' }}>
        <div style={modalHeader}>
          <span style={{ fontSize: 16, fontWeight: 700 }}>{initialData ? 'Edit C-File' : 'Add New C-File'}</span>
          <button onClick={onClose} style={closeBtnStyle}>✕</button>
        </div>

        <div style={{ padding: '0 22px', borderBottom: `1px solid ${theme.border}`, display: 'flex', background: theme.bg || '#fff', position: 'sticky', top: 0, zIndex: 10, justifyContent: 'flex-end' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 0' }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: theme.text2 }}>Status:</span>
            <select
              value={form.status || 'New'}
              onChange={e => setField('status', e.target.value)}
              style={{ width: 130, padding: '5px 10px', borderRadius: 6, border: `1px solid ${theme.border}`, background: '#fff', outline: 'none', fontSize: 13, fontWeight: 700, color: STATUS_COLORS[form.status] || theme.text, cursor: 'pointer' }}
            >
              {STATUS_OPTIONS.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
        </div>

        <div style={{ padding: 22, display: 'flex', flexDirection: 'column', gap: 18, overflowY: 'auto', flex: 1 }}>
          <SectionLabel>File Information</SectionLabel>
          <FormField label="File No *" value={form.file_no} onChange={(v) => setField('file_no', v)} placeholder="e.g. CF-2026-001" />
          <FormField label="Date" type="date" value={form.date} onChange={(v) => setField('date', v)} />
          <FormField label="Category">
            <select
              value={form.category}
              onChange={(e) => setField('category', e.target.value)}
              style={inputStyle}
            >
              <option value="">— Select Category —</option>
              {Object.entries(CATEGORIES_BY_SECTION).map(([section, cats]) => (
                <optgroup key={section} label={section}>
                  {cats.map((cat) => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </optgroup>
              ))}
            </select>
          </FormField>
          <FormField label="Registered CCU File No" value={form.registered_ccu_file_no} onChange={(v) => setField('registered_ccu_file_no', v)} placeholder="e.g. CCU-2026-001" />

          <SectionLabel>Apartment & Complainer Details</SectionLabel>
          <FormField label="Name of Apartment" value={form.name_of_apartment} onChange={(v) => setField('name_of_apartment', v)} placeholder="e.g. Building A, Unit 05" />
          <FormField label="Address" value={form.address} onChange={(v) => setField('address', v)} placeholder="e.g. 123 Main Street, Colombo 03" />
          <FormField label="Complainer Details" value={form.complainer_details} onChange={(v) => setField('complainer_details', v)} placeholder="Name, Contact, Email" />

          <SectionLabel>C-File Details</SectionLabel>
          <FormField label="Reason" type="textarea" value={form.reason} onChange={(v) => setField('reason', v)} placeholder="Describe the complaint reason…" rows={4} />
          <FormField label="Remarks" type="textarea" value={form.remarks} onChange={(v) => setField('remarks', v)} placeholder="Additional remarks…" rows={3} />

          <div style={{ padding: '12px 14px', background: `${theme.blue}08`, border: `1px dashed ${theme.blue}40`, borderRadius: 8 }}>
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
          <button onClick={() => onSave(form)} style={btnPrimary}><i className="fas fa-save" /> Save</button>
        </div>
      </div>
    </div>
  );
}

function ViewModal({ isOpen, onClose, record = null, onEdit, onDelete }) {
  if (!isOpen || !record) return null;

  const daysElapsed = calculateDaysElapsed(record.date);
  const isPending = isOverduePending(record);

  return (
    <div style={overlayStyle} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div style={{ ...modalStyle, maxWidth: 680, display: 'flex', flexDirection: 'column', maxHeight: '90vh' }}>
        <div style={modalHeader}>
          <div>
            <span style={{ fontSize: 16, fontWeight: 700, color: theme.text }}>C-File Details</span>
            <div style={{ fontSize: 12, color: theme.text3, marginTop: 3 }}>{record.file_no}</div>
          </div>
          <button onClick={onClose} style={closeBtnStyle}>✕</button>
        </div>

        <div style={{ padding: 22, overflowY: 'auto', flex: 1 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: theme.navy, textTransform: 'uppercase', letterSpacing: '1px', borderBottom: `1px solid ${theme.border}`, paddingBottom: 6, marginBottom: 12 }}>File Information</div>
          <ViewRow label="File No" value={record.file_no} />
          <ViewRow label="Status" value={
            <span style={{
              display: 'inline-block',
              padding: '2px 10px',
              borderRadius: 999,
              background: `${STATUS_COLORS[record.status] || theme.blue}20`,
              color: STATUS_COLORS[record.status] || theme.blue,
              fontSize: 12,
              fontWeight: 600,
            }}>
              {record.status}
            </span>
          } />
          <ViewRow label="Date" value={`${formatDisplayDate(record.date)}${daysElapsed !== null ? ` (${daysElapsed} days elapsed${isPending ? ' — PENDING' : ''})` : ''}`} />
          <ViewRow label="Category" value={record.category} />
          <ViewRow label="CCU File No" value={record.registered_ccu_file_no} />

          <div style={{ fontSize: 12, fontWeight: 700, color: theme.navy, textTransform: 'uppercase', letterSpacing: '1px', borderBottom: `1px solid ${theme.border}`, paddingBottom: 6, marginBottom: 12, marginTop: 20 }}>Apartment & Complainer Details</div>
          <ViewRow label="Apartment Name" value={record.name_of_apartment} />
          <ViewRow label="Address" value={record.address} />
          <ViewRow label="Complainer Details" value={record.complainer_details} />

          <div style={{ fontSize: 12, fontWeight: 700, color: theme.navy, textTransform: 'uppercase', letterSpacing: '1px', borderBottom: `1px solid ${theme.border}`, paddingBottom: 6, marginBottom: 12, marginTop: 20 }}>C-File Details</div>
          <ViewRow label="Reason" value={record.reason} />
          <ViewRow label="Remarks" value={record.remarks} />
          <ViewRow label="Attached Document" value={record.document_path ? (
            <a
              href={`${(import.meta.env.VITE_API_URL ?? '/api').trim().replace(/\/api\/?$/, '')}/${record.document_path}`}
              target="_blank"
              rel="noreferrer"
              style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 10px', background: `${theme.blue}10`, color: theme.blue, borderRadius: 6, textDecoration: 'none', fontWeight: 500, fontSize: 13 }}
            >
              <i className="fas fa-file-download" /> {record.document_name || 'Download / View Document'}
            </a>
          ) : 'No document attached'} />

          <div style={{ fontSize: 12, fontWeight: 700, color: theme.navy, textTransform: 'uppercase', letterSpacing: '1px', borderBottom: `1px solid ${theme.border}`, paddingBottom: 6, marginBottom: 12, marginTop: 20 }}>Audit</div>
          <ViewRow label="Created At" value={record.created_at} />
          <ViewRow label="Updated At" value={record.updated_at} />
        </div>

        <div style={{ padding: '14px 22px', borderTop: `1px solid ${theme.border}`, display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
          <button
            onClick={() => {
              onDelete(record.id);
              onClose();
            }}
            style={{ ...btnOutline, cursor: 'pointer', color: theme.red, borderColor: theme.red }}
          >
            <i className="fas fa-trash" /> Delete
          </button>
          <button
            onClick={() => {
              onEdit(record);
              onClose();
            }}
            style={{ ...btnPrimary, cursor: 'pointer' }}
          >
            <i className="fas fa-edit" /> Edit
          </button>
          <button
            onClick={onClose}
            style={{ ...btnOutline, cursor: 'pointer' }}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

export default function CFiles({ currentUser }) {
  const auditUserLabel = currentUser?.name && currentUser?.username
    ? `${currentUser.name} (${currentUser.username})`
    : currentUser?.name || currentUser?.username || '';

  const isLegal = String(currentUser?.department || '').trim().toLowerCase() === 'legal';
  const isTechnical = String(currentUser?.department || '').trim().toLowerCase() === 'technical';
  const isDeptUser = isLegal ? 'LEGAL' : isTechnical ? 'TECHNICAL' : null;

  const [cfiles, setCfiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isImporting, setIsImporting] = useState(false);
  const [searchTerm, setSearchTerm] = useState(() => {
    return sessionStorage.getItem('cma_cf_searchTerm') || '';
  });
  const [categoryFilter, setCategoryFilter] = useState(() => {
    return sessionStorage.getItem('cma_cf_categoryFilter') || '';
  });
  const [statusFilter, setStatusFilter] = useState(() => {
    return sessionStorage.getItem('cma_cf_statusFilter') || '';
  });
  const [yearFilter, setYearFilter] = useState(() => {
    return sessionStorage.getItem('cma_cf_yearFilter') || '';
  });
  const [monthFilter, setMonthFilter] = useState(() => {
    return sessionStorage.getItem('cma_cf_monthFilter') || '';
  });
  const [page, setPage] = useState(1);
  const pageSizeDefault = 20;
  const [viewAll, setViewAll] = useState(() => {
    return sessionStorage.getItem('cma_cf_viewAll') === 'true';
  });
  const [isZoomed, setIsZoomed] = useState(() => {
    return sessionStorage.getItem('cma_cf_isZoomed') === 'true';
  });
  const [showOnlyPending, setShowOnlyPending] = useState(() => {
    return sessionStorage.getItem('cma_cf_showOnlyPending') === 'true';
  });
  const [showPendingPanel, setShowPendingPanel] = useState(() => {
    return sessionStorage.getItem('cma_cf_showPendingPanel') === 'true';
  });

  useEffect(() => {
    try {
      sessionStorage.setItem('cma_cf_searchTerm', searchTerm);
      sessionStorage.setItem('cma_cf_categoryFilter', categoryFilter);
      sessionStorage.setItem('cma_cf_statusFilter', statusFilter);
      sessionStorage.setItem('cma_cf_yearFilter', yearFilter);
      sessionStorage.setItem('cma_cf_monthFilter', monthFilter);
      sessionStorage.setItem('cma_cf_viewAll', String(viewAll));
      sessionStorage.setItem('cma_cf_isZoomed', String(isZoomed));
      sessionStorage.setItem('cma_cf_showOnlyPending', String(showOnlyPending));
      sessionStorage.setItem('cma_cf_showPendingPanel', String(showPendingPanel));
    } catch (e) { }
  }, [searchTerm, categoryFilter, statusFilter, yearFilter, monthFilter, viewAll, isZoomed, showOnlyPending, showPendingPanel]);

  const [overdueList, setOverdueList] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [toast, setToast] = useState(null);
  const [showFormModal, setShowFormModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [selectedHistoryRecord, setSelectedHistoryRecord] = useState(null);
  const [editingRecord, setEditingRecord] = useState(null);
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [showCloseModal, setShowCloseModal] = useState(false);
  const [actionRecord, setActionRecord] = useState(null);
  const [lastImportedFileNos, setLastImportedFileNos] = useState([]);
  const [showExportModal, setShowExportModal] = useState(false);
  const [exporting, setExporting] = useState(false);
  const confirm = useConfirmDialog();

  const pageSize = viewAll ? 999999 : pageSizeDefault;
  const maxPage = Math.max(1, Math.ceil(totalCount / pageSize));

  async function load() {
    setLoading(true);
    try {
      const API_BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:3001/api';
      const params = new URLSearchParams({
        limit: showOnlyPending ? 999999 : pageSize,
        page: showOnlyPending ? 1 : page,
      });
      if (showOnlyPending) {
        params.append('pending_overdue_15', 'true');
      } else {
        if (searchTerm?.trim()) params.append('q', searchTerm.trim());
        if (categoryFilter?.trim()) params.append('category', categoryFilter.trim());
        if (statusFilter) params.append('status', statusFilter);
        if (yearFilter) params.append('year', yearFilter);
        if (monthFilter) params.append('month', monthFilter);
      }
      if (isDeptUser) params.append('department', isDeptUser);

      const r = await fetch(`${API_BASE}/cfiles?${params.toString()}`);
      const data = await r.json();
      setCfiles(data?.rows ?? []);
      setTotalCount(data?.total ?? 0);
    } catch (err) {
      showToast('Failed to load C-Files', 'error');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    setPage(1);
  }, [searchTerm, categoryFilter, statusFilter, yearFilter, monthFilter, viewAll]);

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, searchTerm, categoryFilter, statusFilter, yearFilter, monthFilter, viewAll]);

  // Debug: verify filter values coming from the UI

  useEffect(() => {
    async function loadOverdue() {
      try {
        const API_BASE = (import.meta.env.VITE_API_URL || '/api').trim();
        const r = await fetch(`${API_BASE}/cfiles?pending_overdue_15=true&limit=999999`);
        const data = await r.json();
        setOverdueList(data?.rows ?? data ?? []);
      } catch (err) {
        console.error('Failed to load overdue list', err);
      }
    }
    loadOverdue();
  }, [cfiles]);

  function showToast(msg, type = 'success') {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 2500);
  }

  async function handleSaveRecord(record) {
    try {
      const API_BASE = (import.meta.env.VITE_API_URL || '/api').trim();
      let targetId = editingRecord?.id;

      if (editingRecord) {
        const r = await fetch(`${API_BASE}/cfiles/${editingRecord.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...record,
            ...(editingRecord ? { created_by: auditUserLabel, modified_by: auditUserLabel } : { modified_by: auditUserLabel }),
          }),
        });
        if (!r.ok) throw new Error('Failed to update');
      } else {
        const r = await fetch(`${API_BASE}/cfiles`, {
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
        await fetch(`${API_BASE}/cfiles/${editingRecord.id}/document`, {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ user_name: auditUserLabel })
        });
      }

      if (record.fileObj && targetId) {
        const formData = new FormData();
        formData.append('document', record.fileObj);
        formData.append('uploaded_by', auditUserLabel || 'System');
        const uploadRes = await fetch(`${API_BASE}/cfiles/${targetId}/upload`, {
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
      title: 'Delete C-File',
      message: 'Delete this C-File permanently? This action cannot be undone.',
      confirmLabel: 'Delete',
      cancelLabel: 'Cancel',
    });
    if (!confirmed) return;
    try {
      const API_BASE = (import.meta.env.VITE_API_URL || '/api').trim();
      const r = await fetch(`${API_BASE}/cfiles/${id}`, { method: 'DELETE' });
      if (!r.ok) throw new Error('Failed to delete');
      showToast('Deleted ✅');
      load();
    } catch (err) {
      showToast(err.message || 'Delete failed', 'error');
    }
  }

  async function handleTransfer(department) {
    try {
      const API_BASE = (import.meta.env.VITE_API_URL || '/api').trim();
      const r = await fetch(`${API_BASE}/cfiles/${actionRecord.id}/transfer`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          assigned_department: department, 
          user_name: auditUserLabel,
          from_department: currentUser?.department || 'ADMIN' 
        }),
      });
      if (!r.ok) throw new Error('Failed to transfer');

      if (department !== 'CCU') {
        fetch(`${API_BASE}/notifications`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'info',
            title: 'C-File Transferred',
            message: `C-File ${actionRecord.file_no || ''} has been transferred to your department by ${auditUserLabel}.`,
            target_role: department,
            link: `cfiles:${actionRecord.id}`
          })
        }).catch(() => {});
      }

      showToast(department === 'CCU' ? 'Returned to CCU (Admin) ✅' : `Transferred to ${department} ✅`);
      setShowTransferModal(false);
      setActionRecord(null);
      load();
    } catch (err) {
      showToast(err.message || 'Transfer failed', 'error');
    }
  }

  async function handleCloseCase(reason, fileObj) {
    try {
      const API_BASE = (import.meta.env.VITE_API_URL || '/api').trim();
      const formData = new FormData();
      formData.append('closed_reason', reason);
      formData.append('closed_department', isDeptUser || 'ADMIN');
      formData.append('user_name', auditUserLabel);
      if (fileObj) {
        formData.append('document', fileObj);
      }

      const r = await fetch(`${API_BASE}/cfiles/${actionRecord.id}/close`, {
        method: 'PUT',
        body: formData,
      });
      if (!r.ok) throw new Error('Failed to close');
      showToast('C-File Closed ✅');
      setShowCloseModal(false);
      setActionRecord(null);
      load();
    } catch (err) {
      showToast(err.message || 'Close failed', 'error');
    }
  }

  async function handleDeleteImported() {
    if (!lastImportedFileNos || !lastImportedFileNos.length) return showToast('No imported batch to delete', 'error');
    const confirmed = await confirm({
      title: 'Delete imported records',
      message: `Delete ${lastImportedFileNos.length} imported records? This cannot be undone.`,
      confirmLabel: 'Delete',
      cancelLabel: 'Cancel',
    });
    if (!confirmed) return;
    try {
      const API_BASE = (import.meta.env.VITE_API_URL || '/api').trim();
      const r = await fetch(`${API_BASE}/cfiles/bulk-delete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ file_nos: lastImportedFileNos }),
      });
      const res = await r.json();
      if (!r.ok) throw new Error(res.error || 'Delete failed');
      showToast(`Deleted ${res.deleted} records ✅`);
      setLastImportedFileNos([]);
      load();
    } catch (err) {
      showToast(err.message || 'Delete failed', 'error');
    }
  }

  async function handleDeleteAll() {
    const confirmed = await confirm({
      title: 'Delete all C-Files',
      message: 'Delete ALL C-File records? This cannot be undone.',
      confirmLabel: 'Delete all',
      cancelLabel: 'Cancel',
    });
    if (!confirmed) return;
    try {
      const API_BASE = (import.meta.env.VITE_API_URL || '/api').trim();
      const r = await fetch(`${API_BASE}/cfiles`, { method: 'DELETE' });
      const res = await r.json();
      if (!r.ok) throw new Error(res.error || 'Delete all failed');
      showToast(`Deleted all C-Files ✅`);
      setLastImportedFileNos([]);
      load();
    } catch (err) {
      showToast(err.message || 'Delete all failed', 'error');
    }
  }

  async function handleExport(format, selectedFields = null) {
    try {
      setExporting(true);
      showToast('Preparing export...');

      const API_BASE = (import.meta.env.VITE_API_URL || '/api').trim();
      const response = await fetch(`${API_BASE}/cfiles?limit=999999`);
      const result = await response.json();
      const allCfiles = result.rows || result || [];

      let rows = (allCfiles || []).map((r) => ({
        'File No': r.file_no ?? '',
        'Name of the Apartment': r.name_of_apartment ?? '',
        'Address': r.address ?? '',
        'Date': r.date ?? '',
        'Reason': r.reason ?? '',
        'Complainer Details': r.complainer_details ?? '',
        'Registered CCU File No': r.registered_ccu_file_no ?? '',
        'Title': r.title ?? '',
        'File Type': r.file_type ?? '',
        'Category': r.category ?? '',
        'Remarks': r.remarks ?? '',
        'Status': r.status ?? '',
        'Created By': r.created_by ?? '',
        'Modified By': r.modified_by ?? '',
        'Created At': r.created_at ?? '',
        'Updated At': r.updated_at ?? '',
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
        exportToPdfPrint('C-Files Records', rows);
        setShowExportModal(false);
        showToast('PDF print dialog opened ✅');
        return;
      }

      if (typeof window.XLSX === 'undefined') return showToast('XLSX library not loaded', 'error');
      const ws = window.XLSX.utils.json_to_sheet(rows);
      const wb = window.XLSX.utils.book_new();
      window.XLSX.utils.book_append_sheet(wb, ws, 'C-Files');
      window.XLSX.writeFile(wb, `CMA_CFiles_${new Date().toISOString().split('T')[0]}.xlsx`);
      setShowExportModal(false);
      showToast('Exported ✅');
    } catch (err) {
      showToast(err.message || 'Export failed', 'error');
    } finally {
      setExporting(false);
    }
  }

  const exportExcel = () => handleExport('excel');

  async function importExcel(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (typeof window.XLSX === 'undefined') return showToast('XLSX library not loaded', 'error');
    try {
      setIsImporting(true);
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
      if (!allRows.length) return showToast('No data found in sheets', 'error');

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
      const r = await fetch(`${API_BASE}/cfiles/bulk`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(records),
      });
      const result = await r.json();
      if (!r.ok) throw new Error(result.error || 'Import failed');
      showToast(`Imported ${records.length} records ✅`);
      // remember imported file numbers so user can delete that batch if needed
      setLastImportedFileNos(records.map((x) => x.file_no));
      load();

      if (errors.length > 0) {
        console.warn(`Import succeeded but ${errors.length} rows had issues:`, errors);
      }
    } catch (err) {
      showToast(err.message || 'Import failed', 'error');
      console.error('Import error:', err);
    } finally {
      setIsImporting(false);
      e.target.value = '';
    }
  }

  const stats = useMemo(() => {
    const pending = overdueList.length;
    const categories = new Set(cfiles.map((r) => r.category).filter(Boolean));
    const byStatus = {};
    cfiles.forEach((r) => {
      byStatus[r.status] = (byStatus[r.status] || 0) + 1;
    });
    return { pending, totalCategories: categories.size, byStatus };
  }, [cfiles]);

  return (
    <div style={{ padding: 24, fontFamily: "var(--font-sans)", background: theme.bg, minHeight: '100vh' }}>
      {/* Breadcrumb */}
      <div style={{ fontSize: 12, color: '#999', marginBottom: 16 }}>
        <span>Home</span> / <span>C-Files Management</span>
      </div>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 10 }}>
        <div>
          <h2 style={{ fontSize: 19, fontWeight: 600, margin: 0, color: theme.text }}>C-Files Management</h2>
          <p style={{ color: '#999', fontSize: 13, margin: '4px 0 0 0' }}>Complaint File records tracking and management</p>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          <button onClick={() => setShowExportModal(true)} style={btnOutline}><i className="fas fa-file-export" /> Export</button>
          <label style={{ ...btnOutline, cursor: 'pointer', margin: 0 }}>
            <i className="fas fa-download" /> Import
            <input type="file" accept=".xlsx,.xls" style={{ display: 'none' }} onChange={importExcel} />
          </label>
          <button onClick={handleDeleteAll} style={{ ...btnOutline, color: theme.red, borderColor: theme.red }} title="Delete all C-Files">
            <i className="fas fa-trash" /> Delete All
          </button>
          {lastImportedFileNos && lastImportedFileNos.length > 0 && (
            <button onClick={handleDeleteImported} style={{ ...btnOutline, color: theme.red, borderColor: theme.red }} title="Delete imported batch">
              <i className="fas fa-trash" /> Delete Imported
            </button>
          )}
          {/* Pending Reminder Bell (Exact match to MCManagement AGM design) */}
          <div style={{ position: 'relative' }}>
            <button
              onClick={() => setShowPendingPanel((v) => !v)}
              className="mc-btn-outline"
              style={{ position: 'relative', ...btnOutline }}
              title="Pending reminders - files pending for more than 15 days"
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
                      const nextVal = !showOnlyPending;
                      setShowOnlyPending(nextVal);
                      if (nextVal) {
                        setViewAll(true);
                      } else {
                        setViewAll(false);
                      }
                      setShowPendingPanel(false);
                    }}
                    style={{ width: '100%', justifyContent: 'center', ...(showOnlyPending ? { background: '#ef4444', color: '#fff', border: 'none', padding: '8px 14px', borderRadius: 8, fontSize: 13, fontWeight: 500, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6 } : { ...btnPrimary, width: '100%', justifyContent: 'center' }) }}
                  >
                    <i className={showOnlyPending ? "fas fa-times" : "fas fa-filter"} />
                    {showOnlyPending ? 'Clear Table Filter' : 'Filter & View All in Table'}
                  </button>
                </div>
                {stats.pending === 0 ? (
                  <div style={{ padding: 14, fontSize: 12, color: theme.text3 }}>No pending items.</div>
                ) : overdueList.map((cf) => {
                  const days = calculateDaysElapsed(cf.date);
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
                          <span style={{ fontSize: 12.5, fontWeight: 600, color: theme.text }}>{cf.file_no}</span>
                          <span style={{ padding: '1px 6px', borderRadius: 999, background: '#fee2e2', color: '#ef4444', fontSize: 10, fontWeight: 700 }}>{days} days</span>
                        </div>
                        <div style={{ fontSize: 11, color: theme.text2, marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          <strong>Reason:</strong> {cf.reason || '—'}
                        </div>
                        <div style={{ fontSize: 10.5, color: theme.text3, marginTop: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {cf.name_of_apartment || '—'}
                        </div>
                      </div>
                      <i className="fas fa-chevron-right" style={{ fontSize: 11, color: theme.text3, marginLeft: 8 }} />
                    </div>
                  );
                })}
              </div>
            )}
          </div>
          <button onClick={() => { setEditingRecord(null); setShowFormModal(true); }} style={btnPrimary}>
            <i className="fas fa-plus" /> Add C-File
          </button>
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

      {/* Table Card */}
      <div className={`cma-table-card-container ${isZoomed ? 'table-fullscreen-mode' : ''}`} style={{ background: theme.card, borderRadius: 12, border: `1px solid ${theme.border}`, boxShadow: '0 2px 12px rgba(0,0,0,.07)', overflow: 'hidden' }}>

        {/* Filters */}
        <div style={{ padding: '10px 14px', borderBottom: `1px solid ${theme.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: theme.text, whiteSpace: 'nowrap', marginRight: 4 }}>C-File Records</div>
          <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap', flex: '1 1 auto', justifyContent: 'flex-end' }}>
            <div style={{ position: 'relative', flex: '1 1 180px', maxWidth: 260 }}>
              <i className="fas fa-search" style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#999', fontSize: 12 }}></i>
              <input
                id="cfile_search_input"
                name="cfile_search_input"
                aria-label="Search C Files"
                type="text"
                placeholder="Search…"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{ padding: '5px 8px 5px 28px', height: 30, borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 12, width: '100%', outline: 'none', transition: 'border-color 0.2s', boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.02)' }}
                onFocus={(e) => e.target.style.borderColor = '#3b82f6'}
                onBlur={(e) => e.target.style.borderColor = '#cbd5e1'}
              />
            </div>
            <select
              id="cfile_category_filter"
              name="cfile_category_filter"
              aria-label="Filter Category"
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              style={{ padding: '5px 8px', height: 30, borderRadius: 4, border: '1px solid #ddd', fontSize: 12, width: 150 }}
            >
              <option value="">All Categories</option>
              {Object.entries(CATEGORIES_BY_SECTION).map(([section, cats]) => (
                <optgroup key={section} label={section}>
                  {cats.map((cat) => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </optgroup>
              ))}
            </select>
            <select
              id="cfile_status_filter"
              name="cfile_status_filter"
              aria-label="Filter Status"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              style={{ padding: '5px 8px', height: 30, borderRadius: 4, border: '1px solid #ddd', fontSize: 12, width: 120 }}
            >
              <option value="">All Status</option>
              {STATUS_OPTIONS.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
            <select
              id="cfile_year_filter"
              name="cfile_year_filter"
              aria-label="Filter Year"
              value={yearFilter}
              onChange={(e) => setYearFilter(e.target.value)}
              style={{ padding: '5px 8px', height: 30, borderRadius: 4, border: '1px solid #ddd', fontSize: 12, width: 85 }}
            >
              <option value="">All Years</option>
              {getYearFilterOptions().map((y) => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
            <select
              id="cfile_month_filter"
              name="cfile_month_filter"
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
          </div>
        </div>

        {/* Pagination */}
        <div style={{ padding: '12px 18px', borderBottom: `1px solid ${theme.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <div style={{ fontSize: 13, color: theme.text2 }}>
            {showOnlyPending ? (
              <span>Showing <strong>{cfiles.filter(isOverduePending).length}</strong> pending records (&gt;15 days) <button onClick={() => { setShowOnlyPending(false); setViewAll(false); }} style={{ background: '#fee2e2', color: '#ef4444', border: '1px solid #fca5a5', padding: '2px 8px', borderRadius: 12, fontSize: 11, fontWeight: 700, cursor: 'pointer', marginLeft: 6 }}>✕ Clear</button></span>
            ) : viewAll ? (
              <span>Showing <strong>all {cfiles.length}</strong> records</span>
            ) : (
              <span>Showing <strong>{loading ? 0 : cfiles.length}</strong> of <strong>{totalCount}</strong></span>
            )}
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            {!viewAll && (
              <>
                <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}
                  style={page === 1 ? { ...btnOutline, opacity: 0.5, cursor: 'not-allowed' } : btnOutline}>◀ Prev</button>
                <span style={{ fontSize: 13, color: theme.text3 }}>Page <strong style={{ color: theme.text }}>{page}</strong> / {maxPage}</span>
                <button onClick={() => setPage((p) => Math.min(maxPage, p + 1))} disabled={page >= maxPage}
                  style={page >= maxPage ? { ...btnOutline, opacity: 0.5, cursor: 'not-allowed' } : btnOutline}>Next ▶</button>
              </>
            )}
            {/* VIEW ALL TOGGLE BUTTON IN PAGINATION */}
            <button
              onClick={() => setViewAll(v => !v)}
              className="mc-btn-base"
              style={viewAll ? { background: '#10b981', color: '#ffffff', border: 'none', padding: '5px 12px', fontSize: 12, marginRight: 8 } : { background: '#f1f5f9', color: '#334155', border: '1px solid #cbd5e1', padding: '5px 12px', fontSize: 12, marginRight: 8 }}
              title="Toggle between showing all records and paginated view"
            >
              <i className={loading && viewAll ? 'fas fa-spinner fa-spin' : viewAll ? 'fas fa-check-circle' : 'fas fa-list'} style={{ marginRight: 5 }} />
              {loading && viewAll ? 'Loading All…' : viewAll ? 'Showing All Records (View Paging)' : 'View All Records'}
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

        {/* Table */}
        <div className="mc-table-wrapper" style={{ overflowX: 'auto', maxHeight: 'calc(100vh - 380px)', minHeight: '200px', overflowY: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12, tableLayout: 'fixed', minWidth: 2600 }}>
            <thead>
              <tr>
                {Object.keys(COL_WIDTHS).map((label) => (
                  <th key={label} className={label === 'ACTIONS' ? 'mc-th-actions' : label === 'STATUS' ? 'mc-th-status' : ''} style={label === 'ACTIONS' ? { ...thActionsStyle, width: COL_WIDTHS[label] } : label === 'STATUS' ? { ...thStatusStyle, width: COL_WIDTHS[label] } : { ...thStyle, width: COL_WIDTHS[label] }}>
                    {label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={10} style={{ padding: 24, textAlign: 'center', color: theme.text3 }}>Loading…</td></tr>
              ) : (showOnlyPending ? cfiles.filter(isOverduePending) : cfiles).length === 0 ? (
                <tr><td colSpan={10} style={{ padding: 24, textAlign: 'center', color: theme.text3 }}>No matching records found</td></tr>
              ) : (
                (showOnlyPending ? cfiles.filter(isOverduePending) : cfiles).map((cf) => {
                  const days = calculateDaysElapsed(cf.date);
                  const isPending = isOverduePending(cf);
                  return (
                    <tr
                      key={cf.id}
                      onClick={() => { setSelectedRecord(cf); setShowViewModal(true); }}
                      style={{
                        borderBottom: `1px solid ${theme.border}`,
                        background: isPending ? '#fffbeb' : 'transparent',
                        cursor: 'pointer',
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = isPending ? '#fef3c7' : '#f8fafc')}
                      onMouseLeave={(e) => (e.currentTarget.style.background = isPending ? '#fffbeb' : '')}
                    >
                      <td style={{ ...cellStyle, color: isPending ? theme.orange : theme.text, fontWeight: 500 }} title={cf.file_no}>{cf.file_no}</td>
                      <td style={cellStyle} title={cf.name_of_apartment}>{cf.name_of_apartment || '—'}</td>
                      <td style={cellStyle} title={cf.address}>{cf.address || '—'}</td>
                      <td style={cellStyle} title={formatDisplayDate(cf.date)}>{formatDisplayDate(cf.date)}</td>
                      <td style={cellStyle} title={cf.reason}>{cf.reason || '—'}</td>
                      <td style={cellStyle} title={cf.complainer_details}>{cf.complainer_details || '—'}</td>
                      <td style={cellStyle} title={cf.registered_ccu_file_no}>{cf.registered_ccu_file_no || '—'}</td>
                      <td style={cellStyle} title={cf.remarks}>{cf.remarks || '—'}</td>
                      <td className="mc-td-status" style={tdStatusStyle}>
                        <span style={{
                          display: 'inline-block',
                          padding: '3px 9px',
                          borderRadius: 6,
                          background: `${STATUS_COLORS[cf.status] || theme.blue}15`,
                          color: STATUS_COLORS[cf.status] || theme.blue,
                          fontSize: 12,
                          fontWeight: 600,
                        }}>
                          {cf.status === 'Transferred' && cf.assigned_department ? `Transferred to ${cf.assigned_department}` : cf.status}
                        </span>
                      </td>
                      <td className="mc-td-actions" style={tdActionsStyle}>
                        <div style={{ display: 'flex', gap: 2, justifyContent: 'flex-start', alignItems: 'center' }}>
                          <ActionBtn icon="fas fa-eye" color={theme.blue} title="View" onClick={(e) => { e.stopPropagation(); setSelectedRecord(cf); setShowViewModal(true); }} />
                          <ActionBtn icon="fas fa-history" color={theme.text2} title="History" onClick={(e) => { e.stopPropagation(); setSelectedHistoryRecord(cf); setShowHistoryModal(true); }} />
                          <ActionBtn icon="fas fa-edit" color={theme.orange} title="Edit" onClick={(e) => { e.stopPropagation(); setEditingRecord(cf); setShowFormModal(true); }} />
                          <ActionBtn icon="fas fa-trash" color={theme.red} title="Delete" onClick={(e) => { e.stopPropagation(); handleDeleteRecord(cf.id); }} />
                          {cf.status !== 'Closed' && (
                            <ActionBtn icon="fas fa-share" color={theme.blue} title="Transfer" onClick={(e) => { e.stopPropagation(); setActionRecord(cf); setShowTransferModal(true); }} />
                          )}
                          {cf.status !== 'Closed' && (
                            <ActionBtn icon="fas fa-check-circle" color={theme.green} title="Close" onClick={(e) => { e.stopPropagation(); setActionRecord(cf); setShowCloseModal(true); }} />
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
      />

      <HistoryModal
        isOpen={showHistoryModal}
        onClose={() => { setShowHistoryModal(false); setSelectedHistoryRecord(null); }}
        record={selectedHistoryRecord}
        theme={theme}
      />

      <TransferModal
        isOpen={showTransferModal}
        onClose={() => { setShowTransferModal(false); setActionRecord(null); }}
        onSave={handleTransfer}
        record={actionRecord}
        currentUser={currentUser}
      />

      <CloseModal
        isOpen={showCloseModal}
        onClose={() => { setShowCloseModal(false); setActionRecord(null); }}
        onSave={handleCloseCase}
        record={actionRecord}
      />

      {showExportModal && (
        <GenericExportModal
          title="Export C-Files Records"
          subject="C-Files Records"
          exporting={exporting}
          fields={CFILES_EXPORT_FIELDS}
          onClose={() => setShowExportModal(false)}
          onExport={handleExport}
        />
      )}

      {/* Toast */}
      {toast && (
        <div style={{
          position: 'fixed',
          bottom: 20,
          right: 20,
          background: toast.type === 'error' ? theme.red : theme.green,
          color: '#fff',
          padding: '12px 18px',
          borderRadius: 8,
          fontSize: 13,
          fontWeight: 500,
          boxShadow: '0 4px 12px rgba(0,0,0,.15)',
          zIndex: 1000,
        }}>
          {toast.msg}
        </div>
      )}

      {isImporting && (
        <div className="mc-overlay" style={{ zIndex: 10000, background: 'rgba(255,255,255,0.7)', backdropFilter: 'blur(4px)' }}>
          <div style={{ fontSize: 16, fontWeight: 700, color: theme.text }}>Importing Data...</div>
        </div>
      )}
    </div>
  );
}