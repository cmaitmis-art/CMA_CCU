const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');
const path = require('path');

const dbPath = path.join(__dirname, 'data', 'cma.db');
const backupPath = path.join(__dirname, 'data', 'cma_backup.sql');
const targetTables = ['complaint_approvals', 'complaint_categories', 'composers', 'reports'];

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('DB open error:', err.message);
    process.exit(1);
  }

  db.serialize(() => {
    targetTables.forEach((table) => {
      db.run(`DROP TABLE IF EXISTS \`${table}\``, (dropErr) => {
        if (dropErr) {
          console.error(`Drop error for ${table}:`, dropErr.message);
          db.close();
          process.exit(1);
        }
      });
    });

    setTimeout(() => {
      fs.readFile(backupPath, 'utf8', (readErr, content) => {
        if (readErr) {
          console.error('Backup read error:', readErr.message);
          db.close();
          process.exit(1);
        }

        const lines = content.split(/\r?\n/);
        const kept = [];
        let skipBlock = false;

        for (const line of lines) {
          const trimmed = line.trim();
          const tableMatch = trimmed.match(/^--\s+(Table|Data for):\s+`?([A-Za-z0-9_]+)`?/i);
          const headerName = tableMatch ? tableMatch[2].toLowerCase() : null;

          if (headerName && targetTables.includes(headerName)) {
            skipBlock = true;
            continue;
          }

          if (skipBlock && trimmed.startsWith('--')) {
            if (tableMatch) {
              skipBlock = false;
              if (!targetTables.includes(headerName)) {
                kept.push(line);
              }
            }
            continue;
          }

          if (!skipBlock) {
            kept.push(line);
          }
        }

        const cleaned = kept.join('\n').replace(/\n{3,}/g, '\n\n').trimEnd() + '\n';
        fs.writeFile(backupPath, cleaned, (writeErr) => {
          if (writeErr) {
            console.error('Backup write error:', writeErr.message);
            db.close();
            process.exit(1);
          }

          db.all("SELECT name FROM sqlite_master WHERE type='table' AND name IN ('complaint_approvals','complaint_categories','composers','reports') ORDER BY name", (verifyErr, rows) => {
            if (verifyErr) {
              console.error('Verify error:', verifyErr.message);
              db.close();
              process.exit(1);
            }

            const remaining = rows.map((row) => row.name);
            console.log('Dropped tables:', targetTables.join(','));
            console.log('Remaining tables:', remaining.join(',') || '(none)');
            console.log('Backup updated:', backupPath);
            db.close();
          });
        });
      });
    }, 500);
  });
});
