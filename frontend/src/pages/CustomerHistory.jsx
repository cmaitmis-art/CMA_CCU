import React, { useState } from 'react';
import { fetchCustomerHistory, fetchMCById, fetchMComById, fetchRenewals, fetchMCsAll, fetchMComsAll } from '../api';
import { buildMcChecklistPrintHtml } from './mcPrintHelpers';
import { buildApplicationFormHtml, buildRegistrationReceiptHtml, getPrintStyles, getReceiptPrintStyles } from './customerHistoryOfficialPrintHelpers';
import { buildRenewalPrintDocumentHtml, buildRenewalCoveringLetterHtml, buildStandaloneAcknowledgementPrintHtml, buildRenewalReceiptHtml } from './customerHistoryRenewalHelpers';

const theme = {
  navy: '#1a3a6b',
  bg: '#f4f6fb',
  card: '#ffffff',
  text: '#1a1a2e',
  text2: '#5a6478',
  text3: '#94a0b4',
  border: '#e2e8f0',
  blue: '#2563eb',
};

const btnPrimary = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 6,
  padding: '8px 16px',
  borderRadius: 8,
  fontSize: 13,
  fontWeight: 600,
  cursor: 'pointer',
  border: 'none',
  background: theme.navy,
  color: '#fff',
  transition: '.2s',
  fontFamily: 'inherit',
};

export default function CustomerHistory() {
  const [mcType, setMcType] = useState(() => sessionStorage.getItem('ch_mcType') || 'MC');
  const [customerNo, setCustomerNo] = useState(() => sessionStorage.getItem('ch_customerNo') || '');
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [hasSearched, setHasSearched] = useState(false);
  const [searchedCustomerNo, setSearchedCustomerNo] = useState('');
  const [searchedMcType, setSearchedMcType] = useState('');
  const [allOptions, setAllOptions] = useState([]);

  React.useEffect(() => {
    const loadOptions = async () => {
      try {
        const res = mcType === 'MC' ? await fetchMCsAll() : await fetchMComsAll();
        setAllOptions(res.rows || res.data || (Array.isArray(res) ? res : []));
      } catch (err) {
        console.error('Failed to fetch options for datalist', err);
      }
    };
    loadOptions();
  }, [mcType]);

  const fetchHistory = async (type = mcType, no = customerNo) => {
    const searchNo = no.trim();
    if (!searchNo) return;

    sessionStorage.setItem('ch_mcType', type);
    sessionStorage.setItem('ch_customerNo', searchNo);

    setLoading(true);
    setError(null);
    setHasSearched(true);
    setSearchedCustomerNo(searchNo);
    setSearchedMcType(type);
    try {
      const data = await fetchCustomerHistory(type, searchNo);
      setHistory(data);
    } catch (err) {
      console.error('Error fetching history:', err);
      setError(err.message || 'Failed to fetch history');
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    // Check if navigated from AI with ?search=...
    const urlParams = new URLSearchParams(window.location.search);
    const searchParam = urlParams.get('search');
    
    if (searchParam) {
      let type = 'MC';
      if (searchParam.includes('MCOM')) type = 'MCOM';
      setMcType(type);
      setCustomerNo(searchParam);
      fetchHistory(type, searchParam);
      
      // Clean up URL
      const newUrl = window.location.protocol + "//" + window.location.host + window.location.pathname;
      window.history.pushState({path:newUrl},'',newUrl);
    } else if (sessionStorage.getItem('ch_customerNo')) {
      fetchHistory(sessionStorage.getItem('ch_mcType') || 'MC', sessionStorage.getItem('ch_customerNo'));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleDownload = async (record, specificAction) => {
    if (!record.file_path) {
      alert("File not available for download.");
      return;
    }

    try {
      // Dynamic Generation for Registration
      if (record.file_path === 'Registration_Certificate') {
        let details = null;
        if (record.id.startsWith('mc-')) {
          const id = record.id.split('-')[1];
          details = await fetchMCById(id);
        } else if (record.id.startsWith('mcom-')) {
          const id = record.id.split('-')[1];
          details = await fetchMComById(id);
        }
        if (details) {
          let html = '';
          const isMcom = record.id.startsWith('mcom-');
          if (specificAction === 'checklist') {
            html = buildMcChecklistPrintHtml(details, details);
          } else if (specificAction === 'receipt') {
            html = buildRegistrationReceiptHtml(details, null, isMcom);
          } else {
            html = buildApplicationFormHtml(details, isMcom);
          }
          const blob = new Blob([html], { type: 'text/html' });
          const url = URL.createObjectURL(blob);
          window.open(url, '_blank', 'noopener,noreferrer');
          setTimeout(() => URL.revokeObjectURL(url), 10000);
          return;
        }
      }

      // Legacy Renewal dynamic generation
      if (record.file_path.startsWith('Legacy_Renewal_')) {
        const parts = record.id.split('-');
        // ID format: mc-legacy-rnw-12-2023 or mcom-legacy-rnw-12-2023
        const isMcom = parts[0] === 'mcom';
        const mcId = parts[parts.length - 2];
        const year = parts[parts.length - 1];
        
        let details = null;
        if (isMcom) {
          details = await fetchMComById(mcId);
        } else {
          details = await fetchMCById(mcId);
        }
        
        if (details) {
          // Dummy invoice structure to satisfy buildRenewalPrintDocumentHtml
          const dummyInvoice = {
            ...details,
            _isRenewal: true,
            invoice_number: details.renewal_receipt_no || '-',
            period_start: `${year}-01-01`,
            period_end: `${year}-12-31`,
            fee_amount: details.renewal_paid_amount,
            total_amount: details.renewal_paid_amount,
            renewal_paid_date: details.renewal_paid_date || `${year}-01-01`
          };
          
          let html = '';
          if (specificAction === 'letter') {
            html = buildRenewalPrintDocumentHtml(dummyInvoice, false);
          } else if (specificAction === 'receipt') {
            const innerReceipt = buildRenewalReceiptHtml(dummyInvoice);
            html = `<!DOCTYPE html><html><head><meta charset="utf-8" />
              <title>Renewal Receipt - ${year}</title>
              ${getReceiptPrintStyles()}
              <style>
                body { margin:0; padding:20px; font-family:'Times New Roman', serif; }
                .doc-page-receipt { max-width:700px; margin:0 auto; }
              </style></head>
              <body><div class="doc-page-receipt">${innerReceipt}</div>
              <script>window.onload = function() { setTimeout(function(){ window.focus(); window.print(); }, 400); };</script></body></html>`;
          } else {
            // default is certificate
            html = buildRenewalPrintDocumentHtml(dummyInvoice, true);
          }
          
          const blob = new Blob([html], { type: 'text/html' });
          const url = URL.createObjectURL(blob);
          window.open(url, '_blank', 'noopener,noreferrer');
          setTimeout(() => URL.revokeObjectURL(url), 10000);
          return;
        }
      }

      // Dynamic Generation for Renewal (Certificate & Letter)
      if (record.file_path.startsWith('Renewal_')) {
        const renewalsRes = await fetchRenewals();
        const parts = record.id.split('-');
        const rnwId = parts[1]; // ID format is "rnw-{id}-{year}"
        const targetRenewal = renewalsRes.find(r => String(r.id) === String(rnwId));

        if (targetRenewal) {
          let details = null;
          const mType = targetRenewal.mc_type ? targetRenewal.mc_type.toUpperCase() : 'MC';
          if (mType.includes('MCOM') || mType.includes('COMMITTEE')) {
            details = await fetchMComById(targetRenewal.mc_id);
          } else {
            details = await fetchMCById(targetRenewal.mc_id);
          }

          let yearsArr = [];
          try {
            if (Array.isArray(targetRenewal.years)) {
              yearsArr = targetRenewal.years;
            } else if (typeof targetRenewal.years === 'string') {
              yearsArr = JSON.parse(targetRenewal.years);
              if (!Array.isArray(yearsArr)) {
                yearsArr = String(targetRenewal.years).split(',').map(y => parseInt(y.trim(), 10)).filter(y => !isNaN(y));
              }
            } else if (targetRenewal.years) {
              yearsArr = [targetRenewal.years];
            }
          } catch(e) {
            yearsArr = String(targetRenewal.years).split(',').map(y => parseInt(y.trim(), 10)).filter(y => !isNaN(y));
          }
          if (yearsArr.length === 0) yearsArr = [record.year];

          const perYearAmount = (targetRenewal.amount || 0) / yearsArr.length;
          
          const dummyInvoice = {
            ...(details || {}),
            ...targetRenewal,
            _isRenewal: true,
            invoice_number: targetRenewal.ref_no,
            fee_amount: targetRenewal.amount || 0,
            total_amount: targetRenewal.amount || 0,
            sscl_amount: 0,
            vat_amount: 0,
            period_end: `${Math.max(...yearsArr)}-12-31`,
            _multiYearRows: yearsArr.map(y => ({
              year: y,
              units: details ? (details.units || details.residential || details.residential_units || 0) : 0,
              rate: details ? (details.fee_rate_per_unit || 0) : 0,
              fee: perYearAmount,
              sscl: 0,
              vat: 0,
              total: perYearAmount
            }))
          };

          let html = '';
          if (specificAction === 'letter') {
            html = buildRenewalPrintDocumentHtml(dummyInvoice, false);
          } else if (specificAction === 'receipt') {
            const innerReceipt = buildRenewalReceiptHtml(dummyInvoice);
            html = `<!DOCTYPE html><html><head><meta charset="utf-8" />
              <title>Renewal Receipt - ${targetRenewal.years || 'Year'}</title>
              ${getReceiptPrintStyles()}
              <style>
                body { margin:0; padding:20px; font-family:'Times New Roman', serif; }
                .doc-page-receipt { max-width:700px; margin:0 auto; }
              </style></head>
              <body><div class="doc-page-receipt">${innerReceipt}</div>
              <script>window.onload = function() { setTimeout(function(){ window.focus(); window.print(); }, 400); };</script></body></html>`;
          } else {
            // default is certificate
            html = buildRenewalPrintDocumentHtml(dummyInvoice, true);
          }
          const blob = new Blob([html], { type: 'text/html' });
          const url = URL.createObjectURL(blob);
          window.open(url, '_blank', 'noopener,noreferrer');
          setTimeout(() => URL.revokeObjectURL(url), 10000);
          return;
        }
        alert("Renewal record data could not be found.");
        return;
      }

      // Dynamic Generation for Acknowledgement Letter
      if (record.file_path === 'Acknowledgement_Letter') {
        const idParts = record.id.split('-'); // e.g. "mc-ack-5" or "mcom-ack-12"
        const isMcom = idParts[0] === 'mcom';
        const mcId = idParts[idParts.length - 1];
        
        let details = null;
        if (isMcom) {
          details = await fetchMComById(mcId);
        } else {
          details = await fetchMCById(mcId);
        }
        
        if (details) {
          // Check if there is an email sent log for this Acknowledgement
          const emailLog = history.find(h => h.action_type === 'Acknowledgement Email Sent');
          const emailSentDate = emailLog ? emailLog.created_at : null;
          
          const html = buildStandaloneAcknowledgementPrintHtml(details, emailSentDate);
          const blob = new Blob([html], { type: 'text/html' });
          const url = URL.createObjectURL(blob);
          window.open(url, '_blank', 'noopener,noreferrer');
          setTimeout(() => URL.revokeObjectURL(url), 10000);
          return;
        }
        alert("Acknowledgement record could not be found.");
        return;
      }

      // Default Download for real files
      const API_BASE = import.meta.env.VITE_API_URL || '';
      // Ensure we don't duplicate /api if the path already handles it or if it's a relative path
      const url = record.file_path.startsWith('http') ? record.file_path : `${API_BASE.replace('/api', '')}/uploads/${record.file_path}`;
      window.open(url, '_blank');
    } catch (err) {
      console.error("Failed to download or generate file:", err);
      alert("Failed to access the document.");
    }
  };

  return (
    <div style={{ padding: 20, background: theme.bg, minHeight: '100%', fontFamily: 'var(--font-sans)' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10, marginBottom: 16 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: theme.text }}>Customer History</h2>
          <p style={{ margin: '4px 0 0', fontSize: 13, color: theme.text2 }}>
            View full activity timeline for any MC or M.Com customer
          </p>
        </div>
      </div>

      {/* Search Card */}
      <div style={{ background: theme.card, borderRadius: 12, border: `1px solid ${theme.border}`, boxShadow: '0 2px 12px rgba(0,0,0,.07)', marginBottom: 20, padding: 20 }}>
        <div style={{ display: 'flex', gap: 16, alignItems: 'flex-end', flexWrap: 'wrap' }}>
          <div style={{ flex: '1 1 200px' }}>
            <label htmlFor="customerType" style={{ display: 'block', fontSize: 12, fontWeight: 600, color: theme.text2, marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Customer Type
            </label>
            <select
              id="customerType"
              name="customerType"
              value={mcType}
              onChange={(e) => setMcType(e.target.value)}
              style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: `1px solid ${theme.border}`, background: '#f9fafb', fontSize: 13, color: theme.text }}
            >
              <option value="MC">Management Corporation (MC)</option>
              <option value="MCOM">Management Committee (M.Com)</option>
            </select>
          </div>
          <div style={{ flex: '2 1 300px' }}>
            <label htmlFor="customerNo" style={{ display: 'block', fontSize: 12, fontWeight: 600, color: theme.text2, marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              File No / Customer No
            </label>
            <input
              id="customerNo"
              name="customerNo"
              type="text"
              list="customer-no-list"
              value={customerNo}
              onChange={(e) => setCustomerNo(e.target.value)}
              placeholder="e.g., CMA/MC/1234"
              style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: `1px solid ${theme.border}`, fontSize: 13, color: theme.text }}
              onKeyDown={(e) => e.key === 'Enter' && fetchHistory(mcType, customerNo)}
            />
            <datalist id="customer-no-list">
              {allOptions.map((opt, i) => {
                const fileNo = opt.file_no || opt.new_file_no || opt.old_file_no;
                if (!fileNo) return null;
                const name = opt.management_corporation_name || opt.management_committee_name || opt.name || '';
                return <option key={i} value={fileNo}>{name}</option>;
              })}
            </datalist>
          </div>
          <button
            onClick={() => fetchHistory(mcType, customerNo)}
            disabled={loading || !customerNo.trim()}
            style={{
              ...btnPrimary,
              opacity: loading || !customerNo.trim() ? 0.7 : 1,
              cursor: loading || !customerNo.trim() ? 'not-allowed' : 'pointer',
              height: 36
            }}
          >
            <i className={loading ? 'fas fa-spinner fa-spin' : 'fas fa-search'} />
            {loading ? 'Searching...' : 'Search History'}
          </button>
        </div>
      </div>

      {error && (
        <div style={{ background: '#fee2e2', color: theme.red, padding: '12px 16px', borderRadius: 8, marginBottom: 20, fontSize: 13, border: '1px solid #fecaca' }}>
          <i className="fas fa-exclamation-circle" style={{ marginRight: 6 }} /> {error}
        </div>
      )}

      {hasSearched && !loading && !error && (
        <div style={{ background: theme.card, borderRadius: 12, border: `1px solid ${theme.border}`, boxShadow: '0 2px 12px rgba(0,0,0,.07)', padding: 24 }}>
          <h3 style={{ margin: '0 0 20px', fontSize: 16, fontWeight: 700, color: theme.text, borderBottom: `1px solid ${theme.border}`, paddingBottom: 12 }}>
            Timeline for <span style={{ color: theme.navy }}>{searchedCustomerNo}</span> ({searchedMcType})
          </h3>

          {history.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 0', color: theme.text3 }}>
              <i className="fas fa-history" style={{ fontSize: 28, marginBottom: 12, display: 'block', opacity: 0.4 }} />
              No history records found for this customer.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {history.map((record) => (
                <div key={record.id} style={{ display: 'flex', border: `1px solid ${theme.border}`, borderRadius: 10, padding: 16, background: '#f8fafc', alignItems: 'center' }}>
                  <div style={{ width: 100, borderRight: `1px solid ${theme.border}`, paddingRight: 16, marginRight: 16, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', flexShrink: 0 }}>
                    <span style={{ fontSize: 24, fontWeight: 700, color: theme.blue }}>{record.year}</span>
                    <span style={{ fontSize: 11, color: theme.text3, fontWeight: 500, marginTop: 4 }}>
                      {new Date(record.created_at).toLocaleDateString()}
                    </span>
                  </div>

                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
                      <h4 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: theme.text }}>{record.action_type}</h4>
                      <span style={{ fontSize: 11, background: '#e0e7ff', color: '#3730a3', padding: '3px 8px', borderRadius: 999, fontWeight: 600 }}>
                        <i className="fas fa-user" style={{ marginRight: 4, fontSize: 10 }} /> {record.action_by || 'System'}
                      </span>
                    </div>
                    <p style={{ margin: 0, color: theme.text2, fontSize: 13, lineHeight: 1.5 }}>
                      {record.description}
                    </p>

                    {record.file_path && (
                      <div style={{ marginTop: 12 }}>
                        {(() => {
                          const btnStyle = {
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 6,
                            background: '#fff',
                            color: theme.blue,
                            border: `1px solid ${theme.blue}40`,
                            padding: '5px 12px',
                            borderRadius: 6,
                            fontSize: 12,
                            fontWeight: 600,
                            cursor: 'pointer',
                            transition: 'all 0.2s',
                            boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                            marginRight: 8
                          };

                          if (record.file_path === 'Registration_Certificate') {
                            return (
                              <>
                                <button onClick={() => handleDownload(record, 'form')} style={btnStyle}>
                                  <i className="fas fa-file-alt" /> View Registration Form
                                </button>
                                <button onClick={() => handleDownload(record, 'checklist')} style={btnStyle}>
                                  <i className="fas fa-list-check" /> View Document Checklist
                                </button>
                                <button onClick={() => handleDownload(record, 'receipt')} style={btnStyle}>
                                  <i className="fas fa-receipt" /> View Receipt
                                </button>
                              </>
                            );
                          } else if (record.file_path.startsWith('Renewal_Certificate') || record.file_path.startsWith('Legacy_Renewal_Certificate')) {
                            return (
                              <>
                                <button onClick={() => handleDownload(record, 'certificate')} style={btnStyle}>
                                  <i className="fas fa-certificate" /> View Certificate
                                </button>
                                <button onClick={() => handleDownload(record, 'letter')} style={btnStyle}>
                                  <i className="fas fa-envelope" /> View Letter
                                </button>
                                <button onClick={() => handleDownload(record, 'receipt')} style={btnStyle}>
                                  <i className="fas fa-receipt" /> View Receipt
                                </button>
                              </>
                            );
                          } else {
                            return (
                              <button onClick={() => handleDownload(record, 'download')} style={btnStyle}>
                                <i className="fas fa-download" /> Download {record.file_path.split('/').pop()}
                              </button>
                            );
                          }
                        })()}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
