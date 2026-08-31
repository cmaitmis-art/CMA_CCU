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

  // Tell the browser to wait 5 seconds before trying to reconnect if the connection drops.
  // This prevents the frontend from immediately hammering the vite proxy while the backend is restarting,
  // which avoids the "ECONNREFUSED" proxy errors in the terminal.
  res.write('retry: 5000\n\n');

  // Send a heartbeat every 15 seconds to keep the connection alive
  const heartbeat = setInterval(() => {
    res.write(': heartbeat\n\n');
  }, 15000);

  const onNewNotification = (notification) => {
    res.write(`data: ${JSON.stringify(notification)}\n\n`);
  };

  notificationEmitter.on('new', onNewNotification);

  req.on('close', () => {
    clearInterval(heartbeat);
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
    const { user_id, role, include_all } = req.query;

    // Fetch all recent notifications
    const allNotifications = await db.models.Notification.findAll({
      order: [['created_at', 'DESC']],
      limit: 200,
    });

    // Filter by target_role if role provided (Admin role can see all notifications)
    let filtered = allNotifications.filter((n) => {
      const userRole = String(role).toUpperCase();
      if (userRole === 'ADMIN') return true; // Admin bypass
      
      if (!n.target_role) {
        // It's a broadcast to all, BUT we exclude specific specialized departments
        // like Technical or Legal so their notification feed isn't cluttered.
        if (userRole.includes('TECHNICAL') || userRole.includes('LEGAL')) return false;
        return true; 
      }
      
      // If there is a specific target_role
      if (!role) return true; // no role filter requested
      return String(n.target_role).toUpperCase() === userRole;
    });

    // Exclude notifications already dismissed by this user (unless include_all=true)
    let dismissedIds = new Set();
    if (user_id) {
      const uid = parseInt(user_id, 10);
      if (!isNaN(uid)) {
        const reads = await db.models.NotificationRead.findAll({
          where: { user_id: uid },
          attributes: ['notification_id'],
        });
        dismissedIds = new Set(reads.map((r) => r.notification_id));

        if (include_all !== 'true') {
          filtered = filtered.filter((n) => !dismissedIds.has(n.id));
        }
      }
    }

    // Attach dismissed flag when include_all is requested
    if (include_all === 'true') {
      filtered = filtered.map(n => ({
        ...n.toJSON(),
        dismissed: dismissedIds.has(n.id),
      }));
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
 * DELETE /api/notifications/:id/dismiss
 *
 * Un-dismisses (restores) a notification for a specific user.
 * Query param: ?user_id=<id>
 */
router.delete('/:id/dismiss', async (req, res) => {
  try {
    const notification_id = parseInt(req.params.id, 10);
    const user_id = parseInt(req.query?.user_id || req.body?.user_id, 10);

    if (isNaN(notification_id) || isNaN(user_id)) {
      return res.status(400).json({ success: false, message: 'Invalid notification_id or user_id' });
    }

    await db.models.NotificationRead.destroy({ where: { user_id, notification_id } });

    res.json({ success: true });
  } catch (error) {
    console.error('Error un-dismissing notification:', error);
    res.status(500).json({ success: false, message: 'Server error un-dismissing notification' });
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
