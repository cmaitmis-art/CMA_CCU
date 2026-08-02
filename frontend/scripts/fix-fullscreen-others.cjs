const fs = require('fs');

const files = [
    'c:/Users/AROSHA/Downloads/CCU_CMA/frontend/src/pages/Complaints.jsx',
    'c:/Users/AROSHA/Downloads/CCU_CMA/frontend/src/pages/CFiles.jsx',
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
        
        if (content.includes(">{label}</th>")) {
            content = content.replace(
                />\{label\}<\/th>/g,
                `>
                  {label === 'ACTIONS' ? (${buttonCode.trim()}) : label}
                </th>`
            );
            console.log('Updated {label} mapped headers in ' + file);
        } else if (content.includes(">{h}</th>")) {
            content = content.replace(
                />\{h\}<\/th>/g,
                `>
                  {h === 'ACTIONS' ? (${buttonCode.trim()}) : h}
                </th>`
            );
            console.log('Updated {h} mapped headers in ' + file);
        }
        
        fs.writeFileSync(file, content, 'utf8');
    }
}
