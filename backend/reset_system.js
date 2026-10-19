/**
 * reset_system.js — Full System Reset Script
 * 
 * ✅ Clears ALL tables EXCEPT: users, roles
 * ✅ Resets auto-increment IDs back to 1
 * ✅ Clears uploaded files (agm, cfiles, complaints, reports)
 * ✅ Keeps avatars folder (user profile pictures preserved)
 * ✅ Settings table is also kept (system config preserved)
 * 
 * Usage:
 *   node reset_system.js           → Dry run (shows what will be cleared)
 *   node reset_system.js --confirm → Actually runs the reset
 */

const path = require('path');
const fs = require('fs');
const db = require('./db');

// ─── Tables to SKIP (keep their data) ─────────────────────────────────────────
const SKIP_MODELS = ['User', 'Role', 'Setting', 'UserPreference'];

// ─── Upload folders to clear (files inside, but keep the folder itself) ────────
const UPLOAD_FOLDERS_TO_CLEAR = [
  path.join(__dirname, 'uploads', 'agm'),
  path.join(__dirname, 'uploads', 'cfiles'),
  path.join(__dirname, 'uploads', 'complaints'),
  path.join(__dirname, 'uploads', 'reports'),
  // avatars is intentionally NOT cleared (keep user profile pics)
];

// ─── Helper: Delete all files inside a folder (not the folder itself) ──────────
function clearFolder(folderPath, dryRun = false) {
  if (!fs.existsSync(folderPath)) {
    console.log(`  ⚠️  Folder not found, skipping: ${folderPath}`);
    return 0;
  }

  let count = 0;
  const entries = fs.readdirSync(folderPath, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(folderPath, entry.name);
    if (entry.isDirectory()) {
      // Recursively clear subfolders
      count += clearFolder(fullPath, dryRun);
      if (!dryRun) {
        try { fs.rmdirSync(fullPath); } catch (_) {}
      }
    } else {
      count++;
      if (!dryRun) {
        fs.unlinkSync(fullPath);
      }
    }
  }

  return count;
}

// ─── Main Reset Function ────────────────────────────────────────────────────────
async function resetSystem(dryRun = true) {
  try {
    await db.ready; // Wait for DB to be fully initialized
    console.log('\n' + '='.repeat(65));
    console.log(dryRun 
      ? '🔍  DRY RUN MODE — No changes will be made'
      : '🚨  LIVE RESET — All data will be permanently deleted!'
    );
    console.log('='.repeat(65));

    // ── Step 1: Show / Clear Database Tables ──────────────────────────────────
    console.log('\n📋  DATABASE TABLES:\n');

    const modelNames = Object.keys(db.models);
    const toSkip = [];
    const toClear = [];

    for (const modelName of modelNames) {
      if (SKIP_MODELS.includes(modelName)) {
        toSkip.push(modelName);
      } else {
        toClear.push(modelName);
      }
    }

    console.log('  ⏭️  KEEPING (will not be cleared):');
    for (const name of toSkip) {
      const tableName = db.models[name].tableName;
      console.log(`       • ${tableName} (${name})`);
    }

    console.log('\n  🗑️  WILL BE CLEARED & RESET TO ID=1:');
    for (const name of toClear) {
      const tableName = db.models[name].tableName;
      console.log(`       • ${tableName} (${name})`);
    }

    if (!dryRun) {
      console.log('\n  ⏳  Clearing tables...\n');
      await db.sequelize.query('SET FOREIGN_KEY_CHECKS = 0;');

      for (const name of toClear) {
        const model = db.models[name];
        const tableName = model.tableName;
        try {
          await db.sequelize.query(`TRUNCATE TABLE \`${tableName}\`;`);
          console.log(`  ✅  Cleared: ${tableName}`);
        } catch (err) {
          console.error(`  ❌  Failed to clear ${tableName}: ${err.message}`);
        }
      }

      await db.sequelize.query('SET FOREIGN_KEY_CHECKS = 1;');
      console.log('\n  ✅  All tables cleared. Auto-increment reset to 1.');
    }

    // ── Step 2: Show / Clear Upload Files ─────────────────────────────────────
    console.log('\n📁  UPLOAD FILES:\n');
    console.log('  ⏭️  KEEPING: uploads/avatars/ (user profile pictures)');
    console.log('\n  🗑️  WILL BE CLEARED:');

    let totalFiles = 0;
    for (const folder of UPLOAD_FOLDERS_TO_CLEAR) {
      const folderName = path.relative(path.join(__dirname, 'uploads'), folder);
      const count = clearFolder(folder, true); // always dry-count first
      console.log(`       • uploads/${folderName}/ — ${count} file(s)`);
      if (!dryRun) {
        clearFolder(folder, false);
        totalFiles += count;
      } else {
        totalFiles += count;
      }
    }

    if (!dryRun) {
      console.log(`\n  ✅  ${totalFiles} uploaded file(s) deleted.`);
    }

    // ── Summary ───────────────────────────────────────────────────────────────
    console.log('\n' + '='.repeat(65));
    if (dryRun) {
      console.log('✅  DRY RUN COMPLETE.\n');
      console.log('   To perform the actual reset, run:');
      console.log('   👉  node reset_system.js --confirm\n');
    } else {
      console.log('✅  SYSTEM RESET COMPLETE!\n');
      console.log('   • All data cleared (except Users, Roles, Settings)');
      console.log('   • All IDs start from 1 again');
      console.log('   • Uploaded files deleted (avatars kept)\n');
    }
    console.log('='.repeat(65) + '\n');

  } catch (error) {
    console.error('❌  Reset failed:', error.message);
    console.error(error.stack);
  } finally {
    process.exit(0);
  }
}

// ─── Entry Point ───────────────────────────────────────────────────────────────
const isConfirmed = process.argv.includes('--confirm');
resetSystem(!isConfirmed);
