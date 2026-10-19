/**
 * index.js — Backend API Server Entry Point
 * 
 * WHAT THIS FILE DOES:
 * 1. Configures the Express web server
 * 2. Sets up CORS to allow requests from the frontend
 * 3. Mounts all API routes (/api/complaints, /api/mc, etc.)
 * 4. Provides a dashboard stats endpoint
 * 5. Waits for the database to be ready before starting the server
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

const express = require('express');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '.env') });
require('dotenv').config();
const cors = require('cors');
const { Op } = require('sequelize'); // Imported for Sequelize operators
const fileUpload = require('express-fileupload');

// Import logging middleware
const { requestLogger, errorLogger } = require('./utils/logger');

// Import the clean db object we created in db.js
const db = require('./db');

// Import all route handlers
const complaintRoutes = require('./routes/complaints');
const cfilesRoutes = require('./routes/cfiles');
const mcRoutes = require('./routes/mc');
const mcomRoutes = require('./routes/mcom');
const reportDocumentsRoutes = require('./routes/reportDocuments');
const dailyActivitiesRoutes = require('./routes/dailyActivities');
const discussionRoutes = require('./routes/discussion');
const registrationInvoiceRoutes = require('./routes/registrationPayableInvoices');
const authRoutes = require('./routes/auth');
const usersRoutes = require('./routes/users');
const notificationsRoutes = require('./routes/notifications');
const agmRoutes = require('./routes/agm');
const settingsRoutes = require('./routes/settings');
const renewalsRoutes = require('./routes/renewals');
const transcribeRoutes = require('./routes/transcribe');
const emailRoutes = require('./routes/email');
const customerHistoryRoutes = require('./routes/customerHistory.routes');
const chatRoutes = require('./routes/chat');
const calendarEventsRoutes = require('./routes/calendarEvents');
const userPrefsRoutes = require('./routes/userPrefs');
const userDraftsRoutes = require('./routes/userDrafts');

const app = express();
const port = process.env.PORT || 3001;

// ── Configure CORS ──────────────────────────────────────────────────────────
const customOrigins = (process.env.CORS_ORIGIN || '')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

const allowedOriginsSet = new Set([
  'https://ccu.cma.lk',
  'http://ccu.cma.lk',
  'https://cma.lk',
  'http://cma.lk',
  'https://www.cma.lk',
  'http://www.cma.lk',
  'https://cma-ccu.netlify.app',
  ...customOrigins,
]);

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps, curl, server-to-server)
    if (!origin) return callback(null, true);

    // Allow localhost and any private LAN IP on dev ports
    const localhostLanPattern = /^http:\/\/(localhost|127\.0\.0\.1|192\.168\.\d{1,3}\.\d{1,3}|10\.\d{1,3}\.\d{1,3}\.\d{1,3}|172\.(1[6-9]|2\d|3[01])\.\d{1,3}\.\d{1,3})(:\d+)?$/;

    // Check against allowed origins, regex matching *.cma.lk, or LAN/localhost
    if (
      allowedOriginsSet.has(origin) ||
      localhostLanPattern.test(origin) ||
      /^https?:\/\/([a-z0-9-]+\.)*cma\.lk(:\d+)?$/i.test(origin)
    ) {
      callback(null, true);
    } else {
      console.warn(`[CORS] Request blocked from origin: ${origin}`);
      callback(null, false);
    }
  },
  credentials: true,
}));

// Increase payload limits for bulk data imports
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Add logging middleware
app.use(requestLogger);

// Configure file uploads for bulk Excel imports
app.use(fileUpload({
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB limit
  abortOnLimit: true,
  responseOnLimit: 'File size exceeds 50MB limit',
}));

// Serve uploaded report documents and other uploads (static files)
app.use('/uploads', express.static(require('path').resolve(__dirname, 'uploads')));
// (Optional safety) also expose reports uploads directly
app.use('/uploads/reports', express.static(require('path').resolve(__dirname, 'uploads', 'reports')));

// ── Static Frontend Serving (for cPanel Unified Deployment) ─────────────────
const fs = require('fs');

const frontendPublicPath = path.resolve(__dirname, 'public');
const frontendDistPath = path.resolve(__dirname, '../frontend/dist');
const resolvedFrontendPath = fs.existsSync(path.join(frontendPublicPath, 'index.html'))
  ? frontendPublicPath
  : (fs.existsSync(path.join(frontendDistPath, 'index.html')) ? frontendDistPath : null);

if (resolvedFrontendPath) {
  console.log(`📦 Serving frontend static assets from: ${resolvedFrontendPath}`);
  app.use(express.static(resolvedFrontendPath));
}


// ── Mount API Routes ────────────────────────────────────────────────────────

app.use('/api/complaints', complaintRoutes);
app.use('/api/cfiles', cfilesRoutes);
app.use('/api/mc', mcRoutes);
app.use('/api/mcom', mcomRoutes);
app.use('/api/reports', reportDocumentsRoutes);
app.use('/api/registration-invoices', registrationInvoiceRoutes);

app.use('/api/daily-activities', dailyActivitiesRoutes(db.models));
app.use('/api/discussion', discussionRoutes(db.models));
app.use('/api/users', usersRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/notifications', notificationsRoutes);
app.use('/api/agm', agmRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/renewals', renewalsRoutes);
app.use('/api/transcribe', transcribeRoutes);
app.use('/api/roles', require('./routes/roles'));
app.use('/api/send-email', emailRoutes);
app.use('/api/customer-history', customerHistoryRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/calendar-events', calendarEventsRoutes);
app.use('/api/user-prefs', userPrefsRoutes);
app.use('/api/user-drafts', userDraftsRoutes);



// ── GET /api/dashboard/stats ─ Global Dashboard Stats ───────────────────────
// FIX: Converted raw sqlite3 queries to use Sequelize ORM.
// This runs 5 parallel count queries across different tables.
app.get('/api/dashboard/stats', async (req, res) => {
  try {
    const { ManagementCorporation, McomRecord, Cfile, Complaint } = db.models;

    // Calculate 15 days ago for the pending C-Files check
    const fifteenDaysAgo = new Date(Date.now() - 15 * 24 * 60 * 60 * 1000);

    // Run counts sequentially to avoid SQLite lock contention which was causing 2-3s delays
    const mc = await ManagementCorporation.count({ where: { status: 'Active' } });
    const mcTotal = await ManagementCorporation.count();
    const mcom = await McomRecord.count();                        // total mcom records (mcom uses 'New' as default, not 'Active')
    const cfiles = await Cfile.count();
    const pendingCfiles = await Cfile.count({ where: { status: 'Pending', date: { [Op.lte]: fifteenDaysAgo } } });
    const pendingComplaints = await Complaint.count({ where: { status: { [Op.in]: ['New', 'Open', 'Pending'] } } });
    const pendingMc = await ManagementCorporation.count({ where: { status: 'Pending' } });
    const pendingMcom = await McomRecord.count({ where: { status: 'Pending' } });
    const pendingComplaintsOverdue = await Complaint.count({
      where: {
        status: 'Pending',
        received_ccu: { [Op.lt]: fifteenDaysAgo.toISOString().split('T')[0] }
      }
    });
    const complaints = await Complaint.count();
    
    // Also fetch closed files/complaints to replace frontend hardcoded values
    const closedCfiles = await Cfile.count({ where: { status: 'Closed' } });
    const resolvedComplaints = await Complaint.count({ where: { status: 'Closed' } });

    res.json({ mc, mcTotal, mcom, cfiles, pendingCfiles, pendingComplaints, pendingMc, pendingMcom, pendingComplaintsOverdue, complaints, closedCfiles, resolvedComplaints });
  } catch (err) {
    console.error('Dashboard stats error:', err.message);
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

// ── Health Check Endpoint with Database Diagnostics ────────────────────────
app.get('/api/health', async (req, res) => {
  let dbStatus = 'connecting';
  let dbError = null;
  let userCount = null;
  try {
    await db.sequelize.authenticate();
    dbStatus = 'connected';
    if (db.models.User) {
      userCount = await db.models.User.count().catch(() => null);
    }
  } catch (err) {
    dbStatus = 'error';
    dbError = err?.parent?.sqlMessage || err?.original?.message || err?.message || String(err);
  }

  res.json({
    status: 'ok',
    message: 'Backend API is running',
    timestamp: new Date().toISOString(),
    database: {
      status: dbStatus,
      error: dbError,
      usersInDatabase: userCount,
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || 3306,
      database: process.env.DB_NAME || 'cmauser_ccu',
      user: process.env.DB_USER || 'cmauser_ccuuser',
    }
  });
});

// ── GET /api/server-time ─ Provide Server Time to Frontend ──────────────
app.get('/api/server-time', (req, res) => {
  res.json({ serverTime: new Date().toISOString() });
});

// ── SPA Routing Fallback & 404 Handler ──────────────────────────────────────
if (resolvedFrontendPath) {
  // If React production build exists, serve index.html for all frontend routes
  app.get('*', (req, res, next) => {
    // Don't intercept API or upload routes
    if (req.path.startsWith('/api') || req.path.startsWith('/uploads')) {
      return next();
    }
    res.sendFile(path.join(resolvedFrontendPath, 'index.html'), (err) => {
      if (err && !res.headersSent) {
        res.status(200).send('<!DOCTYPE html><html><head><title>CMA CCU</title></head><body><h1>CMA CCU System</h1><p>Application is running.</p></body></html>');
      }
    });
  });
} else {
  // If running backend alone in dev mode
  app.get('/', (req, res) => {
    res.json({ message: 'Backend API is running', apiBase: '/api' });
  });
}

// 404 for unhandled API endpoints
app.use((req, res) => {
  res.status(404).json({ error: 'Not Found' });
});




async function startDailyCmaBackups({ intervalMs }) {
  const { createSqlBackup } = require('./utils/sqlbackup');

  // Run immediately on schedule start (but only after DB is ready)
  const runOnce = async (tag) => {
    try {
      const savedPath = await createSqlBackup();
      console.log(`[Daily SQL Backup][${tag}] saved:`, savedPath);
    } catch (err) {
      console.error(`[Daily SQL Backup][${tag}] failed:`, err?.message || err);
    }
  };

  // Calculate ms until next occurrence of target hour:minute (local time)
  // We will schedule two runs daily: 12:00 AM (00:00) and 12:00 PM (12:00).
  const scheduleAt = (targetHour, targetMinute) => {
    const now = new Date();
    const next = new Date(now);
    next.setHours(targetHour, targetMinute, 0, 0);
    if (next <= now) next.setDate(next.getDate() + 1);

    const delay = next.getTime() - now.getTime();

    setTimeout(async () => {
      await runOnce(`${String(targetHour).padStart(2, '0')}:${String(targetMinute).padStart(2, '0')}`);
      // After first run, repeat every 24h
      setInterval(() => runOnce(`${String(targetHour).padStart(2, '0')}:${String(targetMinute).padStart(2, '0')}`), intervalMs);
    }, delay);

    console.log(`[Daily SQL Backup] Scheduled at ${String(targetHour).padStart(2, '0')}:${String(targetMinute).padStart(2, '0')} local time (in ${Math.round(delay / 1000)}s)`);
  };

  // 12:00 AM and 12:00 PM
  scheduleAt(0, 0);
  scheduleAt(12, 0);

  // Also trigger one immediate backup on startup
  await runOnce('startup');
}

// ── Auto Renewal Status Check ────────────────────────────────────────────────
// Runs daily at midnight (and once on startup). Finds any MC or M.Com record
// whose renewal year is overdue (Dec 31 of the due year has already passed
// and payment has NOT been recorded/approved for that year) and marks it as
// 'Non Active'. This ensures statuses are always up-to-date without manual
// intervention.
async function runRenewalStatusCheck(models) {
  const { ManagementCorporation, McomRecord } = models;
  const now = new Date();
  const currentYear = now.getFullYear();

  // Helper: extract the latest paid year from a record's renewal fields.
  // Priority: renewal_paid_year (integer) → renewal_paid_years (CSV) → renewal_period (text fallback)
  function getLastPaidYear(record) {
    // 1. Prefer the direct integer field first
    if (record.renewal_paid_year) {
      const direct = parseInt(record.renewal_paid_year, 10);
      if (!isNaN(direct) && direct > 1990) return direct;
    }
    // 2. Check the CSV list of paid years
    if (record.renewal_paid_years) {
      const years = String(record.renewal_paid_years).split(',').map(y => parseInt(y.trim(), 10)).filter(y => !isNaN(y) && y > 1990);
      if (years.length > 0) return Math.max(...years);
    }
    // 3. Fall back to renewal_period text (e.g. "2024" or "13.10.2023 13.10.2024")
    const periodStr = String(record.renewal_period || '').trim();
    if (periodStr) {
      const matches = periodStr.match(/\b(19|20)\d{2}\b/g);
      if (matches && matches.length > 0) return parseInt(matches[matches.length - 1], 10);
      if (/^\d{4}$/.test(periodStr)) return parseInt(periodStr, 10);
    }
    return null;
  }

  let mcUpdated = 0;
  let mcomUpdated = 0;
  let mcRestored = 0;
  let mcomRestored = 0;

  // Helper to get registration year to check if a new record is overdue
  function getRegYear(record) {
    if (record.reg_date) {
      const d = new Date(record.reg_date);
      if (!isNaN(d.getTime())) return d.getFullYear();
    }
    if (record.year) return parseInt(record.year, 10);
    return currentYear; // If unknown, assume current year (not overdue)
  }

  // ══════════════════════════════════════════════════════════════════════════
  // PHASE 0 — AUTO-SYNC: Populate missing renewal_date_vise, agm_date_vise,
  //           and next_renewal_date for existing records (Excel imports / legacy).
  // ══════════════════════════════════════════════════════════════════════════
  let mcSynced = 0;
  let mcomSynced = 0;
  const todayZero = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  try {
    const allMcs = await ManagementCorporation.findAll({
      attributes: ['id', 'status', 'renewal_period', 'next_agm_date', 'agm_date', 'renewal_date_vise', 'agm_date_vise', 'next_renewal_date', 'renewal_payment_status'],
    });
    for (const mc of allMcs) {
      const updates = {};
      const lastPaid = getLastPaidYear(mc);
      const isPaidCurrent = (lastPaid !== null && lastPaid >= currentYear) || (mc.renewal_payment_status === 'Approved');

      // 1. renewal_date_vise
      if (!mc.renewal_date_vise || mc.renewal_date_vise.trim() === '' || mc.renewal_date_vise === '-') {
        if (isPaidCurrent || mc.status === 'Active') {
          updates.renewal_date_vise = 'Active';
        } else if (lastPaid !== null && lastPaid < currentYear) {
          updates.renewal_date_vise = 'Non Active';
        }
      }

      // 2. next_renewal_date
      if (!mc.next_renewal_date && lastPaid) {
        updates.next_renewal_date = `${lastPaid}-12-31`;
      }

      // 3. agm_date_vise
      if (!mc.agm_date_vise || mc.agm_date_vise.trim() === '' || mc.agm_date_vise === '-') {
        if (mc.next_agm_date) {
          const nextD = new Date(mc.next_agm_date);
          if (!isNaN(nextD.getTime())) {
            updates.agm_date_vise = nextD >= todayZero ? 'Active' : 'Non Active';
          }
        } else if (mc.agm_date) {
          const agmD = new Date(mc.agm_date);
          const oneYearAgo = new Date(todayZero);
          oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
          if (!isNaN(agmD.getTime())) {
            updates.agm_date_vise = agmD >= oneYearAgo ? 'Active' : 'Non Active';
          }
        }
      }

      if (Object.keys(updates).length > 0) {
        await mc.update(updates);
        mcSynced++;
      }
    }
  } catch (err) {
    console.error('[RenewalStatusCheck] MC Phase 0 sync error:', err?.message || err);
  }

  try {
    if (McomRecord) {
      const allMcoms = await McomRecord.findAll({
        attributes: ['id', 'status', 'renewal_period', 'agm_date', 'renewal_date_vise', 'agm_date_vise', 'active_non_active', 'renewal_status', 'agm_status', 'next_renewal_date', 'renewal_payment_status'],
      });
      for (const mcom of allMcoms) {
        const updates = {};
        const lastPaid = getLastPaidYear(mcom);
        const isPaidCurrent = (lastPaid !== null && lastPaid >= currentYear) || (mcom.renewal_payment_status === 'Approved');

        if (!mcom.renewal_date_vise || mcom.renewal_date_vise.trim() === '' || mcom.renewal_date_vise === '-') {
          if (isPaidCurrent || mcom.status === 'Active') {
            updates.renewal_date_vise = 'Active';
          } else if (lastPaid !== null && lastPaid < currentYear) {
            updates.renewal_date_vise = 'Non Active';
          }
        }
        if (updates.renewal_date_vise) {
          if (!mcom.active_non_active) updates.active_non_active = updates.renewal_date_vise;
          if (!mcom.renewal_status) updates.renewal_status = updates.renewal_date_vise;
        }

        if (!mcom.next_renewal_date && lastPaid) {
          updates.next_renewal_date = `${lastPaid}-12-31`;
        }

        if (!mcom.agm_date_vise || mcom.agm_date_vise.trim() === '' || mcom.agm_date_vise === '-') {
          if (mcom.agm_date) {
            const agmD = new Date(mcom.agm_date);
            const oneYearAgo = new Date(todayZero);
            oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
            if (!isNaN(agmD.getTime())) {
              updates.agm_date_vise = agmD >= oneYearAgo ? 'Active' : 'Non Active';
              if (!mcom.agm_status) updates.agm_status = updates.agm_date_vise;
            }
          }
        }

        if (Object.keys(updates).length > 0) {
          await mcom.update(updates);
          mcomSynced++;
        }
      }
    }
  } catch (err) {
    console.error('[RenewalStatusCheck] MCom Phase 0 sync error:', err?.message || err);
  }

  if (mcSynced > 0 || mcomSynced > 0) {
    console.log(`[RenewalStatusCheck] Auto-synced missing statuses: ${mcSynced} MC(s), ${mcomSynced} M.Com(s)`);
  }

  // ══════════════════════════════════════════════════════════════════════════
  // PHASE 1 — AUTO-RESTORE: Fix records that have a valid 2026+ payment or renewal period
  //           but are incorrectly stored as Non Active.
  // ══════════════════════════════════════════════════════════════════════════

  // ── Restore MC records ───────────────────────────────────────────────────
  try {
    const nonActiveMcRecords = await ManagementCorporation.findAll({
      where: {
        [Op.or]: [
          { status: 'Non Active' },
          { renewal_date_vise: 'Non Active' }
        ],
      },
      attributes: ['id', 'status', 'renewal_period', 'renewal_paid_year', 'renewal_paid_years', 'renewal_payment_status', 'reg_date', 'year'],
    });

    for (const mc of nonActiveMcRecords) {
      const lastPaid = getLastPaidYear(mc);
      if (lastPaid !== null && lastPaid >= currentYear) {
        // Payment covers current year — should be Active, not Non Active
        await mc.update({
          status: 'Active',
          renewal_date_vise: 'Active',
        });
        mcRestored++;
      }
    }
  } catch (err) {
    console.error('[RenewalStatusCheck] MC restore error:', err?.message || err);
  }

  // ── Restore M.Com records ────────────────────────────────────────────────
  try {
    if (McomRecord) {
      const nonActiveMcomRecords = await McomRecord.findAll({
        where: {
          [Op.or]: [
            { status: 'Non Active' },
            { active_non_active: 'Non Active' },
            { renewal_date_vise: 'Non Active' }
          ],
        },
        attributes: ['id', 'status', 'active_non_active', 'renewal_period', 'renewal_paid_year', 'renewal_paid_years', 'renewal_payment_status', 'renewal_status', 'reg_date', 'year'],
      });

      for (const mc of nonActiveMcomRecords) {
        const lastPaid = getLastPaidYear(mc);
        if (lastPaid !== null && lastPaid >= currentYear) {
          // Payment covers current year — restore to Active
          await mc.update({
            status: 'Active',
            active_non_active: 'Active',
            renewal_date_vise: 'Active',
            renewal_status: 'Active',
          });
          mcomRestored++;
        }
      }
    }
  } catch (err) {
    console.error('[RenewalStatusCheck] M.Com restore error:', err?.message || err);
  }

  if (mcRestored > 0 || mcomRestored > 0) {
    console.log(`[RenewalStatusCheck] Auto-restored: ${mcRestored} MC(s), ${mcomRestored} M.Com(s) → Active (payment covers ${currentYear})`);
  }

  // ══════════════════════════════════════════════════════════════════════════
  // PHASE 2 — AUTO-MARK NON ACTIVE: Mark overdue records (no payment for
  //           current year and renewal_payment_status is not pending/approved).
  // ══════════════════════════════════════════════════════════════════════════

  // ── MC records ──────────────────────────────────────────────────────────────
  try {
    // Fetch Active, Pending, New, and null-status records
    // 'New' = freshly registered, not yet approved/activated → must NOT be marked Non Active
    const mcRecords = await ManagementCorporation.findAll({
      where: { [Op.or]: [{ status: 'Active' }, { status: 'Pending' }, { status: 'New' }, { status: null }] },
      attributes: ['id', 'status', 'renewal_period', 'renewal_paid_year', 'renewal_paid_years', 'renewal_payment_status', 'reg_date', 'year'],
    });

    for (const mc of mcRecords) {
      // Skip newly registered MCs — they are not yet active so renewal overdue logic doesn't apply
      if (mc.status === 'New') continue;
      // Skip if payment is pending approval — do NOT mark Non Active while waiting for AGM
      if (mc.renewal_payment_status === 'Pending Approval') continue;
      // Skip if payment is approved for current year or future year
      if (mc.renewal_payment_status === 'Approved') {
        const lastPaidApproved = getLastPaidYear(mc);
        if (lastPaidApproved !== null && lastPaidApproved >= currentYear) continue;
      }

      const lastPaid = getLastPaidYear(mc);

      let isOverdue = false;
      if (lastPaid === null) {
        // No renewal ever recorded — overdue if registered before this year
        const regYear = getRegYear(mc);
        if (regYear < currentYear) isOverdue = true;
      } else if (lastPaid < currentYear) {
        // Paid before but not for current year — overdue
        isOverdue = true;
      }

      if (isOverdue) {
        await mc.update({
          status: 'Non Active',
          renewal_date_vise: 'Non Active',
        });
        mcUpdated++;
      }
    }
  } catch (err) {
    console.error('[RenewalStatusCheck] MC update error:', err?.message || err);
  }

  // ── M.Com records ────────────────────────────────────────────────────────────
  try {
    if (McomRecord) {
      // Fetch Active, Pending, and null-status records
      const mcomRecords = await McomRecord.findAll({
        where: {
          [Op.or]: [
            { status: 'Active' },
            { status: 'Pending' },
            { status: 'New' },
            { status: null },
            { active_non_active: 'Active' },
            { active_non_active: null },
          ]
        },
        attributes: ['id', 'status', 'active_non_active', 'renewal_period', 'renewal_paid_year', 'renewal_paid_years', 'renewal_payment_status', 'reg_date', 'year'],
      });

      for (const mc of mcomRecords) {
        // Skip newly registered M.Com records — not yet active, renewal overdue check doesn't apply
        if (mc.status === 'New') continue;
        // Skip if payment is pending approval — awaiting AGM sign-off
        if (mc.renewal_payment_status === 'Pending Approval') continue;
        // Skip if payment is approved for current year or future year
        if (mc.renewal_payment_status === 'Approved') {
          const lastPaidApproved = getLastPaidYear(mc);
          if (lastPaidApproved !== null && lastPaidApproved >= currentYear) continue;
        }

        const lastPaid = getLastPaidYear(mc);

        let isOverdue = false;
        if (lastPaid === null) {
          const regYear = getRegYear(mc);
          if (regYear < currentYear) isOverdue = true;
        } else if (lastPaid < currentYear) {
          isOverdue = true;
        }

        if (isOverdue) {
          await mc.update({
            status: 'Non Active',
            active_non_active: 'Non Active',
            renewal_date_vise: 'Non Active',
          });
          mcomUpdated++;
        }
      }
    }
  } catch (err) {
    console.error('[RenewalStatusCheck] M.Com update error:', err?.message || err);
  }

  if (mcUpdated > 0 || mcomUpdated > 0) {
    console.log(`[RenewalStatusCheck] Auto-marked overdue: ${mcUpdated} MC(s), ${mcomUpdated} M.Com(s) as Non Active`);
  } else {
    console.log(`[RenewalStatusCheck] All renewal statuses are up to date (year ${currentYear})`);
  }
}

async function startDailyRenewalStatusCheck(db) {
  const models = db.models;

  // Run once immediately on startup
  await runRenewalStatusCheck(models);

  // Schedule to run every day at exactly 00:00:30 local time (30s after midnight).
  // Uses recursive setTimeout so each run re-calculates the next exact midnight —
  // this is especially important for the Dec 31 → Jan 1 new-year boundary check.
  const scheduleNextMidnight = () => {
    const now = new Date();
    const next = new Date(now);
    next.setHours(0, 0, 30, 0); // 00:00:30 local — 30s after midnight (avoid race with backup)
    if (next <= now) next.setDate(next.getDate() + 1);
    const delay = next.getTime() - now.getTime();

    const isNewYear = (next.getMonth() === 0 && next.getDate() === 1); // Jan 1
    console.log(`[RenewalStatusCheck] Next auto-check in ${Math.round(delay / 1000)}s (${next.toLocaleDateString()} 00:00:30)${isNewYear ? ' ← NEW YEAR boundary check!' : ''}`);

    setTimeout(async () => {
      const checkDate = new Date();
      console.log(`[RenewalStatusCheck] Running midnight check (${checkDate.toLocaleDateString()})...`);
      await runRenewalStatusCheck(models);
      // Schedule next midnight run (recursive — re-calculates exact time each day)
      scheduleNextMidnight();
    }, delay);
  };

  scheduleNextMidnight();
}

// Global error-handling middleware
app.use((err, req, res, next) => {
  console.error('Unhandled server error:', err);
  if (res.headersSent) {
    return next(err);
  }
  res.status(500).json({ error: 'Internal Server Error', message: err?.message || 'Server error' });
});

// ── Start Server ────────────────────────────────────────────────────────────
// db.ready ensures the database is connected and models are synced
// BEFORE background maintenance jobs start.

function startApp() {
  if (typeof PhusionPassenger !== 'undefined') {
    PhusionPassenger.configure({ autoInstall: false });
    return app.listen('passenger', () => {
      console.log('🚀 Backend server running under Phusion Passenger');
    });
  }

  const isNamedPipeOrSocket = typeof port === 'string' && !/^\d+$/.test(port);
  const listenArgs = isNamedPipeOrSocket ? [port] : [port, '0.0.0.0'];

  const server = app.listen(...listenArgs, () => {
    console.log(`🚀 Backend server running on ${isNamedPipeOrSocket ? port : `http://0.0.0.0:${port}`}`);
  });

  server.on('error', (err) => {
    if (err && (err.code === 'EADDRINUSE' || err.code === 'EACCES')) {
      console.error(`\n❌ ERROR: Port/Socket ${port} is already in use or inaccessible.`);
      process.exitCode = 1;
    } else {
      console.error(`Failed to start server on ${port}:`, err);
      process.exitCode = 1;
    }
  });

  return server;
}

startApp();

db.ready
  .then(() => {
    console.log('✅ Database models ready, starting background maintenance jobs...');

    // Start daily backups after server is ready
    startDailyCmaBackups({ intervalMs: 24 * 60 * 60 * 1000 }).catch((err) => {
      console.error('Failed to start daily SQL backups:', err?.message || err);
    });

    // Start daily renewal status auto-check (marks overdue MCs as Non Active)
    startDailyRenewalStatusCheck(db).catch((err) => {
      console.error('Failed to start renewal status check:', err?.message || err);
    });
  })
  .catch((err) => {
    console.error('⚠️ Database initialization warning:', err?.message || err);
  });

module.exports = app;



