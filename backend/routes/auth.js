const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const db = require('../db');

function buildUserPayload(user) {
  const fullName = user?.name?.trim() || user?.username?.trim() || 'Admin User';
  const initials = fullName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0] || '')
    .join('')
    .toUpperCase() || 'AD';

  return {
    id: user?.id,
    username: user?.username,
    name: fullName,
    role: user?.role,
    email: user?.email || '',
    avatar_url: user?.avatar_url || null,
    avatar: user?.avatar_url ? null : initials,
  };
}

router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body || {};
    const uname = String(username || '').trim();
    const normalizedUsername = uname.toLowerCase();
    const pass = String(password || '');

    if (!uname || !pass) {
      return res.json({ success: false, error: 'Username and password are required.' });
    }

    const user = await db.models.User.findOne({ where: { username: normalizedUsername } });
    if (!user || user.is_deleted) {
      return res.json({ success: false, error: 'Username not found.' });
    }

    const isMatch = await bcrypt.compare(pass, user.password);
    if (!isMatch && user.password !== pass) { // Fallback for plain-text passwords before migration
      return res.json({ success: false, error: 'Incorrect password. Please try again.' });
    }

    user.is_online = true;
    user.last_active = new Date();
    await user.save();

    // Fetch Role to get permissions
    const roleRecord = await db.models.Role.findOne({ where: { name: user.role } });
    let permissions = [];
    if (roleRecord && roleRecord.permissions) {
      try {
        permissions = JSON.parse(roleRecord.permissions);
      } catch (e) {
        console.error('Failed to parse permissions for role:', user.role);
      }
    }

    const payload = buildUserPayload(user);
    payload.permissions = permissions;

    res.json(payload);
  } catch (err) {
    console.error('Auth login failed:', err);
    const detail = err?.parent?.sqlMessage || err?.original?.message || err?.message || 'Database error';
    res.status(500).json({ error: `Login failed: ${detail}` });
  }
});

router.post('/logout', async (req, res) => {
  try {
    const { username } = req.body || {};
    if (username) {
      const user = await db.models.User.findOne({ where: { username: String(username).toLowerCase() } });
      if (user) {
        user.is_online = false;
        await user.save();
      }
    }
    res.json({ success: true });
  } catch (err) {
    console.error('Auth logout failed:', err);
    res.status(500).json({ error: 'Logout failed.' });
  }
});

module.exports = router;
