import React from 'react';
import { StatusPill, buildMultiYearRenewalRows, getDetailedRenewalStatusText, ViewField } from './MCManagementShared.jsx';

export default function MCManagementViewModal({
  viewModalOpen,
  setViewModalOpen,
  viewRecord,
  viewFormTab,
  setViewFormTab,
  renderOfficialRegistrationForm,
  renderOfficialChecklistForm,
  formatDisplayDate,
  getCategoryDisplayValue,
  formatBoolean,
  getRenewalAmountInfo,
  settings,
  openInvoice,
  openAcknowledgement,
  printOfficialForms,
  printingOfficialForms,
  isViewOnly,
  openEdit,
  theme,
  checklistCompletion
}) {
  if (!viewModalOpen || !viewRecord) return null;

  // Polyfills for getCategoryDisplayValue and formatBoolean if not passed
  const _getCategoryDisplayValue = getCategoryDisplayValue || ((val) => val);
  const _formatBoolean = formatBoolean || ((val) => val ? 'Yes' : 'No');

  return (

    <div className="mc-overlay" onClick={(e) => e.target === e.currentTarget && setViewModalOpen(false)}>
      <div className="mc-modal" style={{ maxWidth: 820, display: 'flex', flexDirection: 'column', maxHeight: '92vh' }}>
        <div className="mc-modal-header">
          <span style={{ fontSize: 16, fontWeight: 700 }}>MC Record Details</span>
          <button onClick={() => setViewModalOpen(false)} className="mc-close-btn"><i className="fas fa-times" /></button>
        </div>

        <div style={{ display: 'flex', gap: 0, padding: '0 22px', borderBottom: `2px solid ${theme.border}`, background: '#f8fafc' }}>
          {[
            { id: 'summary', label: 'Summary', icon: 'fas fa-list' },
            { id: 'registration', label: 'Registration Form', icon: 'fas fa-file-alt' },
            { id: 'checklist', label: 'Document Checklist', icon: 'fas fa-clipboard-check' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setViewFormTab(tab.id)}
              className="mc-btn-outline" style={{ borderRadius: 0, borderTop: 'none', borderLeft: 'none', borderRight: 'none', padding: '11px 18px', fontSize: 13, fontWeight: viewFormTab === tab.id ? 700 : 500, color: viewFormTab === tab.id ? theme.blue : theme.text2, borderBottom: viewFormTab === tab.id ? `2px solid ${theme.blue}` : '2px solid transparent', marginBottom: -2, background: 'transparent' }}
            >
              <i className={tab.icon} style={{ marginRight: 6 }} />{tab.label}
            </button>
          ))}
        </div>


        {viewFormTab === 'registration' && (
          <div style={{ padding: '18px 0', overflowY: 'auto', flex: 1, background: '#eef1f6' }}>
            <div style={{ background: '#fff', boxShadow: '0 1px 6px rgba(0,0,0,.08)' }}>
              {renderOfficialRegistrationForm(viewRecord)}
            </div>
          </div>
        )}

        {viewFormTab === 'checklist' && (
          <div style={{ padding: '18px 0', overflowY: 'auto', flex: 1, background: '#eef1f6' }}>
            <div style={{ background: '#fff', boxShadow: '0 1px 6px rgba(0,0,0,.08)' }}>
              {renderOfficialChecklistForm(viewRecord)}
            </div>
          </div>
        )}

        {viewFormTab === 'summary' && (
          <div style={{ padding: 22, overflowY: 'auto', flex: 1 }}>
            {/* Progress Tracker */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 30, position: 'relative' }}>
              {/* Background line */}
              <div style={{ position: 'absolute', top: 18, left: 30, right: 30, height: 4, background: theme.border, zIndex: 0, borderRadius: 2 }} />
              {/* Steps */}
              {[
                { label: 'Registration', done: true, icon: 'fa-file-alt' },
                { label: 'Reg Payment', done: viewRecord.status === 'Active' || viewRecord.status === 'Pending', icon: 'fa-money-check-alt' },
                { label: 'Checklist', done: viewRecord.status === 'Active' || !!viewRecord.cl_checked_by || !!viewRecord.approval_note, icon: 'fa-clipboard-check' },
                { label: 'AGM Part', done: viewRecord.status === 'Active' || !!viewRecord.agm_date || !!viewRecord.agm_minutes, icon: 'fa-users' },
                { label: 'Renewal', done: viewRecord.renewal_paid, current: !viewRecord.renewal_paid && (viewRecord.agm_date || viewRecord.agm_minutes || viewRecord.status === 'Active'), icon: 'fa-sync-alt' }
              ].map((step, idx) => (
                <div key={idx} style={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, width: 80 }}>
                  <div style={{ width: 40, height: 40, borderRadius: 20, background: step.done ? theme.green : (step.current ? theme.blue : '#e2e8f0'), color: step.done || step.current ? '#fff' : '#94a3b8', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, boxShadow: step.current ? `0 0 0 4px rgba(37,99,235,0.2)` : 'none', border: `3px solid #fff`, transition: 'all 0.2s' }}>
                    <i className={`fas ${step.icon}`} />
                  </div>
                  <div style={{ fontSize: 11, fontWeight: step.current ? 700 : 600, color: step.done ? theme.green : (step.current ? theme.blue : '#94a3b8'), textAlign: 'center', lineHeight: 1.2 }}>
                    {step.label}
                  </div>
                </div>
              ))}
            </div>

            <div style={{ fontSize: 12, fontWeight: 700, color: theme.navy, textTransform: 'uppercase', letterSpacing: '1px', borderBottom: `1px solid ${theme.border}`, paddingBottom: 6, marginBottom: 12 }}>Identity &amp; Filing</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 0, marginBottom: 20 }}>
              <ViewField label="Reg Date" value={formatDisplayDate(viewRecord.reg_date)} />
              <ViewField label="Old File No" value={viewRecord.old_file_no} />
              <ViewField label="New File No" value={viewRecord.new_file_no} />
              <ViewField label="Management Corporation Name" value={viewRecord.management_corporation_name || viewRecord.name} />
              <ViewField label="Address" value={viewRecord.address} />
              <ViewField label="Plan No" value={viewRecord.plan_no} />
              <ViewField label="Declaration No" value={viewRecord.declaration_no} />
              <ViewField label="Email Address" value={viewRecord.email_address} />
            </div>

            <div style={{ fontSize: 12, fontWeight: 700, color: theme.navy, textTransform: 'uppercase', letterSpacing: '1px', borderBottom: `1px solid ${theme.border}`, paddingBottom: 6, marginBottom: 12 }}>Units</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 0, marginBottom: 20 }}>
              <ViewField label="Total Units" value={viewRecord.units} />
              <ViewField label="Residential" value={viewRecord.residential ?? viewRecord.residential_units} />
              <ViewField label="Non Residential" value={viewRecord.non_residential ?? viewRecord.non_residential_units} />
              <ViewField label="Category" value={_getCategoryDisplayValue(viewRecord)} />
              <ViewField label="Service Units" value={viewRecord.service_units} />
            </div>

            <div style={{ fontSize: 12, fontWeight: 700, color: theme.navy, textTransform: 'uppercase', letterSpacing: '1px', borderBottom: `1px solid ${theme.border}`, paddingBottom: 6, marginBottom: 12 }}>Classification &amp; Location</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 0, marginBottom: 20 }}>
              <ViewField label="Category" value={viewRecord.category} />
              <ViewField label="Year" value={viewRecord.year} />
              <ViewField label="Town" value={viewRecord.town} />
              <ViewField label="Municipal Council / Pradeshiya Saba" value={viewRecord.municipal_council_pradeshiya_saba} />
              <ViewField label="Certificate Division File No" value={viewRecord.certificate_division_file_no} />
              <ViewField label="Land Registry Approved Date" value={viewRecord.land_registry_approved_date} />
              <ViewField label="Approval / Rejection Remarks" value={viewRecord.approval_note || '-'} />
            </div>
            <br></br>
            <div style={{ fontSize: 12, fontWeight: 700, color: theme.navy, textTransform: 'uppercase', letterSpacing: '1px', borderBottom: `1px solid ${theme.border}`, paddingBottom: 6, marginBottom: 12 }}>Registration Form Details</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 0, marginBottom: 20 }}>
              <ViewField label="Non-res Shops" value={viewRecord.non_res_shops} />
              <ViewField label="Non-res Office" value={viewRecord.non_res_office} />
              <ViewField label="Non-res Hotel" value={viewRecord.non_res_hotel} />
              <ViewField label="Services Lift" value={_formatBoolean(viewRecord.services_lift)} />
              <ViewField label="Fire Agreement" value={_formatBoolean(viewRecord.services_fire_agreement)} />
              <ViewField label="Generator Agreement" value={_formatBoolean(viewRecord.services_generator_agreement)} />
              <ViewField label="Insurance" value={_formatBoolean(viewRecord.services_insurance)} />
              <ViewField label="Common Parking" value={_formatBoolean(viewRecord.fac_common_parking)} />
              <ViewField label="Gym" value={_formatBoolean(viewRecord.fac_gym)} />
              <ViewField label="Swimming Pool" value={_formatBoolean(viewRecord.fac_swimming_pool)} />
              <ViewField label="Restaurant" value={_formatBoolean(viewRecord.fac_restaurant)} />
              <ViewField label="Super Market" value={_formatBoolean(viewRecord.fac_super_market)} />
              <ViewField label="Garden" value={_formatBoolean(viewRecord.fac_garden)} />
              <ViewField label="Sauna" value={_formatBoolean(viewRecord.fac_sauna)} />
              <ViewField label="Salon" value={_formatBoolean(viewRecord.fac_salon)} />
              <ViewField label="Golf/Tennis" value={_formatBoolean(viewRecord.fac_golf_tennis)} />
              <ViewField label="Day Care" value={_formatBoolean(viewRecord.fac_day_care)} />
              <ViewField label="Management Company Controlled" value={_formatBoolean(viewRecord.mgmt_company_controlled)} />
              <ViewField label="Management Company Name" value={viewRecord.mgmt_company_name} />
              <ViewField label="Management Company Contact" value={viewRecord.mgmt_company_contact} />
              <ViewField label="Secretary Contact" value={viewRecord.secretary_contact} />
              <ViewField label="Secretary Email" value={viewRecord.secretary_email} />
              <ViewField label="Treasurer Contact" value={viewRecord.treasurer_contact} />
              <ViewField label="Treasurer Email" value={viewRecord.treasurer_email} />
              <ViewField label="Written Assurance Fulfilled" value={_formatBoolean(viewRecord.written_assurance_fulfilled)} />
            </div>

            <div className="mc-section-label">Registration Category &amp; Fee</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(280px,1fr))', gap: '0 16px', marginBottom: 20 }}>
              <ViewField label="Ownership Type" value={viewRecord.ownership_type} />
              <ViewField label="Govt Income Level" value={viewRecord.government_income_level} />
              <ViewField label="Private Category Override" value={viewRecord.private_category_override} />
              <ViewField label="Fee Rate per Unit" value={viewRecord.fee_rate_per_unit} />
              <ViewField label="Fee Amount" value={viewRecord.fee_amount} />
              <ViewField label="SSCL Amount" value={viewRecord.sscl_amount} />
              <ViewField label="VAT Amount" value={viewRecord.vat_amount} />
              <ViewField label="Total Amount" value={viewRecord.total_amount} />
              <ViewField label="Next Renewal Date" value={formatDisplayDate(viewRecord.next_renewal_date)} />
            </div>

            <div className="mc-section-label">Council Members (I-IV)</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 0, marginBottom: 20 }}>
              {(() => {
                const rows = Array.isArray(viewRecord.council_members)
                  ? viewRecord.council_members
                  : (() => { try { return JSON.parse(viewRecord.council_members || '[]'); } catch (e) { return []; } })();
                const romanNumerals = ['I', 'II', 'III', 'IV'];
                return Array.from({ length: 4 }, (_, idx) => rows[idx] || {}).map((row, idx) => {
                  const num = romanNumerals[idx] || String.fromCharCode(73 + idx);
                  const nameStr = row.name || '-';
                  const unitStr = row.unit_no ? ` / Unit No: ${row.unit_no}` : '';
                  const contactStr = row.contact_no ? ` / Contact: ${row.contact_no}` : '';
                  const val = (nameStr === '-' && !unitStr && !contactStr) ? '-' : `${nameStr}${unitStr}${contactStr}`;
                  return <ViewField key={idx} label={`Member ${num}`} value={val} />;
                });
              })()}
            </div>

            <div style={{ fontSize: 12, fontWeight: 700, color: theme.navy, textTransform: 'uppercase', letterSpacing: '1px', borderBottom: `1px solid ${theme.border}`, paddingBottom: 6, marginBottom: 12 }}>Personnel</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 0, marginBottom: 20 }}>
              <ViewField label="Secretary" value={viewRecord.secretary} />
              <ViewField label="Secretary Unit No" value={viewRecord.secretary_unit_no} />
              <ViewField label="Treasurer" value={viewRecord.treasurer} />
              <ViewField label="Treasurer Unit No" value={viewRecord.treasurer_unit_no} />
              <ViewField label="MC" value={viewRecord.mc} />
              <ViewField label="Engineer" value={viewRecord.engineer} />
              <ViewField label="MA" value={viewRecord.ma} />
            </div>

            <div style={{ fontSize: 12, fontWeight: 700, color: theme.navy, textTransform: 'uppercase', letterSpacing: '1px', borderBottom: `1px solid ${theme.border}`, paddingBottom: 6, marginBottom: 12 }}>AGM &amp; Renewal</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 0, marginBottom: 8 }}>
              <ViewField label="AGM Date" value={viewRecord.agm_date} />
              <ViewField label="Next AGM Date" value={viewRecord.next_agm_date} />
              <ViewField label="Renewal Period" value={viewRecord.renewal_period} />

              {/* Renewal Date Vise - computed based on renewal_period vs current year */}
              {(() => {
                const currentYear = new Date().getFullYear();
                const renewalPeriodYear = parseInt(viewRecord.renewal_period, 10);
                const rawVise = String(viewRecord.renewal_date_vise || '').trim().toLowerCase();
                const paymentStatus = viewRecord.renewal_payment_status;
                let effectiveVise;
                if (paymentStatus === 'Pending Approval') effectiveVise = 'Pending';
                else if (rawVise === 'non active' || rawVise === 'nonactive') effectiveVise = 'Non Active';
                else if (paymentStatus === 'Approved') effectiveVise = 'Active';
                else if (renewalPeriodYear && renewalPeriodYear >= currentYear) effectiveVise = 'Active';
                else if (renewalPeriodYear && renewalPeriodYear < currentYear) effectiveVise = 'Non Active';
                else effectiveVise = viewRecord.renewal_date_vise || '-';

                const isActive = effectiveVise === 'Active';
                const isNonActive = effectiveVise === 'Non Active';
                const isPending = effectiveVise === 'Pending';
                return (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '7px 0', borderBottom: `1px solid ${theme.border}` }}>
                    <span style={{ fontSize: 12, fontWeight: 600, color: theme.text2, minWidth: 140 }}>Renewal Date Vise</span>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, background: isActive ? '#f0fdf4' : isNonActive ? '#fef2f2' : isPending ? '#eff6ff' : '#f8fafc', border: `1px solid ${isActive ? '#bbf7d0' : isNonActive ? '#fecaca' : isPending ? '#bfdbfe' : '#e2e8f0'}`, color: isActive ? '#15803d' : isNonActive ? '#dc2626' : isPending ? '#2563eb' : theme.text2, borderRadius: 20, padding: '2px 10px', fontSize: 11, fontWeight: 700 }}>
                      <span style={{ width: 7, height: 7, borderRadius: '50%', background: isActive ? '#16a34a' : isNonActive ? '#dc2626' : isPending ? '#2563eb' : '#94a3b8', display: 'inline-block' }} />
                      {effectiveVise}
                    </span>
                  </div>
                );
              })()}

              {/* AGM Date Vise - badge style */}
              {(() => {
                const rawAgmVise = String(viewRecord.agm_date_vise || '').trim().toLowerCase();
                let effectiveAgmVise;
                if (rawAgmVise === 'active') effectiveAgmVise = 'Active';
                else if (rawAgmVise === 'non active' || rawAgmVise === 'nonactive') effectiveAgmVise = 'Non Active';
                else if (viewRecord.next_agm_date) {
                  const nextD = new Date(viewRecord.next_agm_date);
                  const today = new Date();
                  today.setHours(0, 0, 0, 0);
                  effectiveAgmVise = (!Number.isNaN(nextD.getTime()) && nextD >= today) ? 'Active' : 'Non Active';
                } else if (viewRecord.agm_date) {
                  const agmD = new Date(viewRecord.agm_date);
                  const oneYearAgo = new Date();
                  oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
                  effectiveAgmVise = (!Number.isNaN(agmD.getTime()) && agmD >= oneYearAgo) ? 'Active' : 'Non Active';
                } else {
                  effectiveAgmVise = viewRecord.agm_date_vise || '-';
                }

                const isActive = effectiveAgmVise === 'Active';
                const isNonActive = effectiveAgmVise === 'Non Active';
                return (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '7px 0', borderBottom: `1px solid ${theme.border}` }}>
                    <span style={{ fontSize: 12, fontWeight: 600, color: theme.text2, minWidth: 140 }}>AGM Date Vise</span>
                    <span style={{
                      display: 'inline-flex', alignItems: 'center', gap: 5,
                      background: isActive ? '#f0fdf4' : isNonActive ? '#fef2f2' : '#f8fafc',
                      border: `1px solid ${isActive ? '#bbf7d0' : isNonActive ? '#fecaca' : '#e2e8f0'}`,
                      color: isActive ? '#15803d' : isNonActive ? '#dc2626' : theme.text2,
                      borderRadius: 20, padding: '2px 10px', fontSize: 11, fontWeight: 700,
                    }}>
                      <span style={{ width: 7, height: 7, borderRadius: '50%', background: isActive ? '#16a34a' : isNonActive ? '#dc2626' : '#94a3b8', display: 'inline-block' }} />
                      {effectiveAgmVise}
                    </span>
                  </div>
                );
              })()}

              {(() => {
                let effNextRenewalDate = viewRecord.next_renewal_date;
                if (!effNextRenewalDate && viewRecord.renewal_period) {
                  const rpMatches = String(viewRecord.renewal_period).match(/\b(19|20)\d{2}\b/g);
                  const rpYear = rpMatches ? parseInt(rpMatches[rpMatches.length - 1], 10) : parseInt(viewRecord.renewal_period, 10);
                  if (!isNaN(rpYear)) {
                    effNextRenewalDate = `${rpYear}-12-31`;
                  }
                }
                return <ViewField label="Next Renewal Date" value={formatDisplayDate(effNextRenewalDate)} />;
              })()}
              {(() => {
                const info = getRenewalAmountInfo(viewRecord, settings);
                if (!info) return null;
                return (
                  <>
                    <ViewField label="Renewal Rate / Unit" value={`Rs. ${info.rate.toLocaleString('en-LK', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`} />
                    <ViewField label="Estimated Annual Renewal Fee (incl. SSCL &amp; VAT)" value={`Rs. ${info.annual.toLocaleString('en-LK', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`} />
                  </>
                );
              })()}
            </div>

            {/* Generate Renewal Ticket button */}
            {(() => {
              const renewalVise = String(viewRecord.renewal_date_vise || '').trim().toLowerCase();
              const isNonActive = renewalVise === 'non active' || renewalVise === 'nonactive';
              const isActive = renewalVise === 'active';
              const multiRows = isNonActive ? buildMultiYearRenewalRows(viewRecord, settings) : null;
              const unpaidYears = multiRows ? multiRows.length : 0;
              return (
                <div style={{ marginBottom: 20, padding: 12, borderRadius: 10, background: isNonActive ? '#fff7ed' : isActive ? '#f0fdf4' : '#f8fafc', border: `1px solid ${isNonActive ? '#fed7aa' : isActive ? '#bbf7d0' : theme.border}` }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: isNonActive ? '#c2410c' : isActive ? '#15803d' : theme.navy, marginBottom: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <i className={`fas ${isNonActive ? 'fa-exclamation-triangle' : 'fa-calendar-check'}`} />
                    {isNonActive
                      ? `Renewal Overdue - ${unpaidYears} year(s) unpaid`
                      : isActive ? 'Renewal Active - Current Year'
                        : 'Renewal'}
                  </div>
                  {isNonActive && multiRows && multiRows.length > 0 && (
                    <div style={{ fontSize: 11, color: theme.text2, marginBottom: 8 }}>
                      Years: {multiRows.map(r => r.year).join(', ')} &nbsp;-&nbsp;
                      Grand Total: <strong>Rs. {multiRows.reduce((s, r) => s + r.total, 0).toLocaleString('en-LK', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong>
                    </div>
                  )}
                  <button
                    onClick={() => openInvoice(viewRecord, false, true)}
                    className="mc-btn-primary" style={{ background: isNonActive ? '#c2410c' : theme.navy, padding: '8px 16px', fontSize: 12 }}
                  >
                    <i className="fas fa-ticket-alt" style={{ marginRight: 6 }} />
                    {isNonActive ? 'Generate Multi-Year Renewal Letter' : 'Generate Renewal Ticket'}
                  </button>
                </div>
              );
            })()}

            {/* Renewal Payment & Acknowledgement - full detail + quick actions (NEW) */}
            <div style={{ fontSize: 12, fontWeight: 700, color: theme.navy, textTransform: 'uppercase', letterSpacing: '1px', borderBottom: `1px solid ${theme.border}`, paddingBottom: 6, marginBottom: 12 }}>Renewal Payment &amp; Acknowledgement</div>
            <div style={{ border: `1px solid ${theme.border}`, borderRadius: 10, background: viewRecord.renewal_paid ? '#f0fdf4' : '#f8fafc', padding: 14, marginBottom: 20 }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 0, marginBottom: 10 }}>
                <ViewField label="Renewal Fee Paid?" value={viewRecord.renewal_paid ? 'Yes' : 'No'} />
                <ViewField label="Paid Date" value={formatDisplayDate(viewRecord.renewal_paid_date)} />
                <ViewField label="Paid Amount" value={viewRecord.renewal_paid_amount != null ? `Rs. ${Number(viewRecord.renewal_paid_amount).toLocaleString('en-LK', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '-'} />
                <ViewField label="Renewal Receipt No" value={viewRecord.renewal_receipt_no} />
                <ViewField label="Acknowledgement No" value={viewRecord.acknowledgement_no} />
                <ViewField label="Acknowledgement Date" value={formatDisplayDate(viewRecord.acknowledgement_date)} />
              </div>
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                <button onClick={() => openInvoice(viewRecord, false, true)} className="mc-btn-outline" style={{ padding: '8px 14px' }}>
                  <i className="fas fa-file-invoice" /> View Renewal Receipt &amp; Covering Letter
                </button>
                {viewRecord.renewal_paid && (
                  <button onClick={() => openAcknowledgement(viewRecord)} className="mc-btn-primary" style={{ background: theme.green, padding: '8px 14px' }}>
                    <i className="fas fa-file-signature" /> View Acknowledgement
                  </button>
                )}
              </div>
              {!viewRecord.renewal_paid && (
                <div style={{ marginTop: 10, fontSize: 11.5, color: theme.text3 }}>
                  Open the renewal receipt above and use <strong>Mark as Paid</strong> once payment is received - the Acknowledgement will then appear here automatically.
                </div>
              )}
            </div>

            <div style={{ fontSize: 12, fontWeight: 700, color: theme.navy, textTransform: 'uppercase', letterSpacing: '1px', borderBottom: `1px solid ${theme.border}`, paddingBottom: 6, marginBottom: 12 }}>Compliance Documents</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 0, marginBottom: 20 }}>
              <ViewField label="AGM Minutes" value={viewRecord.agm_minutes} />
              <ViewField label="Attendance" value={viewRecord.attendance} />
              <ViewField label="Audited Accounts" value={viewRecord.audited_accounts} />
              <ViewField label="Final Accounts" value={viewRecord.final_accounts} />
              <ViewField label="Building Insurance" value={viewRecord.building_insurance} />
              <ViewField label="Sinking Fund" value={viewRecord.sinking_fund} />
              <ViewField label="Budget Proposal" value={viewRecord.budget_proposal} />
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: 12, fontWeight: 500, color: theme.text2 }}>Status:</span>
              <StatusPill status={viewRecord.status} />
            </div>
            {(() => {
              if (!viewRecord) return null;
              const st = getDetailedRenewalStatusText(viewRecord, viewRecord.status, settings);
              return (
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 10 }}>
                  <span style={{ fontSize: 12, fontWeight: 500, color: theme.text2 }}>Renewal Status:</span>
                  <span style={{ fontSize: 12, fontWeight: 700, color: st.isOk ? theme.green : theme.red }}>
                    <i className={`fas ${st.isOk ? 'fa-check-circle' : 'fa-exclamation-circle'}`} style={{ marginRight: 6 }} />
                    {st.text}
                  </span>
                </div>
              );
            })()}

            {String(viewRecord.status || '').trim().toLowerCase() === 'pending' && (
              <div style={{ marginTop: 12, padding: 10, borderRadius: 10, background: '#fff7ed', border: `1px solid #fed7aa`, color: '#92400e', fontWeight: 700 }}>
                <i className="fas fa-clock" style={{ marginRight: 8 }} /> This record is pending - waiting for AGM approval.
                {viewRecord.approval_note ? <div style={{ marginTop: 8, fontWeight: 600, color: theme.text }}>{viewRecord.approval_note}</div> : null}
              </div>
            )}

            {(() => {
              const summary = checklistCompletion(viewRecord);
              if (!summary.hasData) return null;
              return (
                <div style={{ marginTop: 14, padding: 12, borderRadius: 10, background: '#f8fafc', border: `1px solid ${theme.border}` }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: theme.navy, textTransform: 'uppercase', letterSpacing: '.6px', marginBottom: 8 }}>Checklist Verification</div>
                  <ViewField label="Checked Items" value={`${summary.checked} / ${summary.total}`} />
                  <ViewField label="Checked By" value={viewRecord.cl_checked_by || '-'} />
                  <ViewField label="Remarks" value={viewRecord.approval_note || '-'} />
                </div>
              );
            })()}

            {/* Audit / timestamps */}
            <div style={{ fontSize: 12, fontWeight: 700, color: theme.navy, textTransform: 'uppercase', letterSpacing: '1px', borderBottom: `1px solid ${theme.border}`, paddingBottom: 6, marginBottom: 12, marginTop: 20 }}>Audit</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 0, marginTop: 10 }}>
              <ViewField label="Created At" value={viewRecord.created_at ? `${formatDisplayDate(viewRecord.created_at)} (By: ${viewRecord.created_by || 'System'})` : '-'} />
              <ViewField label="Updated At" value={viewRecord.updated_at ? `${formatDisplayDate(viewRecord.updated_at)} (By: ${viewRecord.updated_by || viewRecord.modified_by || 'System'})` : '-'} />
            </div>
          </div>
        )}

        {/* Hidden print bundle - conditionally renders the active form for printing */}
        <div className="print-bundle">
          {viewFormTab === 'registration' && (
            <div className="form-page">{renderOfficialRegistrationForm(viewRecord)}</div>
          )}
          {viewFormTab === 'checklist' && (
            <div className="form-page">{renderOfficialChecklistForm(viewRecord)}</div>
          )}
          {viewFormTab === 'summary' && (
            <>
              <div className="form-page">{renderOfficialRegistrationForm(viewRecord)}</div>
              <div className="form-page">{renderOfficialChecklistForm(viewRecord)}</div>
            </>
          )}
        </div>

        <div style={{ padding: '14px 22px', borderTop: `1px solid ${theme.border}`, display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
          {viewFormTab !== 'summary' ? (
            <button onClick={printOfficialForms} disabled={printingOfficialForms} className="mc-btn-outline" style={{ marginRight: 'auto' }}>
              {printingOfficialForms ? <><i className="fas fa-spinner fa-spin" style={{ marginRight: 6 }} /> Printing...</> : <><i className="fas fa-print" style={{ marginRight: 6 }} /> Print</>}
            </button>
          ) : (
            <div style={{ marginRight: 'auto' }}></div>
          )}
          {!isViewOnly && <button onClick={() => { setViewModalOpen(false); openEdit(viewRecord); }} className="mc-btn-primary">
            <i className="fas fa-edit" /> Edit
          </button>}
          <button onClick={() => setViewModalOpen(false)} className="mc-btn-outline">Close</button>
        </div>
      </div>
    </div>
  );
}
