const fs = require('fs');
let data = fs.readFileSync('c:/Users/AROSHA/Downloads/CCU_CMA/frontend/src/components/mc-management/MCManagementShared.jsx', 'utf8');

const startIdx = data.indexOf('export const closeBtnStyle');
const endIdx = data.indexOf('export const COL_WIDTHS');

if (startIdx !== -1 && endIdx !== -1) {
  const replacement = `export const closeBtnStyle = {
  background: 'none',
  border: 'none',
  cursor: 'pointer',
  fontSize: 18,
  color: theme.text3,
  padding: 2,
  lineHeight: 1,
};

export const inputStyle = {
  padding: '8px 11px',
  border: \`1px solid \${theme.border}\`,
  borderRadius: 8,
  fontSize: 13,
  fontFamily: 'inherit',
  color: theme.text,
  background: theme.card,
  width: '100%',
  boxSizing: 'border-box',
};

export const sectionLabelStyle = {
  fontSize: 11,
  fontWeight: 700,
  color: theme.navy,
  textTransform: 'uppercase',
  letterSpacing: '1px',
  gridColumn: 'span 2',
  borderBottom: \`1px solid \${theme.border}\`,
  paddingBottom: 6,
  marginTop: 8,
};

export const tableWrapperStyle = {
  overflowX: 'auto',
  maxHeight: 'calc(100vh - 240px)',
  overflowY: 'auto',
  border: \`1px solid \${theme.border}\`,
  borderRadius: 12,
  background: '#fff',
  boxShadow: '0 4px 6px rgba(0,0,0,0.02)',
};

export const tableStyle = {
  width: '100%',
  borderCollapse: 'collapse',
  fontSize: 12,
  fontFamily: "'Inter', 'Segoe UI', sans-serif",
  tableLayout: 'fixed',
};

// Compact cell style - fixed width columns with truncation
export const cellStyle = {
  padding: '12px 16px',
  fontSize: 13,
  color: '#334155',
  borderBottom: '1px solid #f1f5f9',
  fontFamily: "'Inter', 'Segoe UI', sans-serif",
  lineHeight: 1.35,
  whiteSpace: 'nowrap',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  maxWidth: 0, // required for text-overflow to work inside table-layout:fixed
};

export const thStyle = {
  textAlign: 'left',
  padding: '12px 16px',
  fontSize: 11,
  fontFamily: "'Inter', 'Segoe UI', sans-serif",
  fontWeight: 600,
  color: '#64748b',
  textTransform: 'uppercase',
  letterSpacing: '.5px',
  background: '#f8fafc',
  borderBottom: \`2px solid #e2e8f0\`,
  whiteSpace: 'nowrap',
  position: 'sticky',
  top: 0,
  zIndex: 1,
};

export const thActionsStyle = {
  ...thStyle,
  position: 'sticky',
  top: 0,
  right: 0,
  zIndex: 3,
  background: '#f8fafc',
  borderLeft: \`1px solid \${theme.border}\`,
};

export const tdActionsStyle = {
  ...cellStyle,
  position: 'sticky',
  right: 0,
  zIndex: 1,
  background: '#ffffff',
  borderLeft: \`1px solid \${theme.border}\`,
  overflow: 'visible',
  whiteSpace: 'nowrap',
};

// Column widths (px) - must sum to a reasonable table width
`;

  data = data.substring(0, startIdx) + replacement + data.substring(endIdx + 30);
  fs.writeFileSync('c:/Users/AROSHA/Downloads/CCU_CMA/frontend/src/components/mc-management/MCManagementShared.jsx', data, 'utf8');
  console.log('Fixed file');
} else {
  console.log('Indices not found', startIdx, endIdx);
}
