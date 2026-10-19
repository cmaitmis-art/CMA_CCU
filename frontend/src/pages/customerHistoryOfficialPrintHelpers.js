import { CMA_LOGO_BASE64 } from '../utils/logoBase64.js';
import { escapeHtml } from './mcPrintHelpers.js';

export const getPrintStyles = () => `
<style>
body { font-family: 'Times New Roman', serif; margin: 0; padding: 0; background: #fff; }
@media print { body { margin: 0; padding: 0; } }
.official-form-print { max-width: 750px; margin: 0 auto; padding: 15px 20px; font-family: 'Times New Roman', serif; color: #111; background: #fff; box-sizing: border-box; }
.official-form-print .of-logo { text-align: center; margin-bottom: 4px; }
.official-form-print .of-logo img { width: 60px; height: auto; }
.official-form-print .of-title { text-align: center; font-size: 15.5px; font-weight: 700; letter-spacing: .3px; }
.official-form-print .of-subtitle { text-align: center; font-size: 14px; font-weight: 700; margin: 4px 0 16px; }
.official-form-print .of-row { display: flex; align-items: baseline; flex-wrap: wrap; gap: 6px; font-size: 13.5px; margin: 5px 0; }
.official-form-print .of-num { white-space: nowrap; font-weight: 600; }
.official-form-print .of-fill { flex: 1; min-width: 60px; border-bottom: 1px dotted #444; min-height: 15px; padding-left: 4px; }
.official-form-print .of-box { display: inline-flex; align-items: center; justify-content: center; width: 16px; height: 16px; border: 1px solid #111; font-size: 12px; font-weight: 700; margin: 0 4px; flex-shrink: 0; }
.official-form-print .of-section-title { font-weight: 700; font-size: 13.5px; margin: 10px 0 4px; }
.official-form-print .of-grid2 { display: grid; grid-template-columns: 1fr 1fr; gap: 4px 20px; margin-left: 4px; }
.official-form-print .of-checkitem { display: flex; align-items: center; gap: 4px; font-size: 13px; padding: 2px 0; }
.official-form-print table.of-table { width: 100%; border-collapse: collapse; font-size: 12.5px; margin-top: 6px; }
.official-form-print table.of-table th, .official-form-print table.of-table td { border: 1px solid #888; padding: 4px 6px; text-align: left; vertical-align: top; }
.official-form-print table.of-table th { background: #f4f4f4; font-weight: 700; }
.official-form-print .of-sign { display: flex; justify-content: space-between; margin-top: 15px; font-size: 13px; page-break-inside: avoid; }
.official-form-print .of-sign div { border-top: 1px solid #111; padding-top: 4px; width: 44%; text-align: center; }

@media print {
  @page { size: A4 portrait; margin: 0 !important; } /* Removes browser headers/footers like 'about:blank' and '1/1' */
  .official-form-print { 
    max-width: 100%;
    width: 100%;
    padding: 8mm 15mm 8mm 1.2in; /* 1.2 inches on the left side for filing, 15mm on the right */
    display: block;
    box-sizing: border-box;
  }
  .of-registration-page.council-compact { font-size: 10.5pt; line-height: 1.20; }
  .of-registration-page.council-compact .of-logo img { width: 40pt; }
  .of-registration-page.council-compact .of-title { font-size: 11.5pt; }
  .of-registration-page.council-compact .of-subtitle { font-size: 10.5pt; margin: 1pt 0 5pt; }
  .of-registration-page.council-compact .of-row { font-size: 10.5pt; margin: 1.8pt 0; line-height: 1.20; }
  .of-registration-page.council-compact .of-section-title { font-size: 10.5pt; margin: 3.5pt 0 1pt; }
  .of-registration-page.council-compact .of-checkitem { font-size: 10.5pt; line-height: 1.20; }
  .of-registration-page.council-compact table.of-table { font-size: 9.5pt; margin-top: 2pt; }
  .of-registration-page.council-compact table.of-table th, .of-registration-page.council-compact table.of-table td { padding: 1.8pt 3.5pt; }
  .of-registration-page.council-compact .of-sign { margin-top: 10pt; font-size: 10pt; }

  .of-registration-page.council-dense { font-size: 9.5pt; line-height: 1.15; }
  .of-registration-page.council-dense .of-logo img { width: 34pt; }
  .of-registration-page.council-dense .of-title { font-size: 10.5pt; }
  .of-registration-page.council-dense .of-subtitle { font-size: 9.5pt; margin: 1pt 0 3pt; }
  .of-registration-page.council-dense .of-row { font-size: 9.5pt; margin: 1pt 0; line-height: 1.15; }
  .of-registration-page.council-dense .of-fill { min-height: 11pt; }
  .of-registration-page.council-dense .of-box { width: 9.5pt; height: 9.5pt; font-size: 7.5pt; }
  .of-registration-page.council-dense .of-section-title { font-size: 9.5pt; margin: 2pt 0 0.5pt; }
  .of-registration-page.council-dense .of-grid2 { gap: 1pt 10pt; }
  .of-registration-page.council-dense .of-checkitem { font-size: 9.5pt; line-height: 1.15; }
  .of-registration-page.council-dense table.of-table { font-size: 8.5pt; margin-top: 1.5pt; }
  .of-registration-page.council-dense table.of-table th, .of-registration-page.council-dense table.of-table td { padding: 1pt 2.5pt; }
  .of-registration-page.council-dense .of-sign { margin-top: 6pt; font-size: 9pt; }
  .of-registration-page.council-dense .of-sign div { padding-top: 2pt; }
}
</style>`;

export const getReceiptPrintStyles = () => `
<style>
  @page { size: A4; margin: 0 !important; }
  /* - Receipt - */
  .print-receipt { width: 100%; max-width: 210mm; margin: 0; padding: 15mm 0.8in 15mm 1.2in; box-sizing: border-box; font-size: 14px; line-height: 1.5; font-family: 'Times New Roman', serif; }
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
</style>`;

export function buildApplicationFormHtml(mc, isMcom = false) {
  const Box = (checked) => `<span class="of-box">${checked ? '✓' : ''}</span>`;
  const safe = escapeHtml;

  const entityType = isMcom ? "MANAGEMENT COMMITTEE" : "MANAGEMENT CORPORATION";
  const entityName = isMcom ? (mc.management_committee_name || mc.name) : (mc.management_corporation_name || mc.name);

  let councilHtml = '';
  let councilTierClass = 'council-normal';
  try {
    const council = typeof mc.council_members === 'string' ? JSON.parse(mc.council_members) : (mc.council_members || []);
    const romanNumerals = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII'];
    const filledRows = Array.isArray(council) ? council.filter(row => row && (row.name || row.unit_no || row.contact_no)) : [];
    const count = filledRows.length > 0 ? filledRows.length : 1;
    councilTierClass = count <= 2 ? 'council-normal' : (count <= 4 ? 'council-compact' : 'council-dense');
    const printRows = filledRows.length > 0 ? filledRows : [{ name: '', unit_no: '', contact_no: '' }];
    councilHtml = printRows.map((row, i) => `
      <tr>
        <td style="text-align: center; font-weight: bold;">${romanNumerals[i] || (i + 1)}.</td>
        <td>${safe(row.name)}</td>
        <td>${safe(row.unit_no)}</td>
        <td>${safe(row.contact_no)}</td>
      </tr>
    `).join('');
  } catch (e) { console.error('Error parsing council members', e); }

  return `
    <html><head><title></title>${getPrintStyles()}</head><body>
    <div class="official-form-print of-registration-page ${councilTierClass}">
      <div class="of-logo"><img src="${CMA_LOGO_BASE64}" alt="CMA Logo" /></div>
      <div class="of-title">CONDOMINIUM MANAGEMENT AUTHORITY</div>
      <div class="of-subtitle">APPLICATION FOR REGISTRATION AS A ${entityType}</div>

      <div class="of-row"><span class="of-num">1. Title name of the ${isMcom ? 'Management Committee' : 'Management Corporation'} :-</span><span class="of-fill">${safe(entityName)}</span></div>
      <div class="of-row"><span class="of-num">2. Registered Condominium Plan No :-</span><span class="of-fill">${safe(mc.plan_no)}</span></div>
      <div class="of-row"><span class="of-num">3. Official Address of the ${isMcom ? 'M/C' : 'M/C'} :-</span><span class="of-fill">${safe(mc.address)}</span></div>

      <div class="of-section-title">4. Number of the parcels in the Condominium Complex,</div>
      <div class="of-row" style="margin-left: 14px;"><span class="of-num">Residential :-</span><span class="of-fill" style="max-width: 120px;">${safe(mc.residential_units ?? mc.residential)}</span></div>
      <div class="of-row" style="margin-left: 14px;"><span class="of-num">Non Residential :-</span></div>
      <div class="of-row" style="margin-left: 40px;"><span class="of-num">Shops :-</span><span class="of-fill" style="max-width: 100px;">${safe(mc.non_res_shops)}</span></div>
      <div class="of-row" style="margin-left: 40px;"><span class="of-num">Office :-</span><span class="of-fill" style="max-width: 100px;">${safe(mc.non_res_office || (!mc.non_res_shops && !mc.non_res_hotel ? (mc.non_residential_units || mc.non_residential) : ''))}</span></div>
      <div class="of-row" style="margin-left: 40px;"><span class="of-num">Hotel :-</span><span class="of-fill" style="max-width: 100px;">${safe(mc.non_res_hotel)}</span></div>

      <div class="of-section-title">5. Services available</div>
      <div class="of-grid2">
          <div class="of-checkitem">${Box(mc.services_lift)} Lift</div>
          <div class="of-checkitem">${Box(mc.services_fire_agreement)} Fire Service agreement</div>
          <div class="of-checkitem">${Box(mc.services_generator_agreement)} Generator Service agreement</div>
          <div class="of-checkitem">${Box(mc.services_insurance)} Insurance Details</div>
      </div>

      <div class="of-section-title">6. Facilities available</div>
      <div class="of-grid2">
          <div class="of-checkitem">${Box(mc.fac_common_parking)} Common Parking</div>
          <div class="of-checkitem">${Box(mc.fac_super_market)} Super Market</div>
          <div class="of-checkitem">${Box(mc.fac_accessory_car_parcel)} Accessory Car Parcel</div>
          <div class="of-checkitem">${Box(mc.fac_garden)} Garden</div>
          <div class="of-checkitem">${Box(mc.fac_roof_top)} Roof Top</div>
          <div class="of-checkitem">${Box(mc.fac_sauna)} Sauna</div>
          <div class="of-checkitem">${Box(mc.fac_gym)} Gym</div>
          <div class="of-checkitem">${Box(mc.fac_salon)} Salon</div>
          <div class="of-checkitem">${Box(mc.fac_swimming_pool)} Swimming Pool</div>
          <div class="of-checkitem">${Box(mc.fac_golf_tennis)} Golf &amp; Tennis Ground</div>
          <div class="of-checkitem">${Box(mc.fac_penth_house)} Penth House</div>
          <div class="of-checkitem">${Box(mc.fac_day_care)} Day Care Centers</div>
          <div class="of-checkitem">${Box(mc.fac_restaurant)} Restaurant</div>
      </div>

      <div class="of-row" style="margin-top: 6px;">
          <span class="of-num">Management Services Company :-</span>
          <span class="of-checkitem" style="margin-left: 6px;">Yes ${Box(mc.mgmt_company_controlled)}</span>
          <span class="of-checkitem">No ${Box(!mc.mgmt_company_controlled)}</span>
      </div>
      ${mc.mgmt_company_controlled ? `
          <div class="of-row" style="margin-left: 14px;"><span class="of-num">Name of the Company :-</span><span class="of-fill">${safe(mc.mgmt_company_name)}</span></div>
          <div class="of-row" style="margin-left: 14px;"><span class="of-num">Contact No :-</span><span class="of-fill">${safe(mc.mgmt_company_contact)}</span></div>
      ` : ''}

      <div class="of-section-title" style="text-transform: uppercase;">Names of the Office Bearers and their Contact Nos.</div>
      <div class="of-row"><span class="of-num" style="min-width: 90px;">Secretary -</span><span class="of-fill">${safe(mc.secretary)}</span></div>
      <div class="of-row" style="margin-left: 14px;"><span class="of-num">Unit No -</span><span class="of-fill" style="max-width: 140px;">${safe(mc.secretary_unit_no)}</span></div>
      <div class="of-row" style="margin-left: 14px;"><span class="of-num">Contact No -</span><span class="of-fill">${safe(mc.secretary_contact)}</span></div>
      <div class="of-row" style="margin-left: 14px;"><span class="of-num">E-mail Address -</span><span class="of-fill">${safe(mc.secretary_email)}</span></div>

      <div class="of-row" style="margin-top: 5px;"><span class="of-num" style="min-width: 90px;">Treasurer -</span><span class="of-fill">${safe(mc.treasurer)}</span></div>
      <div class="of-row" style="margin-left: 14px;"><span class="of-num">Unit No -</span><span class="of-fill" style="max-width: 140px;">${safe(mc.treasurer_unit_no)}</span></div>
      <div class="of-row" style="margin-left: 14px;"><span class="of-num">Contact No -</span><span class="of-fill">${safe(mc.treasurer_contact)}</span></div>
      <div class="of-row" style="margin-left: 14px;"><span class="of-num">E-mail Address -</span><span class="of-fill">${safe(mc.treasurer_email)}</span></div>

      <div class="of-row" style="margin-top: 5px;"><span class="of-num" style="min-width: 90px;">Council Members -</span></div>
      <table class="of-table">
          <thead><tr><th style="width: 34px;">&nbsp;</th><th>Name</th><th style="width: 110px;">Unit No</th><th style="width: 130px;">Contact No</th></tr></thead>
          <tbody>${councilHtml}</tbody>
      </table>

      <div class="of-row" style="margin-top: 8px;">
          <span>7. Written assurance from secretary that Condominium Management Authority requirement will be fulfilled (attached) ${Box(mc.written_assurance_fulfilled)}</span>
      </div>

      <div class="of-sign">
          <div>Authorized Signature</div>
          <div>Secretary<br />${isMcom ? 'Management Committee' : 'Management Corporation'}</div>
      </div>
    </div>
    <script>
      function autoAdjustForms() {
        try {
          var forms = document.querySelectorAll('.official-form-print');
          forms.forEach(function(form) {
            var maxAllowed = 1045;
            var curHeight = form.scrollHeight;
            if (curHeight > maxAllowed) {
              var ratio = Math.floor(((maxAllowed - 10) / curHeight) * 100) / 100;
              if (ratio < 0.65) ratio = 0.65;
              form.style.zoom = ratio;
            }
          });
        } catch (e) {}
      }
      window.onload = function() {
        autoAdjustForms();
        window.print();
      };
    </script></body></html>
  `;
}

export function buildRegistrationReceiptHtml(mc, settings, isMcom = false) {
  const safe = escapeHtml;
  const entityName = isMcom ? (mc.management_committee_name || mc.name) : (mc.management_corporation_name || mc.name);
  const fileNo = mc.file_no || mc.new_file_no || mc.old_file_no || '-';
  const units = mc.units ?? mc.residential ?? mc.residential_units ?? '';
  const category = mc.category || '-';
  const periodStart = mc.reg_date ? new Date(mc.reg_date).toLocaleDateString('en-LK') : '-';
  const periodEnd = mc.next_renewal_date ? new Date(mc.next_renewal_date).toLocaleDateString('en-LK') : '-';
  const monthsCharged = 12;

  let rate = 250;
  if (category) {
      const cat = category.toLowerCase();
      if (cat.includes('nhda') || cat.includes('government')) rate = 100;
      else if (cat.includes('semi')) rate = 200;
      else if (cat.includes('super')) rate = 300;
  }

  const res = parseInt(mc?.residential || mc?.residential_units) || 0;
  const shops = parseInt(mc?.non_res_shops) || 0;
  const office = parseInt(mc?.non_res_office) || 0;
  const hotel = parseInt(mc?.non_res_hotel) || 0;
  const sum = res + shops + office + hotel;
  const parsedUnits = sum > 0 ? sum : (parseInt(mc?.units) || 0);

  const regDate = new Date(mc?.reg_date || new Date());
  const validDate = !Number.isNaN(regDate.getTime());
  const periodMonths = validDate ? Math.max(1, 12 - regDate.getMonth()) : 12;

  const monthlyFeePerUnit = rate / 12;
  const calcFee = monthlyFeePerUnit * parsedUnits * periodMonths;
  const calcSscl = calcFee * 0.025;
  const calcVat = (calcFee + calcSscl) * 0.18;
  const calcTotal = calcFee + calcSscl + calcVat;

  const feeAmount = mc.registration_fee ?? mc.reg_fee ?? mc.fee_amount ?? calcFee;
  const ssclAmount = mc.registration_sscl ?? mc.sscl_amount ?? calcSscl;
  const vatAmount = mc.registration_vat ?? mc.vat_amount ?? calcVat;
  const totalAmount = mc.registration_total ?? mc.total_amount ?? calcTotal;

  const ssclRate = settings?.sscl_rate ? settings.sscl_rate * 100 : 2.5;
  const vatRate = settings?.vat_rate ? settings.vat_rate * 100 : 18;

  const fmt = (n) => (n != null && n !== '' ? Number(n).toLocaleString('en-LK', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '-');

  const receiptHtml = `
    <div class="print-receipt">
      <div class="rc-topline">
          <span class="rc-regno">No. ${safe(fileNo)}</span>
      </div>
      <div class="rc-head">
          <div class="rc-logo">
              <img src="${CMA_LOGO_BASE64}" alt="CMA Logo" />
          </div>
          <div class="rc-title">CONDOMINIUM MANAGEMENT AUTHORITY</div>
          <div class="rc-sub">Customer Care Division / Legal Division</div>
      </div>

      <div class="rc-row"><span class="rc-fill-label">DGM Finance / Shroff</span><span class="rc-fill-line"></span></div>

      <div class="rc-checkline">
          <span>Registration of ${isMcom ? 'Management Committee' : 'Management Corporation'}</span>
          <span class="rc-box">&#10003;</span>
          <span>/ Renewal</span>
          <span class="rc-box"></span>
          <span>/ Application Fee</span><span class="rc-box"></span>
          <span>/ Photocopy Charges</span><span class="rc-box"></span>
          <span>/ Others</span><span class="rc-box"></span>
      </div>

      <table>
          <tbody>
              <tr><td class="rc-label">File No</td><td>${safe(fileNo)}</td></tr>
              <tr>
                  <td class="rc-label">Name of the ${isMcom ? 'M.Com' : 'MC'} &amp; Address</td>
                  <td>
                      ${[entityName, mc.plan_no, mc.address].filter(Boolean).map(p => `<div style="margin-bottom: 4px; line-height: 1.4;">${safe(p)}</div>`).join('')}
                  </td>
              </tr>
              <tr><td class="rc-label">Period</td><td>${periodStart} to ${periodEnd}</td></tr>
              <tr><td class="rc-label">Category</td><td>${safe(category)}</td></tr>
              <tr><td class="rc-label">Number of Parcels (Units)</td><td>${safe(units)}</td></tr>
              <tr><td class="rc-label">Period (months charged)</td><td>${monthsCharged}</td></tr>
              <tr><td class="rc-label">Fee Rs. (Rate - / 12 - ${monthsCharged} months - ${safe(units)} units)</td><td>${fmt(feeAmount)}</td></tr>
              <tr><td class="rc-label">Other Tax - SSCL (${ssclRate}%)</td><td>${fmt(ssclAmount)}</td></tr>
              <tr><td class="rc-label">VAT (${vatRate}%)</td><td>${fmt(vatAmount)}</td></tr>
              <tr class="rc-total"><td>Total Amount Rs.</td><td>${fmt(totalAmount)}</td></tr>
          </tbody>
      </table>

      <div class="rc-row" style="margin-top: 14px;">
          <span>Please accept Rs. ____________________ (Cash / Cheque) Cheque No. ____________________</span>
      </div>
      <div class="rc-row"><span>Cheque Date ____________________ Branch ____________________ from the above ${isMcom ? 'M.Com' : 'MC'}.</span></div>

      <div class="rc-sign">
          <div>Authorized Signature</div>
          <div>Date</div>
      </div>
    </div>
  `;

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8" />
<title>Registration Receipt - ${safe(fileNo)}</title>
${getPrintStyles()}
${getReceiptPrintStyles()}
</head>
<body>
  ${receiptHtml}
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
