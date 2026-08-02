const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src', 'pages', 'RegistrationForm.jsx');
let content = fs.readFileSync(filePath, 'utf8');

// 1. Address Textarea
content = content.replace(
  /<textarea([\s\S]*?)value=\{formData\.address\}([\s\S]*?)>/g,
  '<textarea$1id="address" name="address" value={formData.address}$2>'
);

// 2. totalParcels Input
content = content.replace(
  /<input([\s\S]*?)value=\{totalParcels\}([\s\S]*?)disabled([\s\S]*?)\/>/g,
  '<input$1id="total_parcels" name="total_parcels" value={totalParcels}$2disabled$3/>'
);

// 3. Dynamic Facility Checkboxes
content = content.replace(
  /<input([\s\S]*?)type="checkbox"([\s\S]*?)checked=\{formData\[facility\.id\]\}([\s\S]*?)\/>/g,
  '<input$1type="checkbox"$2id={facility.id} name={facility.id} checked={formData[facility.id]}$3/>'
);

// 4. Radio Buttons
content = content.replace(
  /<input([\s\S]*?)type="radio"([\s\S]*?)name="([^"]+)"([\s\S]*?)checked=\{formData\.(mgmt_company_controlled|ownership_type|government_income_level) === ([^}]+)\}([\s\S]*?)\/>/g,
  (match, p1, p2, name, p4, field, val, p7) => {
    let idVal = val.replace(/['"]/g, '').trim();
    if (idVal === 'true') idVal = 'yes';
    if (idVal === 'false') idVal = 'no';
    if (field === 'government_income_level' && match.includes('!== \'middle\'')) idVal = 'low';
    return `<input${p1}type="radio"${p2}id={\`${name}_\${'${idVal}'}\`} name="${name}"${p4}checked={formData.${field} === ${val}}${p7}/>`;
  }
);
// Fix the "!== 'middle'" radio
content = content.replace(
  /<input([\s\S]*?)type="radio"([\s\S]*?)name="government_income_level"([\s\S]*?)checked=\{formData\.government_income_level !== 'middle'\}([\s\S]*?)\/>/g,
  '<input$1type="radio"$2id="government_income_level_low" name="government_income_level"$3checked={formData.government_income_level !== \'middle\'}$4/>'
);
// And explicitly fix the "=== 'middle'" radio just in case
content = content.replace(
  /<input([\s\S]*?)type="radio"([\s\S]*?)name="government_income_level"([\s\S]*?)checked=\{formData\.government_income_level === 'middle'\}([\s\S]*?)\/>/g,
  '<input$1type="radio"$2id="government_income_level_middle" name="government_income_level"$3checked={formData.government_income_level === \'middle\'}$4/>'
);

// 5. mgmt_company_name Input
content = content.replace(
  /<input([\s\S]*?)value=\{formData\.mgmt_company_name\}([\s\S]*?)\/>/g,
  '<input$1id="mgmt_company_name" name="mgmt_company_name" value={formData.mgmt_company_name}$2/>'
);

// 6. Council Members Inputs (in the table)
content = content.replace(
  /<input([\s\S]*?)value=\{member\.name\}([\s\S]*?)onChange=\{\(e\) => handleCouncilMemberChange\(index, 'name', e\.target\.value\)\}([\s\S]*?)\/>/g,
  '<input$1id={`member_${index}_name`} name={`member_${index}_name`} value={member.name}$2onChange={(e) => handleCouncilMemberChange(index, \'name\', e.target.value)}$3/>'
);
content = content.replace(
  /<input([\s\S]*?)value=\{member\.unit_no\}([\s\S]*?)onChange=\{\(e\) => handleCouncilMemberChange\(index, 'unit_no', e\.target\.value\)\}([\s\S]*?)\/>/g,
  '<input$1id={`member_${index}_unit_no`} name={`member_${index}_unit_no`} value={member.unit_no}$2onChange={(e) => handleCouncilMemberChange(index, \'unit_no\', e.target.value)}$3/>'
);
content = content.replace(
  /<input([\s\S]*?)value=\{member\.contact_no\}([\s\S]*?)onChange=\{\(e\) => handleCouncilMemberChange\(index, 'contact_no', e\.target\.value\)\}([\s\S]*?)\/>/g,
  '<input$1id={`member_${index}_contact_no`} name={`member_${index}_contact_no`} value={member.contact_no}$2onChange={(e) => handleCouncilMemberChange(index, \'contact_no\', e.target.value)}$3/>'
);

fs.writeFileSync(filePath, content, 'utf8');
console.log('Fixed remaining 19 issues.');
