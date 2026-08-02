import { buildMcChecklistPrintHtml, buildMcViewPrintHtml } from './mcPrintHelpers.js';

// Combines the checklist and a receipt/view into a single printable HTML document.
// MCManagement.jsx expects: buildMcChecklistAndReceiptPrintHtml(record, checks, note, invoice)
export function buildMcChecklistAndReceiptPrintHtml(record = {}, checks = {}, note = '', invoice = null) {
  // Checklist section
  const checklistHtml = buildMcChecklistPrintHtml(record, checks, note);
  // The helper returns a full HTML doc; extract body innerHTML for embedding.
  const checklistBody = checklistHtml.replace(/^([\s\S]*?<body[^>]*>)/i, '').replace(/<\/body>[\s\S]*$/i, '');

  // Receipt section (reuse view print for now; invoice receipt has its own render in MCManagement.jsx)
  // If invoice is present, we generate a minimal receipt block.
  let receiptBlock = '';
  if (invoice) {
    const esc = (v) => String(v ?? '').replace(/&/g, '&amp;').replace(/</g, '<').replace(/>/g, '>');
    const periodStart = invoice.period_start || '';
    const periodEnd = invoice.period_end || '';

    receiptBlock = `
      <section style="margin-top:14px; page-break-inside:avoid; border-top:1px solid #e2e8f0; padding-top:14px;">
        <h3 style="font-size:13.5px; font-weight:700; color:#1a3a6b; text-transform:uppercase; letter-spacing:.5px; border-bottom:1px solid #e2e8f0; padding-bottom:4px; margin:0 0 10px;">Receipt Summary</h3>
        <div style="display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:10px 14px;">
          <div style="border:1px solid #e2e8f0; border-radius:6px; padding:8px 10px; background:#fafbfc;"><div style="font-size:10.5px; font-weight:700; color:#64748b; text-transform:uppercase; margin-bottom:4px;">Receipt No</div><div style="font-size:13px; color:#111;">${esc(invoice.invoice_number || invoice.file_no || invoice.new_file_no || '—')}</div></div>
          <div style="border:1px solid #e2e8f0; border-radius:6px; padding:8px 10px; background:#fafbfc;"><div style="font-size:10.5px; font-weight:700; color:#64748b; text-transform:uppercase; margin-bottom:4px;">Category</div><div style="font-size:13px; color:#111;">${esc(invoice.category || '—')}</div></div>
          <div style="border:1px solid #e2e8f0; border-radius:6px; padding:8px 10px; background:#fafbfc;"><div style="font-size:10.5px; font-weight:700; color:#64748b; text-transform:uppercase; margin-bottom:4px;">Period</div><div style="font-size:13px; color:#111;">${esc(periodStart)} to ${esc(periodEnd)}</div></div>
          <div style="border:1px solid #e2e8f0; border-radius:6px; padding:8px 10px; background:#fafbfc;"><div style="font-size:10.5px; font-weight:700; color:#64748b; text-transform:uppercase; margin-bottom:4px;">Total</div><div style="font-size:13px; color:#111;">${esc(invoice.total_amount != null ? Number(invoice.total_amount).toFixed(2) : '—')}</div></div>
        </div>
      </section>`;
  }

  // Wrap in a new HTML document
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>Checklist + Receipt</title>
  <style>
    @page { size: A4; margin: 0 !important; }
    html, body { margin: 0; padding: 0; background: #fff; color: #111; font-family: 'Times New Roman', 'Abhaya Libre', 'Noto Serif Sinhala', 'Iskoola Pota', Times, serif; }
    body { padding: 12mm; }
    .page { max-width: 210mm; margin: 0 auto; }
  </style>
</head>
<body>
  <div class="page">
    ${checklistBody}
    ${receiptBlock}
  </div>
  <script>window.addEventListener('load', function(){ setTimeout(function(){ window.print(); }, 260); });</script>
</body>
</html>`;
}

export default {
  buildMcChecklistAndReceiptPrintHtml,
  buildMcChecklistPrintHtml,
  buildMcViewPrintHtml,
};

