const express = require('express');
const router = express.Router();
const db = require('../db');
const { Op } = require('sequelize');
const { ChatMessage, User } = db.models;

// Middleware to mock authentication if no req.user is set.
// The system seems to use session or headers, but for this widget, we'll try to find the user via headers if necessary.
const getUser = async (req, res, next) => {
  // Try to get user_name from query or body (API interceptor adds this usually)
  const username = req.query.user_name || req.body.user_name || req.headers['x-user-name'];
  
  if (!username) {
    return res.status(401).json({ error: 'Unauthorized: User not identified.' });
  }

  // Find exact user in DB
  // Because the interceptor might append department like "Admin (CCU)", we can try to extract just the name
  let cleanName = username.split(' (')[0].trim();
  const user = await User.findOne({ where: { [Op.or]: [{ username: cleanName }, { name: cleanName }] } });
  
  if (!user) {
    return res.status(401).json({ error: 'Unauthorized: User not found in DB.' });
  }

  req.user = user;
  next();
};

router.use(getUser);

// GET /chat/unread -> Get unread counts per user for the current user
router.get('/unread', async (req, res) => {
  try {
    const unreadMessages = await ChatMessage.findAll({
      where: {
        receiver_id: req.user.id,
        is_read: false,
        deleted_by_receiver: false,
        message_type: 'direct' // Direct or AI
      },
      attributes: ['sender_id', [db.sequelize.fn('COUNT', db.sequelize.col('id')), 'count']],
      group: ['sender_id']
    });

    const totalBroadcasts = await ChatMessage.count({
      where: {
        receiver_id: null,
        message_type: 'broadcast'
      }
    });

    res.json({ unread: unreadMessages, totalBroadcasts });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch unread' });
  }
});

// GET /chat/users -> List all users except current
router.get('/users', async (req, res) => {
  try {
    const users = await User.findAll({
      where: { id: { [Op.ne]: req.user.id } },
      attributes: ['id', 'name', 'username', 'department', 'designation', 'avatar_url', 'is_online']
    });
    res.json(users);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// GET /chat/messages/:targetId -> Fetch messages
router.get('/messages/:targetId', async (req, res) => {
  try {
    const targetId = req.params.targetId; // 'ai' or a number
    
    let whereClause = {};

    if (targetId === 'ai') {
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
      whereClause = {
        [Op.or]: [
          { sender_id: req.user.id, receiver_id: null, message_type: 'ai' },
          { sender_id: req.user.id, receiver_id: null, message_type: 'direct' } // user messages to AI
        ],
        deleted_by_sender: false,
        createdAt: {
          [Op.gte]: oneDayAgo
        }
      };
    } else if (targetId === 'all') {
      whereClause = {
        receiver_id: null,
        message_type: 'broadcast',
        // For broadcast, we could filter by deleted_by_sender if the current user sent it, but normally it's visible to all
      };
    } else {
      const otherUserId = parseInt(targetId, 10);
      
      // Admin override: if the user is an admin, they can see messages between ANY two users?
      // Wait, the user asked "personal koma kalath eka adminta penna one"
      // If the admin clicks on "User A", maybe they see all messages sent by User A to anyone?
      // No, let's just say Admin can view conversation between User A and User B if we pass both,
      // but here we only have `targetId`. So if Admin clicks User A, they see conversation between Admin and User A.
      // Wait! How does the Admin see User A's private messages with User C?
      // We can just add a global fetch for admin, but for now let's just make Admin able to see all messages User A sent or received?
      // If targetId is a user, let's just show standard chat between Admin and User A. 
      // To see EVERYTHING, maybe we just add a condition: if Admin clicks "All", they see ALL personal messages + broadcasts?
      
      whereClause = {
        [Op.or]: [
          { sender_id: req.user.id, receiver_id: otherUserId, deleted_by_sender: false },
          { sender_id: otherUserId, receiver_id: req.user.id, deleted_by_receiver: false }
        ],
        message_type: 'direct'
      };
    }

    // Special logic: If Admin and targetId === 'all', show EVERYTHING (broadcasts + all direct messages)
    if (targetId === 'all' && req.user.role === 'Admin') {
      whereClause = {
        [Op.or]: [
          { message_type: 'broadcast' },
          { message_type: 'direct' }
        ]
      };
    }

    const messages = await ChatMessage.findAll({
      where: whereClause,
      order: [['createdAt', 'ASC']],
      include: [
        { model: User, as: 'Sender', attributes: ['id', 'name', 'avatar_url'] },
        { model: User, as: 'Receiver', attributes: ['id', 'name', 'avatar_url'] }
      ]
    });

    res.json(messages);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch messages' });
  }
});

// POST /chat/messages -> Send message
router.post('/messages', async (req, res) => {
  try {
    const { receiver_id, content, metadata } = req.body;
    let isAI = false;
    let isBroadcast = false;
    
    if (receiver_id === 'ai') isAI = true;
    else if (receiver_id === 'all') isBroadcast = true;
    else if (!receiver_id) isAI = true;

    // Save user's message
    const msg = await ChatMessage.create({
      sender_id: req.user.id,
      receiver_id: (isAI || isBroadcast) ? null : parseInt(receiver_id, 10),
      content,
      metadata: metadata ? JSON.parse(metadata) : null,
      message_type: isBroadcast ? 'broadcast' : (isAI ? 'direct' : 'direct')
    });

    // Generate AI Response if needed
    let aiResponse = null;
    if (isAI) {
      // Very basic Mock AI
      let aiContent = "I am a simulated assistant. Currently, I only know how to look up File Numbers (e.g., CMA/CCU/2026/PVT/MC/1092) and link you to the history page. Feel free to try that out!";
      let aiMeta = null;

      if (/\b(hello|hi|hey)\b/i.test(content)) {
        aiContent = `Hello ${req.user.name}! How can I assist you today? Try sending me a file number.`;
      } else if (/\bhelp\b/i.test(content)) {
        aiContent = "You can chat with me by sending a File Number to auto-search, or select the 'Colleagues' tab to message another user directly.";
      } else {
        // Advanced Rule-Based Bot Logic
        let intent = 'details';
        if (/\b(status|active)\b/i.test(content)) intent = 'status';
        else if (/\b(unit|units|how many)\b/i.test(content)) intent = 'units';
        else if (/\b(register|registered|date)\b/i.test(content)) intent = 'date';

        // Strip out conversational filler words and intent words to isolate the target search term
        let searchTerm = content
            .replace(/\b(what|is|the|of|in|a|an|does|have|has|are|there|do|can|you|find|search|for|details|about|where|tell|me|show|how|many|when|was|give|information|more|please|need|know|any|records|matching)\b/gi, '')
            .replace(/\b(status|active|unit|units|register|registered|date)\b/gi, '')
            .replace(/[^a-zA-Z0-9/\-\s]/g, '') // remove punctuation
            .replace(/\s+/g, ' ')
            .trim();

        if (searchTerm.length >= 3) {
           const { ManagementCorporation, McomRecord } = db.models;
           try {
             // 1. Search ManagementCorporation
             let mc = await ManagementCorporation.findOne({
               where: {
                 [Op.or]: [
                   { name: { [Op.like]: '%' + searchTerm + '%' } },
                   { address: { [Op.like]: '%' + searchTerm + '%' } },
                   { plan_no: { [Op.like]: '%' + searchTerm + '%' } },
                   { file_no: { [Op.like]: '%' + searchTerm + '%' } }
                 ]
               }
             });
             
             if (mc) {
               const fileNoMatch = mc.file_no;
               aiMeta = { url: `/customer-history?search=${encodeURIComponent(fileNoMatch)}`, title: `View ${fileNoMatch}` };
               
               if (intent === 'status') {
                 aiContent = `The Management Corporation **${mc.name}** (${fileNoMatch}) is currently registered in our system. You can view its full active/renewal status by clicking below.`;
               } else if (intent === 'units') {
                 aiContent = `**${mc.name}** has a total of **${mc.units || 'unknown'}** units (Residential: ${mc.residential_units || 0}, Non-Residential: ${mc.non_residential_units || 0}).`;
               } else if (intent === 'date') {
                 aiContent = `I found **${mc.name}**. To see its exact registration and renewal dates, please check its Customer History.`;
               } else {
                 const foundDetails = `• File No: ${fileNoMatch}\n• Name: ${mc.name}\n• Plan No: ${mc.plan_no || 'N/A'}\n• Address: ${mc.address || 'N/A'}\n• Units: ${mc.units || 'N/A'}`;
                 aiContent = `Here is the information I found for **"${searchTerm}"**:\n\n${foundDetails}\n\nClick below to view the full Customer History.`;
               }
             } else {
               // 2. Search McomRecord
               let mcom = await McomRecord.findOne({
                 where: {
                   [Op.or]: [
                     { management_corporation_name: { [Op.like]: '%' + searchTerm + '%' } },
                     { address: { [Op.like]: '%' + searchTerm + '%' } },
                     { plan_no: { [Op.like]: '%' + searchTerm + '%' } },
                     { file_no: { [Op.like]: '%' + searchTerm + '%' } },
                     { new_file_no: { [Op.like]: '%' + searchTerm + '%' } },
                     { old_file_no: { [Op.like]: '%' + searchTerm + '%' } }
                   ]
                 }
               });
               
               if (mcom) {
                 const fileNoMatch = mcom.file_no || mcom.new_file_no || mcom.old_file_no;
                 const nameStr = mcom.management_corporation_name || 'N/A';
                 aiMeta = { url: `/customer-history?search=${encodeURIComponent(fileNoMatch)}`, title: `View ${fileNoMatch}` };
                 
                 if (intent === 'status') {
                   aiContent = `The Management Committee for **${nameStr}** (${fileNoMatch}) currently has a status of: **${mcom.active_non_active || 'Unknown'}**.`;
                 } else if (intent === 'units') {
                   aiContent = `The Management Committee for **${nameStr}** has **${mcom.units || 'unknown'}** units registered.`;
                 } else if (intent === 'date') {
                   aiContent = `The Management Committee for **${nameStr}** was registered on **${mcom.reg_date || 'Unknown'}**.`;
                 } else {
                   const foundDetails = `• File No: ${fileNoMatch}\n• Name: ${nameStr}\n• Plan No: ${mcom.plan_no || 'N/A'}\n• Address: ${mcom.address || 'N/A'}\n• Status: ${mcom.active_non_active || 'Unknown'}`;
                   aiContent = `Here is the information I found for **"${searchTerm}"**:\n\n${foundDetails}\n\nClick below to view the full Customer History.`;
                 }
               } else {
                 aiContent = `I could not find any records matching **"${searchTerm}"**. Could you please double-check the spelling, or try searching by the exact File Number?`;
               }
             }
           } catch (dbErr) {
             console.error("AI Keyword Search Error:", dbErr);
             aiContent = "I ran into a problem while searching the database. Please try again later.";
           }
        } else {
           aiContent = "Could you please specify the Name, Plan Number, or File Number of the Management Corporation you want information about? (e.g., 'give me details for Station West')";
        }
      }

      aiResponse = await ChatMessage.create({
        sender_id: req.user.id, // We'll just fake it, or we could have a system user. Actually, better: we'll set sender_id to a dummy or keep it as user but mark as AI.
        // Wait, sender_id is non-null. Let's make sender_id point to User 1 (Admin) for AI, or we can just create a system user.
        // For safety, we'll set sender_id = req.user.id and receiver_id = null, BUT we will flag it in metadata.
        // Actually, the model says sender_id is allowNull: false.
        // Let's just use req.user.id for both sides of AI but distinguish by `metadata.is_ai_response = true`.
        sender_id: req.user.id,
        receiver_id: null,
        content: aiContent,
        metadata: { ...aiMeta, is_ai_response: true },
        message_type: 'ai'
      });
    }

    res.json({ success: true, message: msg, aiResponse });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to send message' });
  }
});

// PUT /chat/read/:targetId -> Mark messages as read
router.put('/read/:targetId', async (req, res) => {
  try {
    const targetId = req.params.targetId;
    let whereClause = { receiver_id: req.user.id, is_read: false };
    
    if (targetId === 'ai') {
      whereClause.sender_id = req.user.id; 
      whereClause.message_type = 'ai';
    } else if (targetId !== 'all') {
      whereClause.sender_id = parseInt(targetId, 10);
    }

    await ChatMessage.update({ is_read: true }, { where: whereClause });
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to mark read' });
  }
});

// DELETE /chat/messages/:id -> Soft delete
router.delete('/messages/:id', async (req, res) => {
  try {
    const msg = await ChatMessage.findByPk(req.params.id);
    if (!msg) return res.status(404).json({ error: 'Not found' });

    if (msg.sender_id === req.user.id) {
      msg.deleted_by_sender = true;
    } else if (msg.receiver_id === req.user.id) {
      msg.deleted_by_receiver = true;
    } else {
      return res.status(403).json({ error: 'Forbidden' });
    }

    await msg.save();
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to delete message' });
  }
});

module.exports = router;
