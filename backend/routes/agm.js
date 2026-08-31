const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const db = require('../db');
const { AgmRecord, ManagementCorporation } = db.models;
const { Op } = require('sequelize');

const uploadsDir = path.resolve(__dirname, '../uploads/agm');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// GET /api/agm - List all MCs and their AGM records
router.get('/', async (req, res) => {
  try {
    const { q, status, year, month, meetingType, page = 1, limit = 20 } = req.query;
    const offset = (Math.max(1, Number(page)) - 1) * Math.max(1, Number(limit));

    const where = {};
    const andConditions = [];

    if (q) {
      andConditions.push({
        [Op.or]: [
          { file_no: { [Op.like]: `%${q}%` } },
          { new_file_no: { [Op.like]: `%${q}%` } },
          { old_file_no: { [Op.like]: `%${q}%` } },
          { name: { [Op.like]: `%${q}%` } },
          { management_corporation_name: { [Op.like]: `%${q}%` } },
        ]
      });
    }
    if (status) {
      andConditions.push({ agm_date_vise: status });
    }
    if (meetingType) {
      andConditions.push({ agm_meeting_type: meetingType });
    }
    if (month) {
      if (month.includes('-')) {
        andConditions.push({ reg_date: { [Op.like]: `${month}-%` } });
      } else if (year) {
        andConditions.push({ reg_date: { [Op.like]: `${year}-${month}-%` } });
      } else {
        andConditions.push({ reg_date: { [Op.like]: `%-${month}-%` } });
      }
    } else if (year) {
      andConditions.push({ year: Number(year) });
    }

    if (andConditions.length > 0) {
      where[Op.and] = andConditions;
    }

    const { rows: records, count: total } = await ManagementCorporation.findAndCountAll({
      where,
      offset,
      limit: Number(limit),
      order: [['id', 'DESC']],
      include: [{
        model: AgmRecord,
        required: false,
      }],
    });

    res.json({
      total,
      page: Number(page),
      limit: Number(limit),
      rows: records,
    });
  } catch (err) {
    console.error('GET /api/agm error:', err.message);
    res.status(500).json({ error: 'Failed to fetch AGM records' });
  }
});

// POST /api/agm/:mc_id/upload - Upload AGM document
router.post('/:mc_id/upload', async (req, res) => {
  try {
    const { mc_id } = req.params;
    const { uploaded_by, notes } = req.body;

    if (!req.files || !req.files.document) {
      return res.status(400).json({ error: 'No document uploaded' });
    }

    const mc = await ManagementCorporation.findByPk(mc_id);
    if (!mc) return res.status(404).json({ error: 'MC not found' });

    const file = req.files.document;
    const ext = path.extname(file.name).toLowerCase();
    const finalName = `AGM_${mc_id}_${Date.now()}${ext}`;
    const absolutePath = path.join(uploadsDir, finalName);
    const relPath = `uploads/agm/${finalName}`;

    await fs.promises.writeFile(absolutePath, file.data);

    const [agmRecord, created] = await AgmRecord.findOrCreate({
      where: { mc_id },
      defaults: {
        file_no: mc.new_file_no || mc.file_no || mc.old_file_no || '-',
        mc_name: mc.name || mc.management_corporation_name || '-',
        agm_date: mc.agm_date || null,
        next_agm_date: mc.next_agm_date || null,
        agm_date_vise: mc.agm_date_vise || null,
        document_path: relPath,
        document_name: file.name,
        uploaded_by: uploaded_by || 'Unknown',
        notes: notes || '',
      }
    });

    if (!created) {
      agmRecord.document_path = relPath;
      agmRecord.document_name = file.name;
      agmRecord.uploaded_by = uploaded_by || agmRecord.uploaded_by;
      if (notes) agmRecord.notes = notes;
      await agmRecord.save();
    }

    res.status(200).json({ message: 'Upload successful', record: agmRecord });
  } catch (err) {
    console.error('POST /api/agm/:mc_id/upload error:', err.message);
    res.status(500).json({ error: 'Failed to upload document' });
  }
});

// DELETE /api/agm/:mc_id - Delete AGM document
router.delete('/:mc_id', async (req, res) => {
  try {
    const { mc_id } = req.params;
    const record = await AgmRecord.findOne({ where: { mc_id } });

    if (!record) {
      return res.status(404).json({ error: 'AGM record not found' });
    }

    if (record.document_path) {
      const fullPath = path.resolve(__dirname, '..', record.document_path);
      if (fs.existsSync(fullPath)) {
        fs.unlinkSync(fullPath);
      }
    }

    await record.destroy();
    res.json({ success: true });
  } catch (err) {
    console.error('DELETE /api/agm/:mc_id error:', err.message);
    res.status(500).json({ error: 'Failed to delete AGM record' });
  }
});

module.exports = router;
