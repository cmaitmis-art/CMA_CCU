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

export default function AgmManagementView({ onBack, onViewMc }) {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);

  // Filters
  const [q, setQ] = useState(() => sessionStorage.getItem('cma_agm_q') || '');
  const [status, setStatus] = useState(() => sessionStorage.getItem('cma_agm_status') || ''); // 'Active' | 'Non Active' | ''
  const [year, setYear] = useState(() => sessionStorage.getItem('cma_agm_year') || '');
  const [month, setMonth] = useState(() => sessionStorage.getItem('cma_agm_month') || '');
  const [page, setPage] = useState(1);

  useEffect(() => {
    try {
      sessionStorage.setItem('cma_agm_q', q);
      sessionStorage.setItem('cma_agm_status', status);
      sessionStorage.setItem('cma_agm_year', year);
      sessionStorage.setItem('cma_agm_month', month);
    } catch (e) {}
  }, [q, status, year, month]);

  // Stats
  const [activeCount, setActiveCount] = useState(0);
  const [nonActiveCount, setNonActiveCount] = useState(0);

  // Upload modal state
  const [uploadMc, setUploadMc] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const fileInputRef = useRef(null);

  const loadRecords = async (pageToLoad = 1) => {
    setLoading(true);
    try {
      const res = await fetchAgmRecords({ q, status, year, month, page: pageToLoad, limit: 50 });
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
      loadRecords(1);
    }, 400);
    return () => clearTimeout(timer);
  }, [q, status, year, month]);

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

  return (
    <div style={{ background: theme.card, borderRadius: 12, padding: 20, border: `1px solid ${theme.border}`, display: 'flex', flexDirection: 'column', gap: 20, minHeight: 600 }}>
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

      {/* Filters & Stats */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 15 }}>
        <div style={{ display: 'flex', gap: 10 }}>
          <input
            type="text"
            placeholder="Search MCs by name or file no..."
            value={q}
            onChange={e => setQ(e.target.value)}
            style={{ width: 260, padding: '8px 14px', borderRadius: 8, border: `1px solid ${theme.border}`, fontSize: 13, outline: 'none' }}
          />
          <select
            value={status}
            onChange={e => setStatus(e.target.value)}
            style={{ padding: '8px 14px', borderRadius: 8, border: `1px solid ${theme.border}`, fontSize: 13, outline: 'none', background: '#fff' }}
          >
            <option value="">All Statuses</option>
            <option value="Active">Active AGM</option>
            <option value="Non Active">Non Active AGM</option>
          </select>
          <select
            value={year}
            onChange={e => setYear(e.target.value)}
            style={{ padding: '8px 14px', borderRadius: 8, border: `1px solid ${theme.border}`, fontSize: 13, outline: 'none', background: '#fff' }}
          >
            <option value="">All Years</option>
            {getYearFilterOptions().map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
          <select
            value={month}
            onChange={e => setMonth(e.target.value)}
            style={{ padding: '8px 14px', borderRadius: 8, border: `1px solid ${theme.border}`, fontSize: 13, outline: 'none', background: '#fff' }}
          >
            <option value="">All Months</option>
            {MONTH_OPTIONS.map((m) => (
              <option key={m.value} value={m.value}>{m.label}</option>
            ))}
          </select>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <div style={{ padding: '6px 12px', background: theme.bg, borderRadius: 8, fontSize: 13, fontWeight: 500 }}>
            Total: {total}
          </div>
          {status === '' && (
            <>
              <div style={{ padding: '6px 12px', background: '#ecfdf5', color: theme.green, borderRadius: 8, fontSize: 13, fontWeight: 600 }}>
                Active (Page): {activeCount}
              </div>
              <div style={{ padding: '6px 12px', background: '#fef2f2', color: theme.red, borderRadius: 8, fontSize: 13, fontWeight: 600 }}>
                Non Active (Page): {nonActiveCount}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Table */}
      <div style={{ overflowX: 'auto', border: `1px solid ${theme.border}`, borderRadius: 8 }}>
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
                      <button onClick={() => handleUploadClick(mc)} style={{ ...btnOutline, padding: '4px 6px', fontSize: 13 }} title={hasDoc ? 'Update AGM Document' : 'Upload AGM Document'}>
                        <i className="fas fa-upload" />
                      </button>
                      {hasDoc && (
                        <>
                          <button onClick={() => handleView(mc)} style={{ ...btnOutline, padding: '4px 6px', fontSize: 13, background: theme.bg }} title="View Document (Original)">
                            <i className="fas fa-file-pdf" style={{ color: theme.red }} />
                          </button>
                          <button onClick={() => handleDelete(mc)} style={{ ...btnDanger, padding: '4px 6px', fontSize: 13 }} title="Delete Document">
                            <i className="fas fa-trash" />
                          </button>
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
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 15, padding: '0 5px' }}>
        <div style={{ fontSize: 13, color: theme.text2 }}>
          Showing {(page - 1) * 50 + (records.length > 0 ? 1 : 0)} to {(page - 1) * 50 + records.length} of {total} records
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <button
            disabled={page === 1 || loading}
            onClick={() => loadRecords(page - 1)}
            style={{ ...btnOutline, padding: '6px 12px', opacity: page === 1 ? 0.5 : 1, cursor: page === 1 ? 'not-allowed' : 'pointer' }}
          >
            <i className="fas fa-chevron-left" /> Prev
          </button>
          <span style={{ fontSize: 13, fontWeight: 500 }}>Page {page}</span>
          <button
            disabled={page * 50 >= total || loading}
            onClick={() => loadRecords(page + 1)}
            style={{ ...btnOutline, padding: '6px 12px', opacity: page * 50 >= total ? 0.5 : 1, cursor: page * 50 >= total ? 'not-allowed' : 'pointer' }}
          >
            Next <i className="fas fa-chevron-right" />
          </button>
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
    </div>
  );
}
