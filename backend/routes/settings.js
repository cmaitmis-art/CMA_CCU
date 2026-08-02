const express = require('express');
const router = express.Router();
const db = require('../db');
const { Setting } = db.models;

// GET all settings
router.get('/', async (req, res) => {
  try {
    const settings = await Setting.findAll();
    const settingsObj = {};
    settings.forEach(s => {
      try {
        settingsObj[s.key] = JSON.parse(s.value);
      } catch (e) {
        settingsObj[s.key] = s.value;
      }
    });
    res.json(settingsObj);
  } catch (error) {
    console.error('Error fetching settings:', error);
    res.status(500).json({ error: error.message });
  }
});

// PATCH settings
router.patch('/', async (req, res) => {
  try {
    const updates = req.body;
    for (const [key, value] of Object.entries(updates)) {
      const valueStr = typeof value === 'object' ? JSON.stringify(value) : String(value);
      
      // Attempt to find existing setting, otherwise create
      const existing = await Setting.findByPk(key);
      if (existing) {
        existing.value = valueStr;
        await existing.save();
      } else {
        await Setting.create({ key, value: valueStr });
      }
    }
    res.json({ message: 'Settings updated successfully' });
  } catch (error) {
    console.error('Error updating settings:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
