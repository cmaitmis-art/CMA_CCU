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
        
        // Fix the syntax error {{h}} -> {h} and {{label}} -> {label}
        content = content.replace(/\{\{h\}\}/g, '{h}');
        content = content.replace(/\{\{label\}\}/g, '{label}');
        
        fs.writeFileSync(file, content, 'utf8');
        console.log('Fixed ' + file);
    }
}
