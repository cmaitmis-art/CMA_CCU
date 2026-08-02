const fs = require('fs');
let content = fs.readFileSync('src/pages/McomManagement.jsx', 'utf8');

const replacements = {
  '—': '�',
  '✅': '?',
  '✕': '?',
  '→': '?',
  '·': '�',
  '•': '�',
  '──': '--',
  'Loading¦': 'Loading...',
  'Search M.Com¦': 'Search M.Com...',
  '’': '\''
};

for (const [bad, good] of Object.entries(replacements)) {
  content = content.split(bad).join(good);
}

fs.writeFileSync('src/pages/McomManagement.jsx', content, 'utf8');
console.log('Fixed encoding');
