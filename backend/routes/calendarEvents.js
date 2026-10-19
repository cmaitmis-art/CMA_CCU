const express = require('express');
const router = express.Router();
const db = require('../db');

// Get all calendar events
router.get('/', async (req, res) => {
  try {
    const events = await db.models.CalendarEvent.findAll();
    res.json(events);
  } catch (err) {
    console.error('Error fetching calendar events:', err);
    res.status(500).json({ error: 'Failed to fetch calendar events' });
  }
});

// Create a new calendar event
router.post('/', async (req, res) => {
  try {
    const { title, date, visibility, authorId } = req.body;
    if (!title || !date || !authorId) {
      return res.status(400).json({ error: 'title, date, and authorId are required' });
    }
    const newEvent = await db.models.CalendarEvent.create({
      title,
      date,
      visibility: visibility || 'Only Me',
      authorId
    });
    res.status(201).json(newEvent);
  } catch (err) {
    console.error('Error creating calendar event:', err);
    res.status(500).json({ error: 'Failed to create calendar event' });
  }
});

// Delete a calendar event
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const event = await db.models.CalendarEvent.findByPk(id);
    if (!event) {
      return res.status(404).json({ error: 'Event not found' });
    }
    await event.destroy();
    res.json({ message: 'Event deleted successfully' });
  } catch (err) {
    console.error('Error deleting calendar event:', err);
    res.status(500).json({ error: 'Failed to delete calendar event' });
  }
});

module.exports = router;
