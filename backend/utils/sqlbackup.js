const path = require('path');
const mysqldump = require('mysqldump');
const fs = require('fs');
require('dotenv').config();

const DEFAULT_BACKUP_PATH = path.join(__dirname, '..', 'data', 'cma_backup.sql');

async function createSqlBackup(backupPath = DEFAULT_BACKUP_PATH) {
  try {
    // Ensure the data directory exists
    const dir = path.dirname(backupPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    const dbName = process.env.DB_NAME || 'cma_db';
    const dbUser = process.env.DB_USER || 'root';
    const dbPass = process.env.DB_PASS || '';
    const dbHost = process.env.DB_HOST || 'localhost';

    await mysqldump({
      connection: {
        host: dbHost,
        user: dbUser,
        password: dbPass,
        database: dbName,
      },
      dumpToFile: backupPath,
    });
    
    return backupPath;
  } catch (err) {
    console.error('SQL Backup failed:', err);
    throw err;
  }
}

// Optional helper for triggering backups after major data insertions
// We add a short delay so we don't block the API response unnecessarily
async function backupAfter(delayMs = 2000) {
  setTimeout(async () => {
    try {
      await createSqlBackup();
      console.log('[Auto-Backup] Triggered backup after data modification.');
    } catch (err) {
      console.error('[Auto-Backup] Post-modification backup failed:', err?.message);
    }
  }, delayMs);
}

module.exports = {
  createSqlBackup,
  backupAfter,
  DEFAULT_BACKUP_PATH
};
