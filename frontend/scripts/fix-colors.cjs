const fs = require('fs');

const files = [
    'c:/Users/AROSHA/Downloads/CCU_CMA/frontend/src/pages/MComManagement.jsx',
    'c:/Users/AROSHA/Downloads/CCU_CMA/frontend/src/pages/Complaints.jsx',
    'c:/Users/AROSHA/Downloads/CCU_CMA/frontend/src/pages/CFiles.jsx',
    'c:/Users/AROSHA/Downloads/CCU_CMA/frontend/src/pages/Discussions.jsx',
    'c:/Users/AROSHA/Downloads/CCU_CMA/frontend/src/pages/AgmManagementView.jsx',
    'c:/Users/AROSHA/Downloads/CCU_CMA/frontend/src/pages/ActivityLogs.jsx',
    'c:/Users/AROSHA/Downloads/CCU_CMA/frontend/src/pages/UserAdmin.jsx',
    'c:/Users/AROSHA/Downloads/CCU_CMA/frontend/src/pages/Profile.jsx',
    'c:/Users/AROSHA/Downloads/CCU_CMA/frontend/src/pages/RegistrationForm.jsx',
    'c:/Users/AROSHA/Downloads/CCU_CMA/frontend/src/pages/Records.jsx'
];

for (const file of files) {
    if (fs.existsSync(file)) {
        let content = fs.readFileSync(file, 'utf8');
        
        // Replace colors
        content = content.replace(/color=\{theme\.blue\}/g, 'color="#2563eb"');
        content = content.replace(/color=\{theme\.orange\}/g, 'color="#f59e0b"');
        content = content.replace(/color=\{theme\.text2\}/g, 'color="#8b5cf6"');
        
        fs.writeFileSync(file, content, 'utf8');
        console.log('Updated ' + file);
    }
}
