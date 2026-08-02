import React, { useState } from 'react';

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

const btnOutline = {
  ...btnBase,
  background: 'transparent',
  color: '#5a6478',
  border: '1px solid #e2e8f0'
};

export default function GenericExportModal({
  title = "Export Data",
  subject = "data",
  exporting = false,
  fields = [],
  defaultFields = null,
  onExport,
  onClose
}) {
  const [exportFormat, setExportFormat] = useState('excel');
  const [selectedFields, setSelectedFields] = useState(() => {
    if (defaultFields && defaultFields.length > 0) return defaultFields;
    return fields && fields.length > 0 ? fields : [];
  });

  const handleExportClick = () => {
    let activeFields = null;
    if (fields && fields.length > 0) {
      activeFields = selectedFields.length > 0 ? selectedFields : fields;
    }
    onExport(exportFormat, activeFields);
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.45)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
      onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div style={{ background: '#fff', borderRadius: 14, boxShadow: '0 20px 60px rgba(0,0,0,.25)', width: fields && fields.length > 0 ? 540 : 440, maxWidth: '95vw', overflow: 'hidden' }}>
        {/* Header */}
        <div style={{ background: '#1a3a6b', padding: '18px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <i className="fas fa-file-export" style={{ color: '#fff', fontSize: 18 }} />
            <span style={{ color: '#fff', fontWeight: 700, fontSize: 16 }}>{title}</span>
          </div>
          <button onClick={onClose} style={{ background: 'rgba(255,255,255,.2)', border: 'none', borderRadius: 6, color: '#fff', width: 28, height: 28, cursor: 'pointer', fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
        </div>

        <div style={{ padding: '22px 24px' }}>
          {/* Field Selector */}
          {fields && fields.length > 0 && (
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#1a3a6b', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: 10, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span><i className="fas fa-columns" style={{ marginRight: 6 }} /> Select Fields to Export ({selectedFields.length}/{fields.length})</span>
                <div>
                  <button type="button" style={{ background: 'none', border: 'none', color: '#2563eb', fontSize: 11, fontWeight: 600, cursor: 'pointer', marginRight: 10, padding: 0 }} onClick={() => setSelectedFields(fields)}>Select All</button>
                  <button type="button" style={{ background: 'none', border: 'none', color: '#64748b', fontSize: 11, fontWeight: 600, cursor: 'pointer', padding: 0 }} onClick={() => setSelectedFields(fields.slice(0, 3))}>Clear</button>
                </div>
              </div>
              <div style={{ maxHeight: 180, overflowY: 'auto', border: '1px solid #e2e8f0', borderRadius: 8, padding: 10, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px 12px', background: '#fafafa' }}>
                {fields.map(f => {
                  const inputId = `export_field_${f.toLowerCase().replace(/[^a-z0-9]/g, '_')}`;
                  return (
                    <label key={f} htmlFor={inputId} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 11.5, cursor: 'pointer', color: '#334155', userSelect: 'none' }}>
                      <input
                        id={inputId}
                        name={inputId}
                        type="checkbox"
                        checked={selectedFields.includes(f)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedFields([...selectedFields, f]);
                          } else {
                            setSelectedFields(selectedFields.filter(sf => sf !== f));
                          }
                        }}
                        style={{ margin: 0, accentColor: '#2563eb', width: 14, height: 14 }}
                      />
                      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', title: f }}>{f}</span>
                    </label>
                  );
                })}
              </div>
            </div>
          )}

          {/* Export Format */}
          <div style={{ marginBottom: 24 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#1a3a6b', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: 10 }}>
              <i className="fas fa-file" style={{ marginRight: 6 }} /> File Format
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              {[
                { id: 'excel', label: 'Excel (.xlsx)', icon: 'fa-file-excel', color: '#16a34a' },
                { id: 'pdf', label: 'PDF (Print)', icon: 'fa-file-pdf', color: '#dc2626' },
              ].map(fmt => {
                const inputId = `export_format_${fmt.id}`;
                return (
                  <label key={fmt.id} htmlFor={inputId} style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', border: `2px solid ${exportFormat === fmt.id ? fmt.color : '#e2e8f0'}`, borderRadius: 8, cursor: 'pointer', background: exportFormat === fmt.id ? (fmt.id === 'excel' ? '#f0fdf4' : '#fef2f2') : '#fff', transition: 'all .15s' }}>
                    <input id={inputId} type="radio" name="exportFormat" value={fmt.id} checked={exportFormat === fmt.id} onChange={() => setExportFormat(fmt.id)} style={{ accentColor: fmt.color }} />
                    <i className={`fas ${fmt.icon}`} style={{ fontSize: 20, color: exportFormat === fmt.id ? fmt.color : '#9ca3af' }} />
                    <span style={{ fontWeight: 600, fontSize: 13, color: exportFormat === fmt.id ? fmt.color : '#374151' }}>{fmt.label}</span>
                  </label>
                );
              })}
            </div>
          </div>

          {/* Summary */}
          <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8, padding: '10px 14px', marginBottom: 20, fontSize: 12, color: '#475569' }}>
            <i className="fas fa-info-circle" style={{ marginRight: 6, color: '#2563eb' }} />
            Will export <strong>{subject}</strong>{fields && fields.length > 0 ? ` (${selectedFields.length > 0 ? selectedFields.length : fields.length} fields)` : ''} as <strong>{exportFormat === 'excel' ? 'Excel (.xlsx)' : 'PDF via browser print'}</strong>.
          </div>

          {/* Buttons */}
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
            <button onClick={onClose} style={{ ...btnOutline, padding: '9px 20px' }}>Cancel</button>
            <button
              onClick={handleExportClick}
              disabled={exporting}
              style={{ padding: '9px 24px', background: exporting ? '#94a3b8' : 'linear-gradient(135deg, #1a3a6b 0%, #2563eb 100%)', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 700, fontSize: 13, cursor: exporting ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}
            >
              {exporting ? <><i className="fas fa-spinner fa-spin" /> Exporting...</> : <><i className={`fas ${exportFormat === 'excel' ? 'fa-download' : 'fa-print'}`} /> {exportFormat === 'excel' ? 'Download Excel' : 'Generate PDF'}</>}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
