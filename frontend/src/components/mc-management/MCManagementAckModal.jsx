import React from 'react';
import { buildMultiYearRenewalRows } from './MCManagementShared.jsx';

export default function MCManagementAckModal({
  ackModalOpen,
  setAckModalOpen,
  viewRecord,
  emailAcknowledgement,
  printAcknowledgement,
  ackOverrides,
  setAckOverrides,
  settings,
  theme,
  renderAcknowledgementLetter
}) {
  if (!ackModalOpen || !viewRecord) return null;

  return (

    <div className="mc-overlay" onClick={(e) => e.target === e.currentTarget && setAckModalOpen(false)}>
      <div className="mc-modal" style={{ maxWidth: 720, display: 'flex', flexDirection: 'column', maxHeight: '90vh' }}>
        <div className="mc-modal-header">
          <span style={{ fontSize: 16, fontWeight: 700 }}>Acknowledgement Letter</span>
          <button onClick={() => setAckModalOpen(false)} className="mc-close-btn"><i className="fas fa-times" /></button>
        </div>
        <div style={{ padding: 22, overflowY: 'auto', flex: 1 }}>
          {!viewRecord.renewal_paid ? (
            <div style={{ padding: 14, borderRadius: 10, background: '#fff7ed', border: '1px solid #fed7aa', color: '#92400e', fontWeight: 600, fontSize: 13 }}>
              <i className="fas fa-exclamation-triangle" style={{ marginRight: 8 }} />
              No renewal payment has been recorded for this MC yet - the acknowledgement will populate automatically once it is marked as paid.
            </div>
          ) : (
            <>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginBottom: 14 }}>
                <button onClick={emailAcknowledgement} className="mc-btn-primary" style={{ padding: '9px 14px', background: '#3b82f6', color: '#fff', border: 'none', borderRadius: '5px' }}><i className="fas fa-envelope" /> Email Acknowledgement</button>
                <button onClick={printAcknowledgement} className="mc-btn-primary" style={{ padding: '9px 14px' }}><i className="fas fa-print" /> Print Acknowledgement</button>
              </div>
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 15, background: '#f8fafc', padding: 15, borderRadius: 8, border: '1px solid #e2e8f0' }}>
                <div style={{ width: '100%', fontSize: 13, fontWeight: 'bold', marginBottom: 5, color: '#334155' }}>Edit Letter Variables:</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 5, flex: '1 1 200px' }}>
                  <label style={{ fontSize: 11, fontWeight: 'bold', color: '#64748b' }}>Reference No.</label>
                  <input type="text" className="mc-input" value={ackOverrides.refNo} onChange={(e) => setAckOverrides({ ...ackOverrides, refNo: e.target.value })} />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 5, flex: '1 1 120px' }}>
                  <label style={{ fontSize: 11, fontWeight: 'bold', color: '#64748b' }}>Letter Date</label>
                  <input type="date" className="mc-input" value={ackOverrides.date} onChange={(e) => setAckOverrides({ ...ackOverrides, date: e.target.value })} />
                </div>
                {/* Year From — first year in acknowledgement range */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 5, flex: '1 1 100px' }}>
                  <label style={{ fontSize: 11, fontWeight: 'bold', color: '#64748b' }}>Year (From)</label>
                  <select
                    className="mc-input"
                    value={ackOverrides.yearFrom || ackOverrides.year}
                    onChange={(e) => {
                      const newYearFrom = e.target.value;
                      const newYearTo = ackOverrides.yearTo || ackOverrides.year;
                      // Recalculate amount for the selected range
                      let newAmount = ackOverrides.amount;
                      if (viewRecord) {
                        const allRows = buildMultiYearRenewalRows({ ...viewRecord, renewal_paid_year: '', renewal_paid_years: '' }, settings);
                        const fromY = parseInt(newYearFrom, 10);
                        const toY = parseInt(newYearTo, 10);
                        const rangeRows = allRows.filter(r => r.year >= Math.min(fromY, toY) && r.year <= Math.max(fromY, toY));
                        const total = rangeRows.reduce((s, r) => s + (r.total || 0), 0);
                        if (total > 0) newAmount = Number(total).toLocaleString('en-LK', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                      }
                      setAckOverrides({ ...ackOverrides, yearFrom: newYearFrom, year: newYearTo, amount: newAmount });
                    }}
                  >
                    {Array.from({ length: new Date().getFullYear() + 3 - 2010 }, (_, i) => new Date().getFullYear() + 2 - i).map(y => (
                      <option key={y} value={y}>{y}</option>
                    ))}
                  </select>
                </div>
                {/* Year To — last year in acknowledgement range */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 5, flex: '1 1 100px' }}>
                  <label style={{ fontSize: 11, fontWeight: 'bold', color: '#64748b' }}>Year (To)</label>
                  <select
                    className="mc-input"
                    value={ackOverrides.yearTo || ackOverrides.year}
                    onChange={(e) => {
                      const newYearTo = e.target.value;
                      const newYearFrom = ackOverrides.yearFrom || ackOverrides.year;
                      // Recalculate amount for the selected range
                      let newAmount = ackOverrides.amount;
                      if (viewRecord) {
                        const allRows = buildMultiYearRenewalRows({ ...viewRecord, renewal_paid_year: '', renewal_paid_years: '' }, settings);
                        const fromY = parseInt(newYearFrom, 10);
                        const toY = parseInt(newYearTo, 10);
                        const rangeRows = allRows.filter(r => r.year >= Math.min(fromY, toY) && r.year <= Math.max(fromY, toY));
                        const total = rangeRows.reduce((s, r) => s + (r.total || 0), 0);
                        if (total > 0) newAmount = Number(total).toLocaleString('en-LK', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                      }
                      setAckOverrides({ ...ackOverrides, yearTo: newYearTo, year: newYearTo, amount: newAmount });
                    }}
                  >
                    {Array.from({ length: new Date().getFullYear() + 3 - 2010 }, (_, i) => new Date().getFullYear() + 2 - i).map(y => (
                      <option key={y} value={y}>{y}</option>
                    ))}
                  </select>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 5, flex: '1 1 120px' }}>
                  <label style={{ fontSize: 11, fontWeight: 'bold', color: '#64748b' }}>Amount (Rs.)</label>
                  <input type="text" className="mc-input" value={ackOverrides.amount} onChange={(e) => setAckOverrides({ ...ackOverrides, amount: e.target.value })} />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 5, flex: '1 1 120px' }}>
                  <label style={{ fontSize: 11, fontWeight: 'bold', color: '#64748b' }}>Paid Date</label>
                  <input type="date" className="mc-input" value={ackOverrides.paidDate} onChange={(e) => setAckOverrides({ ...ackOverrides, paidDate: e.target.value })} />
                </div>
                <div style={{ width: '100%', display: 'flex', gap: 10, marginTop: 5 }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 5, flex: 1 }}>
                    <label style={{ fontSize: 11, fontWeight: 'bold', color: '#64748b' }}>Signatory Name</label>
                    <input type="text" className="mc-input" value={ackOverrides.signName} onChange={(e) => setAckOverrides({ ...ackOverrides, signName: e.target.value })} />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 5, flex: 1 }}>
                    <label style={{ fontSize: 11, fontWeight: 'bold', color: '#64748b' }}>Signatory Title 1</label>
                    <input type="text" className="mc-input" value={ackOverrides.signTitle1} onChange={(e) => setAckOverrides({ ...ackOverrides, signTitle1: e.target.value })} />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 5, flex: 1 }}>
                    <label style={{ fontSize: 11, fontWeight: 'bold', color: '#64748b' }}>Signatory Title 2</label>
                    <input type="text" className="mc-input" value={ackOverrides.signTitle2} onChange={(e) => setAckOverrides({ ...ackOverrides, signTitle2: e.target.value })} />
                  </div>
                </div>
              </div>
              <div style={{ border: `1px solid ${theme.border}`, borderRadius: 10 }}>
                {renderAcknowledgementLetter(viewRecord)}
              </div>
              <div className="print-ack">{renderAcknowledgementLetter(viewRecord)}</div>
            </>
          )}
        </div>
        <div style={{ padding: '14px 22px', borderTop: `1px solid ${theme.border}`, display: 'flex', justifyContent: 'flex-end' }}>
          <button onClick={() => setAckModalOpen(false)} className="mc-btn-outline">Close</button>
        </div>
      </div>
    </div>
  );
}
