const express = require('express');
const router = express.Router();
const db = require('../db');

// Get a specific draft
router.get('/:userId/:draftKey', async (req, res) => {
  try {
    const { userId, draftKey } = req.params;
    const draft = await db.models.UserDraft.findOne({ where: { userId, draftKey } });
    if (!draft) return res.status(404).json({ error: 'Draft not found' });
    
    res.json({ draftData: draft.draftData });
  } catch (err) {
    console.error('Error fetching user draft:', err);
    res.status(500).json({ error: 'Failed to fetch user draft' });
  }
});

// Set a draft
router.post('/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { draftKey, draftData } = req.body;
    if (!draftKey || !draftData) return res.status(400).json({ error: 'draftKey and draftData are required' });

    await db.models.UserDraft.upsert({
      userId,
      draftKey,
      draftData: typeof draftData === 'object' ? JSON.stringify(draftData) : String(draftData)
    });
    
    res.json({ success: true });
  } catch (err) {
    console.error('Error setting user draft:', err);
    res.status(500).json({ error: 'Failed to set user draft' });
  }
});

// Delete a draft
router.delete('/:userId/:draftKey', async (req, res) => {
  try {
    const { userId, draftKey } = req.params;
    await db.models.UserDraft.destroy({ where: { userId, draftKey } });
    res.json({ success: true });
  } catch (err) {
    console.error('Error deleting user draft:', err);
    res.status(500).json({ error: 'Failed to delete user draft' });
  }
});

module.exports = router;
