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

function ActionBtn({ icon, color, title, onClick }) {
  return (
    <button onClick={onClick} title={title} style={{ background: 'none', border: 'none', cursor: 'pointer', color, width: 18, minWidth: 18, height: 20, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, padding: 0, flexShrink: 0 }}>
      <i className={icon} />
    </button>
  );
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

export function calculateDaysElapsed(dateStr) {
  if (!dateStr) return 0;
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return 0;
    return Math.max(0, Math.floor((new Date() - d) / (1000 * 60 * 60 * 24)));
  } catch (e) {
    return 0;
  }
}

export function isOverduePending(r) {
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
          <span style={{ fontSize: 16, fontWeight: 700 }}>Transfer C-File</span>
          <button onClick={onClose} style={closeBtnStyle}>✕</button>
        </div>
        <div style={{ padding: 22 }}>
          <div style={{ marginBottom: 15, fontSize: 13, color: theme.text2 }}>
            Transfer <strong>{record.file_no}</strong> to a department for further action.
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
          <span style={{ fontSize: 16, fontWeight: 700 }}>Close C-File</span>
          <button onClick={onClose} style={closeBtnStyle}>✕</button>
        </div>
        <div style={{ padding: 22, display: 'flex', flexDirection: 'column', gap: 15 }}>
          <div style={{ fontSize: 13, color: theme.text2 }}>
            Closing <strong>{record.file_no}</strong>. Please provide a resolution reason and upload any supporting document.
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
          <button onClick={() => onSave(reason, fileObj)} style={{ ...btnPrimary, background: theme.green, borderColor: theme.green }} disabled={!reason.trim()}>
            <i className="fas fa-check-circle" /> Close Case
          </button>
        </div>
      </div>
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
    } catch (e) { }
  }

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
          {record.status === 'Transferred' && (
            <>
              <ViewRow label="Transferred From" value={transferredFrom} />
              <ViewRow label="Transferred To" value={transferredTo} />
              <ViewRow label="Transferred By" value={transferredBy} />
            </>
          )}
          <ViewRow label="Date" value={`${formatDisplayDate(record.date)}${daysElapsed !== null ? ` (${daysElapsed} days overdue)` : ''}`} />
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
          <ViewRow label="Created At" value={record.created_at ? `${formatDisplayDate(record.created_at)} (By: ${record.created_by || 'System'})` : '—'} />
          <ViewRow label="Updated At" value={record.updated_at ? `${formatDisplayDate(record.updated_at)} (By: ${record.updated_by || record.modified_by || 'System'})` : '—'} />
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
export {
  theme,
  CFILES_EXPORT_FIELDS,
  btnBase,
  btnPrimary,
  btnOutline,
  COL_WIDTHS,
  CATEGORIES_BY_SECTION,
  ALL_CATEGORIES,
  STATUS_OPTIONS,
  STATUS_COLORS,
  parseFlexibleDate,
  formatDisplayDate,
  normalizeKey,
  getCell,
  toText,
  normalizeExcelDate,
  ActionBtn,
  sheetToRowObjects,
  toBackendRecordFromExcelRow,
  TransferModal,
  CloseModal,
  FormModal,
  ViewModal
};
