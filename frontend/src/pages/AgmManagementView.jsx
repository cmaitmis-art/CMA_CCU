import React, { useState, useEffect, useRef } from 'react';
import { fetchAgmRecords, uploadAgmDocument, deleteAgmRecord } from '../api';
import { MONTH_OPTIONS, getYearFilterOptions } from '../utils/filterConstants';

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
const btnDanger = { ...btnBase, background: '#fee2e2', color: theme.red };

export default function AgmManagementView({ onBack, onViewMc, canEdit }) {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);

  // Filters
  const [q, setQ] = useState(() => sessionStorage.getItem('cma_agm_q') || '');
  const [status, setStatus] = useState(() => sessionStorage.getItem('cma_agm_status') || ''); // 'Active' | 'Non Active' | ''
  const [year, setYear] = useState(() => sessionStorage.getItem('cma_agm_year') || '');
  const [month, setMonth] = useState(() => sessionStorage.getItem('cma_agm_month') || '');
  const [meetingTypeFilter, setMeetingTypeFilter] = useState(() => sessionStorage.getItem('cma_agm_mt') || '');
  const [page, setPage] = useState(1);
  const [viewAll, setViewAll] = useState(false);
  const [isTransitioningView, setIsTransitioningView] = useState(false);

  useEffect(() => {
    try {
      sessionStorage.setItem('cma_agm_q', q);
      sessionStorage.setItem('cma_agm_status', status);
      sessionStorage.setItem('cma_agm_year', year);
      sessionStorage.setItem('cma_agm_month', month);
      sessionStorage.setItem('cma_agm_mt', meetingTypeFilter);
    } catch (e) { }
  }, [q, status, year, month, meetingTypeFilter]);

  // Stats
  const [activeCount, setActiveCount] = useState(0);
  const [nonActiveCount, setNonActiveCount] = useState(0);

  // Upload modal state
  const [uploadMc, setUploadMc] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const fileInputRef = useRef(null);

  // Print modal state
  const [printMc, setPrintMc] = useState(null);
  const [meetingType, setMeetingType] = useState('Annual General Meeting');
  const [agmDate, setAgmDate] = useState('');
  const [letterDate, setLetterDate] = useState('');
  const [selectedSections, setSelectedSections] = useState({
    a: true, b: true, c: true, d: true, e: true, f: true, g: true, h: true
  });
  const [signatureName, setSignatureName] = useState('Arct.M.T. Kapila Priyantha');
  const [signatureTitle, setSignatureTitle] = useState('General Manager');

  const AGM_SECTIONS = {
    a: 'Audited accounts of the Corporation which has been presented to the General Meeting',
    b: 'The resolution passed at the General Meeting',
    c: 'The Minutes of the General Meeting.',
    d: 'Copy of the attendance sheet.',
    e: 'Copies of the Deeds (All Council members including Secretary and Treasurer)',
    f: 'Address & Contact Numbers and e -mail of all the Office Bearers.',
    g: 'Condominium Property Insurance details.',
    h: 'Copy of the Approved Budget Report.'
  };

  const escapeHtml = (unsafe) => (unsafe || '').replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
  const formatDotDate = (d) => {
    if (!d) return '-';
    const parts = d.split('T')[0].split('-');
    if (parts.length !== 3) return d;
    return `${parts[2]}.${parts[1]}.${parts[0]}`;
  };

  const loadRecords = async (pageToLoad = 1, isViewAll = false) => {
    setLoading(true);
    try {
      const fetchLimit = isViewAll ? 999999 : 50;
      const res = await fetchAgmRecords({ q, status, year, month, meetingType: meetingTypeFilter, page: pageToLoad, limit: fetchLimit });
      setRecords(res.rows || []);
      setTotal(res.total || 0);

      // We could calculate counts here, but we'll do a quick client side approximation 
      // or we can fetch a total without filters to get correct counts.
      // For simplicity, we just look at loaded records if not searching.
      let actives = 0;
      let nonActives = 0;
      (res.rows || []).forEach(r => {
        if (r.agm_date_vise === 'Active') actives++;
        else if (r.agm_date_vise === 'Non Active') nonActives++;
      });
      setActiveCount(actives);
      setNonActiveCount(nonActives);
      setPage(pageToLoad);
    } catch (err) {
      console.error(err);
      alert('Failed to load AGM records');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      loadRecords(1, viewAll);
    }, 400);
    return () => clearTimeout(timer);
  }, [q, status, year, month, meetingTypeFilter, viewAll]);

  const handleUploadClick = (mc) => {
    setUploadMc(mc);
    setSelectedFile(null);
  };

  const executeUpload = async (e) => {
    e.preventDefault();
    if (!uploadMc || !fileInputRef.current?.files[0]) return;

    setUploading(true);
    try {
      await uploadAgmDocument(uploadMc.id, fileInputRef.current.files[0], '', 'System');
      setUploadMc(null);
      loadRecords(page); // reload current page
    } catch (err) {
      alert(err.message || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (mc) => {
    if (!window.confirm(`Delete AGM document for ${mc.new_file_no || mc.file_no}?`)) return;
    try {
      await deleteAgmRecord(mc.id);
      loadRecords(page);
    } catch (err) {
      alert('Failed to delete document');
    }
  };

  const handleView = (mc) => {
    if (mc.AgmRecord && mc.AgmRecord.document_path) {
      const baseUrl = (import.meta.env.VITE_API_URL || '/api').trim().replace(/\/api\/?$/, '');
      window.open(`${baseUrl}/${mc.AgmRecord.document_path}`, '_blank');
    }
  };

  const handlePrintClick = (mc) => {
    setPrintMc(mc);
    setAgmDate(mc.agm_date || '');
    setLetterDate(new Date().toISOString().slice(0, 10));
  };

  const executePrint = async () => {
    try {
      if (printMc && meetingType) {
        const API_BASE = (import.meta.env.VITE_API_URL || '/api').trim().replace(/\/api\/?$/, '') + '/api';
        await fetch(`${API_BASE}/mc/${printMc.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ agm_meeting_type: meetingType })
        });
        // We do not await loadRecords here to prevent delaying the print dialog, 
        // but it will refresh the background table
        loadRecords(page);
      }
    } catch (e) {
      console.error('Failed to update meeting type', e);
    }
    window.print();
    // After printing, you might want to close the modal, or keep it open.
    // setPrintMc(null); 
  };

  return (
    <>
      <div className="no-print" style={{ background: theme.card, borderRadius: 12, padding: 20, border: `1px solid ${theme.border}`, display: 'flex', flexDirection: 'column', gap: 20, minHeight: 600 }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 15, borderBottom: `1px solid ${theme.border}`, paddingBottom: 15 }}>
          <button onClick={onBack} style={{ ...btnOutline, padding: '6px 12px' }} title="Back to MCs">
            <i className="fas fa-arrow-left" /> Back
          </button>
          <div>
            <h2 style={{ fontSize: 19, fontWeight: 600, margin: 0, color: theme.text }}>AGM Document Management</h2>
            <p style={{ color: '#999', fontSize: 13, margin: '4px 0 0 0' }}>Manage AGM records and upload documents</p>
          </div>
        </div>

        {/* Table Card */}
        <div className="cma-table-card-container" style={{ background: theme.card, borderRadius: 12, border: `1px solid ${theme.border}`, boxShadow: '0 2px 12px rgba(0,0,0,.07)', overflow: 'hidden' }}>

          {/* Filters */}
          <div style={{ padding: '10px 14px', borderBottom: `1px solid ${theme.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: theme.text, whiteSpace: 'nowrap', marginRight: 4 }}>All MC Records</div>
            <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap', flex: '1 1 auto', justifyContent: 'flex-end' }}>
              <div style={{ position: 'relative', flex: '1 1 180px', maxWidth: 260 }}>
                <i className="fas fa-search" style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#999', fontSize: 12 }}></i>
                <input
                  type="text"
                  placeholder="Search MC-"
                  value={q}
                  onChange={e => setQ(e.target.value)}
                  style={{ padding: '5px 8px 5px 28px', height: 30, borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 12, width: '100%', outline: 'none', transition: 'border-color 0.2s', boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.02)' }}
                  onFocus={(e) => e.target.style.borderColor = '#3b82f6'}
                  onBlur={(e) => e.target.style.borderColor = '#cbd5e1'}
                />
              </div>
              <select
                value={status}
                onChange={e => setStatus(e.target.value)}
                style={{ padding: '5px 8px', height: 30, borderRadius: 4, border: '1px solid #ddd', fontSize: 12, width: 105 }}
              >
                <option value="">All Statuses</option>
                <option value="Active">Active AGM</option>
                <option value="Non Active">Non Active AGM</option>
              </select>
              <select
                value={meetingTypeFilter}
                onChange={e => setMeetingTypeFilter(e.target.value)}
                style={{ padding: '5px 8px', height: 30, borderRadius: 4, border: '1px solid #ddd', fontSize: 12, width: 130 }}
              >
                <option value="">All Meeting Types</option>
                <option value="Annual General Meeting">Annual General Meeting</option>
                <option value="Extra Ordinary Meeting">Extra Ordinary Meeting</option>
                <option value="Special General Meeting">Special General Meeting</option>
              </select>
              <select
                value={year}
                onChange={e => setYear(e.target.value)}
                style={{ padding: '5px 8px', height: 30, borderRadius: 4, border: '1px solid #ddd', fontSize: 12, width: 85 }}
              >
                <option value="">All Years</option>
                {getYearFilterOptions().map((y) => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
              <select
                value={month}
                onChange={e => setMonth(e.target.value)}
                style={{ padding: '5px 8px', height: 30, borderRadius: 4, border: '1px solid #ddd', fontSize: 12, width: 95 }}
              >
                <option value="">All Months</option>
                {MONTH_OPTIONS.map((m) => (
                  <option key={m.value} value={m.value}>{m.label}</option>
                ))}
              </select>
              <button
                onClick={() => {
                  setIsTransitioningView(true);
                  setTimeout(() => {
                    setViewAll(v => !v);
                    setTimeout(() => setIsTransitioningView(false), 100);
                  }, 50);
                }}
                style={viewAll ? { background: '#10b981', color: '#ffffff', border: 'none', padding: '5px 12px', fontSize: 12, borderRadius: 4, cursor: 'pointer', fontWeight: 500, height: 30, display: 'flex', alignItems: 'center' } : { background: '#f1f5f9', color: '#334155', border: `1px solid ${theme.border}`, padding: '5px 12px', fontSize: 12, borderRadius: 4, cursor: 'pointer', fontWeight: 500, height: 30, display: 'flex', alignItems: 'center' }}
                title="Toggle between showing all records and paginated view"
              >
                <i className={(loading || isTransitioningView) && viewAll ? 'fas fa-spinner fa-spin' : viewAll ? 'fas fa-check-circle' : 'fas fa-list'} style={{ marginRight: 6 }} />
                {(loading || isTransitioningView) ? 'Loading...' : viewAll ? 'Show All' : 'Show All'}
              </button>
            </div>
          </div>

          {/* Table */}
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 13 }}>
              <thead>
                <tr style={{ background: theme.bg, color: theme.text2 }}>
                  <th style={{ padding: '12px 15px', fontWeight: 600, borderBottom: `1px solid ${theme.border}`, width: '12%' }}>File No</th>
                  <th style={{ padding: '12px 15px', fontWeight: 600, borderBottom: `1px solid ${theme.border}`, width: '24%', maxWidth: 250 }}>MC Name</th>
                  <th style={{ padding: '12px 15px', fontWeight: 600, borderBottom: `1px solid ${theme.border}`, width: '11%' }}>AGM Date</th>
                  <th style={{ padding: '12px 15px', fontWeight: 600, borderBottom: `1px solid ${theme.border}`, width: '11%' }}>Next AGM</th>
                  <th style={{ padding: '12px 15px', fontWeight: 600, borderBottom: `1px solid ${theme.border}`, width: '10%' }}>Status</th>
                  <th style={{ padding: '12px 15px', fontWeight: 600, borderBottom: `1px solid ${theme.border}`, width: '20%', maxWidth: 220 }}>Document</th>
                  <th style={{ padding: '12px 15px', fontWeight: 600, borderBottom: `1px solid ${theme.border}`, textAlign: 'right', width: '12%' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={7} style={{ padding: 20, textAlign: 'center', color: theme.text3 }}>Loading...</td></tr>
                ) : records.length === 0 ? (
                  <tr><td colSpan={7} style={{ padding: 20, textAlign: 'center', color: theme.text3 }}>No records found</td></tr>
                ) : records.map(mc => {
                  const agmRecord = mc.AgmRecord;
                  const hasDoc = !!agmRecord?.document_path;
                  const isActive = mc.agm_date_vise === 'Active';

                  return (
                    <tr key={mc.id} style={{ borderBottom: `1px solid ${theme.border}` }}>
                      <td style={{ padding: '12px 15px', fontWeight: 500 }}>{mc.new_file_no || mc.file_no || mc.old_file_no || '-'}</td>
                      <td style={{ padding: '12px 15px', maxWidth: 250 }}>
                        <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={mc.name || mc.management_corporation_name || '-'}>
                          {mc.name || mc.management_corporation_name || '-'}
                        </div>
                      </td>
                      <td style={{ padding: '12px 15px', whiteSpace: 'nowrap' }}>{mc.agm_date || '-'}</td>
                      <td style={{ padding: '12px 15px', whiteSpace: 'nowrap' }}>{mc.next_agm_date || '-'}</td>
                      <td style={{ padding: '12px 15px' }}>
                        {mc.agm_date_vise ? (
                          <span style={{
                            padding: '3px 8px', borderRadius: 999, fontSize: 11, fontWeight: 600,
                            background: isActive ? '#dcfce7' : '#fee2e2',
                            color: isActive ? theme.green : theme.red
                          }}>
                            {mc.agm_date_vise}
                          </span>
                        ) : '-'}
                      </td>
                      <td style={{ padding: '12px 15px', maxWidth: 220 }}>
                        {hasDoc ? (
                          <span
                            style={{
                              color: theme.blue,
                              cursor: 'pointer',
                              textDecoration: 'underline',
                              display: 'inline-flex',
                              alignItems: 'center',
                              maxWidth: '100%',
                              verticalAlign: 'middle'
                            }}
                            title={agmRecord.document_name}
                            onClick={() => handleView(mc)}
                          >
                            <i className="fas fa-file-pdf" style={{ marginRight: 6, flexShrink: 0 }} />
                            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {agmRecord.document_name}
                            </span>
                          </span>
                        ) : <span style={{ color: theme.text3 }}>—</span>}
                      </td>
                      <td style={{ padding: '12px 15px', textAlign: 'right' }}>
                        <div style={{ display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
                          <button onClick={() => { if (onViewMc) onViewMc(mc); }} style={{ ...btnOutline, padding: '4px 6px', fontSize: 13 }} title="View MC Details">
                            <i className="fas fa-list-alt" />
                          </button>
                          <button onClick={() => handlePrintClick(mc)} style={{ ...btnOutline, padding: '4px 6px', fontSize: 13, background: theme.bg }} title="Generate AGM Letter">
                            <i className="fas fa-print" style={{ color: theme.navy }} />
                          </button>
                          {canEdit && (
                            <button onClick={() => handleUploadClick(mc)} style={{ ...btnOutline, padding: '4px 6px', fontSize: 13 }} title={hasDoc ? 'Update AGM Document' : 'Upload AGM Document'}>
                              <i className="fas fa-upload" />
                            </button>
                          )}
                          {hasDoc && (
                            <>
                              <button onClick={() => handleView(mc)} style={{ ...btnOutline, padding: '4px 6px', fontSize: 13, background: theme.bg }} title="View Document (Original)">
                                <i className="fas fa-file-pdf" style={{ color: theme.red }} />
                              </button>
                              {canEdit && (
                                <button onClick={() => handleDelete(mc)} style={{ ...btnDanger, padding: '4px 6px', fontSize: 13 }} title="Delete Document">
                                  <i className="fas fa-trash" />
                                </button>
                              )}
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          {/* Pagination */}
          <div style={{ padding: '10px 16px', borderTop: `1px solid ${theme.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            <div style={{ fontSize: 13, color: theme.text2 }}>
              Showing <strong>{loading ? 0 : records.length}</strong> of <strong>{total}</strong> records
            </div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              {!viewAll && (
                <>
                  <button
                    disabled={page === 1 || loading}
                    onClick={() => loadRecords(page - 1, viewAll)}
                    style={{ ...btnOutline, padding: '5px 12px', fontSize: 12, opacity: page === 1 ? 0.5 : 1, cursor: page === 1 ? 'not-allowed' : 'pointer' }}
                  >
                    <i className="fas fa-chevron-left" /> Prev
                  </button>
                  <span style={{ fontSize: 12, fontWeight: 500, color: theme.text3 }}>Page <strong style={{ color: theme.text }}>{page}</strong></span>
                  <button
                    disabled={page * 50 >= total || loading}
                    onClick={() => loadRecords(page + 1, viewAll)}
                    style={{ ...btnOutline, padding: '5px 12px', fontSize: 12, opacity: page * 50 >= total ? 0.5 : 1, cursor: page * 50 >= total ? 'not-allowed' : 'pointer' }}
                  >
                    Next <i className="fas fa-chevron-right" />
                  </button>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Upload Modal Overlay */}
        {uploadMc && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ background: '#fff', borderRadius: 12, padding: 20, width: 400, boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
                <div style={{ width: 44, height: 44, borderRadius: '50%', background: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center', color: theme.blue, fontSize: 20 }}>
                  <i className="fas fa-cloud-upload-alt" />
                </div>
                <div>
                  <h3 style={{ margin: 0, color: theme.navy, fontSize: 16 }}>Upload Document</h3>
                  <div style={{ fontSize: 12, color: theme.text2, marginTop: 4 }}>
                    For MC: <strong>{uploadMc.new_file_no || uploadMc.file_no}</strong> - {uploadMc.name || uploadMc.management_corporation_name}
                  </div>
                </div>
              </div>

              <form onSubmit={executeUpload}>
                <div style={{
                  position: 'relative',
                  border: `2px dashed ${selectedFile ? theme.green : '#cbd5e1'}`,
                  borderRadius: 12,
                  padding: '30px 20px',
                  textAlign: 'center',
                  background: selectedFile ? '#f0fdf4' : '#f8fafc',
                  transition: 'all 0.2s',
                  marginBottom: 20
                }}>
                  <input
                    type="file"
                    ref={fileInputRef}
                    required
                    onChange={(e) => setSelectedFile(e.target.files[0])}
                    style={{ position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer', width: '100%' }}
                  />
                  {!selectedFile ? (
                    <div>
                      <i className="fas fa-file-upload" style={{ fontSize: 28, color: '#94a3b8', marginBottom: 10 }} />
                      <div style={{ fontSize: 14, fontWeight: 600, color: theme.navy }}>Click or drag file to upload</div>
                      <div style={{ fontSize: 12, color: theme.text3, marginTop: 4 }}>Any file format (PDF, Word, Images, etc.)</div>
                    </div>
                  ) : (
                    <div>
                      <i className="fas fa-check-circle" style={{ fontSize: 28, color: theme.green, marginBottom: 10 }} />
                      <div style={{ fontSize: 14, fontWeight: 600, color: theme.green }}>File Selected</div>
                      <div style={{ fontSize: 13, color: theme.text2, marginTop: 6, wordBreak: 'break-all' }}>{selectedFile.name}</div>
                    </div>
                  )}
                </div>
                <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                  <button type="button" onClick={() => setUploadMc(null)} style={{ ...btnOutline, padding: '8px 16px' }} disabled={uploading}>Cancel</button>
                  <button type="submit" style={{ ...btnPrimary, padding: '8px 20px', background: uploading ? '#94a3b8' : theme.blue, border: 'none' }} disabled={uploading || !selectedFile}>
                    {uploading ? <><i className="fas fa-spinner fa-spin" style={{ marginRight: 6 }} /> Uploading...</> : 'Upload'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Print Modal Overlay */}
        {printMc && (
          <div className="no-print" style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ background: '#fff', borderRadius: 12, padding: 24, width: 500, boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)', maxHeight: '90vh', overflowY: 'auto' }}>
              <h3 style={{ margin: '0 0 20px 0', color: theme.navy, fontSize: 18, borderBottom: `1px solid ${theme.border}`, paddingBottom: 10 }}>Generate AGM Letter</h3>

              <div style={{ display: 'flex', gap: 15, marginBottom: 15 }}>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', marginBottom: 6, fontSize: 13, fontWeight: 600, color: theme.text }}>Letter Date</label>
                  <input
                    type="date"
                    value={letterDate}
                    onChange={e => setLetterDate(e.target.value)}
                    style={{ width: '100%', padding: '8px 12px', borderRadius: 6, border: `1px solid ${theme.border}`, fontSize: 14, outline: 'none' }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', gap: 15, marginBottom: 15 }}>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', marginBottom: 6, fontSize: 13, fontWeight: 600, color: theme.text }}>Meeting Type</label>
                  <select
                    value={meetingType}
                    onChange={e => setMeetingType(e.target.value)}
                    style={{ width: '100%', padding: '8px 12px', borderRadius: 6, border: `1px solid ${theme.border}`, fontSize: 14, outline: 'none' }}
                  >
                    <option value="Annual General Meeting">Annual General Meeting</option>
                    <option value="Extra Ordinary Meeting">Extra Ordinary Meeting</option>
                    <option value="Special General Meeting">Special General Meeting</option>
                  </select>
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', marginBottom: 6, fontSize: 13, fontWeight: 600, color: theme.text }}>Meeting Date</label>
                  <input
                    type="date"
                    value={agmDate}
                    onChange={e => setAgmDate(e.target.value)}
                    style={{ width: '100%', padding: '8px 12px', borderRadius: 6, border: `1px solid ${theme.border}`, fontSize: 14, outline: 'none' }}
                  />
                </div>
              </div>

              <div style={{ marginBottom: 15 }}>
                <label style={{ display: 'block', marginBottom: 8, fontSize: 13, fontWeight: 600, color: theme.text }}>Select Sections to Include</label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {Object.keys(AGM_SECTIONS).map(key => (
                    <label key={key} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, fontSize: 13, cursor: 'pointer' }}>
                      <input
                        type="checkbox"
                        checked={selectedSections[key]}
                        onChange={e => setSelectedSections({ ...selectedSections, [key]: e.target.checked })}
                        style={{ marginTop: 2, cursor: 'pointer' }}
                      />
                      <span style={{ lineHeight: 1.3 }}>({key}) {AGM_SECTIONS[key]}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div style={{ display: 'flex', gap: 15, marginBottom: 25 }}>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', marginBottom: 6, fontSize: 13, fontWeight: 600, color: theme.text }}>Signature Name</label>
                  <input
                    type="text"
                    value={signatureName}
                    onChange={e => setSignatureName(e.target.value)}
                    style={{ width: '100%', padding: '8px 12px', borderRadius: 6, border: `1px solid ${theme.border}`, fontSize: 14, outline: 'none' }}
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', marginBottom: 6, fontSize: 13, fontWeight: 600, color: theme.text }}>Signature Designation</label>
                  <input
                    type="text"
                    value={signatureTitle}
                    onChange={e => setSignatureTitle(e.target.value)}
                    style={{ width: '100%', padding: '8px 12px', borderRadius: 6, border: `1px solid ${theme.border}`, fontSize: 14, outline: 'none' }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', borderTop: `1px solid ${theme.border}`, paddingTop: 15 }}>
                <button type="button" onClick={() => setPrintMc(null)} style={{ ...btnOutline, padding: '8px 16px' }}>Cancel</button>
                <button type="button" onClick={executePrint} style={{ ...btnPrimary, padding: '8px 20px', background: theme.navy, border: 'none' }}>
                  <i className="fas fa-print" style={{ marginRight: 6 }} /> Print Letter
                </button>
              </div>
            </div>
          </div>
        )}

      </div>

      {/* Hidden Printable Area */}
      {printMc && (
        <div className="print-only">
          <style dangerouslySetInnerHTML={{
            __html: `
            @media screen {
              .print-only { display: none; }
            }
            @media print {
              body { background: white; margin: 0; padding: 0; }
              body * { visibility: hidden; }
              .cma-sidebar, header, .cma-main-wrap > header { display: none !important; }
              .cma-main { padding: 0 !important; margin: 0 !important; min-height: 0 !important; }
              .no-print { display: none !important; }
              .print-only, .print-only * { visibility: visible; }
              .print-only { 
                position: absolute; 
                left: 0; 
                top: 0; 
                width: 100%; 
              }
              @page { size: 210mm 297mm; margin: 0; } /* Default is A4 Portrait */
              @page :first { size: 220mm 110mm; margin: 0; } /* First page is Envelope Landscape */
            }
            .envelope-page { 
              position: relative;
              width: 220mm;
              height: 110mm; /* DL Envelope size */
              page-break-after: always; 
              font-family: 'Times New Roman', Times, serif; 
              font-size: 12pt; 
              color: #000;
              line-height: 1.5;
            }
            .envelope-content {
              position: absolute;
              left: 120mm;
              top: 50mm;
              text-align: left;
              max-width: 90mm;
            }
            .envelope-content div { margin: 2px 0; }
            
            .official-letter { 
              box-sizing: border-box;
              width: 100%; 
              max-width: 210mm;
              padding-top: 2.5in; /* Matches exactly with the renewal certificate letterhead space */
              padding-left: 20mm; /* Perfectly balanced left margin */
              padding-right: 20mm; /* Perfectly balanced right margin */
              padding-bottom: 10mm; 
              margin: 0 auto; /* Ensures it is perfectly centered */
              font-family: Garamond, serif; 
              font-size: 12pt; 
              line-height: 1.15; 
              color: #000; 
            }
            .official-letter .ol-ref { display: flex; justify-content: space-between; margin-bottom: 40px; font-size: 12pt; }
            .official-letter .ol-addr { margin-bottom: 25px; font-size: 12pt; }
            .official-letter .ol-addr div { margin: 0; }
            .official-letter .ol-salutation { margin-bottom: 15px; font-size: 12pt; }
            .official-letter .ol-subject { font-weight: bold; text-decoration: underline; margin-bottom: 15px; font-size: 12pt; }
            .official-letter .ol-section-title { font-weight: bold; text-decoration: underline; margin-bottom: 5px; font-size: 12pt; }
            .official-letter .ol-para { margin-bottom: 12px; font-size: 12pt; text-align: justify; }
            .official-letter .ol-quote { font-weight: bold; margin-bottom: 12px; font-size: 12pt; text-align: justify; }
            .official-letter .ol-list { margin-bottom: 12px; padding-left: 35px; font-size: 12pt; }
            .official-letter .ol-list-item { margin-bottom: 4px; display: flex; gap: 8px; }
            .official-letter .ol-closing { margin-bottom: 35px; font-size: 12pt; }
            .official-letter .ol-sign { page-break-inside: avoid; font-size: 12pt; }
          `}} />

          {/* Envelope Page */}
          <div className="envelope-page">
            <div className="envelope-content">
              <div>The Secretary,</div>
              <div>{escapeHtml(printMc.management_corporation_name || printMc.name || '-')}</div>
              {(() => {
                const lines = String(printMc.address || '').split(/\r?\n|,/).map(l => l.trim()).filter(Boolean);
                return lines.map((line, i) => (
                  <div key={i}>{escapeHtml(line)}</div>
                ));
              })()}
            </div>
          </div>

          <div className="official-letter">
            <div className="ol-ref">
              <span>{printMc.new_file_no || printMc.file_no}</span>
              <span>{letterDate ? formatDotDate(letterDate) : formatDotDate(new Date().toISOString())}</span>
            </div>
            <div className="ol-addr">
              <div>The Secretary,</div>
              <div>{escapeHtml(printMc.management_corporation_name || printMc.name || '-')}</div>
              {(() => {
                const lines = String(printMc.address || '').split(/\r?\n|,/).map(l => l.trim()).filter(Boolean);
                return lines.map((line, i) => (
                  <div key={i}>{escapeHtml(line)}</div>
                ));
              })()}
            </div>

            <div className="ol-salutation">Dear Sir/Madam,</div>

            <div className="ol-subject">SUBMISSION OF VITAL DOCUMENTS</div>

            <div className="ol-para">
              I draw your kind attention to the {meetingType} held {agmDate ? new Date(agmDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }) : '_________________'}.
            </div>

            <div className="ol-para">
              Condominium Management Authority wishes to draw your kind attention to the section 8 (5) of the First Schedule of the Apartment Ownership Law No 11 of 1973 as amended by 45 of 1982, Act No 39 of 2003. The extract of said section is indicated below for your perusal.
            </div>

            <div className="ol-section-title">
              Section - 8 (5)
            </div>

            <div className="ol-quote">
              “The Council shall within 30 days after its General Meeting file with the Condominium Management Authority certified true copies of”
            </div>

            <div className="ol-list">
              {Object.keys(AGM_SECTIONS).filter(k => selectedSections[k]).map(k => (
                <div key={k} className="ol-list-item">
                  <span>({k})</span>
                  <span>{AGM_SECTIONS[k]}</span>
                </div>
              ))}
            </div>

            <div className="ol-para">
              If the Management Council fails to comply with the said Law the Management Council is liable to be guilty of an offence in terms of section 21 (1) of the said Law.
            </div>

            <div className="ol-para">
              Your co-operation in this regard is much appreciated.
            </div>

            <div className="ol-closing">
              <div>Thank you,</div>
              <div>Yours faithfully,</div>
            </div>

            <div className="ol-sign">
              <div>{signatureName}</div>
              <div><strong>{signatureTitle}</strong></div>
              <div><strong>Condominium Management Authority</strong></div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
