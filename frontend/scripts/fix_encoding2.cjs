const fs = require('fs');
let content = fs.readFileSync('src/pages/McomManagement.jsx', 'utf8');

// Replace all known garbled characters with safe ASCII alternatives
content = content.replace(/—/g, '-');
content = content.replace(/✅/g, '');
content = content.replace(/✕/g, 'x');
content = content.replace(/→/g, '->');
content = content.replace(/·/g, '-');
content = content.replace(/•/g, '-');
content = content.replace(/──/g, '--');
content = content.replace(/Loading¦/g, 'Loading...');
content = content.replace(/Search M.Com¦/g, 'Search M.Com...');
content = content.replace(/’/g, "'");
content = content.replace(/�/g, "-");
content = content.replace(/�/g, "");
content = content.replace(/�/g, "x");
content = content.replace(/�/g, "");

fs.writeFileSync('src/pages/McomManagement.jsx', content, 'utf8');
console.log('Fixed encoding again with ASCII safe characters');
