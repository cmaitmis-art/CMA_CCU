import React from 'react';
import ReactDOMServer from 'react-dom/server';
import { escapeHtml } from './mcPrintHelpers.js';
import { CMA_LOGO_BASE64 } from '../utils/logoBase64.js';
import { LETTERHEAD_BASE64 } from '../utils/letterHeadBase64.js';
import { getServerDate } from '../utils/serverTime.js';
import { formatOrdinalDate, getTodayDotDate } from '../components/mc-management/MCManagementShared.jsx';

const SSCL_RATE = 0.025;
const VAT_RATE = 0.18;

const formatDisplayDate = (d) => d ? new Date(d).toLocaleDateString('en-GB') : '-';
const formatDotDate = (d) => d ? new Date(d).toLocaleDateString('en-GB').replace(/\//g, '.') : '-';
const computePeriodMonths = (s, e) => { if (!s || !e) return 0; const m = (new Date(e).getFullYear() - new Date(s).getFullYear()) * 12 + (new Date(e).getMonth() - new Date(s).getMonth()) + 1; return m > 0 ? m : 0; };
const loadRlOverrides = () => null;
export function buildRenewalCoveringLetterHtml(invoice) {
  const fmt = (n) => (n != null ? Number(n).toLocaleString('en-LK', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '-');
  const year = invoice.period_end ? new Date(invoice.period_end).getFullYear() : getServerDate().getFullYear();
  const fileNo = escapeHtml(invoice.file_no || invoice.invoice_number || '');
  const addressLines = String(invoice.address || '')
    .split(/\r?\n|,/)
    .map((l) => l.trim())
    .filter(Boolean);

  // Multi-year support: if invoice._multiYearRows is set, use it (even single year)
  // so pre-2023 flat/bracket fee is always applied correctly.
  const multiRows = invoice._multiYearRows || null;
  const isMultiYear = Array.isArray(multiRows) && multiRows.length > 1;

  // Calculate totals across all rows
  const calcRows = (Array.isArray(multiRows) && multiRows.length > 0) ? multiRows : [{
    year, units: invoice.units, rate: invoice.fee_rate_per_unit,
    fee: invoice.fee_amount, sscl: invoice.sscl_amount,
    vat: invoice.vat_amount, total: invoice.total_amount,
  }];

  const firstYear = calcRows[0]?.year || year;
  const lastYear = calcRows[calcRows.length - 1]?.year || year;
  const prevYear = firstYear - 1;
  const grandFee = calcRows.reduce((s, r) => s + (r.fee || 0), 0);
  const grandSscl = calcRows.reduce((s, r) => s + (r.sscl || 0), 0);
  const grandVat = calcRows.reduce((s, r) => s + (r.vat || 0), 0);
  const grandTotal = calcRows.reduce((s, r) => s + (r.total || 0), 0);
  const yearRangeLabel = firstYear === lastYear ? String(lastYear) : `${firstYear} - ${lastYear}`;
  const periodLabel = firstYear === lastYear
    ? `(01/01/${lastYear} - 31/12/${lastYear})`
    : `(01/01/${firstYear} - 31/12/${lastYear})`;
  // Single-year fallback tableRows
  const tableRows = `<tr>
      <td>${year}</td><td>${invoice.units ?? '-'}</td>
      <td>${invoice.fee_rate_per_unit != null ? fmt(invoice.fee_rate_per_unit) : '-'}</td>
      <td>${fmt(invoice.fee_amount)}</td><td>${fmt(invoice.sscl_amount)}</td><td>${fmt(invoice.vat_amount)}</td><td>${fmt(invoice.total_amount)}</td>
    </tr>`;

  const parseToFloat = (val) => {
    if (val == null) return 0;
    const clean = String(val).replace(/,/g, '').replace(/Rs\.?/gi, '').replace(/\/-|=/g, '').trim();
    const parsed = parseFloat(clean);
    return isNaN(parsed) ? 0 : parsed;
  };

  // Collapse consecutive rows with same rate into groups for display
  function groupRows(rows) {
    const groups = [];
    let cur = null;
    for (const r of rows) {
      if (cur && cur.rate === r.rate && cur.units === r.units && cur.isPerUnit === r.isPerUnit) {
        cur.endYear = r.year;
        cur.fee += r.fee; cur.sscl += r.sscl; cur.vat += r.vat; cur.total += r.total;
        cur.count++;
      } else {
        cur = { ...r, startYear: r.year, endYear: r.year, count: 1 };
        groups.push(cur);
      }
    }
    return groups;
  }

  const preRows = calcRows.filter(r => r.isPerUnit === false || (r.isPerUnit === undefined && r.year < 2023));
  const postRows = calcRows.filter(r => r.isPerUnit === true || (r.isPerUnit === undefined && r.year >= 2023));

  const fallbackTableRows = [
    ...groupRows(preRows).map(g => ({
      isPre: true,
      yearLabel: g.startYear === g.endYear ? String(g.startYear) : `${g.startYear}-${g.endYear}`,
      rateLabel: fmt(g.rate), // The flat fee amount per year
      fee: g.fee,
      sscl: g.sscl,
      vat: g.vat,
      total: g.total
    })),
    ...groupRows(postRows).map(g => ({
      isPre: false,
      yearLabel: g.startYear === g.endYear ? String(g.startYear) : `${g.startYear}-${g.endYear}`,
      units: g.units,
      rate: g.rate,
      fee: g.fee,
      sscl: g.sscl,
      vat: g.vat,
      total: g.total
    }))
  ];

  const rl = invoice._rlOverrides || {};
  const displayRows = (rl.tableRows && rl.tableRows.length) ? rl.tableRows : fallbackTableRows;

  const preDisplayRows = displayRows.filter(r => r.isPre);
  const postDisplayRows = displayRows.filter(r => !r.isPre);

  const hasPreRows = preDisplayRows.length > 0;
  const hasPostRows = postDisplayRows.length > 0;

  const preFee = preDisplayRows.reduce((s, r) => s + parseToFloat(r.fee), 0);
  const preSscl = preDisplayRows.reduce((s, r) => s + parseToFloat(r.sscl), 0);
  const preVat = preDisplayRows.reduce((s, r) => s + parseToFloat(r.vat), 0);
  const preTotal = preDisplayRows.reduce((s, r) => s + parseToFloat(r.total), 0);

  const postFee = postDisplayRows.reduce((s, r) => s + parseToFloat(r.fee), 0);
  const postSscl = postDisplayRows.reduce((s, r) => s + parseToFloat(r.sscl), 0);
  const postVat = postDisplayRows.reduce((s, r) => s + parseToFloat(r.vat), 0);
  const postTotal = postDisplayRows.reduce((s, r) => s + parseToFloat(r.total), 0);

  const preTableHeader = `<thead>
      <tr><th>Year</th><th>Renewal Registration fee</th><th>Amount<br/>Rs: Cts:</th><th>SSCL<br/>(${SSCL_RATE * 100}%)</th><th>VAT<br/>${VAT_RATE * 100}%</th><th>Total<br/>Rs: Cts:</th></tr>
    </thead>`;

  const postTableHeader = `<thead>
      <tr><th rowspan="2">Year</th><th colspan="3">Renewal fee</th><th rowspan="2">SSCL<br/>(${SSCL_RATE * 100}%)</th><th rowspan="2">VAT<br/>${VAT_RATE * 100}%</th><th rowspan="2">Total<br/>Rs: Cts:</th></tr>
      <tr><th>No of Units</th><th>Unit Rate<br/>Rs: Cts:</th><th>Amount<br/>Rs: Cts:</th></tr>
    </thead>`;

  const preTable = hasPreRows ? `
      <div class="ol-yearline">Period ${preDisplayRows[0].yearLabel}${preDisplayRows[preDisplayRows.length - 1].yearLabel !== preDisplayRows[0].yearLabel ? ` - ${preDisplayRows[preDisplayRows.length - 1].yearLabel}` : ''}</div>
      <table class="ol-table">
        ${preTableHeader}
        <tbody>
          ${preDisplayRows.map(g => `<tr>
            <td>${g.yearLabel}</td>
            <td>${g.rateLabel}</td>
            <td>${fmt(g.fee)}</td>
            <td>${fmt(g.sscl)}</td>
            <td>${fmt(g.vat)}</td>
            <td>${fmt(g.total)}</td>
          </tr>`).join('')}
          <tr class="ol-total-row"><td colspan="2">Total</td><td>${fmt(preFee)}</td><td>${fmt(preSscl)}</td><td>${fmt(preVat)}</td><td>${fmt(preTotal)}</td></tr>
        </tbody>
      </table>` : '';

  const transitionNote = hasPreRows && hasPostRows
    ? `<p class="ol-para">We wish to inform you that charges have been revised and are applicable per unit basis from 01.03.2023 as follows.</p>`
    : '';

  const postTableHtml = hasPostRows ? `
      <div class="ol-yearline">Period ${postDisplayRows[0].yearLabel}${postDisplayRows[postDisplayRows.length - 1].yearLabel !== postDisplayRows[0].yearLabel ? ` - ${postDisplayRows[postDisplayRows.length - 1].yearLabel}` : ''}</div>
      <table class="ol-table">
        ${postTableHeader}
        <tbody>
          ${postDisplayRows.map(g => `<tr>
            <td>${g.yearLabel}</td>
            <td>${g.units}</td>
            <td>${fmt(g.rate)}</td>
            <td>${fmt(g.fee)}</td>
            <td>${fmt(g.sscl)}</td>
            <td>${fmt(g.vat)}</td>
            <td>${fmt(g.total)}</td>
          </tr>`).join('')}
          <tr class="ol-total-row"><td colspan="3">Total</td><td>${fmt(postFee)}</td><td>${fmt(postSscl)}</td><td>${fmt(postVat)}</td><td>${fmt(postTotal)}</td></tr>
        </tbody>
      </table>` : '';

  const refDisplay = rl.refNo || fileNo;
  const dateDisplay = rl.date ? formatDotDate(rl.date) : getTodayDotDate();
  const rawSignName = rl.signName || 'Samantha Ampagala';
  const signName = (rawSignName === 'Samantha Ampaala') ? 'Samantha Ampagala' : rawSignName;
  const signTitle1 = rl.signTitle1 || 'Assistant General Manager (Customer Care)';
  const signTitle2 = rl.signTitle2 || 'Condominium Management Authority';
  const bodyParagraph1 = rl.bodyParagraph1 || `The Registration of your Management Corporation has been expired on 31.12.${prevYear}. Therefore, please make arrangements to renew the registration of your Management Corporation up to 31.12.${lastYear}.`;
  const bodyParagraph2 = rl.bodyParagraph2 || `Every management corporation is required to pay the registration fees for the year before 31<sup>st</sup> March ${lastYear}. But since you have failed to pay the said fees so far, I hereby request you to take necessary steps to pay some of <strong>Rs. ${fmt(grandTotal)}</strong> as soon as possible with duly prepared application form (annex-01).`;

  return `
      <div class="official-letter">
        <div class="ol-ref"><span contenteditable="true">${escapeHtml(refDisplay)}</span><span contenteditable="true">${dateDisplay}</span></div>
        <div class="ol-addr" contenteditable="true">
          <div>The Secretary,</div>
          ${(() => {
      const n = invoice.management_corporation_name || invoice.name || '-';
      let firstPart = n;
      let secondPart = '';
      if (n.includes(' - ')) {
        const idx = n.indexOf(' - ');
        firstPart = n.substring(0, idx).trim();
        secondPart = n.substring(idx + 3).trim();
      }
      
      const planNo = String(invoice.plan_no || invoice.condominium_plan_no || '').trim();
      let html = '';
      
      const firstPartLower = firstPart.toLowerCase();
      const isRedundant = (firstPartLower.includes('management corporation') || firstPartLower.includes('management committee')) && 
                          (planNo === '' || firstPartLower.includes(planNo.toLowerCase()));
      
      if (!isRedundant) {
         html += `<div>The Management Corporation C.P.No.${escapeHtml(planNo)},</div>\n          `;
      }
      
      html += `<div>${escapeHtml(firstPart)}</div>`;
      if (secondPart) {
         html += `\n          <div>${escapeHtml(secondPart)}</div>`;
      }
      
      return html;
    })()}
          ${addressLines.map((line) => `<div>${escapeHtml(line)}</div>`).join('')}
        </div>
        <div class="ol-title" contenteditable="true">RENEWAL REGISTRATION OF THE MANAGEMENT CORPORATION FOR YEAR<br/>${periodLabel}</div>
        <p class="ol-para" contenteditable="true">${bodyParagraph1}</p>
        ${preTable}
        ${transitionNote}
        ${postTableHtml}
        <p class="ol-para" contenteditable="true">${bodyParagraph2}</p>
        <p class="ol-para" contenteditable="true">Payment with regard to the above can be paid by cash or cheque in favor of &quot;<strong>Condominium Management Authority</strong>&quot;</p>
        <div class="ol-footer" style="page-break-inside: avoid;">
          <p class="ol-para" contenteditable="true">Thank You.</p>
          <p class="ol-para" contenteditable="true">Yours Faithfully,</p>
          <div class="ol-sign" contenteditable="true">
            <div class="ol-sign-space"></div>
            <div><strong>${escapeHtml(signName)}</strong></div>
            <div><strong>${escapeHtml(signTitle1)}</strong></div>
            <div><strong>${escapeHtml(signTitle2)}</strong></div>
          </div>
        </div>
      </div>`;
}

export function buildRenewalReceiptHtml(invoice) {
  const periodStart = formatDisplayDate(invoice.period_start);
  const periodEnd = formatDisplayDate(invoice.period_end);
  const monthsCharged = computePeriodMonths(invoice.period_start, invoice.period_end);
  const units = invoice.units ?? invoice.residential ?? invoice.residential_units ?? '';
  const fileNo = escapeHtml(invoice.file_no || invoice.new_file_no || invoice.old_file_no || '-');
  const feeRate = invoice.fee_rate_per_unit != null ? Number(invoice.fee_rate_per_unit).toLocaleString('en-LK', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '-';
  const fmt = (n) => (n != null ? Number(n).toLocaleString('en-LK', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '-');
  const addr = [invoice.management_corporation_name, invoice.plan_no, invoice.address].filter(Boolean).map(escapeHtml).join(' | ') || '-';
  return `
      <div class="print-receipt">
        <div class="rc-topline"><span class="rc-regno">No. ${fileNo}</span></div>
        <div class="rc-head">
          <div class="rc-logo"><img src="${CMA_LOGO_BASE64}" alt="CMA Logo" /></div>
          <div class="rc-title">CONDOMINIUM MANAGEMENT AUTHORITY</div>
          <div class="rc-sub">Customer Care Division / Legal Division</div>
        </div>
        <div class="rc-row"><span class="rc-fill-label">DGM Finance / Shroff</span><span class="rc-fill-line"></span></div>
        <div class="rc-checkline">
          <span>Registration of Management Corporation</span><span class="rc-box"></span>
          <span>/ Renewal</span><span class="rc-box">&#10003;</span>
          <span>/ Application Fee</span><span class="rc-box"></span>
          <span>/ Photocopy Charges</span><span class="rc-box"></span>
          <span>/ Others</span><span class="rc-box"></span>
        </div>
        <table>
          <tbody>
            <tr><td class="rc-label">File No</td><td>${fileNo}</td></tr>
            <tr><td class="rc-label">Name of the MC &amp; Address</td><td>${addr}</td></tr>
            <tr><td class="rc-label">Period</td><td>${periodStart} to ${periodEnd}</td></tr>
            <tr><td class="rc-label">Category</td><td>${escapeHtml(invoice.category || '-')}</td></tr>
            <tr><td class="rc-label">Number of Parcels (Units)</td><td>${units}</td></tr>
            <tr><td class="rc-label">Period (months charged)</td><td>${monthsCharged}</td></tr>
            <tr><td class="rc-label">Fee Rs. (Rate ${feeRate} / 12 &times; ${monthsCharged || '-'} months &times; ${units || '-'} units)</td><td>${fmt(invoice.fee_amount)}</td></tr>
            <tr><td class="rc-label">Other Tax - SSCL (${SSCL_RATE * 100}%)</td><td>${fmt(invoice.sscl_amount)}</td></tr>
            <tr><td class="rc-label">VAT (${VAT_RATE * 100}%)</td><td>${fmt(invoice.vat_amount)}</td></tr>
            <tr class="rc-total"><td>Total Amount Rs.</td><td>${fmt(invoice.total_amount)}</td></tr>
          </tbody>
        </table>
        <div class="rc-row" style="margin-top:14px"><span>Please accept Rs. ____________________ (Cash / Cheque) Cheque No. ____________________</span></div>
        <div class="rc-row"><span>Cheque Date ____________________ Branch ____________________ from the above MC.</span></div>
        <div class="rc-sign"><div>Authorized Signature</div><div>Date</div></div>
      </div>`;
}

function buildAcknowledgementLetterHtml(mc, emailSentDate = null) {
  if (!mc) return '';
  const formatDotDate = (d) => {
    if (!d) return '';
    const date = new Date(d);
    return isNaN(date.getTime()) ? d : `${String(date.getDate()).padStart(2, '0')}.${String(date.getMonth() + 1).padStart(2, '0')}.${date.getFullYear()}`;
  };
  const fmt = (n) => (n != null ? Number(n).toLocaleString('en-LK', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '-');
  
  let yearsArr = [];
  if (mc.renewal_paid_years) {
    yearsArr = String(mc.renewal_paid_years).split(',').map(y => parseInt(y.trim(), 10)).filter(y => !isNaN(y));
  } else if (mc.renewal_paid_year) {
    yearsArr = [parseInt(mc.renewal_paid_year, 10)];
  } else if (mc.renewal_period) {
    yearsArr = [parseInt(mc.renewal_period, 10)];
  } else {
    yearsArr = [getServerDate().getFullYear()];
  }
  if (yearsArr.length === 0) yearsArr = [getServerDate().getFullYear()];
  
  const minYear = Math.min(...yearsArr);
  const maxYear = Math.max(...yearsArr);

  const amount = mc.renewal_paid_amount != null ? fmt(mc.renewal_paid_amount) : '-';
  const rawFileNo = mc.new_file_no || mc.file_no || mc.old_file_no || '';
  const fileNo = String(rawFileNo).startsWith('CMA/') ? rawFileNo : `CMA/CCU/12/MC/${rawFileNo}`;
  const addressLines = String(mc.address || '').split(/\r?\n|,/).map((l) => l.trim()).filter(Boolean);

  return `
      <div class="ack-letter" id="ack-letter-content">
        <div class="ack-ref" style="overflow: hidden; margin-bottom: 25px;">
          <span contenteditable="true" style="float: left;">${escapeHtml(fileNo)}</span>
          <span contenteditable="true" style="float: right;">${mc.acknowledgement_date ? formatDotDate(mc.acknowledgement_date) : getTodayDotDate()}</span>
        </div>
        
        <div class="ack-addr" contenteditable="true">
          <div>The Secretary,</div>
          ${(() => {
      const n = mc.management_corporation_name || mc.name || '-';
      if (n.includes(' - ')) {
        const idx = n.indexOf(' - ');
        return `<div>${escapeHtml(n.substring(0, idx))}</div>\n          <div>${escapeHtml(n.substring(idx + 3))}</div>`;
      }
      return `<div>${escapeHtml(n)}</div>`;
    })()}
          ${addressLines.map((line) => `<div>${escapeHtml(line)}</div>`).join('')}
        </div>
        
        <p class="ack-para" contenteditable="true">Dear Sir/Madam,</p>

        <div class="ack-title" contenteditable="true" style="font-weight: bold; text-decoration: underline;">
          RENEWAL OF REGISTRATION OF THE MANAGEMENT CORPORATION<br/>
          (01 January ${minYear} – 31 December ${maxYear})
        </div>
        
        <p class="ack-para" contenteditable="true">We acknowledge with thanks the receipt of the Management Corporation Registration Renewal Fee amounting to Rs. ${amount}, which was received on <span style="white-space: nowrap;">${formatOrdinalDate(mc.renewal_paid_date)}</span>.</p>
        
        <p class="ack-para" contenteditable="true">Accordingly, the registration of the Management Corporation has been renewed and is valid until 31<sup>st</sup>&nbsp;December&nbsp;${maxYear}. Please note that the registration shall be renewed annually.</p>
        ${emailSentDate ? `<p class="ack-para" contenteditable="true"><i>(Sent via email on ${formatDotDate(emailSentDate)})</i></p>` : ''}
        
        <p class="ack-para" contenteditable="true">Thank you.</p>
        <p class="ack-para" contenteditable="true">Yours faithfully,</p>
        
        <div class="ack-sign" contenteditable="true">
          <div>Samantha Ampagala</div>
          <div><strong>Assistant General Manager (Customer Care)</strong></div>
          <div><strong>Condominium Management Authority</strong></div>
        </div>
      </div>`;
}

export function buildStandaloneAcknowledgementPrintHtml(mc, emailSentDate = null) {
  if (!mc) return '';
  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8" />
<title>Acknowledgement Letter - ${escapeHtml(mc.acknowledgement_no || '')}</title>
<style>
  @page { size: A4; margin: 0; }
  * { box-sizing: border-box; }
  body { margin: 0; padding: 0; font-family: 'Times New Roman', serif; color: #111; background: #fff; }
  
  .doc-page { padding: 0; margin: 0; min-height: 100vh; }
  /* - Acknowledgement Letter - */
  .ack-letter { width: 100%; max-width: 210mm; margin: 0; padding-top: 2.7in; padding-left: 1.2in; padding-right: 0.8in; padding-bottom: 20mm; box-sizing: border-box; font-family: 'Times New Roman', serif; font-size: 16px; line-height: 1.6; }
  .ack-letter .ack-ref { display: flex; justify-content: space-between; margin-bottom: 25px; }
  .ack-letter .ack-addr { margin-bottom: 25px; }
  .ack-letter .ack-addr div { margin: 3px 0; }
  .ack-letter .ack-title { font-weight: 700; text-decoration: underline; margin: 25px 0; line-height: 1.4; }
  .ack-letter .ack-para { margin: 20px 0; text-align: justify; }
  .ack-letter .ack-thanks { margin-top: 25px; margin-bottom: 50px; line-height: 1.6; }
  .ack-letter .ack-sign { margin-top: 40px; page-break-inside: avoid; break-inside: avoid; }
  .ack-letter .ack-sign div { margin: 2px 0; }
</style>
</head>
<body>
  <div class="doc-page">
    ${buildAcknowledgementLetterHtml(mc, emailSentDate)}
  </div>
  <script>
    window.addEventListener('load', function() {
      setTimeout(function() {
        window.focus();
        window.print();
      }, 400);
    });
  </script>
</body>
</html>`;
}

export function buildRenewalPrintDocumentHtml(invoice, includeReceipt = true) {
  const letterHtml = buildRenewalCoveringLetterHtml(invoice);
  const receiptHtml = includeReceipt ? buildRenewalReceiptHtml(invoice) : '';

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8" />
<title>Renewal Document - ${escapeHtml(invoice.invoice_number || '')}</title>
<style>
  @page { size: A4; margin: 0; }
  * { box-sizing: border-box; }
  body { margin: 0; padding: 0; font-family: 'Times New Roman', serif; color: #111; background: #fff; }

  /* - Edit Toolbar - */
  .edit-toolbar {
    position: fixed; top: 0; left: 0; right: 0; z-index: 9999;
    background: linear-gradient(135deg, #1a1f2e 0%, #2d3550 100%);
    border-bottom: 2px solid #4f6ef7;
    box-shadow: 0 2px 12px rgba(0,0,0,0.35);
    padding: 10px 18px;
    display: flex; align-items: center; justify-content: space-between; gap: 12px;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  }
  .edit-toolbar .et-hint {
    color: #a0b0d0; font-size: 13px; display: flex; align-items: center; gap: 7px;
  }
  .edit-toolbar .et-hint svg { opacity: 0.75; flex-shrink: 0; }
  .edit-toolbar .et-btns { display: flex; gap: 8px; }
  .edit-toolbar .et-btn {
    cursor: pointer; border: none; border-radius: 6px; font-size: 13px;
    font-weight: 600; padding: 7px 16px; display: flex; align-items: center; gap: 6px;
    transition: opacity 0.15s, transform 0.1s;
  }
  .edit-toolbar .et-btn:hover { opacity: 0.85; transform: translateY(-1px); }
  .edit-toolbar .et-btn:active { transform: translateY(0); }
  .edit-toolbar .et-btn-print { background: #4f6ef7; color: #fff; }
  .edit-toolbar .et-btn-close { background: rgba(255,255,255,0.12); color: #cdd8f0; }

  /* editable focus ring */
  [contenteditable]:focus { outline: 2px dashed #4f6ef7; outline-offset: 2px; border-radius: 2px; }
  [contenteditable]:hover:not(:focus) { background: rgba(79,110,247,0.06); border-radius: 2px; }

  @media print {
    @page { size: A4; margin: 0 !important; }
    .edit-toolbar { display: none !important; }
    body { margin: 0; padding: 0; }
    [contenteditable] { outline: none !important; background: transparent !important; }
    .doc-page { 
      page-break-after: always; 
      break-after: page; 
      display: block; 
      padding-bottom: 0 !important;
      margin: 0 !important;
    }
    .doc-page.letter-page {
      margin: 0 !important;
      margin-top: 0 !important;
      padding-top: 2.7in !important;
      padding-left: 1.2in !important;
      padding-right: 0.8in !important;
      padding-bottom: 0 !important;
      box-sizing: border-box !important;
    }
    .doc-page.doc-page-receipt {
      margin-top: 0 !important;
      padding-top: 15mm !important;
      padding-left: 1.2in !important;
      padding-right: 0.8in !important;
      box-sizing: border-box !important;
    }
    .doc-page:last-child {
      page-break-after: auto;
      break-after: auto;
    }
    .official-letter { 
      font-size: 15px; 
      line-height: 1.38; 
      padding: 0 !important;
      margin: 0 !important;
      width: 100% !important;
      max-width: 100% !important;
      color: #000;
    }
    .official-letter .ol-ref { 
      display: flex; 
      justify-content: space-between; 
      font-weight: normal !important; 
      margin-bottom: 14px; 
    }
    .official-letter .ol-addr { margin-bottom: 14px; }
    .official-letter .ol-addr div { margin: 1.5px 0; }
    .official-letter .ol-title { margin: 12px 0 10px; font-size: 15px; font-weight: 700; text-decoration: underline; text-align: left; }
    .official-letter .ol-para { margin: 8px 0; font-size: 15px; line-height: 1.38; text-align: justify; }
    .official-letter .ol-yearline { font-weight: 700; margin: 6px 0 3px; font-size: 14px; }
    .official-letter table.ol-table { font-size: 12.5px; margin: 4px 0 10px; width: 100%; border-collapse: collapse; }
    .official-letter table.ol-table th, .official-letter table.ol-table td { padding: 4.5px 6px; border: 1px solid #000; text-align: center; vertical-align: middle; }
    .official-letter table.ol-table th { font-weight: 700; background: #fff; }
    .official-letter table.ol-table td:first-child { text-align: left; font-weight: 600; }
    .official-letter table.ol-table .ol-total-row td { font-weight: 700; background: #f9f9f9; }
    .official-letter table.ol-table .ol-total-row td:first-child { text-align: center; }
    .official-letter .ol-sign { margin-top: 15px; font-size: 15px; page-break-inside: avoid; }
    .official-letter .ol-sign div { margin: 1px 0; }
    .official-letter .ol-sign-space { height: 35px; }

    /* Graceful compact fallback if needed */
    .official-letter.compact-letter {
      font-size: 14px !important;
      line-height: 1.28 !important;
    }
    .official-letter.compact-letter .ol-ref { margin-bottom: 8px !important; }
    .official-letter.compact-letter .ol-addr { margin-bottom: 8px !important; }
    .official-letter.compact-letter .ol-addr div { margin: 1px 0 !important; }
    .official-letter.compact-letter .ol-title { margin: 8px 0 !important; font-size: 14px !important; }
    .official-letter.compact-letter .ol-yearline { margin: 4px 0 2px !important; font-size: 13px !important; }
    .official-letter.compact-letter .ol-para { margin: 5px 0 !important; font-size: 14px !important; line-height: 1.28 !important; }
    .official-letter.compact-letter table.ol-table { font-size: 11.5px !important; margin: 2px 0 6px !important; }
    .official-letter.compact-letter table.ol-table th,
    .official-letter.compact-letter table.ol-table td { padding: 2.5px 4px !important; }
    .official-letter.compact-letter .ol-sign { margin-top: 10px !important; font-size: 14px !important; }
    .official-letter.compact-letter .ol-sign-space { height: 20px !important; }
  }

.doc-page { 
    padding: 15mm; 
    position: relative;
    page-break-after: always; 
    break-after: page; 
  }
  .doc-page.letter-page {
    padding-top: 2.7in;
    padding-left: 1.2in;
    padding-right: 0.8in;
    margin: 0 auto;
    box-sizing: border-box;
  }
  .doc-page:last-child {
    page-break-after: auto;
    break-after: auto;
  }
  .doc-page.doc-page-receipt { padding-top: 15mm; padding-left: 1.2in; padding-right: 0.8in; padding-bottom: 15mm; margin-top: 0; box-sizing: border-box; }
  /* - Covering Letter - */
  .official-letter { max-width: 100%; margin: 0 auto; padding: 0; font-family: 'Times New Roman', serif; font-size: 15px; line-height: 1.38; color: #111; }
  .official-letter .ol-ref { display: flex; justify-content: space-between; font-weight: normal; margin-bottom: 14px; }
  .official-letter .ol-addr { margin-bottom: 14px; }
  .official-letter .ol-addr div { margin: 1.5px 0; }
  .official-letter .ol-title { text-align: left; font-weight: 700; text-decoration: underline; margin: 12px 0 10px; }
  .official-letter .ol-yearline { font-weight: 700; margin: 6px 0 3px; font-size: 14px; }
  .official-letter .ol-section { font-weight: 700; margin: 10px 0 2px; font-size: 13px; text-indent: 0; }
  .official-letter .ol-para { margin: 8px 0; text-align: justify; }
  .official-letter table.ol-table { width: 100%; border-collapse: collapse; margin: 4px 0 10px; font-size: 12.5px; }
  .official-letter table.ol-table th, .official-letter table.ol-table td { border: 1px solid #000; padding: 4.5px 6px; text-align: center; vertical-align: middle; }
  .official-letter table.ol-table th { font-weight: 700; background: #fff; }
  .official-letter table.ol-table td:first-child { text-align: left; font-weight: 600; }
  .official-letter table.ol-table .ol-total-row td { font-weight: 700; background: #f9f9f9; }
  .official-letter table.ol-table .ol-total-row td:first-child { text-align: center; }
  .official-letter .ol-sign { margin-top: 15px; page-break-inside: avoid; }
  .official-letter .ol-sign div { margin: 1px 0; }
  .official-letter .ol-sign-space { height: 35px; }

  /* Compact mode fallback */
  .official-letter.compact-letter { font-size: 14px; line-height: 1.28; }
  .official-letter.compact-letter .ol-ref { margin-bottom: 8px; font-weight: normal; }
  .official-letter.compact-letter .ol-addr { margin-bottom: 8px; }
  .official-letter.compact-letter .ol-addr div { margin: 1px 0; line-height: 1.28; }
  .official-letter.compact-letter .ol-title { margin: 8px 0; font-size: 14px; line-height: 1.28; }
  .official-letter.compact-letter .ol-yearline { margin: 4px 0 2px; font-size: 13px; }
  .official-letter.compact-letter .ol-section { margin: 4px 0 2px; font-size: 12px; }
  .official-letter.compact-letter .ol-para { margin: 5px 0; font-size: 14px; line-height: 1.28; }
  .official-letter.compact-letter table.ol-table { font-size: 11.5px; margin: 2px 0 6px; }
  .official-letter.compact-letter table.ol-table th, .official-letter.compact-letter table.ol-table td { padding: 2.5px 4px; }
  .official-letter.compact-letter .ol-sign { margin-top: 10px; font-size: 14px; line-height: 1.28; }
  .official-letter.compact-letter .ol-sign-space { height: 20px; }

  /* - Receipt - */
  .print-receipt { width: 100%; max-width: 100%; margin: 0; padding: 0; font-size: 14px; line-height: 1.5; }
  .print-receipt .rc-head { text-align: center; margin-bottom: 18px; }
  .print-receipt .rc-head .rc-logo img { width: 85px; height: auto; margin-bottom: 10px; }
  .print-receipt .rc-head .rc-title { font-size: 18px; font-weight: 700; }
  .print-receipt .rc-head .rc-sub { font-size: 14px; }
  .print-receipt .rc-topline { text-align: right; font-size: 14px; margin-bottom: 8px; }
  .print-receipt .rc-regno { font-weight: 700; }
  .print-receipt .rc-row { margin: 10px 0; display: flex; align-items: center; gap: 8px; }
  .print-receipt .rc-fill-label { white-space: nowrap; }
  .print-receipt .rc-fill-line { flex: 1; border-bottom: 1px dotted #666; height: 1px; margin-top: 14px; }
  .print-receipt .rc-checkline { display: flex; flex-wrap: wrap; align-items: center; gap: 6px; margin: 12px 0; padding: 10px 0; border-top: 1px solid #aaa; border-bottom: 1px solid #aaa; }
  .print-receipt .rc-box { display: inline-block; width: 16px; height: 16px; border: 1px solid #111; text-align: center; line-height: 16px; font-size: 12px; margin-right: 8px; }
  .print-receipt table { width: 100%; border-collapse: collapse; margin-top: 16px; }
  .print-receipt td { padding: 8px 5px; border-bottom: 1px dotted #666; vertical-align: top; }
  .print-receipt .rc-label { font-weight: 700; width: 48%; }
  .print-receipt .rc-total td { border-top: 2px solid #111; font-weight: 700; font-size: 15px; }
  .print-receipt .rc-sign { display: flex; justify-content: space-between; margin-top: 75px; }
  .print-receipt .rc-sign div { border-top: 1px solid #111; padding-top: 5px; width: 45%; text-align: center; }
</style>
</head>
<body>
  <div class="edit-toolbar">
    <span class="et-hint">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
      Click any text on the letter to edit it before printing
    </span>
    <div class="et-btns">
      <button class="et-btn et-btn-print" onclick="window.print()">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>
        Print
      </button>
      <button class="et-btn et-btn-close" onclick="window.close()">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        Close
      </button>
    </div>
  </div>
  ${letterHtml ? `<div class="doc-page letter-page">${letterHtml}</div>` : ''}
  ${includeReceipt ? `<div class="doc-page doc-page-receipt">${receiptHtml}</div>` : ''}
  <script>
    window.addEventListener('load', function() {
      try {
        var letter = document.querySelector('.official-letter');
        if (letter) {
          // Available height on A4: 297mm (~1122.5px) - 2.7in top padding (~259.2px) - 45px safety bottom margin = ~818px
          var maxH = 818;
          var signSpace = letter.querySelector('.ol-sign-space');

          // Only adjust if content actually overflows the single page height
          if (letter.offsetHeight > maxH && signSpace) {
            signSpace.style.height = '20px';
          }
          var currentSize = parseFloat(window.getComputedStyle(letter).fontSize) || 15;
          while (letter.offsetHeight > maxH && currentSize > 11) {
            currentSize -= 0.2;
            letter.style.setProperty('font-size', currentSize + 'px', 'important');
            letter.style.setProperty('line-height', (currentSize < 13 ? '1.22' : '1.28'), 'important');
            var title = letter.querySelector('.ol-title');
            if (title) title.style.setProperty('font-size', currentSize + 'px', 'important');
            var paras = letter.querySelectorAll('.ol-para');
            for (var p = 0; p < paras.length; p++) {
              paras[p].style.setProperty('margin', (currentSize < 13 ? '4px 0' : '6px 0'), 'important');
            }
            var tables = letter.querySelectorAll('.ol-table');
            for (var i = 0; i < tables.length; i++) {
              tables[i].style.setProperty('font-size', Math.max(10, currentSize - 2.5) + 'px', 'important');
              tables[i].style.setProperty('margin', '2px 0 6px', 'important');
              var cells = tables[i].querySelectorAll('th, td');
              for (var c = 0; c < cells.length; c++) {
                cells[c].style.setProperty('padding', '2.5px 4px', 'important');
              }
            }
          }
        }
      } catch (err) {
        console.error(err);
      }
      setTimeout(function() {
        window.focus();
        // window.print() is handled by the outer component
      }, 500);
    });
  </script>
</body>
</html>`;
}
