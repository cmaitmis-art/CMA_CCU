/**
 * complaints.js — Routes for Complaint Management
 */
const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const db = require('../db');
const { Op } = require('sequelize');

const { Complaint } = db.models;

// List of columns to return when querying complaints.
const complaintAttributes = [
  'id', 'serial_no', 'letter_date', 'received_ccu', 'mc_no',
  'apartment_name', 'complaint_name', 'issue_heading',
  'file_marked', 'tr_marked', 'reply_marked', 'remarks',
  'category', 'status', 'assigned_department', 'created_by', 'modified_by', 'history',
  'created_at', 'updated_at', 'document_path', 'document_name',
];

const addDaysPending = (complaint) => {
  if (!complaint.received_ccu) return { ...complaint, days_pending: null };
  const d = new Date(complaint.received_ccu);
  if (isNaN(d.getTime())) return { ...complaint, days_pending: null };
  return {
    ...complaint,
    days_pending: Math.floor((new Date() - d) / (1000 * 60 * 60 * 24))
  };
};

// GET /api/complaints
router.get('/', async (req, res) => {
  const { status, category, q, year, month, pending_overdue_15, department, exclude_closed, page = 1, limit = 20, sort = 'desc' } = req.query;
  const offset = (page - 1) * limit;

  try {
    const where = {};
    const andConditions = [];
    if (status) where.status = status;
    if (exclude_closed === 'true') where.status = { [Op.ne]: 'Closed' };
    if (category) where.category = category;
    
    if (department) {
      andConditions.push({
        [Op.or]: [
          { assigned_department: department },
          { status: { [Op.like]: `%${department}%` } }
        ]
      });
    }

    if (q) {
      andConditions.push({
        [Op.or]: [
          { serial_no: { [Op.like]: `%${q}%` } },
          { mc_no: { [Op.like]: `%${q}%` } },
          { apartment_name: { [Op.like]: `%${q}%` } },
          { complaint_name: { [Op.like]: `%${q}%` } },
          { issue_heading: { [Op.like]: `%${q}%` } },
        ]
      });
    }

    if (andConditions.length > 0) {
      where[Op.and] = andConditions;
    }

    if (month) {
      if (month.includes('-')) {
        where.received_ccu = { [Op.like]: `${month}-%` };
      } else if (year) {
        where.received_ccu = { [Op.like]: `${year}-${month}-%` };
      } else {
        where.received_ccu = { [Op.like]: `%-${month}-%` };
      }
    } else if (year) {
      where.received_ccu = { [Op.like]: `${year}-%` };
    }

    if (pending_overdue_15 === 'true') {
      where.status = { [Op.ne]: 'Closed' };
      const fifteenDaysAgo = new Date();
      fifteenDaysAgo.setDate(fifteenDaysAgo.getDate() - 15);
      where.received_ccu = { [Op.lt]: fifteenDaysAgo.toISOString().split('T')[0] };
    }

    const total = await Complaint.count({ where });
    let complaints;
    // Limit to large number if exporting
    if (limit == 999999) {
      complaints = await Complaint.findAll({ where, order: [['created_at', sort === 'asc' ? 'ASC' : 'DESC']], attributes: complaintAttributes });
    } else {
      complaints = await Complaint.findAll({
        where,
        order: [['created_at', sort === 'asc' ? 'ASC' : 'DESC']],
        limit: Number(limit),
        offset: Number(offset),
        attributes: complaintAttributes,
      });
    }

    res.json({
      rows: complaints.map((c) => addDaysPending(c.get({ plain: true }))),
      total,
      page: parseInt(page, 10),
      limit: parseInt(limit, 10),
    });
  } catch (err) {
    console.error('GET /complaints error:', err.message);
    res.status(500).json({ error: 'Failed to fetch complaints' });
  }
});

// POST /api/complaints/bulk
router.post('/bulk', async (req, res) => {
  if (!Array.isArray(req.body)) return res.status(400).json({ error: 'Expected array of complaints' });
  try {
    await Complaint.bulkCreate(req.body, { validate: true });
    
    if (db.models.SystemLog) {
      const user = req.body[0]?.user_name || req.body[0]?.created_by || 'System';
      await db.models.SystemLog.create({
        user_name: user,
        action: 'Bulk Imported Complaints',
        details: `Imported ${req.body.length} new complaint records`
      });
    }

    res.status(201).json({ message: 'Imported successfully' });
  } catch (err) {
    console.error('POST /complaints/bulk error:', err.message);
    res.status(500).json({ error: 'Failed to import complaints' });
  }
});

// POST /api/complaints/bulk-delete
router.post('/bulk-delete', async (req, res) => {
  const { serial_nos } = req.body;
  if (!Array.isArray(serial_nos) || serial_nos.length === 0) return res.status(400).json({ error: 'Expected array of serial_nos' });
  try {
    const deletedCount = await Complaint.destroy({
      where: { serial_no: { [Op.in]: serial_nos } }
    });

    if (deletedCount > 0 && db.models.SystemLog) {
      const user = req.body.user_name || req.query.user_name || 'System';
      await db.models.SystemLog.create({
        user_name: user,
        action: 'Deleted Complaints',
        details: `Bulk deleted ${deletedCount} complaint records (Serial Nos: ${serial_nos.join(', ')})`
      });
    }

    res.json({ message: 'Deleted imported complaints', deleted: deletedCount });
  } catch (err) {
    console.error('POST /complaints/bulk-delete error:', err.message);
    res.status(500).json({ error: 'Failed to delete complaints' });
  }
});

// DELETE /api/complaints
router.delete('/', async (req, res) => {
  try {
    const deletedCount = await Complaint.destroy({ where: {} });

    if (deletedCount > 0 && db.models.SystemLog) {
      const user = req.body.user_name || req.query.user_name || 'System';
      await db.models.SystemLog.create({
        user_name: user,
        action: 'Deleted ALL Complaints',
        details: `Deleted all ${deletedCount} complaint records`
      });
    }

    res.json({ message: 'All complaints deleted', deleted: deletedCount });
  } catch (err) {
    console.error('DELETE /complaints error:', err.message);
    res.status(500).json({ error: 'Failed to delete all complaints' });
  }
});

// POST /api/complaints
router.post('/', async (req, res) => {
  try {
    const complaint = await Complaint.create({
      ...req.body,
      status: req.body.status || 'New',
      history: JSON.stringify([{
        name: req.body.created_by || 'System',
        action: 'Added',
        time: new Date().toISOString()
      }])
    });
    res.status(201).json({ id: complaint.id, serial_no: complaint.serial_no });
  } catch (err) {
    console.error('POST /complaints error:', err.message);
    res.status(500).json({ error: 'Failed to create complaint' });
  }
});

// PATCH /api/complaints/:id
router.patch('/:id', async (req, res) => {
  try {
    const complaint = await Complaint.findByPk(req.params.id);
    if (!complaint) return res.status(404).json({ error: 'Complaint not found' });

    let history = [];
    try { history = complaint.history ? JSON.parse(complaint.history) : []; } catch (e) { }
    history.push({ name: req.body.modified_by || 'System', action: 'Modified', time: new Date().toISOString() });

    await complaint.update({ ...req.body, history: JSON.stringify(history) });
    res.json({ message: 'Complaint updated' });
  } catch (err) {
    console.error('PATCH /complaints/:id error:', err.message);
    res.status(500).json({ error: 'Failed to update complaint' });
  }
});

// DELETE /api/complaints/:id
router.delete('/:id', async (req, res) => {
  try {
    const complaint = await Complaint.findByPk(req.params.id);
    if (!complaint) return res.status(404).json({ error: 'Complaint not found' });
    await complaint.destroy();

    if (db.models.SystemLog) {
      const user = req.body.user_name || req.query.user_name || 'System';
      await db.models.SystemLog.create({
        user_name: user,
        action: 'Deleted Complaint',
        details: `Deleted complaint record: ${complaint.serial_no || complaint.subject || `ID ${complaint.id}`}`
      });
    }

    res.json({ message: 'Complaint deleted' });
  } catch (err) {
    console.error('DELETE /complaints/:id error:', err.message);
    res.status(500).json({ error: 'Failed to delete complaint' });
  }
});

// GET /api/complaints/dashboard/pending
router.get('/dashboard/pending', async (req, res) => {
  try {
    const rows = await Complaint.findAll({
      where: {
        status: { [Op.in]: ['New', 'Open', 'Pending'] },
      },
      order: [['received_ccu', 'ASC']],
      limit: 5,
    });
    res.json((rows || []).map((row) => addDaysPending(row.get({ plain: true }))));
  } catch (err) {
    console.error('GET /complaints/dashboard/pending error:', err.message);
    res.status(500).json({ error: 'Failed to fetch pending complaints' });
  }
});

// GET /api/complaints/stats/summary
router.get('/stats/summary', async (req, res) => {
  try {
    const fifteenDaysAgo = new Date();
    fifteenDaysAgo.setDate(fifteenDaysAgo.getDate() - 15);
    const cutoff = fifteenDaysAgo.toISOString().split('T')[0];

    const [total, pending, open, newStatus, closed, overdueCount, categories] = await Promise.all([
      Complaint.count(),
      Complaint.count({ where: { status: { [Op.ne]: 'Closed' } } }),
      Complaint.count({ where: { status: 'Open' } }),
      Complaint.count({ where: { status: 'New' } }),
      Complaint.count({ where: { status: 'Closed' } }),
      Complaint.count({ where: { status: { [Op.ne]: 'Closed' }, received_ccu: { [Op.lt]: cutoff } } }),
      Complaint.findAll({
        attributes: [[db.sequelize.fn('DISTINCT', db.sequelize.col('category')), 'category']],
        where: { category: { [Op.ne]: null } },
        raw: true,
      })
    ]);

    const distinctCats = categories.map(c => c.category).filter(Boolean);

    res.json({
      total,
      pending,
      open,
      new: newStatus,
      closed,
      overdue: overdueCount,
      totalCategories: distinctCats.length,
      categories: distinctCats
    });
  } catch (err) {
    console.error('GET /complaints/stats/summary error:', err.message);
    res.status(500).json({ error: 'Failed to fetch complaint statistics' });
  }
});

// ── GET /api/complaints/:id ─ Get single complaint by ID ────────────────────
router.get('/:id', async (req, res) => {
  try {
    const complaint = await Complaint.findByPk(req.params.id, {
      attributes: complaintAttributes,
    });

    if (!complaint) return res.status(404).json({ error: 'Complaint not found' });

    // Return with calculated days_pending
    res.json(addDaysPending(complaint.get({ plain: true })));
  } catch (err) {
    console.error('GET /complaints/:id error:', err.message);
    res.status(500).json({ error: 'Failed to fetch complaint' });
  }
});

// ── POST /api/complaints/:id/upload ─ Upload document for Complaint ────────
router.post('/:id/upload', async (req, res) => {
  try {
    const { id } = req.params;
    const { uploaded_by } = req.body;

    if (!req.files || !req.files.document) {
      return res.status(400).json({ error: 'No document uploaded' });
    }

    const complaint = await Complaint.findByPk(id);
    if (!complaint) return res.status(404).json({ error: 'Complaint not found' });

    const file = req.files.document;
    const ext = path.extname(file.name).toLowerCase();
    const finalName = `COMPLAINT_${id}_${Date.now()}${ext}`;
    const uploadsDir = path.join(__dirname, '../uploads/complaints');
    await fs.promises.mkdir(uploadsDir, { recursive: true });
    const absolutePath = path.join(uploadsDir, finalName);
    const relPath = `uploads/complaints/${finalName}`;

    await fs.promises.writeFile(absolutePath, file.data);

    let history = [];
    try { history = complaint.history ? JSON.parse(complaint.history) : []; } catch (e) { }
    history.push({
      name: uploaded_by || req.body.user_name || 'System',
      action: 'Uploaded Document',
      time: new Date().toISOString(),
      note: `Uploaded attachment: ${file.name}`
    });

    await complaint.update({
      document_path: relPath,
      document_name: file.name,
      history: JSON.stringify(history)
    });

    res.status(200).json({ message: 'Upload successful', record: complaint });
  } catch (err) {
    console.error('POST /api/complaints/:id/upload error:', err.message);
    res.status(500).json({ error: 'Failed to upload document' });
  }
});

// ── DELETE /api/complaints/:id/document ─ Remove document from Complaint ───
router.delete('/:id/document', async (req, res) => {
  try {
    const { id } = req.params;
    const complaint = await Complaint.findByPk(id);
    if (!complaint) return res.status(404).json({ error: 'Complaint not found' });

    if (complaint.document_path) {
      const absPath = path.join(__dirname, '../', complaint.document_path);
      try { await fs.promises.unlink(absPath); } catch (e) { }
    }

    let history = [];
    try { history = complaint.history ? JSON.parse(complaint.history) : []; } catch (e) { }
    history.push({
      name: req.body.user_name || 'System',
      action: 'Removed Document',
      time: new Date().toISOString(),
      note: `Removed attachment: ${complaint.document_name || 'Document'}`
    });

    await complaint.update({
      document_path: null,
      document_name: null,
      history: JSON.stringify(history)
    });

    res.json({ message: 'Document removed', record: complaint });
  } catch (err) {
    console.error('DELETE /api/complaints/:id/document error:', err.message);
    res.status(500).json({ error: 'Failed to remove document' });
  }
});

// ── PUT /api/complaints/:id/transfer ─ Transfer Complaint to a department ─────────
router.put('/:id/transfer', async (req, res) => {
  try {
    const { assigned_department, user_name, from_department } = req.body;
    const complaint = await Complaint.findByPk(req.params.id);
    if (!complaint) return res.status(404).json({ error: 'Complaint not found' });

    const isReturnToCCU = assigned_department === 'CCU';
    const newStatus = isReturnToCCU ? 'Pending' : 'Transferred';
    const newDept = isReturnToCCU ? null : assigned_department;

    let history = [];
    try { history = complaint.history ? JSON.parse(complaint.history) : []; } catch (e) {}
    history.push({
      name: user_name || 'System',
      action: isReturnToCCU ? 'Returned to CCU' : 'Transferred',
      from_department: from_department || 'ADMIN',
      time: new Date().toISOString(),
      note: isReturnToCCU ? 'Returned to CCU (Admin)' : `Transferred to ${assigned_department}`
    });

    await complaint.update({
      status: newStatus,
      assigned_department: newDept,
      history: JSON.stringify(history)
    });

    res.json(complaint);
  } catch (err) {
    console.error('PUT /complaints/:id/transfer error:', err.message);
    res.status(500).json({ error: 'Failed to transfer Complaint' });
  }
});

// ── PUT /api/complaints/:id/close ─ Close Complaint with reason and document ─────────
router.put('/:id/close', async (req, res) => {
  try {
    const { closed_reason, closed_department, user_name } = req.body;
    const complaint = await Complaint.findByPk(req.params.id);
    if (!complaint) return res.status(404).json({ error: 'Complaint not found' });

    let document_path = complaint.closed_document_path;
    let document_name = complaint.closed_document_name;

    if (req.files && req.files.document) {
      const file = req.files.document;
      const path = require('path');
      const fs = require('fs');
      const ext = path.extname(file.name).toLowerCase();
      const finalName = `COMPLAINT_CLOSED_${complaint.id}_${Date.now()}${ext}`;
      const uploadsDir = path.join(__dirname, '../uploads/complaints');
      await fs.promises.mkdir(uploadsDir, { recursive: true });
      const absolutePath = path.join(uploadsDir, finalName);
      await fs.promises.writeFile(absolutePath, file.data);
      document_path = `uploads/complaints/${finalName}`;
      document_name = file.name;
    }

    let history = [];
    try { history = complaint.history ? JSON.parse(complaint.history) : []; } catch (e) {}
    history.push({
      name: user_name || 'System',
      action: 'Closed',
      time: new Date().toISOString(),
      note: `Closed with reason: ${closed_reason}`
    });

    await complaint.update({
      status: 'Closed',
      closed_by: user_name,
      closed_department,
      closed_reason,
      closed_document_path: document_path,
      closed_document_name: document_name,
      history: JSON.stringify(history)
    });

    res.json(complaint);
  } catch (err) {
    console.error('PUT /complaints/:id/close error:', err.message);
    res.status(500).json({ error: 'Failed to close Complaint' });
  }
});

module.exports = router;
