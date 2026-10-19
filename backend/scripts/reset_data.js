/**
 * reset_data.js — Full System Data Reset Script
 *
 * ✅ KEEPS:   users table, roles table (with original data + IDs)
 * ❌ CLEARS:  ALL other tables (MC, Mcom, CFiles, Complaints, etc.)
 * 🔄 RESETS:  Auto-increment IDs to 1 for ALL cleared tables
 *
 * HOW TO RUN:
 *   cd c:\Users\arosh\Downloads\CCU_CMA\backend
 *   node scripts/reset_data.js
 */

require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const { Sequelize } = require('sequelize');

const dbName = process.env.DB_NAME || 'cma_db';
const dbUser = process.env.DB_USER || 'root';
const dbPass = process.env.DB_PASS || '';
const dbHost = process.env.DB_HOST || 'localhost';

const sequelize = new Sequelize(dbName, dbUser, dbPass, {
  host: dbHost,
  dialect: 'mysql',
  logging: false,
});

// ── Tables to CLEAR (all except users and roles) ──────────────────────────────
const TABLES_TO_CLEAR = [
  'notification_reads',
  'notifications',
  'chat_messages',
  'user_preferences',
  'user_drafts',
  'calendar_events',
  'system_logs',
  'daily_activities',
  'agm_records',
  'renewals',
  'registration_payable_invoices',
  'report_documents',
  'customer_histories',
  'discussions',
  'complaints',
  'c_files',
  'mcom_records',
  'management_corporations',
  'settings',
];

async function resetData() {
  try {
    await sequelize.authenticate();
    console.log('✅ Connected to database:', dbName);

    // Disable foreign key checks so we can truncate in any order
    await sequelize.query('SET FOREIGN_KEY_CHECKS = 0;');
    console.log('🔓 Foreign key checks disabled');

    for (const table of TABLES_TO_CLEAR) {
      try {
        await sequelize.query(`TRUNCATE TABLE \`${table}\`;`);
        console.log(`  🗑️  Cleared & reset: ${table}`);
      } catch (err) {
        // Table might not exist yet — skip gracefully
        if (err.original?.code === 'ER_NO_SUCH_TABLE') {
          console.log(`  ⚠️  Table not found (skipped): ${table}`);
        } else {
          console.error(`  ❌  Error clearing ${table}:`, err.message);
        }
      }
    }

    // Re-enable foreign key checks
    await sequelize.query('SET FOREIGN_KEY_CHECKS = 1;');
    console.log('🔒 Foreign key checks re-enabled');

    // Reset auto-increment for users and roles to start from next ID
    // (We keep the data but reset so IDs continue sequentially)
    const [[usersMax]] = await sequelize.query('SELECT MAX(id) AS max_id FROM users;');
    const [[rolesMax]] = await sequelize.query('SELECT MAX(id) AS max_id FROM roles;');

    const nextUserId = (usersMax?.max_id ?? 0) + 1;
    const nextRoleId = (rolesMax?.max_id ?? 0) + 1;

    await sequelize.query(`ALTER TABLE users AUTO_INCREMENT = ${nextUserId};`);
    await sequelize.query(`ALTER TABLE roles AUTO_INCREMENT = ${nextRoleId};`);
    console.log(`✅ Users table kept — next auto-increment: ${nextUserId}`);
    console.log(`✅ Roles table kept — next auto-increment: ${nextRoleId}`);

    console.log('\n🎉 System data reset complete!');
    console.log('   • Users and Roles: PRESERVED (unchanged)');
    console.log('   • All other tables: CLEARED, IDs reset to 1');
    console.log('\n   You can now restart the backend server.\n');

    await sequelize.close();
    process.exit(0);
  } catch (err) {
    console.error('\n❌ Reset failed:', err.message);
    await sequelize.close();
    process.exit(1);
  }
}

resetData();
