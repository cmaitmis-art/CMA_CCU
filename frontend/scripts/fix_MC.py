import re

def fix_file(filename):
    with open(filename, 'r', encoding='utf-8') as f:
        text = f.read()

    # Strip non-ASCII
    text = re.sub(r'[^\x00-\x7F]+', '-', text)

    # Cleanup artifacts from stripping
    text = text.replace('--', '-')
    text = text.replace('?-', '-')
    text = text.replace('-?', '-')
    text = text.replace(' - ', ' - ')

    # Fix specific elements that got mangled by stripping
    text = text.replace('>-\</button>', '><i className="fas fa-times" /></button>')
    text = text.replace('>-</button>', '><i className="fas fa-times" /></button>')

    text = text.replace(" updated -'", " updated successfully'")
    text = text.replace(" created -'", " created successfully'")
    text = text.replace(" marked as paid -'", " marked as paid successfully'")
    text = text.replace(" payment approved -'", " payment approved successfully'")
    text = text.replace(" opened -'", " opened successfully'")
    text = text.replace("Exported -'", "Exported successfully'")
    text = text.replace(" records -'", " records successfully'")

    with open(filename, 'w', encoding='utf-8') as f:
        f.write(text)

fix_file('src/pages/MCManagement.jsx')
print("MCManagement fixed")
