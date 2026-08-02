const fs = require('fs');

const files = [
    'c:/Users/AROSHA/Downloads/CCU_CMA/frontend/src/pages/MComManagement.jsx',
    'c:/Users/AROSHA/Downloads/CCU_CMA/frontend/src/pages/Complaints.jsx',
    'c:/Users/AROSHA/Downloads/CCU_CMA/frontend/src/pages/CFiles.jsx',
    'c:/Users/AROSHA/Downloads/CCU_CMA/frontend/src/pages/MCManagement.jsx',
    'c:/Users/AROSHA/Downloads/CCU_CMA/frontend/src/pages/Discussions.jsx'
];

for (const file of files) {
    if (fs.existsSync(file)) {
        let content = fs.readFileSync(file, 'utf8');
        
        // Remove the small button from {h === 'ACTIONS' ? ...}
        content = content.replace(
            /\{[a-z]+\s*===\s*'ACTIONS'\s*\?\s*\(\s*<div[^>]*>[\s\S]*?<button[^>]*onClick=\{\(e\) =>\s*\{[\s\S]*?wrapper\.classList\.toggle\('table-fullscreen-mode'\);[\s\S]*?\}[\s\S]*?<\/button>[\s\S]*?<\/div>\s*\)\s*:\s*[a-z]+\}/g,
            "{$&}".replace(/\{([a-z]+)\s*===\s*'ACTIONS'[\s\S]*?\}/, '$1') // We will just replace it with `h` or `label` but Regex backref is hard. Let's do it manually.
        );
        
        // Let's do a simpler string replacement
        const buttonPattern = /\{\s*([a-zA-Z]+)\s*===\s*'ACTIONS'\s*\?\s*\([\s\S]*?fa-compress[\s\S]*?fa-expand[\s\S]*?<\/div>\)\s*:\s*\1\s*\}/g;
        content = content.replace(buttonPattern, '{$1}');

        // For the static th tags:
        const staticPattern = /<th[^>]*>\s*<div[^>]*>\s*<span>(ACTIONS|Actions)<\/span>\s*<button[^>]*onClick=\{[\s\S]*?fa-compress[\s\S]*?fa-expand[\s\S]*?<\/button>\s*<\/div>\s*<\/th>/g;
        content = content.replace(staticPattern, (match, text) => `<th style={thActionsStyle}>${text}</th>`);
        
        fs.writeFileSync(file, content, 'utf8');
        console.log('Cleaned up ' + file);
    }
}
