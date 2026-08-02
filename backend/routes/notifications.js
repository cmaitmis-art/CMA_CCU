const express = require('express');
const router = express.Router();
const db = require('../db');
const EventEmitter = require('events');

const notificationEmitter = new EventEmitter();
notificationEmitter.setMaxListeners(100); // Allow many clients to connect

/**
 * GET /api/notifications/stream
 *
 * Server-Sent Events (SSE) endpoint for real-time notifications.
 */
router.get('/stream', (req, res) => {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
  });

  const onNewNotification = (notification) => {
    res.write(`data: ${JSON.stringify(notification)}\n\n`);
  };

  notificationEmitter.on('new', onNewNotification);

  req.on('close', () => {
    notificationEmitter.removeListener('new', onNewNotification);
  });
});

/**
 * GET /api/notifications
 *
 * Returns notifications filtered by:
 *  - target_role  → only notifications matching the user's role (or null = broadcast to all)
 *  - user_id      → excludes notifications already dismissed by this user in the database
 *
 * Query params:
 *   user_id  (required for dismissed filtering)
 *   role     (required for role filtering)
 */
router.get('/', async (req, res) => {
  try {
    const { user_id, role } = req.query;

    // Fetch all recent notifications
    const allNotifications = await db.models.Notification.findAll({
      order: [['created_at', 'DESC']],
      limit: 200,
    });

    // Filter by target_role if role provided
    let filtered = allNotifications.filter((n) => {
      if (!n.target_role) return true; // broadcast to all
      if (!role) return true;          // no role filter requested
      return String(n.target_role).toUpperCase() === String(role).toUpperCase();
    });

    // Exclude notifications already dismissed by this user
    if (user_id) {
      const uid = parseInt(user_id, 10);
      if (!isNaN(uid)) {
        const reads = await db.models.NotificationRead.findAll({
          where: { user_id: uid },
          attributes: ['notification_id'],
        });
        const dismissedIds = new Set(reads.map((r) => r.notification_id));
        filtered = filtered.filter((n) => !dismissedIds.has(n.id));
      }
    }

    res.json({ success: true, notifications: filtered });
  } catch (error) {
    console.error('Error fetching notifications:', error);
    res.status(500).json({ success: false, message: 'Server error fetching notifications' });
  }
});

/**
 * POST /api/notifications
 *
 * Creates a new notification.
 * Body: { type, title, message, target_role, link }
 */
router.post('/', async (req, res) => {
  try {
    const { type, title, message, target_role, link } = req.body;
    const notification = await db.models.Notification.create({
      type,
      title,
      message,
      target_role: target_role || null,
      link: link || null,
    });
    
    // Broadcast instantly to all connected clients
    notificationEmitter.emit('new', notification);

    res.status(201).json({ success: true, notification });
  } catch (error) {
    console.error('Error creating notification:', error);
    res.status(500).json({ success: false, message: 'Server error creating notification' });
  }
});

/**
 * POST /api/notifications/:id/dismiss
 *
 * Marks a notification as dismissed for a specific user in the database.
 * Body: { user_id }
 *
 * This is idempotent — dismissing an already-dismissed notification is safe.
 */
router.post('/:id/dismiss', async (req, res) => {
  try {
    const notification_id = parseInt(req.params.id, 10);
    const user_id = parseInt(req.body?.user_id, 10);

    if (isNaN(notification_id) || isNaN(user_id)) {
      return res.status(400).json({ success: false, message: 'Invalid notification_id or user_id' });
    }

    // findOrCreate is idempotent — safe to call multiple times
    await db.models.NotificationRead.findOrCreate({
      where: { user_id, notification_id },
      defaults: { user_id, notification_id },
    });

    res.json({ success: true });
  } catch (error) {
    console.error('Error dismissing notification:', error);
    res.status(500).json({ success: false, message: 'Server error dismissing notification' });
  }
});

/**
 * DELETE /api/notifications/:id
 *
 * Hard-deletes a notification (admin use only).
 */
router.delete('/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) return res.status(400).json({ success: false, message: 'Invalid id' });

    await db.models.NotificationRead.destroy({ where: { notification_id: id } });
    await db.models.Notification.destroy({ where: { id } });

    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting notification:', error);
    res.status(500).json({ success: false, message: 'Server error deleting notification' });
  }
});

router.emitter = notificationEmitter;
module.exports = router;
