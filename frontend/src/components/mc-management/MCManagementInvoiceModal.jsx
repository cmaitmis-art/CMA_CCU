import React from 'react';

export default function MCManagementInvoiceModal({
  invoiceModalOpen,
  setInvoiceModalOpen,
  invoiceRecord,
  selectedRenewalYears,
  setSelectedRenewalYears,
  setManualPaidYears,
  printInvoice,
  openAcknowledgement,
  approveRenewalPayment,
  markRenewalPaid,
  markingRenewalPaid,
  mcs,
  isAGM,
  formatDisplayDate,
  SSCL_RATE,
  VAT_RATE,
  theme
}) {
  if (!invoiceModalOpen || !invoiceRecord) return null;

  return (

    <div className="mc-overlay" onClick={(e) => { if (e.target === e.currentTarget) { setInvoiceModalOpen(false); setSelectedRenewalYears([]); setManualPaidYears(''); } }}>
      <div className="mc-modal" style={{ maxWidth: 780, display: 'flex', flexDirection: 'column', maxHeight: '90vh' }}>
        <div className="mc-modal-header">
          <span style={{ fontSize: 16, fontWeight: 700 }}>{invoiceRecord._isRenewal ? 'Renewal Receipt' : 'Registration Receipt'}</span>
          <button onClick={() => { setInvoiceModalOpen(false); setSelectedRenewalYears([]); setManualPaidYears(''); }} className="mc-close-btn"><i className="fas fa-times" /></button>
        </div>

        <div style={{ padding: 22, overflowY: 'auto', flex: 1 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 18 }}>
            <div>
              <div style={{ fontSize: 13, color: theme.text2, marginBottom: 4 }}>Receipt Number</div>
              <div style={{ fontSize: 18, fontWeight: 700, color: theme.navy }}>{invoiceRecord.invoice_number}</div>
            </div>
            {invoiceRecord._isRenewal && invoiceRecord.renewal_paid_year && new Date().getFullYear() - invoiceRecord.renewal_paid_year > 0 && (
              <div style={{ background: theme.orange, color: '#fff', padding: '6px 12px', borderRadius: 20, fontSize: 12, fontWeight: 700 }}>
                <i className="fas fa-exclamation-triangle" style={{ marginRight: 6 }} />
                Renewal Overdue by {new Date().getFullYear() - invoiceRecord.renewal_paid_year} Year(s)
              </div>
            )}
            {(() => {
              const fmt = (n) => (n != null ? Number(n).toLocaleString('en-LK', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '-');
              const multiRows = invoiceRecord._multiYearRows || [];
              const isMultiYear = multiRows.length > 1;
              const selectedRows = multiRows.filter(r => selectedRenewalYears.includes(r.year));
              const selectedTotal = selectedRows.reduce((s, r) => s + r.total, 0);
              const allSelected = multiRows.length > 0 && selectedRenewalYears.length === multiRows.length;
              const someSelected = selectedRenewalYears.length > 0;
              const grandTotal = multiRows.reduce((s, r) => s + r.total, 0) || invoiceRecord.total_amount || 0;
              const toggleYear = (year) => setSelectedRenewalYears(prev => prev.includes(year) ? prev.filter(y => y !== year) : [...prev, year]);
              const toggleAll = () => setSelectedRenewalYears(allSelected ? [] : multiRows.map(r => r.year));
              return (
                <>
                  <button
                    onClick={printInvoice}
                    className="mc-btn-primary" style={{ padding: '9px 14px', opacity: (isMultiYear && !someSelected) ? 0.55 : 1 }}
                    title={isMultiYear && !someSelected ? 'Select years below to print' : ''}
                  >
                    <i className="fas fa-print" />
                    {isMultiYear && someSelected ? ` Print Selected (${selectedRenewalYears.length})` : ' Print Receipt'}
                  </button>

                  <div style={{ border: `1px solid ${theme.border}`, borderRadius: 10, background: '#f8fafc', padding: 16, marginBottom: 20, marginTop: 18 }}>
                    <div style={{ fontSize: 14, fontWeight: 700, color: theme.navy, marginBottom: 12 }}>Payable Summary</div>

                    {invoiceRecord._isRenewal ? (
                      <>
                        {multiRows.length > 1 && (
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8, padding: '5px 8px', background: '#eff6ff', borderRadius: 6, border: '1px solid #bfdbfe', fontSize: 12 }}>
                            <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontWeight: 600, color: theme.navy }}>
                              <input id="mc_form_field_35" name="mc_form_field_35" type="checkbox" checked={allSelected} onChange={toggleAll} style={{ width: 14, height: 14, cursor: 'pointer', accentColor: theme.navy }} />
                              Select All Years ({multiRows.length})
                            </label>
                            {someSelected && (
                              <span style={{ color: theme.navy, fontWeight: 700 }}>
                                {selectedRenewalYears.length} yr{selectedRenewalYears.length > 1 ? 's' : ''} — Rs. {fmt(selectedTotal)}
                              </span>
                            )}
                          </div>
                        )}
                        <div style={{ overflowX: 'auto' }}>
                          {multiRows.length > 0 ? (
                            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '480px', fontSize: 11 }}>
                              <thead>
                                <tr style={{ background: '#f1f5f9' }}>
                                  {multiRows.length > 1 && <th style={{ padding: '6px 6px', borderBottom: `1px solid ${theme.border}`, width: 28, whiteSpace: 'nowrap' }}></th>}
                                  <th style={{ padding: '6px 8px', borderBottom: `1px solid ${theme.border}`, textAlign: 'left', fontSize: 11, fontWeight: 600, color: theme.text2, whiteSpace: 'nowrap' }}>Year</th>
                                  <th style={{ padding: '6px 8px', borderBottom: `1px solid ${theme.border}`, textAlign: 'right', fontSize: 11, fontWeight: 600, color: theme.text2, whiteSpace: 'nowrap' }}>Units</th>
                                  <th style={{ padding: '6px 8px', borderBottom: `1px solid ${theme.border}`, textAlign: 'right', fontSize: 11, fontWeight: 600, color: theme.text2, whiteSpace: 'nowrap' }}>Fee (Rs.)</th>
                                  <th style={{ padding: '6px 8px', borderBottom: `1px solid ${theme.border}`, textAlign: 'right', fontSize: 11, fontWeight: 600, color: theme.text2, whiteSpace: 'nowrap' }}>SSCL {SSCL_RATE * 100}%</th>
                                  <th style={{ padding: '6px 8px', borderBottom: `1px solid ${theme.border}`, textAlign: 'right', fontSize: 11, fontWeight: 600, color: theme.text2, whiteSpace: 'nowrap' }}>VAT {VAT_RATE * 100}%</th>
                                  <th style={{ padding: '6px 8px', borderBottom: `1px solid ${theme.border}`, textAlign: 'right', fontSize: 11, fontWeight: 600, color: theme.text2, whiteSpace: 'nowrap' }}>Total (Rs.)</th>
                                </tr>
                              </thead>
                              <tbody>
                                {multiRows.map((row) => {
                                  const isSel = selectedRenewalYears.includes(row.year);
                                  return (
                                    <tr key={row.year} onClick={() => multiRows.length > 1 && toggleYear(row.year)} style={{
                                      background: isSel ? (row.year < 2023 ? '#fef3c7' : '#dcfce7') : '#fff',
                                      borderBottom: `1px solid ${theme.border}`, cursor: multiRows.length > 1 ? 'pointer' : 'default',
                                      outline: isSel ? `2px solid ${row.year < 2023 ? theme.orange : theme.green}` : 'none',
                                      outlineOffset: -1, transition: 'background 0.15s'
                                    }}>
                                      {multiRows.length > 1 && (
                                        <td style={{ padding: '6px 6px', textAlign: 'center', whiteSpace: 'nowrap' }}>
                                          <input id="mc_form_field_36" name="mc_form_field_36" type="checkbox" checked={isSel} onChange={() => toggleYear(row.year)} onClick={e => e.stopPropagation()} style={{ width: 13, height: 13, cursor: 'pointer', accentColor: row.year < 2023 ? theme.orange : theme.green }} />
                                        </td>
                                      )}
                                      <td style={{ padding: '6px 8px', fontSize: 11, whiteSpace: 'nowrap' }}>
                                        <span style={{ fontWeight: 600 }}>{row.year}</span>
                                        {row.year < 2023 && <span style={{ marginLeft: 5, fontSize: 9.5, color: theme.orange, background: '#fff7ed', border: '1px solid #fde68a', borderRadius: 3, padding: '1px 4px' }}>Old rate</span>}
                                        {row.year >= 2023 && <span style={{ marginLeft: 5, fontSize: 9.5, color: theme.green, background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 3, padding: '1px 4px' }}>New rate</span>}
                                      </td>
                                      <td style={{ padding: '6px 8px', fontSize: 11, textAlign: 'right', whiteSpace: 'nowrap' }}>{row.units}</td>
                                      <td style={{ padding: '6px 8px', fontSize: 11, textAlign: 'right', whiteSpace: 'nowrap' }}>{fmt(row.fee)}</td>
                                      <td style={{ padding: '6px 8px', fontSize: 11, textAlign: 'right', whiteSpace: 'nowrap' }}>{fmt(row.sscl)}</td>
                                      <td style={{ padding: '6px 8px', fontSize: 11, textAlign: 'right', whiteSpace: 'nowrap' }}>{fmt(row.vat)}</td>
                                      <td style={{ padding: '6px 8px', fontSize: 11, textAlign: 'right', fontWeight: 600, whiteSpace: 'nowrap' }}>{fmt(row.total)}</td>
                                    </tr>
                                  );
                                })}
                                <tr>
                                  {multiRows.length > 1 && <td style={{ padding: '8px', borderTop: `1px solid ${theme.border}`, whiteSpace: 'nowrap' }}></td>}
                                  <td colSpan={multiRows.length > 1 ? 5 : 6} style={{ padding: '8px', borderTop: `1px solid ${theme.border}`, fontWeight: 700, color: theme.navy, fontSize: 11.5, whiteSpace: 'nowrap' }}>
                                    {someSelected && selectedTotal !== grandTotal ? `Selected (${selectedRenewalYears.length} yr) Total` : 'Total Amount Payable'}
                                  </td>
                                  <td style={{ padding: '8px', borderTop: `1px solid ${theme.border}`, fontWeight: 700, color: theme.navy, fontSize: 11.5, textAlign: 'right', whiteSpace: 'nowrap' }}>
                                    Rs. {fmt(someSelected && selectedTotal !== grandTotal ? selectedTotal : grandTotal)}
                                  </td>
                                </tr>
                                {someSelected && selectedTotal !== grandTotal && (
                                  <tr>
                                    {multiRows.length > 1 && <td style={{ padding: '4px 8px', borderBottom: `1px solid ${theme.border}`, whiteSpace: 'nowrap' }}></td>}
                                    <td colSpan={multiRows.length > 1 ? 5 : 6} style={{ padding: '4px 8px', borderBottom: `1px solid ${theme.border}`, fontSize: 11, color: theme.text3, whiteSpace: 'nowrap' }}>Grand Total (all {multiRows.length} years)</td>
                                    <td style={{ padding: '4px 8px', borderBottom: `1px solid ${theme.border}`, fontSize: 11, color: theme.text3, textAlign: 'right', whiteSpace: 'nowrap' }}>Rs. {fmt(grandTotal)}</td>
                                  </tr>
                                )}
                              </tbody>
                            </table>
                          ) : invoiceRecord.renewal_payment_status ? (
                            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '480px', fontSize: 11 }}>
                              <tbody>
                                <tr>
                                  <td style={{ padding: '6px 8px', borderBottom: `1px solid ${theme.border}`, fontSize: 11, whiteSpace: 'nowrap' }}>Category</td>
                                  <td style={{ padding: '6px 8px', borderBottom: `1px solid ${theme.border}`, fontSize: 11, whiteSpace: 'nowrap' }}>{invoiceRecord.category || '-'}</td>
                                </tr>
                                <tr>
                                  <td style={{ padding: '6px 8px', borderBottom: `1px solid ${theme.border}`, fontSize: 11, whiteSpace: 'nowrap' }}>Number of Parcels (Units)</td>
                                  <td style={{ padding: '6px 8px', borderBottom: `1px solid ${theme.border}`, fontSize: 11, whiteSpace: 'nowrap' }}>{invoiceRecord.units ?? invoiceRecord.residential ?? invoiceRecord.residential_units ?? '-'}</td>
                                </tr>
                                <tr>
                                  <td style={{ padding: '6px 8px', borderBottom: `1px solid ${theme.border}`, fontSize: 11, whiteSpace: 'nowrap' }}>Covering Year</td>
                                  <td style={{ padding: '6px 8px', borderBottom: `1px solid ${theme.border}`, fontSize: 11, whiteSpace: 'nowrap' }}>Up to {invoiceRecord.renewal_paid_year || '-'}</td>
                                </tr>
                                <tr>
                                  <td style={{ padding: '8px', borderBottom: `1px solid ${theme.border}`, fontWeight: 700, color: theme.navy, fontSize: 11.5, whiteSpace: 'nowrap' }}>Total Amount Paid</td>
                                  <td style={{ padding: '8px', borderBottom: `1px solid ${theme.border}`, fontWeight: 700, color: theme.navy, fontSize: 11.5, whiteSpace: 'nowrap' }}>Rs. {fmt(invoiceRecord.renewal_paid_amount || invoiceRecord.total_amount)}</td>
                                </tr>
                              </tbody>
                            </table>
                          ) : null}
                        </div>
                      </>
                    ) : (
                      <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '480px', fontSize: 11 }}>
                          <tbody>
                            <tr>
                              <td style={{ padding: '6px 8px', borderBottom: `1px solid ${theme.border}`, fontSize: 11, whiteSpace: 'nowrap' }}>Category</td>
                              <td style={{ padding: '6px 8px', borderBottom: `1px solid ${theme.border}`, fontSize: 11, whiteSpace: 'nowrap' }}>{invoiceRecord.category || '-'}</td>
                            </tr>
                            <tr>
                              <td style={{ padding: '6px 8px', borderBottom: `1px solid ${theme.border}`, fontSize: 11, whiteSpace: 'nowrap' }}>Rate per Unit</td>
                              <td style={{ padding: '6px 8px', borderBottom: `1px solid ${theme.border}`, fontSize: 11, whiteSpace: 'nowrap' }}>Rs. {fmt(invoiceRecord.fee_rate_per_unit)}</td>
                            </tr>
                            <tr>
                              <td style={{ padding: '6px 8px', borderBottom: `1px solid ${theme.border}`, fontSize: 11, whiteSpace: 'nowrap' }}>Number of Parcels (Units)</td>
                              <td style={{ padding: '6px 8px', borderBottom: `1px solid ${theme.border}`, fontSize: 11, whiteSpace: 'nowrap' }}>{invoiceRecord.units ?? invoiceRecord.residential ?? invoiceRecord.residential_units ?? '-'}</td>
                            </tr>
                            <tr>
                              <td style={{ padding: '6px 8px', borderBottom: `1px solid ${theme.border}`, fontSize: 11, whiteSpace: 'nowrap' }}>Fee</td>
                              <td style={{ padding: '6px 8px', borderBottom: `1px solid ${theme.border}`, fontSize: 11, whiteSpace: 'nowrap' }}>Rs. {fmt(invoiceRecord.fee_amount)}</td>
                            </tr>
                            <tr>
                              <td style={{ padding: '6px 8px', borderBottom: `1px solid ${theme.border}`, fontSize: 11, whiteSpace: 'nowrap' }}>SSCL ({SSCL_RATE * 100}%)</td>
                              <td style={{ padding: '6px 8px', borderBottom: `1px solid ${theme.border}`, fontSize: 11, whiteSpace: 'nowrap' }}>Rs. {fmt(invoiceRecord.sscl_amount)}</td>
                            </tr>
                            <tr>
                              <td style={{ padding: '6px 8px', borderBottom: `1px solid ${theme.border}`, fontSize: 11, whiteSpace: 'nowrap' }}>VAT ({VAT_RATE * 100}%)</td>
                              <td style={{ padding: '6px 8px', borderBottom: `1px solid ${theme.border}`, fontSize: 11, whiteSpace: 'nowrap' }}>Rs. {fmt(invoiceRecord.vat_amount)}</td>
                            </tr>
                            <tr>
                              <td style={{ padding: '8px', borderBottom: `1px solid ${theme.border}`, fontWeight: 700, color: theme.navy, fontSize: 11.5, whiteSpace: 'nowrap' }}>Total Amount Payable</td>
                              <td style={{ padding: '8px', borderBottom: `1px solid ${theme.border}`, fontWeight: 700, color: theme.navy, fontSize: 11.5, whiteSpace: 'nowrap' }}>Rs. {fmt(invoiceRecord.total_amount)}</td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </>
              );
            })()}
          </div>

          {/* Renewal payment status + Acknowledgement (renewals only) */}
          {invoiceRecord._isRenewal && (
            <>
              {/* Workflow Status Table */}
              <div style={{ border: `1px solid ${theme.border}`, borderRadius: 10, background: '#f8fafc', padding: 14, marginBottom: 14 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: theme.navy, marginBottom: 10 }}>Renewal Approval Workflow</div>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11, minWidth: '480px' }}>
                    <thead>
                      <tr style={{ background: '#f1f5f9' }}>
                        <th style={{ padding: '6px 8px', textAlign: 'left', fontWeight: 600, color: theme.text2, borderBottom: `1px solid ${theme.border}`, fontSize: 11, whiteSpace: 'nowrap', wordBreak: 'normal', minWidth: 45, width: 45 }}>Step</th>
                        <th style={{ padding: '6px 8px', textAlign: 'left', fontWeight: 600, color: theme.text2, borderBottom: `1px solid ${theme.border}`, fontSize: 11, whiteSpace: 'nowrap', wordBreak: 'normal', minWidth: 140 }}>Action</th>
                        <th style={{ padding: '6px 8px', textAlign: 'left', fontWeight: 600, color: theme.text2, borderBottom: `1px solid ${theme.border}`, fontSize: 11, whiteSpace: 'nowrap', wordBreak: 'normal', minWidth: 90 }}>Status</th>
                        <th style={{ padding: '6px 8px', textAlign: 'left', fontWeight: 600, color: theme.text2, borderBottom: `1px solid ${theme.border}`, fontSize: 11, whiteSpace: 'nowrap', wordBreak: 'normal', minWidth: 160 }}>Details</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr style={{ borderBottom: `1px solid ${theme.border}` }}>
                        <td style={{ padding: '6px 8px', fontWeight: 600, color: theme.navy, fontSize: 11, whiteSpace: 'nowrap', wordBreak: 'normal' }}>1</td>
                        <td style={{ padding: '6px 8px', fontSize: 11, whiteSpace: 'nowrap', wordBreak: 'normal' }}>Officer marks payment</td>
                        <td style={{ padding: '6px 8px', whiteSpace: 'nowrap', wordBreak: 'normal' }}>
                          {invoiceRecord.renewal_payment_status ? (
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 6, padding: '2px 8px', fontSize: 10.5, fontWeight: 700, color: '#15803d' }}>
                              <i className="fas fa-check" /> Done
                            </span>
                          ) : (
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: '#f1f5f9', border: '1px solid #e2e8f0', borderRadius: 6, padding: '2px 8px', fontSize: 10.5, fontWeight: 600, color: '#64748b' }}>
                              <i className="fas fa-minus" /> Pending
                            </span>
                          )}
                        </td>
                        <td style={{ padding: '6px 8px', color: theme.text2, fontSize: 11, whiteSpace: 'nowrap', wordBreak: 'normal' }}>
                          {invoiceRecord.renewal_paid_date ? `Recorded on ${formatDisplayDate(invoiceRecord.renewal_paid_date)}` : 'Not yet recorded'}
                        </td>
                      </tr>
                      <tr style={{ borderBottom: `1px solid ${theme.border}` }}>
                        <td style={{ padding: '6px 8px', fontWeight: 600, color: theme.navy, fontSize: 11, whiteSpace: 'nowrap', wordBreak: 'normal' }}>2</td>
                        <td style={{ padding: '6px 8px', fontSize: 11, whiteSpace: 'nowrap', wordBreak: 'normal' }}>AGM approves payment</td>
                        <td style={{ padding: '6px 8px', whiteSpace: 'nowrap', wordBreak: 'normal' }}>
                          {invoiceRecord.renewal_payment_status === 'Approved' ? (
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 6, padding: '2px 8px', fontSize: 10.5, fontWeight: 700, color: '#15803d' }}>
                              <i className="fas fa-check" /> Approved
                            </span>
                          ) : invoiceRecord.renewal_payment_status === 'Rejected' ? (
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 6, padding: '2px 8px', fontSize: 10.5, fontWeight: 700, color: '#dc2626' }}>
                              <i className="fas fa-times" /> Rejected
                            </span>
                          ) : invoiceRecord.renewal_payment_status === 'Pending Approval' ? (
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: '#fff7ed', border: '1px solid #fed7aa', borderRadius: 6, padding: '2px 8px', fontSize: 10.5, fontWeight: 700, color: '#c2410c' }}>
                              <i className="fas fa-hourglass-half" /> Awaiting
                            </span>
                          ) : (
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: '#f1f5f9', border: '1px solid #e2e8f0', borderRadius: 6, padding: '2px 8px', fontSize: 10.5, fontWeight: 600, color: '#64748b' }}>
                              <i className="fas fa-minus" /> Pending
                            </span>
                          )}
                        </td>
                        <td style={{ padding: '6px 8px', color: theme.text2, fontSize: 11, whiteSpace: 'nowrap', wordBreak: 'normal' }}>
                          {invoiceRecord.renewal_payment_status === 'Approved' ? `Approved on ${formatDisplayDate(invoiceRecord.acknowledgement_date)}` : invoiceRecord.renewal_payment_status === 'Rejected' ? `Rejected: ${invoiceRecord.renewal_rejection_reason || '-'}` : invoiceRecord.renewal_payment_status === 'Pending Approval' ? 'AGM will be notified to review' : '-'}
                        </td>
                      </tr>
                      <tr>
                        <td style={{ padding: '6px 8px', fontWeight: 600, color: theme.navy, fontSize: 11, whiteSpace: 'nowrap', wordBreak: 'normal' }}>3</td>
                        <td style={{ padding: '6px 8px', fontSize: 11, whiteSpace: 'nowrap', wordBreak: 'normal' }}>Acknowledgement generated</td>
                        <td style={{ padding: '6px 8px', whiteSpace: 'nowrap', wordBreak: 'normal' }}>
                          {invoiceRecord.acknowledgement_no ? (
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 6, padding: '2px 8px', fontSize: 10.5, fontWeight: 700, color: '#15803d' }}>
                              <i className="fas fa-check" /> Generated
                            </span>
                          ) : (
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: '#f1f5f9', border: '1px solid #e2e8f0', borderRadius: 6, padding: '2px 8px', fontSize: 10.5, fontWeight: 600, color: '#64748b' }}>
                              <i className="fas fa-minus" /> Not yet
                            </span>
                          )}
                        </td>
                        <td style={{ padding: '6px 8px', color: theme.text2, fontSize: 11, whiteSpace: 'nowrap', wordBreak: 'normal' }}>
                          {invoiceRecord.acknowledgement_no ? `Ack No: ${invoiceRecord.acknowledgement_no}` : 'Will be generated after AGM approval'}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Bottom status bar — shows correct state: not paid / pending / partially paid / fully paid */}
              {(() => {
                const hasRemainingYears = invoiceRecord._multiYearRows && invoiceRecord._multiYearRows.length > 0;
                const isApproved = invoiceRecord.renewal_payment_status === 'Approved';
                const isPendingApproval = invoiceRecord.renewal_payment_status === 'Pending Approval';
                const isActiveStatus = String(invoiceRecord.status || '').toLowerCase() === 'active' || String(invoiceRecord.renewal_date_vise || '').toLowerCase() === 'active';

                // If they have no remaining years, they are effectively fully paid (or no renewal due yet).
                // We consider them 'Fully Paid' if they don't have remaining years and are not pending approval.
                const isFullyPaid = (isApproved && !hasRemainingYears) || (isActiveStatus && !hasRemainingYears) || (!hasRemainingYears && !isPendingApproval);
                const isPartiallyPaid = (isApproved && hasRemainingYears) || (isActiveStatus && hasRemainingYears);

                // Determine background color of status bar
                const barBg = isFullyPaid ? '#f0fdf4'
                  : isPartiallyPaid ? '#eff6ff'
                    : isPendingApproval ? '#fffbeb'
                      : '#fff7ed';
                const barBorder = isFullyPaid ? theme.green
                  : isPartiallyPaid ? theme.navy
                    : isPendingApproval ? theme.orange
                      : theme.orange;

                return (
                  <div style={{ border: `1px solid ${barBorder}`, borderRadius: 10, background: barBg, padding: 14, marginBottom: 4 }}>
                    {/* Top row: status text + primary action button */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
                      <div>
                        <div style={{ fontSize: 12, fontWeight: 700, color: isFullyPaid ? theme.green : isPartiallyPaid ? theme.navy : isPendingApproval ? theme.orange : theme.orange }}>
                          <i className={`fas ${isFullyPaid ? 'fa-check-circle' : isPartiallyPaid ? 'fa-check-circle' : isPendingApproval ? 'fa-hourglass-half' : 'fa-clock'}`} style={{ marginRight: 6 }} />
                          {isFullyPaid ? 'Renewal Fee Paid & Approved'
                            : isPartiallyPaid ? 'Partially Paid & Approved — Remaining years pending'
                              : isPendingApproval ? 'Payment Pending AGM Approval'
                                : 'Renewal Fee Not Yet Paid'}
                        </div>
                        {(isApproved || isActiveStatus) && (
                          <div style={{ fontSize: 11.5, color: theme.text2, marginTop: 4 }}>
                            Paid on {formatDisplayDate(invoiceRecord.renewal_paid_date) || '-'} - Acknowledgement No: {invoiceRecord.acknowledgement_no || '-'}
                            {isPartiallyPaid && (
                              <span style={{ marginLeft: 8, color: theme.navy, fontWeight: 600 }}>
                                (Covers: {invoiceRecord.renewal_last_paid_years || invoiceRecord.renewal_paid_years || invoiceRecord.renewal_paid_year || '-'})
                              </span>
                            )}
                          </div>
                        )}
                        {isPendingApproval && (
                          <div style={{ fontSize: 11.5, color: theme.text2, marginTop: 4 }}>
                            Payment recorded on {formatDisplayDate(invoiceRecord.renewal_paid_date)}
                          </div>
                        )}
                      </div>
                      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                        {/* View Ack button — always show when approved, fully paid, or has past paid years */}
                        {(isApproved || isFullyPaid || isActiveStatus || invoiceRecord.renewal_period || invoiceRecord.renewal_paid_year || invoiceRecord.renewal_paid_years) && (
                          <button onClick={() => openAcknowledgement(mcs.find((m) => m.id === invoiceRecord.mc_id) || { id: invoiceRecord.mc_id, ...invoiceRecord })} className="mc-btn-primary" style={{ background: '#1a3a6b', color: '#fff', border: 'none', padding: '7px 12px', borderRadius: 8, fontSize: 12, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}>
                            <i className="fas fa-file-signature" /> View Acknowledgement
                          </button>
                        )}
                        {/* AGM Approve button */}
                        {isPendingApproval && isAGM && (
                          <button onClick={() => approveRenewalPayment(invoiceRecord)} disabled={markingRenewalPaid} className="mc-btn-primary" style={{ background: '#16a34a', color: '#fff', border: 'none', padding: '8px 14px', borderRadius: 8, fontSize: 13, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}>
                            {markingRenewalPaid ? <><i className="fas fa-spinner fa-spin" /> Saving...</> : <><i className="fas fa-check-double" /> Approve Payment</>}
                          </button>
                        )}
                        {/* Awaiting approval indicator for non-AGM */}
                        {isPendingApproval && !isAGM && (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, alignItems: 'flex-end' }}>
                            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: '#fff7ed', border: '1px solid #fed7aa', borderRadius: 8, padding: '8px 14px', fontSize: 12.5, fontWeight: 700, color: '#c2410c' }}>
                              <i className="fas fa-hourglass-half" /> Awaiting AGM Approval
                            </div>
                            <div style={{ fontSize: 11, color: theme.text3 }}>The AGM has been notified. You will receive a notification once approved.</div>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Mark remaining years as paid / Show paid years */}
                    <div style={{ marginTop: 14, paddingTop: 14, borderTop: `1px solid ${isPartiallyPaid || isFullyPaid ? '#bfdbfe' : theme.border}` }}>
                      <div style={{ fontSize: 12, fontWeight: 700, color: theme.navy, marginBottom: 8 }}>
                        <i className="fas fa-calendar-plus" style={{ marginRight: 6 }} />
                        {!hasRemainingYears ? 'Paid Years:' : isPartiallyPaid ? 'Mark Remaining Years as Paid:' : 'Select Years to Mark as Paid:'}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', flexWrap: 'wrap' }}>
                        {(() => {
                          const unpaidYears = invoiceRecord._multiYearRows ? invoiceRecord._multiYearRows.map(r => r.year) : [];

                          let lastPaidYear = null;
                          if (invoiceRecord.renewal_period) {
                            const match = String(invoiceRecord.renewal_period).match(/\b(19|20)\d{2}\b/g);
                            if (match) lastPaidYear = parseInt(match[match.length - 1], 10);
                            else lastPaidYear = parseInt(invoiceRecord.renewal_period, 10);
                          }
                          if (!lastPaidYear && invoiceRecord.renewal_paid_year) {
                            lastPaidYear = parseInt(invoiceRecord.renewal_paid_year, 10);
                          }

                          // If still no explicitly recorded paid year, but the invoice is considered fully paid (or Active), 
                          // assume the last paid year is the current year.
                          if (!lastPaidYear && (isFullyPaid || String(invoiceRecord.status || '').toLowerCase() === 'active')) {
                            lastPaidYear = new Date().getFullYear();
                          }

                          const allYears = new Set([...unpaidYears]);
                          if (lastPaidYear && !unpaidYears.includes(lastPaidYear)) {
                            allYears.add(lastPaidYear);
                          }

                          // Add the next 2 years for advance payment selection
                          const maxCurrentYear = Math.max(lastPaidYear || new Date().getFullYear(), ...unpaidYears, new Date().getFullYear());
                          allYears.add(maxCurrentYear + 1);
                          allYears.add(maxCurrentYear + 2);

                          const paidYearsStr = invoiceRecord.renewal_paid_years || String(invoiceRecord.renewal_paid_year || '');
                          const paidYearsList = paidYearsStr.split(',').map(y => parseInt(y.trim(), 10)).filter(y => !isNaN(y));
                          paidYearsList.forEach(y => allYears.add(y));

                          const sortedYears = Array.from(allYears).sort((a, b) => a - b);

                          if (sortedYears.length === 0) return <span style={{ fontSize: 11, color: theme.text3, fontWeight: 600 }}>No years to display</span>;

                          return (
                            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                              {sortedYears.map(y => {
                                const isAlreadyPaid = paidYearsList.includes(y) || (lastPaidYear && y <= lastPaidYear && !unpaidYears.includes(y));
                                const isSel = selectedRenewalYears.includes(y);

                                if (isAlreadyPaid) {
                                  return (
                                    <button
                                      key={y}
                                      disabled
                                      style={{
                                        padding: '4px 10px',
                                        borderRadius: 6,
                                        border: `1px solid ${theme.green}`,
                                        background: '#f0fdf4',
                                        color: theme.green,
                                        fontSize: 11,
                                        fontWeight: 700,
                                        cursor: 'not-allowed',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: 4
                                      }}
                                    >
                                      <i className="fas fa-check" /> {y}
                                    </button>
                                  );
                                }

                                return (
                                  <button
                                    key={y}
                                    onClick={() => setSelectedRenewalYears(prev => isSel ? prev.filter(x => x !== y) : [...prev, y])}
                                    style={{
                                      padding: '4px 10px',
                                      borderRadius: 6,
                                      border: `1px solid ${isSel ? theme.navy : theme.border}`,
                                      background: isSel ? theme.navy : '#fff',
                                      color: isSel ? '#fff' : theme.text,
                                      fontSize: 11,
                                      fontWeight: 600,
                                      cursor: 'pointer',
                                      transition: 'all 0.15s'
                                    }}
                                  >
                                    {y}
                                  </button>
                                );
                              })}
                            </div>
                          );
                        })()}
                      </div>
                      {hasRemainingYears && (
                        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 10 }}>
                          <button onClick={() => markRenewalPaid(invoiceRecord)} disabled={markingRenewalPaid || selectedRenewalYears.length === 0} className="mc-btn-primary" style={{ background: '#f59e0b', color: '#fff', border: 'none', padding: '8px 14px', borderRadius: 8, fontSize: 13, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6, opacity: (markingRenewalPaid || selectedRenewalYears.length === 0) ? 0.6 : 1, cursor: (markingRenewalPaid || selectedRenewalYears.length === 0) ? 'not-allowed' : 'pointer' }}>
                            {markingRenewalPaid ? <><i className="fas fa-spinner fa-spin" /> Saving...</> : <><i className="fas fa-hand-holding-usd" /> Mark as Paid</>}
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })()}
            </>
          )}

        </div>
      </div>
    </div>
  );
}
