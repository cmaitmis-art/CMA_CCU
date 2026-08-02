const DEFAULT_CHECKLIST_ITEMS = [
  { key: 'cl_reg_condo_plan', type: 'check', label: '01. Registered Condominium Plan No.' },
  { key: 'cl_agm_minutes', type: 'checkpage', label: '04. Minutes of the 1st Annual General Meeting' },
  { key: 'cl_attendance', type: 'checkpage', label: '05. Attendance' },
  { key: 'cl_checked_by', type: 'field', label: 'Checked by' },
  { key: 'cl_checked_date', type: 'field', label: 'Date' },
];

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

export function buildMcViewPrintHtml(record = {}) {
  const sections = [
    ['Identity & Filing', [
      ['Reg Date', record.reg_date],
      ['Old File No', record.old_file_no],
      ['New File No', record.new_file_no],
      ['Management Corporation Name', record.management_corporation_name || record.name],
      ['Address', record.address],
      ['Plan No', record.plan_no],
      ['Declaration No', record.declaration_no],
      ['Email Address', record.email_address],
    ]],
    ['Units', [
      ['Total Units', record.units],
      ['Residential', record.residential ?? record.residential_units],
      ['Non Residential', record.non_residential ?? record.non_residential_units],
      ['Service Units', record.service_units],
    ]],
    ['Classification & Location', [
      ['Category', record.category],
      ['Year', record.year],
      ['Town', record.town],
      ['Municipal Council / Pradeshiya Saba', record.municipal_council_pradeshiya_saba],
      ['Certificate Division File No', record.certificate_division_file_no],
      ['Land Registry Approved Date', record.land_registry_approved_date],
    ]],
    ['Registration Form Details', [
      ['Registration Fee Amount', record.total_amount],
      ['Ownership Type', record.ownership_type],
      ['Govt Income Level', record.government_income_level],
      ['Private Category Override', record.private_category_override],
      ['Fee Rate per Unit', record.fee_rate_per_unit],
      ['SSCL Amount', record.sscl_amount],
      ['VAT Amount', record.vat_amount],
      ['Next Renewal Date', record.next_renewal_date],
    ]],
  ];

  const rowsHtml = sections.map(([title, pairs]) => {
    const tableRows = pairs.map(([label, value]) => `
      <tr>
        <td class="cell-label">${escapeHtml(label)}</td>
        <td class="cell-val">${escapeHtml(value || '—')}</td>
      </tr>`).join('');
    return `
      <section class="section-block">
        <h3>${escapeHtml(title)}</h3>
        <table class="details-table">
          <tbody>
            ${tableRows}
          </tbody>
        </table>
      </section>`;
  }).join('');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>MC Record Details</title>
  <style>
    @page { size: A4; margin: 0 !important; }
    html, body { margin: 0; padding: 0; background: #fff; color: #111; font-family: 'Noto Sans Sinhala', 'Gemunu Libre', 'Iskoola Pota', 'Segoe UI', Arial, sans-serif; }
    body { padding: 12mm; }
    .page { max-width: 210mm; margin: 0 auto; }
    .header { border-bottom: 2px solid #1a3a6b; padding-bottom: 8px; margin-bottom: 14px; }
    .title { font-size: 20px; font-weight: 700; color: #1a3a6b; margin-bottom: 4px; }
    .subtitle { font-size: 12.5px; color: #5a6478; }
    .meta { margin-top: 10px; font-size: 12.5px; color: #1a1a2e; }
    .section-block { margin-top: 14px; page-break-inside: avoid; }
    .section-block h3 { font-size: 13.5px; font-weight: 700; color: #1a3a6b; text-transform: uppercase; letter-spacing: .5px; border-bottom: 1px solid #cbd5e1; padding-bottom: 4px; margin: 0 0 8px; }
    .details-table { width: 100%; border-collapse: collapse; margin-bottom: 14px; border: 1px solid #cbd5e1; }
    .details-table tr { border-bottom: 1px solid #e2e8f0; page-break-inside: avoid; }
    .details-table tr:nth-child(even) { background-color: #f8fafc; }
    .cell-label { width: 36%; padding: 8px 12px; font-size: 11.5px; font-weight: 700; color: #334155; text-transform: uppercase; letter-spacing: .4px; border-right: 1px solid #cbd5e1; vertical-align: top; background: #f1f5f9; }
    .cell-val { width: 64%; padding: 8px 12px; font-size: 13px; color: #0f172a; word-break: break-word; white-space: pre-wrap; vertical-align: top; }
    @media print { body { padding: 0; } .page { max-width: none; } }
  </style>
</head>
<body>
  <div class="page">
    <div class="header">
      <div class="title">MC Record Details</div>
      <div class="subtitle">Customer Care Unit — Management Corporation Verification</div>
      <div class="meta"><strong>${escapeHtml(record.management_corporation_name || record.name || 'Management Corporation')}</strong> &nbsp;•&nbsp; ${escapeHtml(record.new_file_no || record.file_no || '—')}</div>
    </div>
    ${rowsHtml}
  </div>
  <script>window.addEventListener('load', function(){ setTimeout(function(){ window.print(); }, 260); });</script>
</body>
</html>`;
}

export function buildMcChecklistPrintHtml(record = {}, checks = {}, note = '', checklistItems = DEFAULT_CHECKLIST_ITEMS) {
  const rows = checklistItems.map((item) => {
    const { key, type, label } = item;
    if (type === 'check' || type === 'checkpage') {
      const checked = Boolean(checks?.[key]);
      const pageValue = checks?.[`${key}_pg`] || '';
      return `
        <tr class="${checked ? 'checked-row' : ''}">
          <td class="cell-center" style="font-size: 16px;">${checked ? '☑' : '☐'}</td>
          <td class="cell-main">${escapeHtml(label)}</td>
          <td class="cell-center">${type === 'checkpage' ? escapeHtml(pageValue || '—') : '—'}</td>
        </tr>`;
    }

    const value = checks?.[key] || '';
    return `
      <tr>
        <td class="cell-label" colspan="2">${escapeHtml(label)}</td>
        <td class="cell-val">${escapeHtml(value || '—')}</td>
      </tr>`;
  }).join('');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>Document Check List</title>
  <style>
    @page { size: A4; margin: 0 !important; }
    html, body { margin: 0; padding: 0; background: #fff; color: #111; font-family: 'Times New Roman', 'Abhaya Libre', 'Noto Serif Sinhala', 'Iskoola Pota', Times, serif; }
    body { padding: 12mm; }
    .page { max-width: 210mm; margin: 0 auto; }
    .header { border-bottom: 2px solid #1a3a6b; padding-bottom: 8px; margin-bottom: 14px; }
    .title { font-size: 20px; font-weight: 700; color: #1a3a6b; margin-bottom: 4px; font-family: 'Times New Roman', 'Abhaya Libre', 'Noto Serif Sinhala', 'Iskoola Pota', Times, serif; }
    .subtitle { font-size: 12.5px; color: #5a6478; }
    .meta { margin-top: 10px; font-size: 12.5px; color: #1a1a2e; }
    .checklist-table { width: 100%; border-collapse: collapse; margin-top: 10px; margin-bottom: 16px; border: 1px solid #cbd5e1; page-break-inside: avoid; }
    .checklist-table th { background: #1a3a6b; color: #fff; padding: 8px 10px; font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: .5px; border: 1px solid #1a3a6b; text-align: left; }
    .checklist-table td { padding: 8px 10px; font-size: 13px; border: 1px solid #cbd5e1; vertical-align: middle; }
    .checklist-table tr.checked-row { background: #f0fdf4; }
    .cell-center { text-align: center; }
    .cell-main { font-weight: 500; color: #0f172a; }
    .cell-label { font-size: 11.5px; font-weight: 700; color: #334155; text-transform: uppercase; background: #f8fafc; }
    .cell-val { font-size: 13px; color: #0f172a; white-space: pre-wrap; }
    .note { margin-top: 16px; border: 1px solid #cbd5e1; border-radius: 6px; padding: 10px 12px; background: #f8fafc; font-size: 13px; page-break-inside: avoid; }
    @media print { body { padding: 0; } .page { max-width: none; } }
  </style>
</head>
<body>
  <div class="page">
    <div class="header">
      <div class="title">Document Check List</div>
      <div class="subtitle">Customer Care Unit — Management Corporation Verification</div>
      <div class="meta"><strong>${escapeHtml(record.management_corporation_name || record.name || 'Management Corporation')}</strong> &nbsp;•&nbsp; ${escapeHtml(record.new_file_no || record.file_no || '—')}</div>
    </div>
    <table class="checklist-table">
      <thead>
        <tr>
          <th style="width: 55px; text-align: center;">Status</th>
          <th>Verification Item / Document</th>
          <th style="width: 140px; text-align: center;">Page Reference</th>
        </tr>
      </thead>
      <tbody>
        ${rows}
      </tbody>
    </table>
    <div class="note"><strong>Remarks:</strong> ${escapeHtml(note || '—')}</div>
  </div>
  <script>window.addEventListener('load', function(){ setTimeout(function(){ window.print(); }, 260); });</script>
</body>
</html>`;
}
