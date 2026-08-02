import('./src/pages/MCManagement.jsx').then((m) => {
  console.log('exports', Object.keys(m));
  console.log('has helper', typeof m.buildMcViewPrintHtml, typeof m.buildMcChecklistPrintHtml);
}).catch((err) => {
  console.error(err);
  process.exit(1);
});
