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
require('dotenv').config();

// ── Step 1: Create the Sequelize connection ─────────────────────────────────
const dbName = process.env.DB_NAME || 'cma_db';
const dbUser = process.env.DB_USER || 'root';
const dbPass = process.env.DB_PASS || '';
const dbHost = process.env.DB_HOST || 'localhost';

const sequelize = new Sequelize(dbName, dbUser, dbPass, {
  host: dbHost,
  dialect: 'mysql',
  logging: false,
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
    process.exit(1);
  });

module.exports = {
  sequelize,
  models,
  ready,
};