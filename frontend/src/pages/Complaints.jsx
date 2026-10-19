import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { hasPermission } from '../utils/roleLabel.js';
import * as XLSX from 'xlsx';
import { useConfirmDialog } from '../ConfirmDialogContext.jsx';
import '../CMAStyles.css';
import GenericExportModal from '../components/GenericExportModal.jsx';
import HistoryModal from '../components/HistoryModal.jsx';
import StatusPill from '../components/StatusPill.jsx';
import { useAutoRefresh } from '../utils/useAutoRefresh';
import { exportToPdfPrint } from '../utils/pdfExport';
import { MONTH_OPTIONS, getYearFilterOptions } from '../utils/filterConstants';
import '../components/mc-management/MCManagement.css';
window.XLSX = XLSX;

import {
  theme,
  btnBase,
  btnPrimary,
  btnOutline,
  overlayStyle,
  modalStyle,
  modalHeader,
  closeBtnStyle,
  inputStyle,
  sectionLabelStyle,
  tableWrapperStyle,
  tableStyle,
  thStyle,
  thActionsStyle,
  tdActionsStyle,
  STATUS_COL_RIGHT_OFFSET,
  tdStatusStyle,
  ActionBtn,
  thStatusStyle,
  cellStyle,
  tdCheckStyle,
  COL_WIDTHS,
  CATEGORIES_BY_SECTION,
  ALL_CATEGORIES,
  STATUS_OPTIONS,
  STATUS_COLORS,
  pad2,
  parseFlexibleDate,
  formatDisplayDate,
  normalizeKey,
  getCell,
  toText,
  toBool,
  normalizeExcelDate,
  findHeaderRowIndex,
  sheetToRowObjects,
  calculateDaysElapsed,
  toBackendRecordFromExcelRow,
  FormField,
  CheckField,
  SectionLabel,
  FormModal,
  ViewModal,
  TransferModal,
  CloseModal
} from '../components/complaints/ComplaintsShared.jsx';


export default function Complaints({ currentUser, onNavigate }) {
  const isLegal = String(currentUser?.department || '').trim().toLowerCase() === 'legal';
  const isTechnical = String(currentUser?.department || '').trim().toLowerCase() === 'technical';
  const isDeptUser = isLegal ? 'LEGAL' : isTechnical ? 'TECHNICAL' : null;
  const deptColor = isLegal ? theme.green : isTechnical ? theme.orange : theme.navy;
  
  const canEdit = hasPermission(currentUser, 'complains', 'edit');
  const canDelete = hasPermission(currentUser, 'complains', 'delete');
  const canCreate = hasPermission(currentUser, 'complains', 'create');
  const canApprove = hasPermission(currentUser, 'complains', 'approve');
  const canTransfer = hasPermission(currentUser, 'complains', 'transfer');
  const canClose = hasPermission(currentUser, 'complains', 'close');
  const canViewOnly = !canEdit && !canDelete && !canCreate && !canApprove; // fallback




  // Dashboard quick-filter support
  // When user clicks Dashboard card for Complaints, we want ONLY: pending/not closed and > 15 days
  // Card sets localStorage key: cma_complaints_filter=pending_overdue_15
  const [pendingOverdueFilter, setPendingOverdueFilter] = useState(() => {
    const filter = localStorage.getItem('cma_complaints_filter');
    if (filter === 'pending_overdue_15') {
      localStorage.removeItem('cma_complaints_filter');
      return true;
    }
    return false;
  });

  const auditUserLabel = currentUser?.name && currentUser?.username
    ? `${currentUser.name} (${currentUser.username})`
    : currentUser?.name || currentUser?.username || '';

  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshTick, setRefreshTick] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [yearFilter, setYearFilter] = useState('');
  // stored as 'YYYY-MM'
  const [monthFilter, setMonthFilter] = useState('');
  // backs the new Month select dropdown ('01'..'12'); combined with yearFilter
  // below to keep producing monthFilter in the existing 'YYYY-MM' format.
  const [monthOnlyFilter, setMonthOnlyFilter] = useState('');
  const [page, setPage] = useState(1);
  const [viewAll, setViewAll] = useState(() => {
    return sessionStorage.getItem('cma_complaints_viewAll') === 'true';
  });
  const [isZoomed, setIsZoomed] = useState(() => {
    return sessionStorage.getItem('cma_complaints_isZoomed') === 'true';
  });

  useEffect(() => {
    sessionStorage.setItem('cma_complaints_viewAll', String(viewAll));
    sessionStorage.setItem('cma_complaints_isZoomed', String(isZoomed));
  }, [viewAll, isZoomed]);

  const pageSizeDefault = 20;
  const [totalCount, setTotalCount] = useState(0);
  const [toast, setToast] = useState(null);
  const [isImporting, setIsImporting] = useState(false);
  const [exportModalOpen, setExportModalOpen] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [showFormModal, setShowFormModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [selectedHistoryRecord, setSelectedHistoryRecord] = useState(null);
  const [editingRecord, setEditingRecord] = useState(null);
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [showCloseModal, setShowCloseModal] = useState(false);
  const [actionRecord, setActionRecord] = useState(null);
  const [lastImportedSerialNos, setLastImportedSerialNos] = useState([]);
  const [showPendingPanel, setShowPendingPanel] = useState(() => {
    return sessionStorage.getItem('cma_complaints_showPendingPanel') === 'true';
  });
  const [overdueList, setOverdueList] = useState([]);
  const [summaryStats, setSummaryStats] = useState(null);
  // MC NO link popup state: { mcNo, x, y }
  const [mcLinkPopup, setMcLinkPopup] = useState(null);
  const confirm = useConfirmDialog();

  // Navigate to MC or M.Com Management with mc_no pre-filled as search term
  function handleMcNoNavigate(mcNo, page) {
    if (!mcNo || !onNavigate) return;
    const trimmed = String(mcNo).trim();
    if (page === 'mc') {
      localStorage.setItem('cma_mc_navigate_search', trimmed);
      onNavigate('mc');
    } else {
      localStorage.setItem('cma_mcom_navigate_search', trimmed);
      onNavigate('mcom');
    }
    setMcLinkPopup(null);
  }

  const pageSize = viewAll ? 999999 : pageSizeDefault;
  const maxPage = Math.max(1, Math.ceil(totalCount / pageSize));

  async function load() {
    setLoading(true);
    try {
      const API_BASE = (import.meta.env.VITE_API_URL || '/api').trim();
      const params = new URLSearchParams({
        limit: pendingOverdueFilter ? 999999 : pageSize,
        page: pendingOverdueFilter ? 1 : page,
      });
      if (searchTerm?.trim()) params.append('q', searchTerm.trim());
      if (categoryFilter?.trim()) params.append('category', categoryFilter.trim());
      if (statusFilter) params.append('status', statusFilter);
      if (yearFilter?.trim()) params.append('year', yearFilter.trim());
      if (monthFilter?.trim()) params.append('month', monthFilter.trim());
      if (pendingOverdueFilter) {
        params.append('exclude_closed', 'true');
        params.append('pending_overdue_15', 'true');
      }
      if (isDeptUser) params.append('department', isDeptUser);

      const r = await fetch(`${API_BASE}/complaints?${params.toString()}`);
      const data = await r.json();
      let rows = data?.rows ?? [];
      
      if (pendingOverdueFilter) {
        rows = rows.filter(r => calculateDaysElapsed(r.received_ccu) > 15);
        setComplaints(rows);
        setTotalCount(rows.length);
      } else {
        setComplaints(rows);
        setTotalCount(data?.total ?? 0);
      }
      try {
        const sumRes = await fetch(`${API_BASE}/complaints/stats/summary`);
        if (sumRes.ok) {
          const sumData = await sumRes.json();
          setSummaryStats(sumData);
        }
      } catch (e) { }
    } catch (err) {
      showToast('Failed to load Complaints', 'error');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    setPage(1);
  }, [searchTerm, categoryFilter, statusFilter, yearFilter, monthFilter, pendingOverdueFilter]);

  useEffect(() => {
    load();

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, searchTerm, categoryFilter, statusFilter, yearFilter, monthFilter, pendingOverdueFilter, refreshTick]);

  useEffect(() => {
    sessionStorage.setItem('cma_complaints_showPendingPanel', String(showPendingPanel));
  }, [showPendingPanel]);

  // Auto-refresh every 30 seconds
  const triggerRefresh = useCallback(() => setRefreshTick(t => t + 1), []);
  useAutoRefresh(triggerRefresh, 30000);

  // Keep monthFilter (existing 'YYYY-MM' format used by load()) in sync with the
  // new Year / Month select dropdowns, without changing how load() itself works.
  useEffect(() => {
    if (monthOnlyFilter) {
      setMonthFilter(monthOnlyFilter);
    } else {
      setMonthFilter('');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [monthOnlyFilter]);




  useEffect(() => {
    async function loadOverdue() {
      try {
        const API_BASE = (import.meta.env.VITE_API_URL || '/api').trim();
        const r = await fetch(`${API_BASE}/complaints?exclude_closed=true&limit=999999`);
        const data = await r.json();
        const rows = data?.rows ?? data ?? [];
        setOverdueList(rows.filter(r => calculateDaysElapsed(r.received_ccu) > 15));
      } catch (err) {
        console.error('Failed to load overdue list', err);
      }
    }
    loadOverdue();
  }, [complaints]);

  function showToast(msg, type = 'success') {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 2500);
  }

  async function handleSaveRecord(record) {
    try {
      const API_BASE = (import.meta.env.VITE_API_URL || '/api').trim();
      let targetId = editingRecord?.id;

      if (editingRecord) {
        const r = await fetch(`${API_BASE}/complaints/${editingRecord.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...record,
            ...(editingRecord ? { created_by: auditUserLabel, modified_by: auditUserLabel } : { modified_by: auditUserLabel }),
          }),
        });
        if (!r.ok) throw new Error('Failed to update');
      } else {
        const r = await fetch(`${API_BASE}/complaints`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...record,
            ...(auditUserLabel ? { created_by: auditUserLabel, modified_by: auditUserLabel } : {}),
          }),
        });
        if (!r.ok) throw new Error('Failed to create');
        const createdData = await r.json();
        targetId = createdData?.id;
      }

      if (record.removeDoc && editingRecord?.id) {
        await fetch(`${API_BASE}/complaints/${editingRecord.id}/document`, {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ user_name: auditUserLabel })
        });
      }

      if (record.fileObj && targetId) {
        const formData = new FormData();
        formData.append('document', record.fileObj);
        formData.append('uploaded_by', auditUserLabel || 'System');
        const uploadRes = await fetch(`${API_BASE}/complaints/${targetId}/upload`, {
          method: 'POST',
          body: formData,
        });
        if (!uploadRes.ok) {
          console.error('Failed to upload attachment');
          showToast('Record saved, but file upload failed', 'warning');
        }
      }

      showToast(editingRecord ? 'Updated ✅' : 'Created ✅');
      setShowFormModal(false);
      setEditingRecord(null);
      load();
    } catch (err) {
      showToast(err.message || 'Save failed', 'error');
    }
  }

  async function handleDeleteRecord(id) {
    const confirmed = await confirm({
      title: 'Delete Complaint',
      message: 'Delete this complaint permanently? This action cannot be undone.',
      confirmLabel: 'Delete',
      cancelLabel: 'Cancel',
    });
    if (!confirmed) return;
    try {
      const API_BASE = (import.meta.env.VITE_API_URL || '/api').trim();
      const r = await fetch(`${API_BASE}/complaints/${id}`, { method: 'DELETE' });
      if (!r.ok) throw new Error('Failed to delete');
      showToast('Deleted ✅');
      load();
    } catch (err) {
      showToast(err.message || 'Delete failed', 'error');
    }
  }

  async function handleTransfer(department) {
    try {
      const API_BASE = (import.meta.env.VITE_API_URL || '/api').trim();
      const r = await fetch(`${API_BASE}/complaints/${actionRecord.id}/transfer`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          assigned_department: department, 
          user_name: auditUserLabel,
          from_department: currentUser?.department || 'ADMIN' 
        }),
      });
      if (!r.ok) throw new Error('Failed to transfer');

      if (department !== 'CCU') {
        fetch(`${API_BASE}/notifications`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'info',
            title: 'Complaint Transferred',
            message: `Complaint ${actionRecord.serial_no || actionRecord.id} has been transferred to your department by ${auditUserLabel}.`,
            target_role: department,
            link: `complains:${actionRecord.id}`
          })
        }).catch(() => {});
      }

      showToast(department === 'CCU' ? 'Returned to CCU (Admin) ✅' : `Transferred to ${department} ✅`);
      setShowTransferModal(false);
      setActionRecord(null);
      load();
    } catch (err) {
      showToast(err.message || 'Transfer failed', 'error');
    }
  }

  async function handleCloseCase(reason, fileObj) {
    try {
      const API_BASE = (import.meta.env.VITE_API_URL || '/api').trim();
      const formData = new FormData();
      formData.append('closed_reason', reason);
      formData.append('closed_department', isDeptUser || 'ADMIN');
      formData.append('user_name', auditUserLabel);
      if (fileObj) {
        formData.append('document', fileObj);
      }

      const r = await fetch(`${API_BASE}/complaints/${actionRecord.id}/close`, {
        method: 'PUT',
        body: formData,
      });
      if (!r.ok) throw new Error('Failed to close case');
      showToast('Case Closed ✅');
      setShowCloseModal(false);
      setActionRecord(null);
      load();
    } catch (err) {
      showToast(err.message || 'Close failed', 'error');
    }
  }

  async function handleDeleteImported() {
    if (!lastImportedSerialNos || !lastImportedSerialNos.length) return showToast('No imported batch to delete', 'error');
    const confirmed = await confirm({
      title: 'Delete imported records',
      message: `Delete ${lastImportedSerialNos.length} imported records? This cannot be undone.`,
      confirmLabel: 'Delete',
      cancelLabel: 'Cancel',
    });
    if (!confirmed) return;
    try {
      const API_BASE = (import.meta.env.VITE_API_URL || '/api').trim();
      const r = await fetch(`${API_BASE}/complaints/bulk-delete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ serial_nos: lastImportedSerialNos }),
      });
      const res = await r.json();
      if (!r.ok) throw new Error(res.error || 'Delete failed');
      showToast(`Deleted ${res.deleted} records ✅`);
      setLastImportedSerialNos([]);
      load();
    } catch (err) {
      showToast(err.message || 'Delete failed', 'error');
    }
  }

  async function handleDeleteAll() {
    const confirmed = await confirm({
      title: 'Delete all Complaints',
      message: 'Delete ALL complaint records? This cannot be undone.',
      confirmLabel: 'Delete all',
      cancelLabel: 'Cancel',
    });
    if (!confirmed) return;
    try {
      const API_BASE = (import.meta.env.VITE_API_URL || '/api').trim();
      const r = await fetch(`${API_BASE}/complaints`, { method: 'DELETE' });
      const res = await r.json();
      if (!r.ok) throw new Error(res.error || 'Delete all failed');
      showToast(`Deleted all Complaints ✅`);
      setLastImportedSerialNos([]);
      load();
    } catch (err) {
      showToast(err.message || 'Delete all failed', 'error');
    }
  }

  async function handleExport(format) {
    try {
      setExporting(true);
      if (typeof window.XLSX === 'undefined') return showToast('XLSX library not loaded', 'error');
      showToast('Preparing export...');

      const API_BASE = (import.meta.env.VITE_API_URL || '/api').trim();
      const response = await fetch(`${API_BASE}/complaints?limit=999999`);
      const result = await response.json();
      const allComplaints = result.rows || result || [];

      const rows = (allComplaints || []).map((r) => ({
        'Serial No': r.serial_no ?? '',
        'Letter date': r.letter_date ?? '',
        'Received CCU': r.received_ccu ?? '',
        'MC No.': r.mc_no ?? '',
        'Apartment Name': r.apartment_name ?? '',
        'Complaint Name': r.complaint_name ?? '',
        'Issue/Heading': r.issue_heading ?? '',
        'File': r.file_marked ? '√' : '',
        'T/R': r.tr_marked ? '√' : '',
        'Reply': r.reply_marked ? '√' : '',
        'Category': r.category ?? '',
        'Remarks': r.remarks ?? '',
        'Status': r.status ?? '',
        'Created By': r.created_by ?? '',
        'Modified By': r.modified_by ?? '',
        'Created At': r.created_at ?? '',
        'Updated At': r.updated_at ?? '',
      }));

      if (format === 'pdf') {
        exportToPdfPrint('Complaints', rows);
        setExportModalOpen(false);
        showToast('PDF print dialog opened ✅');
        return;
      }

      const ws = window.XLSX.utils.json_to_sheet(rows);
      const wb = window.XLSX.utils.book_new();
      window.XLSX.utils.book_append_sheet(wb, ws, 'Complaints');
      window.XLSX.writeFile(wb, `CMA_Complaints_${new Date().toISOString().split('T')[0]}.xlsx`);
      setExportModalOpen(false);
      showToast('Exported ✅');
    } catch (err) {
      showToast(err.message || 'Export failed', 'error');
    } finally {
      setExporting(false);
    }
  }

  async function importExcel(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (typeof window.XLSX === 'undefined') return showToast('XLSX library not loaded', 'error');
    try {
      setIsImporting(true);
      const data = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (ev) => resolve(ev.target.result);
        reader.onerror = (err) => reject(err);
        reader.readAsArrayBuffer(file);
      });
      const wb = window.XLSX.read(new Uint8Array(data), { type: 'array', cellDates: true });
      let allRows = [];
      for (const sheetName of wb.SheetNames) {
        try {
          const ws = wb.Sheets[sheetName];
          const rows = sheetToRowObjects(ws);
          allRows.push(...rows);
        } catch (sheetErr) {
          console.warn(`Error processing sheet "${sheetName}":`, sheetErr);
          showToast(`Warning: Error in sheet "${sheetName}" - continuing with other sheets`, 'error');
        }
      }
      if (!allRows.length) return showToast('No matching complaint rows found in sheets', 'error');

      const records = [];
      const errors = [];

      allRows.forEach((row, idx) => {
        try {
          const record = toBackendRecordFromExcelRow(row);
          if (record) {
            records.push({
              ...record,
              ...(auditUserLabel ? { created_by: auditUserLabel, modified_by: auditUserLabel } : {}),
            });
          }
        } catch (rowErr) {
          console.warn(`Error processing row ${idx}:`, rowErr, row);
          errors.push(`Row ${idx + 1}: ${rowErr.message}`);
        }
      });

      if (!records.length) return showToast('No valid data rows found in sheets', 'error');

      const API_BASE = (import.meta.env.VITE_API_URL || '/api').trim();
      const r = await fetch(`${API_BASE}/complaints/bulk`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(records),
      });
      const result = await r.json();
      if (!r.ok) throw new Error(result.error || 'Import failed');
      showToast(`Imported ${records.length} records ✅`);
      setLastImportedSerialNos(records.map((x) => x.serial_no));
      load();

      if (errors.length > 0) {
        console.warn(`Import succeeded but ${errors.length} rows had issues:`, errors);
      }
    } catch (err) {
      showToast(err.message || 'Import failed', 'error');
      console.error('Import error:', err);
    } finally {
      setIsImporting(false);
      e.target.value = '';
    }
  }

  const stats = useMemo(() => {
    if (summaryStats) {
      return {
        total: summaryStats.total ?? totalCount,
        pending: summaryStats.pending ?? 0,
        new: summaryStats.new ?? 0,
        open: summaryStats.open ?? 0,
        closed: summaryStats.closed ?? 0,
        overdue: summaryStats.overdue ?? overdueList.length,
        totalCategories: summaryStats.totalCategories ?? 0,
        byStatus: {
          'New': summaryStats.new ?? 0,
          'Open': summaryStats.open ?? 0,
          'Closed': summaryStats.closed ?? 0,
        },
      };
    }
    const pending = complaints.filter((r) => r.status !== 'Closed').length;
    const overdue = complaints.filter((r) => r.status !== 'Closed' && calculateDaysElapsed(r.received_ccu) > 15).length;
    const closed = complaints.filter((r) => r.status === 'Closed').length;
    const replyDone = complaints.filter((r) => r.reply_marked).length;
    const categories = new Set(complaints.map((r) => r.category).filter(Boolean));
    const byStatus = {};
    complaints.forEach((r) => {
      byStatus[r.status] = (byStatus[r.status] || 0) + 1;
    });
    return {
      total: totalCount || complaints.length,
      pending,
      overdue,
      closed,
      replyDone,
      totalCategories: categories.size,
      new: byStatus['New'] || 0,
      open: byStatus['Open'] || 0,
    };
  }, [summaryStats, totalCount, complaints, overdueList]);

  const pendingByCategory = useMemo(() => {
    if (!categoryFilter) return [];
    return complaints.filter(
      (r) => r.category === categoryFilter && r.status !== 'Closed' && calculateDaysElapsed(r.received_ccu) > 15
    );
  }, [complaints, categoryFilter]);

  return (
    <div style={{ padding: 20, fontFamily: "'Inter', 'Segoe UI', sans-serif", background: theme.bg, minHeight: '100vh' }}>
      {/* Breadcrumb */}
      <div style={{ fontSize: 12, color: '#999', marginBottom: 16 }}>
        <span>Home</span> / <span>Complaints Management</span>
      </div>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 10 }}>
        <div>
          <h2 style={{ fontSize: 19, fontWeight: 600, margin: 0, color: theme.text }}>Complaints Management</h2>
          <p style={{ color: '#999', fontSize: 13, margin: '4px 0 0 0' }}>Monthly progress complaint records tracking and management</p>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          <button onClick={() => setExportModalOpen(true)} style={btnOutline}><i className="fas fa-upload" /> Export</button>
          {canEdit && (
            <label style={{ ...btnOutline, cursor: 'pointer', margin: 0 }}>
              <i className="fas fa-download" /> Import
              <input type="file" accept=".xlsx,.xls" style={{ display: 'none' }} onChange={importExcel} />
            </label>
          )}
          {canEdit && (
            <button onClick={handleDeleteAll} style={{ ...btnOutline, color: theme.red, borderColor: theme.red }} title="Delete all Complaints">
              <i className="fas fa-trash" /> Delete All
            </button>
          )}
          {canEdit && lastImportedSerialNos && lastImportedSerialNos.length > 0 && (
            <button onClick={handleDeleteImported} style={{ ...btnOutline, color: theme.red, borderColor: theme.red }} title="Delete imported batch">
              <i className="fas fa-trash" /> Delete Imported
            </button>
          )}
          {/* Pending Reminder Bell */}
          <div style={{ position: 'relative' }}>
            <button
              onClick={() => setShowPendingPanel((v) => !v)}
              style={{ position: 'relative', ...btnOutline }}
              title="Pending reminders - complaints pending for more than 15 days"
            >
              <i className="fas fa-bell" /> Pending
              {stats.overdue > 0 && (
                <span style={{ position: 'absolute', top: -6, right: -6, background: '#2563eb', color: '#fff', borderRadius: 999, fontSize: 10, fontWeight: 700, minWidth: 16, height: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 4px' }}>
                  {stats.overdue}
                </span>
              )}
            </button>
            {showPendingPanel && (
              <div style={{ position: 'absolute', right: 0, top: '110%', width: 340, maxHeight: 420, overflowY: 'auto', background: '#fff', border: `1px solid ${theme.border}`, borderRadius: 10, boxShadow: '0 12px 34px rgba(0,0,0,.18)', zIndex: 500 }}>
                <div style={{ padding: '10px 14px', fontWeight: 700, fontSize: 13, color: theme.navy, borderBottom: `1px solid ${theme.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span>Pending Reminders (&gt;15 days)</span>
                  <button onClick={() => setShowPendingPanel(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: theme.text3, fontSize: 14, lineHeight: 1, padding: 4 }} title="Close">
                    <i className="fas fa-times" />
                  </button>
                </div>
                <div style={{ padding: '10px 14px', borderBottom: `1px solid ${theme.border}`, background: '#f8fafc', display: 'flex', gap: 8 }}>
                  <button
                    onClick={() => {
                      setPendingOverdueFilter(!pendingOverdueFilter);
                      setShowPendingPanel(false);
                    }}
                    style={{ width: '100%', justifyContent: 'center', ...(pendingOverdueFilter ? { background: '#ef4444', color: '#fff', border: 'none', padding: '8px 14px', borderRadius: 8, fontSize: 13, fontWeight: 500, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6 } : { ...btnPrimary, width: '100%', justifyContent: 'center' }) }}
                  >
                    <i className={pendingOverdueFilter ? "fas fa-times" : "fas fa-filter"} />
                    {pendingOverdueFilter ? 'Clear Table Filter' : 'Filter & View All in Table'}
                  </button>
                </div>
                {stats.overdue === 0 ? (
                  <div style={{ padding: 14, fontSize: 12, color: theme.text3 }}>No pending items.</div>
                ) : overdueList.map((cf) => {
                  const days = calculateDaysElapsed(cf.received_ccu);
                  return (
                    <div
                      key={cf.id}
                      style={{ padding: '10px 14px', borderBottom: `1px solid ${theme.border}`, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between', transition: '.15s background' }}
                      onClick={() => {
                        setSelectedRecord(cf);
                        setShowViewModal(true);
                        setShowPendingPanel(false);
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.background = '#f8fafc'}
                      onMouseLeave={(e) => e.currentTarget.style.background = '#fff'}
                    >
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span style={{ fontSize: 12.5, fontWeight: 600, color: theme.text }}>{cf.serial_no}</span>
                          <span style={{ padding: '1px 6px', borderRadius: 999, background: '#fee2e2', color: '#ef4444', fontSize: 10, fontWeight: 700 }}>{days} days</span>
                        </div>
                        <div style={{ fontSize: 11, color: theme.text2, marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          <strong>Issue:</strong> {cf.issue_heading || '—'}
                        </div>
                        <div style={{ fontSize: 10.5, color: theme.text3, marginTop: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {cf.apartment_name || '—'}
                        </div>
                      </div>
                      <i className="fas fa-chevron-right" style={{ fontSize: 11, color: theme.text3, marginLeft: 8 }} />
                    </div>
                  );
                })}
              </div>
            )}
          </div>
          {canEdit && (
            <button onClick={() => { setEditingRecord(null); setShowFormModal(true); }} style={btnPrimary}>
              <i className="fas fa-plus" /> Add Complaint
            </button>
          )}
        </div>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))', gap: 14, marginBottom: 16 }}>
        {[
          { label: 'TOTAL', value: stats.total, icon: 'fa-folder', color: theme.blue, filterKey: 'TOTAL' },
          { label: 'PENDING', value: stats.pending, icon: 'fa-exclamation', color: theme.red, filterKey: 'PENDING' },
          { label: 'CATEGORIES', value: stats.totalCategories, icon: 'fa-tags', color: theme.text2, filterKey: 'ALL_CATS' },
          { label: 'NEW', value: stats.new ?? (stats.byStatus && stats.byStatus['New']) ?? 0, icon: 'fa-star', color: '#2563eb', filterKey: 'NEW' },
        ].map(({ label, value, icon, color, filterKey }) => {
          const isActive =
            (filterKey === 'TOTAL' && !statusFilter && !pendingOverdueFilter) ||
            (filterKey === 'PENDING' && pendingOverdueFilter) ||
            (filterKey === 'NEW' && statusFilter === 'New');
          return (
            <div
              key={label}
              onClick={() => {
                if (filterKey === 'ALL_CATS') return;
                if (filterKey === 'TOTAL') {
                  setPendingOverdueFilter(false);
                  setStatusFilter('');
                } else if (filterKey === 'PENDING') {
                  setStatusFilter('');
                  setPendingOverdueFilter((prev) => !prev);
                } else if (filterKey === 'NEW') {
                  setPendingOverdueFilter(false);
                  setStatusFilter((prev) => (prev === 'New' ? '' : 'New'));
                }
              }}
              style={{
                background: theme.card,
                borderRadius: 12,
                padding: 18,
                border: isActive ? `2px solid ${color || theme.blue}` : `1px solid ${theme.border}`,
                cursor: filterKey === 'ALL_CATS' ? 'default' : 'pointer',
                transition: 'box-shadow 0.15s, border 0.15s',
                boxShadow: isActive ? `0 0 0 3px ${(color || theme.blue)}22` : 'none',
              }}
              onMouseEnter={(e) => { if (!isActive && filterKey !== 'ALL_CATS') e.currentTarget.style.boxShadow = '0 2px 10px rgba(0,0,0,0.1)'; }}
              onMouseLeave={(e) => { if (!isActive && filterKey !== 'ALL_CATS') e.currentTarget.style.boxShadow = 'none'; }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ fontSize: 24, color: color || theme.blue, opacity: 0.7 }}>
                  <i className={`fas ${icon}`} />
                </div>
                <div>
                  <div style={{ fontSize: 11, color: theme.text3, textTransform: 'uppercase', letterSpacing: '.8px', fontWeight: 500 }}>{label}</div>
                  <div style={{ fontSize: 22, fontWeight: 700, color: color || theme.text }}>{value}</div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Pending by Category — only shown when a category is selected */}
      {categoryFilter && pendingByCategory.length > 0 && (
        <div style={{ background: theme.card, borderRadius: 14, border: `1px solid ${theme.border}`, borderLeft: `4px solid ${theme.orange}`, boxShadow: '0 4px 20px rgba(15,23,42,.06)', marginBottom: 16, overflow: 'hidden' }}>
          <div style={{ padding: '14px 20px', display: 'flex', alignItems: 'center', gap: 14, borderBottom: `1px solid ${theme.border}` }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: `${theme.orange}15`, color: theme.orange, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <i className="fas fa-clock" style={{ fontSize: 15 }} />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: theme.text }}>Pending — {categoryFilter}</span>
                <span style={{ padding: '2px 8px', borderRadius: 999, background: `${theme.red}15`, color: theme.red, fontSize: 11, fontWeight: 600 }}>
                  {pendingByCategory.length}
                </span>
              </div>
              <div style={{ fontSize: 12, color: theme.text3, marginTop: 2 }}>Complaints in this category pending more than 15 days</div>
            </div>
          </div>
          <div style={{ maxHeight: 320, overflowY: 'auto' }}>
            {pendingByCategory.map((pending, idx) => {
              const days = calculateDaysElapsed(pending.received_ccu);
              return (
                <div
                  key={pending.id}
                  onClick={() => { setSelectedRecord(pending); setShowViewModal(true); }}
                  style={{ padding: '12px 20px', borderTop: idx === 0 ? 'none' : `1px solid ${theme.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16, cursor: 'pointer', transition: 'background .15s ease' }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = theme.bg)}
                  onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 3 }}>
                      <span style={{ fontSize: 13, fontWeight: 600, color: theme.text }}>{pending.serial_no}</span>
                      <span style={{ fontSize: 12, color: theme.text3 }}>•</span>
                      <span style={{ fontSize: 12, color: theme.text2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{pending.apartment_name || '—'}</span>
                    </div>
                    <div style={{ fontSize: 12, color: theme.text3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{pending.issue_heading || 'No heading provided'}</div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                    <span style={{ padding: '3px 10px', borderRadius: 999, background: `${theme.red}12`, color: theme.red, fontSize: 11, fontWeight: 600 }}>{days} days</span>
                    <i className="fas fa-chevron-right" style={{ fontSize: 11, color: theme.text3 }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Table Card */}
      <div style={{ background: theme.card, borderRadius: 12, border: `1px solid ${theme.border}`, boxShadow: '0 2px 12px rgba(0,0,0,.07)', overflow: 'hidden' }}>

        {/* Filters */}
        <div style={{ padding: '14px 16px', borderBottom: `1px solid ${theme.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 14, fontWeight: 600, color: theme.text }}>Complaint Records</span>
            {pendingOverdueFilter && (
              <span style={{
                fontSize: 11,
                color: theme.orange,
                background: `${theme.orange}15`,
                padding: '3px 10px',
                borderRadius: 12,
                fontWeight: 600,
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
              }}>
                <i className="fas fa-clock" /> Pending &gt; 15 Days
                <button
                  onClick={() => setPendingOverdueFilter(false)}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: theme.orange,
                    cursor: 'pointer',
                    fontSize: 12,
                    marginLeft: 4,
                    padding: 0,
                    fontWeight: 700,
                  }}
                  title="Clear Filter"
                >
                  ✕
                </button>
              </span>
            )}
          </div>
          <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap', flex: '1 1 auto', justifyContent: 'flex-end' }}>
            <div style={{ position: 'relative', flex: '1 1 180px', maxWidth: 260 }}>
              <i className="fas fa-search" style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#999', fontSize: 12 }}></i>
              <input
                id="complaint_search_input"
                name="complaint_search_input"
                aria-label="Search Complaints"
                type="text"
                placeholder="Search…"
                value={searchTerm}
                onChange={(e) => { setSearchTerm(e.target.value); setPendingOverdueFilter(false); }}
                style={{ padding: '6px 10px 6px 28px', height: 30, borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 12, width: '100%', outline: 'none', transition: 'border-color 0.2s', boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.02)' }}
                onFocus={(e) => e.target.style.borderColor = '#3b82f6'}
                onBlur={(e) => e.target.style.borderColor = '#cbd5e1'}
              />
            </div>
            <select
              id="complaint_category_filter"
              name="complaint_category_filter"
              aria-label="Filter Category"
              value={categoryFilter}
              onChange={(e) => { setCategoryFilter(e.target.value); setPendingOverdueFilter(false); }}
              style={{ padding: '5px 8px', height: 30, borderRadius: 4, border: '1px solid #ddd', fontSize: 12, width: 140, maxWidth: 140, textOverflow: 'ellipsis' }}
            >
              <option value="">All Categories</option>
              {Object.entries(CATEGORIES_BY_SECTION).map(([section, cats]) => (
                <optgroup key={section} label={section}>
                  {cats.map((cat) => <option key={cat} value={cat}>{cat}</option>)}
                </optgroup>
              ))}
            </select>
            <select
              id="complaint_status_filter"
              name="complaint_status_filter"
              aria-label="Filter Status"
              value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value); setPendingOverdueFilter(false); }}
              style={{ padding: '5px 8px', height: 30, borderRadius: 4, border: '1px solid #ddd', fontSize: 12, width: 120, maxWidth: 120, textOverflow: 'ellipsis' }}
            >
              <option value="">All Status</option>
              {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>

            <select
              id="complaint_year_filter"
              name="complaint_year_filter"
              aria-label="Filter Year"
              value={yearFilter}
              onChange={(e) => { setYearFilter(e.target.value); setPendingOverdueFilter(false); }}
              style={{ padding: '5px 8px', height: 30, borderRadius: 4, border: '1px solid #ddd', fontSize: 12, width: 100 }}
            >
              <option value="">All Years</option>
              {getYearFilterOptions().map((y) => <option key={y} value={y}>{y}</option>)}
            </select>

            <select
              id="complaint_month_filter"
              name="complaint_month_filter"
              aria-label="Filter Month"
              value={monthOnlyFilter}
              onChange={(e) => { setMonthOnlyFilter(e.target.value); setPendingOverdueFilter(false); }}
              style={{ padding: '5px 8px', height: 30, borderRadius: 4, border: '1px solid #ddd', fontSize: 12, width: 140 }}
            >
              <option value="">All Months</option>
              {MONTH_OPTIONS.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
            </select>

          </div>
        </div>

        {/* Pagination & Zoom Controls */}
        <div className={`cma-table-card-container ${isZoomed ? 'table-fullscreen-mode' : ''}`} style={{ background: isZoomed ? '#fff' : 'transparent', display: 'flex', flexDirection: 'column' }}>
          <div style={{ padding: '10px 16px', borderBottom: `1px solid ${theme.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            <div style={{ fontSize: 12, color: theme.text2 }}>
              Showing <strong>{loading ? 0 : complaints.length}</strong> of <strong>{totalCount}</strong>
            </div>
            <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
              {!viewAll && (
                <>
                  <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}
                    style={page === 1 ? { ...btnOutline, opacity: 0.5, cursor: 'not-allowed', padding: '5px 10px', fontSize: 12 } : { ...btnOutline, padding: '5px 10px', fontSize: 12 }}>Prev</button>
                  <span style={{ fontSize: 12, color: theme.text3 }}>Page <strong style={{ color: theme.text }}>{page}</strong> / {maxPage}</span>
                  <button onClick={() => setPage((p) => Math.min(maxPage, p + 1))} disabled={page >= maxPage}
                    style={page >= maxPage ? { ...btnOutline, opacity: 0.5, cursor: 'not-allowed', padding: '5px 10px', fontSize: 12 } : { ...btnOutline, padding: '5px 10px', fontSize: 12 }}>Next</button>
                </>
              )}
              <button
                onClick={() => setViewAll(v => !v)}
                className="mc-btn-base"
                style={viewAll ? { background: '#10b981', color: '#ffffff', border: 'none', padding: '5px 12px', fontSize: 12, borderRadius: 6 } : { background: '#f1f5f9', color: '#334155', border: '1px solid #cbd5e1', padding: '5px 12px', fontSize: 12, borderRadius: 6 }}
                title="Toggle between showing all records and paginated view"
              >
                <i className={loading && viewAll ? 'fas fa-spinner fa-spin' : viewAll ? 'fas fa-check-circle' : 'fas fa-list'} style={{ marginRight: 5 }} />
                {loading && viewAll ? 'Loading All…' : viewAll ? 'Showing All Records' : 'View All Records'}
              </button>
              <button
                onClick={() => {
                  const next = !isZoomed;
                  setIsZoomed(next);
                  setViewAll(next);
                }}
                className="mc-btn-base"
                style={{ background: '#e0e7ff', color: '#4338ca', border: '1px solid #c7d2fe', padding: '5px 12px', fontSize: 12, borderRadius: 6 }}
              >
                {isZoomed ? (
                  <><i className="fas fa-compress" style={{ marginRight: 6 }} /> Exit Zoom</>
                ) : (
                  <><i className="fas fa-expand" style={{ marginRight: 6 }} /> Zoom Table</>
                )}
              </button>
            </div>
          </div>

          {/* Table — MC Management pattern: colgroup, sticky header, sticky actions, maxHeight scroll */}
          <div style={tableWrapperStyle}>
            <table style={tableStyle}>
              <colgroup>
                {Object.keys(COL_WIDTHS).map((h) => (
                  <col key={h} style={{ width: COL_WIDTHS[h] }} />
                ))}
              </colgroup>
              <thead>
                <tr>
                  {Object.keys(COL_WIDTHS).map((label) => (
                    <th key={label} style={label === 'ACTIONS' ? thActionsStyle : label === 'STATUS' ? thStatusStyle : thStyle}>{label}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={Object.keys(COL_WIDTHS).length} style={{ padding: 24, textAlign: 'center', color: theme.text3 }}>Loading…</td></tr>
                ) : complaints.length === 0 ? (
                  <tr><td colSpan={Object.keys(COL_WIDTHS).length} style={{ padding: 24, textAlign: 'center', color: theme.text3 }}>No Complaints found</td></tr>
                ) : (
                  complaints.map((cf) => {
                    const days = calculateDaysElapsed(cf.received_ccu);
                    const isPending = cf.status === 'Pending' && days > 15;
                    return (
                      <tr
                        key={cf.id}
                        style={{ borderBottom: `1px solid ${theme.border}`, background: isPending ? '#fffbeb' : 'transparent' }}
                        onMouseEnter={(e) => (e.currentTarget.style.background = isPending ? '#fef3c7' : '#f8fafc')}
                        onMouseLeave={(e) => (e.currentTarget.style.background = isPending ? '#fffbeb' : '')}
                      >
                        <td style={{ ...cellStyle, color: isPending ? theme.orange : theme.text, fontWeight: 500 }} title={cf.serial_no}>{cf.serial_no}</td>
                        <td style={cellStyle} title={formatDisplayDate(cf.letter_date)}>{formatDisplayDate(cf.letter_date)}</td>
                        <td style={cellStyle} title={formatDisplayDate(cf.received_ccu)}>{formatDisplayDate(cf.received_ccu)}</td>
                        <td style={cellStyle} title={cf.mc_no ? `Click to find "${cf.mc_no}" in MC Management or M.Com` : ''}>
                          {cf.mc_no ? (
                            <span
                              onClick={(e) => {
                                e.stopPropagation();
                                const mcLower = (cf.mc_no || '').toLowerCase();
                                if (mcLower.startsWith('m.com')) {
                                  handleMcNoNavigate(cf.mc_no, 'mcom');
                                } else if (mcLower.startsWith('mc')) {
                                  handleMcNoNavigate(cf.mc_no, 'mc');
                                } else {
                                  const rect = e.currentTarget.getBoundingClientRect();
                                  setMcLinkPopup(mcLinkPopup?.mcNo === cf.mc_no ? null : { mcNo: cf.mc_no, x: rect.left, y: rect.bottom + 4 });
                                }
                              }}
                              style={{
                                color: theme.blue,
                                fontWeight: 600,
                                cursor: 'pointer',
                                textDecoration: 'underline',
                                textDecorationStyle: 'dotted',
                                textUnderlineOffset: 3,
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 4,
                              }}
                            >
                              {cf.mc_no}
                              <i className="fas fa-external-link-alt" style={{ fontSize: 9, opacity: 0.6 }} />
                            </span>
                          ) : '—'}
                        </td>
                        <td style={cellStyle} title={cf.apartment_name}>{cf.apartment_name || '—'}</td>
                        <td style={cellStyle} title={cf.complaint_name}>{cf.complaint_name || '—'}</td>
                        <td style={cellStyle} title={cf.issue_heading}>{cf.issue_heading || '—'}</td>
                        <td style={tdCheckStyle}>{cf.file_marked ? <span style={{ color: theme.green }}>✓</span> : <span style={{ color: theme.text3 }}>—</span>}</td>
                        <td style={tdCheckStyle}>{cf.tr_marked ? <span style={{ color: theme.green }}>✓</span> : <span style={{ color: theme.text3 }}>—</span>}</td>
                        <td style={tdCheckStyle}>{cf.reply_marked ? <span style={{ color: theme.green }}>✓</span> : <span style={{ color: theme.text3 }}>—</span>}</td>
                        <td className="mc-td-status" style={{ ...tdStatusStyle, background: isPending ? '#fffbeb' : '#ffffff' }}>
                          <span style={{
                            display: 'inline-block',
                            padding: '3px 9px',
                            borderRadius: 6,
                            background: `${STATUS_COLORS[cf.status] || theme.blue}15`,
                            color: STATUS_COLORS[cf.status] || theme.blue,
                            fontSize: 12,
                            fontWeight: 600,
                          }}>
                            {cf.status === 'Transferred' && cf.assigned_department ? `Transferred to ${cf.assigned_department}` : cf.status}
                          </span>
                        </td>
                        <td className="mc-td-actions" style={{ ...tdActionsStyle, background: isPending ? '#fffbeb' : '#ffffff' }}>
                          <div style={{ display: 'flex', gap: 2, justifyContent: 'flex-start', alignItems: 'center' }}>
                            <ActionBtn icon="fas fa-eye" color={theme.blue} title="View" onClick={() => { setSelectedRecord(cf); setShowViewModal(true); }} />
                            {canEdit && (
                              <ActionBtn icon="fas fa-history" color={theme.text2} title="History" onClick={() => { setSelectedHistoryRecord(cf); setShowHistoryModal(true); }} />
                            )}
                            {canEdit && (
                              <ActionBtn icon="fas fa-edit" color={theme.orange} title="Edit" onClick={() => { setEditingRecord(cf); setShowFormModal(true); }} />
                            )}
                            {canDelete && (
                              <ActionBtn icon="fas fa-trash" color={theme.red} title="Delete" onClick={() => handleDeleteRecord(cf.id)} />
                            )}
                            {canTransfer && cf.status !== 'Closed' && <ActionBtn icon="fas fa-share" color={theme.blue} title="Transfer" onClick={() => { setActionRecord(cf); setShowTransferModal(true); }} />}
                            {canClose && cf.status !== 'Closed' && <ActionBtn icon="fas fa-check-circle" color={theme.green} title="Close" onClick={() => { setActionRecord(cf); setShowCloseModal(true); }} />}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* MC NO Link Popup */}
        {mcLinkPopup && (
          <>
            {/* Backdrop to close on outside click */}
            <div
              onClick={() => setMcLinkPopup(null)}
              style={{ position: 'fixed', inset: 0, zIndex: 9990 }}
            />
            <div
              style={{
                position: 'fixed',
                left: Math.min(mcLinkPopup.x, window.innerWidth - 230),
                top: mcLinkPopup.y,
                zIndex: 9991,
                background: '#fff',
                border: `1px solid ${theme.border}`,
                borderRadius: 10,
                boxShadow: '0 8px 32px rgba(0,0,0,.16)',
                minWidth: 220,
                overflow: 'hidden',
              }}
            >
              <div style={{ padding: '10px 14px 6px', borderBottom: `1px solid ${theme.border}` }}>
                <div style={{ fontSize: 11, color: theme.text3, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.6px' }}>Find File No.</div>
                <div style={{ fontSize: 13, fontWeight: 700, color: theme.navy, marginTop: 2 }}>{mcLinkPopup.mcNo}</div>
              </div>
              <button
                onClick={() => handleMcNoNavigate(mcLinkPopup.mcNo, 'mc')}
                style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '11px 14px', background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, color: theme.text, textAlign: 'left', transition: 'background .15s' }}
                onMouseEnter={e => e.currentTarget.style.background = theme.bg}
                onMouseLeave={e => e.currentTarget.style.background = 'none'}
              >
                <i className="fas fa-building" style={{ color: theme.navy, width: 16, textAlign: 'center' }} />
                <div>
                  <div style={{ fontWeight: 600 }}>MC Management</div>
                  <div style={{ fontSize: 11, color: theme.text3, marginTop: 1 }}>OLD / NEW FILE NO</div>
                </div>
              </button>
              <button
                onClick={() => handleMcNoNavigate(mcLinkPopup.mcNo, 'mcom')}
                style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '11px 14px', background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, color: theme.text, textAlign: 'left', transition: 'background .15s', borderTop: `1px solid ${theme.border}` }}
                onMouseEnter={e => e.currentTarget.style.background = theme.bg}
                onMouseLeave={e => e.currentTarget.style.background = 'none'}
              >
                <i className="fas fa-file-alt" style={{ color: theme.blue, width: 16, textAlign: 'center' }} />
                <div>
                  <div style={{ fontWeight: 600 }}>M.Com Management</div>
                  <div style={{ fontSize: 11, color: theme.text3, marginTop: 1 }}>OLD / NEW FILE NO</div>
                </div>
              </button>
            </div>
          </>
        )}

        {/* Modals */}
        <FormModal
          isOpen={showFormModal}
          onClose={() => { setShowFormModal(false); setEditingRecord(null); }}
          onSave={handleSaveRecord}
          initialData={editingRecord}
        />

        <ViewModal
          isOpen={showViewModal}
          onClose={() => setShowViewModal(false)}
          record={selectedRecord}
          onEdit={(rec) => { setEditingRecord(rec); setShowFormModal(true); }}
          onDelete={handleDeleteRecord}
          canViewOnly={canViewOnly}
          canEdit={canEdit}
        />

        <TransferModal
          isOpen={showTransferModal}
          onClose={() => { setShowTransferModal(false); setActionRecord(null); }}
          onSave={handleTransfer}
          record={actionRecord}
          currentUser={currentUser}
        />

        <CloseModal
          isOpen={showCloseModal}
          onClose={() => { setShowCloseModal(false); setActionRecord(null); }}
          onSave={handleCloseCase}
          record={actionRecord}
        />

        {showHistoryModal && selectedHistoryRecord && (
          <HistoryModal
            isOpen={showHistoryModal}
            onClose={() => { setShowHistoryModal(false); setSelectedHistoryRecord(null); }}
            record={selectedHistoryRecord}
            theme={theme}
          />
        )}

        {exportModalOpen && (
          <GenericExportModal
            title="Export Complaints"
            subject="all Complaints"
            exporting={exporting}
            onExport={handleExport}
            onClose={() => setExportModalOpen(false)}
          />
        )}

        {isImporting && (
            <div style={{ position: 'fixed', inset: 0, zIndex: 10000, background: 'rgba(255,255,255,0.8)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                <i className="fas fa-spinner fa-spin" style={{ fontSize: 40, color: theme.navy, marginBottom: 16 }} />
                <div style={{ fontSize: 16, fontWeight: 700, color: theme.text }}>Importing Data...</div>
                <div style={{ fontSize: 13, color: theme.text2, marginTop: 4 }}>Please wait while the records are being processed.</div>
            </div>
        )}

        {/* Toast — MC Management style */}
        {toast && (
          <div style={{ position: 'fixed', bottom: 22, right: 22, zIndex: 9999, background: '#fff', border: `1px solid ${theme.border}`, borderLeft: `4px solid ${toast.type === 'error' ? theme.red : theme.green}`, borderRadius: 10, padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 10, boxShadow: '0 8px 30px rgba(0,0,0,.12)', minWidth: 240 }}>
            <i className={`fas fa-${toast.type === 'error' ? 'times-circle' : 'check-circle'}`} style={{ color: toast.type === 'error' ? theme.red : theme.green, fontSize: 15 }} />
            <span style={{ fontSize: 13, fontWeight: 700 }}>{toast.msg}</span>
          </div>
        )}
      </div>
    </div>
  );
}
