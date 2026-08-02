const fs = require('fs');

const files = [
    'c:/Users/AROSHA/Downloads/CCU_CMA/frontend/src/pages/MComManagement.jsx',
    'c:/Users/AROSHA/Downloads/CCU_CMA/frontend/src/pages/Complaints.jsx',
    'c:/Users/AROSHA/Downloads/CCU_CMA/frontend/src/pages/CFiles.jsx',
    'c:/Users/AROSHA/Downloads/CCU_CMA/frontend/src/pages/Discussions.jsx'
];

const buttonCode = `
                {/* ZOOM BUTTON */}
                <button
                  onClick={(e) => {
                    let container = e.currentTarget;
                    let wrapper = null;
                    while (container && !wrapper) {
                      wrapper = container.querySelector('div[style*="tableWrapperStyle"]') || container.querySelector('div[style*="overflow"]');
                      container = container.parentElement;
                    }
                    wrapper = wrapper || document.querySelector('div[style*="overflow"]');
                    
                    if(wrapper) {
                      wrapper.classList.toggle('table-fullscreen-mode');
                      e.currentTarget.classList.toggle('zoom-btn-floating');
                      const i = e.currentTarget.querySelector('i');
                      if (wrapper.classList.contains('table-fullscreen-mode')) {
                        i.className = 'fas fa-compress';
                        e.currentTarget.innerHTML = '<i class="fas fa-compress"></i> Exit Zoom';
                      } else {
                        i.className = 'fas fa-expand';
                        e.currentTarget.innerHTML = '<i class="fas fa-expand"></i> Zoom Table';
                      }
                    }
                  }}
                  className="mc-btn-base"
                  style={{ background: '#e0e7ff', color: '#4338ca', border: '1px solid #c7d2fe', padding: '5px 12px', fontSize: 12, marginLeft: 8 }}
                >
                  <i className="fas fa-expand" /> Zoom Table
                </button>
`;

for (const file of files) {
    if (fs.existsSync(file)) {
        let content = fs.readFileSync(file, 'utf8');
        
        if (content.includes("{/* ZOOM BUTTON */}")) {
            continue;
        }

        const idx = content.indexOf('All (up to 1000)</strong></span>');
        if (idx !== -1) {
            const nextDivEnd = content.indexOf('</div>', idx);
            if (nextDivEnd !== -1) {
                content = content.substring(0, nextDivEnd) + buttonCode + content.substring(nextDivEnd);
                fs.writeFileSync(file, content, 'utf8');
                console.log('Added Zoom button to ' + file);
            }
        }
    }
}
