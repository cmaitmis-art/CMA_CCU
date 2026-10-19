import React from 'react';

export default function MCManagementExportModal({
  exportModalOpen,
  setExportModalOpen,
  exportType,
  setExportType,
  selectedFields,
  setSelectedFields,
  exportFormat,
  setExportFormat,
  exporting,
  exportSelected,
  EXPORT_FIELDS,
  theme
}) {
  if (!exportModalOpen) return null;

  return (
      <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.45)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
    onClick={(e) => e.target === e.currentTarget && setExportModalOpen(false)}>
    <div style={{ background: '#fff', borderRadius: 14, boxShadow: '0 20px 60px rgba(0,0,0,.25)', width: 440, maxWidth: '95vw', overflow: 'hidden', display: 'flex', flexDirection: 'column', maxHeight: '90vh' }}>
      {/* Header */}
      <div style={{ background: theme.navy, padding: '18px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <i className="fas fa-file-export" style={{ color: '#fff', fontSize: 18 }} />
          <span style={{ color: '#fff', fontWeight: 700, fontSize: 16 }}>Export MC Records</span>
        </div>
        <button onClick={() => setExportModalOpen(false)} style={{ background: 'rgba(255,255,255,.2)', border: 'none', borderRadius: 6, color: '#fff', width: 28, height: 28, cursor: 'pointer', fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><i className="fas fa-times" /></button>
      </div>

      <div style={{ padding: '22px 24px', overflowY: 'auto', flex: 1 }}>
        {/* Export Type */}
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: '#1a3a6b', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: 10 }}>
            <i className="fas fa-list-check" style={{ marginRight: 6 }} /> What to Export
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            {[
              { id: 'mc_list', label: 'MC List', desc: 'Main MC list (same format as original Excel)', icon: 'fa-table' },
              { id: 'registration', label: 'Registration Form', desc: 'Registration form details with services & facilities', icon: 'fa-file-alt' },
              { id: 'checklist', label: 'Document Checklist', desc: 'Document checklist with parcel details', icon: 'fa-clipboard-check' },
              { id: 'full', label: 'Full Export (All)', desc: 'All 3 sheets in one file', icon: 'fa-layer-group' },
              { id: 'template', label: 'Empty Template', desc: 'Download blank Excel template for importing', icon: 'fa-file-excel' },
            ].map(opt => (
              <label key={opt.id} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '10px 12px', border: `2px solid ${exportType === opt.id ? '#2563eb' : '#e2e8f0'}`, borderRadius: 8, cursor: 'pointer', background: exportType === opt.id ? '#eff6ff' : '#fff', transition: 'all .15s' }}>
                <input id="mc_form_field_37" type="radio" name="exportType" value={opt.id} checked={exportType === opt.id} onChange={() => setExportType(opt.id)} style={{ marginTop: 2, accentColor: '#2563eb' }} />
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 600, fontSize: 12.5, color: exportType === opt.id ? '#1a3a6b' : '#374151' }}>
                    <i className={`fas ${opt.icon}`} style={{ fontSize: 11, color: exportType === opt.id ? '#2563eb' : '#6b7280' }} />
                    {opt.label}
                  </div>
                  <div style={{ fontSize: 10.5, color: '#6b7280', marginTop: 2, lineHeight: 1.4 }}>{opt.desc}</div>
                </div>
              </label>
            ))}
          </div>
        </div>

        {/* Field Selector (only for MC List) */}
        {exportType === 'mc_list' && (
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#1a3a6b', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: 10, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span><i className="fas fa-columns" style={{ marginRight: 6 }} /> Select Fields to Export</span>
              <div>
                <button style={{ background: 'none', border: 'none', color: theme.blue, fontSize: 11, cursor: 'pointer', marginRight: 10, padding: 0 }} onClick={() => setSelectedFields(EXPORT_FIELDS)}>Select All</button>
                <button style={{ background: 'none', border: 'none', color: theme.text3, fontSize: 11, cursor: 'pointer', padding: 0 }} onClick={() => setSelectedFields(['No', 'New File No.', 'Name of Management Corporation'])}>Clear</button>
              </div>
            </div>
            <div style={{ maxHeight: 160, overflowY: 'auto', border: `1px solid ${theme.border}`, borderRadius: 6, padding: 8, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px 12px', background: '#fafafa' }}>
              {EXPORT_FIELDS.map(f => (
                <label key={f} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, cursor: 'pointer', color: theme.text2 }}>
                  <input id="mc_form_field_38" name="mc_form_field_38"
                    type="checkbox"
                    checked={selectedFields.includes(f)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedFields([...selectedFields, f]);
                      } else {
                        setSelectedFields(selectedFields.filter(sf => sf !== f));
                      }
                    }}
                    style={{ margin: 0 }}
                  />
                  {f}
                </label>
              ))}
            </div>
          </div>
        )}

        {/* Export Format */}
        {exportType !== 'template' && (
          <div style={{ marginBottom: 24 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#1a3a6b', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: 10 }}>
              <i className="fas fa-file" style={{ marginRight: 6 }} /> File Format
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              {[
                { id: 'excel', label: 'Excel (.xlsx)', icon: 'fa-file-excel', color: '#16a34a' },
                { id: 'pdf', label: 'PDF (Print)', icon: 'fa-file-pdf', color: '#dc2626' },
              ].map(fmt => (
                <label key={fmt.id} style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', border: `2px solid ${exportFormat === fmt.id ? fmt.color : '#e2e8f0'}`, borderRadius: 8, cursor: 'pointer', background: exportFormat === fmt.id ? (fmt.id === 'excel' ? '#f0fdf4' : '#fef2f2') : '#fff', transition: 'all .15s' }}>
                  <input id="mc_form_field_39" type="radio" name="exportFormat" value={fmt.id} checked={exportFormat === fmt.id} onChange={() => setExportFormat(fmt.id)} style={{ accentColor: fmt.color }} />
                  <i className={`fas ${fmt.icon}`} style={{ fontSize: 20, color: exportFormat === fmt.id ? fmt.color : '#9ca3af' }} />
                  <span style={{ fontWeight: 600, fontSize: 13, color: exportFormat === fmt.id ? fmt.color : '#374151' }}>{fmt.label}</span>
                </label>
              ))}
            </div>
          </div>
        )}

        {/* Summary */}
        <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8, padding: '10px 14px', marginBottom: 20, fontSize: 12, color: '#475569' }}>
          <i className="fas fa-info-circle" style={{ marginRight: 6, color: '#2563eb' }} />
          {exportType === 'template' ? (
            <span>Will download an <strong>Empty Excel Template</strong>.</span>
          ) : (
            <span>Will export <strong>{exportType === 'mc_list' ? 'MC List' : exportType === 'registration' ? 'Registration Form' : exportType === 'checklist' ? 'Document Checklist' : 'All 3 sheets (MC List + Registration + Checklist)'}</strong> as <strong>{exportFormat === 'excel' ? 'Excel (.xlsx)' : 'PDF via browser print'}</strong>.</span>
          )}
        </div>
      </div>

      {/* Buttons */}
      <div style={{ padding: '16px 24px', borderTop: `1px solid ${theme.border}`, display: 'flex', gap: 10, justifyContent: 'flex-end', flexShrink: 0, background: '#fff' }}>
        <button onClick={() => setExportModalOpen(false)} className="mc-btn-outline" style={{ padding: '9px 20px' }}>Cancel</button>
        <button
          onClick={exportSelected}
          disabled={exporting}
          style={{ padding: '9px 24px', background: exporting ? '#94a3b8' : 'linear-gradient(135deg, #1a3a6b 0%, #2563eb 100%)', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 700, fontSize: 13, cursor: exporting ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}
        >
          {exporting ? <><i className="fas fa-spinner fa-spin" /> Exporting...</> : <><i className={`fas ${exportFormat === 'excel' ? 'fa-download' : 'fa-print'}`} /> {exportFormat === 'excel' ? 'Download Excel' : 'Generate PDF'}</>}
        </button>
      </div>
    </div>
  </div>
);
}
