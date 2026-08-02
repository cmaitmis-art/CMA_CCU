const fs = require('fs');
const path = require('path');

const mcPath = path.join(__dirname, 'src', 'pages', 'MCManagement.jsx');
const sharedPath = path.join(__dirname, 'src', 'components', 'mc-management', 'MCManagementShared.jsx');
const utilsPath = path.join(__dirname, 'src', 'components', 'mc-management', 'MCManagementUtils.js');
const cssPath = path.join(__dirname, 'src', 'components', 'mc-management', 'MCManagement.css');

let content = fs.readFileSync(mcPath, 'utf8');

// Find the start of constants (line 20) and start of the main component
const startMatch = content.match(/\/\/ -- Registration Fee Auto-Calc Constants --/);
const endMatch = content.match(/export default function MCManagementBackend/);

if (!startMatch || !endMatch) {
  console.log("Could not find boundaries.");
  process.exit(1);
}

const startIdx = startMatch.index;
const endIdx = endMatch.index;

const extractedSection = content.substring(startIdx, endIdx);

// Now we separate extractedSection into utils (pure JS) and shared (React components + styles)
// Actually, it's easier to just put EVERYTHING (lines 20 to 861) into one file: MCManagementShared.jsx 
// except that it's 800 lines. Let's just put it all in `MCManagementShared.jsx` for now to guarantee 100% safety,
// and we can extract the CSS from it next.

const sharedContent = `import React from 'react';\n\n` + extractedSection;

// Save shared components
fs.writeFileSync(sharedPath, sharedContent, 'utf8');

// Create empty CSS file
fs.writeFileSync(cssPath, `/* MCManagement Styles */\n`, 'utf8');

// Identify all exports from shared Content to import them in MCManagement.jsx
// We'll just export everything we can.
let exportsToInject = [];
const exportMatches = extractedSection.match(/^(?:const|let|function)\s+([A-Za-z0-9_]+)/gm);
if (exportMatches) {
    exportsToInject = exportMatches.map(m => m.split(/\s+/)[1]);
}

// Convert extracted declarations to exports in MCManagementShared.jsx
let modShared = sharedContent.replace(/^(const|let|function)\s+([A-Za-z0-9_]+)/gm, 'export $1 $2');
fs.writeFileSync(sharedPath, modShared, 'utf8');

// Remove extracted section from MCManagement.jsx
let newContent = content.substring(0, startIdx) + 
`import {\n  ` + exportsToInject.join(',\n  ') + `\n} from '../components/mc-management/MCManagementShared';\n` +
`import '../components/mc-management/MCManagement.css';\n\n` + 
content.substring(endIdx);

fs.writeFileSync(mcPath, newContent, 'utf8');

console.log("Extraction complete!");
