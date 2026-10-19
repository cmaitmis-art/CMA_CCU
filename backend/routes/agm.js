const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const db = require('../db');
const { AgmRecord, ManagementCorporation, McomRecord } = db.models;
const { Op } = require('sequelize');

const uploadsDir = path.resolve(__dirname, '../uploads/agm');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const safeParseJson = (str) => {
  if (!str) return {};
  try {
    const parsed = JSON.parse(str);
    return typeof parsed === 'object' && parsed !== null ? parsed : {};
  } catch (e) {
    return { textNotes: str };
  }
};

// GET /api/agm - List all MCs or MCOMs and their AGM records
router.get('/', async (req, res) => {
  try {
    const { q, status, year, month, meetingType, recordType = 'mc', page = 1, limit = 20 } = req.query;
    const offset = (Math.max(1, Number(page)) - 1) * Math.max(1, Number(limit));

    const andConditions = [];

    if (recordType === 'mcom') {
      if (q) {
        andConditions.push({
          [Op.or]: [
            { file_no: { [Op.like]: `%${q}%` } },
            { new_file_no: { [Op.like]: `%${q}%` } },
            { old_file_no: { [Op.like]: `%${q}%` } },
            { management_corporation_name: { [Op.like]: `%${q}%` } },
          ]
        });
      }
      if (status) {
        andConditions.push({ agm_date_vise: status });
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

      const where = andConditions.length > 0 ? { [Op.and]: andConditions } : {};

      const { rows: records, count: total } = await McomRecord.findAndCountAll({
        where,
        offset,
        limit: Number(limit),
        order: [['id', 'DESC']],
      });

      const ids = records.map(r => r.id);
      const fileNos = records.map(r => r.new_file_no || r.file_no).filter(Boolean);

      const agmRecords = await AgmRecord.findAll({
        where: {
          [Op.or]: [
            { mc_id: { [Op.in]: ids } },
            ...(fileNos.length > 0 ? [{ file_no: { [Op.in]: fileNos } }] : [])
          ]
        }
      });

      const agmMap = {};
      agmRecords.forEach(ar => {
        const meta = safeParseJson(ar.notes);
        if (meta.record_type === 'mcom' || ar.file_no) {
          agmMap[ar.mc_id] = ar;
          if (ar.file_no) agmMap[ar.file_no] = ar;
        }
      });

      const rowsWithAgm = records.map(r => {
        const fn = r.new_file_no || r.file_no;
        const agm = agmMap[fn] || agmMap[r.id] || null;
        const meta = agm ? safeParseJson(agm.notes) : {};
        const plain = r.toJSON ? r.toJSON() : { ...r };

        return {
          ...plain,
          record_type: 'mcom',
          name: plain.management_corporation_name,
          next_agm_date: meta.next_agm_date || agm?.next_agm_date || plain.next_agm_date || null,
          meeting_held: meta.meeting_held || false,
          meeting_type: meta.meeting_type || 'Annual General Meeting',
          letter_sent: meta.letter_sent || false,
          letter_date: meta.letter_date || null,
          AgmRecord: agm,
        };
      });

      return res.json({
        total,
        page: Number(page),
        limit: Number(limit),
        rows: rowsWithAgm,
      });
    }

    // Default: MC Records
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

    const where = andConditions.length > 0 ? { [Op.and]: andConditions } : {};

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

    const rowsWithMeta = records.map(r => {
      const plain = r.toJSON ? r.toJSON() : { ...r };
      const meta = plain.AgmRecord ? safeParseJson(plain.AgmRecord.notes) : {};

      return {
        ...plain,
        record_type: 'mc',
        name: plain.name || plain.management_corporation_name,
        meeting_held: meta.meeting_held || false,
        meeting_type: plain.agm_meeting_type || meta.meeting_type || 'Annual General Meeting',
        letter_sent: meta.letter_sent || false,
        letter_date: meta.letter_date || null,
      };
    });

    res.json({
      total,
      page: Number(page),
      limit: Number(limit),
      rows: rowsWithMeta,
    });
  } catch (err) {
    console.error('GET /api/agm error:', err.message);
    res.status(500).json({ error: 'Failed to fetch AGM records' });
  }
});

// PATCH /api/agm/:id/meeting - Record or update AGM meeting details (works for both MC and MCOM)
router.patch('/:id/meeting', async (req, res) => {
  try {
    const { id } = req.params;
    const {
      record_type = 'mc',
      meeting_held,
      agm_date,
      next_agm_date,
      agm_date_vise,
      year,
      renewal_period,
      meeting_type,
      letter_sent,
      letter_date,
      notes,
      updated_by = 'System',
    } = req.body;

    // Status: if next_agm_date is set or meeting_held, determine 'Active' or 'Non Active'
    let finalStatus = agm_date_vise;
    if (!finalStatus && next_agm_date) {
      const nextD = new Date(next_agm_date);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      finalStatus = (!Number.isNaN(nextD.getTime()) && nextD >= today) ? 'Active' : 'Non Active';
    } else if (!finalStatus && (meeting_held || agm_date)) {
      finalStatus = 'Active';
    }

    let targetRecord = null;
    let fileNo = '';
    let entityName = '';

    if (record_type === 'mcom') {
      targetRecord = await McomRecord.findByPk(id);
      if (!targetRecord) return res.status(404).json({ error: 'M.Com record not found' });
      fileNo = targetRecord.new_file_no || targetRecord.file_no || '';
      entityName = targetRecord.management_corporation_name || '';

      const updateFields = {};
      if (agm_date !== undefined) updateFields.agm_date = agm_date || null;
      if (finalStatus !== undefined) {
        updateFields.agm_date_vise = finalStatus;
        updateFields.agm_status = finalStatus;
      }
      if (year !== undefined && year !== '') updateFields.year = Number(year);
      if (renewal_period !== undefined) {
        updateFields.renewal_period = renewal_period;
        const currentYear = new Date().getFullYear();
        const rpMatches = String(renewal_period).match(/\b(19|20)\d{2}\b/g);
        const rpYear = rpMatches ? parseInt(rpMatches[rpMatches.length - 1], 10) : parseInt(renewal_period, 10);
        if (!isNaN(rpYear)) {
          updateFields.renewal_date_vise = rpYear >= currentYear ? 'Active' : 'Non Active';
          updateFields.next_renewal_date = `${rpYear}-12-31`;
        }
      }
      if (updated_by) updateFields.modified_by = updated_by;

      await targetRecord.update(updateFields);
    } else {
      targetRecord = await ManagementCorporation.findByPk(id);
      if (!targetRecord) return res.status(404).json({ error: 'MC record not found' });
      fileNo = targetRecord.new_file_no || targetRecord.file_no || '';
      entityName = targetRecord.name || targetRecord.management_corporation_name || '';

      const updateFields = {};
      if (agm_date !== undefined) updateFields.agm_date = agm_date || null;
      if (next_agm_date !== undefined) updateFields.next_agm_date = next_agm_date || null;
      if (finalStatus !== undefined) updateFields.agm_date_vise = finalStatus;
      if (meeting_type !== undefined) updateFields.agm_meeting_type = meeting_type;
      if (year !== undefined && year !== '') updateFields.year = Number(year);
      if (renewal_period !== undefined) {
        updateFields.renewal_period = renewal_period;
        const currentYear = new Date().getFullYear();
        const rpMatches = String(renewal_period).match(/\b(19|20)\d{2}\b/g);
        const rpYear = rpMatches ? parseInt(rpMatches[rpMatches.length - 1], 10) : parseInt(renewal_period, 10);
        if (!isNaN(rpYear)) {
          const st = rpYear >= currentYear ? 'Active' : 'Non Active';
          updateFields.renewal_date_vise = st;
          updateFields.active_non_active = st;
          updateFields.renewal_status = st;
          updateFields.next_renewal_date = `${rpYear}-12-31`;
        }
      }

      await targetRecord.update(updateFields);
    }

    // Now update or create AgmRecord with metadata
    let agmRecord = await AgmRecord.findOne({
      where: {
        [Op.or]: [
          { mc_id: id },
          ...(fileNo ? [{ file_no: fileNo }] : [])
        ]
      }
    });

    const existingMeta = agmRecord ? safeParseJson(agmRecord.notes) : {};

    const mergedMeta = {
      ...existingMeta,
      record_type,
      meeting_held: meeting_held !== undefined ? !!meeting_held : (existingMeta.meeting_held || false),
      meeting_type: meeting_type !== undefined ? meeting_type : (existingMeta.meeting_type || 'Annual General Meeting'),
      next_agm_date: next_agm_date !== undefined ? next_agm_date : (existingMeta.next_agm_date || targetRecord.next_agm_date || null),
      letter_sent: letter_sent !== undefined ? !!letter_sent : (existingMeta.letter_sent || false),
      letter_date: letter_date !== undefined ? letter_date : (existingMeta.letter_date || null),
      notes: notes !== undefined ? notes : (existingMeta.notes || ''),
      updated_at: new Date().toISOString(),
    };

    if (!agmRecord) {
      agmRecord = await AgmRecord.create({
        mc_id: id,
        file_no: fileNo,
        mc_name: entityName,
        agm_date: agm_date || targetRecord.agm_date || null,
        next_agm_date: next_agm_date || targetRecord.next_agm_date || null,
        agm_date_vise: finalStatus || targetRecord.agm_date_vise || 'Active',
        notes: JSON.stringify(mergedMeta),
        uploaded_by: updated_by,
      });
    } else {
      await agmRecord.update({
        file_no: fileNo || agmRecord.file_no,
        mc_name: entityName || agmRecord.mc_name,
        agm_date: agm_date !== undefined ? agm_date : agmRecord.agm_date,
        next_agm_date: next_agm_date !== undefined ? next_agm_date : agmRecord.next_agm_date,
        agm_date_vise: finalStatus !== undefined ? finalStatus : agmRecord.agm_date_vise,
        notes: JSON.stringify(mergedMeta),
      });
    }

    res.json({
      success: true,
      message: 'AGM meeting details updated successfully',
      record: targetRecord,
      agmRecord,
      meta: mergedMeta
    });
  } catch (err) {
    console.error('PATCH /api/agm/:id/meeting error:', err.message);
    res.status(500).json({ error: err.message || 'Failed to update AGM meeting details' });
  }
});

// POST /api/agm/:mc_id/upload - Upload AGM document
router.post('/:mc_id/upload', async (req, res) => {
  try {
    const { mc_id } = req.params;
    const { uploaded_by, notes, record_type = 'mc' } = req.body;

    if (!req.files || !req.files.document) {
      return res.status(400).json({ error: 'No document uploaded' });
    }

    let target = null;
    let fileNo = '';
    let name = '';

    if (record_type === 'mcom') {
      target = await McomRecord.findByPk(mc_id);
      if (!target) return res.status(404).json({ error: 'M.Com not found' });
      fileNo = target.new_file_no || target.file_no || target.old_file_no || '-';
      name = target.management_corporation_name || '-';
    } else {
      target = await ManagementCorporation.findByPk(mc_id);
      if (!target) return res.status(404).json({ error: 'MC not found' });
      fileNo = target.new_file_no || target.file_no || target.old_file_no || '-';
      name = target.name || target.management_corporation_name || '-';
    }

    const file = req.files.document;
    const ext = path.extname(file.name).toLowerCase();
    const finalName = `AGM_${record_type}_${mc_id}_${Date.now()}${ext}`;
    const absolutePath = path.join(uploadsDir, finalName);
    const relPath = `uploads/agm/${finalName}`;

    await fs.promises.writeFile(absolutePath, file.data);

    let [agmRecord, created] = await AgmRecord.findOrCreate({
      where: {
        [Op.or]: [
          { mc_id },
          ...(fileNo ? [{ file_no: fileNo }] : [])
        ]
      },
      defaults: {
        mc_id,
        file_no: fileNo,
        mc_name: name,
        agm_date: target.agm_date || null,
        next_agm_date: target.next_agm_date || null,
        agm_date_vise: target.agm_date_vise || null,
        document_path: relPath,
        document_name: file.name,
        uploaded_by: uploaded_by || 'System',
        notes: JSON.stringify({ record_type, notes: notes || '' }),
      }
    });

    if (!created) {
      const existingMeta = safeParseJson(agmRecord.notes);
      agmRecord.document_path = relPath;
      agmRecord.document_name = file.name;
      agmRecord.uploaded_by = uploaded_by || agmRecord.uploaded_by;
      agmRecord.notes = JSON.stringify({ ...existingMeta, record_type, notes: notes || existingMeta.notes || '' });
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
