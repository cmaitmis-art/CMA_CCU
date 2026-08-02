/**
 * db.js — Database Connection Module
 * 
 * This file sets up the SQLite database connection using Sequelize ORM.
 * 
 * WHAT THIS FILE DOES:
 * 1. Creates the 'data' folder if it doesn't exist
 * 2. Connects to the SQLite database file (cma.db)
 * 3. Loads all Sequelize models (tables) from the models/ folder
 * 4. Syncs the database schema (creates tables if missing)
 * 5. Seeds default data (complaint categories + default users)
 * 6. Exports everything other files need: { sequelize, models, ready, dbPath }
 * 
 * NOTE: We use Sequelize as the ONLY database driver. No raw sqlite3 calls.
 * This keeps the code consistent — all queries go through Sequelize models.
 */

// Shim Sequelize.Op for Sequelize v3 compatibility
const sequelizeModule = require('sequelize');
sequelizeModule.Op = sequelizeModule.Op || {
  like: '$like',
  or: '$or',
  and: '$and',
  lte: '$lte',
  gte: '$gte',
  lt: '$lt',
  gt: '$gt',
  ne: '$ne',
  in: '$in',
  notIn: '$notIn',
  eq: '$eq',
};
if (sequelizeModule.Model && !sequelizeModule.Model.prototype.findByPk) {
  sequelizeModule.Model.prototype.findByPk = sequelizeModule.Model.prototype.findById;
}

const path = require('path');
const fs = require('fs');
const { Sequelize } = require('sequelize');
const initializeModels = require('./models');

// ── Step 1: Ensure the 'data' directory exists ──────────────────────────────
// The SQLite database file lives inside backend/data/cma.db.
// We create the folder on startup so the app works on a fresh clone.
const dataDir = path.resolve(__dirname, 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

// ── Step 2: Create the Sequelize connection ─────────────────────────────────
// 'storage' tells Sequelize where to put the SQLite file on disk.
// 'logging: false' silences the SQL query logs in the console.
const dbPath = path.join(dataDir, 'cma.db');
const sequelize = new Sequelize({
  dialect: 'sqlite',
  storage: dbPath,
  logging: false,
});

// ── Step 3: Load all model definitions ──────────────────────────────────────
// initializeModels() reads each model file (users, complaints, etc.),
// registers them with Sequelize, and sets up foreign key relationships.
const models = initializeModels(sequelize);

// ── Step 4: Authenticate, sync schema, and seed default data ────────────────
// 'ready' is a Promise that resolves when the database is fully set up.
// Other files (like index.js) wait for this before starting the server.
const ready = sequelize
  .authenticate()
  .then(() => sequelize.query('PRAGMA journal_mode = WAL;'))
  .then(() => sequelize.query('PRAGMA synchronous = NORMAL;'))
  .then(() => sequelize.query('PRAGMA cache_size = -10000;')) // 10MB cache
  .then(() => {
    console.log('✅ Database connection authenticated & optimized');
    // sync() creates any missing tables based on model definitions.
    // It does NOT drop or alter existing tables — safe for production.
    return sequelize.sync();
  })
  .then(async () => {
    console.log('✅ Database schema synced (tables created/verified)');

    // List all models that were created
    console.log('📋 Models loaded:', Object.keys(models).join(', '));

    // Verify critical tables exist
    const criticalTables = ['discussions', 'complaints', 'users'];
    const qi = sequelize.getQueryInterface();

    for (const table of criticalTables) {
      try {
        const tableInfo = await qi.describeTable(table);
        console.log(`✅ Table '${table}' verified:`, Object.keys(tableInfo).slice(0, 3).join(', '), '...');
      } catch (err) {
        console.warn(`⚠️  Table '${table}' check failed:`, err.message);
      }
    }

    // ── Ensure notification_reads table exists (idempotent) ─────────────────
    // This table was added after initial release. Existing DBs won't have it
    // until synced. We create it explicitly so it works immediately without
    // requiring a fresh database.
    try {
      await sequelize.query(`
        CREATE TABLE IF NOT EXISTS notification_reads (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id INTEGER NOT NULL,
          notification_id INTEGER NOT NULL,
          dismissed_at DATETIME NOT NULL DEFAULT (datetime('now')),
          UNIQUE(user_id, notification_id)
        );
      `, { raw: true });
      console.log('✅ notification_reads table ensured');
    } catch (err) {
      console.warn('⚠️  Could not ensure notification_reads table:', err.message);
    }

    // ── SQLite schema fix (idempotent) ─────────────────────────────────────
    // Problem: existing deployments may have created tables before the
    // Sequelize models included audit columns (`created_by`, `modified_by`).
    // Sequelize sync() won't add missing columns to an existing table.
    // Fix: perform safe ALTER TABLE additions for multiple tables.
    // NOTE: Discussion table also needs audit columns.
    const auditColumnsTables = [
      'cfiles',
      'mcom_records',
      'management_corporations',
      'complaints',
      'discussions',
      'report_documents',
    ];

    // ── MC UI fields schema fix (idempotent) ─────────────────────────────
    // Some UI columns are not present in older DBs.
    // We add them safely if missing.
    // NOTE: SQLite supports ALTER TABLE ADD COLUMN (no type enforcement needed).
    const mcFieldsToEnsure = [
      // RegistrationForm.jsx: services
      'services_lift', 'services_fire_agreement', 'services_generator_agreement', 'services_insurance',

      // RegistrationForm.jsx: parcel breakdown and council members
      'non_res_shops', 'non_res_office', 'non_res_hotel', 'council_members',

      // RegistrationForm.jsx: facilities
      'fac_common_parking', 'fac_accessory_car_parcel', 'fac_roof_top', 'fac_gym',
      'fac_swimming_pool', 'fac_penth_house', 'fac_restaurant', 'fac_super_market',
      'fac_garden', 'fac_sauna', 'fac_salon', 'fac_golf_tennis', 'fac_day_care',
      'fac_lift', 'fac_service_lift', 'fac_club_house', 'fac_canteen',

      // RegistrationForm.jsx: mgmt company
      'mgmt_company_controlled', 'mgmt_company_name', 'mgmt_company_contact',

      // RegistrationForm.jsx: contacts
      'secretary_contact', 'secretary_email', 'treasurer_contact', 'treasurer_email',

      // Checklist columns + note
      'approval_note',

      // checklist: check + fields
      'cl_reg_condo_plan',
      'cl_parcels_total', 'cl_parcels_residential', 'cl_parcels_office', 'cl_parcels_shops', 'cl_parcels_hotels', 'cl_parcels_service',
      'cl_services_facilities',
      'cl_written_assurance',

      'cl_photocopy_condo_plan', 'cl_photocopy_condo_plan_date',
      'cl_cma_certificate', 'cl_cma_certificate_no', 'cl_cma_certificate_date',
      'cl_declaration', 'cl_declaration_no', 'cl_declaration_date',
      'cl_agm_minutes', 'cl_agm_minutes_date',
      'cl_attendance', 'cl_attendance_total', 'cl_attendance_physically', 'cl_attendance_proxy',
      'cl_insurance', 'cl_insurance_from', 'cl_insurance_to',
      'cl_owners_list',
      'cl_constitution',
      'cl_bylaws',
      'cl_additional_bylaws',
      'cl_checked_by',
      'cl_checked_date',

      // page-count blanks
      'cl_parcels_total_pg', 'cl_parcels_residential_pg', 'cl_parcels_office_pg', 'cl_parcels_shops_pg', 'cl_parcels_hotels_pg', 'cl_parcels_service_pg',
      'cl_services_facilities_pg', 'cl_written_assurance_pg',
      'cl_photocopy_condo_plan_pg', 'cl_cma_certificate_pg', 'cl_declaration_pg', 'cl_agm_minutes_pg', 'cl_attendance_pg',
      'cl_insurance_pg', 'cl_owners_list_pg', 'cl_constitution_pg', 'cl_bylaws_pg', 'cl_additional_bylaws_pg',

      // RegistrationForm.jsx boolean
      'written_assurance_fulfilled',

      // Fee calculation and category selection
      'ownership_type', 'government_income_level', 'private_category_override',
      'fee_rate_per_unit', 'fee_amount', 'sscl_amount', 'vat_amount', 'total_amount',
      'next_renewal_date', 'renewal_payment_status',
      'renewal_paid', 'renewal_paid_date', 'renewal_paid_amount', 'renewal_paid_year',
      'renewal_receipt_no', 'acknowledgement_no', 'acknowledgement_date',
    ];

    try {
      const describe = await sequelize.getQueryInterface().describeTable('management_corporations');
      for (const col of mcFieldsToEnsure) {
        if (!Object.prototype.hasOwnProperty.call(describe, col)) {
          await sequelize.query(`ALTER TABLE management_corporations ADD COLUMN ${col} TEXT;`, { raw: true });
        }
      }
    } catch (err) {
      // If table doesn't exist yet, skip; sequelize.sync() will create it.
      const msg = String(err?.message || '');
      if (!/no such table/i.test(msg) && !/does not exist/i.test(msg)) {
        throw err;
      }
    }

    // ── M.Com fields (idempotent) ───────────────────────────────
    const mcomRenewalFields = [
      'remark', 'active_non_active', 'renewal_date_vise', 'agm_date_vise',
      'renewal_paid', 'renewal_paid_date', 'renewal_paid_amount', 'renewal_paid_year',
      'renewal_receipt_no', 'acknowledgement_no', 'acknowledgement_date',
      'renewal_payment_status', 'next_renewal_date',
    ];
    try {
      const describe = await sequelize.getQueryInterface().describeTable('mcom_records');
      for (const col of mcomRenewalFields) {
        if (!Object.prototype.hasOwnProperty.call(describe, col)) {
          await sequelize.query(`ALTER TABLE mcom_records ADD COLUMN ${col} TEXT;`, { raw: true });
        }
      }
    } catch (err) {
      const msg = String(err?.message || '');
      if (!/no such table/i.test(msg) && !/does not exist/i.test(msg)) {
        throw err;
      }
    }

    // Add optional avatar_url field to users if not present.
    try {
      const describeUsers = await sequelize.getQueryInterface().describeTable('users');
      if (!Object.prototype.hasOwnProperty.call(describeUsers, 'avatar_url')) {
        await sequelize.query(`ALTER TABLE users ADD COLUMN avatar_url TEXT;`, { raw: true });
      }
      if (!Object.prototype.hasOwnProperty.call(describeUsers, 'is_online')) {
        await sequelize.query(`ALTER TABLE users ADD COLUMN is_online BOOLEAN DEFAULT 0;`, { raw: true });
      }
      if (!Object.prototype.hasOwnProperty.call(describeUsers, 'last_active')) {
        await sequelize.query(`ALTER TABLE users ADD COLUMN last_active DATETIME;`, { raw: true });
      }
      if (!Object.prototype.hasOwnProperty.call(describeUsers, 'is_deleted')) {
        await sequelize.query(`ALTER TABLE users ADD COLUMN is_deleted BOOLEAN DEFAULT 0;`, { raw: true });
      }
    } catch (err) {
      const msg = String(err?.message || '');
      if (!/no such table/i.test(msg) && !/does not exist/i.test(msg)) {
        throw err;
      }
    }

    for (const tableName of auditColumnsTables) {
      try {
        const qi = sequelize.getQueryInterface();
        const describe = await qi.describeTable(tableName);

        const hasCreatedBy = Object.prototype.hasOwnProperty.call(describe, 'created_by');
        const hasModifiedBy = Object.prototype.hasOwnProperty.call(describe, 'modified_by');
        const hasCreatedAt = Object.prototype.hasOwnProperty.call(describe, 'created_at');
        const hasUpdatedAt = Object.prototype.hasOwnProperty.call(describe, 'updated_at');
        const hasHistory = Object.prototype.hasOwnProperty.call(describe, 'history');

        // Support both naming variants:
        // - discussions uses created_by/modified_by/history
        // - some other tables may use created_by/updated_by/deleted_by
        if (!hasCreatedBy) {
          await sequelize.query(`ALTER TABLE ${tableName} ADD COLUMN created_by TEXT;`, {
            raw: true,
          });
        }
        if (!hasModifiedBy) {
          // prefer modified_by if schema expects it
          await sequelize.query(`ALTER TABLE ${tableName} ADD COLUMN modified_by TEXT;`, {
            raw: true,
          });
        }

        // If the model uses updated_by/deleted_by, ensure they exist too.
        const hasUpdatedBy = Object.prototype.hasOwnProperty.call(describe, 'updated_by');
        const hasDeletedBy = Object.prototype.hasOwnProperty.call(describe, 'deleted_by');

        if (!hasUpdatedBy) {
          await sequelize.query(`ALTER TABLE ${tableName} ADD COLUMN updated_by TEXT;`, {
            raw: true,
          });
        }
        if (!hasDeletedBy) {
          await sequelize.query(`ALTER TABLE ${tableName} ADD COLUMN deleted_by TEXT;`, {
            raw: true,
          });
        }
        if (!hasCreatedAt) {
          await sequelize.query(`ALTER TABLE ${tableName} ADD COLUMN created_at DATETIME;`, {
            raw: true,
          });
        }
        if (!hasUpdatedAt) {
          await sequelize.query(`ALTER TABLE ${tableName} ADD COLUMN updated_at DATETIME;`, {
            raw: true,
          });
        }
        if (!hasHistory) {
          await sequelize.query(`ALTER TABLE ${tableName} ADD COLUMN history TEXT;`, {
            raw: true,
          });
        }
      } catch (err) {
        const msg = String(err?.message || '');
        const tableMissing = /no such table/i.test(msg) || /does not exist/i.test(msg);
        // If a table doesn't exist yet, let sequelize.sync() handle it.
        if (!tableMissing) throw err;
      }
    }

    // ── Ensure document upload fields exist on cfiles and complaints ─────────
    const docTables = ['cfiles', 'complaints'];
    for (const tableName of docTables) {
      try {
        const qi = sequelize.getQueryInterface();
        const describe = await qi.describeTable(tableName);
        if (!Object.prototype.hasOwnProperty.call(describe, 'document_path')) {
          await sequelize.query(`ALTER TABLE ${tableName} ADD COLUMN document_path TEXT;`, { raw: true });
        }
        if (!Object.prototype.hasOwnProperty.call(describe, 'document_name')) {
          await sequelize.query(`ALTER TABLE ${tableName} ADD COLUMN document_name TEXT;`, { raw: true });
        }
      } catch (err) {
        const msg = String(err?.message || '');
        if (!/no such table/i.test(msg) && !/does not exist/i.test(msg)) {
          console.warn(`⚠️ Could not ensure document fields on ${tableName}:`, err.message);
        }
      }
    }

    // ── Remove UNIQUE constraints/indexes from discussions table (if they exist) ─────
    // SQLite doesn't support DROP CONSTRAINT, so we must remove uniqueness in a robust way.
    // Strategy:
    // 1) Drop UNIQUE indexes (easy + safe)
    // 2) If UNIQUE still exists (likely UNIQUE table constraints), rebuild the table.
    //
    // This fixes bulk-import failures like:
    // "Failed to import any rows. A discussion with this unknown field already exists."
    try {
      const uniqueItemsQuery = `
        SELECT name, type, sql
        FROM sqlite_master
        WHERE tbl_name='discussions'
          AND sql IS NOT NULL
          AND UPPER(sql) LIKE '%UNIQUE%'
      `;

      const uniqueIndexQuery = `
        SELECT name, sql
        FROM sqlite_master
        WHERE type='index'
          AND tbl_name='discussions'
      `;

      const uniqueItemsRows = await sequelize.query(uniqueItemsQuery, { raw: true });
      const uniqueItems = (uniqueItemsRows || []).filter(r => typeof r?.sql === 'string' && r.sql.toUpperCase().includes('UNIQUE'));

      if (uniqueItems.length === 0) {
        console.log('✅ No UNIQUE constraints/indexes detected on discussions.');
      } else {
        console.warn(`⚠️ Detected UNIQUE constraint(s)/index(es) on discussions (${uniqueItems.length}). Attempting cleanup...`);

        // 1) Drop UNIQUE indexes
        const uniqueIndexRows = await sequelize.query(uniqueIndexQuery, { raw: true });
        const uniqueIndexes = (uniqueIndexRows || [])
          .filter(r => typeof r?.sql === 'string' && r.sql.toUpperCase().includes('UNIQUE'))
          .map(r => r?.name)
          .filter(name => typeof name === 'string' && name.trim().length > 0);

        if (uniqueIndexes.length > 0) {
          console.log(`Found ${uniqueIndexes.length} UNIQUE index(es). Dropping...`);
          for (const indexName of uniqueIndexes) {
            try {
              await sequelize.query(
                `DROP INDEX IF EXISTS "${indexName.replace(/"/g, '""')}";`,
                { raw: true }
              );
              console.log(`Dropped unique index: ${indexName}`);
            } catch (dropErr) {
              console.warn(`Could not drop unique index ${indexName}:`, dropErr.message);
            }
          }
        } else {
          console.log('No UNIQUE indexes found to drop.');
        }

        // 2) Re-check; if still present, rebuild table.
        const remainingItemsRows = await sequelize.query(uniqueItemsQuery, { raw: true });
        const remainingItems = (remainingItemsRows || []).filter(r => typeof r?.sql === 'string' && r.sql.toUpperCase().includes('UNIQUE'));

        if (remainingItems.length > 0) {
          console.warn(`⚠️ UNIQUE still detected (${remainingItems.length}) after index drop. Rebuilding discussions table...`);

          // Rename old (if discussions_old already exists, drop it to keep rebuild idempotent)
          await sequelize.query(`DROP TABLE IF EXISTS discussions_old;`, { raw: true });
          await sequelize.query(`ALTER TABLE discussions RENAME TO discussions_old;`, { raw: true });

          // Recreate discussions table using Sequelize model definition
          await models.Discussion.sync({ force: false });


          // Copy data across for common columns
          const oldColsInfo = await sequelize.getQueryInterface().describeTable('discussions_old');
          const newColsInfo = await sequelize.getQueryInterface().describeTable('discussions');

          const commonCols = Object.keys(newColsInfo).filter(c => Object.prototype.hasOwnProperty.call(oldColsInfo, c));

          if (commonCols.length === 0) {
            throw new Error('Rebuild failed: no common columns between discussions_old and discussions');
          }

          const colsSql = commonCols.map(c => `"${c.replace(/"/g, '""')}"`).join(', ');
          const selectSql = commonCols.map(c => `"${c.replace(/"/g, '""')}"`).join(', ');

          await sequelize.query(
            `INSERT INTO discussions (${colsSql}) SELECT ${selectSql} FROM discussions_old;`,
            { raw: true }
          );

          await sequelize.query(`DROP TABLE discussions_old;`, { raw: true });

          console.log('✅ discussions table rebuild completed.');
        } else {
          console.log('✅ UNIQUE constraints removed after index drop.');
        }
      }

      // Final verification logging
      const finalRows = await sequelize.query(uniqueItemsQuery, { raw: true });
      const finalUnique = (finalRows || []).filter(r => typeof r?.sql === 'string' && r.sql.toUpperCase().includes('UNIQUE'));
      if (finalUnique.length > 0) {
        console.warn('⚠️ After cleanup, UNIQUE constraints/indexes still detected on discussions:', finalUnique.map(u => u?.name).filter(Boolean));
      } else {
        console.log('🎯 Final check: no UNIQUE constraints/indexes detected on discussions.');
      }
    } catch (err) {
      console.warn('Warning: Could not check/remove/rebuild UNIQUE constraints from discussions table:', err.message);
      // Don't fail the entire database initialization for this
    }


    // Complaint category seeding is intentionally skipped because the related table
    // has been removed from the active database.

    // ── Seed default users so backend auth works out of the box. ─────────
    const defaultUsers = [
      { username: 'admin', password: 'password', name: 'K. D. Silva', role: 'Admin', email: 'admin@example.com' },
      { username: 'admin02', password: 'password', name: 'R. M. Perera', role: 'Admin', email: 'admin.perera@example.com' },
      { username: 'Chaminda', password: 'password', name: 'Chaminda', role: 'MA', email: 'ma@example.com' },
      { username: 'Anushka', password: 'password', name: 'Anushka', role: 'MA', email: 'ma1@example.com' },
      { username: 'Chandana', password: 'password', name: 'Chandana', role: 'MA', email: 'ma.bandara@example.com' },
      { username: 'Nithya', password: 'password', name: 'Nithya', role: 'MA', email: 'ma.dissanayake@example.com' },
      { username: 'Surany', password: 'password', name: 'Surany', role: 'MA', email: 'ma.wickrama@example.com' },
      { username: 'Stela', password: 'password', name: 'Stela', role: 'MA', email: 'ma.gunawardena@example.com' },
      { username: 'Kapila', password: 'password', name: 'Kapila', role: 'MA', email: 'ma.ranasinghe@example.com' },
      { username: 'ma.seneviratne', password: 'password', name: 'Harsha', role: 'MA', email: 'ma.seneviratne@example.com' },
      { username: 'Harsha', password: 'password', name: 'Other unknown', role: 'MA', email: 'ma.rajapaksa@example.com' },
      { username: 'ma.karunarathne', password: 'password', name: 'Other unknown', role: 'MA', email: 'ma.karunarathne@example.com' },
      { username: 'ma.liyanage', password: 'password', name: 'Other unknown', role: 'MA', email: 'ma.liyanage@example.com' },
      { username: 'ma.amarasinghe', password: 'password', name: 'Other unknown', role: 'MA', email: 'ma.amarasinghe@example.com' },
      { username: 'agm', password: 'password', name: 'Smantha Ampaala', role: 'AGM', email: 'agm@example.com' },
    ];

    // Seed default users in a non-destructive way.
    // We only create missing accounts and preserve any user changes made through the admin UX.
    for (const user of defaultUsers) {
      const normalizedUsername = String(user.username || '').trim().toLowerCase();
      if (!normalizedUsername) continue;

      await models.User.findOrCreate({
        where: { username: normalizedUsername },
        defaults: {
          username: normalizedUsername,
          password: String(user.password),
          name: String(user.name),
          role: String(user.role),
          email: String(user.email || '').trim() || null,
        },
      });
    }

    console.log('✅ Default users seeded');
    console.log('✅ Database initialization complete!');
    console.log(`📁 Database file: ${dbPath}`);
  })
  .catch((err) => {
    // If anything fails during setup, log details and exit.
    // The server should NOT start with a broken database.
    console.error('Database initialization failed:');
    console.error('  name:', err?.name);
    console.error('  message:', err?.message);
    console.error('  stack:', err?.stack);
    process.exit(1);
  });

// ── Step 5: Export the database object ──────────────────────────────────────
// Other files import this and use:
//   db.models.Complaint — to query the complaints table
//   db.sequelize        — for transactions or raw queries
//   db.ready            — to wait for setup before starting the server
//   db.dbPath           — used by the backup utility to find the .db file
module.exports = {
  sequelize,
  models,
  ready,
  dbPath,
};