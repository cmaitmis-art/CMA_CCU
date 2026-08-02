export function exportToPdfPrint(title, dataRows, dateStr = new Date().toISOString().split('T')[0]) {
  if (!dataRows || !dataRows.length) {
    alert('No data to export');
    return;
  }

  const headers = Object.keys(dataRows[0]);

  let htmlContent = `
    <html><head><title>${title}</title>
    <style>
      body { font-family: 'Noto Sans Sinhala', 'Gemunu Libre', 'Iskoola Pota', Arial, sans-serif; font-size: 11px; margin: 20px; }
      h2 { text-align: center; font-size: 14px; margin-bottom: 16px; text-transform: uppercase; }
      table { width: 100%; border-collapse: collapse; font-size: 10px; }
      th { background: #1a3a6b; color: #fff; padding: 5px 6px; text-align: left; white-space: nowrap; }
      td { border: 1px solid #ccc; padding: 4px 6px; vertical-align: top; }
      tr:nth-child(even) { background: #f5f7fa; }
      @media print { body { margin: 10px; } }
    </style></head><body>
  `;

  htmlContent += `<h2>${title} (${dateStr})</h2>`;
  htmlContent += `<table><thead><tr>`;
  headers.forEach(h => {
    htmlContent += `<th>${h}</th>`;
  });
  htmlContent += `</tr></thead><tbody>`;

  dataRows.forEach((row) => {
    htmlContent += `<tr>`;
    headers.forEach(h => {
      htmlContent += `<td>${row[h] || ''}</td>`;
    });
    htmlContent += `</tr>`;
  });

  htmlContent += `</tbody></table><br/></body></html>`;

  const printWin = window.open('', '_blank', 'width=1200,height=800');
  if (printWin) {
    printWin.document.write(htmlContent);
    printWin.document.close();
    printWin.focus();
    setTimeout(() => printWin.print(), 600);
  } else {
    alert('Please allow popups for this website to print.');
  }
}
