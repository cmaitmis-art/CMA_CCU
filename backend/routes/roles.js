const express = require('express');
const router = express.Router();
const db = require('../db');

// GET all roles
router.get('/', async (req, res) => {
  try {
    const roles = await db.models.Role.findAll({
      order: [['name', 'ASC']]
    });
    // Parse permissions from string back to array/object for frontend
    const mappedRoles = roles.map(role => {
      let perms = {};
      try {
        perms = JSON.parse(role.permissions || '{}');
      } catch (e) {
        console.error('Failed to parse role permissions:', e);
      }
      return {
        ...role.toJSON(),
        permissions: perms
      };
    });
    res.json(mappedRoles);
  } catch (err) {
    console.error('Error fetching roles:', err);
    res.status(500).json({ error: 'Failed to fetch roles' });
  }
});

// POST create a new role
router.post('/', async (req, res) => {
  try {
    const { name, permissions, created_by } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Role name is required' });
    }

    const existingRole = await db.models.Role.findOne({ where: { name: name.trim() } });
    if (existingRole) {
      return res.status(400).json({ error: 'Role name already exists' });
    }

    const newRole = await db.models.Role.create({
      name: name.trim(),
      permissions: JSON.stringify(permissions || {}),
      is_system: false, // custom roles are never system roles
      created_by: created_by || null,
    });

    let newPerms = {};
    try {
      newPerms = JSON.parse(newRole.permissions || '{}');
    } catch (e) {}

    res.status(201).json({
      ...newRole.toJSON(),
      permissions: newPerms
    });
  } catch (err) {
    console.error('Error creating role:', err);
    res.status(500).json({ error: 'Failed to create role' });
  }
});

// PUT update a role
router.put('/:id', async (req, res) => {
  try {
    const roleId = req.params.id;
    const { name, permissions } = req.body;

    const role = await db.models.Role.findByPk(roleId);
    if (!role) {
      return res.status(404).json({ error: 'Role not found' });
    }

    // Only allow name change if it's not a system role
    if (!role.is_system && name && name.trim() !== role.name) {
      const existing = await db.models.Role.findOne({ where: { name: name.trim() } });
      if (existing) {
        return res.status(400).json({ error: 'Role name already exists' });
      }
      role.name = name.trim();
    }

    if (permissions && typeof permissions === 'object') {
      role.permissions = JSON.stringify(permissions);
    }

    await role.save();

    let updatedPerms = {};
    try {
      updatedPerms = JSON.parse(role.permissions || '{}');
    } catch (e) {}

    res.json({
      ...role.toJSON(),
      permissions: updatedPerms
    });
  } catch (err) {
    console.error('Error updating role:', err);
    res.status(500).json({ error: 'Failed to update role' });
  }
});

// DELETE a role
router.delete('/:id', async (req, res) => {
  try {
    const roleId = req.params.id;
    const role = await db.models.Role.findByPk(roleId);
    
    if (!role) {
      return res.status(404).json({ error: 'Role not found' });
    }

    if (role.is_system) {
      return res.status(403).json({ error: 'Cannot delete system default roles' });
    }

    // Check if any users are using this role
    const usersCount = await db.models.User.count({ where: { role: role.name } });
    if (usersCount > 0) {
      return res.status(400).json({ error: `Cannot delete role. It is currently assigned to ${usersCount} user(s).` });
    }

    await role.destroy();
    res.json({ success: true });
  } catch (err) {
    console.error('Error deleting role:', err);
    res.status(500).json({ error: 'Failed to delete role' });
  }
});

module.exports = router;
