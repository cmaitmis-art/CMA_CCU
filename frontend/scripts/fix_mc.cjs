const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src', 'pages', 'MCManagement.jsx');
let content = fs.readFileSync(filePath, 'utf8');
let counter = 0;

content = content.replace(/<(input|select|textarea)([^>]*)>/g, (match, tag, rest) => {
    if (rest.includes('id=') && rest.includes('name=')) return match;
    
    // We must ensure the input doesn't already have an ID or Name
    let additions = '';
    let newId = 'mc_form_field_' + (++counter);
    
    if (!rest.includes('id=')) additions += ` id="${newId}"`;
    if (!rest.includes('name=')) additions += ` name="${newId}"`;
    
    return `<${tag}${additions}${rest}>`;
});

// Add autoComplete="off" to the main parent div or forms to suppress autocomplete warnings on arbitrary fields
content = content.replace(/<div className="mc-content">/, '<div className="mc-content" autoComplete="off">');

fs.writeFileSync(filePath, content, 'utf8');
console.log('Fixed missing id/name attributes in MCManagement.jsx');
