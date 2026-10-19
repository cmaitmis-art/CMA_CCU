import React, { useMemo, useState } from 'react';
import { hasPermission } from '../utils/roleLabel.js';
import { createMC, createNotification, fetchMCsFiltered } from '../api';
import { useConfirmDialog } from '../ConfirmDialogContext.jsx';
import { serializeCouncilMembers } from '../utils/mcManagementUtils.js';
import { useSettings } from '../SettingsContext.jsx';

function Field({ label, children, colSpan, id }) {
  const safeId = useMemo(() => {
    if (id) return id;
    if (!label) return undefined;
    return 'reg_' + String(label)
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '_')
      .replace(/_+/g, '_')
      .replace(/^_+|_+$/g, '');
  }, [label, id]);

  const childWithProps = React.isValidElement(children) && safeId
    ? React.cloneElement(children, { id: safeId, name: safeId })
    : children;

  return (
    <div className="form-group" style={colSpan ? { gridColumn: `span ${colSpan}` } : undefined}>
      {label && <label className="form-label" htmlFor={safeId}>{label}</label>}
      {childWithProps}
    </div>
  );
}

// Facilities that automatically classify a private complex as "Luxury"
const LUXURY_TRIGGER_FIELDS = [
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
// Facilities that classify a private complex as "Semi-Luxury" (if no luxury trigger present)
const SEMI_LUXURY_TRIGGER_FIELDS = ['fac_gym', 'fac_swimming_pool'];

const initialFormState = () => ({
  // Filing Info
  new_file_no: 'CMA/CCU/',
  old_file_no: '',
  reg_date: new Date().toISOString().slice(0, 10),

  // Section 1-3: Basic Info
  name: '',
  plan_no: '',
  address: '',
  email_address: '',

  // Section 4: Parcels
  residential_units: '',
  non_res_shops: '',
  non_res_office: '',
  non_res_hotel: '',

  // Section 5: Services Available
  services_lift: false,
  services_fire_agreement: false,
  services_generator_agreement: false,
  services_insurance: false,

  // Section 6: Facilities Available
  fac_common_parking: false,
  fac_accessory_car_parcel: false,
  fac_roof_top: false,
  fac_gym: false,
  fac_swimming_pool: false,
  fac_penth_house: false,
  fac_restaurant: false,
  fac_super_market: false,
  fac_garden: false,
  fac_sauna: false,
  fac_salon: false,
  fac_golf_tennis: false,
  fac_day_care: false,
  fac_lift: false,
  fac_service_lift: false,
  fac_club_house: false,
  fac_canteen: false,

  // Management Company
  mgmt_company_controlled: false,
  mgmt_company_name: '',
  mgmt_company_contact: '',

  // Registration Category & Fee
  ownership_type: 'private', // 'government' | 'private'
  government_income_level: '', // 'low' | 'middle'
  private_category_override: '', // '' = auto-detect, or 'normal' | 'semi_luxury' | 'luxury'

  // Personnel (Office Bearers)
  secretary: '',
  secretary_unit_no: '',
  secretary_contact: '',
  secretary_email: '',

  treasurer: '',
  treasurer_unit_no: '',
  treasurer_contact: '',
  treasurer_email: '',

  // Council Members (Table I - V)
  council_members: Array.from({ length: 5 }, () => ({ name: '', unit_no: '', contact_no: '' })),

  // Section 7: Written Assurance
  written_assurance_fulfilled: false,
});

export default function RegistrationForm({ currentUser, onNavigate }) {
  const canEdit = hasPermission(currentUser, 'registration', 'edit');
  const canDelete = hasPermission(currentUser, 'registration', 'delete');
  const canCreate = hasPermission(currentUser, 'registration', 'create');
  const canApprove = hasPermission(currentUser, 'registration', 'approve');
  const canViewOnly = !canEdit && !canDelete && !canCreate && !canApprove; // fallback




  const { settings } = useSettings();
  const CATEGORY_RATES = settings.mc_category_rates;
  const SSCL_RATE = settings.sscl_rate;
  const VAT_RATE = settings.vat_rate;

  const auditUserLabel = currentUser?.name && currentUser?.username
    ? `${currentUser.name} (${currentUser.username})`
    : currentUser?.name || currentUser?.username || 'Unknown';

  const [formData, setFormData] = useState(initialFormState());
  const [toast, setToast] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showReceiptView, setShowReceiptView] = useState(false);
  const confirm = useConfirmDialog();

  // Dynamic calculations
  const totalParcels = useMemo(() => {
    const res = parseInt(formData.residential_units) || 0;
    const shops = parseInt(formData.non_res_shops) || 0;
    const office = parseInt(formData.non_res_office) || 0;
    const hotel = parseInt(formData.non_res_hotel) || 0;
    return res + shops + office + hotel;
  }, [formData.residential_units, formData.non_res_shops, formData.non_res_office, formData.non_res_hotel]);

  // Auto-detect the Private sub-category from selected facilities (Normal / Semi-Luxury / Luxury)
  const autoDetectedPrivateCategory = useMemo(() => {
    const hasLuxuryFacility = LUXURY_TRIGGER_FIELDS.some((field) => formData[field]);
    if (hasLuxuryFacility) return 'luxury';
    const hasSemiLuxuryFacility = SEMI_LUXURY_TRIGGER_FIELDS.some((field) => formData[field]);
    if (hasSemiLuxuryFacility) return 'semi_luxury';
    return 'normal';
  }, [formData]);

  // Final category key used for the fee schedule lookup
  const categoryKey = useMemo(() => {
    if (formData.ownership_type === 'government') {
      return formData.government_income_level === 'middle' ? 'government_middle' : 'government_low';
    }
    const privateSub = formData.private_category_override || autoDetectedPrivateCategory;
    return `private_${privateSub}`;
  }, [formData.ownership_type, formData.government_income_level, formData.private_category_override, autoDetectedPrivateCategory]);

  // Fee, SSCL (2.5%) and VAT (18%) breakdown — Fee is prorated by months remaining in the year
  const feeBreakdown = useMemo(() => {
    const categoryInfo = CATEGORY_RATES[categoryKey] || CATEGORY_RATES.private_normal;
    const units = totalParcels || 0;
    const regDate = new Date(formData.reg_date);
    const validDate = !Number.isNaN(regDate.getTime());
    const periodMonths = validDate ? Math.max(1, 12 - regDate.getMonth()) : 12;
    const monthlyFeePerUnit = categoryInfo.rate / 12;
    const fee = monthlyFeePerUnit * units * periodMonths;
    const sscl = fee * SSCL_RATE;
    const vat = (fee + sscl) * VAT_RATE;
    const total = fee + sscl + vat;
    return {
      categoryLabel: categoryInfo.label,
      rate: categoryInfo.rate,
      units,
      periodMonths,
      fee,
      sscl,
      vat,
      total,
    };
  }, [categoryKey, totalParcels, formData.reg_date, CATEGORY_RATES, SSCL_RATE, VAT_RATE]);

  const formatMoney = (n) => (Number(n) || 0).toLocaleString('en-LK', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const handleInputChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleCouncilMemberChange = (index, field, value) => {
    setFormData((prev) => {
      const updated = [...prev.council_members];
      updated[index] = { ...updated[index], [field]: value };
      return { ...prev, council_members: updated };
    });
  };

  const handleClear = async () => {
    const confirmed = await confirm({
      title: 'Clear form',
      message: 'Are you sure you want to clear the form? All unsaved data will be lost.',
      confirmLabel: 'Clear',
      cancelLabel: 'Cancel',
    });
    if (!confirmed) return;
    setFormData(initialFormState());
    showToast('Form cleared', 'info');
  };

  const handlePrint = () => {
    handlePrintReceipt();
  };

  const handlePrintReceipt = () => {
    setShowReceiptView(true);
    // allow the receipt DOM to render before triggering print
    setTimeout(() => {
      window.print();
      setShowReceiptView(false);
    }, 100);
  };

  const handleSave = async (e, printAfterSave = false) => {
    if (e && typeof e.preventDefault === 'function') e.preventDefault();

    // Validations
    if (!formData.name.trim()) {
      showToast('Title name of the Management Corporation is required.', 'error');
      return;
    }
    if (!formData.written_assurance_fulfilled) {
      showToast('You must confirm the Written Assurance from the Secretary to proceed.', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      // Auto-generate file number if empty
      const finalFileNo = formData.new_file_no.trim() || `CMA/REG/${Date.now()}`;

      const shops = parseInt(formData.non_res_shops) || 0;
      const office = parseInt(formData.non_res_office) || 0;
      const hotel = parseInt(formData.non_res_hotel) || 0;
      const nonResUnits = shops + office + hotel;

      const invoiceNumber = finalFileNo.replace(/\s+/g, '');
      const invoicePeriodEnd = (() => {
        const d = new Date(formData.reg_date);
        if (Number.isNaN(d.getTime())) return null;
        return `${d.getFullYear()}-12-31`;
      })();

      const payload = {
        ...formData,
        new_file_no: finalFileNo,
        file_no: finalFileNo,
        name: formData.name.trim(),
        management_corporation_name: formData.name.trim(),
        units: totalParcels,
        residential_units: parseInt(formData.residential_units) || null,
        non_residential_units: nonResUnits,
        // map compatibility columns
        residential: parseInt(formData.residential_units) || null,
        non_residential: nonResUnits,
        // serialize council members to string
        council_members: serializeCouncilMembers(formData.council_members),
        // Registration category & fee calculation (auto-derived from facilities / income level)
        category: feeBreakdown.categoryLabel,
        fee_rate_per_unit: feeBreakdown.rate,
        fee_amount: feeBreakdown.fee,
        sscl_amount: feeBreakdown.sscl,
        vat_amount: feeBreakdown.vat,
        total_amount: feeBreakdown.total,
        // Renewal period runs to 31 December of the registration year (matches CMA's
        // actual receipt period, e.g. "01.06.2026 – 31.12.2026"), not reg_date + 365 days
        next_renewal_date: invoicePeriodEnd,
        invoice: {
          invoice_number: invoiceNumber,
          invoice_date: formData.reg_date,
          registration_date: formData.reg_date,
          period_start: formData.reg_date,
          period_end: invoicePeriodEnd,
          due_date: invoicePeriodEnd,
        },
        // New registrations always start as Pending until verified by CCU
        status: 'Pending',
        created_by: auditUserLabel,
        modified_by: auditUserLabel,
        user_name: auditUserLabel,
      };

      const createdMc = await createMC(payload);

      // Notify AGM via real-time popup notification
      try {
        const today = new Date().toLocaleDateString('en-GB');
        let pendingCountStr = '';
        try {
          const pd = await fetchMCsFiltered({ status: 'Pending', limit: 1 });
          if (pd && typeof pd.total === 'number') pendingCountStr = `\nTotal Pending: ${pd.total}`;
        } catch (e) { }

        const created = await createNotification({
          type: 'info',
          title: 'New MC Registration — Approval Required',
          message: `File No: ${finalFileNo} | Name: "${formData.name.trim()}" | Submitted: ${today}. Pending AGM approval.${pendingCountStr}`,
          target_role: 'AGM',
          link: `mc:pending`,
        });
        try {
          const detail = created?.notification || created;
          if (detail) window.dispatchEvent(new CustomEvent('cma:new-notification', { detail }));
        } catch (evErr) { }
      } catch (err) {
        console.error('Failed to notify AGM:', err);
      }
      showToast('Application submitted and saved successfully! ✅');
      if (printAfterSave) {
        handlePrintReceipt();
      }
      setFormData(initialFormState());
      if (onNavigate) {
        setTimeout(() => {
          onNavigate('mc');
        }, 800);
      }
    } catch (err) {
      console.error(err);
      showToast(err.message || 'Failed to save application to the database.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className={`cma-page${showReceiptView ? ' receipt-print-mode' : ''}`}>
      {toast && (
        <div
          style={{
            position: 'fixed',
            top: 70,
            right: 22,
            zIndex: 2000,
            background: toast.type === 'success' ? '#f0fdf4' : toast.type === 'error' ? '#fef2f2' : '#eff6ff',
            border: '1px solid var(--border)',
            borderLeft: `4px solid ${toast.type === 'success' ? 'var(--green)' : toast.type === 'error' ? 'var(--red)' : 'var(--navy)'}`,
            padding: '12px 14px',
            borderRadius: 10,
            boxShadow: '0 8px 30px rgba(0,0,0,.12)',
            color: 'var(--text)',
            fontSize: 13,
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}
        >
          <i className={`fas fa-${toast.type === 'success' ? 'check-circle' : toast.type === 'error' ? 'times-circle' : 'info-circle'}`}
            style={{ color: toast.type === 'success' ? 'var(--green)' : toast.type === 'error' ? 'var(--red)' : 'var(--navy)' }}></i>
          {toast.msg}
        </div>
      )}

      <style>
        {`
          /* ===== Step-by-step section system ===== */
          .reg-form-flow{counter-reset:reg-step;display:flex;flex-direction:column;gap:18px}

          .reg-section{
            position:relative;
            background:var(--card);
            border-radius:14px;
            padding:24px 26px 24px 30px;
            border:1px solid var(--border);
            box-shadow:0 1px 2px rgba(16,24,40,.04);
            counter-increment:reg-step;
          }
          .reg-section::before{
            content:"";
            position:absolute;
            left:0; top:14px; bottom:14px;
            width:4px;
            border-radius:0 4px 4px 0;
            background:linear-gradient(180deg,var(--navy) 0%,var(--navy2) 100%);
            opacity:.85;
          }
          .reg-section.no-step::before{ opacity:.35 }

          .reg-section-title{
            font-size:14.5px;
            font-weight:700;
            color:var(--navy);
            margin-bottom:18px;
            display:flex;
            align-items:center;
            gap:10px;
            padding-bottom:12px;
            border-bottom:1px dashed var(--border);
          }
          .reg-section-title .step-badge{
            flex:0 0 auto;
            width:24px; height:24px;
            border-radius:50%;
            background:var(--navy);
            color:#fff;
            font-size:11.5px;
            font-weight:700;
            display:flex;
            align-items:center;
            justify-content:center;
            font-family:inherit;
          }
          .reg-section-title .step-badge::after{
            content: counter(reg-step);
          }
          .reg-section-title i.fas{ color:var(--gold,#b8860b); font-size:13px }
          .reg-section-title .title-text{ flex:1 }
          .reg-section-title .optional-tag{
            font-size:10.5px;
            font-weight:600;
            text-transform:uppercase;
            letter-spacing:.5px;
            color:var(--text2);
            background:var(--bg);
            border:1px solid var(--border);
            padding:3px 8px;
            border-radius:20px;
          }

          .facility-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(210px,1fr));gap:10px}
          .checkbox-item{
            display:flex;align-items:center;gap:9px;font-size:13px;cursor:pointer;
            padding:11px 13px;border:1px solid var(--border);border-radius:9px;background:var(--bg);
            transition:background .15s,border-color .15s;
          }
          .checkbox-item:hover{background:#eef2f9;border-color:var(--navy2,var(--navy))}
          .checkbox-item input{cursor:pointer;accent-color:var(--navy);width:16px;height:16px;flex:0 0 auto}
          .checkbox-item:has(input:checked){
            background:#eef4ff;
            border-color:var(--navy);
            font-weight:600;
            color:var(--navy);
          }

          .page-header-banner{
            background:linear-gradient(135deg,var(--navy) 0%,var(--navy2) 100%);
            border-radius:14px;
            padding:22px 26px;
            margin-bottom:24px;
            color:#fff;
            display:flex;
            align-items:center;
            justify-content:space-between;
            gap:16px;
            flex-wrap:wrap;
          }
          .page-header-banner .title{font-family:'Playfair Display',serif;font-size:19px;color:#fff;line-height:1.3}
          .page-header-banner .sub{font-size:12px;color:rgba(255,255,255,.7);margin-top:4px;display:flex;align-items:center;gap:8px}
          .page-header-banner .sub .dot{width:4px;height:4px;border-radius:50%;background:rgba(255,255,255,.5)}

          .reg-footer-actions{
            display:flex;gap:12px;justify-content:flex-end;margin-top:8px;flex-wrap:wrap;
            padding-top:20px;border-top:1px solid var(--border);
          }

          .form-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(230px,1fr));gap:16px 18px}
          .form-group .form-label{
            display:block;font-size:12.5px;font-weight:600;color:var(--text2);margin-bottom:6px;line-height:1.4;
          }

          .sub-section{
            border:1px solid var(--border);border-radius:10px;padding:16px;background:var(--bg);margin-top:10px;
          }
          .sub-section-title{
            font-size:12px;font-weight:700;color:var(--navy);margin-bottom:12px;
            text-transform:uppercase;letter-spacing:.6px;
            display:flex;align-items:center;gap:6px;
          }

          .table-header-cell{padding:11px 10px;font-size:11px;font-weight:700;color:var(--navy);text-transform:uppercase;background:#f8fafc;border-bottom:2px solid var(--border);letter-spacing:.4px}
          .table-data-cell{padding:8px;border-bottom:1px solid var(--border)}

          @media (max-width:640px){
            .reg-section{padding:18px 16px 18px 22px}
            .page-header-banner{padding:18px}
          }

          /* ===== Registration receipt & Official Form (print-only) ===== */
          .print-receipt, .print-official-form { display: none; }
          .receipt-print-mode .page-header-banner,
          .receipt-print-mode .reg-form-flow,
          .receipt-print-mode .reg-footer-actions,
          .receipt-print-mode .btn { display: none !important; }
          .receipt-print-mode .print-receipt,
          .receipt-print-mode .print-official-form { display: block !important; }
          
          @media print {
            @page { size: A4; margin: 5mm; }
            html, body { height: auto !important; overflow: visible !important; background: #fff !important; }
            body * { visibility: hidden !important; }
            .cma-page, .cma-page * { visibility: visible !important; }
            .page-header-banner, .reg-form-flow, .reg-footer-actions, .btn { display: none !important; }
            .print-official-form { display: block !important; }
            .print-receipt { display: block !important; page-break-before: always; margin-top: 15px; }
          }

          .print-official-form {
            max-width: 760px; margin: 0 auto; padding: 0 10px; font-family: 'Times New Roman', Times, serif; color: #000; font-size: 12px; line-height: 1.2;
          }
          .print-official-form .of-head { text-align: center; margin-bottom: 10px; }
          .print-official-form .of-head img { width: 65px; height: auto; margin-bottom: 2px; }
          .print-official-form .of-title { font-size: 15px; font-weight: bold; margin-bottom: 2px; }
          .print-official-form .of-subtitle { font-size: 13px; font-weight: bold; text-decoration: underline; }
          .print-official-form .of-row { display: flex; align-items: flex-end; margin-bottom: 4px; }
          .print-official-form .of-label { font-weight: bold; margin-right: 5px; white-space: nowrap; }
          .print-official-form .of-value { flex: 1; border-bottom: 1px dashed #000; min-height: 14px; font-weight: normal; }
          .print-official-form .of-sub-row { display: flex; align-items: flex-end; margin-bottom: 2px; padding-left: 20px; }
          .print-official-form .of-section-title { font-weight: bold; margin-top: 8px; margin-bottom: 4px; font-size: 12px; }
          .print-official-form .of-grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 2px; padding-left: 20px; }
          .print-official-form .of-checkbox { display: inline-flex; align-items: center; gap: 4px; }
          .print-official-form .of-box { width: 11px; height: 11px; border: 1px solid #000; display: inline-block; text-align: center; line-height: 11px; font-size: 9px; font-weight: bold; }
          .print-official-form .of-table { width: 100%; border-collapse: collapse; margin-top: 4px; margin-bottom: 8px; }
          .print-official-form .of-table th, .print-official-form .of-table td { border: 1px solid #000; padding: 2px 4px; text-align: left; font-size: 11.5px; }
          .print-official-form .of-table th { font-weight: bold; }
          .print-official-form .of-signatures { display: flex; justify-content: space-between; margin-top: 25px; }
          .print-official-form .of-signatures > div { width: 40%; text-align: center; border-top: 1px solid #000; padding-top: 3px; font-size: 12px; }
          .print-receipt{
            max-width:680px;margin:0 auto;padding:24px;font-family:'Times New Roman',serif;color:#111;
          }
          .print-receipt .rc-head{text-align:center;margin-bottom:14px}
          .print-receipt .rc-head .rc-logo img{width:90px;height:auto;margin-bottom:8px}
          .print-receipt .rc-head .rc-title{font-size:17px;font-weight:700}
          .print-receipt .rc-head .rc-sub{font-size:13px}
          .print-receipt .rc-topline{text-align:right;font-size:13px;margin-bottom:6px}
          .print-receipt .rc-regno{font-weight:700}
          .print-receipt .rc-row{font-size:12.5px;margin:8px 0;display:flex;align-items:center;gap:6px}
          .print-receipt .rc-fill-label{white-space:nowrap}
          .print-receipt .rc-fill-line{flex:1;border-bottom:1px dotted #999;height:1px;margin-top:14px}
          .print-receipt .rc-checkline{font-size:11.5px;display:flex;flex-wrap:wrap;align-items:center;gap:4px;margin:10px 0;padding:8px 0;border-top:1px solid #ccc;border-bottom:1px solid #ccc}
          .print-receipt .rc-box{display:inline-block;width:14px;height:14px;border:1px solid #111;text-align:center;line-height:14px;font-size:11px;margin-right:6px}
          .print-receipt table{width:100%;border-collapse:collapse;margin-top:14px;font-size:13px}
          .print-receipt td{padding:6px 4px;border-bottom:1px dotted #999;vertical-align:top}
          .print-receipt .rc-label{font-weight:700;width:46%}
          .print-receipt .rc-total td{border-top:2px solid #111;font-weight:700;font-size:14px}
          .print-receipt .rc-sign{display:flex;justify-content:space-between;margin-top:60px;font-size:12px}
          .print-receipt .rc-sign div{border-top:1px solid #111;padding-top:4px;width:45%;text-align:center}
        `}
      </style>

      <div className="page-header-banner">
        <div>
          <div className="title">Application for Registration as a Management Corporation</div>
          <div className="sub">
            Condominium Management Authority<span className="dot"></span>CMA Registration Portal
          </div>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          {canEdit && (
            <button className="btn btn-outline" style={{ color: '#fff', borderColor: 'rgba(255,255,255,0.4)' }} onClick={() => handleSave(null, true)} disabled={isSubmitting}>
              <i className="fas fa-save" style={{ marginRight: 6 }} /> Save Draft
            </button>
          )}
          {canEdit && (
            <button className="btn btn-gold" onClick={handleSave} disabled={isSubmitting}>
              <i className="fas fa-check" style={{ marginRight: 6 }} /> Save Registration
            </button>
          )}
        </div>
      </div>

      <form onSubmit={handleSave} className="reg-form-flow">
        {/* Filing & System Information */}
        <div className="reg-section no-step">
          <div className="reg-section-title">
            <i className="fas fa-folder-open"></i>
            <span className="title-text">Filing Details (Office Use / System Reference)</span>
            <span className="optional-tag">Office Use</span>
          </div>
          <div className="form-grid">
            <Field label="Registration Date">
              <input
                type="date"
                className="form-control"
                value={formData.reg_date}
                onChange={(e) => handleInputChange('reg_date', e.target.value)}
              />
            </Field>
            <Field label="New File No">
              <input
                type="text"
                className="form-control"
                placeholder="e.g. CMA/CCU/2026/01"
                value={formData.new_file_no}
                onChange={(e) => handleInputChange('new_file_no', e.target.value)}
              />
            </Field>
            <Field label="Old File No (Optional)">
              <input
                type="text"
                className="form-control"
                placeholder="e.g. MC/502"
                value={formData.old_file_no}
                onChange={(e) => handleInputChange('old_file_no', e.target.value)}
              />
            </Field>
          </div>
        </div>

        {/* Section 1-3: Basic Details */}
        <div className="reg-section">
          <div className="reg-section-title">
            <span className="step-badge"></span>
            <i className="fas fa-building"></i>
            <span className="title-text">Management Corporation Identification</span>
          </div>
          <div className="form-grid">
            <Field label="1. Title Name of the Management Corporation *" colSpan={2}>
              <input
                type="text"
                className="form-control"
                placeholder="Enter Title Name of the M/C"
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                required
              />
            </Field>
            <Field label="2. Registered Condominium Plan No">
              <input
                type="text"
                className="form-control"
                placeholder="e.g. CP No. 1691"
                value={formData.plan_no}
                onChange={(e) => handleInputChange('plan_no', e.target.value)}
              />
            </Field>
            <Field label="3. Official Address of the M/C" colSpan={3}>
              <textarea
                className="form-control"
                rows={2}
                placeholder="Official Postal Address of the Management Corporation"
                value={formData.address}
                onChange={(e) => handleInputChange('address', e.target.value)}
              />
            </Field>
            <Field label="Email Address">
              <input
                type="email"
                className="form-control"
                placeholder="mc.email@domain.com"
                value={formData.email_address}
                onChange={(e) => handleInputChange('email_address', e.target.value)}
              />
            </Field>
          </div>
        </div>

        {/* Section 4: Parcels */}
        <div className="reg-section">
          <div className="reg-section-title">
            <span className="step-badge"></span>
            <i className="fas fa-th-large"></i>
            <span className="title-text">Number of Parcels in the Condominium Complex</span>
          </div>
          <div className="form-grid">
            <Field label="Residential Parcels">
              <input
                type="number"
                min="0"
                className="form-control"
                placeholder="0"
                value={formData.residential_units}
                onChange={(e) => handleInputChange('residential_units', e.target.value)}
              />
            </Field>
            <Field label="Non Residential - Shops">
              <input
                type="number"
                min="0"
                className="form-control"
                placeholder="0"
                value={formData.non_res_shops}
                onChange={(e) => handleInputChange('non_res_shops', e.target.value)}
              />
            </Field>
            <Field label="Non Residential - Office">
              <input
                type="number"
                min="0"
                className="form-control"
                placeholder="0"
                value={formData.non_res_office}
                onChange={(e) => handleInputChange('non_res_office', e.target.value)}
              />
            </Field>
            <Field label="Non Residential - Hotel">
              <input
                type="number"
                min="0"
                className="form-control"
                placeholder="0"
                value={formData.non_res_hotel}
                onChange={(e) => handleInputChange('non_res_hotel', e.target.value)}
              />
            </Field>
            <Field label="Total Calculated Parcels">
              <input
                type="text"
                className="form-control"
                value={totalParcels}
                disabled
                style={{ background: 'var(--bg)', fontWeight: 'bold', color: 'var(--navy)' }}
              />
            </Field>
          </div>
        </div>

        {/* Section 5: Services Available */}
        <div className="reg-section">
          <div className="reg-section-title">
            <span className="step-badge"></span>
            <i className="fas fa-concierge-bell"></i>
            <span className="title-text">Services Available</span>
          </div>
          <div className="facility-grid">
            <label className="checkbox-item">
              <input
                type="checkbox"
                checked={formData.services_lift}
                onChange={(e) => handleInputChange('services_lift', e.target.checked)}
              />
              Lift
            </label>
            <label className="checkbox-item">
              <input
                type="checkbox"
                checked={formData.services_fire_agreement}
                onChange={(e) => handleInputChange('services_fire_agreement', e.target.checked)}
              />
              Fire Service agreement
            </label>
            <label className="checkbox-item">
              <input
                type="checkbox"
                checked={formData.services_generator_agreement}
                onChange={(e) => handleInputChange('services_generator_agreement', e.target.checked)}
              />
              Generator Service agreement
            </label>
            <label className="checkbox-item">
              <input
                type="checkbox"
                checked={formData.services_insurance}
                onChange={(e) => handleInputChange('services_insurance', e.target.checked)}
              />
              Insurance Details
            </label>
          </div>
        </div>

        {/* Section 6: Facilities Available */}
        <div className="reg-section">
          <div className="reg-section-title">
            <span className="step-badge"></span>
            <i className="fas fa-swimming-pool"></i>
            <span className="title-text">Facilities Available</span>
          </div>
          <div className="facility-grid">
            {[
              { id: 'fac_lift', label: 'Lift' },
              { id: 'fac_service_lift', label: 'Service Lift' },
              { id: 'fac_common_parking', label: 'Common Parking' },
              { id: 'fac_accessory_car_parcel', label: 'Accessory Car Parcel' },
              { id: 'fac_roof_top', label: 'Roof Top' },
              { id: 'fac_gym', label: 'Gym' },
              { id: 'fac_swimming_pool', label: 'Swimming Pool' },
              { id: 'fac_penth_house', label: 'Penth House' },
              { id: 'fac_restaurant', label: 'Restaurant' },
              { id: 'fac_canteen', label: 'Canteen' },
              { id: 'fac_super_market', label: 'Super Market' },
              { id: 'fac_garden', label: 'Garden' },
              { id: 'fac_sauna', label: 'Sauna' },
              { id: 'fac_salon', label: 'Salon' },
              { id: 'fac_golf_tennis', label: 'Golf & Tennis Ground' },
              { id: 'fac_day_care', label: 'Day Care Centers' },
              { id: 'fac_club_house', label: 'Club House' },
            ].map((facility) => (
              <label className="checkbox-item" key={facility.id} htmlFor={facility.id}>
                <input
                  id={facility.id}
                  name={facility.id}
                  type="checkbox"
                  checked={formData[facility.id]}
                  onChange={(e) => handleInputChange(facility.id, e.target.checked)}
                />
                {facility.label}
              </label>
            ))}
          </div>
          <div style={{ marginTop: 10, fontSize: 11.5, color: 'var(--text2)', display: 'flex', alignItems: 'center', gap: 6 }}>
            <i className="fas fa-info-circle" style={{ color: 'var(--gold,#b8860b)' }}></i>
            Facilities selected here (together with Government/Private status below) automatically determine the Private sub-category — Normal / Semi-Luxury / Luxury — used for the registration fee.
          </div>
        </div>

        {/* Management Services Company Control */}
        <div className="reg-section no-step">
          <div className="reg-section-title">
            <i className="fas fa-handshake"></i>
            <span className="title-text">Management Services Company Control</span>
          </div>
          <div style={{ display: 'flex', gap: 24, marginBottom: 14, alignItems: 'center' }}>
            <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--text2)' }}>Is the M/C controlled by a Management Company?</span>
            <label htmlFor="mgmt_company_yes" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13, cursor: 'pointer' }}>
              <input
                id="mgmt_company_yes"
                type="radio"
                name="mgmt_company_controlled"
                checked={formData.mgmt_company_controlled === true}
                onChange={() => handleInputChange('mgmt_company_controlled', true)}
              />
              Yes
            </label>
            <label htmlFor="mgmt_company_no" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13, cursor: 'pointer' }}>
              <input
                id="mgmt_company_no"
                type="radio"
                name="mgmt_company_controlled"
                checked={formData.mgmt_company_controlled === false}
                onChange={() => handleInputChange('mgmt_company_controlled', false)}
              />
              No
            </label>
          </div>

          {formData.mgmt_company_controlled && (
            <div className="sub-section">
              <div className="sub-section-title">Management Company Details</div>
              <div className="form-grid">
                <Field label="Name of the Company">
                  <input
                    type="text"
                    className="form-control"
                    placeholder="Enter company name"
                    value={formData.mgmt_company_name}
                    onChange={(e) => handleInputChange('mgmt_company_name', e.target.value)}
                  />
                </Field>
                <Field label="Contact No">
                  <input
                    type="text"
                    className="form-control"
                    placeholder="Enter company contact number"
                    value={formData.mgmt_company_contact}
                    onChange={(e) => handleInputChange('mgmt_company_contact', e.target.value)}
                  />
                </Field>
              </div>
            </div>
          )}
        </div>

        {/* Registration Category & Fee Calculation */}
        <div className="reg-section no-step">
          <div className="reg-section-title">
            <i className="fas fa-file-invoice-dollar"></i>
            <span className="title-text">Registration Category &amp; Fee Calculation</span>
          </div>

          <div style={{ display: 'flex', gap: 24, marginBottom: 16, alignItems: 'center', flexWrap: 'wrap' }}>
            <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--text2)' }}>Ownership Type:</span>
            <label htmlFor="ownership_govt" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13, cursor: 'pointer' }}>
              <input
                id="ownership_govt"
                type="radio"
                name="ownership_type"
                checked={formData.ownership_type === 'government'}
                onChange={() => handleInputChange('ownership_type', 'government')}
              />
              Government
            </label>
            <label htmlFor="ownership_private" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13, cursor: 'pointer' }}>
              <input
                id="ownership_private"
                type="radio"
                name="ownership_type"
                checked={formData.ownership_type === 'private'}
                onChange={() => handleInputChange('ownership_type', 'private')}
              />
              Private
            </label>
          </div>

          {formData.ownership_type === 'government' ? (
            <div className="sub-section">
              <div className="sub-section-title">Government Income Category</div>
              <div className="facility-grid">
                <label htmlFor="govt_income_low" className="checkbox-item">
                  <input
                    id="govt_income_low"
                    type="radio"
                    name="government_income_level"
                    checked={formData.government_income_level !== 'middle'}
                    onChange={() => handleInputChange('government_income_level', 'low')}
                  />
                  Low Income (Rs. {formatMoney(CATEGORY_RATES?.government_low?.rate || 100)} / unit)
                </label>
                <label htmlFor="govt_income_middle" className="checkbox-item">
                  <input
                    id="govt_income_middle"
                    type="radio"
                    name="government_income_level"
                    checked={formData.government_income_level === 'middle'}
                    onChange={() => handleInputChange('government_income_level', 'middle')}
                  />
                  Middle Income (Rs. {formatMoney(CATEGORY_RATES?.government_middle?.rate || 200)} / unit)
                </label>
              </div>
            </div>
          ) : (
            <div className="sub-section">
              <div className="sub-section-title">Private Sub-Category</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center', marginBottom: 10 }}>
                <span style={{ fontSize: 13, color: 'var(--text2)' }}>Auto-detected from Facilities:</span>
                <span style={{
                  fontSize: 12.5, fontWeight: 700, padding: '4px 12px', borderRadius: 20,
                  background: '#eef4ff', color: 'var(--navy)', border: '1px solid var(--navy)',
                  textTransform: 'capitalize',
                }}>
                  {autoDetectedPrivateCategory.replace('_', ' ')}
                </span>
              </div>
              <Field label="Override Category (optional — leave as Auto to use facility-based detection)">
                <select
                  className="form-control"
                  value={formData.private_category_override}
                  onChange={(e) => handleInputChange('private_category_override', e.target.value)}
                >
                  <option value="">Auto ({autoDetectedPrivateCategory.replace('_', ' ')})</option>
                  <option value="normal">Normal (Rs. {formatMoney(CATEGORY_RATES?.private_normal?.rate || 250)} / unit)</option>
                  <option value="semi_luxury">Semi-Luxury (Rs. {formatMoney(CATEGORY_RATES?.private_semi_luxury?.rate || 350)} / unit)</option>
                  <option value="luxury">Luxury (Rs. {formatMoney(CATEGORY_RATES?.private_luxury?.rate || 500)} / unit)</option>
                </select>
              </Field>
            </div>
          )}

          {/* Fee breakdown */}
          <div className="sub-section" style={{ marginTop: 14 }}>
            <div className="sub-section-title">Fee Breakdown</div>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '480px' }}>
                <tbody>
                  <tr>
                    <td className="table-data-cell" style={{ fontWeight: 600 }}>Category</td>
                    <td className="table-data-cell">{feeBreakdown.categoryLabel}</td>
                  </tr>
                  <tr>
                    <td className="table-data-cell" style={{ fontWeight: 600 }}>Number of Parcels (Units)</td>
                    <td className="table-data-cell">{feeBreakdown.units}</td>
                  </tr>
                  <tr>
                    <td className="table-data-cell" style={{ fontWeight: 600 }}>Period (months charged)</td>
                    <td className="table-data-cell">{feeBreakdown.periodMonths}</td>
                  </tr>
                  <tr>
                    <td className="table-data-cell" style={{ fontWeight: 600 }}>Fee Rs. (Rate {formatMoney(feeBreakdown.rate)} / 12 &times; {feeBreakdown.periodMonths} months &times; {feeBreakdown.units} units)</td>
                    <td className="table-data-cell">Rs. {formatMoney(feeBreakdown.fee)}</td>
                  </tr>
                  <tr>
                    <td className="table-data-cell" style={{ fontWeight: 600 }}>Other Tax &mdash; SSCL ({SSCL_RATE * 100}%)</td>
                    <td className="table-data-cell">Rs. {formatMoney(feeBreakdown.sscl)}</td>
                  </tr>
                  <tr>
                    <td className="table-data-cell" style={{ fontWeight: 600 }}>VAT ({VAT_RATE * 100}%)</td>
                    <td className="table-data-cell">Rs. {formatMoney(feeBreakdown.vat)}</td>
                  </tr>
                  <tr>
                    <td className="table-data-cell" style={{ fontWeight: 700, color: 'var(--navy)', fontSize: 14 }}>Total Amount Payable</td>
                    <td className="table-data-cell" style={{ fontWeight: 700, color: 'var(--navy)', fontSize: 14 }}>Rs. {formatMoney(feeBreakdown.total)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <div style={{ marginTop: 12 }}>
              <button type="button" className="btn btn-outline" onClick={handlePrintReceipt}>
                <i className="fas fa-receipt"></i> Print Registration Receipt
              </button>
            </div>
          </div>
        </div>

        {/* Office Bearers Details */}
        <div className="reg-section">
          <div className="reg-section-title">
            <span className="step-badge"></span>
            <i className="fas fa-user-tie"></i>
            <span className="title-text">Names of the Office Bearers and their Contact Nos</span>
          </div>

          <div className="form-grid">
            {/* Secretary details */}
            <div className="sub-section" style={{ gridColumn: 'span 1' }}>
              <div className="sub-section-title">Secretary</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <Field label="Name" id="secretary_name">
                  <input
                    type="text"
                    className="form-control"
                    placeholder="Secretary full name"
                    value={formData.secretary}
                    onChange={(e) => handleInputChange('secretary', e.target.value)}
                  />
                </Field>
                <Field label="Unit No" id="secretary_unit_no">
                  <input
                    type="text"
                    className="form-control"
                    placeholder="Unit No"
                    value={formData.secretary_unit_no}
                    onChange={(e) => handleInputChange('secretary_unit_no', e.target.value)}
                  />
                </Field>
                <Field label="Contact No" id="secretary_contact">
                  <input
                    type="text"
                    className="form-control"
                    placeholder="Phone number"
                    value={formData.secretary_contact}
                    onChange={(e) => handleInputChange('secretary_contact', e.target.value)}
                  />
                </Field>
                <Field label="E-mail Address" id="secretary_email">
                  <input
                    type="email"
                    className="form-control"
                    placeholder="email@domain.com"
                    value={formData.secretary_email}
                    onChange={(e) => handleInputChange('secretary_email', e.target.value)}
                  />
                </Field>
              </div>
            </div>

            {/* Treasurer details */}
            <div className="sub-section" style={{ gridColumn: 'span 1' }}>
              <div className="sub-section-title">Treasurer</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <Field label="Name" id="treasurer_name">
                  <input
                    type="text"
                    className="form-control"
                    placeholder="Treasurer full name"
                    value={formData.treasurer}
                    onChange={(e) => handleInputChange('treasurer', e.target.value)}
                  />
                </Field>
                <Field label="Unit No" id="treasurer_unit_no">
                  <input
                    type="text"
                    className="form-control"
                    placeholder="Unit No"
                    value={formData.treasurer_unit_no}
                    onChange={(e) => handleInputChange('treasurer_unit_no', e.target.value)}
                  />
                </Field>
                <Field label="Contact No" id="treasurer_contact">
                  <input
                    type="text"
                    className="form-control"
                    placeholder="Phone number"
                    value={formData.treasurer_contact}
                    onChange={(e) => handleInputChange('treasurer_contact', e.target.value)}
                  />
                </Field>
                <Field label="E-mail Address" id="treasurer_email">
                  <input
                    type="email"
                    className="form-control"
                    placeholder="email@domain.com"
                    value={formData.treasurer_email}
                    onChange={(e) => handleInputChange('treasurer_email', e.target.value)}
                  />
                </Field>
              </div>
            </div>
          </div>

          {/* Council Members Section */}
          <div className="sub-section" style={{ marginTop: '16px' }}>
            <div className="sub-section-title"><i className="fas fa-users"></i> Council Members (I - V)</div>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '600px' }}>
                <thead>
                  <tr>
                    <th className="table-header-cell" style={{ width: '50px', textAlign: 'center' }}>#</th>
                    <th className="table-header-cell">Name</th>
                    <th className="table-header-cell" style={{ width: '160px' }}>Unit No</th>
                    <th className="table-header-cell" style={{ width: '200px' }}>Contact No</th>
                  </tr>
                </thead>
                <tbody>
                  {formData.council_members.map((member, index) => (
                    <tr key={index}>
                      <td className="table-data-cell" style={{ textAlign: 'center', fontWeight: 'bold', color: 'var(--text2)', background: '#fafafa' }}>
                        {['I', 'II', 'III', 'IV', 'V'][index]}
                      </td>
                      <td className="table-data-cell">
                        <input
                          id={`council_member_${index}_name`}
                          name={`council_member_${index}_name`}
                          aria-label={`Council Member ${['I', 'II', 'III', 'IV', 'V'][index]} Name`}
                          type="text"
                          className="form-control"
                          style={{ padding: '6px 8px', fontSize: '13px' }}
                          placeholder={`Council Member ${index + 1} Name`}
                          value={member.name}
                          onChange={(e) => handleCouncilMemberChange(index, 'name', e.target.value)}
                        />
                      </td>
                      <td className="table-data-cell">
                        <input
                          id={`council_member_${index}_unit`}
                          name={`council_member_${index}_unit`}
                          aria-label={`Council Member ${['I', 'II', 'III', 'IV', 'V'][index]} Unit Number`}
                          type="text"
                          className="form-control"
                          style={{ padding: '6px 8px', fontSize: '13px' }}
                          placeholder="Unit No"
                          value={member.unit_no}
                          onChange={(e) => handleCouncilMemberChange(index, 'unit_no', e.target.value)}
                        />
                      </td>
                      <td className="table-data-cell">
                        <input
                          id={`council_member_${index}_contact`}
                          name={`council_member_${index}_contact`}
                          aria-label={`Council Member ${['I', 'II', 'III', 'IV', 'V'][index]} Contact Number`}
                          type="text"
                          className="form-control"
                          style={{ padding: '6px 8px', fontSize: '13px' }}
                          placeholder="Contact No"
                          value={member.contact_no}
                          onChange={(e) => handleCouncilMemberChange(index, 'contact_no', e.target.value)}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Written Assurance */}
        <div className="reg-section">
          <div className="reg-section-title">
            <span className="step-badge"></span>
            <i className="fas fa-signature"></i>
            <span className="title-text">Secretary Confirmation &amp; Assurance</span>
          </div>
          <div style={{ padding: '6px 0' }}>
            <label htmlFor="written_assurance_fulfilled" className="checkbox-item" style={{ background: '#fffbeb', border: '1px solid #fde68a' }}>
              <input
                id="written_assurance_fulfilled"
                name="written_assurance_fulfilled"
                type="checkbox"
                checked={formData.written_assurance_fulfilled}
                onChange={(e) => handleInputChange('written_assurance_fulfilled', e.target.checked)}
                required
              />
              <span style={{ fontSize: 13, fontWeight: 500, color: '#92400e' }}>
                I hereby certify and provide written assurance that all requirements of the Condominium Management Authority (CMA) will be fulfilled in accordance with the regulations.
              </span>
            </label>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="reg-footer-actions">
          {canEdit && (
            <button type="button" className="btn btn-outline" onClick={handleClear} disabled={isSubmitting}>
              <i className="fas fa-eraser" style={{ marginRight: 6 }} /> Clear
            </button>
          )}
          <button type="button" className="btn btn-outline" onClick={handlePrint} disabled={isSubmitting}>
            <i className="fas fa-print" style={{ marginRight: 6 }} /> Print Application
          </button>
          {canEdit && (
            <button type="submit" className="btn btn-gold" style={{ padding: '10px 24px', fontSize: '14px' }} disabled={isSubmitting}>
              <i className="fas fa-save" style={{ marginRight: 8 }} /> Save Registration
            </button>
          )}
        </div>
      </form>

      {/* Official Form Print View */}
      <div className="print-official-form">
        <div className="of-head">
          <div className="rc-logo"><img src="/assets/cma-logo.png" alt="CMA Logo" /></div>
          <div className="of-title">CONDOMINIUM MANAGEMENT AUTHORITY</div>
          <div className="of-subtitle">APPLICATION FOR REGISTRATION AS A MANAGEMENT CORPORATION</div>
        </div>

        <div className="of-row" style={{ marginTop: 10 }}>
          <div className="of-label">1. Title name of the Management Corporation :-</div>
          <div className="of-value">{formData.name}</div>
        </div>
        <div className="of-row">
          <div className="of-label">2. Registered Condominium Plan No :-</div>
          <div className="of-value">{formData.plan_no}</div>
        </div>
        <div className="of-row">
          <div className="of-label">3. Official Address of the M/C :-</div>
          <div className="of-value">{formData.address}</div>
        </div>

        <div className="of-section-title">4. Number of the parcels in the Condominium Complex,</div>
        <div className="of-sub-row">
          <div className="of-label">Residential :-</div>
          <div className="of-value">{formData.residential_units}</div>
        </div>
        <div className="of-section-title" style={{ marginTop: 2, paddingLeft: 20 }}>Non Residential :-</div>
        <div className="of-sub-row" style={{ paddingLeft: 40 }}>
          <div className="of-label">Shops :-</div>
          <div className="of-value">{formData.non_res_shops}</div>
        </div>
        <div className="of-sub-row" style={{ paddingLeft: 40 }}>
          <div className="of-label">Office :-</div>
          <div className="of-value">{formData.non_res_office}</div>
        </div>
        <div className="of-sub-row" style={{ paddingLeft: 40 }}>
          <div className="of-label">Hotel :-</div>
          <div className="of-value">{formData.non_res_hotel}</div>
        </div>

        <div className="of-section-title">5. Services available</div>
        <div className="of-grid-2">
          <div className="of-checkbox"><div className="of-box">{formData.services_lift ? '✓' : ''}</div> Lift</div>
          <div className="of-checkbox"><div className="of-box">{formData.services_fire_agreement ? '✓' : ''}</div> Fire Service agreement</div>
          <div className="of-checkbox"><div className="of-box">{formData.services_generator_agreement ? '✓' : ''}</div> Generator Service agreement</div>
          <div className="of-checkbox"><div className="of-box">{formData.services_insurance ? '✓' : ''}</div> Insurance Details</div>
        </div>

        <div className="of-section-title">6. Facilities available</div>
        <div className="of-grid-2">
          <div className="of-checkbox"><div className="of-box">{formData.fac_common_parking ? '✓' : ''}</div> Common Parking</div>
          <div className="of-checkbox"><div className="of-box">{formData.fac_super_market ? '✓' : ''}</div> Super Market</div>

          <div className="of-checkbox"><div className="of-box">{formData.fac_accessory_car_parcel ? '✓' : ''}</div> Accessory Car Parcel</div>
          <div className="of-checkbox"><div className="of-box">{formData.fac_garden ? '✓' : ''}</div> Garden</div>

          <div className="of-checkbox"><div className="of-box">{formData.fac_roof_top ? '✓' : ''}</div> Roof Top</div>
          <div className="of-checkbox"><div className="of-box">{formData.fac_sauna ? '✓' : ''}</div> Sauna</div>

          <div className="of-checkbox"><div className="of-box">{formData.fac_gym ? '✓' : ''}</div> Gym</div>
          <div className="of-checkbox"><div className="of-box">{formData.fac_salon ? '✓' : ''}</div> Salon</div>

          <div className="of-checkbox"><div className="of-box">{formData.fac_swimming_pool ? '✓' : ''}</div> Swimming Pool</div>
          <div className="of-checkbox"><div className="of-box">{formData.fac_golf_tennis ? '✓' : ''}</div> Golf &amp; Tennis Ground</div>

          <div className="of-checkbox"><div className="of-box">{formData.fac_penth_house ? '✓' : ''}</div> Penth House</div>
          <div className="of-checkbox"><div className="of-box">{formData.fac_day_care ? '✓' : ''}</div> Day Care Centers</div>

          <div className="of-checkbox"><div className="of-box">{formData.fac_restaurant ? '✓' : ''}</div> Restaurant</div>
        </div>

        <div className="of-row" style={{ marginTop: 8 }}>
          <div className="of-label">Management Services Company :-</div>
          <div className="of-checkbox" style={{ marginRight: 15 }}>Yes <div className="of-box">{formData.mgmt_company_controlled === true ? '✓' : ''}</div></div>
          <div className="of-checkbox">No <div className="of-box">{formData.mgmt_company_controlled === false ? '✓' : ''}</div></div>
        </div>

        <div className="of-section-title" style={{ textTransform: 'uppercase' }}>NAMES OF THE OFFICE BEARERS AND THEIR CONTACT NOS.</div>
        <div className="of-row">
          <div className="of-label">Secretary -</div>
          <div className="of-value">{formData.secretary}</div>
        </div>
        <div className="of-sub-row">
          <div className="of-label">Unit No -</div>
          <div className="of-value">{formData.secretary_unit_no}</div>
        </div>
        <div className="of-sub-row">
          <div className="of-label">Contact No -</div>
          <div className="of-value">{formData.secretary_contact}</div>
        </div>
        <div className="of-sub-row">
          <div className="of-label">E-mail Address -</div>
          <div className="of-value">{formData.secretary_email}</div>
        </div>

        <div className="of-row" style={{ marginTop: 4 }}>
          <div className="of-label">Treasurer -</div>
          <div className="of-value">{formData.treasurer}</div>
        </div>
        <div className="of-sub-row">
          <div className="of-label">Unit No -</div>
          <div className="of-value">{formData.treasurer_unit_no}</div>
        </div>
        <div className="of-sub-row">
          <div className="of-label">Contact No -</div>
          <div className="of-value">{formData.treasurer_contact}</div>
        </div>
        <div className="of-sub-row">
          <div className="of-label">E-mail Address -</div>
          <div className="of-value">{formData.treasurer_email}</div>
        </div>

        <div className="of-section-title">Council Members -</div>
        <table className="of-table">
          <thead>
            <tr>
              <th style={{ width: 40 }}>#</th>
              <th>Name</th>
              <th style={{ width: 120 }}>Unit No</th>
              <th style={{ width: 150 }}>Contact No</th>
            </tr>
          </thead>
          <tbody>
            {(formData.council_members || Array.from({ length: 5 }, () => ({}))).map((member, idx) => (
              <tr key={idx}>
                <td style={{ textAlign: 'center', fontWeight: 'bold' }}>{['I.', 'II.', 'III.', 'IV.', 'V.'][idx] || idx + 1}</td>
                <td>{member.name || ''}</td>
                <td>{member.unit_no || ''}</td>
                <td>{member.contact_no || ''}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="of-row" style={{ marginTop: 10 }}>
          <div className="of-label" style={{ whiteSpace: 'normal', fontWeight: 'normal', display: 'flex', alignItems: 'center' }}>
            <span>7. Written assurance from secretary that Condominium Management Authority requirement will be fulfilled (attached)</span>
            <div className="of-box" style={{ marginLeft: 10 }}>{formData.written_assurance_fulfilled ? '✓' : ''}</div>
          </div>
        </div>

        <div className="of-signatures">
          <div>Authorized Signature</div>
          <div>Secretary<br />Management Corporation</div>
        </div>
      </div>

      {/* Printable Registration Receipt (visible only when printing via "Print Registration Receipt") */}
      <div className="print-receipt">
        <div className="rc-topline">
          <span className="rc-regno">No. {formData.new_file_no || '_______________'}</span>
        </div>
        <div className="rc-head">
          <div className="rc-logo">
            <img src="/assets/cma-logo.png" alt="CMA Logo" />
          </div>
          <div className="rc-title">CONDOMINIUM MANAGEMENT AUTHORITY</div>
          <div className="rc-sub">Customer Care Division / Legal Division</div>
        </div>

        <div className="rc-row"><span className="rc-fill-label">DGM Finance / Shroff</span><span className="rc-fill-line" /></div>

        <div className="rc-checkline">
          <span>Registration of Management Corporation</span>
          <span className="rc-box">{'\u2713'}</span>
          <span>/ Renewal</span><span className="rc-box" />
          <span>/ Application Fee</span><span className="rc-box" />
          <span>/ Photocopy Charges</span><span className="rc-box" />
          <span>/ Others</span><span className="rc-box" />
        </div>

        <table>
          <tbody>
            <tr><td className="rc-label">File No</td><td>{formData.new_file_no || '—'}</td></tr>
            <tr>
              <td className="rc-label">Name of the MC &amp; Address</td>
              <td>
                {[
                  formData.name,
                  formData.plan_no,
                  formData.address,
                ].filter(Boolean).join(' | ') || '—'}
              </td>
            </tr>
            <tr><td className="rc-label">Period</td><td>{formData.reg_date || '—'} to {(() => {
              const d = new Date(formData.reg_date);
              if (Number.isNaN(d.getTime())) return '—';
              return `${d.getFullYear()}-12-31`;
            })()}</td></tr>
            <tr><td className="rc-label">Category</td><td>{feeBreakdown.categoryLabel}</td></tr>
            <tr><td className="rc-label">Number of Parcels (Units)</td><td>{feeBreakdown.units}</td></tr>
            <tr><td className="rc-label">Period (months charged)</td><td>{feeBreakdown.periodMonths}</td></tr>
            <tr><td className="rc-label">Fee Rs. (Rate {formatMoney(feeBreakdown.rate)} / 12 × {feeBreakdown.periodMonths} months × {feeBreakdown.units} units)</td><td>{formatMoney(feeBreakdown.fee)}</td></tr>
            <tr><td className="rc-label">Other Tax — SSCL ({SSCL_RATE * 100}%)</td><td>{formatMoney(feeBreakdown.sscl)}</td></tr>
            <tr><td className="rc-label">VAT ({VAT_RATE * 100}%)</td><td>{formatMoney(feeBreakdown.vat)}</td></tr>
            <tr className="rc-total"><td>Total Amount Rs.</td><td>{formatMoney(feeBreakdown.total)}</td></tr>
          </tbody>
        </table>

        <div className="rc-row" style={{ marginTop: 14 }}>
          <span>Please accept Rs. ____________________ (Cash / Cheque) Cheque No. ____________________</span>
        </div>
        <div className="rc-row"><span>Cheque Date ____________________ Branch ____________________ from the above MC.</span></div>

        <div className="rc-sign">
          <div>Authorized Signature</div>
          <div>Date</div>
        </div>
      </div>
    </div>
  );
}