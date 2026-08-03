import React, { useState, useEffect } from 'react';

// -- Registration Fee Auto-Calc Constants --
export const CATEGORY_RATES = {
  government_low: { label: 'Government (Low Income)', rate: 100 },
  government_middle: { label: 'Government (Middle Income)', rate: 200 },
  private_normal: { label: 'Private (Normal)', rate: 250 },
  private_semi_luxury: { label: 'Private (Semi-Luxury)', rate: 350 },
  private_luxury: { label: 'Private (Luxury)', rate: 500 },
};
export const SSCL_RATE = 0.025; // 2.5%
export const VAT_RATE = 0.18;   // 18%

export const LUXURY_TRIGGER_FIELDS = [
  'fac_accessory_car_parcel',
  'fac_service_lift',
  'fac_penth_house',
  'fac_canteen',
  'fac_super_market',
  'fac_garden',
  'fac_sauna',
  'fac_salon',
  'fac_golf_tennis',
  'fac_day_care',
  'fac_club_house',
  'mgmt_company_controlled',
];
export const SEMI_LUXURY_TRIGGER_FIELDS = ['fac_gym', 'fac_swimming_pool'];
// -- End Constants --

export const theme = {
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

export const btnBase = {
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

export const btnPrimary = { ...btnBase, background: theme.navy, color: '#fff' };
export const btnOutline = { ...btnBase, background: 'transparent', color: theme.text2, border: `1px solid ${theme.border}` };

export const overlayStyle = {
  position: 'fixed',
  inset: 0,
  background: 'rgba(0,0,0,.5)',
  zIndex: 200,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: 20,
};

export const modalStyle = {
  background: '#fff',
  borderRadius: 16,
  width: '100%',
  maxWidth: 860,
  boxShadow: '0 20px 60px rgba(0,0,0,.2)',
  maxHeight: '90vh',
  overflowY: 'auto',
};

export const modalHeader = {
  padding: '18px 22px 14px',
  borderBottom: `1px solid ${theme.border}`,
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
};

export const closeBtnStyle = {
  background: 'none',
  border: 'none',
  cursor: 'pointer',
  fontSize: 18,
  color: theme.text3,
  padding: 2,
  lineHeight: 1,
};

export const inputStyle = {
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

export const sectionLabelStyle = {
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

export const tableWrapperStyle = {
  overflowX: 'auto',
  maxHeight: 'calc(100vh - 350px)',
  minHeight: '200px',
  overflowY: 'auto',
  border: `1px solid ${theme.border}`,
  borderRadius: 10,
  background: '#fff',
};

export const tableStyle = {
  width: '100%',
  borderCollapse: 'separate',
  borderSpacing: 0,
  fontSize: 12,
  fontFamily: "var(--font-sans)",
  tableLayout: 'fixed',
  minWidth: 2215,
};

// Compact cell style - fixed width columns with truncation
export const cellStyle = {
  padding: '8px 10px',
  fontSize: 12,
  fontFamily: "var(--font-sans)",
  lineHeight: 1.4,
  whiteSpace: 'nowrap',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  verticalAlign: 'middle',
};

export const thStyle = {
  textAlign: 'left',
  padding: '10px 10px',
  fontSize: 11,
  fontFamily: "var(--font-sans)",
  fontWeight: 700,
  color: theme.text3,
  textTransform: 'uppercase',
  letterSpacing: '.6px',
  background: '#f8fafc',
  borderBottom: `1px solid ${theme.border}`,
  borderRight: `1px solid ${theme.border}`,
  wordBreak: 'break-word',
  position: 'sticky',
  top: 0,
  zIndex: 20,
  backgroundClip: 'padding-box',
};

export const thActionsStyle = {
  ...thStyle,
  position: 'sticky',
  top: 0,
  right: 0,
  width: 210,
  minWidth: 210,
  maxWidth: 210,
  zIndex: 30,
  background: '#f8fafc',
  borderLeft: '1px solid #cbd5e1',
  boxShadow: 'none',
  backgroundClip: 'padding-box',
};

export const tdActionsStyle = {
  ...cellStyle,
  position: 'sticky',
  right: 0,
  width: 210,
  minWidth: 210,
  maxWidth: 210,
  zIndex: 10,
  background: '#ffffff',
  borderLeft: '1px solid #e2e8f0',
  boxShadow: 'none',
  overflow: 'visible',
  whiteSpace: 'nowrap',
  backgroundClip: 'padding-box',
};

// Column widths (px) - must sum to a reasonable table width
export const COL_WIDTHS = {
  'REG DATE': 120,
  'OLD FILE NO': 130,
  'NEW FILE NO': 130,
  'NAME': 'auto',
  'PLAN NO': 110,
  'UNITS': 80,
  'RESIDENTIAL': 130,
  'NON RESIDENTIAL': 160,
  'SERVICE UNITS': 150,
  'CATEGORY': 120,
  'SECRETARY': 130,
  'TOWN': 110,
  'REG FORM': 220,
  'STATUS': 195,
  'ACTIONS': 210,
};

// STATUS column is also fixed (sticky) during horizontal scroll, sitting
// immediately to the left of the sticky ACTIONS column.
export const thStatusStyle = {
  ...thStyle,
  position: 'sticky',
  right: 210,
  width: 195,
  minWidth: 195,
  maxWidth: 195,
  zIndex: 30,
  background: '#f8fafc',
  borderLeft: '1px solid #cbd5e1',
  boxShadow: 'none',
  backgroundClip: 'padding-box',
};

export const tdStatusStyle = {
  ...cellStyle,
  position: 'sticky',
  right: 210,
  width: 195,
  minWidth: 195,
  maxWidth: 195,
  zIndex: 10,
  background: '#ffffff',
  borderLeft: '1px solid #e2e8f0',
  boxShadow: 'none',
  overflow: 'visible',
  whiteSpace: 'nowrap',
  backgroundClip: 'padding-box',
};

export function StatusPill({ status, renewalStatus }) {
  const s = String(status || '').toLowerCase().trim();
  const isYearLike = /^(19|20)\d{2}([/-](19|20)\d{2})?$/.test(s);
  const isActive = (s.includes('active') && !s.includes('non')) || isYearLike;
  const isNonActive = s.includes('non');
  const isPendingAgm = s === 'pending';
  const bg = isActive ? '#f0fdf4' : isNonActive ? '#fef2f2' : '#eff6ff';
  const color = isActive ? theme.green : isNonActive ? theme.red : theme.blue;
  const border = isActive ? '#bbf7d0' : isNonActive ? '#fecaca' : '#bfdbfe';
  const dotBg = isActive ? '#16a34a' : isNonActive ? '#dc2626' : '#2563eb';

  const isApproved = renewalStatus === 'Approved';

  let approvalElement = null;
  if (isPendingAgm) {
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
          {status || '-'}
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

export function ActionBtn({ icon, color, title, onClick }) {
  return (
    <button onClick={onClick} title={title} style={{ background: 'none', border: 'none', cursor: 'pointer', color, width: 18, minWidth: 18, height: 20, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, padding: 0, flexShrink: 0 }}>
      <i className={icon} />
    </button>
  );
}

export function FormField({ label, value, onChange, type = 'text', span2 }) {
  const inputId = 'mc_form_' + String(label || '').toLowerCase().replace(/[^a-z0-9]/g, '_').replace(/_+/g, '_').replace(/^_+|_+$/g, '');
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 5, gridColumn: span2 ? 'span 2' : undefined }}>
      <label htmlFor={inputId} style={{ fontSize: 12, fontWeight: 500, color: theme.text2 }}>{label}</label>
      <input id={inputId} name={inputId} type={type} value={value ?? ''} onChange={(e) => onChange(e.target.value)} className="mc-input" />
    </div>
  );
}

export function FormSelect({ label, value, onChange, options }) {
  const inputId = 'mc_form_' + String(label || '').toLowerCase().replace(/[^a-z0-9]/g, '_').replace(/_+/g, '_').replace(/^_+|_+$/g, '');
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
      <label htmlFor={inputId} style={{ fontSize: 12, fontWeight: 500, color: theme.text2 }}>{label}</label>
      <select id={inputId} name={inputId} value={value ?? ''} onChange={(e) => onChange(e.target.value)} className="mc-input">
        {options.map((o) => (
          <option key={o} value={o}>{o}</option>
        ))}
      </select>
    </div>
  );
}

export function CheckboxField({ label, checked, onChange }) {
  const inputId = 'mc_form_' + String(label || '').toLowerCase().replace(/[^a-z0-9]/g, '_').replace(/_+/g, '_').replace(/^_+|_+$/g, '');
  return (
    <label htmlFor={inputId} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: theme.text2, cursor: 'pointer' }}>
      <input id={inputId} name={inputId} type="checkbox" checked={!!checked} onChange={(e) => onChange(e.target.checked)} />
      <span>{label}</span>
    </label>
  );
}

export function CouncilMembersEditor({ value, onChange }) {
  const rows = Array.isArray(value) ? value : [];
  const normalized = Array.from({ length: 4 }, (_, idx) => rows[idx] || { name: '', unit_no: '', contact_no: '' });

  function updateRow(index, field, fieldValue) {
    const next = normalized.map((row, rowIndex) => (rowIndex === index ? { ...row, [field]: fieldValue } : row));
    onChange(next);
  }

  const romanNumerals = ['I', 'II', 'III', 'IV'];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, gridColumn: 'span 2' }}>
      <label style={{ fontSize: 12, fontWeight: 500, color: theme.text2 }}>Council Members (I-IV)</label>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 8 }}>
        {normalized.map((row, index) => (
          <div key={`council-${index}`} style={{ border: `1px solid ${theme.border}`, borderRadius: 8, padding: 8, background: theme.bg }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: theme.navy, marginBottom: 6 }}>{romanNumerals[index] || String.fromCharCode(73 + index)}</div>
            <label htmlFor={`mc_council_${index}_name`} style={{ display: 'none' }}>Name</label>
            <input id={`mc_council_${index}_name`} name={`mc_council_${index}_name`} value={row.name || ''} onChange={(e) => updateRow(index, 'name', e.target.value)} placeholder="Name" className="mc-input" style={{ marginBottom: 6 }} />
            <label htmlFor={`mc_council_${index}_unit`} style={{ display: 'none' }}>Unit No</label>
            <input id={`mc_council_${index}_unit`} name={`mc_council_${index}_unit`} value={row.unit_no || ''} onChange={(e) => updateRow(index, 'unit_no', e.target.value)} placeholder="Unit No" className="mc-input" style={{ marginBottom: 6 }} />
            <label htmlFor={`mc_council_${index}_contact`} style={{ display: 'none' }}>Contact</label>
            <input id={`mc_council_${index}_contact`} name={`mc_council_${index}_contact`} value={row.contact_no || ''} onChange={(e) => updateRow(index, 'contact_no', e.target.value)} placeholder="Contact" style={{ ...inputStyle }} />
          </div>
        ))}
      </div>
    </div>
  );
}

export function SectionLabel({ children }) {
  return <div className="mc-section-label">{children}</div>;
}

export function ViewField({ label, value }) {
  return (
    <div style={{ display: 'flex', borderBottom: `1px solid ${theme.border}`, padding: '9px 4px', fontSize: 13, alignItems: 'flex-start' }}>
      <div style={{ width: '240px', color: theme.text2, fontWeight: 600, flexShrink: 0 }}>{label}</div>
      <div style={{ color: theme.text, wordBreak: 'break-word', flex: 1 }}>{value == null || String(value).trim() === '' ? '-' : String(value)}</div>
    </div>
  );
}

export function normalizeKey(k) {
  return String(k || '').trim().replace(/\s+/g, ' ').toLowerCase();
}

export function getCell(row, ...keys) {
  const rk = Object.keys(row || {});
  const map = new Map(rk.map((k) => [normalizeKey(k), k]));
  for (const key of keys) {
    const found = map.get(normalizeKey(key));
    if (found) return row[found];
  }
  return '';
}

export function toText(v) {
  return v === null || v === undefined ? '' : String(v).trim();
}

export function toIntOrNull(v) {
  const s = toText(v);
  if (!s) return null;
  const n = Number(String(s).replace(/,/g, ''));
  return Number.isFinite(n) ? Math.trunc(n) : null;
}

export function normalizePrivateCategoryKey(value) {
  const s = String(value ?? '').toLowerCase().trim();
  if (!s) return '';
  if (s.includes('luxury')) return s.includes('semi') ? 'semi_luxury' : 'luxury';
  if (s.includes('semi')) return 'semi_luxury';
  if (s.includes('normal')) return 'normal';
  return '';
}

export function getPrivateCategoryLabel(value) {
  const normalized = normalizePrivateCategoryKey(value);
  if (normalized === 'luxury') return 'Luxury';
  if (normalized === 'semi_luxury') return 'Semi-Luxury';
  if (normalized === 'normal') return 'Normal';
  return '';
}

export function getAutoDetectedPrivateCategoryFromRecord(record) {
  const hasLuxuryFacility = LUXURY_TRIGGER_FIELDS.some((field) => Boolean(record?.[field]));
  if (hasLuxuryFacility) return 'luxury';
  const hasSemiLuxuryFacility = SEMI_LUXURY_TRIGGER_FIELDS.some((field) => Boolean(record?.[field]));
  if (hasSemiLuxuryFacility) return 'semi_luxury';
  return 'normal';
}

export function getCategoryDisplayValue(record) {
  if (!record) return '';
  const overrideKey = normalizePrivateCategoryKey(record.private_category_override);
  if (overrideKey) return getPrivateCategoryLabel(overrideKey);

  const autoDetected = getAutoDetectedPrivateCategoryFromRecord(record);
  const hasAnyFacilityTrigger = LUXURY_TRIGGER_FIELDS.some((field) => Boolean(record?.[field])) || SEMI_LUXURY_TRIGGER_FIELDS.some((field) => Boolean(record?.[field]));
  if (hasAnyFacilityTrigger) {
    return getPrivateCategoryLabel(autoDetected);
  }

  const fallbackKey = normalizePrivateCategoryKey(record.category);
  if (fallbackKey) return getPrivateCategoryLabel(fallbackKey);
  return getPrivateCategoryLabel(autoDetected);
}

export function deriveYear(v) {
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

export function deriveStatus(v) {
  const s = toText(v).toLowerCase();
  if (!s) return 'Active';
  if (s.includes('non') && s.includes('active')) return 'Non Active';
  if (s.includes('non')) return 'Non Active';
  if (s.includes('pending')) return 'Pending';
  if (s.includes('active')) return 'Active';
  if (/^(19|20)\d{2}([/-](19|20)\d{2})?$/.test(s)) return 'Active';
  return String(v).trim();
}

export function coerceDateText(v) {
  if (v === null || v === undefined || v === '') return '';
  if (v instanceof Date && !Number.isNaN(v.getTime())) return v.toISOString().slice(0, 10);
  const text = String(v).trim();
  const numeric = Number(text);
  if (!Number.isNaN(numeric) && numeric > 1000 && numeric < 100000) {
    const epoch = new Date(Date.UTC(1899, 11, 30));
    epoch.setUTCDate(epoch.getUTCDate() + Math.floor(numeric));
    return epoch.toISOString().slice(0, 10);
  }
  const parsed = new Date(text);
  if (!Number.isNaN(parsed.getTime())) return parsed.toISOString().slice(0, 10);
  return text;
}

export function formatDisplayDate(v) {
  const d = coerceDateText(v);
  if (!d) return '-';
  const m = d.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (m) return `${m[3]}/${m[2]}/${m[1]}`;
  return d;
}

// Letter-style date used in the Renewal Request / Acknowledgement covering
// letters (DD.MM.YYYY with dots, matching the official CMA letter format).
export function formatDotDate(v) {
  const d = coerceDateText(v);
  if (!d) return '__________';
  const m = d.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (m) return `${m[3]}.${m[2]}.${m[1]}`;
  return d;
}

export function escapeHtml(v) {
  return String(v ?? '').replace(/[&<>"']/g, (ch) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[ch]));
}

export function formatBoolean(v) {
  if (v === true || v === 'true' || v === 1 || v === '1') return 'Yes';
  if (v === false || v === 'false' || v === 0 || v === '0') return 'No';
  return '-';
}

export function formatCouncilMembers(v) {
  if (!v) return '-';
  const romanNumerals = ['I', 'II', 'III', 'IV'];
  if (Array.isArray(v)) {
    return v.filter((row) => row?.name || row?.unit_no || row?.contact_no).map((row, index) => `${romanNumerals[index] || String.fromCharCode(73 + index)}. ${row.name || '-'}${row.unit_no ? ` / ${row.unit_no}` : ''}${row.contact_no ? ` / ${row.contact_no}` : ''}`).join(' | ');
  }
  try {
    const parsed = JSON.parse(v);
    if (Array.isArray(parsed)) {
      return parsed.filter((row) => row?.name || row?.unit_no || row?.contact_no).map((row, index) => `${romanNumerals[index] || String.fromCharCode(73 + index)}. ${row.name || '-'}${row.unit_no ? ` / ${row.unit_no}` : ''}${row.contact_no ? ` / ${row.contact_no}` : ''}`).join(' | ');
    }
  } catch (e) {
    // fall through to plain text
  }
  return String(v);
}

// Returns council members as a plain array of { name, unit_no, contact_no },
// always at least 12 rows long (padded with blanks) - matches the 12 numbered
// rows (I-XII) on the printed registration form.
export function parseCouncilMembers(v) {
  let rows = [];
  if (Array.isArray(v)) {
    rows = v;
  } else if (v) {
    try {
      const parsed = JSON.parse(v);
      if (Array.isArray(parsed)) rows = parsed;
    } catch (e) {
      rows = [];
    }
  }
  const padded = [...rows];
  while (padded.length < 12) padded.push({ name: '', unit_no: '', contact_no: '' });
  return padded.slice(0, 12);
}

export function getRegistrationSummary(mc) {
  const parts = [];
  if (mc?.non_res_shops || mc?.non_res_office || mc?.non_res_hotel) {
    parts.push(`Non-res: ${mc.non_res_shops || 0}/${mc.non_res_office || 0}/${mc.non_res_hotel || 0}`);
  }
  if (mc?.services_lift || mc?.services_fire_agreement || mc?.services_generator_agreement || mc?.services_insurance) {
    parts.push(`Services: ${[mc.services_lift ? 'Lift' : '', mc.services_fire_agreement ? 'Fire' : '', mc.services_generator_agreement ? 'Gen' : '', mc.services_insurance ? 'Ins' : ''].filter(Boolean).join(',') || '-'}`);
  }
  if (mc?.mgmt_company_controlled) {
    parts.push(`Mgmt: ${mc.mgmt_company_name || mc.mgmt_company_contact || 'Yes'}`);
  }
  if (mc?.secretary_contact || mc?.treasurer_contact) {
    parts.push(`Contacts: ${[mc.secretary_contact, mc.treasurer_contact].filter(Boolean).join(' / ')}`);
  }
  if (mc?.council_members) {
    const count = Array.isArray(mc.council_members) ? mc.council_members.filter(Boolean).length : String(mc.council_members).length > 0 ? 1 : 0;
    parts.push(`Council: ${count}`);
  }
  return parts.join(' - ');
}

// Registration & Renewal fee schedule (per unit) - mirrors RegistrationForm.jsx
export const RENEWAL_RATE_BY_CATEGORY = [
  { test: (c) => c.includes('luxury') && !c.includes('semi'), rate: 500 },
  { test: (c) => c.includes('semi'), rate: 350 },
  { test: (c) => c.includes('normal'), rate: 250 },
  { test: (c) => c.includes('middle'), rate: 200 },
  { test: (c) => c.includes('low'), rate: 100 },
];

export function getRenewalRate(categoryText) {
  const c = String(categoryText || '').toLowerCase();
  const match = RENEWAL_RATE_BY_CATEGORY.find((r) => r.test(c));
  return match ? match.rate : null;
}

export function getRenewalAmountInfo(mc, settings) {
  let rate = 250;
  const CATEGORY_RATES = settings?.mc_category_rates;
  if (CATEGORY_RATES) {
    let categoryKey = 'private_normal';
    const cat = String(mc?.category || '').toLowerCase();
    if (cat.includes('luxury') && !cat.includes('semi')) categoryKey = 'private_luxury';
    else if (cat.includes('semi')) categoryKey = 'private_semi_luxury';
    else if (cat.includes('middle')) categoryKey = 'government_middle';
    else if (cat.includes('low')) categoryKey = 'government_low';
    
    rate = CATEGORY_RATES[categoryKey]?.rate ?? 250;
  } else {
    rate = getRenewalRate(mc?.category) || 250;
  }
  const units = toIntOrNull(mc?.units) || 0;
  if (!rate || !units) return null;
  const ssclRate = settings?.sscl_rate ?? 0.025;
  const vatRate = settings?.vat_rate ?? 0.18;
  const annual = rate * units * (1 + ssclRate) * (1 + vatRate); // fee + SSCL + VAT
  return { rate, units, annual, monthly: annual / 12 };
}

// - Multi-year renewal helper -
// Returns an array of { year, units, rate, fee, sscl, vat, total, isPerUnit } objects for
// every year that has NOT been paid yet, starting from the year AFTER the last
// paid renewal_period up to the current year.
//
// Rate structure (per CMA letter format):
//   Before 2023: FLAT annual fee (same as rate value, NOT multiplied by units)
//     Low Income = Rs.100/yr, Normal = Rs.250/yr, Semi-Luxury = Rs.350/yr, Luxury = Rs.500/yr
//   From 2023 onwards: PER-UNIT rate (units - rate_per_unit)
//
// Used to build the "Non Active" multi-year covering letter.
export function buildMultiYearRenewalRows(mc, settings) {
  const CATEGORY_RATES = settings?.mc_category_rates;
  let ratePerUnit = 250;
  if (CATEGORY_RATES) {
    let categoryKey = 'private_normal';
    const cat = String(mc?.category || '').toLowerCase();
    if (cat.includes('luxury') && !cat.includes('semi')) categoryKey = 'private_luxury';
    else if (cat.includes('semi')) categoryKey = 'private_semi_luxury';
    else if (cat.includes('middle')) categoryKey = 'government_middle';
    else if (cat.includes('low')) categoryKey = 'government_low';
    
    ratePerUnit = CATEGORY_RATES[categoryKey]?.rate ?? 250;
  } else {
    ratePerUnit = getRenewalRate(mc?.category) || 250;
  }

  // Unit count
  const res = parseInt(mc?.residential || mc?.residential_units) || 0;
  const shops = parseInt(mc?.non_res_shops) || 0;
  const office = parseInt(mc?.non_res_office) || 0;
  const hotel = parseInt(mc?.non_res_hotel) || 0;
  const sum = res + shops + office + hotel;
  const units = sum > 0 ? sum : (parseInt(mc?.units) || 0);

  // Government detection - use ALL available signals:
  // 1. ownership_type field set to 'government'
  // 2. government_income_level is set (only government MCs have this)
  // 3. category string contains 'government'
  // 4. ratePerUnit is 100 (Govt Low) or 200 (Govt Middle) — most reliable for imported records
  const isGov = mc?.ownership_type === 'government'
    || !!mc?.government_income_level
    || String(mc?.category || '').toLowerCase().includes('government')
    || ratePerUnit === 100
    || ratePerUnit === 200;

  // Determine start year from renewal_period (= last year the MC PAID for)
  // Can be a number like 2022, or a string like "13.10.2011 13.10.2012"
  let startYear = new Date().getFullYear();
  const rawPeriod = mc?.renewal_period;
  if (rawPeriod) {
    const periodStr = String(rawPeriod).trim();
    const yearMatches = periodStr.match(/\b(19|20)\d{2}\b/g);
    if (yearMatches && yearMatches.length > 0) {
      // Take the last year found (e.g. "13.10.2011 13.10.2012" - 2012 - start from 2013)
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

  const currentYear = new Date().getFullYear();
  const endYear = currentYear;

  if (startYear > endYear) return [];

  // Rate change boundary: pre-2023 = flat annual fee; 2023+ = per-unit fee
  const RATE_CHANGE_YEAR = 2023;

  // Pre-2023 private MC bracket table (by total unit count)
  const OLD_MC_RATES_PRE_2023 = [
    { maxUnits: null, minUnits: 101, fee: 20000 },
    { maxUnits: 100, minUnits: 76, fee: 10000 },
    { maxUnits: 75, minUnits: 51, fee: 7500 },
    { maxUnits: 50, minUnits: 41, fee: 5000 },
    { maxUnits: 40, minUnits: 31, fee: 3500 },
    { maxUnits: 30, minUnits: 21, fee: 2500 },
    { maxUnits: 20, minUnits: 11, fee: 1500 },
    { maxUnits: 10, minUnits: 1, fee: 1000 },
    { maxUnits: 0, minUnits: 0, fee: 500 }, // Fallback
  ];

  const rows = [];
  for (let y = startYear; y <= endYear; y++) {
    const isPerUnit = y >= RATE_CHANGE_YEAR;

    let fee = 0;
    let actualRateUsed = ratePerUnit;

    if (isPerUnit) {
      // 2023+: per-unit rate
      fee = ratePerUnit * units;
      actualRateUsed = ratePerUnit;
    } else {
      // Pre-2023: Government = flat Rs.500/yr; Private = bracket table
      if (isGov) {
        fee = 500;
      } else {
        const ratesPre2023 = settings?.mcom_rates_pre2023 || OLD_MC_RATES_PRE_2023;
        const match = ratesPre2023.find(r => units >= r.minUnits && (r.maxUnits === null || units <= r.maxUnits));
        fee = match ? match.fee : 500;
      }
      actualRateUsed = fee; // the flat annual fee for that bracket
    }

    const ssclRate = settings?.sscl_rate ?? 0.025;
    const vatRate = settings?.vat_rate ?? 0.18;
    const sscl = fee * ssclRate;
    const vat = (fee + sscl) * vatRate;
    const total = fee + sscl + vat;
    rows.push({ year: y, units, rate: actualRateUsed, fee, sscl, vat, total, isPerUnit });
  }
  return rows;
}


// Renewal periods run to 31 December of the registration/renewal year (per CMA's actual
// receipt period, e.g. "01.06.2026 - 31.12.2026"), not a rolling 365 days from reg_date.
// If that date has already passed (record not yet renewed), roll forward year by year
// until we reach the next upcoming 31 December cut-off.
export function getRenewalDueDate(mc) {
  const raw = mc?.renewal_date_vise || mc?.next_renewal_date || mc?.reg_date;
  const base = coerceDateText(raw);
  if (!base) return null;
  const baseDate = new Date(base);
  if (Number.isNaN(baseDate.getTime())) return null;

  let dueYear = baseDate.getFullYear();
  let due = new Date(dueYear, 11, 31); // 31 December of that year
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  due.setHours(0, 0, 0, 0);

  // If this cut-off already passed and the record hasn't been renewed since, advance
  // year by year to the next upcoming 31 December.
  while (due < today) {
    dueYear += 1;
    due = new Date(dueYear, 11, 31);
    due.setHours(0, 0, 0, 0);
  }
  return due;
}

export function getAgmDueDate(mc) {
  const raw = mc?.next_agm_date || mc?.agm_date_vise || mc?.agm_date;
  const base = coerceDateText(raw);
  if (!base) return null;
  const d = new Date(base);
  return Number.isNaN(d.getTime()) ? null : d;
}

export function daysUntil(date) {
  if (!date) return null;
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const target = new Date(date);
  target.setHours(0, 0, 0, 0);
  return Math.round((target - now) / (1000 * 60 * 60 * 24));
}

export const BACKEND_FIELDS = [
  'file_no', 'name', 'address', 'plan_no', 'units', 'residential_units',
  'non_residential_units', 'category', 'year', 'secretary', 'treasurer',
  'agm_date', 'status', 'reg_date', 'old_file_no', 'new_file_no',
  'management_corporation_name', 'residential', 'non_residential', 'service_units',
  'renewal_period', 'next_agm_date', 'renewal_date_vise', 'agm_date_vise',
  'mc', 'engineer', 'ma', 'secretary_unit_no', 'treasurer_unit_no',
  'agm_minutes', 'attendance', 'audited_accounts', 'final_accounts',
  'building_insurance', 'sinking_fund', 'budget_proposal', 'town',
  'municipal_council_pradeshiya_saba', 'certificate_division_file_no',
  'land_registry_approved_date', 'declaration_no', 'email_address',
  'non_res_shops', 'non_res_office', 'non_res_hotel', 'council_members',
  'services_lift', 'services_fire_agreement', 'services_generator_agreement', 'services_insurance',
  'fac_common_parking', 'fac_accessory_car_parcel', 'fac_roof_top', 'fac_gym',
  'fac_swimming_pool', 'fac_penth_house', 'fac_restaurant', 'fac_super_market',
  'fac_garden', 'fac_sauna', 'fac_salon', 'fac_golf_tennis', 'fac_day_care',
  'mgmt_company_controlled', 'mgmt_company_name', 'mgmt_company_contact',
  'secretary_contact', 'secretary_email', 'treasurer_contact', 'treasurer_email',
  'written_assurance_fulfilled', 'approval_note',
  'cl_reg_condo_plan', 'cl_parcels_total', 'cl_parcels_residential', 'cl_parcels_office', 'cl_parcels_shops', 'cl_parcels_hotels', 'cl_parcels_service',
  'cl_services_facilities', 'cl_written_assurance', 'cl_photocopy_condo_plan', 'cl_photocopy_condo_plan_date', 'cl_cma_certificate', 'cl_cma_certificate_no',
  'cl_cma_certificate_date', 'cl_declaration', 'cl_declaration_no', 'cl_declaration_date', 'cl_agm_minutes', 'cl_agm_minutes_date', 'cl_attendance',
  'cl_attendance_total', 'cl_attendance_physically', 'cl_attendance_proxy', 'cl_insurance', 'cl_insurance_from', 'cl_insurance_to', 'cl_owners_list',
  'cl_constitution', 'cl_bylaws', 'cl_additional_bylaws', 'cl_checked_by', 'cl_checked_date',
  'cl_parcels_total_pg', 'cl_parcels_residential_pg', 'cl_parcels_office_pg', 'cl_parcels_shops_pg', 'cl_parcels_hotels_pg', 'cl_parcels_service_pg',
  'cl_services_facilities_pg', 'cl_written_assurance_pg', 'cl_photocopy_condo_plan_pg', 'cl_cma_certificate_pg', 'cl_declaration_pg', 'cl_agm_minutes_pg',
  'cl_attendance_pg', 'cl_insurance_pg', 'cl_owners_list_pg', 'cl_constitution_pg', 'cl_bylaws_pg', 'cl_additional_bylaws_pg',
  // Renewal payment & acknowledgement tracking (NEW - requires matching columns on the backend `mc` table)
  'renewal_paid', 'renewal_paid_date', 'renewal_paid_amount', 'renewal_paid_year',
  'renewal_receipt_no', 'acknowledgement_no', 'acknowledgement_date', 'renewal_payment_status',
];

export function toBackendRecordFromExcelRow(row) {
  const file_no_new = toText(getCell(row, 'New File No.', 'New File No', 'New_File_No', 'new_file_no'));
  const file_no_old = toText(getCell(row, 'Old File No.', 'Old File No', 'Old_File_No', 'old_file_no'));
  const file_no = file_no_new || file_no_old || toText(getCell(row, 'file_no', 'File No'));

  let name = toText(getCell(row, 'Name of Management Corporation - New', 'Management_Corporation_name', 'management_corporation_name', 'Management Corporation Name', 'Name'));
  if (!name) {
    name = toText(getCell(row, ''));
  }
  const address = toText(getCell(row, 'Address', 'address'));
  const plan_no = toText(getCell(row, 'Plan No', 'plan_no'));
  const units = toIntOrNull(getCell(row, 'Units', 'units'));
  const residential_units = toIntOrNull(getCell(row, 'Residential', 'residential'));
  const non_res_shops = toIntOrNull(getCell(row, 'Non Residential - Shops', 'Non Residential Shops', 'Shops', 'non_res_shops'));
  const non_res_office = toIntOrNull(getCell(row, 'Non Residential - Office', 'Non Residential Office', 'Office', 'non_res_office'));
  const non_res_hotel = toIntOrNull(getCell(row, 'Non Residential - Hotel', 'Non Residential Hotel', 'Hotel', 'non_res_hotel'));
  const non_residential_units = toIntOrNull(getCell(row, 'Non Residencial', 'Non Residential', 'non_residential', 'non_residential_units'));
  const service_units = toIntOrNull(getCell(row, 'Service_Units', 'Service Units', 'Sevices Units', 'service_units'));
  const category = toText(getCell(row, 'Catogory', 'Category', 'category'));
  const derivedNonResidentialUnits = non_residential_units ?? (((non_res_shops ?? 0) + (non_res_office ?? 0) + (non_res_hotel ?? 0)) || null);
  const categoryOverride = normalizePrivateCategoryKey(category);
  const categoryLabel = getPrivateCategoryLabel(category) || category;
  const renewal_period = toText(getCell(row, 'Renewal_Period', 'Renewal Period', 'renewal_period'));
  const explicit_status = toText(getCell(row, 'Status', 'status', 'STATUS'));
  const reg_date_raw = getCell(row, 'Reg_Date', 'Reg. Date', 'reg_date');
  const reg_date = coerceDateText(reg_date_raw);
  const status = deriveStatus(explicit_status || renewal_period);
  const year = deriveYear(getCell(row, 'Reg. Date', 'Reg_Date', 'reg_date', 'Year'));
  const secretary = toText(getCell(row, 'Secretary', 'secretary'));
  const secretary_unit_no = toText(getCell(row, 'Secretary_Unit_No', 'Secretary unit No.', 'Secretary Unit No.', 'secretary_unit_no'));
  const treasurer = toText(getCell(row, 'Treasurer', 'treasurer'));
  const treasurer_unit_no = toText(getCell(row, 'Treasurer_Unit_No', 'Treasurer unit No.', 'unit No_1', 'unit No', 'treasurer_unit_no'));
  const agm_date = coerceDateText(getCell(row, 'AGM Date', 'agm_date'));
  const next_agm_date = coerceDateText(getCell(row, 'Next_AGM_Date', 'Next AGM Date', 'next_agm_date'));
  const renewal_date_vise = coerceDateText(getCell(row, 'Renewal_Date_Vise', 'Renewal Date Vise', 'renewal_date_vise'));
  const agm_date_vise = coerceDateText(getCell(row, 'AGM_Date_Vise', 'AGM Date Vise', 'agm_date_vise'));
  const mc = toText(getCell(row, 'MC', 'mc'));
  const engineer = toText(getCell(row, 'Eng.', 'Engineer', 'engineer'));
  const ma = toText(getCell(row, 'MA', 'ma'));
  const agm_minutes = toText(getCell(row, 'AGM_Minutes', 'AGM Minutes', 'agm_minutes'));
  const attendance = toText(getCell(row, 'Attendance', 'Attendence', 'attendance'));
  const audited_accounts = toText(getCell(row, 'Audited_Accounts', 'Audited Account', 'Audited Accounts', 'audited_accounts'));
  const final_accounts = toText(getCell(row, 'Final_Accounts', 'Final Acconts', 'Final Accounts', 'final_accounts'));
  const building_insurance = toText(getCell(row, 'Building_Insurance', 'Building Insuarance', 'Building Insurance', 'building_insurance'));
  const sinking_fund = toText(getCell(row, 'Sinking_Fund', 'Sinking Fund', 'sinking_fund'));
  const budget_proposal = toText(getCell(row, 'Budget_Proposal', 'Budjet Propsal', 'Budget Proposal', 'budget_proposal'));
  const town = toText(getCell(row, 'Town', 'town'));
  const municipal_council_pradeshiya_saba = toText(getCell(row, 'Municipal_Council_Pradeshiya_Saba', 'Municipal Council /Pradeshiya Saba limits', 'municipal_council_pradeshiya_saba'));
  const certificate_division_file_no = toText(getCell(row, 'Certificate_Division_File_No', 'Certificate Division File No.', 'certificate_division_file_no'));
  const land_registry_approved_date = coerceDateText(getCell(row, 'Land_Registry_Approved_Date', 'Land registry Approved Date', 'land_registry_approved_date'));
  const declaration_no = toText(getCell(row, 'Declaration_No', 'Declaration No.', 'declaration_no'));
  const email_address = toText(getCell(row, 'Email_Address', 'Email Address', 'email_address'));

  const rec = {
    file_no, name, address, plan_no, units, residential_units, non_residential_units: derivedNonResidentialUnits,
    residential: residential_units, non_residential: derivedNonResidentialUnits,
    non_res_shops, non_res_office, non_res_hotel,
    service_units, category: categoryLabel, year, secretary, treasurer, secretary_unit_no,
    treasurer_unit_no, agm_date, next_agm_date, renewal_period, renewal_date_vise,
    agm_date_vise, mc, engineer, ma, agm_minutes, attendance, audited_accounts,
    final_accounts, building_insurance, sinking_fund, budget_proposal, town,
    municipal_council_pradeshiya_saba, certificate_division_file_no,
    land_registry_approved_date, declaration_no, email_address, reg_date,
    old_file_no: file_no_old, new_file_no: file_no_new,
    management_corporation_name: name, status,
    private_category_override: categoryOverride,
  };

  for (const k of BACKEND_FIELDS) {
    if (!(k in rec)) rec[k] = null;
  }

  return rec;
}

export function blankForm() {
  return {
    reg_date: new Date().toISOString().slice(0, 10), old_file_no: '', new_file_no: '', file_no: '',
    management_corporation_name: '', name: '', address: '',
    plan_no: '', declaration_no: '', email_address: '',
    units: '', residential_units: '', non_residential_units: '', service_units: '',
    category: '', year: '', town: '', municipal_council_pradeshiya_saba: '',
    certificate_division_file_no: '', land_registry_approved_date: '',
    secretary: '', secretary_unit_no: '', treasurer: '', treasurer_unit_no: '',
    mc: '', engineer: '', ma: '',
    agm_date: '', next_agm_date: '', renewal_period: '',
    renewal_date_vise: '', agm_date_vise: '',
    renewal_paid: false, renewal_paid_date: '', renewal_paid_amount: '', renewal_paid_year: '',
    renewal_receipt_no: '', acknowledgement_no: '', acknowledgement_date: '', renewal_payment_status: 'Pending',
    agm_minutes: '', attendance: '', audited_accounts: '', final_accounts: '',
    building_insurance: '', sinking_fund: '', budget_proposal: '',
    non_res_shops: '', non_res_office: '', non_res_hotel: '',
    services_lift: false, services_fire_agreement: false, services_generator_agreement: false, services_insurance: false,
    fac_common_parking: false, fac_accessory_car_parcel: false, fac_roof_top: false, fac_gym: false,
    fac_swimming_pool: false, fac_penth_house: false, fac_restaurant: false, fac_super_market: false,
    fac_garden: false, fac_sauna: false, fac_salon: false, fac_golf_tennis: false, fac_day_care: false,
    fac_lift: false, fac_service_lift: false, fac_club_house: false, fac_canteen: false,
    mgmt_company_controlled: false, mgmt_company_name: '', mgmt_company_contact: '',
    ownership_type: 'private', government_income_level: '', private_category_override: '',
    fee_rate_per_unit: '', fee_amount: '', sscl_amount: '', vat_amount: '', total_amount: '',
    secretary_contact: '', secretary_email: '', treasurer_contact: '', treasurer_email: '',
    council_members: Array.from({ length: 4 }, () => ({ name: '', unit_no: '', contact_no: '' })),
    written_assurance_fulfilled: false,
    status: 'Active',
  };
}

export const TABLE_HEADERS = [
  'REG DATE', 'OLD FILE NO', 'NEW FILE NO', 'NAME', 'PLAN NO',
  'UNITS', 'RESIDENTIAL', 'NON RESIDENTIAL', 'SERVICE UNITS',
  'CATEGORY', 'SECRETARY', 'TOWN', 'REG FORM', 'STATUS', 'ACTIONS',
];

// - Approval Checklist Modal -
// Mirrors the printed "Customer Care Unit - Document Check List for Management
// Corporation" form exactly: every box that is a tick-box on the paper form is
// a checkbox here, and every blank/underline on the paper form (no., date,
// page count, etc.) is its own fillable text field - same items, same order.
export const CHECKLIST_ITEMS = [
  { key: 'cl_reg_condo_plan', type: 'check', label: '01. Registered Condominium Plan No.' },

  { key: 'cl_parcels_total', type: 'field', label: 'Total', group: '02. Number of Parcels in the Condominium' },
  { key: 'cl_parcels_residential', type: 'field', label: 'Residential', group: '02. Number of Parcels in the Condominium' },
  { key: 'cl_parcels_office', type: 'field', label: 'Non Residential - Office', group: '02. Number of Parcels in the Condominium' },
  { key: 'cl_parcels_shops', type: 'field', label: 'Non Residential - Shops', group: '02. Number of Parcels in the Condominium' },
  { key: 'cl_parcels_hotels', type: 'field', label: 'Non Residential - Hotels', group: '02. Number of Parcels in the Condominium' },
  { key: 'cl_parcels_service', type: 'field', label: 'Non Residential - Service Units', group: '02. Number of Parcels in the Condominium' },

  { key: 'cl_services_facilities', type: 'checkpage', label: '03. Services / Facilites (Attached details)' },
  { key: 'cl_written_assurance', type: 'checkpage', label: '04. Written assurance from Secretary that C.M.A. requirements will be fulfilled (Attached)' },

  { key: 'cl_photocopy_condo_plan', type: 'checkpage', label: '01. Registered Condominium Plan issued by the Registered General', group: 'PHOTOCOPY OF' },
  { key: 'cl_photocopy_condo_plan_date', type: 'field', label: 'Date', group: 'PHOTOCOPY OF', placeholder: '.... / .... / ....' },

  { key: 'cl_cma_certificate', type: 'checkpage', label: '02. CMA Certificate No.', group: 'PHOTOCOPY OF' },
  { key: 'cl_cma_certificate_no', type: 'field', label: 'CMA / CD / CP / No.', group: 'PHOTOCOPY OF', placeholder: 'CMA/CD/CP/.../...' },
  { key: 'cl_cma_certificate_date', type: 'field', label: 'Date', group: 'PHOTOCOPY OF', placeholder: '.... / .... / ....' },

  { key: 'cl_declaration', type: 'checkpage', label: '03. Declaration No.', group: 'PHOTOCOPY OF' },
  { key: 'cl_declaration_no', type: 'field', label: 'Declaration No.', group: 'PHOTOCOPY OF' },
  { key: 'cl_declaration_date', type: 'field', label: 'Date', group: 'PHOTOCOPY OF', placeholder: '.... / .... / ....' },

  { key: 'cl_agm_minutes', type: 'checkpage', label: '04. Minutes of the 1st Annual General Meeting', group: 'PHOTOCOPY OF' },
  { key: 'cl_agm_minutes_date', type: 'field', label: 'Date', group: 'PHOTOCOPY OF', placeholder: '.... / .... / ....' },

  { key: 'cl_attendance', type: 'checkpage', label: '05. Attendance', group: 'PHOTOCOPY OF' },
  { key: 'cl_attendance_total', type: 'field', label: 'Total', group: 'PHOTOCOPY OF' },
  { key: 'cl_attendance_physically', type: 'field', label: 'Physically', group: 'PHOTOCOPY OF' },
  { key: 'cl_attendance_proxy', type: 'field', label: 'Proxy', group: 'PHOTOCOPY OF' },

  { key: 'cl_insurance', type: 'checkpage', label: '06. Insurance Policy', group: 'PHOTOCOPY OF' },
  { key: 'cl_insurance_from', type: 'field', label: 'Valid Year From', group: 'PHOTOCOPY OF', placeholder: 'From' },
  { key: 'cl_insurance_to', type: 'field', label: 'To', group: 'PHOTOCOPY OF', placeholder: 'To' },

  { key: 'cl_owners_list', type: 'checkpage', label: '07. Update List of names of Registered Owners & Address with their sign', group: 'PHOTOCOPY OF' },
  { key: 'cl_constitution', type: 'checkpage', label: '08. Constitution', group: 'PHOTOCOPY OF' },
  { key: 'cl_bylaws', type: 'checkpage', label: '09. By Laws', group: 'PHOTOCOPY OF' },
  { key: 'cl_additional_bylaws', type: 'checkpage', label: '10. Additional by Laws (Housing Rules / Code of Conduct / Rules & Regulations)', group: 'PHOTOCOPY OF' },

  { key: 'cl_checked_by', type: 'field', label: 'Checked by' },
  { key: 'cl_checked_date', type: 'field', label: 'Date', placeholder: '.... / .... / ....' },
];

// Only items with an actual tick-box on the printed form count toward
// the "documents verified" progress. ("checkpage" items have BOTH a
// tick-box AND a page-count blank on the paper form.)
export const TICKABLE_ITEMS = CHECKLIST_ITEMS.filter(({ type }) => type === 'check' || type === 'checkpage');
export const PAGE_COUNT_ITEMS = CHECKLIST_ITEMS.filter(({ type }) => type === 'checkpage');
export const FIELD_ITEMS = CHECKLIST_ITEMS.filter(({ type }) => type === 'field');
export const AGM_APPROVAL_REQUIRED_KEYS = ['cl_agm_minutes', 'cl_attendance'];

export function canApproveWithAgmChecklist(values = {}) {
  return AGM_APPROVAL_REQUIRED_KEYS.every((key) => Boolean(values?.[key]));
}

export const blankChecklist = () => ({
  ...Object.fromEntries(TICKABLE_ITEMS.map(({ key }) => [key, false])),
  ...Object.fromEntries(FIELD_ITEMS.map(({ key }) => [key, ''])),
  ...Object.fromEntries(PAGE_COUNT_ITEMS.map(({ key }) => [`${key}_pg`, ''])),
});

export function buildChecklistRecordFromMc(mc) {
  const base = blankChecklist();
  const source = mc || {};
  Object.keys(base).forEach((key) => {
    if (source[key] !== undefined && source[key] !== null && source[key] !== '') {
      base[key] = source[key];
    }
  });

  // Auto-fill checklist fields from main MC record if empty
  if (!base.cl_parcels_total && source.units) base.cl_parcels_total = source.units;
  if (!base.cl_parcels_residential && (source.residential || source.residential_units)) {
    base.cl_parcels_residential = source.residential || source.residential_units;
  }
  if (!base.cl_parcels_office && source.non_res_office) {
    base.cl_parcels_office = source.non_res_office;
  } else if (!base.cl_parcels_office && !source.non_res_shops && !source.non_res_hotel && (source.non_residential || source.non_residential_units)) {
    base.cl_parcels_office = source.non_residential || source.non_residential_units;
  }
  if (!base.cl_parcels_shops && source.non_res_shops) base.cl_parcels_shops = source.non_res_shops;
  if (!base.cl_parcels_hotels && source.non_res_hotel) base.cl_parcels_hotels = source.non_res_hotel;
  if (!base.cl_parcels_service && source.service_units) base.cl_parcels_service = source.service_units;
  if (!base.cl_declaration_no && source.declaration_no) base.cl_declaration_no = source.declaration_no;

  return base;
}

export function normalizeChecklistPayload(checkData = {}) {
  const normalized = { ...checkData };
  TICKABLE_ITEMS.forEach(({ key }) => {
    const value = normalized[key];
    normalized[key] = value === true || value === 'true' || value === 1 || value === '1';
  });
  return normalized;
}

export function ApprovalChecklistModal({ record, onClose, onSave, onApprove, onReject, currentUser }) {
  const isAGM = String(currentUser?.role || '').trim().toUpperCase() === 'AGM';
  const [checks, setChecks] = useState(() => buildChecklistRecordFromMc(record));
  const [saving, setSaving] = useState(false);
  const [note, setNote] = useState(record.approval_note || '');
  const [showRejectPrompt, setShowRejectPrompt] = useState(false);
  const [tempReason, setTempReason] = useState('');

  useEffect(() => {
    setChecks(buildChecklistRecordFromMc(record));
    setNote(record?.approval_note || '');
    setShowRejectPrompt(false);
    setTempReason('');
  }, [record]);

  const allChecked = canApproveWithAgmChecklist(checks);
  const checkedCount = TICKABLE_ITEMS.filter(({ key }) => checks[key]).length;

  function toggle(key) {
    setChecks((p) => ({ ...p, [key]: !p[key] }));
  }

  function setField(key, value) {
    setChecks((p) => ({ ...p, [key]: value }));
  }

  async function handleSave() {
    setSaving(true);
    try {
      await onSave(normalizeChecklistPayload({ ...checks, approval_note: note }));
    } finally {
      setSaving(false);
    }
  }

  async function handleApprove() {
    if (!allChecked) return;
    setSaving(true);
    try {
      await onApprove(normalizeChecklistPayload({ ...checks, approval_note: note }));
    } finally {
      setSaving(false);
    }
  }

  async function handleReject() {
    let reason = note;
    if (!reason.trim()) {
      setShowRejectPrompt(true);
      return;
    }
    executeReject(reason);
  }

  async function executeReject(reasonText) {
    setSaving(true);
    try {
      await onReject(normalizeChecklistPayload({ ...checks, approval_note: reasonText }));
    } finally {
      setSaving(false);
    }
  }

  function handleConfirmReject() {
    if (!tempReason.trim()) return;
    setNote(tempReason);
    setShowRejectPrompt(false);
    executeReject(tempReason);
  }

  const overlayBg = {
    position: 'fixed', inset: 0,
    background: 'rgba(0,0,0,.55)',
    zIndex: 500,
    display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
  };

  return (
    <div style={overlayBg} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div style={{ background: '#fff', borderRadius: 16, width: '100%', maxWidth: 680, boxShadow: '0 20px 60px rgba(0,0,0,.25)', maxHeight: '92vh', display: 'flex', flexDirection: 'column' }}>

        {/* Header */}
        <div style={{ padding: '18px 22px 14px', borderBottom: `1px solid ${theme.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <div style={{ fontSize: 16, fontWeight: 700, color: theme.text }}>Document Check List</div>
            <div style={{ fontSize: 12, color: theme.text3, marginTop: 3 }}>Customer Care Unit - Management Corporation Verification</div>
            <div style={{ marginTop: 6, fontSize: 13, fontWeight: 600, color: theme.navy }}>
              {record.management_corporation_name || record.name}
              <span style={{ marginLeft: 10, fontSize: 11, fontWeight: 400, color: theme.text3 }}>{record.new_file_no || record.file_no}</span>
            </div>
          </div>
          <button onClick={onClose} className="mc-close-btn"><i className="fas fa-times" /></button>
        </div>

        {/* Progress bar */}
        <div style={{ padding: '10px 22px 0' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: theme.text2, marginBottom: 4 }}>
            <span>Documents Verified</span>
            <span style={{ fontWeight: 700, color: allChecked ? theme.green : theme.navy }}>{checkedCount} / {TICKABLE_ITEMS.length}</span>
          </div>
          <div style={{ background: theme.border, borderRadius: 99, height: 6, overflow: 'hidden' }}>
            <div style={{ width: `${(checkedCount / TICKABLE_ITEMS.length) * 100}%`, background: allChecked ? theme.green : theme.navy, height: '100%', borderRadius: 99, transition: 'width .3s' }} />
          </div>
        </div>

        {/* Checklist body - laid out exactly as the printed form */}
        <div style={{ padding: '14px 22px', overflowY: 'auto', flex: 1 }}>
          {/* Info row */}
          <div style={{ background: '#f0f4ff', borderRadius: 8, padding: '8px 12px', marginBottom: 12, fontSize: 12, color: theme.navy }}>
            <strong>Registered Condominium Plan No:</strong> {record.plan_no || '-'}
            &nbsp;&nbsp;|&nbsp;&nbsp;
            <strong>Total Parcels:</strong> {record.units || '-'}
            &nbsp;&nbsp;|&nbsp;&nbsp;
            <strong>Residential:</strong> {record.residential ?? record.residential_units ?? '-'}
            &nbsp;&nbsp;|&nbsp;&nbsp;
            <strong>Non-Res:</strong> {record.non_residential ?? record.non_residential_units ?? '-'}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {(() => {
              let lastGroup = null;
              return CHECKLIST_ITEMS.map((item) => {
                const { key, type, label, group, placeholder } = item;
                const groupHeader = group && group !== lastGroup;
                lastGroup = group || lastGroup;

                const rowStart = (
                  <>
                    {groupHeader && (
                      <div
                        key={`group-${group}`}
                        style={{
                          fontSize: 11, fontWeight: 700, color: theme.navy, textTransform: 'uppercase',
                          letterSpacing: '0.6px', marginTop: 10, paddingBottom: 4, borderBottom: `1px dashed ${theme.border}`,
                        }}
                      >
                        {group}
                      </div>
                    )}
                  </>
                );

                // - Plain tick-box item (no page-count blank): e.g. item 01 -
                if (type === 'check') {
                  return (
                    <div key={key}>
                      {rowStart}
                      <label
                        style={{
                          display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px',
                          borderRadius: 8, cursor: 'pointer', transition: 'background .15s',
                          background: checks[key] ? '#f0fdf4' : '#fafafa',
                          border: `1px solid ${checks[key] ? '#bbf7d0' : theme.border}`,
                        }}
                      >
                        <input id="mc_form_field_7" name="mc_form_field_7"
                          type="checkbox"
                          checked={checks[key]}
                          onChange={() => toggle(key)}
                          style={{ width: 15, height: 15, accentColor: theme.green, cursor: 'pointer', flexShrink: 0 }}
                        />
                        <span style={{ flex: 1, fontSize: 13, color: theme.text, fontWeight: checks[key] ? 500 : 400 }}>{label}</span>
                        {checks[key] && <i className="fas fa-check-circle" style={{ color: theme.green, fontSize: 13, flexShrink: 0 }} />}
                      </label>
                    </div>
                  );
                }

                // - Tick-box item that also has a page-count box ("pg.") -
                if (type === 'checkpage') {
                  return (
                    <div key={key}>
                      {rowStart}
                      <div
                        style={{
                          display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px',
                          borderRadius: 8, transition: 'background .15s',
                          background: checks[key] ? '#f0fdf4' : '#fafafa',
                          border: `1px solid ${checks[key] ? '#bbf7d0' : theme.border}`,
                        }}
                      >
                        <input id="mc_form_field_8" name="mc_form_field_8"
                          type="checkbox"
                          checked={checks[key]}
                          onChange={() => toggle(key)}
                          style={{ width: 15, height: 15, accentColor: theme.green, cursor: 'pointer', flexShrink: 0 }}
                        />
                        <label
                          onClick={() => toggle(key)}
                          style={{ flex: 1, fontSize: 13, color: theme.text, fontWeight: checks[key] ? 500 : 400, cursor: 'pointer' }}
                        >
                          {label}
                        </label>
                        <span style={{ fontSize: 11, color: theme.text3, flexShrink: 0 }}>pg.</span>
                        <input id="mc_form_field_9" name="mc_form_field_9"
                          type="text"
                          value={checks[`${key}_pg`] || ''}
                          onChange={(e) => setField(`${key}_pg`, e.target.value)}
                          placeholder="-"
                          className="mc-input" style={{ width: 52, padding: '5px 7px', fontSize: 12, flexShrink: 0 }}
                          onFocus={(e) => e.stopPropagation()}
                        />
                        {checks[key] && <i className="fas fa-check-circle" style={{ color: theme.green, fontSize: 13, flexShrink: 0 }} />}
                      </div>
                    </div>
                  );
                }

                // - Fillable field (the blanks / underlines on the paper form) -
                return (
                  <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '4px 12px 4px 36px' }}>
                    <span style={{ fontSize: 12, color: theme.text2, minWidth: 150, flexShrink: 0 }}>{label}</span>
                    <input id="mc_form_field_10" name="mc_form_field_10"
                      type="text"
                      value={checks[key] || ''}
                      onChange={(e) => setField(key, e.target.value)}
                      placeholder={placeholder || ''}
                      className="mc-input" style={{ padding: '6px 9px', fontSize: 12.5 }}
                    />
                  </div>
                );
              });
            })()}
          </div>

          {/* Notes */}
          <div style={{ marginTop: 14 }}>
            <label style={{ fontSize: 12, fontWeight: 500, color: theme.text2, display: 'block', marginBottom: 4 }}>Approval / Rejection Remarks (Required for Rejection)</label>
            <textarea id="mc_form_field_11" name="mc_form_field_11"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={2}
              placeholder="Enter reason for rejection or approval remarks..."
              className="mc-input" style={{ resize: 'vertical', minHeight: 54 }}
            />
          </div>
        </div>

        {/* Footer actions */}
        <div style={{ padding: '12px 22px', borderTop: `1px solid ${theme.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <button onClick={onClose} className="mc-btn-outline" disabled={saving}>Cancel</button>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={handleSave} className="mc-btn-outline" disabled={saving}>
              <i className="fas fa-save" /> {saving ? 'Saving-' : 'Save Progress'}
            </button>
            {isAGM && (
              <>
                <button
                  onClick={handleReject}
                  disabled={saving}
                  className="mc-btn-base" style={{ background: '#fef2f2', color: theme.red, border: `1px solid #fecaca` }}
                >
                  <i className="fas fa-times-circle" /> Reject
                </button>
                <button
                  onClick={handleApprove}
                  disabled={saving || !allChecked}
                  title={!allChecked ? 'All documents must be checked before approving' : ''}
                  className="mc-btn-base" style={{ background: allChecked ? theme.green : '#d1fae5', color: '#fff', cursor: allChecked ? 'pointer' : 'not-allowed', opacity: allChecked ? 1 : 0.6 }}
                >
                  <i className="fas fa-check-circle" /> Approve & Activate
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Custom Rejection Reason Prompt */}
      {showRejectPrompt && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.65)', zIndex: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div style={{ background: '#fff', borderRadius: 12, width: '100%', maxWidth: 400, boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }}>
            <div style={{ padding: '16px 20px', borderBottom: `1px solid ${theme.border}` }}>
              <h3 style={{ margin: 0, fontSize: 16, color: theme.red, display: 'flex', alignItems: 'center', gap: 8 }}>
                <i className="fas fa-exclamation-triangle" /> Reason for Rejection
              </h3>
            </div>
            <div style={{ padding: 20 }}>
              <label style={{ fontSize: 13, color: theme.text, display: 'block', marginBottom: 8, fontWeight: 500 }}>
                Please enter a reason for rejecting this record:
              </label>
              <textarea id="mc_form_field_12" name="mc_form_field_12"
                value={tempReason}
                onChange={(e) => setTempReason(e.target.value)}
                autoFocus
                rows={3}
                placeholder="Type the rejection reason here..."
                className="mc-input" style={{ resize: 'vertical', width: '100%' }}
              />
              {!tempReason.trim() && (
                <div style={{ fontSize: 11, color: theme.red, marginTop: 6 }}>* A reason is required to reject.</div>
              )}
            </div>
            <div style={{ padding: '12px 20px', borderTop: `1px solid ${theme.border}`, display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button onClick={() => setShowRejectPrompt(false)} className="mc-btn-outline" style={{ padding: '6px 16px' }}>Cancel</button>
              <button
                onClick={handleConfirmReject}
                disabled={!tempReason.trim() || saving}
                className="mc-btn-base" style={{ background: tempReason.trim() ? theme.red : '#fca5a5', color: '#fff', border: 'none', padding: '6px 16px' }}
              >
                {saving ? 'Rejecting...' : 'Confirm Reject'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
// -

export const EXPORT_FIELDS = [
  'No', 'Reg. Date', 'Old File No.', 'New File No.', 'Name of Management Corporation', 'Name of Management Corporation - New', 'Address', 'Plan No', 'Units', 'Residential', 'Non Residencial', 'Sevices Units', 'Catogory', 'Renewal Period', 'AGM Date', 'Next AGM Date', 'Renewal Date Vise', 'AGM Date Vise', 'MC', 'Eng.', 'MA', 'Secretary', 'unit No (Sec)', 'Treasurer', 'unit No (Trs)', 'AGM Minutes', 'Attendence', 'Audited Account', 'Final Acconts', 'Building Insuarance', 'Sinking Fund', 'Budjet Propsal', 'Town', 'Municipal Council /Pradeshiya Saba limits', 'Certificate Division File No.', 'Land registry Approved Date', 'Declaration No.', 'Email Address', 'Status'
];

export const MCOM_RENEWAL_RATES_2023 = [
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

export const MCOM_OLD_BRACKET_PRE2023 = [
  { maxUnits: null, minUnits: 101, fee: 20000 },
  { maxUnits: 100, minUnits: 76, fee: 10000 },
  { maxUnits: 75, minUnits: 51, fee: 7500 },
  { maxUnits: 50, minUnits: 41, fee: 5000 },
  { maxUnits: 40, minUnits: 31, fee: 3500 },
  { maxUnits: 30, minUnits: 21, fee: 2500 },
  { maxUnits: 20, minUnits: 11, fee: 1500 },
  { maxUnits: 10, minUnits: 1, fee: 1000 },
];

export function getMcomFeeForYear(units, year, isGov, settings) {
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

export function getMcomAnnualFeeInfo(mc, settings) {
  const units = parseInt(mc?.units) || 0;
  const currentYear = new Date().getFullYear();
  const isGov = String(mc?.mc_mcom || '').toUpperCase().includes('GOV') || String(mc?.category || '').toLowerCase().includes('government');
  const feePerYear = getMcomFeeForYear(units, currentYear, isGov, settings);
  return { units, feePerYear };
}

export function getMcomRenewalAmountInfo(mc, settings) {
  const { feePerYear } = getMcomAnnualFeeInfo(mc, settings);
  return { annual: feePerYear, monthly: feePerYear / 12 };
}

export function buildMcomMultiYearRows(mc, settings) {
  const units = parseInt(mc?.units) || 0;
  const currentYear = new Date().getFullYear();
  const isGov = String(mc?.mc_mcom || '').toUpperCase().includes('GOV') || String(mc?.category || '').toLowerCase().includes('government');

  let startYear = currentYear;
  const rawPeriod = mc?.renewal_period;
  if (rawPeriod) {
    const periodStr = String(rawPeriod).trim();
    const yearMatches = periodStr.match(/\b(19|20)\d{2}\b/g);
    if (yearMatches && yearMatches.length > 0) {
      startYear = parseInt(yearMatches[yearMatches.length - 1]) + 1;
    } else if (/^\d{4}$/.test(periodStr)) {
      startYear = parseInt(periodStr) + 1;
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

