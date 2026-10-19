const express = require('express');
const router = express.Router();
const db = require('../db');

// Get all preferences for a user
router.get('/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const prefs = await db.models.UserPreference.findAll({ where: { userId } });
    const result = {};
    prefs.forEach(p => {
      try {
        result[p.prefKey] = JSON.parse(p.prefValue);
      } catch (e) {
        result[p.prefKey] = p.prefValue; // fallback if not JSON
      }
    });
    res.json(result);
  } catch (err) {
    console.error('Error fetching user preferences:', err);
    res.status(500).json({ error: 'Failed to fetch user preferences' });
  }
});

// Set a preference for a user
router.post('/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { prefKey, prefValue } = req.body;
    if (!prefKey) return res.status(400).json({ error: 'prefKey is required' });

    const strValue = typeof prefValue === 'object' ? JSON.stringify(prefValue) : String(prefValue);
    
    // upsert
    const [pref, created] = await db.models.UserPreference.upsert({
      userId,
      prefKey,
      prefValue: strValue
    });
    
    res.json({ success: true, created });
  } catch (err) {
    console.error('Error setting user preference:', err);
    res.status(500).json({ error: 'Failed to set user preference' });
  }
});

// Delete a preference for a user
router.delete('/:userId/:prefKey', async (req, res) => {
  try {
    const { userId, prefKey } = req.params;
    await db.models.UserPreference.destroy({ where: { userId, prefKey } });
    res.json({ success: true });
  } catch (err) {
    console.error('Error deleting user preference:', err);
    res.status(500).json({ error: 'Failed to delete user preference' });
  }
});

module.exports = router;
