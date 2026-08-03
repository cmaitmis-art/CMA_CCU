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

const app = express();
const port = process.env.PORT || 3001;

// ── Configure Middleware ────────────────────────────────────────────────────
app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);

    // Allow localhost and any private LAN IP on the frontend ports, plus the Netlify production URL
    const allowedPattern = /^http:\/\/(localhost|127\.0\.0\.1|192\.168\.\d{1,3}\.\d{1,3}|10\.\d{1,3}\.\d{1,3}\.\d{1,3}|172\.(1[6-9]|2\d|3[01])\.\d{1,3}\.\d{1,3}):(5173|5174)$/;
    
    // Check if the origin matches the localhost pattern OR is the specific Netlify domain
    if (allowedPattern.test(origin) || origin === 'https://cma-ccu.netlify.app') {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS: ' + origin));
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

    res.json({ mc, mcom, cfiles, pendingCfiles, pendingComplaints, pendingMc, pendingMcom, pendingComplaintsOverdue, complaints });
  } catch (err) {
    console.error('Dashboard stats error:', err.message);
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

// ── GET / ─ Health Check Endpoint ───────────────────────────────────────────
app.get('/', (req, res) => {
  res.json({ message: 'Backend API is running', apiBase: '/api' });
});

// ── 404 Handler ─────────────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ error: 'Not Found' });
});

async function startDailyCmaBackups({ dbInstance, intervalMs }) {
  const { createSqlBackup, DEFAULT_BACKUP_PATH } = require('./utils/sqlbackup');

  // Run immediately on schedule start (but only after DB is ready)
  const runOnce = async (tag) => {
    try {
      const dbPath = dbInstance?.dbPath || dbInstance?.sequelize?.options?.storage;
      if (!dbPath) {
        console.error('Daily SQL backup failed: missing dbPath');
        return;
      }

      const savedPath = await createSqlBackup(dbPath, DEFAULT_BACKUP_PATH);
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

// ── Start Server ────────────────────────────────────────────────────────────
// db.ready ensures the database is connected and models are synced
// BEFORE we start listening for incoming HTTP requests.

function tryListen(expressApp, port, host = '0.0.0.0') {
  const server = expressApp.listen({ port, host }, () => {
    console.log(`Backend API running on http://localhost:${port}`);
  });

  server.on('error', (err) => {
    if (err && (err.code === 'EADDRINUSE' || err.code === 'EACCES')) {
      console.error(`\n❌ ERROR: Port ${port} is already in use.`);
      console.error(`Please kill the process using port ${port} or check if another instance of the backend is running.`);
      process.exitCode = 1;
    } else {
      console.error(`Failed to start server on port ${port}:`, err);
      process.exitCode = 1;
    }
  });
}

db.ready
  .then(() => {
    // Start listening (with fallback if port is busy)
    tryListen(app, port);

    // Start daily backups after server is ready
    startDailyCmaBackups({ dbInstance: db, intervalMs: 24 * 60 * 60 * 1000 }).catch((err) => {
      console.error('Failed to start daily SQL backups:', err?.message || err);
    });
  })
  .catch((err) => {
    console.error('Failed to start server due to database error:', err.message);
    process.exitCode = 1;
  });


