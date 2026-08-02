import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { fetchUsers, createUser, updateUser, deleteUser, uploadUserAvatar } from '../api';
import { useConfirmDialog } from '../ConfirmDialogContext.jsx';
import { useAutoRefresh } from '../utils/useAutoRefresh';
import { useSettings } from '../SettingsContext.jsx';

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
  purple: '#7c3aed',
  orange: '#f59e0b',
};

const btnBase = {
  display: 'inline-flex', alignItems: 'center', gap: 6,
  padding: '8px 16px', borderRadius: 8, fontSize: 13,
  fontWeight: 600, cursor: 'pointer', border: 'none',
  fontFamily: 'inherit', transition: 'all .18s',
};
const btnPrimary = { ...btnBase, background: theme.navy, color: '#fff' };
const btnOutline = { ...btnBase, background: 'transparent', color: theme.text2, border: `1px solid ${theme.border}` };
const btnDanger  = { ...btnBase, background: '#fef2f2', color: theme.red, border: `1px solid #fecaca` };

const ROLE_META = {
  admin:    { bg: '#eaf0fb', color: theme.navy,   icon: 'fa-shield-alt' },
  ma:       { bg: '#e8f4ec', color: theme.green,  icon: 'fa-user-tie'   },
  agm:      { bg: '#fdeeee', color: theme.red,    icon: 'fa-briefcase'  },
  chairman: { bg: '#f3e8ff', color: theme.purple, icon: 'fa-crown'      },
  dgm:      { bg: '#fff7ed', color: theme.orange, icon: 'fa-user-shield' },
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
  const bg    = ROLE_META[key]?.bg    || '#eaf0fb';
  if (user.avatar_url) {
    return (
      <img src={user.avatar_url} alt={user.name}
        style={{ width: size, height: size, borderRadius: '50%', objectFit: 'cover', border: `2px solid ${color}30` }} />
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

  useEffect(() => {
    if (!settingsLoading && settings) {
      setForm({
        vat_rate: ((settings.vat_rate ?? 0.18) * 100).toFixed(2),
        sscl_rate: ((settings.sscl_rate ?? 0.025) * 100).toFixed(3),
        mc_category_rates: JSON.parse(JSON.stringify(settings.mc_category_rates ?? {})),
        mcom_rates_2023: JSON.parse(JSON.stringify(settings.mcom_rates_2023 ?? [])),
        mcom_rates_pre2023: JSON.parse(JSON.stringify(settings.mcom_rates_pre2023 ?? [])),
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
        mcom_rates_2023: form.mcom_rates_2023,
        mcom_rates_pre2023: form.mcom_rates_pre2023,
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
    <div style={{ padding: 20 }}>
      <style>{`
        .ss-input { width: 100%; padding: 8px 12px; border: 1px solid ${theme.border}; border-radius: 8px; font-size: 13px; color: ${theme.text}; background: #fff; outline: none; box-sizing: border-box; font-family: inherit; transition: border-color .2s; }
        .ss-input:focus { border-color: ${theme.navy}; box-shadow: 0 0 0 3px rgba(26,58,107,.1); }
        .ss-label { display: block; font-size: 11px; font-weight: 700; color: ${theme.text2}; text-transform: uppercase; letter-spacing: .6px; margin-bottom: 5px; }
      `}</style>

      {/* Tax Rates */}
      <div style={{ background: '#fff', border: `1px solid ${theme.border}`, borderRadius: 12, padding: 20, marginBottom: 16, boxShadow: '0 2px 8px rgba(0,0,0,.05)' }}>
        {sectionLabel('Tax Rates', 'fa-percent')}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <div>
            <label htmlFor="sys_settings_vat_rate" className="ss-label">VAT Rate (%)</label>
            <div style={{ position: 'relative' }}>
              <input
                id="sys_settings_vat_rate"
                name="sys_settings_vat_rate"
                className="ss-input"
                type="number"
                min="0"
                max="100"
                step="0.01"
                value={form.vat_rate}
                onChange={e => setForm(f => ({ ...f, vat_rate: e.target.value }))}
              />
              <span style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', color: theme.text3, fontSize: 12 }}>%</span>
            </div>
            <div style={{ fontSize: 11, color: theme.text3, marginTop: 4 }}>Currently: {form.vat_rate}% — Applied on (Fee + SSCL)</div>
          </div>
          <div>
            <label htmlFor="sys_settings_sscl_rate" className="ss-label">SSCL Rate (%)</label>
            <div style={{ position: 'relative' }}>
              <input
                id="sys_settings_sscl_rate"
                name="sys_settings_sscl_rate"
                className="ss-input"
                type="number"
                min="0"
                max="100"
                step="0.001"
                value={form.sscl_rate}
                onChange={e => setForm(f => ({ ...f, sscl_rate: e.target.value }))}
              />
              <span style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', color: theme.text3, fontSize: 12 }}>%</span>
            </div>
            <div style={{ fontSize: 11, color: theme.text3, marginTop: 4 }}>Currently: {form.sscl_rate}% — Applied on Base Fee</div>
          </div>
        </div>
      </div>

      {/* MC Category Rates */}
      <div style={{ background: '#fff', border: `1px solid ${theme.border}`, borderRadius: 12, padding: 20, marginBottom: 16, boxShadow: '0 2px 8px rgba(0,0,0,.05)' }}>
        {sectionLabel('MC Registration & Renewal Rates (Per Unit / Year)', 'fa-building')}
        <div style={{ fontSize: 12, color: theme.text2, marginBottom: 12, background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 8, padding: '8px 12px' }}>
          <i className="fas fa-info-circle" style={{ color: '#3b82f6', marginRight: 6 }} />
          These rates are used for both Registration Fees and Renewal Fees. Calculated as: Rate × Units × Months/12.
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
          {MC_CATEGORY_KEYS.map(({ key, label }) => {
            const inputId = `sys_settings_mc_cat_${key}`;
            return (
              <div key={key} style={{ background: '#f8fafc', borderRadius: 10, padding: 12, border: `1px solid ${theme.border}` }}>
                <label htmlFor={inputId} className="ss-label">{label}</label>
                <div style={{ position: 'relative' }}>
                  <span style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: theme.text3, fontSize: 12 }}>Rs.</span>
                  <input
                    id={inputId}
                    name={inputId}
                    className="ss-input"
                    type="number"
                    min="0"
                    step="1"
                    style={{ paddingLeft: 36 }}
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
                <div style={{ fontSize: 10, color: theme.text3, marginTop: 3 }}>per unit / year</div>
              </div>
            );
          })}
        </div>
      </div>

      {/* MCom Rates 2023 */}
      <div style={{ background: '#fff', border: `1px solid ${theme.border}`, borderRadius: 12, padding: 20, marginBottom: 16, boxShadow: '0 2px 8px rgba(0,0,0,.05)' }}>
        {sectionLabel('M.Com Renewal Fee Brackets (2023 Onwards)', 'fa-table')}
        <div style={{ fontSize: 12, color: theme.text2, marginBottom: 12, background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 8, padding: '8px 12px' }}>
          <i className="fas fa-info-circle" style={{ color: '#16a34a', marginRight: 6 }} />
          Flat annual fee per M.Com based on number of units. <strong>SSCL + VAT</strong> are applied on top of these.
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
            <thead>
              <tr style={{ background: '#f1f5f9' }}>
                <th style={{ padding: '8px 10px', textAlign: 'left', borderBottom: `1px solid ${theme.border}`, fontWeight: 700, color: theme.text2 }}>Min Units</th>
                <th style={{ padding: '8px 10px', textAlign: 'left', borderBottom: `1px solid ${theme.border}`, fontWeight: 700, color: theme.text2 }}>Max Units</th>
                <th style={{ padding: '8px 10px', textAlign: 'left', borderBottom: `1px solid ${theme.border}`, fontWeight: 700, color: theme.text2 }}>Flat Fee (Rs.)</th>
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
                        className="ss-input"
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
                        className="ss-input"
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
                        className="ss-input"
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
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* MCom Rates Pre 2023 */}
      <div style={{ background: '#fff', border: `1px solid ${theme.border}`, borderRadius: 12, padding: 20, marginBottom: 20, boxShadow: '0 2px 8px rgba(0,0,0,.05)' }}>
        {sectionLabel('M.Com Renewal Fee Brackets (Before 2023)', 'fa-history')}
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
            <thead>
              <tr style={{ background: '#f1f5f9' }}>
                <th style={{ padding: '8px 10px', textAlign: 'left', borderBottom: `1px solid ${theme.border}`, fontWeight: 700, color: theme.text2 }}>Min Units</th>
                <th style={{ padding: '8px 10px', textAlign: 'left', borderBottom: `1px solid ${theme.border}`, fontWeight: 700, color: theme.text2 }}>Max Units</th>
                <th style={{ padding: '8px 10px', textAlign: 'left', borderBottom: `1px solid ${theme.border}`, fontWeight: 700, color: theme.text2 }}>Flat Fee (Rs.)</th>
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
                        className="ss-input"
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
                        className="ss-input"
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
                        className="ss-input"
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
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Save button */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
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
  const [formData, setFormData] = useState({ username: '', password: '', name: '', role: 'Admin', email: '', avatar_url: '' });
  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState(null);
  const [toast, setToast] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [refreshTick, setRefreshTick] = useState(0);

  const triggerRefresh = useCallback(() => setRefreshTick(t => t + 1), []);
  useAutoRefresh(triggerRefresh, 30000);

  useEffect(() => {
    try {
      sessionStorage.setItem('cma_useradmin_activeTab', activeTab);
    } catch (e) {}
  }, [activeTab]);

  useEffect(() => {
    if (!isAdmin) return;
    loadUsers();
  }, [searchTerm, roleFilter, isAdmin, refreshTick]);

  useEffect(() => () => { if (avatarPreview) URL.revokeObjectURL(avatarPreview); }, [avatarPreview]);

  async function loadUsers() {
    setLoading(true);
    try {
      const data = await fetchUsers({ q: searchTerm.trim() || undefined, role: roleFilter || undefined });
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
    setFormData({ username: '', password: '', name: '', role: 'Admin', email: '', avatar_url: '' });
    setAvatarFile(null); setAvatarPreview(null);
    setModalOpen(true);
  }

  function openEdit(user) {
    setEditingUser(user);
    setFormData({ username: user.username || '', password: '', name: user.name || '', role: user.role || 'Admin', email: user.email || '', avatar_url: user.avatar_url || '' });
    setAvatarFile(null); setAvatarPreview(user.avatar_url || null);
    setModalOpen(true);
  }

  async function saveUser() {
    setIsSaving(true);
    try {
      const { username, password, name, role, email } = formData;
      if (!username.trim() || !name.trim() || !role.trim()) return showToast('Username, name, and role are required.', 'error');
      if (!editingUser && !password.trim()) return showToast('Password is required for new users.', 'error');

      if (editingUser) {
        const payload = { username: username.trim(), name: name.trim(), role: role.trim(), email: email.trim() || null, avatar_url: String(formData.avatar_url || '').trim() || null };
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
        const createdUser = await createUser({ username: username.trim(), password: password.trim(), name: name.trim(), role: role.trim(), email: email.trim() || null, avatar_url: String(formData.avatar_url || '').trim() || null });
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
    return list;
  }, [users, searchTerm, roleFilter]);

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
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(160px,1fr))', gap: 12, padding: '16px 16px 0' }}>
              {[
                { label: 'Total Users', value: users.length, icon: 'fa-users', color: theme.navy },
                { label: 'Admins', value: users.filter(u => u.role?.toLowerCase() === 'admin').length, icon: 'fa-shield-alt', color: theme.navy },
                { label: 'MAs', value: users.filter(u => u.role?.toLowerCase() === 'ma').length, icon: 'fa-user-tie', color: theme.green },
                { label: 'AGMs', value: users.filter(u => u.role?.toLowerCase() === 'agm').length, icon: 'fa-briefcase', color: theme.red },
                { label: 'Others', value: users.filter(u => !['admin','ma','agm'].includes(u.role?.toLowerCase())).length, icon: 'fa-users', color: theme.orange },
              ].map(card => (
                <div key={card.label} style={{ background: '#f8fafc', border: `1px solid ${theme.border}`, borderRadius: 12, padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ width: 38, height: 38, borderRadius: 10, background: `${card.color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <i className={`fas ${card.icon}`} style={{ color: card.color, fontSize: 16 }} />
                  </div>
                  <div>
                    <div style={{ fontSize: 10, color: theme.text3, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.6px' }}>{card.label}</div>
                    <div style={{ fontSize: 22, fontWeight: 700, color: theme.text, lineHeight: 1.2 }}>
                      {loading ? <span style={{ fontSize: 13, color: theme.text3 }}>—</span> : card.value}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Toolbar */}
            <div style={{ padding: '14px 16px', borderBottom: `1px solid ${theme.border}`, display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', justifyContent: 'space-between', marginTop: 14 }}>
              <div style={{ position: 'relative', flex: '1 1 240px', maxWidth: 340 }}>
                <i className="fas fa-search" style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: theme.text3, fontSize: 12 }} />
                <input
                  id="admin_search_input"
                  name="admin_search_input"
                  aria-label="Search users by name, username or email"
                  type="text"
                  placeholder="Search by name, username or email…"
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  style={{ ...fieldStyle, paddingLeft: 32, height: 36 }}
                />
              </div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <select
                  id="admin_role_filter"
                  name="admin_role_filter"
                  aria-label="Filter by role"
                  value={roleFilter}
                  onChange={e => setRoleFilter(e.target.value)}
                  style={{ ...fieldStyle, width: 'auto', height: 36, paddingRight: 28, fontSize: 12 }}
                >
                  <option value="">All Roles</option>
                  <option value="Admin">Admin</option>
                  <option value="MA">MA</option>
                  <option value="AGM">AGM</option>
                  <option value="Chairman">Chairman</option>
                  <option value="DGM">DGM</option>
                </select>
                <span style={{ fontSize: 12, color: theme.text2, whiteSpace: 'nowrap' }}>
                  {loading ? '' : <><strong>{filteredUsers.length}</strong> of <strong>{users.length}</strong> users</>}
                </span>
              </div>
            </div>

            {/* Table */}
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    <th style={thStyle}>User</th>
                    <th style={thStyle}>Username</th>
                    <th style={thStyle}>Role</th>
                    <th style={thStyle}>Email</th>
                    <th style={{ ...thStyle, textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    Array.from({ length: 6 }).map((_, i) => (
                      <tr key={i}>
                        {[120, 100, 80, 140, 80].map((w, j) => (
                          <td key={j} style={tdStyle}>
                            <div style={{ height: 12, borderRadius: 6, width: w, background: 'linear-gradient(90deg,#f0f0f0 25%,#e0e0e0 50%,#f0f0f0 75%)', backgroundSize: '200% 100%', animation: 'shimmer 1.5s infinite' }} />
                          </td>
                        ))}
                      </tr>
                    ))
                  ) : filteredUsers.length === 0 ? (
                    <tr>
                      <td colSpan={5} style={{ padding: 40, textAlign: 'center', color: theme.text3 }}>
                        <i className="fas fa-user-slash" style={{ fontSize: 28, display: 'block', marginBottom: 10 }} />
                        No users found.
                      </td>
                    </tr>
                  ) : filteredUsers.map((user, idx) => (
                    <tr key={user.id} className="ua-row"
                      style={{ background: idx % 2 === 0 ? '#fff' : '#fafbfe', transition: 'background .15s', animation: 'fadeSlideIn .25s ease both', animationDelay: `${idx * 30}ms` }}>
                      <td style={tdStyle}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <AvatarCircle user={user} size={36} />
                          <div>
                            <div style={{ fontWeight: 700, color: theme.text, fontSize: 13 }}>{user.name || '—'}</div>
                            <div style={{ fontSize: 11, color: theme.text3 }}>ID #{user.id}</div>
                          </div>
                        </div>
                      </td>
                      <td style={{ ...tdStyle, fontFamily: 'monospace', fontSize: 12, color: theme.text2 }}>
                        <span style={{ background: '#f1f5f9', padding: '2px 8px', borderRadius: 6 }}>{user.username}</span>
                      </td>
                      <td style={tdStyle}><RoleBadge role={user.role} /></td>
                      <td style={{ ...tdStyle, color: theme.text2, fontSize: 12 }}>{user.email || <span style={{ color: theme.text3 }}>—</span>}</td>
                      <td style={{ ...tdStyle, textAlign: 'right' }}>
                        <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                          <button className="ua-action-btn" title="Edit user" onClick={() => openEdit(user)} style={{ color: theme.blue }}>
                            <i className="fas fa-edit" />
                          </button>
                          {currentUser?.id !== user.id && (
                            <button className="ua-action-btn" title="Delete user" onClick={() => handleDelete(user)} style={{ color: theme.red }}>
                              <i className="fas fa-trash-alt" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}

        {/* ── Settings Tab ── */}
        {activeTab === 'settings' && <SystemSettingsTab />}
      </div>

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
                <label htmlFor="user-avatar-upload" style={{ position: 'relative', cursor: 'pointer', display: 'block' }}>
                  <input id="user-avatar-upload" name="user-avatar-upload" type="file" accept="image/*" style={{ display: 'none' }}
                    onChange={e => {
                      const file = e.target.files?.[0] || null;
                      if (avatarPreview) URL.revokeObjectURL(avatarPreview);
                      setAvatarFile(file);
                      setAvatarPreview(file ? URL.createObjectURL(file) : formData.avatar_url || null);
                    }} />
                  <div style={{ width: 80, height: 80, borderRadius: '50%', overflow: 'hidden', border: `3px solid ${theme.border}`, background: '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {avatarPreview
                      ? <img src={avatarPreview} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      : <i className="fas fa-user" style={{ fontSize: 32, color: theme.text3 }} />}
                  </div>
                  <div style={{ position: 'absolute', bottom: 0, right: 0, width: 26, height: 26, borderRadius: '50%', background: theme.navy, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px solid #fff' }}>
                    <i className="fas fa-camera" style={{ color: '#fff', fontSize: 11 }} />
                  </div>
                </label>
              </div>

              {/* Section: Account */}
              <div style={{ fontSize: 11, fontWeight: 700, color: theme.navy, textTransform: 'uppercase', letterSpacing: '.7px', borderBottom: `1px solid ${theme.border}`, paddingBottom: 6, marginBottom: 14 }}>Account Details</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 20 }}>
                <Field label="Username *" value={formData.username} placeholder="e.g. jdoe" onChange={v => setFormData(p => ({ ...p, username: v }))} />
                <Field label="Full Name *" value={formData.name} placeholder="e.g. John Doe" onChange={v => setFormData(p => ({ ...p, name: v }))} />
                <Field label="Email" value={formData.email} type="email" placeholder="e.g. john@example.com" onChange={v => setFormData(p => ({ ...p, email: v }))} />
                <SelectField label="Role *" value={formData.role}
                  onChange={v => setFormData(p => ({ ...p, role: v }))}
                  options={['Admin','MA','AGM','Chairman','DGM']} />
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