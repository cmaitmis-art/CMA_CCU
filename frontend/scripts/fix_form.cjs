const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src', 'pages', 'RegistrationForm.jsx');
let content = fs.readFileSync(filePath, 'utf8');

// Update Field component to accept htmlFor
content = content.replace(
  /function Field\(\{ label, children, colSpan \}\) \{/,
  'function Field({ label, children, colSpan, htmlFor }) {'
);
content = content.replace(
  /<label className="form-label">\{label\}<\/label>/,
  '<label className="form-label" htmlFor={htmlFor}>{label}</label>'
);

// Add id, name, and autocomplete to inputs that bind to formData
// We will look for Field elements to add htmlFor as well
content = content.replace(
  /<Field label="([^"]+)"(?: colSpan=\{2\})?>\s*<((?:input|select|textarea))([\s\S]*?)(value|checked)=\{formData\.([a-zA-Z0-9_]+)\}([\s\S]*?)>\s*(?:<\/select>|<\/textarea>)?\s*<\/Field>/g,
  (match, label, tag, before, valAttr, fieldName, after) => {
    let colSpanAttr = match.includes('colSpan={2}') ? ' colSpan={2}' : '';
    let closing = match.match(/<\/(select|textarea)>/);
    let closeTag = closing ? closing[0] : '';
    return `<Field label="${label}"${colSpanAttr} htmlFor="${fieldName}">
              <${tag}${before}id="${fieldName}" name="${fieldName}" ${valAttr}={formData.${fieldName}}${after}>${closeTag}
            </Field>`;
  }
);

// For checkboxes that are NOT in Field components:
// e.g. <label><input type="checkbox" checked={formData.fac_gym} ... /> <span>Gymnasium</span></label>
content = content.replace(
  /<input\s+type="checkbox"\s+checked=\{formData\.([a-zA-Z0-9_]+)\}([\s\S]*?)\/>/g,
  (match, fieldName, rest) => {
    if (match.includes('id=')) return match;
    return `<input type="checkbox" id="${fieldName}" name="${fieldName}" checked={formData.${fieldName}}${rest}/>`;
  }
);

// For council members
content = content.replace(
  /<Field label="([^"]+)">\s*<input([\s\S]*?)value=\{member\.([a-zA-Z0-9_]+)\}([\s\S]*?)\/>\s*<\/Field>/g,
  (match, label, before, fieldName, after) => {
    return `<Field label="${label}" htmlFor={\`member_\${index}_${fieldName}\`}>
              <input${before}id={\`member_\${index}_${fieldName}\`} name={\`member_\${index}_${fieldName}\`} value={member.${fieldName}}${after}/>
            </Field>`;
  }
);

// Also add a general autocomplete="off" to the main form to stop Chrome complaining about individual fields missing autocomplete, OR we just let Chrome be happy with id and name.
content = content.replace(/<form onSubmit=\{handleSave\} className="reg-form-flow">/, '<form onSubmit={handleSave} className="reg-form-flow" autoComplete="off">');

fs.writeFileSync(filePath, content, 'utf8');
console.log('Fixed RegistrationForm.jsx');
