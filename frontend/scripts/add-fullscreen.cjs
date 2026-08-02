const fs = require('fs');

const files = [
    'c:/Users/AROSHA/Downloads/CCU_CMA/frontend/src/pages/MComManagement.jsx',
    'c:/Users/AROSHA/Downloads/CCU_CMA/frontend/src/pages/Complaints.jsx',
    'c:/Users/AROSHA/Downloads/CCU_CMA/frontend/src/pages/CFiles.jsx',
    'c:/Users/AROSHA/Downloads/CCU_CMA/frontend/src/pages/MCManagement.jsx',
    'c:/Users/AROSHA/Downloads/CCU_CMA/frontend/src/pages/Discussions.jsx'
];

const buttonCode = `
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span>ACTIONS</span>
                          <button 
                            onClick={(e) => {
                              const wrapper = e.currentTarget.closest('.mc-table-wrapper') || e.currentTarget.closest('div[style*="overflow"]');
                              if(wrapper) {
                                wrapper.classList.toggle('table-fullscreen-mode');
                                const i = e.currentTarget.querySelector('i');
                                i.className = wrapper.classList.contains('table-fullscreen-mode') ? 'fas fa-compress' : 'fas fa-expand';
                              }
                            }}
                            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit', padding: '0 4px' }}
                            title="Toggle Full Screen"
                          >
                            <i className="fas fa-expand" />
                          </button>
                        </div>
`;

for (const file of files) {
    if (fs.existsSync(file)) {
        let content = fs.readFileSync(file, 'utf8');
        
        // Handle MCManagement
        if (content.includes("{h === 'ACTIONS' ? (")) {
            // already done?
        } else if (content.includes("{h === 'ACTIONS' ? 'mc-th-actions' : h === 'STATUS' ? 'mc-th-status' : 'mc-th'}")) {
            content = content.replace(
                /<th key=\{h\} className=\{h === 'ACTIONS' \? 'mc-th-actions' : h === 'STATUS' \? 'mc-th-status' : 'mc-th'\}>\s*\{h\}\s*<\/th>/g,
                `<th key={h} className={h === 'ACTIONS' ? 'mc-th-actions' : h === 'STATUS' ? 'mc-th-status' : 'mc-th'}>
                  {h === 'ACTIONS' ? (${buttonCode.trim()}) : h}
                </th>`
            );
        } else {
            // For other files
            content = content.replace(/<th style=\{thActionsStyle\}>\s*ACTIONS\s*<\/th>/g, `<th style={thActionsStyle}>\n${buttonCode}\n</th>`);
            content = content.replace(/<th style=\{thActionsStyle\}>\s*Actions\s*<\/th>/g, `<th style={thActionsStyle}>\n${buttonCode.replace('ACTIONS', 'Actions')}\n</th>`);
        }
        
        fs.writeFileSync(file, content, 'utf8');
        console.log('Updated ' + file);
    }
}
