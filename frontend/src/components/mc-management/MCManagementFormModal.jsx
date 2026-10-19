import React from 'react';
import { FormField, FormSelect, SectionLabel } from './MCManagementShared.jsx';

export default function MCManagementFormModal({
  modalOpen,
  setModalOpen,
  editingId,
  formData,
  setFormData,
  activeTab,
  setActiveTab,
  CATEGORY_RATES,
  SSCL_RATE,
  VAT_RATE,
  isViewOnly,
  handleSave,
  canApproveWithAgmChecklist,
  theme,
  totalParcels,
  autoDetectedPrivateCategory,
  normalizePrivateCategoryKey,
  getPrivateCategoryLabel,
  feeBreakdown,
  updateCouncilMember,
  CHECKLIST_ITEMS,
  formChecklistData,
  toggleChecklist,
  updateChecklistField,
  isAGM
}) {
  if (!modalOpen) return null;

  function field(key) {
    return (v) => setFormData((p) => ({ ...p, [key]: v }));
  }

  return (

    <div className="mc-overlay" onClick={(e) => e.target === e.currentTarget && setModalOpen(false)}>
      <style>{`
      .reg-form-flow{counter-reset:reg-step;display:flex;flex-direction:column;gap:16px}
      .reg-section{position:relative;background:#fff;border-radius:12px;padding:18px 20px 18px 24px;border:1px solid #e2e8f0;box-shadow:0 1px 2px rgba(16,24,40,.04);counter-increment:reg-step}
      .reg-section::before{content:"";position:absolute;left:0;top:12px;bottom:12px;width:4px;border-radius:0 4px 4px 0;background:linear-gradient(180deg,#1a3a6b 0%,#2563eb 100%);opacity:.85}
      .reg-section.no-step::before{opacity:.3}
      .reg-section-title{font-size:13.5px;font-weight:700;color:#1a3a6b;margin-bottom:14px;display:flex;align-items:center;gap:8px;padding-bottom:10px;border-bottom:1px dashed #e2e8f0}
      .reg-section-title .step-badge{flex:0 0 auto;width:22px;height:22px;border-radius:50%;background:#1a3a6b;color:#fff;font-size:11px;font-weight:700;display:flex;align-items:center;justify-content:center}
      .reg-section-title .step-badge::after{content:counter(reg-step)}
      .reg-section-title .title-text{flex:1}
      .reg-section-title .optional-tag{font-size:10px;font-weight:600;text-transform:uppercase;letter-spacing:.5px;color:#5a6478;background:#ffffff;border:1px solid #e2e8f0;padding:2px 7px;border-radius:20px}
      .facility-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(190px,1fr));gap:8px}
      .checkbox-item{display:flex;align-items:center;gap:8px;font-size:12.5px;cursor:pointer;padding:9px 11px;border:1px solid #e2e8f0;border-radius:8px;background:#ffffff;transition:background .15s,border-color .15s}
      .checkbox-item:hover{background:#eef2f9;border-color:#2563eb}
      .checkbox-item input{cursor:pointer;accent-color:#1a3a6b;width:15px;height:15px;flex:0 0 auto}
      .checkbox-item:has(input:checked){background:#eef4ff;border-color:#1a3a6b;font-weight:600;color:#1a3a6b}
      .form-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:12px 14px}
      .form-group .form-label{display:block;font-size:12px;font-weight:600;color:#5a6478;margin-bottom:5px}
      .sub-section{border:1px solid #e2e8f0;border-radius:9px;padding:13px;background:#f8fafc;margin-top:8px}
      .sub-section-title{font-size:11.5px;font-weight:700;color:#1a3a6b;margin-bottom:10px;text-transform:uppercase;letter-spacing:.5px;display:flex;align-items:center;gap:5px}
      .table-header-cell{padding:9px 8px;font-size:11px;font-weight:700;color:#1a3a6b;text-transform:uppercase;background:#f8fafc;border-bottom:2px solid #e2e8f0;letter-spacing:.3px}
      .table-data-cell{padding:6px 8px;border-bottom:1px solid #e2e8f0}
    `}</style>
      <div className="mc-modal" style={{ display: 'flex', flexDirection: 'column', maxHeight: '90vh' }}>
        <div className="mc-modal-header">
          <span style={{ fontSize: 16, fontWeight: 700 }}>{editingId ? 'Edit MC Record' : 'Add MC Record'}</span>
          <button onClick={() => setModalOpen(false)} className="mc-close-btn"><i className="fas fa-times" /></button>
        </div>

        <div style={{ display: 'flex', gap: 0, padding: '0 22px', borderBottom: `2px solid ${theme.border}`, background: '#f8fafc', alignItems: 'center', flexWrap: 'wrap', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', gap: 2 }}>
            {[
              { id: 'details', label: 'Other Details', icon: 'fas fa-list' },
              { id: 'registration', label: 'Registration Form', icon: 'fas fa-file-alt' },
              { id: 'checklist', label: 'Document Checklist', icon: 'fas fa-clipboard-check' },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className="mc-btn-outline" style={{ borderRadius: 0, borderTop: 'none', borderLeft: 'none', borderRight: 'none', padding: '11px 18px', fontSize: 13, fontWeight: activeTab === tab.id ? 700 : 500, color: activeTab === tab.id ? theme.blue : theme.text2, borderBottom: activeTab === tab.id ? `2px solid ${theme.blue}` : '2px solid transparent', marginBottom: -2, background: 'transparent' }}
              >
                <i className={tab.icon} style={{ marginRight: 6 }} />{tab.label}
              </button>
            ))}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 0', flexWrap: 'wrap' }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: theme.text2 }}>Status:</span>
            <select id="mc_form_field_20" name="mc_form_field_20"
              value={formData.status || 'Pending'}
              onChange={e => field('status')(e.target.value)}
              disabled={!editingId}
              className="mc-input" style={{ width: 130, padding: '5px 10px', fontSize: 13, fontWeight: 700, color: formData.status === 'Active' ? theme.green : formData.status === 'Pending' ? '#d97706' : theme.text, opacity: !editingId ? 0.7 : 1, cursor: !editingId ? 'not-allowed' : 'pointer' }}
            >
              <option value="Active" disabled={!editingId}>Active</option>
              <option value="Non Active">Non Active</option>
              <option value="Pending">Pending</option>
            </select>
            {formData.renewal_payment_status === 'Pending Approval' && (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 11, fontWeight: 700, color: '#ea580c', background: '#fff7ed', border: '1px solid #fed7aa', borderRadius: 999, padding: '3px 10px', whiteSpace: 'nowrap' }}>
                <i className="fas fa-clock" style={{ fontSize: 10 }} /> Renewal Pending
              </span>
            )}
          </div>
        </div>

        <div style={{ padding: '16px 22px', display: 'flex', flexDirection: 'column', gap: 14, overflowY: 'auto', flex: 1 }}>

          {/* - TAB 1: Registration Form - */}
          {activeTab === 'registration' && (() => {
            const fmtMoney = (n) => (Number(n) || 0).toLocaleString('en-LK', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
            return (
              <div className="reg-form-flow">

                {/* Filing Details */}
                <div className="reg-section no-step">
                  <div className="reg-section-title"><i className="fas fa-folder-open" /><span className="title-text">Filing Details (Office Use / System Reference)</span><span className="optional-tag">Office Use</span></div>
                  <div className="form-grid">
                    <FormField label="Registration Date" type="date" value={formData.reg_date} onChange={field('reg_date')} />
                    <FormField label="New File No (blank = auto-generate)" value={formData.new_file_no} placeholder="CMA/CCU/..." onChange={field('new_file_no')} />
                    <FormField label="Old File No (optional)" value={formData.old_file_no} placeholder="e.g. CMA/CCU/..." onChange={field('old_file_no')} />
                  </div>
                </div>

                {/* MC Identification */}
                <div className="reg-section">
                  <div className="reg-section-title"><span className="step-badge" /><i className="fas fa-building" /><span className="title-text">Management Corporation Identification</span></div>
                  <div className="form-grid">
                    <FormField label="1. Title Name of the Management Corporation *" value={formData.management_corporation_name} onChange={field('management_corporation_name')} span2 />
                    <FormField label="2. Registered Condominium Plan No" value={formData.plan_no} onChange={field('plan_no')} />
                    <FormField label="3. Official Address" value={formData.address} onChange={field('address')} span2 />
                    <FormField label="Email Address" type="email" value={formData.email_address} onChange={field('email_address')} />
                  </div>
                </div>

                {/* Parcels */}
                <div className="reg-section">
                  <div className="reg-section-title"><span className="step-badge" /><i className="fas fa-th-large" /><span className="title-text">Number of Parcels in the Condominium Complex</span></div>
                  <div className="form-grid">
                    <FormField label="Residential Parcels" type="number" value={formData.residential_units} onChange={field('residential_units')} />
                    <FormField label="Non Residential - Shops" type="number" value={formData.non_res_shops} onChange={field('non_res_shops')} />
                    <FormField label="Non Residential - Office" type="number" value={formData.non_res_office} onChange={field('non_res_office')} />
                    <FormField label="Non Residential - Hotel" type="number" value={formData.non_res_hotel} onChange={field('non_res_hotel')} />
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <span style={{ fontSize: 12.5, color: theme.text2, fontWeight: 600 }}>Total Calculated Parcels(Units):</span>
                      <span style={{ fontSize: 15, fontWeight: 800, color: theme.navy }}>{totalParcels}</span>
                    </div>
                  </div>
                </div>

                {/* Services */}
                <div className="reg-section">
                  <div className="reg-section-title"><span className="step-badge" /><i className="fas fa-concierge-bell" /><span className="title-text">Services Available</span></div>
                  <div className="facility-grid">
                    {[['services_lift', 'Lift'], ['services_fire_agreement', 'Fire Service Agreement'], ['services_generator_agreement', 'Generator Service Agreement'], ['services_insurance', 'Insurance Details']].map(([k, l]) => (
                      <label key={k} className="checkbox-item">
                        <input id="mc_form_field_21" name="mc_form_field_21" type="checkbox" checked={!!formData[k]} onChange={e => field(k)(e.target.checked)} />{l}
                      </label>
                    ))}
                  </div>
                </div>

                {/* Facilities */}
                <div className="reg-section">
                  <div className="reg-section-title"><span className="step-badge" /><i className="fas fa-swimming-pool" /><span className="title-text">Facilities Available</span></div>
                  <div className="facility-grid">
                    {[['fac_lift', 'Lift'], ['fac_service_lift', 'Service Lift'], ['fac_common_parking', 'Common Parking'], ['fac_accessory_car_parcel', 'Accessory Car Parcel'], ['fac_roof_top', 'Roof Top'], ['fac_gym', 'Gym'], ['fac_swimming_pool', 'Swimming Pool'], ['fac_penth_house', 'Penth House'], ['fac_restaurant', 'Restaurant'], ['fac_canteen', 'Canteen'], ['fac_super_market', 'Super Market'], ['fac_garden', 'Garden'], ['fac_sauna', 'Sauna'], ['fac_salon', 'Salon'], ['fac_golf_tennis', 'Golf & Tennis'], ['fac_day_care', 'Day Care'], ['fac_club_house', 'Club House']].map(([k, l]) => (
                      <label key={k} className="checkbox-item">
                        <input id="mc_form_field_22" name="mc_form_field_22" type="checkbox" checked={!!formData[k]} onChange={e => field(k)(e.target.checked)} />{l}
                      </label>
                    ))}
                  </div>
                  <div style={{ marginTop: 8, fontSize: 11.5, color: theme.text2 }}>
                    <i className="fas fa-info-circle" style={{ color: '#b8860b', marginRight: 5 }} />
                    Facilities automatically determine Private sub-category (Normal / Semi-Luxury / Luxury) used for registration fee.
                  </div>
                </div>

                {/* Management Company */}
                <div className="reg-section no-step">
                  <div className="reg-section-title"><i className="fas fa-handshake" /><span className="title-text">Management Services Company Control</span></div>
                  <div style={{ display: 'flex', gap: 20, marginBottom: 12, alignItems: 'center' }}>
                    <span style={{ fontSize: 13, color: theme.text2 }}>Is the M/C controlled by a Management Company?</span>
                    {[['Yes', true], ['No', false]].map(([lbl, val]) => (
                      <label key={lbl} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13, cursor: 'pointer' }}>
                        <input id="mc_form_field_23" type="radio" name="mc_mgmt_ctrl" checked={!!formData.mgmt_company_controlled === val} onChange={() => field('mgmt_company_controlled')(val)} />{lbl}
                      </label>
                    ))}
                  </div>
                  {formData.mgmt_company_controlled && (
                    <div className="sub-section">
                      <div className="sub-section-title">Management Company Details</div>
                      <div className="form-grid">
                        <FormField label="Company Name" value={formData.mgmt_company_name} onChange={field('mgmt_company_name')} />
                        <FormField label="Contact No" value={formData.mgmt_company_contact} onChange={field('mgmt_company_contact')} />
                      </div>
                    </div>
                  )}
                </div>

                {/* Registration Category & Fee */}
                <div className="reg-section no-step">
                  <div className="reg-section-title"><i className="fas fa-file-invoice-dollar" /><span className="title-text">Registration Category &amp; Fee Calculation</span></div>
                  <div style={{ display: 'flex', gap: 20, marginBottom: 14, alignItems: 'center', flexWrap: 'wrap' }}>
                    <span style={{ fontSize: 13, color: theme.text2 }}>Ownership Type:</span>
                    {[['government', 'Government'], ['private', 'Private']].map(([v, l]) => (
                      <label key={v} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13, cursor: 'pointer' }}>
                        <input id="mc_form_field_24" type="radio" name="mc_ownership" checked={formData.ownership_type === v} onChange={() => field('ownership_type')(v)} />{l}
                      </label>
                    ))}
                  </div>
                  {formData.ownership_type === 'government' ? (
                    <div className="sub-section">
                      <div className="sub-section-title">Government Income Category</div>
                      <div className="facility-grid">
                        {[['low', `Low Income (Rs. ${fmtMoney(CATEGORY_RATES?.government_low?.rate || 100)} / unit)`], ['middle', `Middle Income (Rs. ${fmtMoney(CATEGORY_RATES?.government_middle?.rate || 200)} / unit)`]].map(([v, l]) => (
                          <label key={v} className="checkbox-item">
                            <input id="mc_form_field_25" type="radio" name="mc_gov_level" checked={formData.government_income_level === v || (v === 'low' && !formData.government_income_level)} onChange={() => field('government_income_level')(v)} />{l}
                          </label>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="sub-section">
                      <div className="sub-section-title">Private Sub-Category</div>
                      <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 10, flexWrap: 'wrap' }}>
                        <span style={{ fontSize: 13, color: theme.text2 }}>Auto-detected from Facilities:</span>
                        <span style={{ fontSize: 12.5, fontWeight: 700, padding: '3px 12px', borderRadius: 20, background: '#eef4ff', color: theme.navy, border: `1px solid ${theme.navy}`, textTransform: 'capitalize' }}>
                          {autoDetectedPrivateCategory.replace('_', ' ')}
                        </span>
                      </div>
                      <div className="form-group">
                        <label className="form-label">Override Category (optional)</label>
                        <select id="mc_form_field_26" name="mc_form_field_26"
                          className="form-control"
                          value={normalizePrivateCategoryKey(formData.private_category_override) || ''}
                          onChange={(e) => field('private_category_override')(normalizePrivateCategoryKey(e.target.value))}
                        >
                          <option value="">Auto ({(getPrivateCategoryLabel(formData.private_category_override || autoDetectedPrivateCategory) || autoDetectedPrivateCategory.replace('_', ' '))})</option>
                          <option value="normal">Normal (Rs. {fmtMoney(CATEGORY_RATES?.private_normal?.rate || 250)} / unit)</option>
                          <option value="semi_luxury">Semi-Luxury (Rs. {fmtMoney(CATEGORY_RATES?.private_semi_luxury?.rate || 350)} / unit)</option>
                          <option value="luxury">Luxury (Rs. {fmtMoney(CATEGORY_RATES?.private_luxury?.rate || 500)} / unit)</option>
                        </select>
                      </div>
                    </div>
                  )}
                  <div className="sub-section" style={{ marginTop: 14 }}>
                    <div className="sub-section-title">Fee Breakdown</div>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                      <tbody>
                        {[['Category', feeBreakdown.categoryLabel], ['Rate per Unit', `Rs. ${fmtMoney(feeBreakdown.rate)}`], ['Parcels (Units)', feeBreakdown.units], [`Fee (Rate - Units - ${feeBreakdown.periodMonths} months)`, `Rs. ${fmtMoney(feeBreakdown.fee)}`], [`SSCL (${SSCL_RATE * 100}%)`, `Rs. ${fmtMoney(feeBreakdown.sscl)}`], [`VAT (${VAT_RATE * 100}%)`, `Rs. ${fmtMoney(feeBreakdown.vat)}`]].map(([k, v]) => (
                          <tr key={k}><td style={{ padding: '6px 8px', fontSize: 13, fontWeight: 600, borderBottom: `1px dotted ${theme.border}`, width: '55%' }}>{k}</td><td style={{ padding: '6px 8px', fontSize: 13, borderBottom: `1px dotted ${theme.border}` }}>{v}</td></tr>
                        ))}
                        <tr><td style={{ padding: '8px 8px', fontWeight: 800, color: theme.navy, fontSize: 14 }}>Total Amount Payable</td><td style={{ padding: '8px 8px', fontWeight: 800, color: theme.navy, fontSize: 14 }}>Rs. {fmtMoney(feeBreakdown.total)}</td></tr>
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Office Bearers */}
                <div className="reg-section">
                  <div className="reg-section-title"><span className="step-badge" /><i className="fas fa-user-tie" /><span className="title-text">Names of the Office Bearers and Contact Nos</span></div>
                  <div className="form-grid">
                    <div className="sub-section">
                      <div className="sub-section-title">Secretary</div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        <FormField label="Name" value={formData.secretary} onChange={field('secretary')} />
                        <FormField label="Unit No" value={formData.secretary_unit_no} onChange={field('secretary_unit_no')} />
                        <FormField label="Contact No" value={formData.secretary_contact} onChange={field('secretary_contact')} />
                        <FormField label="E-mail" type="email" value={formData.secretary_email} onChange={field('secretary_email')} />
                      </div>
                    </div>
                    <div className="sub-section">
                      <div className="sub-section-title">Treasurer</div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        <FormField label="Name" value={formData.treasurer} onChange={field('treasurer')} />
                        <FormField label="Unit No" value={formData.treasurer_unit_no} onChange={field('treasurer_unit_no')} />
                        <FormField label="Contact No" value={formData.treasurer_contact} onChange={field('treasurer_contact')} />
                        <FormField label="E-mail" type="email" value={formData.treasurer_email} onChange={field('treasurer_email')} />
                      </div>
                    </div>
                  </div>
                  {/* Council Members Table */}
                  <div className="sub-section" style={{ marginTop: 14 }}>
                    <div className="sub-section-title"><i className="fas fa-users" /> Council Members (I - XII)</div>
                    <div style={{ overflowX: 'auto' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 520 }}>
                        <thead><tr>
                          <th className="table-header-cell" style={{ width: 44, textAlign: 'center' }}>#</th>
                          <th className="table-header-cell">Name</th>
                          <th className="table-header-cell" style={{ width: 140 }}>Unit No</th>
                          <th className="table-header-cell" style={{ width: 180 }}>Contact No</th>
                        </tr></thead>
                        <tbody>
                          {(Array.isArray(formData.council_members) ? formData.council_members : Array.from({ length: 12 }, () => ({ name: '', unit_no: '', contact_no: '' }))).map((member, idx) => (
                            <tr key={idx}>
                              <td className="table-data-cell" style={{ textAlign: 'center', fontWeight: 700, color: theme.text2, background: '#fafafa' }}>{['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII'][idx]}</td>
                              <td className="table-data-cell"><input id="mc_form_field_27" name="mc_form_field_27" type="text" className="form-control" style={{ padding: '5px 7px', fontSize: 13 }} placeholder={`Member ${idx + 1}`} value={member.name || ''} onChange={(e) => updateCouncilMember(idx, 'name', e.target.value)} /></td>
                              <td className="table-data-cell"><input id="mc_form_field_28" name="mc_form_field_28" type="text" className="form-control" style={{ padding: '5px 7px', fontSize: 13 }} placeholder="Unit No" value={member.unit_no || ''} onChange={(e) => updateCouncilMember(idx, 'unit_no', e.target.value)} /></td>
                              <td className="table-data-cell"><input id="mc_form_field_29" name="mc_form_field_29" type="text" className="form-control" style={{ padding: '5px 7px', fontSize: 13 }} placeholder="Contact" value={member.contact_no || ''} onChange={(e) => updateCouncilMember(idx, 'contact_no', e.target.value)} /></td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>

                {/* Written Assurance */}
                <div className="reg-section">
                  <div className="reg-section-title"><span className="step-badge" /><i className="fas fa-signature" /><span className="title-text">Secretary Confirmation &amp; Assurance</span></div>
                  <label className="checkbox-item" style={{ background: '#fffbeb', border: '1px solid #fde68a' }}>
                    <input id="mc_form_field_30" name="mc_form_field_30" type="checkbox" checked={!!formData.written_assurance_fulfilled} onChange={e => field('written_assurance_fulfilled')(e.target.checked)} />
                    <span style={{ fontSize: 13, fontWeight: 500, color: '#92400e' }}>I hereby certify and provide written assurance that all requirements of the Condominium Management Authority (CMA) will be fulfilled in accordance with the regulations.</span>
                  </label>
                </div>
              </div>
            );
          })()}

          {/* - TAB 2: Other Details - */}
          {activeTab === 'details' && (
            <>
              {/* Filing Details - reg_date and new_file_no shown here so user can fill without visiting Registration Form tab */}
              <SectionLabel>Filing Details</SectionLabel>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px 14px' }}>
                <FormField label="Registration Date *" type="date" value={formData.reg_date} onChange={field('reg_date')} />
                <FormField label="New File No *" value={formData.new_file_no} placeholder="e.g. CMA/CCU/2026/001" onChange={field('new_file_no')} />
              </div>

              <SectionLabel>Classification &amp; Location</SectionLabel>
              <FormSelect
                label="Category"
                value={formData.category || ''}
                onChange={field('category')}
                options={[
                  '',
                  'Government (Low Income)',
                  'Government (Middle Income)',
                  'Private (Normal)',
                  'Private (Semi-Luxury)',
                  'Private (Luxury)',
                ]}
              />
              <FormField label="Year" type="number" value={formData.year} onChange={field('year')} />
              <FormField label="Town" value={formData.town} onChange={field('town')} />
              <FormField label="Municipal Council / Pradeshiya Saba" value={formData.municipal_council_pradeshiya_saba} onChange={field('municipal_council_pradeshiya_saba')} span2 />
              <FormField label="Certificate Division File No" value={formData.certificate_division_file_no} onChange={field('certificate_division_file_no')} />
              <FormField label="Land Registry Approved Date" value={formData.land_registry_approved_date} onChange={field('land_registry_approved_date')} />
              <FormField label="Declaration No" value={formData.declaration_no} onChange={field('declaration_no')} />

              <SectionLabel>Personnel</SectionLabel>
              <FormField label="MC" value={formData.mc} onChange={field('mc')} />
              <FormField label="Engineer" value={formData.engineer} onChange={field('engineer')} />
              <FormField label="MA" value={formData.ma} onChange={field('ma')} />

              <SectionLabel>AGM &amp; Renewal</SectionLabel>
              <FormField label="AGM Date" value={formData.agm_date} onChange={field('agm_date')} />
              <FormField label="Next AGM Date" value={formData.next_agm_date} onChange={field('next_agm_date')} />
              <FormField label="Renewal Period" value={formData.renewal_period} onChange={field('renewal_period')} />
              <FormSelect label="Renewal Date Vise" value={formData.renewal_date_vise} onChange={field('renewal_date_vise')} options={['', 'Active', 'Non Active']} />
              <FormField label="AGM Date Vise" value={formData.agm_date_vise} onChange={field('agm_date_vise')} />
              <FormField label="Next Renewal Date" type="date" value={formData.next_renewal_date} onChange={field('next_renewal_date')} />

              <SectionLabel>Compliance Documents</SectionLabel>
              <FormField label="AGM Minutes" value={formData.agm_minutes} onChange={field('agm_minutes')} />
              <FormField label="Attendance" value={formData.attendance} onChange={field('attendance')} />
              <FormField label="Audited Accounts" value={formData.audited_accounts} onChange={field('audited_accounts')} />
              <FormField label="Final Accounts" value={formData.final_accounts} onChange={field('final_accounts')} />
              <FormField label="Building Insurance" value={formData.building_insurance} onChange={field('building_insurance')} />
              <FormField label="Sinking Fund" value={formData.sinking_fund} onChange={field('sinking_fund')} />
              <FormField label="Budget Proposal" value={formData.budget_proposal} onChange={field('budget_proposal')} />
            </>
          )}

          {/* - TAB 3: Document Checklist - */}
          {activeTab === 'checklist' && (
            <>
              <div style={{ fontSize: 14, fontWeight: 700, color: theme.navy, textTransform: 'uppercase', letterSpacing: '1px', borderBottom: `1px solid ${theme.border}`, paddingBottom: 6, marginBottom: 10 }}>Document Verification</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {CHECKLIST_ITEMS.map((item) => {
                  const { key, type, label, placeholder } = item;
                  if (type === 'check') {
                    return (
                      <label key={key} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 10px', borderRadius: 8, border: `1px solid ${theme.border}`, background: formChecklistData[key] ? '#f0fdf4' : '#fafafa' }}>
                        <input id="mc_form_field_31" name="mc_form_field_31" type="checkbox" checked={!!formChecklistData[key]} onChange={() => toggleChecklist(key)} />
                        <span style={{ fontSize: 13, color: theme.text }}>{label}</span>
                      </label>
                    );
                  }
                  if (type === 'checkpage') {
                    return (
                      <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 10px', borderRadius: 8, border: `1px solid ${theme.border}`, background: formChecklistData[key] ? '#f0fdf4' : '#fafafa' }}>
                        <input id="mc_form_field_32" name="mc_form_field_32" type="checkbox" checked={!!formChecklistData[key]} onChange={() => toggleChecklist(key)} />
                        <span style={{ fontSize: 13, color: theme.text, flex: 1 }}>{label}</span>
                        <span style={{ fontSize: 11, color: theme.text3 }}>pg.</span>
                        <input id="mc_form_field_33" name="mc_form_field_33" type="text" value={formChecklistData[`${key}_pg`] || ''} onChange={(e) => updateChecklistField(`${key}_pg`, e.target.value)} placeholder={placeholder || '-'} className="mc-input" style={{ width: 54, padding: '5px 7px', fontSize: 12 }} />
                      </div>
                    );
                  }
                  return (
                    <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 10px', borderRadius: 8, border: `1px solid ${theme.border}` }}>
                      <span style={{ fontSize: 13, color: theme.text2, minWidth: 150 }}>{label}</span>
                      <input id="mc_form_field_34" name="mc_form_field_34" type="text" value={formChecklistData[key] || ''} onChange={(e) => updateChecklistField(key, e.target.value)} placeholder={placeholder || ''} className="mc-input" style={{ padding: '6px 9px', fontSize: 12.5 }} />
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>

        <div style={{ padding: '14px 22px', borderTop: `1px solid ${theme.border}`, display: 'flex', justifyContent: 'flex-end', gap: 10, flexWrap: 'wrap' }}>
          <button onClick={() => setModalOpen(false)} className="mc-btn-outline">Cancel</button>
          {!isViewOnly && <button onClick={() => handleSave({ approve: false })} className="mc-btn-outline"><i className="fas fa-save" /> {editingId ? 'Update' : 'Save'}</button>}
          {!isViewOnly && isAGM && (
            <button onClick={() => handleSave({ approve: true })} className="mc-btn-primary" disabled={!canApproveWithAgmChecklist(formChecklistData)}><i className="fas fa-check-circle" /> Approve & Activate</button>
          )}
        </div>
      </div>
    </div>
  );
}
