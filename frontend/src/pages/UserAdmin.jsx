import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { fetchUsers, createUser, updateUser, deleteUser, uploadUserAvatar, fetchRoles, createRole, updateRole, deleteRole } from '../api';
import { useConfirmDialog } from '../ConfirmDialogContext.jsx';
import { useAutoRefresh } from '../utils/useAutoRefresh';
import { useSettings } from '../SettingsContext.jsx';

import {
  thStyle as sharedThStyle,
  cellStyle as sharedTdStyle,
} from '../components/mc-management/MCManagementShared.jsx';
import '../components/mc-management/MCManagement.css';

/* ── Theme tokens ── same as every other CMA page */
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
  purple: '#8b5cf6',
  orange: '#f59e0b',
};

function ActionBtn({ icon, color, title, onClick }) {
  return (
    <button onClick={onClick} title={title} style={{ background: 'none', border: 'none', cursor: 'pointer', color, width: 18, minWidth: 18, height: 20, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, padding: 0, flexShrink: 0 }}>
      <i className={icon} />
    </button>
  );
}

const btnBase = {
  display: 'inline-flex', alignItems: 'center', gap: 6,
  padding: '8px 16px', borderRadius: 8, fontSize: 13,
  fontWeight: 600, cursor: 'pointer', border: 'none',
  fontFamily: 'inherit', transition: 'all .18s',
};
const btnPrimary = { ...btnBase, background: theme.navy, color: '#fff' };
const btnOutline = { ...btnBase, background: 'transparent', color: theme.text2, border: `1px solid ${theme.border}` };
const btnDanger = { ...btnBase, background: '#fef2f2', color: theme.red, border: `1px solid #fecaca` };

const ROLE_META = {
  admin: { bg: '#eaf0fb', color: theme.navy, icon: 'fa-shield-alt' },
  ma: { bg: '#e8f4ec', color: theme.green, icon: 'fa-user-tie' },
  agm: { bg: '#fdeeee', color: theme.red, icon: 'fa-briefcase' },
  chairman: { bg: '#f3e8ff', color: theme.purple, icon: 'fa-crown' },
  dgm: { bg: '#fff7ed', color: theme.orange, icon: 'fa-user-shield' },
};

function RoleBadge({ role }) {
  const key = String(role || '').trim().toLowerCase();
  const meta = ROLE_META[key] || { bg: '#f1f5f9', color: theme.text2, icon: 'fa-user' };
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      background: meta.bg, color: meta.color,
      borderRadius: 999, padding: '3px 10px',
      fontSize: 11, fontWeight: 700, letterSpacing: '.4px',
    }}>
      <i className={`fas ${meta.icon}`} style={{ fontSize: 10 }} />
      {role || '—'}
    </span>
  );
}

function AvatarCircle({ user, size = 36 }) {
  const initials = String(user.name || user.username || 'AD').slice(0, 2).toUpperCase();
  const key = String(user.role || '').trim().toLowerCase();
  const color = ROLE_META[key]?.color || theme.navy;
  const bg = ROLE_META[key]?.bg || '#eaf0fb';
  if (user.avatar_url) {
    return (
      <img src={user.avatar_url} alt={user.name}
        style={{ width: size, height: size, minWidth: size, minHeight: size, flexShrink: 0, borderRadius: '50%', objectFit: 'cover', border: `2px solid ${color}30` }} />
    );
  }
  return (
    <span style={{
      width: size, height: size, borderRadius: '50%', background: bg, color,
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
      fontWeight: 700, fontSize: size * 0.36, border: `2px solid ${color}20`, flexShrink: 0,
    }}>{initials}</span>
  );
}

function PasswordField({ label, value, onChange, placeholder }) {
  const [visible, setVisible] = useState(false);
  const inputId = 'field_' + String(label || '').toLowerCase().replace(/[^a-z0-9]/g, '_').replace(/_+/g, '_').replace(/^_+|_+$/g, '');
  return (
    <div>
      <label htmlFor={inputId} style={{ display: 'block', fontSize: 12, fontWeight: 700, color: theme.text2, textTransform: 'uppercase', letterSpacing: '.6px', marginBottom: 6 }}>{label}</label>
      <div style={{ position: 'relative' }}>
        <input
          id={inputId}
          name={inputId}
          type={visible ? 'text' : 'password'}
          value={value ?? ''}
          placeholder={placeholder}
          onChange={(e) => onChange(e.target.value)}
          autoComplete="new-password"
          style={fieldStyle}
        />
        <button type="button" onClick={() => setVisible(v => !v)}
          style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: theme.text3, fontSize: 13 }}>
          <i className={`fas ${visible ? 'fa-eye-slash' : 'fa-eye'}`} />
        </button>
      </div>
    </div>
  );
}

const fieldStyle = {
  width: '100%', padding: '9px 12px', border: `1px solid ${theme.border}`,
  borderRadius: 8, fontSize: 13, color: theme.text, background: '#fff',
  outline: 'none', boxSizing: 'border-box', transition: 'border-color .2s',
  fontFamily: 'inherit',
};

function Field({ label, value, onChange, type = 'text', placeholder }) {
  const inputId = 'field_' + String(label || '').toLowerCase().replace(/[^a-z0-9]/g, '_').replace(/_+/g, '_').replace(/^_+|_+$/g, '');
  return (
    <div>
      <label htmlFor={inputId} style={{ display: 'block', fontSize: 12, fontWeight: 700, color: theme.text2, textTransform: 'uppercase', letterSpacing: '.6px', marginBottom: 6 }}>{label}</label>
      <input id={inputId} name={inputId} type={type} value={value ?? ''} placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)} style={fieldStyle} />
    </div>
  );
}

function SelectField({ label, value, onChange, options }) {
  const inputId = 'field_' + String(label || '').toLowerCase().replace(/[^a-z0-9]/g, '_').replace(/_+/g, '_').replace(/^_+|_+$/g, '');
  return (
    <div>
      <label htmlFor={inputId} style={{ display: 'block', fontSize: 12, fontWeight: 700, color: theme.text2, textTransform: 'uppercase', letterSpacing: '.6px', marginBottom: 6 }}>{label}</label>
      <select id={inputId} name={inputId} value={value ?? ''} onChange={(e) => onChange(e.target.value)}
        style={{ ...fieldStyle, appearance: 'none', backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%235a6478' stroke-width='2'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 12px center', paddingRight: 36 }}>
        {options.map(o => <option key={o.value ?? o} value={o.value ?? o}>{o.label ?? o}</option>)}
      </select>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────
   System Settings Tab
   ───────────────────────────────────────────────────────── */
function SystemSettingsTab() {
  const { settings, updateSettings, loading: settingsLoading } = useSettings();
  const [form, setForm] = useState(null);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null);
  const [showPre2023, setShowPre2023] = useState(false);
  const [showMcPre2023, setShowMcPre2023] = useState(false);

  useEffect(() => {
    if (!settingsLoading && settings) {
      setForm({
        vat_rate: ((settings.vat_rate ?? 0.18) * 100).toFixed(2),
        sscl_rate: ((settings.sscl_rate ?? 0.025) * 100).toFixed(3),
        mc_category_rates: JSON.parse(JSON.stringify(settings.mc_category_rates ?? {})),
        mc_rates_pre2023: JSON.parse(JSON.stringify(settings.mc_rates_pre2023 ?? [])),
        mcom_rates_2023: JSON.parse(JSON.stringify(settings.mcom_rates_2023 ?? [])),
        mcom_rates_pre2023: JSON.parse(JSON.stringify(settings.mcom_rates_pre2023 ?? [])),
        nhda_mcom_rate: settings.nhda_mcom_rate ?? 250,
        mc_gov_nhda_pre2023_rate: settings.mc_gov_nhda_pre2023_rate ?? 500,
        mcom_gov_nhda_pre2023_rate: settings.mcom_gov_nhda_pre2023_rate ?? 250,
      });
    }
  }, [settings, settingsLoading]);

  function showToast(msg, type = 'success') {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  }

  async function handleSave() {
    setSaving(true);
    try {
      await updateSettings({
        vat_rate: parseFloat(form.vat_rate) / 100,
        sscl_rate: parseFloat(form.sscl_rate) / 100,
        mc_category_rates: form.mc_category_rates,
        mc_rates_pre2023: form.mc_rates_pre2023,
        mcom_rates_2023: form.mcom_rates_2023,
        mcom_rates_pre2023: form.mcom_rates_pre2023,
        nhda_mcom_rate: Number(form.nhda_mcom_rate),
        mc_gov_nhda_pre2023_rate: Number(form.mc_gov_nhda_pre2023_rate),
        mcom_gov_nhda_pre2023_rate: Number(form.mcom_gov_nhda_pre2023_rate),
      });
      showToast('Settings saved successfully.');
    } catch (e) {
      showToast(e.message || 'Failed to save settings', 'error');
    } finally {
      setSaving(false);
    }
  }

  if (!form) return (
    <div style={{ padding: 40, textAlign: 'center', color: theme.text3 }}>
      <i className="fas fa-spinner fa-spin" style={{ fontSize: 24, marginBottom: 10, display: 'block' }} />
      Loading settings…
    </div>
  );

  const sectionLabel = (title, icon) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, fontWeight: 700, color: theme.navy, textTransform: 'uppercase', letterSpacing: '.7px', borderBottom: `2px solid ${theme.navy}20`, paddingBottom: 8, marginBottom: 16 }}>
      <i className={`fas ${icon}`} style={{ fontSize: 13 }} />
      {title}
    </div>
  );

  const MC_CATEGORY_KEYS = [
    { key: 'government_low', label: 'Government (Low Income)' },
    { key: 'government_middle', label: 'Government (Middle Income)' },
    { key: 'private_normal', label: 'Private (Normal)' },
    { key: 'private_semi_luxury', label: 'Private (Semi-Luxury)' },
    { key: 'private_luxury', label: 'Private (Luxury)' },
  ];

  return (
    <div style={{ padding: 22, display: 'flex', flexDirection: 'column', gap: 32, maxWidth: 1600 }}>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1px 1fr', gap: 40, alignItems: 'stretch' }}>

        {/* MC Settings Form Area (LEFT) */}
        <div>
          <div style={{ fontSize: 16, fontWeight: 700, color: theme.navy, borderBottom: `2px solid ${theme.border}`, paddingBottom: 10, marginBottom: 20 }}>
            Management Corporation (MC) Settings
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 24, padding: '0 8px' }}>
            {/* Tax Rates */}
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: theme.text, textTransform: 'uppercase', marginBottom: 12 }}>Tax Rates</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <div>
                  <label htmlFor="sys_settings_vat_rate" style={{ display: 'block', fontSize: 12, fontWeight: 700, color: theme.text2, textTransform: 'uppercase', letterSpacing: '.6px', marginBottom: 6 }}>VAT Rate (%)</label>
                  <input
                    id="sys_settings_vat_rate"
                    name="sys_settings_vat_rate"
                    style={fieldStyle}
                    type="number"
                    min="0"
                    max="100"
                    step="0.01"
                    value={form.vat_rate}
                    onChange={e => setForm(f => ({ ...f, vat_rate: e.target.value }))}
                  />
                  <div style={{ fontSize: 11, color: theme.text3, marginTop: 4 }}>Currently: {form.vat_rate}% — Applied on (Fee + SSCL)</div>
                </div>
                <div>
                  <label htmlFor="sys_settings_sscl_rate" style={{ display: 'block', fontSize: 12, fontWeight: 700, color: theme.text2, textTransform: 'uppercase', letterSpacing: '.6px', marginBottom: 6 }}>SSCL Rate (%)</label>
                  <input
                    id="sys_settings_sscl_rate"
                    name="sys_settings_sscl_rate"
                    style={fieldStyle}
                    type="number"
                    min="0"
                    max="100"
                    step="0.001"
                    value={form.sscl_rate}
                    onChange={e => setForm(f => ({ ...f, sscl_rate: e.target.value }))}
                  />
                  <div style={{ fontSize: 11, color: theme.text3, marginTop: 4 }}>Currently: {form.sscl_rate}% — Applied on Base Fee</div>
                </div>
              </div>
            </div>

            {/* MC Category Rates */}
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: theme.text, textTransform: 'uppercase', marginBottom: 12 }}>Registration & Renewal Rates (Per Unit / Year)</div>
              <div style={{ fontSize: 12, color: theme.text2, marginBottom: 12 }}>
                These rates are used for both Registration Fees and Renewal Fees. Calculated as: Rate × Units × Months/12.
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
                {MC_CATEGORY_KEYS.map(({ key, label }) => {
                  const inputId = `sys_settings_mc_cat_${key}`;
                  return (
                    <div key={key}>
                      <label htmlFor={inputId} style={{ display: 'block', fontSize: 12, fontWeight: 700, color: theme.text2, textTransform: 'uppercase', letterSpacing: '.6px', marginBottom: 6 }}>{label}</label>
                      <div style={{ position: 'relative' }}>
                        <span style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: theme.text, fontSize: 13, fontWeight: 600 }}>Rs.</span>
                        <input
                          id={inputId}
                          name={inputId}
                          style={{ ...fieldStyle, paddingLeft: 36 }}
                          type="number"
                          min="0"
                          step="1"
                          value={form.mc_category_rates?.[key]?.rate ?? ''}
                          onChange={e => setForm(f => ({
                            ...f,
                            mc_category_rates: {
                              ...f.mc_category_rates,
                              [key]: { ...f.mc_category_rates?.[key], label, rate: Number(e.target.value) },
                            },
                          }))}
                        />
                      </div>
                      <div style={{ fontSize: 11, color: theme.text3, marginTop: 4 }}>per unit / year</div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* MC Gov/NHDA Pre 2023 */}
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: theme.text, textTransform: 'uppercase', marginBottom: 12 }}>Gov/NHDA Flat Rate (Before 2023)</div>
              <div style={{ fontSize: 12, color: theme.text2, marginBottom: 12 }}>
                Flat annual fee for Government and NHDA MC records before 2023.
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
                <div>
                  <label htmlFor="sys_settings_mc_gov_nhda_pre2023_rate" style={{ display: 'block', fontSize: 12, fontWeight: 700, color: theme.text2, textTransform: 'uppercase', letterSpacing: '.6px', marginBottom: 6 }}>MC Gov/NHDA (Flat / Year)</label>
                  <div style={{ position: 'relative' }}>
                    <span style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: theme.text, fontSize: 13, fontWeight: 600 }}>Rs.</span>
                    <input
                      id="sys_settings_mc_gov_nhda_pre2023_rate"
                      name="sys_settings_mc_gov_nhda_pre2023_rate"
                      style={{ ...fieldStyle, paddingLeft: 36 }}
                      type="number"
                      min="0"
                      step="1"
                      value={form.mc_gov_nhda_pre2023_rate ?? 500}
                      onChange={e => setForm(f => ({ ...f, mc_gov_nhda_pre2023_rate: Number(e.target.value) }))}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* MC Rates Pre 2023 */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: theme.text, textTransform: 'uppercase' }}>Renewal Fee Brackets (Before 2023)</div>
                <button
                  onClick={() => setShowMcPre2023(!showMcPre2023)}
                  style={{ background: 'none', border: 'none', color: theme.blue, fontSize: 12, fontWeight: 600, cursor: 'pointer', padding: 0 }}
                >
                  {showMcPre2023 ? 'Hide' : 'Show More'} <i className={`fas fa-chevron-${showMcPre2023 ? 'up' : 'down'}`} style={{ marginLeft: 4 }} />
                </button>
              </div>

              {showMcPre2023 && (
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                    <thead>
                      <tr style={{ background: '#f8fafc' }}>
                        <th style={{ padding: '8px 10px', textAlign: 'left', borderBottom: `1px solid ${theme.border}`, fontWeight: 700, color: theme.text2 }}>Min Units</th>
                        <th style={{ padding: '8px 10px', textAlign: 'left', borderBottom: `1px solid ${theme.border}`, fontWeight: 700, color: theme.text2 }}>Max Units</th>
                        <th style={{ padding: '8px 10px', textAlign: 'left', borderBottom: `1px solid ${theme.border}`, fontWeight: 700, color: theme.text2 }}>Flat Fee (Rs.)</th>
                        <th style={{ padding: '8px 10px', textAlign: 'right', borderBottom: `1px solid ${theme.border}`, fontWeight: 700, color: theme.text2, width: 40 }}></th>
                      </tr>
                    </thead>
                    <tbody>
                      {(form.mc_rates_pre2023 || []).map((row, idx) => {
                        const minId = `mc_pre2023_min_${idx}`;
                        const maxId = `mc_pre2023_max_${idx}`;
                        const feeId = `mc_pre2023_fee_${idx}`;
                        return (
                          <tr key={idx} style={{ borderBottom: `1px solid ${theme.border}` }}>
                            <td style={{ padding: '6px 10px' }}>
                              <input
                                id={minId}
                                name={minId}
                                aria-label={`Row ${idx + 1} Minimum Units`}
                                style={fieldStyle}
                                type="number"
                                min="0"
                                value={row.minUnits ?? ''}
                                onChange={e => setForm(f => {
                                  const arr = [...f.mc_rates_pre2023];
                                  arr[idx] = { ...arr[idx], minUnits: Number(e.target.value) };
                                  return { ...f, mc_rates_pre2023: arr };
                                })}
                              />
                            </td>
                            <td style={{ padding: '6px 10px' }}>
                              <input
                                id={maxId}
                                name={maxId}
                                aria-label={`Row ${idx + 1} Maximum Units`}
                                style={fieldStyle}
                                type="number"
                                min="0"
                                value={row.maxUnits ?? ''}
                                placeholder="null = unlimited"
                                onChange={e => setForm(f => {
                                  const arr = [...f.mc_rates_pre2023];
                                  const v = e.target.value === '' ? null : Number(e.target.value);
                                  arr[idx] = { ...arr[idx], maxUnits: v };
                                  return { ...f, mc_rates_pre2023: arr };
                                })}
                              />
                            </td>
                            <td style={{ padding: '6px 10px' }}>
                              <input
                                id={feeId}
                                name={feeId}
                                aria-label={`Row ${idx + 1} Fee`}
                                style={fieldStyle}
                                type="number"
                                min="0"
                                value={row.fee ?? ''}
                                onChange={e => setForm(f => {
                                  const arr = [...f.mc_rates_pre2023];
                                  arr[idx] = { ...arr[idx], fee: Number(e.target.value) };
                                  return { ...f, mc_rates_pre2023: arr };
                                })}
                              />
                            </td>
                            <td style={{ padding: '6px 10px', textAlign: 'right' }}>
                              <button
                                type="button"
                                onClick={() => setForm(f => ({ ...f, mc_rates_pre2023: f.mc_rates_pre2023.filter((_, i) => i !== idx) }))}
                                style={{ background: 'none', border: 'none', color: theme.red, cursor: 'pointer', fontSize: 13, padding: 4 }}
                                title="Remove Bracket"
                              >
                                <i className="fas fa-trash" />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                  <div style={{ marginTop: 10 }}>
                    <button
                      type="button"
                      onClick={() => setForm(f => ({ ...f, mc_rates_pre2023: [...(f.mc_rates_pre2023 || []), { minUnits: 0, maxUnits: null, fee: 0 }] }))}
                      style={{ ...btnOutline, padding: '4px 10px', fontSize: 12 }}
                    >
                      <i className="fas fa-plus" style={{ marginRight: 4 }} /> Add Bracket
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Vertical Divider */}
        <div style={{ width: 1, background: theme.border, height: '100%' }} />

        {/* M.Com Settings Form Area (RIGHT) */}
        <div>
          <div style={{ fontSize: 16, fontWeight: 700, color: theme.navy, borderBottom: `2px solid ${theme.border}`, paddingBottom: 10, marginBottom: 20 }}>
            Maintenance Company (M.Com) Settings
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 24, padding: '0 8px' }}>
            {/* MCom Rates 2023 */}
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: theme.text, textTransform: 'uppercase', marginBottom: 12 }}>Renewal Fee Brackets (2023 Onwards)</div>
              <div style={{ fontSize: 12, color: theme.text2, marginBottom: 12 }}>
                Flat annual fee per M.Com based on number of units. <strong>SSCL + VAT</strong> are applied on top of these.
              </div>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                  <thead>
                    <tr style={{ background: '#f8fafc' }}>
                      <th style={{ padding: '8px 10px', textAlign: 'left', borderBottom: `1px solid ${theme.border}`, fontWeight: 700, color: theme.text2 }}>Min Units</th>
                      <th style={{ padding: '8px 10px', textAlign: 'left', borderBottom: `1px solid ${theme.border}`, fontWeight: 700, color: theme.text2 }}>Max Units</th>
                      <th style={{ padding: '8px 10px', textAlign: 'left', borderBottom: `1px solid ${theme.border}`, fontWeight: 700, color: theme.text2 }}>Flat Fee (Rs.)</th>
                      <th style={{ padding: '8px 10px', textAlign: 'right', borderBottom: `1px solid ${theme.border}`, fontWeight: 700, color: theme.text2, width: 40 }}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {(form.mcom_rates_2023 || []).map((row, idx) => {
                      const minId = `mcom_2023_min_${idx}`;
                      const maxId = `mcom_2023_max_${idx}`;
                      const feeId = `mcom_2023_fee_${idx}`;
                      return (
                        <tr key={idx} style={{ borderBottom: `1px solid ${theme.border}` }}>
                          <td style={{ padding: '6px 10px' }}>
                            <input
                              id={minId}
                              name={minId}
                              aria-label={`Row ${idx + 1} Minimum Units`}
                              style={fieldStyle}
                              type="number"
                              min="0"
                              value={row.minUnits ?? ''}
                              onChange={e => setForm(f => {
                                const arr = [...f.mcom_rates_2023];
                                arr[idx] = { ...arr[idx], minUnits: Number(e.target.value) };
                                return { ...f, mcom_rates_2023: arr };
                              })}
                            />
                          </td>
                          <td style={{ padding: '6px 10px' }}>
                            <input
                              id={maxId}
                              name={maxId}
                              aria-label={`Row ${idx + 1} Maximum Units`}
                              style={fieldStyle}
                              type="number"
                              min="0"
                              value={row.maxUnits ?? ''}
                              placeholder="null = unlimited"
                              onChange={e => setForm(f => {
                                const arr = [...f.mcom_rates_2023];
                                const v = e.target.value === '' ? null : Number(e.target.value);
                                arr[idx] = { ...arr[idx], maxUnits: v };
                                return { ...f, mcom_rates_2023: arr };
                              })}
                            />
                          </td>
                          <td style={{ padding: '6px 10px' }}>
                            <input
                              id={feeId}
                              name={feeId}
                              aria-label={`Row ${idx + 1} Fee`}
                              style={fieldStyle}
                              type="number"
                              min="0"
                              value={row.fee ?? ''}
                              onChange={e => setForm(f => {
                                const arr = [...f.mcom_rates_2023];
                                arr[idx] = { ...arr[idx], fee: Number(e.target.value) };
                                return { ...f, mcom_rates_2023: arr };
                              })}
                            />
                          </td>
                          <td style={{ padding: '6px 10px', textAlign: 'right' }}>
                            <button
                              type="button"
                              onClick={() => setForm(f => ({ ...f, mcom_rates_2023: f.mcom_rates_2023.filter((_, i) => i !== idx) }))}
                              style={{ background: 'none', border: 'none', color: theme.red, cursor: 'pointer', fontSize: 13, padding: 4 }}
                              title="Remove Bracket"
                            >
                              <i className="fas fa-trash" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                <div style={{ marginTop: 10 }}>
                  <button
                    type="button"
                    onClick={() => setForm(f => ({ ...f, mcom_rates_2023: [...(f.mcom_rates_2023 || []), { minUnits: 0, maxUnits: null, fee: 0 }] }))}
                    style={{ ...btnOutline, padding: '4px 10px', fontSize: 12 }}
                  >
                    <i className="fas fa-plus" style={{ marginRight: 4 }} /> Add Bracket
                  </button>
                </div>
              </div>
            </div>

            {/* MCom Gov/NHDA Pre 2023 */}
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: theme.text, textTransform: 'uppercase', marginBottom: 12 }}>Gov/NHDA Flat Rate (Before 2023)</div>
              <div style={{ fontSize: 12, color: theme.text2, marginBottom: 12 }}>
                Flat annual fee for Government and NHDA M.Com records before 2023.
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
                <div>
                  <label htmlFor="sys_settings_mcom_gov_nhda_pre2023_rate" style={{ display: 'block', fontSize: 12, fontWeight: 700, color: theme.text2, textTransform: 'uppercase', letterSpacing: '.6px', marginBottom: 6 }}>M.Com Gov/NHDA (Flat / Year)</label>
                  <div style={{ position: 'relative' }}>
                    <span style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: theme.text, fontSize: 13, fontWeight: 600 }}>Rs.</span>
                    <input
                      id="sys_settings_mcom_gov_nhda_pre2023_rate"
                      name="sys_settings_mcom_gov_nhda_pre2023_rate"
                      style={{ ...fieldStyle, paddingLeft: 36 }}
                      type="number"
                      min="0"
                      step="1"
                      value={form.mcom_gov_nhda_pre2023_rate ?? 250}
                      onChange={e => setForm(f => ({ ...f, mcom_gov_nhda_pre2023_rate: Number(e.target.value) }))}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* MCom Rates Pre 2023 */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: theme.text, textTransform: 'uppercase' }}>Renewal Fee Brackets (Before 2023)</div>
                <button
                  onClick={() => setShowPre2023(!showPre2023)}
                  style={{ background: 'none', border: 'none', color: theme.blue, fontSize: 12, fontWeight: 600, cursor: 'pointer', padding: 0 }}
                >
                  {showPre2023 ? 'Hide' : 'Show More'} <i className={`fas fa-chevron-${showPre2023 ? 'up' : 'down'}`} style={{ marginLeft: 4 }} />
                </button>
              </div>

              {showPre2023 && (
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                    <thead>
                      <tr style={{ background: '#f8fafc' }}>
                        <th style={{ padding: '8px 10px', textAlign: 'left', borderBottom: `1px solid ${theme.border}`, fontWeight: 700, color: theme.text2 }}>Min Units</th>
                        <th style={{ padding: '8px 10px', textAlign: 'left', borderBottom: `1px solid ${theme.border}`, fontWeight: 700, color: theme.text2 }}>Max Units</th>
                        <th style={{ padding: '8px 10px', textAlign: 'left', borderBottom: `1px solid ${theme.border}`, fontWeight: 700, color: theme.text2 }}>Flat Fee (Rs.)</th>
                        <th style={{ padding: '8px 10px', textAlign: 'right', borderBottom: `1px solid ${theme.border}`, fontWeight: 700, color: theme.text2, width: 40 }}></th>
                      </tr>
                    </thead>
                    <tbody>
                      {(form.mcom_rates_pre2023 || []).map((row, idx) => {
                        const minId = `mcom_pre2023_min_${idx}`;
                        const maxId = `mcom_pre2023_max_${idx}`;
                        const feeId = `mcom_pre2023_fee_${idx}`;
                        return (
                          <tr key={idx} style={{ borderBottom: `1px solid ${theme.border}` }}>
                            <td style={{ padding: '6px 10px' }}>
                              <input
                                id={minId}
                                name={minId}
                                aria-label={`Row ${idx + 1} Minimum Units`}
                                style={fieldStyle}
                                type="number"
                                min="0"
                                value={row.minUnits ?? ''}
                                onChange={e => setForm(f => {
                                  const arr = [...f.mcom_rates_pre2023];
                                  arr[idx] = { ...arr[idx], minUnits: Number(e.target.value) };
                                  return { ...f, mcom_rates_pre2023: arr };
                                })}
                              />
                            </td>
                            <td style={{ padding: '6px 10px' }}>
                              <input
                                id={maxId}
                                name={maxId}
                                aria-label={`Row ${idx + 1} Maximum Units`}
                                style={fieldStyle}
                                type="number"
                                min="0"
                                value={row.maxUnits ?? ''}
                                placeholder="null = unlimited"
                                onChange={e => setForm(f => {
                                  const arr = [...f.mcom_rates_pre2023];
                                  const v = e.target.value === '' ? null : Number(e.target.value);
                                  arr[idx] = { ...arr[idx], maxUnits: v };
                                  return { ...f, mcom_rates_pre2023: arr };
                                })}
                              />
                            </td>
                            <td style={{ padding: '6px 10px' }}>
                              <input
                                id={feeId}
                                name={feeId}
                                aria-label={`Row ${idx + 1} Fee`}
                                style={fieldStyle}
                                type="number"
                                min="0"
                                value={row.fee ?? ''}
                                onChange={e => setForm(f => {
                                  const arr = [...f.mcom_rates_pre2023];
                                  arr[idx] = { ...arr[idx], fee: Number(e.target.value) };
                                  return { ...f, mcom_rates_pre2023: arr };
                                })}
                              />
                            </td>
                            <td style={{ padding: '6px 10px', textAlign: 'right' }}>
                              <button
                                type="button"
                                onClick={() => setForm(f => ({ ...f, mcom_rates_pre2023: f.mcom_rates_pre2023.filter((_, i) => i !== idx) }))}
                                style={{ background: 'none', border: 'none', color: theme.red, cursor: 'pointer', fontSize: 13, padding: 4 }}
                                title="Remove Bracket"
                              >
                                <i className="fas fa-trash" />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                  <div style={{ marginTop: 10 }}>
                    <button
                      type="button"
                      onClick={() => setForm(f => ({ ...f, mcom_rates_pre2023: [...(f.mcom_rates_pre2023 || []), { minUnits: 0, maxUnits: null, fee: 0 }] }))}
                      style={{ ...btnOutline, padding: '4px 10px', fontSize: 12 }}
                    >
                      <i className="fas fa-plus" style={{ marginRight: 4 }} /> Add Bracket
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Save button */}
      <div style={{ display: 'flex', justifyContent: 'flex-start', gap: 10, marginTop: 10 }}>
        <button style={btnPrimary} onClick={handleSave} disabled={saving}>
          <i className={`fas ${saving ? 'fa-spinner fa-spin' : 'fa-save'}`} />
          {saving ? 'Saving…' : 'Save All Settings'}
        </button>
      </div>

      {toast && (
        <div style={{
          position: 'fixed', bottom: 22, right: 22, zIndex: 9999,
          background: '#fff', border: `1px solid ${theme.border}`,
          borderLeft: `4px solid ${toast.type === 'error' ? theme.red : theme.green}`,
          borderRadius: 10, padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 10,
          boxShadow: '0 8px 30px rgba(0,0,0,.12)', minWidth: 260, animation: 'fadeSlideIn .2s ease',
        }}>
          <i className={`fas fa-${toast.type === 'error' ? 'times-circle' : 'check-circle'}`}
            style={{ color: toast.type === 'error' ? theme.red : theme.green, fontSize: 16 }} />
          <span style={{ fontSize: 13, fontWeight: 600, color: theme.text }}>{toast.msg}</span>
        </div>
      )}
    </div>
  );
}


/* ── Roles & Permissions Tab ── */
function SystemRolesTab({ rolesList, loadRoles }) {
  const [modalOpen, setModalOpen] = useState(false);
  const [editingRole, setEditingRole] = useState(null);
  const [formData, setFormData] = useState({ name: '', permissions: {} });
  const [isSaving, setIsSaving] = useState(false);
  const [toast, setToast] = useState(null);
  const confirm = useConfirmDialog();

  const allModules = [
    { id: 'dashboard', label: 'Dashboard', actions: ['view'] },
    { id: 'registration', label: 'Registration Form', actions: ['view', 'create', 'edit', 'delete', 'approve'] },
    { id: 'renewal_approval', label: 'Renewal Approvals', actions: ['view', 'approve'] },
    { id: 'mc', label: 'MC Management', actions: ['view', 'create', 'edit', 'delete', 'approve', 'renewal', 'checklist', 'view_record', 'history', 'receipt'] },
    { id: 'mcom', label: 'M.Com Management', actions: ['view', 'create', 'edit', 'delete', 'approve', 'renewal', 'view_record', 'history'] },
    { id: 'cfiles', label: 'C Files', actions: ['view', 'create', 'edit', 'delete', 'transfer', 'close'] },
    { id: 'complains', label: 'Complaints/Issues', actions: ['view', 'create', 'edit', 'delete', 'transfer', 'close'] },
    { id: 'discussion', label: 'Discussions', actions: ['view', 'create', 'edit', 'delete'] },
    { id: 'notifications', label: 'Notifications', actions: ['view'] },
    { id: 'records', label: 'Records', actions: ['view'] },
    { id: 'customer_history', label: 'Customer History', actions: ['view'] },
    { id: 'reports', label: 'Report Generate', actions: ['view'] },
    { id: 'users', label: 'User & Roles Admin', actions: ['view', 'create', 'edit', 'delete'] },
    { id: 'profile', label: 'My Profile', actions: ['view', 'edit'] }
  ];

  function showToast(msg, type = 'success') {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  }

  function openCreate() {
    setEditingRole(null);
    setFormData({ name: '', permissions: {} });
    setModalOpen(true);
  }

  function openEdit(role) {
    setEditingRole(role);
    let perms = role.permissions || {};
    // Backward compat if it's an array
    if (Array.isArray(perms)) {
      const obj = {};
      perms.forEach(m => obj[m] = ['view']);
      perms = obj;
    }
    setFormData({ name: role.name || '', permissions: perms });
    setModalOpen(true);
  }

  async function handleSave() {
    setIsSaving(true);
    try {
      if (!formData.name.trim()) return showToast('Role name is required.', 'error');
      if (editingRole) {
        await updateRole(editingRole.id, formData);
        showToast('Role updated successfully.');
      } else {
        await createRole(formData);
        showToast('Role created successfully.');
      }
      setModalOpen(false);
      await loadRoles();
    } catch (err) {
      showToast(err.message || 'Failed to save role', 'error');
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDelete(role) {
    if (role.is_system) return showToast('Cannot delete a system role.', 'error');
    const confirmed = await confirm({ title: 'Delete Role', message: `Delete "${role.name}"?`, confirmLabel: 'Delete', cancelLabel: 'Cancel' });
    if (!confirmed) return;
    try {
      await deleteRole(role.id);
      showToast('Role deleted.');
      await loadRoles();
    } catch (err) {
      showToast(err.message || 'Failed to delete role', 'error');
    }
  }

  function togglePermission(moduleId, actionId) {
    setFormData(prev => {
      const currentPerms = { ...(prev.permissions || {}) };
      const moduleActions = currentPerms[moduleId] || [];

      if (moduleActions.includes(actionId)) {
        currentPerms[moduleId] = moduleActions.filter(a => a !== actionId);
        if (currentPerms[moduleId].length === 0) delete currentPerms[moduleId];
      } else {
        currentPerms[moduleId] = [...moduleActions, actionId];
      }
      return { ...prev, permissions: currentPerms };
    });
  }

  return (
    <div style={{ padding: 20 }}>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
        <button style={btnPrimary} onClick={openCreate}><i className="fas fa-plus" /> Add New Role</button>
      </div>
      <div className="cma-table-card-container" style={{ margin: '16px', background: '#fff', border: `1px solid ${theme.border}`, borderRadius: 12, boxShadow: '0 2px 12px rgba(0,0,0,.07)', overflow: 'hidden' }}>
        <div style={{ padding: '10px 14px', borderBottom: `1px solid ${theme.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: theme.text, whiteSpace: 'nowrap' }}>Roles & Permissions</div>
        </div>
        <div style={{ overflowX: 'auto', maxHeight: 600 }}>
          <table className="mc-table">
            <thead style={{ position: 'sticky', top: 0, zIndex: 10 }}>
              <tr>
                <th style={{ ...sharedThStyle, width: '25%' }}>Role Name</th>
                <th style={{ ...sharedThStyle, width: '15%' }}>Type</th>
                <th style={sharedThStyle}>Modules Access</th>
                <th style={{ ...sharedThStyle, width: '15%' }}>Created By</th>
                <th style={{ ...sharedThStyle, textAlign: 'right', width: '120px' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {rolesList.map(role => (
                <tr key={role.id} className="mc-tr">
                  <td style={sharedTdStyle}><RoleBadge role={role.name} /></td>
                  <td style={{ ...sharedTdStyle, color: theme.text2 }}>{role.is_system ? 'System Default' : 'Custom'}</td>
                  <td style={{ ...sharedTdStyle, color: theme.text2, maxWidth: 300, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {Object.keys(role.permissions || {}).length > 0 ?
                      Object.keys(role.permissions).map(p => allModules.find(m => m.id === p)?.label || p).join(', ') : 'None'}
                  </td>
                  <td style={{ ...sharedTdStyle, color: theme.text2 }}>{role.created_by || '—'}</td>
                  <td className="mc-td-actions" style={{ ...sharedTdStyle, textAlign: 'right' }}>
                    <div style={{ display: 'flex', gap: 2, justifyContent: 'flex-end', alignItems: 'center' }}>
                      <ActionBtn icon="fas fa-edit" color={theme.orange} title="Edit" onClick={() => openEdit(role)} />
                      {!role.is_system && <ActionBtn icon="fas fa-trash" color={theme.red} title="Delete" onClick={() => handleDelete(role)} />}
                    </div>
                  </td>
                </tr>
              ))}
              {rolesList.length === 0 && (
                <tr><td colSpan="5" style={{ padding: 40, textAlign: 'center', color: theme.text3 }}>No roles found.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {modalOpen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.45)', zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div style={{ background: '#fff', borderRadius: 16, width: '100%', maxWidth: 1000, maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 24px 64px rgba(0,0,0,.2)' }}>
            <div style={{ padding: '18px 22px', borderBottom: `1px solid ${theme.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'sticky', top: 0, background: '#fff', zIndex: 10 }}>
              <div style={{ fontSize: 15, fontWeight: 700, color: theme.text }}>{editingRole ? 'Edit Role' : 'Create New Role'}</div>
              <button onClick={() => setModalOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 18, color: theme.text3 }}>✕</button>
            </div>
            <div style={{ padding: '20px 22px' }}>
              <Field label="Role Name *" value={formData.name} onChange={v => setFormData(p => ({ ...p, name: v }))} disabled={editingRole?.is_system} />

              <div style={{ marginTop: 20, fontSize: 12, fontWeight: 700, color: theme.navy, textTransform: 'uppercase', letterSpacing: '.7px', marginBottom: 10 }}>Granular Module Permissions</div>

              <div style={{ border: `1px solid ${theme.border}`, borderRadius: 8, overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, minWidth: 1000 }}>
                  <thead>
                    <tr style={{ background: '#f8fafc', borderBottom: `1px solid ${theme.border}` }}>
                      <th style={{ padding: '10px 12px', textAlign: 'left', fontWeight: 600, color: theme.text2 }}>Module</th>
                      <th style={{ padding: '10px 12px', textAlign: 'center', fontWeight: 600, color: theme.text2 }}>View</th>
                      <th style={{ padding: '10px 12px', textAlign: 'center', fontWeight: 600, color: theme.text2 }}>Create</th>
                      <th style={{ padding: '10px 12px', textAlign: 'center', fontWeight: 600, color: theme.text2 }}>Edit</th>
                      <th style={{ padding: '10px 12px', textAlign: 'center', fontWeight: 600, color: theme.text2 }}>Delete</th>
                      <th style={{ padding: '10px 12px', textAlign: 'center', fontWeight: 600, color: theme.text2 }}>Approve</th>
                      <th style={{ padding: '10px 12px', textAlign: 'center', fontWeight: 600, color: theme.blue }}>Transfer</th>
                      <th style={{ padding: '10px 12px', textAlign: 'center', fontWeight: 600, color: theme.green }}>Close</th>
                      <th style={{ padding: '10px 12px', textAlign: 'center', fontWeight: 600, color: '#7c3aed' }}>Checklist</th>
                      <th style={{ padding: '10px 12px', textAlign: 'center', fontWeight: 600, color: theme.green }}>Renewal</th>
                      <th style={{ padding: '10px 12px', textAlign: 'center', fontWeight: 600, color: theme.blue }}>View Record</th>
                      <th style={{ padding: '10px 12px', textAlign: 'center', fontWeight: 600, color: theme.text2 }}>History</th>
                      <th style={{ padding: '10px 12px', textAlign: 'center', fontWeight: 600, color: theme.orange }}>Receipt</th>
                    </tr>
                  </thead>
                  <tbody>
                    {allModules.map(mod => {
                      const modPerms = formData.permissions[mod.id] || [];
                      return (
                        <tr key={mod.id} style={{ borderBottom: `1px solid ${theme.border}` }}>
                          <td style={{ padding: '10px 12px', fontWeight: 500 }}>{mod.label}</td>
                          {['view', 'create', 'edit', 'delete', 'approve', 'transfer', 'close', 'checklist', 'renewal', 'view_record', 'history', 'receipt'].map(action => (
                            <td key={action} style={{ padding: '10px 12px', textAlign: 'center' }}>
                              {mod.actions.includes(action) ? (
                                <input
                                  type="checkbox"
                                  checked={modPerms.includes(action)}
                                  onChange={() => togglePermission(mod.id, action)}
                                  style={{ cursor: 'pointer', width: 16, height: 16, accentColor: action === 'transfer' ? theme.blue : action === 'close' ? theme.green : action === 'checklist' ? '#7c3aed' : action === 'renewal' ? theme.green : undefined }}
                                />
                              ) : (
                                <span style={{ color: '#d1d5db' }}>—</span>
                              )}
                            </td>
                          ))}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

            </div>
            <div style={{ padding: '14px 22px', borderTop: `1px solid ${theme.border}`, display: 'flex', justifyContent: 'flex-end', gap: 10, background: '#fafbfe', position: 'sticky', bottom: 0 }}>
              <button style={btnOutline} onClick={() => setModalOpen(false)}>Cancel</button>
              <button style={btnPrimary} onClick={handleSave} disabled={isSaving}>{isSaving ? 'Saving…' : 'Save Role'}</button>
            </div>
          </div>
        </div>
      )}
      {toast && (
        <div style={{ position: 'fixed', bottom: 22, right: 22, zIndex: 9999, background: '#fff', borderLeft: `4px solid ${toast.type === 'error' ? theme.red : theme.green}`, borderRadius: 10, padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 10, boxShadow: '0 8px 30px rgba(0,0,0,.12)', minWidth: 260 }}>
          <i className={`fas fa-${toast.type === 'error' ? 'times-circle' : 'check-circle'}`} style={{ color: toast.type === 'error' ? theme.red : theme.green, fontSize: 16 }} />
          <span style={{ fontSize: 13, fontWeight: 600, color: theme.text }}>{toast.msg}</span>
        </div>
      )}
    </div>
  );
}

/* ── Main Component ── */

function UserAdmin({ currentUser, onUserUpdated }) {
  const isAdmin = String(currentUser?.role || '').trim().toLowerCase() === 'admin';
  const confirm = useConfirmDialog();

  const [activeTab, setActiveTab] = useState(() => {
    return sessionStorage.getItem('cma_useradmin_activeTab') || 'users';
  }); // 'users' | 'settings'
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('');
  const [formData, setFormData] = useState({ username: '', password: '', name: '', role: 'Admin', department: 'CCU', designation: '', email: '', avatar_url: '' });
  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState(null);
  const [toast, setToast] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [refreshTick, setRefreshTick] = useState(0);
  const [rolesList, setRolesList] = useState([]);
  const [viewerImage, setViewerImage] = useState(null);
  const [viewingUser, setViewingUser] = useState(null);

  const triggerRefresh = useCallback(() => setRefreshTick(t => t + 1), []);
  useAutoRefresh(triggerRefresh, 30000);

  useEffect(() => {
    try {
      sessionStorage.setItem('cma_useradmin_activeTab', activeTab);
    } catch (e) { }
  }, [activeTab]);

  useEffect(() => {
    if (!isAdmin) return;
    loadUsers();
    loadRoles();
  }, [searchTerm, roleFilter, departmentFilter, isAdmin, refreshTick]);

  useEffect(() => () => { if (avatarPreview) URL.revokeObjectURL(avatarPreview); }, [avatarPreview]);

  async function loadRoles() {
    try {
      const rs = await fetchRoles();
      setRolesList(rs || []);
    } catch (err) {
      console.error('Failed to load roles', err);
    }
  }

  async function loadUsers() {
    setLoading(true);
    try {
      const data = await fetchUsers({ q: searchTerm.trim() || undefined, role: roleFilter || undefined, department: departmentFilter || undefined });
      setUsers(data || []);
    } catch (err) {
      showToast(err.message || 'Unable to load users', 'error');
    } finally {
      setLoading(false);
    }
  }

  function showToast(msg, type = 'success') {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  }

  function openCreate() {
    setEditingUser(null);
    setFormData({ username: '', password: '', name: '', role: 'Admin', department: 'CCU', designation: '', email: '', avatar_url: '' });
    setAvatarFile(null); setAvatarPreview(null);
    setModalOpen(true);
  }

  function openEdit(user) {
    setEditingUser(user);
    setFormData({ username: user.username || '', password: '', name: user.name || '', role: user.role || 'Admin', department: user.department || 'CCU', designation: user.designation || '', email: user.email || '', avatar_url: user.avatar_url || '' });
    setAvatarFile(null); setAvatarPreview(user.avatar_url || null);
    setModalOpen(true);
  }

  async function saveUser() {
    setIsSaving(true);
    try {
      const { username, password, name, role, department, designation, email } = formData;
      if (!username.trim()) return showToast('Username is required.', 'error');
      if (!name.trim()) return showToast('Full Name is required.', 'error');
      if (!department.trim()) return showToast('Department is required.', 'error');
      if (!role.trim()) return showToast('Role is required.', 'error');
      if (!editingUser && !password.trim()) return showToast('Password is required for new users.', 'error');

      if (editingUser) {
        const payload = { username: username.trim(), name: name.trim(), role: role.trim(), department: department.trim(), designation: designation.trim(), email: email.trim() || null, avatar_url: String(formData.avatar_url || '').trim() || null };
        if (password.trim()) payload.password = password.trim();
        const updatedUser = await updateUser(editingUser.id, payload);
        let finalUser = updatedUser;
        if (avatarFile) {
          const res = await uploadUserAvatar(editingUser.id, avatarFile);
          finalUser = { ...res.user, avatar_url: res.avatar_url || res.user?.avatar_url || null };
        }
        showToast('User updated successfully.');
        setUsers(prev => prev.map(u => u.id === finalUser.id ? finalUser : u));
        if (onUserUpdated && currentUser && Number(currentUser.id) === Number(finalUser?.id)) onUserUpdated(finalUser);
      } else {
        const createdUser = await createUser({ username: username.trim(), password: password.trim(), name: name.trim(), role: role.trim(), department: department.trim(), designation: designation.trim(), email: email.trim() || null, avatar_url: String(formData.avatar_url || '').trim() || null });
        let finalUser = createdUser;
        if (avatarFile) {
          const res = await uploadUserAvatar(createdUser.id, avatarFile);
          if (res.avatar_url) finalUser.avatar_url = res.avatar_url;
        }
        showToast('User created successfully.');
        setUsers(prev => [...prev.filter(u => u.id !== finalUser.id), finalUser]);
      }
      setModalOpen(false);
      await loadUsers();
    } catch (err) {
      showToast(err.message || 'Failed to save user', 'error');
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDelete(user) {
    const confirmed = await confirm({ title: 'Delete User', message: `Delete "${user.name || user.username}"? This cannot be undone.`, confirmLabel: 'Delete', cancelLabel: 'Cancel' });
    if (!confirmed) return;
    try {
      await deleteUser(user.id);
      showToast('User deleted.');
      await loadUsers();
    } catch (err) {
      showToast(err.message || 'Failed to delete user', 'error');
    }
  }

  const filteredUsers = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    let list = users;
    if (term) list = list.filter(u => [u.username, u.name, u.email].some(v => String(v || '').toLowerCase().includes(term)));
    if (roleFilter) list = list.filter(u => String(u.role || '').toLowerCase() === roleFilter.toLowerCase());
    if (departmentFilter) list = list.filter(u => String(u.department || '').toLowerCase() === departmentFilter.toLowerCase());
    return list;
  }, [users, searchTerm, roleFilter, departmentFilter]);

  /* ── Access Denied ── */
  if (!isAdmin) {
    return (
      <div style={{ padding: 20, background: theme.bg, minHeight: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ background: theme.card, borderRadius: 16, padding: '40px 48px', textAlign: 'center', border: `1px solid ${theme.border}`, boxShadow: '0 4px 20px rgba(0,0,0,.08)', maxWidth: 400 }}>
          <div style={{ width: 64, height: 64, borderRadius: '50%', background: '#fef2f2', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
            <i className="fas fa-lock" style={{ fontSize: 28, color: theme.red }} />
          </div>
          <div style={{ fontSize: 18, fontWeight: 700, color: theme.text, marginBottom: 8 }}>Admin Access Required</div>
          <div style={{ fontSize: 13, color: theme.text2 }}>Only Admin users can access the user management panel.</div>
        </div>
      </div>
    );
  }

  const thStyle = {
    textAlign: 'left', padding: '10px 14px', fontSize: 11, fontWeight: 700,
    color: theme.text3, textTransform: 'uppercase', letterSpacing: '.7px',
    background: '#f8fafc', borderBottom: `1px solid ${theme.border}`,
    whiteSpace: 'nowrap', position: 'sticky', top: 0, zIndex: 1,
  };
  const tdStyle = { padding: '11px 14px', fontSize: 13, color: theme.text, borderBottom: `1px solid ${theme.border}`, verticalAlign: 'middle' };

  const tabs = [
    { key: 'users', label: 'User Management', icon: 'fa-users' },
    { key: 'roles', label: 'Roles & Permissions', icon: 'fa-user-shield' },
    { key: 'settings', label: 'System Settings', icon: 'fa-sliders-h' },
  ];

  return (
    <div style={{ padding: 20, background: theme.bg, minHeight: '100%' }}>
      <style>{`
        @keyframes shimmer { 0%{background-position:200% 0} 100%{background-position:-200% 0} }
        @keyframes fadeSlideIn { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:none} }
        .ua-row:hover { background: #f8fafc !important; }
        .ua-action-btn { background:none; border:none; cursor:pointer; padding:6px 8px; border-radius:7px; font-size:14px; transition:all .15s; }
        .ua-action-btn:hover { background:#f1f5f9; }
        .ua-modal-field:focus { border-color:${theme.navy} !important; box-shadow:0 0 0 3px rgba(26,58,107,.1); }
        .ua-tab { background:none; border:none; cursor:pointer; padding:10px 18px; font-size:13px; font-weight:600; color:${theme.text2}; border-bottom:3px solid transparent; transition:all .18s; display:inline-flex;align-items:center;gap:7px; font-family:inherit; }
        .ua-tab:hover { color:${theme.navy}; }
        .ua-tab.active { color:${theme.navy}; border-bottom-color:${theme.navy}; }
      `}</style>

      {/* Breadcrumb */}
      <div style={{ fontSize: 12, color: '#999', marginBottom: 16 }}>
        <span>Home</span> / <span>User Admin</span>
      </div>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 10 }}>
        <div>
          <h2 style={{ fontSize: 19, fontWeight: 600, margin: 0, color: theme.text }}>Admin Control Panel</h2>
          <p style={{ color: '#999', fontSize: 13, margin: '4px 0 0 0' }}>Manage users, roles, and system-wide payment rate settings</p>
        </div>
        {activeTab === 'users' && (
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
            <button style={btnOutline} onClick={loadUsers} disabled={loading}>
              <i className={`fas ${loading ? 'fa-spinner fa-spin' : 'fa-sync-alt'}`} /> Refresh
            </button>
            <button style={btnPrimary} onClick={openCreate}>
              <i className="fas fa-user-plus" /> Add User
            </button>
          </div>
        )}
      </div>

      {/* ── Tabs ── */}
      <div style={{ background: '#fff', border: `1px solid ${theme.border}`, borderRadius: '12px 12px 0 0', borderBottom: 'none', display: 'flex', gap: 0, padding: '0 8px' }}>
        {tabs.map(tab => (
          <button key={tab.key} className={`ua-tab${activeTab === tab.key ? ' active' : ''}`}
            onClick={() => setActiveTab(tab.key)}>
            <i className={`fas ${tab.icon}`} style={{ fontSize: 13 }} />
            {tab.label}
          </button>
        ))}
      </div>

      <div style={{ background: '#fff', border: `1px solid ${theme.border}`, borderTop: 'none', borderRadius: '0 0 12px 12px', boxShadow: '0 2px 12px rgba(0,0,0,.07)' }}>

        {/* ── Users Tab ── */}
        {activeTab === 'users' && (
          <>
            {/* Summary Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))', gap: 14, marginBottom: 16, padding: '16px 16px 0' }}>
              {[
                { label: 'TOTAL USERS', value: users.length, icon: 'fa-users', color: theme.navy },
                { label: 'TOTAL ROLES', value: rolesList.length, icon: 'fa-user-shield', color: theme.red },
                { label: 'ONLINE USERS', value: users.filter(u => u.is_online).length, icon: 'fa-globe', color: theme.green },
                { label: 'ACTIVE USERS', value: users.filter(u => !u.is_deleted).length, icon: 'fa-user-check', color: theme.orange },
              ].map(({ label, value, icon, color }) => (
                <div key={label} style={{ background: theme.card, borderRadius: 12, padding: 18, border: `1px solid ${theme.border}` }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ fontSize: 24, color: color || theme.blue, opacity: 0.7 }}>
                      <i className={`fas ${icon}`} />
                    </div>
                    <div>
                      <div style={{ fontSize: 11, color: theme.text3, textTransform: 'uppercase', letterSpacing: '.8px', fontWeight: 500 }}>{label}</div>
                      <div style={{ fontSize: 22, fontWeight: 700, color: color || theme.text }}>
                        {loading ? <span style={{ fontSize: 13, color: theme.text3 }}>—</span> : value}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Table Card */}
            <div className="cma-table-card-container" style={{ margin: '0 16px 16px', background: theme.card, borderRadius: 12, border: `1px solid ${theme.border}`, boxShadow: '0 2px 12px rgba(0,0,0,.07)', overflow: 'hidden' }}>

              {/* Toolbar */}
              <div style={{ padding: '10px 14px', borderBottom: `1px solid ${theme.border}`, display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', justifyContent: 'space-between' }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: theme.text, whiteSpace: 'nowrap', marginRight: 4 }}>User Records</div>
                <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap', flex: '1 1 auto', justifyContent: 'flex-end' }}>
                  <div style={{ position: 'relative', flex: '1 1 180px', maxWidth: 260 }}>
                    <i className="fas fa-search" style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#999', fontSize: 12 }} />
                    <input
                      id="admin_search_input"
                      name="admin_search_input"
                      aria-label="Search users"
                      type="text"
                      placeholder="Search…"
                      value={searchTerm}
                      onChange={e => setSearchTerm(e.target.value)}
                      style={{ padding: '5px 8px 5px 28px', height: 30, borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 12, width: '100%', outline: 'none', transition: 'border-color 0.2s', boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.02)' }}
                      onFocus={(e) => e.target.style.borderColor = '#3b82f6'}
                      onBlur={(e) => e.target.style.borderColor = '#cbd5e1'}
                    />
                  </div>
                  <select
                    id="admin_role_filter"
                    name="admin_role_filter"
                    aria-label="Filter by role"
                    value={roleFilter}
                    onChange={e => setRoleFilter(e.target.value)}
                    style={{ padding: '5px 8px', height: 30, borderRadius: 4, border: '1px solid #ddd', fontSize: 12, width: 120 }}
                  >
                    <option value="">All Roles</option>
                    {rolesList.map(r => <option key={r.id} value={r.name}>{r.name}</option>)}
                  </select>
                  <select
                    id="admin_department_filter"
                    name="admin_department_filter"
                    aria-label="Filter by department"
                    value={departmentFilter}
                    onChange={e => setDepartmentFilter(e.target.value)}
                    style={{ padding: '5px 8px', height: 30, borderRadius: 4, border: '1px solid #ddd', fontSize: 12, width: 120 }}
                  >
                    <option value="">All Departments</option>
                    <option value="CCU">CCU</option>
                    <option value="Legal">Legal</option>
                    <option value="Technical">Technical</option>
                    <option value="IT / System">IT / System</option>
                    <option value="Administration">Administration</option>
                  </select>
                </div>
              </div>

              <div style={{ overflowX: 'auto', maxHeight: 600 }}>
                <table className="mc-table">
                  <thead style={{ position: 'sticky', top: 0, zIndex: 10 }}>
                    <tr>
                      <th style={{ ...sharedThStyle, width: '24%' }}>User</th>
                      <th style={{ ...sharedThStyle, width: '14%' }}>Username</th>
                      <th style={{ ...sharedThStyle, width: '13%' }}>Role (Access)</th>
                      <th style={{ ...sharedThStyle, width: '16%' }}>Department</th>
                      <th style={{ ...sharedThStyle, width: '15%' }}>Designation</th>
                      <th style={sharedThStyle}>Email</th>
                      <th style={{ ...sharedThStyle, textAlign: 'right', width: '100px' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading ? (
                      Array.from({ length: 6 }).map((_, i) => (
                        <tr key={i}>
                          {[120, 100, 80, 140, 80].map((w, j) => (
                            <td key={j} style={sharedTdStyle}>
                              <div style={{ height: 12, borderRadius: 6, width: w, background: 'linear-gradient(90deg,#f0f0f0 25%,#e0e0e0 50%,#f0f0f0 75%)', backgroundSize: '200% 100%', animation: 'shimmer 1.5s infinite' }} />
                            </td>
                          ))}
                        </tr>
                      ))
                    ) : filteredUsers.length === 0 ? (
                      <tr>
                        <td colSpan={7} style={{ padding: 40, textAlign: 'center', color: theme.text3 }}>
                          <i className="fas fa-user-slash" style={{ fontSize: 28, display: 'block', marginBottom: 10 }} />
                          No users found.
                        </td>
                      </tr>
                    ) : filteredUsers.map((user, idx) => (
                      <tr key={user.id} className="mc-tr" onClick={() => setViewingUser(user)} style={{ cursor: 'pointer' }}>
                        <td style={{ ...sharedTdStyle, whiteSpace: 'normal' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <div onClick={(e) => { e.stopPropagation(); user.avatar_url && setViewerImage(user.avatar_url); }} style={{ cursor: user.avatar_url ? 'pointer' : 'default' }} title={user.avatar_url ? "Click to view full image" : ""}>
                              <AvatarCircle user={user} size={36} />
                            </div>
                            <div>
                              <div style={{ fontWeight: 500, color: theme.text, fontSize: 13 }}>{user.name || '—'}</div>
                            </div>
                          </div>
                        </td>
                        <td style={{ ...sharedTdStyle, fontSize: 13, color: theme.text2 }}>
                          {user.username}
                        </td>
                        <td style={sharedTdStyle}><RoleBadge role={user.role} /></td>
                        <td style={{ ...sharedTdStyle, fontSize: 12, color: theme.text }}>{user.department || <span style={{ color: theme.text3 }}>—</span>}</td>
                        <td style={{ ...sharedTdStyle, fontSize: 12, color: theme.text2 }}>{user.designation || <span style={{ color: theme.text3 }}>—</span>}</td>
                        <td style={{ ...sharedTdStyle, color: theme.text2, fontSize: 12 }}>{user.email || <span style={{ color: theme.text3 }}>—</span>}</td>
                        <td className="mc-td-actions" style={{ ...sharedTdStyle, textAlign: 'right' }}>
                          <div style={{ display: 'flex', gap: 2, justifyContent: 'flex-end', alignItems: 'center' }}>
                            <ActionBtn icon="fas fa-edit" color={theme.orange} title="Edit user" onClick={(e) => { e.stopPropagation(); openEdit(user); }} />
                            {currentUser?.id !== user.id && (
                              <ActionBtn icon="fas fa-trash" color={theme.red} title="Delete user" onClick={(e) => { e.stopPropagation(); handleDelete(user); }} />
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}

        {/* ── Roles Tab ── */}
        {activeTab === 'roles' && <SystemRolesTab rolesList={rolesList} loadRoles={loadRoles} />}

        {/* ── Settings Tab ── */}
        {activeTab === 'settings' && <SystemSettingsTab />}
      </div>

      {/* ── View User Modal ── */}
      {viewingUser && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.45)', zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}
          onClick={e => e.target === e.currentTarget && setViewingUser(null)}>
          <div style={{ background: '#fff', borderRadius: 16, width: '100%', maxWidth: 440, boxShadow: '0 24px 64px rgba(0,0,0,.2)', maxHeight: '90vh', overflowY: 'auto', animation: 'fadeSlideIn .2s ease' }}>
            <div style={{ padding: '18px 22px 14px', borderBottom: `1px solid ${theme.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'sticky', top: 0, background: '#fff', zIndex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 38, height: 38, borderRadius: 10, background: theme.navy, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <i className="fas fa-address-card" style={{ color: '#fff', fontSize: 16 }} />
                </div>
                <div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: theme.text }}>User Profile</div>
                  <div style={{ fontSize: 12, color: theme.text2 }}>View user account details</div>
                </div>
              </div>
              <button onClick={() => setViewingUser(null)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 18, color: theme.text3, padding: 4, lineHeight: 1, borderRadius: 6 }}>✕</button>
            </div>
            <div style={{ padding: '24px 22px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <div style={{ width: 96, height: 96, borderRadius: '50%', overflow: 'hidden', border: `3px solid ${theme.border}`, marginBottom: 16, background: '#f8fafc' }}>
                {viewingUser.avatar_url ? (
                  <img src={viewingUser.avatar_url} alt={viewingUser.name} style={{ width: '100%', height: '100%', objectFit: 'cover', cursor: 'pointer' }} onClick={() => setViewerImage(viewingUser.avatar_url)} title="Click to view full image" />
                ) : (
                  <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#eaf0fb', color: theme.navy, fontSize: 32, fontWeight: 700 }}>
                    {String(viewingUser.name || viewingUser.username || 'AD').slice(0, 2).toUpperCase()}
                  </div>
                )}
              </div>
              <div style={{ fontSize: 20, fontWeight: 800, color: theme.text, marginBottom: 4, textAlign: 'center' }}>{viewingUser.name || '—'}</div>
              <div style={{ fontSize: 13, color: theme.text2, marginBottom: 24, textAlign: 'center' }}>@{viewingUser.username}</div>

              <div style={{ width: '100%', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', background: '#f8fafc', padding: '20px', borderRadius: 12, border: `1px solid ${theme.border}` }}>
                <div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: theme.text3, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 }}>Role</div>
                  <RoleBadge role={viewingUser.role} />
                </div>
                <div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: theme.text3, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 }}>Department</div>
                  <div style={{ fontSize: 13, color: theme.text, fontWeight: 600 }}>{viewingUser.department || '—'}</div>
                </div>
                <div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: theme.text3, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 }}>Designation</div>
                  <div style={{ fontSize: 13, color: theme.text, fontWeight: 600 }}>{viewingUser.designation || '—'}</div>
                </div>
                <div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: theme.text3, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 }}>Email</div>
                  <div style={{ fontSize: 13, color: theme.text, fontWeight: 600, wordBreak: 'break-all' }}>{viewingUser.email || '—'}</div>
                </div>
              </div>
            </div>
            <div style={{ padding: '16px 22px', borderTop: `1px solid ${theme.border}`, background: '#f8fafc', display: 'flex', justifyContent: 'flex-end', gap: 10, borderBottomLeftRadius: 16, borderBottomRightRadius: 16 }}>
              <button className="mc-btn-outline" onClick={() => setViewingUser(null)}>Close</button>
              <button className="mc-btn-primary" onClick={() => { setViewingUser(null); openEdit(viewingUser); }}>
                <i className="fas fa-edit" /> Edit User
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal ── */}
      {modalOpen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.45)', zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}
          onClick={e => e.target === e.currentTarget && !isSaving && setModalOpen(false)}>
          <div style={{ background: '#fff', borderRadius: 16, width: '100%', maxWidth: 560, boxShadow: '0 24px 64px rgba(0,0,0,.2)', maxHeight: '90vh', overflowY: 'auto', animation: 'fadeSlideIn .2s ease' }}>

            {/* Modal Header */}
            <div style={{ padding: '18px 22px 14px', borderBottom: `1px solid ${theme.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'sticky', top: 0, background: '#fff', zIndex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 38, height: 38, borderRadius: 10, background: theme.navy, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <i className={`fas ${editingUser ? 'fa-user-edit' : 'fa-user-plus'}`} style={{ color: '#fff', fontSize: 16 }} />
                </div>
                <div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: theme.text }}>{editingUser ? 'Edit User' : 'Add New User'}</div>
                  <div style={{ fontSize: 12, color: theme.text2 }}>{editingUser ? 'Update account details below' : 'Create a new system account'}</div>
                </div>
              </div>
              <button onClick={() => !isSaving && setModalOpen(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 18, color: theme.text3, padding: 4, lineHeight: 1, borderRadius: 6 }}>✕</button>
            </div>

            <div style={{ padding: '20px 22px' }}>
              {/* Avatar Upload */}
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 24 }}>
                <div style={{ position: 'relative' }}>
                  <label htmlFor="user-avatar-upload" style={{ position: 'relative', cursor: 'pointer', display: 'block' }}>
                    <input id="user-avatar-upload" name="user-avatar-upload" type="file" accept="image/*" style={{ display: 'none' }}
                      onChange={e => {
                        const file = e.target.files?.[0] || null;
                        if (avatarPreview && avatarPreview.startsWith('blob:')) URL.revokeObjectURL(avatarPreview);
                        setAvatarFile(file);
                        setAvatarPreview(file ? URL.createObjectURL(file) : formData.avatar_url || null);
                      }} />
                    <div style={{ width: 80, height: 80, borderRadius: '50%', overflow: 'hidden', border: `3px solid ${theme.border}`, background: '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      {avatarPreview
                        ? <img src={avatarPreview} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} onClick={(e) => { e.preventDefault(); e.stopPropagation(); setViewerImage(avatarPreview); }} title="Click to view full image" />
                        : <i className="fas fa-user" style={{ fontSize: 32, color: theme.text3 }} />}
                    </div>
                    <div style={{ position: 'absolute', bottom: 0, right: 0, width: 26, height: 26, borderRadius: '50%', background: theme.navy, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px solid #fff' }}>
                      <i className="fas fa-camera" style={{ color: '#fff', fontSize: 11 }} />
                    </div>
                  </label>
                  {avatarPreview && (
                    <button
                      type="button"
                      onClick={() => {
                        if (avatarPreview && avatarPreview.startsWith('blob:')) URL.revokeObjectURL(avatarPreview);
                        setAvatarFile(null);
                        setAvatarPreview(null);
                        setFormData(p => ({ ...p, avatar_url: '' }));
                        document.getElementById('user-avatar-upload').value = '';
                      }}
                      style={{ position: 'absolute', top: -5, right: -5, background: theme.red, color: '#fff', border: '2px solid #fff', borderRadius: '50%', width: 24, height: 24, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', boxShadow: '0 2px 5px rgba(0,0,0,0.2)' }}
                      title="Remove Image"
                    >
                      <i className="fas fa-times" style={{ fontSize: 12 }} />
                    </button>
                  )}
                </div>
              </div>

              {/* Section: Account */}
              <div style={{ fontSize: 11, fontWeight: 700, color: theme.navy, textTransform: 'uppercase', letterSpacing: '.7px', borderBottom: `1px solid ${theme.border}`, paddingBottom: 6, marginBottom: 14 }}>Account Details</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 20 }}>
                <Field label="Username *" value={formData.username} placeholder="e.g. jdoe" onChange={v => setFormData(p => ({ ...p, username: v }))} />
                <Field label="Full Name *" value={formData.name} placeholder="e.g. John Doe" onChange={v => setFormData(p => ({ ...p, name: v }))} />
                <SelectField label="Department *" value={formData.department}
                  onChange={v => setFormData(p => ({ ...p, department: v }))}
                  options={['CCU', 'Technical', 'Legal', 'IT / System', 'Administration', 'Other']} />
                <Field label="Job Role (Designation)" value={formData.designation} placeholder="e.g. Legal Officer" onChange={v => setFormData(p => ({ ...p, designation: v }))} />
                <SelectField label="System Access Role *" value={formData.role}
                  onChange={v => setFormData(p => ({ ...p, role: v }))}
                  options={rolesList.map(r => r.name)} />
                <Field label="Email" value={formData.email} type="email" placeholder="e.g. john@example.com" onChange={v => setFormData(p => ({ ...p, email: v }))} />
              </div>

              {/* Section: Security */}
              <div style={{ fontSize: 11, fontWeight: 700, color: theme.navy, textTransform: 'uppercase', letterSpacing: '.7px', borderBottom: `1px solid ${theme.border}`, paddingBottom: 6, marginBottom: 14 }}>Security</div>
              <div style={{ marginBottom: 20 }}>
                <PasswordField
                  label={editingUser ? 'New Password (leave blank to keep current)' : 'Password *'}
                  value={formData.password}
                  placeholder={editingUser ? 'Leave blank to keep current password' : 'Enter strong password'}
                  onChange={v => setFormData(p => ({ ...p, password: v }))} />
              </div>
            </div>

            {/* Modal Footer */}
            <div style={{ padding: '14px 22px', borderTop: `1px solid ${theme.border}`, display: 'flex', justifyContent: 'flex-end', gap: 10, background: '#fafbfe' }}>
              <button style={btnOutline} onClick={() => setModalOpen(false)} disabled={isSaving}>Cancel</button>
              <button style={btnPrimary} onClick={saveUser} disabled={isSaving}>
                <i className={`fas ${isSaving ? 'fa-spinner fa-spin' : editingUser ? 'fa-save' : 'fa-user-plus'}`} />
                {isSaving ? 'Saving…' : editingUser ? 'Update User' : 'Create User'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Image Viewer Modal ── */}
      {viewerImage && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 10000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}
          onClick={() => setViewerImage(null)}>
          <img src={viewerImage} alt="Full View" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain', borderRadius: 8, boxShadow: '0 4px 30px rgba(0,0,0,0.5)', animation: 'fadeSlideIn .2s ease' }} onClick={(e) => e.stopPropagation()} />
          <button onClick={() => setViewerImage(null)} style={{ position: 'absolute', top: 20, right: 20, background: 'rgba(255,255,255,0.2)', border: 'none', color: '#fff', fontSize: 24, width: 44, height: 44, borderRadius: '50%', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: '0.2s' }}
            onMouseOver={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.3)'}
            onMouseOut={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.2)'}
            title="Close">
            <i className="fas fa-times"></i>
          </button>
        </div>
      )}

      {/* ── Toast ── */}
      {toast && (
        <div style={{
          position: 'fixed', bottom: 22, right: 22, zIndex: 9999,
          background: '#fff', border: `1px solid ${theme.border}`,
          borderLeft: `4px solid ${toast.type === 'error' ? theme.red : theme.green}`,
          borderRadius: 10, padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 10,
          boxShadow: '0 8px 30px rgba(0,0,0,.12)', minWidth: 260, animation: 'fadeSlideIn .2s ease',
        }}>
          <i className={`fas fa-${toast.type === 'error' ? 'times-circle' : 'check-circle'}`}
            style={{ color: toast.type === 'error' ? theme.red : theme.green, fontSize: 16 }} />
          <span style={{ fontSize: 13, fontWeight: 600, color: theme.text }}>{toast.msg}</span>
        </div>
      )}
    </div>
  );
}

export default UserAdmin;