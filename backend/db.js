/**
 * db.js — Database Connection Module
 * 
 * This file sets up the MySQL database connection using Sequelize ORM.
 * 
 * WHAT THIS FILE DOES:
 * 1. Connects to the MySQL database.
 * 2. Loads all Sequelize models (tables) from the models/ folder
 * 3. Syncs the database schema (creates tables if missing)
 * 4. Seeds default users
 * 5. Exports everything other files need: { sequelize, models, ready }
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

const { Sequelize } = require('sequelize');
const bcrypt = require('bcryptjs');
const initializeModels = require('./models');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '.env') });
require('dotenv').config();

const cleanEnv = (val) => {
  if (!val) return '';
  let s = String(val).trim();
  if ((s.startsWith('"') && s.endsWith('"')) || (s.startsWith("'") && s.endsWith("'"))) {
    s = s.slice(1, -1);
  }
  return s.trim();
};

// ── Step 1: Create the Sequelize connection ─────────────────────────────────
const dbName = cleanEnv(process.env.DB_NAME) || 'cma_db';
const dbUser = cleanEnv(process.env.DB_USER) || 'root';
const dbPass = cleanEnv(process.env.DB_PASS) || '';
const dbHost = cleanEnv(process.env.DB_HOST) || 'localhost';
const dbPort = process.env.DB_PORT ? parseInt(cleanEnv(process.env.DB_PORT), 10) : 3306;

const sequelize = new Sequelize(dbName, dbUser, dbPass, {
  host: dbHost,
  port: dbPort,
  dialect: 'mysql',
  logging: false,
  pool: {
    max: 10,
    min: 0,
    acquire: 30000,
    idle: 10000,
    afterCreate: (connection, done) => {
      connection.query('SET SESSION sql_mode = ""', (err) => done(err, connection));
    }
  }
});

// ── Step 2: Load all model definitions ──────────────────────────────────────
const models = initializeModels(sequelize);

// ── Step 3: Authenticate, sync schema, and seed default data ────────────────
const ready = sequelize
  .authenticate()
  .then(() => {
    console.log('✅ Database connection authenticated');
    return sequelize.sync();
  })
  .then(async () => {
    console.log('✅ Database schema synced (tables created/verified)');
    console.log('📋 Models loaded:', Object.keys(models).join(', '));

    // ── Seed default users so backend auth works out of the box. ─────────
    const defaultUsers = [
      { username: 'admin', password: 'password', name: 'Admin', role: 'Admin', email: 'admin@example.com' },
    ];

    // Seed default users in a non-destructive way.
    // We only create missing accounts and preserve any user changes made through the admin UX.
    for (const user of defaultUsers) {
      const normalizedUsername = String(user.username || '').trim().toLowerCase();
      if (!normalizedUsername) continue;
      const existingUser = await models.User.findOne({ where: { username: normalizedUsername } });
      if (!existingUser) {
        const hashedPassword = await bcrypt.hash(user.password, 10);
        await models.User.create({
          ...user,
          password: hashedPassword,
          username: normalizedUsername,
        });
      }
    }

    console.log('✅ Default users seeded');
    console.log('✅ Database initialization complete!');
  })
  .catch((err) => {
    console.error('Database initialization failed:');
    console.error('  name:', err?.name);
    console.error('  message:', err?.message);
    console.error('  stack:', err?.stack);
    // Keep process alive so Express can serve the frontend and report API status
  });

module.exports = {
  sequelize,
  models,
  ready,
};