const fs = require('fs');
const path = require('path');

const files = [
  path.join(__dirname, 'src', 'components', 'mc-management', 'MCManagementShared.jsx'),
  path.join(__dirname, 'src', 'pages', 'MCManagement.jsx')
];

const styleMap = {
  'btnBase': 'mc-btn-base',
  'btnPrimary': 'mc-btn-primary',
  'btnOutline': 'mc-btn-outline',
  'overlayStyle': 'mc-overlay',
  'modalStyle': 'mc-modal',
  'modalHeader': 'mc-modal-header',
  'closeBtnStyle': 'mc-close-btn',
  'inputStyle': 'mc-input',
  'sectionLabelStyle': 'mc-section-label',
  'tableWrapperStyle': 'mc-table-wrapper',
  'tableStyle': 'mc-table',
  'cellStyle': 'mc-cell',
  'thStyle': 'mc-th',
  'thActionsStyle': 'mc-th-actions',
  'tdActionsStyle': 'mc-td-actions',
  'thStatusStyle': 'mc-th-status',
  'tdStatusStyle': 'mc-td-status'
};

files.forEach(file => {
  if (!fs.existsSync(file)) return;
  let content = fs.readFileSync(file, 'utf8');

  for (const [jsVar, cssClass] of Object.entries(styleMap)) {
    // 1. Exact match: style={btnPrimary} -> className="mc-btn-primary"
    const exactRegex = new RegExp(`style=\\{${jsVar}\\}`, 'g');
    content = content.replace(exactRegex, `className="${cssClass}"`);

    // 2. Spread match: style={{ ...btnPrimary, padding: 10 }} -> className="mc-btn-primary" style={{ padding: 10 }}
    // Uses a regex that allows newlines and spaces.
    // e.g. style={{ ...btnPrimary, marginTop: 10 }}
    const spreadRegex = new RegExp(`style=\\{\\{\\s*\\.\\.\\.${jsVar}\\s*,\\s*([\\s\\S]*?)\\}\\}`, 'g');
    content = content.replace(spreadRegex, `className="${cssClass}" style={{$1}}`);
  }

  fs.writeFileSync(file, content, 'utf8');
});

console.log('Replaced styles successfully.');
