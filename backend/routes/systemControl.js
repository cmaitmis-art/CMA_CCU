const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const db = require('../db');

// In-memory maintenance flag (synced with DB on boot & toggle)
let isMaintenanceMode = false;
let isInitialized = false;
let cachedSecret = null;

// In-memory store for active super-admin session tokens: token -> expiresAt
const activeTokens = new Map();

async function initMaintenanceState() {
  try {
    const { Setting } = db.models;
    if (!Setting) return;
    const maintSetting = await Setting.findByPk('system_maintenance');
    if (maintSetting && maintSetting.value) {
      try {
        const parsed = JSON.parse(maintSetting.value);
        isMaintenanceMode = Boolean(parsed.enabled);
      } catch (e) {
        isMaintenanceMode = maintSetting.value === 'true' || maintSetting.value === '1';
      }
    }
    const passSetting = await Setting.findByPk('super_admin_pass_hash');
    if (passSetting && passSetting.value) {
      cachedSecret = passSetting.value;
    }
    isInitialized = true;
  } catch (err) {
    console.error('Failed to initialize system maintenance state:', err);
  }
}

// Call on startup
initMaintenanceState();

function cleanExpiredTokens() {
  const now = Date.now();
  for (const [token, exp] of activeTokens.entries()) {
    if (exp < now) activeTokens.delete(token);
  }
}

function getSuperAdminSecret() {
  return cachedSecret || process.env.JWT_SECRET || 'cma_ccu_super_admin_master_secret_key_2026';
}

function createSuperAdminToken() {
  const expiresAt = Date.now() + 24 * 60 * 60 * 1000; // 24 hours
  const secret = getSuperAdminSecret();
  const sig = crypto.createHmac('sha256', secret).update(String(expiresAt)).digest('hex');
  const token = `${expiresAt}.${sig}`;
  activeTokens.set(token, expiresAt);
  return token;
}

function verifySuperAdminToken(req) {
  const token = req.headers['x-super-admin-token'] || req.query.token;
  if (!token || typeof token !== 'string') return false;

  // 1. Signed token verification (survives server / passenger restarts)
  if (token.includes('.')) {
    const [expiresAtStr, sig] = token.split('.');
    const expiresAt = parseInt(expiresAtStr, 10);
    if (!expiresAt || expiresAt < Date.now()) return false;

    try {
      const secret = getSuperAdminSecret();
      const expectedSig = crypto.createHmac('sha256', secret).update(expiresAtStr).digest('hex');
      if (sig === expectedSig) {
        return true;
      }
    } catch (e) {
      return false;
    }
  }

  // 2. In-memory check fallback
  const exp = activeTokens.get(token);
  if (exp && exp >= Date.now()) return true;

  return false;
}

// 1. GET /api/system-control/status (Public check)
router.get('/status', async (req, res) => {
  try {
    if (!isInitialized) await initMaintenanceState();
    const { Setting } = db.models;
    const passSetting = Setting ? await Setting.findByPk('super_admin_pass_hash') : null;
    const isConfigured = Boolean(passSetting && passSetting.value);

    res.json({
      success: true,
      maintenance: isMaintenanceMode,
      isConfigured,
    });
  } catch (error) {
    console.error('Error fetching system status:', error);
    res.json({
      success: true,
      maintenance: isMaintenanceMode,
      isConfigured: true,
    });
  }
});

// 2. POST /api/system-control/setup (First time setup)
router.post('/setup', async (req, res) => {
  try {
    const { Setting } = db.models;
    const existing = await Setting.findByPk('super_admin_pass_hash');
    if (existing && existing.value) {
      return res.status(400).json({ error: 'Super Admin is already configured.' });
    }

    const { password } = req.body || {};
    if (!password || String(password).trim().length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters.' });
    }

    const salt = await bcrypt.genSalt(12);
    const hash = await bcrypt.hash(String(password).trim(), salt);

    if (existing) {
      existing.value = hash;
      await existing.save();
    } else {
      await Setting.create({ key: 'super_admin_pass_hash', value: hash });
    }

    cachedSecret = hash;
    const token = createSuperAdminToken();

    res.json({
      success: true,
      message: 'Super Admin master password created successfully.',
      token,
      maintenance: isMaintenanceMode,
    });
  } catch (error) {
    console.error('Super Admin setup error:', error);
    res.status(500).json({ error: 'Setup failed: ' + error.message });
  }
});

// 3. POST /api/system-control/login
router.post('/login', async (req, res) => {
  try {
    const { password } = req.body || {};
    if (!password) {
      return res.status(400).json({ error: 'Password is required.' });
    }

    const { Setting } = db.models;
    const passRecord = await Setting.findByPk('super_admin_pass_hash');
    if (!passRecord || !passRecord.value) {
      return res.status(400).json({ error: 'Super Admin is not configured yet. Please run initial setup.' });
    }

    const isMatch = await bcrypt.compare(String(password).trim(), passRecord.value);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid master credentials.' });
    }

    cachedSecret = passRecord.value;
    const token = createSuperAdminToken();

    res.json({
      success: true,
      token,
      maintenance: isMaintenanceMode,
    });
  } catch (error) {
    console.error('Super Admin login error:', error);
    res.status(500).json({ error: 'Login error.' });
  }
});

// 4. POST /api/system-control/toggle (Turn maintenance ON/OFF)
router.post('/toggle', async (req, res) => {
  try {
    if (!verifySuperAdminToken(req)) {
      return res.status(403).json({ error: 'Unauthorized. Super Admin token required.' });
    }

    const { enabled } = req.body;
    const targetState = Boolean(enabled);

    const { Setting } = db.models;
    const payload = JSON.stringify({
      enabled: targetState,
      updated_at: new Date().toISOString(),
      updated_by: 'Super Admin'
    });

    const existing = await Setting.findByPk('system_maintenance');
    if (existing) {
      existing.value = payload;
      await existing.save();
    } else {
      await Setting.create({ key: 'system_maintenance', value: payload });
    }

    isMaintenanceMode = targetState;

    res.json({
      success: true,
      maintenance: isMaintenanceMode,
      message: targetState ? 'System has been put into Maintenance Mode.' : 'System is now ONLINE.'
    });
  } catch (error) {
    console.error('Toggle maintenance error:', error);
    res.status(500).json({ error: 'Failed to update system status: ' + error.message });
  }
});

// 5. POST /api/system-control/change-password
router.post('/change-password', async (req, res) => {
  try {
    if (!verifySuperAdminToken(req)) {
      return res.status(403).json({ error: 'Unauthorized.' });
    }

    const { currentPassword, newPassword } = req.body || {};
    if (!newPassword || String(newPassword).trim().length < 6) {
      return res.status(400).json({ error: 'New password must be at least 6 characters.' });
    }

    const { Setting } = db.models;
    const passRecord = await Setting.findByPk('super_admin_pass_hash');
    if (!passRecord || !passRecord.value) {
      return res.status(400).json({ error: 'Current password record not found.' });
    }

    const isMatch = await bcrypt.compare(String(currentPassword || '').trim(), passRecord.value);
    if (!isMatch) {
      return res.status(400).json({ error: 'Current password is incorrect.' });
    }

    const salt = await bcrypt.genSalt(12);
    const newHash = await bcrypt.hash(String(newPassword).trim(), salt);
    passRecord.value = newHash;
    await passRecord.save();
    cachedSecret = newHash;
    const newToken = createSuperAdminToken();

    res.json({ success: true, message: 'Master password changed successfully.', token: newToken });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({ error: 'Failed to change password.' });
  }
});

// 6. POST /api/system-control/logout
router.post('/logout', (req, res) => {
  const token = req.headers['x-super-admin-token'] || req.query.token;
  if (token) activeTokens.delete(token);
  res.json({ success: true });
});

// 7. POST /api/system-control/enter-system (Authenticate Super Admin into Full System)
router.post('/enter-system', async (req, res) => {
  try {
    if (!verifySuperAdminToken(req)) {
      return res.status(403).json({ error: 'Unauthorized. Super Admin master token required.' });
    }

    // Full permissions map for all modules across the entire application
    const allModules = [
      'dashboard', 'registration', 'renewal_approval', 'mc', 'mcom',
      'cfiles', 'complains', 'discussion', 'notifications', 'records',
      'customer_history', 'reports', 'users', 'profile', 'settings'
    ];
    const allActions = [
      'view', 'create', 'edit', 'delete', 'approve',
      'receipt', 'acknowledgement', 'transfer', 'export',
      'history', 'view_record', 'restore', 'close', 'activate'
    ];
    const fullPermissions = {};
    allModules.forEach(mod => {
      fullPermissions[mod] = [...allActions];
    });

    // Independent, dedicated stealth Super Admin identity - completely detached from normal staff accounts
    const userPayload = {
      id: 999999,
      username: 'superadmin',
      name: 'Super Administrator',
      role: 'Admin',
      department: 'System Control',
      email: '',
      avatar_url: null,
      avatar: 'SA',
      isSuperAdmin: true,
      permissions: fullPermissions,
    };

    res.json({
      success: true,
      user: userPayload,
      message: 'Super Admin access granted.'
    });
  } catch (error) {
    console.error('Enter system error:', error);
    res.status(500).json({ error: 'Failed to generate Super Admin session: ' + error.message });
  }
});

// Maintenance enforcement middleware for other routes
function maintenanceMiddleware(req, res, next) {
  // If system is NOT in maintenance, proceed
  if (!isMaintenanceMode) return next();

  // If path is system-control, allow
  if (req.originalUrl?.includes('/system-control') || req.path?.startsWith('/system-control') || req.baseUrl === '/api/system-control') {
    return next();
  }

  // If super admin token provided and valid, allow access
  if (verifySuperAdminToken(req)) {
    return next();
  }

  // Allow static public assets and basic health checks
  if (req.path.startsWith('/assets') || req.path.startsWith('/uploads') || req.path === '/favicon.ico') {
    return next();
  }

  // Otherwise, block with 503
  return res.status(503).json({
    error: 'System is currently undergoing maintenance. Please try again later.',
    maintenance: true
  });
}

module.exports = {
  router,
  maintenanceMiddleware,
  isMaintenanceActive: () => isMaintenanceMode,
};
