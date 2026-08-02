const express = require('express');
const { Op } = require('sequelize');
const path = require('path');
const fs = require('fs');
const router = express.Router();
const db = require('../db');

const avatarsDir = path.resolve(__dirname, '../uploads/avatars');

function normalizeUsername(value) {
  return String(value || '').trim().toLowerCase();
}

router.get('/', async (req, res) => {
  try {
    const { q, role } = req.query;
    const where = { is_deleted: false };

    if (q) {
      const term = `%${String(q).trim()}%`;
      where[Op.or] = [
        { username: { [Op.like]: term } },
        { name: { [Op.like]: term } },
        { email: { [Op.like]: term } },
        { role: { [Op.like]: term } },
      ];
    }

    if (role) {
      where.role = role;
    }

    const users = await db.models.User.findAll({
      where,
      order: [['id', 'ASC']],
      raw: true,
    });

    res.json(users);
  } catch (err) {
    console.error('GET /users error:', err);
    res.status(500).json({ error: 'Failed to fetch users.' });
  }
});

router.post('/', async (req, res) => {
  try {
    const { username, password, name, role, email, avatar_url } = req.body || {};
    const normalizedUsername = normalizeUsername(username);
    const normalizedName = String(name || '').trim();
    const normalizedRole = String(role || '').trim();

    if (!normalizedUsername || !password || !normalizedName || !normalizedRole) {
      return res.status(400).json({ error: 'Username, password, name, and role are required.' });
    }

    const existing = await db.models.User.findOne({ where: { username: normalizedUsername } });
    if (existing) {
      if (existing.is_deleted) {
        // Reactivate soft-deleted user and update fields
        existing.is_deleted = false;
        existing.password = String(password);
        existing.name = normalizedName;
        existing.role = normalizedRole;
        existing.email = String(email || '').trim() || null;
        existing.avatar_url = String(avatar_url || '').trim() || null;
        await existing.save();
        return res.json(existing.get({ plain: true }));
      }
      return res.status(409).json({ error: 'Username is already taken.' });
    }

    const user = await db.models.User.create({
      username: normalizedUsername,
      password: String(password),
      name: normalizedName,
      role: normalizedRole,
      email: String(email || '').trim() || null,
      avatar_url: String(avatar_url || '').trim() || null,
      is_deleted: false,
    });

    res.json(user.get({ plain: true }));
  } catch (err) {
    console.error('POST /users error:', err);
    res.status(500).json({ error: 'Failed to create user.' });
  }
});

router.patch('/:id', async (req, res) => {
  try {
    const user = await db.models.User.findByPk(req.params.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found.' });
    }

    const { username, password, name, role, email, avatar_url } = req.body || {};
    if (username) {
      const normalizedUsername = normalizeUsername(username);
      if (normalizedUsername !== user.username) {
        const existing = await db.models.User.findOne({ where: { username: normalizedUsername, is_deleted: false } });
        if (existing) {
          return res.status(409).json({ error: 'Username is already taken.' });
        }
        user.username = normalizedUsername;
      }
    }
    if (name) user.name = String(name).trim();
    if (role) user.role = String(role).trim();
    if (email !== undefined) user.email = String(email || '').trim() || null;
    if (avatar_url !== undefined) user.avatar_url = String(avatar_url || '').trim() || null;
    if (password) user.password = String(password);

    await user.save();
    res.json(user.get({ plain: true }));
  } catch (err) {
    console.error('PATCH /users/:id error:', err);
    res.status(500).json({ error: 'Failed to update user.' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const user = await db.models.User.findByPk(req.params.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found.' });
    }

    await user.update({ is_deleted: true });
    res.json({ deleted: true });
  } catch (err) {
    console.error('DELETE /users/:id error:', err);
    res.status(500).json({ error: 'Failed to delete user.' });
  }
});

router.post('/:id/ping', async (req, res) => {
  try {
    const user = await db.models.User.findByPk(req.params.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found.' });
    }
    user.is_online = true;
    user.last_active = new Date();
    await user.save();
    res.json({ success: true });
  } catch (err) {
    console.error('POST /users/:id/ping error:', err);
    res.status(500).json({ error: 'Failed to ping user.' });
  }
});

router.patch('/:id/avatar', async (req, res) => {
  try {
    const user = await db.models.User.findByPk(req.params.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found.' });
    }

    const avatarFile = req.files?.avatar;
    if (!avatarFile) {
      return res.status(400).json({ error: 'Avatar file is required.' });
    }

    const file = Array.isArray(avatarFile) ? avatarFile[0] : avatarFile;
    const ext = path.extname(file.name).toLowerCase();
    const allowedExt = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
    if (!allowedExt.includes(ext)) {
      return res.status(400).json({ error: 'Unsupported avatar image format.' });
    }

    if (!fs.existsSync(avatarsDir)) {
      fs.mkdirSync(avatarsDir, { recursive: true });
    }

    const timestamp = Date.now();
    const filename = `user-${user.id}-${timestamp}${ext}`;
    const targetPath = path.join(avatarsDir, filename);

    // Save original first
    await file.mv(targetPath);

    // Try to create resized variants (1x and 2x) if sharp is available.
    let avatarUrl = `/uploads/avatars/${filename}`;
    let avatar2xUrl = null;
    try {
      // eslint-disable-next-line global-require
      const sharp = require('sharp');
      const size = 400; // high quality avatar size
      const baseName = `user-${user.id}-${timestamp}`;
      const buf = await fs.promises.readFile(targetPath);
      
      const name1 = `${baseName}-${size}${ext}`;
      const path1 = path.join(avatarsDir, name1);
      await sharp(buf).resize(size, size, { fit: 'cover' }).toFile(path1);
      
      avatarUrl = `/uploads/avatars/${name1}`;
      
      // remove the original upload to save space
      try { fs.unlinkSync(targetPath); } catch (e) { /* ignore */ }
    } catch (e) {
      // sharp not available or failed — keep original file as avatarUrl
      console.warn('Avatar resize skipped (sharp not available or error):', e && e.message);
      avatarUrl = `/uploads/avatars/${filename}`;
    }

    if (user.avatar_url && String(user.avatar_url).startsWith('/uploads/avatars/')) {
      const oldPath = path.resolve(__dirname, '..', user.avatar_url.replace(/^[\/]+/, ''));
      if (oldPath.startsWith(avatarsDir) && fs.existsSync(oldPath)) {
        try {
          fs.unlinkSync(oldPath);
        } catch (cleanupErr) {
          console.warn('Failed to remove old avatar file:', cleanupErr.message);
        }
      }
    }

    user.avatar_url = avatarUrl;
    await user.save();

    const resp = { avatar_url: avatarUrl, user: user.get({ plain: true }) };
    res.json(resp);
  } catch (err) {
    console.error('PATCH /users/:id/avatar error:', err);
    res.status(500).json({ error: 'Failed to upload avatar.' });
  }
});

module.exports = router;
