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

  fs.readFile(backupPath, 'utf8', (readErr, sql) => {
    if (readErr) {
      console.error('Backup read error:', readErr.message);
      db.close();
      process.exit(1);
    }

    const statements = [];
    const lines = sql.split(/\r?\n/);
    let currentTable = null;

    for (const raw of lines) {
      const line = raw.trim();
      if (!line) continue;
      if (line.startsWith('-- Table:')) {
        currentTable = line.replace('-- Table:', '').trim().replace(/`/g, '');
        continue;
      }

      if (line.startsWith('CREATE TABLE')) {
        if (targetTables.includes(currentTable)) {
          statements.push(line + ';');
        }
        continue;
      }

      if (line.startsWith('INSERT INTO')) {
        const match = line.match(/INSERT INTO\s+`?([A-Za-z0-9_]+)`?/i);
        const tableName = match ? match[1] : null;
        if (tableName && targetTables.includes(tableName)) {
          statements.push(line + ';');
        }
      }
    }

    db.serialize(() => {
      targetTables.forEach((table) => {
        db.run(`DROP TABLE IF EXISTS \`${table}\``);
      });

      let index = 0;
      function executeNext() {
        if (index >= statements.length) {
          db.all("SELECT name FROM sqlite_master WHERE type='table' AND name IN ('complaint_approvals','complaint_categories','composers','reports') ORDER BY name", (err2, rows) => {
            if (err2) {
              console.error('Verify error:', err2.message);
              db.close();
              process.exit(1);
            }
            console.log(rows.map((r) => r.name).join(','));
            db.close();
          });
          return;
        }

        const stmt = statements[index];
        db.exec(stmt, (execErr) => {
          if (execErr) {
            console.error('Restore error:', execErr.message);
            db.close();
            process.exit(1);
          }
          index += 1;
          executeNext();
        });
      }

      executeNext();
    });
  });
});
