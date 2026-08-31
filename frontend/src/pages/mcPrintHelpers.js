import { CMA_LOGO_BASE64 } from '../utils/logoBase64.js';
const DEFAULT_CHECKLIST_ITEMS = [
  { key: 'cl_reg_condo_plan', type: 'check', label: '01. Registered Condominium Plan No.' },
  { key: 'cl_agm_minutes', type: 'checkpage', label: '04. Minutes of the 1st Annual General Meeting' },
  { key: 'cl_attendance', type: 'checkpage', label: '05. Attendance' },
  { key: 'cl_checked_by', type: 'field', label: 'Checked by' },
  { key: 'cl_checked_date', type: 'field', label: 'Date' },
];

export function escapeHtml(value) {
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

export function buildMcChecklistPrintHtml(record = {}, checks = {}, note = '') {
  const safe = (val) => escapeHtml(val || '');
  const Box = () => '<span class="of-box"></span>';
  
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>Document Check List for Management Corporation</title>
  <style>
    body { font-family: 'Times New Roman', serif; margin: 0; padding: 0; background: #fff; }
    @media print { body { margin: 0; padding: 0; } }
    .official-form-print { max-width: 750px; margin: 0 auto; padding: 15px 20px; font-family: 'Times New Roman', serif; color: #111; background: #fff; box-sizing: border-box; }
    .official-form-print .of-logo { text-align: center; margin-bottom: 4px; }
    .official-form-print .of-logo img { width: 60px; height: auto; }
    .official-form-print .of-title { text-align: center; font-size: 15.5px; font-weight: 700; letter-spacing: .3px; }
    .official-form-print .of-subtitle { text-align: center; font-size: 14px; font-weight: 700; margin: 4px 0 16px; text-transform: uppercase; }
    .official-form-print .of-row { display: flex; align-items: baseline; flex-wrap: wrap; gap: 6px; font-size: 13.5px; margin: 5px 0; }
    .official-form-print .of-num { white-space: nowrap; font-weight: 600; }
    .official-form-print .of-fill { flex: 1; min-width: 60px; border-bottom: 1px dotted #444; min-height: 15px; padding-left: 4px; }
    .official-form-print .of-box { display: inline-flex; align-items: center; justify-content: center; width: 14px; height: 14px; border: 1.5px solid #111; font-size: 12px; font-weight: 700; margin: 0 4px; flex-shrink: 0; vertical-align: middle; }
    .official-form-print .of-section-title { font-weight: 700; font-size: 13.5px; margin: 10px 0 4px; text-transform: uppercase; }
    
    table.chk-table { width: 100%; border-collapse: collapse; font-size: 13.5px; margin-top: 6px; }
    table.chk-table th, table.chk-table td { border: 1px solid #111; padding: 4px 6px; vertical-align: middle; }
    table.chk-table td:nth-child(2) { width: 30px; text-align: center; }
    table.chk-table td:nth-child(3) { width: 50px; text-align: left; }
    
    .grid-units { display: grid; grid-template-columns: 1fr 1fr; gap: 4px 20px; padding-left: 15px; font-size: 13.5px; margin-top: 5px; margin-bottom: 15px;}
    .grid-unit-row { display: flex; align-items: center; justify-content: space-between; }
    
    .official-form-print .of-sign { display: flex; justify-content: space-between; margin-top: 40px; font-size: 13.5px; page-break-inside: avoid; }
    .official-form-print .of-sign div { border-top: 1px solid #111; padding-top: 4px; width: 40%; text-align: center; }

    @media print {
      @page { size: A4 portrait; margin: 0; }
      .official-form-print { 
        max-width: 100%;
        width: 100%;
        padding: 12mm 15mm; 
        display: block;
      }
    }
  </style>
</head>
<body>
  <div class="official-form-print">
    <div class="of-logo"><img src="${CMA_LOGO_BASE64}" alt="CMA Logo" /></div>
    <div class="of-title">CUSTOMER CARE UNIT</div>
    <div class="of-subtitle" style="margin-bottom: 6px;">DOCUMENT CHECK LIST FOR MANAGEMENT CORPORATION</div>
    
    <div class="of-row">
      <span class="of-num">01. Registered Condominium Plan No :</span>
      <span class="of-fill">${safe(record.plan_no)}</span>
    </div>
    
    <div class="of-row" style="justify-content: space-between; margin-bottom: 0;">
      <span class="of-num">02. Number of Parcels in the Condominium,</span>
      <span style="display: flex; align-items: center; gap: 4px;">Total ${Box()}</span>
    </div>
    
    <div class="grid-units">
      <div class="grid-unit-row"><span>Residential</span> ${Box()}</div>
      <div></div>
      <div class="grid-unit-row"><span>Non Residential - Office</span> ${Box()}</div>
      <div class="grid-unit-row"><span>Shops</span> ${Box()}</div>
      <div class="grid-unit-row"><span>Hotels</span> ${Box()}</div>
      <div class="grid-unit-row"><span>Service Units</span> ${Box()}</div>
    </div>

    <table class="chk-table" style="margin-bottom: 12px;">
      <tr>
        <td>03. Services / Facilites (Attached details)</td>
        <td>${Box()}</td>
        <td>pg-</td>
      </tr>
      <tr>
        <td>04. Written assurance from Secretary that C.M.A. requirements will be fulfilled (Attached)</td>
        <td>${Box()}</td>
        <td>pg-</td>
      </tr>
    </table>

    <div class="of-section-title">PHOTOCOPY OF,</div>
    
    <table class="chk-table">
      <tr>
        <td>01. Registered Condominium Plan issued by the Registered General &nbsp; Date -</td>
        <td>${Box()}</td>
        <td>pg-</td>
      </tr>
      <tr>
        <td>02. CMA Certificate No. &nbsp; Date -</td>
        <td>${Box()}</td>
        <td>pg-</td>
      </tr>
      <tr>
        <td>03. Declaration No. 220 &nbsp; Date -</td>
        <td>${Box()}</td>
        <td>pg-</td>
      </tr>
      <tr>
        <td>04. Minutes of the 1st Annual General Meeting &nbsp; Date: -</td>
        <td>${Box()}</td>
        <td>pg-</td>
      </tr>
      <tr>
        <td>05. Attendance &nbsp;&nbsp;&nbsp;&nbsp; Total ${Box()} &nbsp; Physically ${Box()} &nbsp; Proxy ${Box()}</td>
        <td>${Box()}</td>
        <td>pg-</td>
      </tr>
      <tr>
        <td>06. Insurance Policy &nbsp; Valid Year From &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; to</td>
        <td>${Box()}</td>
        <td>pg-</td>
      </tr>
      <tr>
        <td>07. Update List of names of Registered Owners & Address with their sign.</td>
        <td>${Box()}</td>
        <td>pg-</td>
      </tr>
      <tr>
        <td>08. Constitution</td>
        <td>${Box()}</td>
        <td>pg-</td>
      </tr>
      <tr>
        <td>09. By Laws</td>
        <td>${Box()}</td>
        <td>pg-</td>
      </tr>
      <tr>
        <td>10. Additional by Laws (Housing Rules / Code of Conduct / Rules & Regulations)</td>
        <td>${Box()}</td>
        <td>pg-</td>
      </tr>
    </table>

    <div class="of-sign">
      <div>Checked by</div>
      <div>Date</div>
    </div>

  </div>
  <script>window.addEventListener('load', function(){ setTimeout(function(){ window.print(); }, 260); });</script>
</body>
</html>`;
}
