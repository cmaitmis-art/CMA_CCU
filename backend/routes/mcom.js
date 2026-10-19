/**
 * mcom.js — Routes for M.Com (Management Committee) Record Management
 * 
 * WHAT THIS FILE DOES:
 * Handles CRUD operations for M.Com records:
 *   GET    /api/mcom              → List records with search, filter, pagination
 *   GET    /api/mcom/stats/summary → Count records by status
 *   GET    /api/mcom/:id          → Get single record
 *   POST   /api/mcom              → Create new record
 *   PATCH  /api/mcom/:id          → Update a record
 *   DELETE /api/mcom/:id          → Delete a record
 *   POST   /api/mcom/bulk         → Bulk import/upsert from Excel
 *   POST   /api/mcom/bulk-delete  → Delete multiple records by file_no
 * 
 * NOTES:
 * - Uses Sequelize ORM (McomRecord model)
 * - Uses Op.like (NOT Op.iLike) because SQLite doesn't support iLike.
 */

const express = require('express');
const router = express.Router();
const db = require('../db');
const { mergeImportPayload } = require('../utils/importMerge');

// Destructure the model once — cleaner than re-fetching in every handler
const { McomRecord } = db.models;

// ── Helper: Allowed writable columns ────────────────────────────────────────
// Whitelist of columns that can be written. Protects against mass-assignment.
const WRITABLE_COLS = [
  'reg_date', 'old_file_no', 'remark', 'new_file_no',
  'management_corporation_name', 'address', 'units', 'plan_no',
  'secretary', 'secretary_unit_no', 'treasurer', 'treasurer_unit_no',
  'renewal_period', 'agm_date',
  'agm_minutes', 'attendance', 'audited_account', 'building_insurance',
  'active_non_active', 'renewal_date_vise', 'agm_date_vise',
  'renewal_status', 'agm_status',
  'mc_mcom', 'engineer', 'management_assistant',
  'town', 'council', 'certificate_file_no', 'email_address',
  'awareness_date',
  // Filtering / derived columns
  'category', 'year', 'status',
  'created_by', 'modified_by',

  // Renewal payment / acknowledgement fields
  'renewal_paid', 'renewal_paid_date', 'renewal_paid_amount', 'renewal_paid_year', 'renewal_paid_years',
  'renewal_receipt_no', 'acknowledgement_no', 'acknowledgement_date', 'renewal_payment_status', 'next_renewal_date'
];

/**
 * Strip ISO timestamp suffix from date values.
 * '2026-04-28T00:00:00.000Z' → '2026-04-28'
 */
const MCOM_DATE_COLS = [
  'reg_date', 'agm_date', 'next_agm_date', 'next_renewal_date',
  'renewal_paid_date', 'acknowledgement_date', 'awareness_date',
];

/**
 * Strip ISO timestamp suffix from date fields and normalize valid dates.
 * '2026-04-28T00:00:00.000Z' → '2026-04-28'
 * '15/04/2024' → '2024-04-15'
 * Excel serial numbers (e.g. 44561) → '2021-12-31'
 * Already-clean YYYY-MM-DD values are returned unchanged.
 * Non-date placeholders ('_', '-', 'N/A', etc.) or unparseable values → null
 * null/undefined/''/falsy → null
 */
function sanitizeDateValue(v) {
  if (v === null || v === undefined) return null;
  if (v instanceof Date) {
    return isNaN(v.getTime()) ? null : v.toISOString().slice(0, 10);
  }
  if (typeof v === 'number') {
    if (v >= 1000 && v <= 100000) {
      const epoch = new Date(Date.UTC(1899, 11, 30));
      epoch.setUTCDate(epoch.getUTCDate() + Math.floor(v));
      return epoch.toISOString().slice(0, 10);
    }
    return null;
  }
  const s = String(v).trim();
  if (!s) return null;
  // Non-date placeholders like '_', '-', '--', '.... / .... / ....', 'n/a', etc.
  if (/^[_.\-\/\s]+$/.test(s) || /^(n\/?a|nil|none|null|undefined|pending|tbd|\?|0000-00-00|00\/00\/0000|not\s+applicable|not\s+yet)$/i.test(s)) {
    return null;
  }
  // Already YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  // ISO with time: 2023-10-11T00:00:00.000Z or 2023-10-11 00:00:00
  const isoMatch = s.match(/^(\d{4}-\d{2}-\d{2})[T\s]/);
  if (isoMatch) return isoMatch[1];
  // YYYY/MM/DD or YYYY.MM.DD
  const ymdMatch = s.match(/^(\d{4})[./](\d{1,2})[./](\d{1,2})$/);
  if (ymdMatch) {
    const y = ymdMatch[1];
    const m = ymdMatch[2].padStart(2, '0');
    const d = ymdMatch[3].padStart(2, '0');
    if (parseInt(m, 10) >= 1 && parseInt(m, 10) <= 12 && parseInt(d, 10) >= 1 && parseInt(d, 10) <= 31) {
      return `${y}-${m}-${d}`;
    }
  }
  // DD/MM/YYYY or DD-MM-YYYY or DD.MM.YYYY
  const dmyMatch = s.match(/^(\d{1,2})[./-](\d{1,2})[./-](\d{4})$/);
  if (dmyMatch) {
    const day = parseInt(dmyMatch[1], 10);
    const month = parseInt(dmyMatch[2], 10);
    const year = parseInt(dmyMatch[3], 10);
    if (month >= 1 && month <= 12 && day >= 1 && day <= 31 && year >= 1900 && year <= 2100) {
      return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    }
  }
  // Excel serial number as string (e.g. "44561")
  if (/^\d{4,5}$/.test(s)) {
    const num = parseInt(s, 10);
    if (num >= 1000 && num <= 99999) {
      const epoch = new Date(Date.UTC(1899, 11, 30));
      epoch.setUTCDate(epoch.getUTCDate() + num);
      return epoch.toISOString().slice(0, 10);
    }
  }
  // Fallback: parse with JS Date
  const parsed = new Date(s);
  if (!isNaN(parsed.getTime())) {
    const yr = parsed.getFullYear();
    if (yr >= 1900 && yr <= 2100) {
      const mm = String(parsed.getMonth() + 1).padStart(2, '0');
      const dd = String(parsed.getDate()).padStart(2, '0');
      return `${yr}-${mm}-${dd}`;
    }
  }
  // Never return an unparsed raw string for a DATE column!
  return null;
}

function sanitizeDates(data) {
  for (const col of MCOM_DATE_COLS) {
    if (col in data) {
      data[col] = sanitizeDateValue(data[col]);
    }
  }
  return data;
}

/**
 * Pick only allowed keys from the request body.
 * Converts empty strings to null for clean database storage.
 * Also sanitizes date fields to plain YYYY-MM-DD.
 */
function pickWritable(body) {
  const out = {};
  for (const col of WRITABLE_COLS) {
    if (col in body) {
      out[col] = body[col] === '' ? null : body[col];
    }
  }
  return sanitizeDates(out);
}

/**
 * Convert numeric string fields to integers.
 * Handles values like "1,200" → 1200. Invalid values become null.
 */
function coerceInts(data, ...cols) {
  for (const col of cols) {
    if (col in data) {
      const v = data[col];
      if (v === null || v === undefined || v === '') {
        data[col] = null;
        continue;
      }
      const n = parseInt(String(v).replace(/,/g, ''), 10);
      data[col] = Number.isFinite(n) ? n : null;
    }
  }
  return data;
}

/**
 * Resolve the file_no from the request body.
 * Checks body.file_no first, then falls back to new_file_no / old_file_no.
 */
function resolveFileNo(body, data) {
  if (body.file_no) return body.file_no;
  return data.new_file_no || data.old_file_no || null;
}

function getMcomEffectiveStatus(r) {
  if (!r) return 'Active';
  const p = r.renewal_payment_status;
  const a = (r.active_non_active || '').trim().toLowerCase();
  const v = (r.renewal_date_vise || '').trim().toLowerCase();
  const currentYear = new Date().getFullYear();
  const yr = parseInt(r.renewal_period, 10);

  if (p === 'Pending Approval' || r.status === 'Pending') return 'Pending';
  if (a === 'non active' || a === 'nonactive' || a === 'inactive' || v === 'non active' || v === 'nonactive' || v === 'inactive' || r.status === 'Non Active') return 'Non Active';
  if (a === 'active' || v === 'active' || r.status === 'Active' || p === 'Approved') return 'Active';
  if (yr && yr < currentYear) return 'Non Active';
  return 'Active';
}

function deriveMcomFields(data) {
  const currentYear = new Date().getFullYear();

  // 1. Derive / normalize renewal_date_vise
  if (data.renewal_date_vise) {
    const rawLower = String(data.renewal_date_vise).toLowerCase().trim();
    if (rawLower.includes('non') || rawLower.includes('inactive')) {
      data.renewal_date_vise = 'Non Active';
    } else if (rawLower.includes('active')) {
      data.renewal_date_vise = 'Active';
    }
  } else {
    if (data.renewal_payment_status === 'Approved') {
      data.renewal_date_vise = 'Active';
    } else if (data.renewal_payment_status === 'Pending Approval') {
      data.renewal_date_vise = 'Non Active';
    } else if (data.renewal_period) {
      const rpMatches = String(data.renewal_period).match(/\b(19|20)\d{2}\b/g);
      const rpYear = rpMatches ? parseInt(rpMatches[rpMatches.length - 1], 10) : parseInt(data.renewal_period, 10);
      if (!isNaN(rpYear)) {
        data.renewal_date_vise = rpYear >= currentYear ? 'Active' : 'Non Active';
      }
    } else if (data.status === 'Active' || data.active_non_active === 'Active') {
      data.renewal_date_vise = 'Active';
    }
  }

  if (!data.active_non_active && data.renewal_date_vise) {
    data.active_non_active = data.renewal_date_vise;
  }
  if (!data.renewal_status && data.renewal_date_vise) {
    data.renewal_status = data.renewal_date_vise;
  }

  // 2. Derive / normalize next_renewal_date
  if (!data.next_renewal_date && data.renewal_period) {
    const rpMatches = String(data.renewal_period).match(/\b(19|20)\d{2}\b/g);
    const rpYear = rpMatches ? parseInt(rpMatches[rpMatches.length - 1], 10) : parseInt(data.renewal_period, 10);
    if (!isNaN(rpYear)) {
      data.next_renewal_date = `${rpYear}-12-31`;
    }
  }

  // 3. Derive / normalize agm_date_vise
  if (data.agm_date_vise) {
    const rawLower = String(data.agm_date_vise).toLowerCase().trim();
    if (rawLower.includes('non') || rawLower.includes('inactive')) {
      data.agm_date_vise = 'Non Active';
    } else if (rawLower.includes('active')) {
      data.agm_date_vise = 'Active';
    }
  } else {
    if (data.next_agm_date) {
      const nextD = new Date(data.next_agm_date);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      data.agm_date_vise = (!Number.isNaN(nextD.getTime()) && nextD >= today) ? 'Active' : 'Non Active';
    } else if (data.agm_date) {
      const agmD = new Date(data.agm_date);
      const oneYearAgo = new Date();
      oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
      data.agm_date_vise = (!Number.isNaN(agmD.getTime()) && agmD >= oneYearAgo) ? 'Active' : 'Non Active';
    }
  }
  if (!data.agm_status && data.agm_date_vise) {
    data.agm_status = data.agm_date_vise;
  }

  return data;
}

// ── GET /api/mcom ─ Paginated + filtered list ───────────────────────────────
// Query params: ?q=search &status=Active &year=2024 &category=A &page=1 &limit=20
router.get('/', async (req, res) => {
  try {
    const { q, searchField, status, year, month, category, mc_mcom, renewalPeriod, agmYear, town, page = 1, limit = 20 } = req.query;
    const offset = (Math.max(1, Number(page)) - 1) * Math.max(1, Number(limit));

    const where = {};
    const andConditions = [];

    // SQLite's LIKE is already case-insensitive for ASCII letters.
    let cleanQ = q;
    if (q) {
      // If user types "MCOM-1092" based on placeholder, strip "MCOM-" to search effectively
      cleanQ = q.replace(/^MCOM\s*-?\s*/i, '').replace(/^MC\s*-?\s*/i, '');
      
      if (searchField === 'planNo') {
        andConditions.push({
          $or: [
            { plan_no: { $like: `%${cleanQ}%` } },
          ]
        });
      } else if (searchField === 'name') {
        andConditions.push({
          $or: [
            { management_corporation_name: { $like: `%${cleanQ}%` } },
          ]
        });
      } else if (searchField === 'planOrName') {
        andConditions.push({
          $or: [
            { plan_no: { $like: `%${cleanQ}%` } },
            { management_corporation_name: { $like: `%${cleanQ}%` } },
          ]
        });
      } else {
        andConditions.push({
          $or: [
            { file_no: { $like: `%${cleanQ}%` } },
            { new_file_no: { $like: `%${cleanQ}%` } },
            { old_file_no: { $like: `%${cleanQ}%` } },
            { plan_no: { $like: `%${cleanQ}%` } },
            { management_corporation_name: { $like: `%${cleanQ}%` } },
            { address: { $like: `%${cleanQ}%` } },
            { secretary: { $like: `%${cleanQ}%` } },
            { treasurer: { $like: `%${cleanQ}%` } },
            { town: { $like: `%${cleanQ}%` } },
            { remark: { $like: `%${cleanQ}%` } },
            { certificate_file_no: { $like: `%${cleanQ}%` } },
            { email_address: { $like: `%${cleanQ}%` } },
          ]
        });
      }
    }

    if (status) {
      const allMcoms = await McomRecord.findAll({
        attributes: ['id', 'status', 'active_non_active', 'renewal_date_vise', 'renewal_payment_status', 'renewal_period'],
        raw: true
      });
      const target = status.toLowerCase().trim();
      const matchedIds = allMcoms
        .filter(r => getMcomEffectiveStatus(r).toLowerCase() === target)
        .map(r => r.id);
      andConditions.push({ id: { $in: matchedIds } });
    }
    if (month) {
      if (month.includes('-')) {
        andConditions.push({ reg_date: { $like: `${month}-%` } });
      } else if (year) {
        andConditions.push({ reg_date: { $like: `${year}-${month}-%` } });
      } else {
        andConditions.push({ reg_date: { $like: `%-${month}-%` } });
      }
    } else if (year) {
      andConditions.push({ year: Number(year) });
    }

    if (renewalPeriod) andConditions.push({ renewal_period: { $like: `%${renewalPeriod}%` } });
    if (agmYear) {
      andConditions.push({
        $or: [
          { agm_date: { $like: `%${agmYear}%` } },
          { agm_date_vise: { $like: `%${agmYear}%` } }
        ]
      });
    }

    const catVal = category || mc_mcom;
    if (catVal) {
      andConditions.push({
        $or: [
          { category: catVal },
          { mc_mcom: catVal }
        ]
      });
    }

    if (town) {
      const cleanTown = String(town).trim();
      const isLavinia = /m(oun)?t\.?\s*lavinia/i.test(cleanTown);
      const isJaEla = /ja\s*-?\s*ela/i.test(cleanTown);
      const isNuwara = /nuwara\s*-?\s*eliya/i.test(cleanTown);

      if (isLavinia) {
        andConditions.push({
          $or: [
            { town: { $like: '%Mt. Lavinia%' } },
            { town: { $like: '%Mount Lavinia%' } },
            { address: { $like: '%Lavinia%' } },
          ]
        });
      } else if (isJaEla) {
        andConditions.push({
          $or: [
            { town: { $like: '%Ja%Ela%' } },
            { address: { $like: '%Ja%Ela%' } },
          ]
        });
      } else if (isNuwara) {
        andConditions.push({
          $or: [
            { town: { $like: '%Nuwara%Eliya%' } },
            { address: { $like: '%Nuwara%Eliya%' } },
          ]
        });
      } else {
        andConditions.push({
          $or: [
            { town: { $like: `%${cleanTown}%` } },
            { address: { $like: `%${cleanTown}%` } },
          ]
        });
      }
    }

    if (andConditions.length > 0) {
      where.$and = andConditions;
    }

    const { rows: records, count: total } = await McomRecord.findAndCountAll({
      where,
      offset,
      limit: Number(limit),
      order: [['id', 'DESC']],
      raw: true,
    });

    // Sanitize date fields before sending to frontend
    const cleanedRecords = records.map(r => sanitizeDates({ ...r }));
    res.json({ rows: cleanedRecords, total, page: Number(page), limit: Number(limit) });
  } catch (err) {
    console.error('GET /mcom error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ── GET /api/mcom/stats/summary ─ Count by status ───────────────────────────
// NOTE: Must be defined before '/:id' so Express doesn't treat "stats" as an id.
router.get('/stats/summary', async (req, res) => {
  try {
    const allMcoms = await McomRecord.findAll({
      attributes: ['id', 'status', 'active_non_active', 'renewal_date_vise', 'renewal_payment_status', 'renewal_period'],
      raw: true
    });
    let active = 0, non_active = 0, pending = 0;
    for (const r of allMcoms) {
      const s = getMcomEffectiveStatus(r);
      if (s === 'Active') active++;
      else if (s === 'Non Active') non_active++;
      else if (s === 'Pending') pending++;
    }
    res.json({ total: allMcoms.length, active, non_active, pending });
  } catch (err) {
    console.error('GET /mcom/stats/summary error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ── GET /api/mcom/:id ─ Get single record ───────────────────────────────────
router.get('/:id', async (req, res) => {
  try {
    const record = await McomRecord.findByPk(req.params.id);
    if (!record) return res.status(404).json({ error: 'Not found' });
    res.json(sanitizeDates({ ...record.toJSON() }));
  } catch (err) {
    console.error('GET /mcom/:id error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ── POST /api/mcom ─ Create new record ──────────────────────────────────────
router.post('/', async (req, res) => {
  try {
    let data = pickWritable(req.body);
    coerceInts(data, 'units', 'year');
    deriveMcomFields(data);

    // Resolve file_no from multiple possible sources
    data.file_no = resolveFileNo(req.body, data);

    if (!data.file_no) {
      return res.status(400).json({ error: 'file_no is required' });
    }

    const modified_by = req.body.modified_by || req.body.user_name || 'System';
    const user_name = req.body.user_name || modified_by;

    data.created_by = modified_by;
    data.modified_by = modified_by;

    data.history = JSON.stringify([{
      name: user_name,
      action: 'Added',
      time: new Date().toISOString()
    }]);

    const record = await McomRecord.create(data);

    // -- CUSTOMER HISTORY LOG --
    try {
      await db.models.CustomerHistory.create({
        customer_no: data.file_no,
        mc_type: 'MCOM',
        action_type: 'Registration',
        description: `MCOM Registered: ${data.management_corporation_name || ''}`,
        year: new Date().getFullYear(),
        file_path: null,
        action_by: user_name
      });
    } catch (histErr) {
      console.error('Failed to log CustomerHistory on MCOM creation:', histErr);
    }

    res.status(201).json(record.toJSON());
  } catch (err) {
    console.error('POST /mcom error:', err);
    if (err.name === 'SequelizeUniqueConstraintError') {
      return res.status(409).json({ error: 'Duplicate file_no' });
    }
    res.status(500).json({ error: err.message });
  }
});

// ── PATCH /api/mcom/:id ─ Update a record ───────────────────────────────────
router.patch('/:id', async (req, res) => {
  try {
    let data = pickWritable(req.body);
    coerceInts(data, 'units', 'year');
    deriveMcomFields(data);

    if (!Object.keys(data).length) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    const record = await McomRecord.findByPk(req.params.id);
    if (!record) return res.status(404).json({ error: 'Not found' });

    const modified_by = req.body.modified_by || req.body.user_name || 'System';
    const user_name = req.body.user_name || modified_by;

    let history = [];
    try {
      history = record.history ? JSON.parse(record.history) : [];
    } catch (e) {
      history = [];
    }

    const changedFields = [];
    const ignoreFields = ['updated_at', 'created_at', 'modified_by', 'created_by', 'history', 'user_name'];
    for (const key of Object.keys(data)) {
      if (ignoreFields.includes(key)) continue;
      const oldVal = record[key] === '' ? null : record[key];
      const newVal = data[key] === '' ? null : data[key];

      if ((oldVal == null) !== (newVal == null)) {
        changedFields.push(key.replace(/_/g, ' '));
      } else if (oldVal != null && newVal != null) {
        if (String(oldVal) !== String(newVal)) {
          changedFields.push(key.replace(/_/g, ' '));
        }
      }
    }

    let note = 'Modified record';
    if (data.status === 'Active' && record.status !== 'Active') {
      note = 'Approved & Activated record';
    } else if (data.status === 'Non Active' && record.status !== 'Non Active') {
      note = 'Rejected record';
    } else if (changedFields.length > 0) {
      note = `Updated ${changedFields.join(', ')}`;
    }

    history.push({
      name: user_name,
      action: 'Modified',
      time: new Date().toISOString(),
      note
    });

    data.modified_by = modified_by;
    data.history = JSON.stringify(history);

    await record.update(data);
    res.json(record.toJSON());
  } catch (err) {
    console.error('PATCH /mcom/:id error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ── DELETE /api/mcom ─ Delete ALL records ───────────────────────────────────
router.delete('/', async (req, res) => {
  try {
    const deleted = await McomRecord.destroy({ where: {} });

    if (deleted > 0 && db.models.SystemLog) {
      const user = req.body.user_name || req.query.user_name || 'System';
      await db.models.SystemLog.create({
        user_name: user,
        action: 'Deleted ALL M.Com records',
        details: `Deleted all ${deleted} M.Com records`
      });
    }

    res.json({ message: 'All M.Com records deleted', deleted });
  } catch (err) {
    console.error('DELETE /mcom error:', err.message);
    res.status(500).json({ error: 'Failed to delete all records' });
  }
});

// ── DELETE /api/mcom/:id ─ Delete a record ──────────────────────────────────
router.delete('/:id', async (req, res) => {
  try {
    const record = await McomRecord.findByPk(req.params.id);
    if (!record) return res.status(404).json({ error: 'Not found' });

    await record.destroy();

    if (db.models.SystemLog) {
      const user = req.body.user_name || req.query.user_name || 'System';
      await db.models.SystemLog.create({
        user_name: user,
        action: 'Deleted M.Com record',
        details: `Deleted M.Com record: ${record.file_no || record.management_corporation_name || `ID ${record.id}`}`
      });
    }

    res.json({ deleted: true, id: record.id });
  } catch (err) {
    console.error('DELETE /mcom/:id error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ── POST /api/mcom/bulk ─ Bulk import/upsert ────────────────────────────────
// Accepts array of records (from Excel). Uses transaction for atomicity.
// Existing records (by file_no) are updated; new ones are inserted.
router.post('/bulk', async (req, res) => {
  const records = req.body;
  if (!Array.isArray(records) || !records.length) {
    return res.status(400).json({ error: 'Expected a non-empty array' });
  }

  const transaction = await db.sequelize.transaction();
  try {
    let inserted = 0;
    let updated = 0;

    for (const rawRec of records) {
      let data = pickWritable(rawRec);
      coerceInts(data, 'units', 'year');
      deriveMcomFields(data);

      // Resolve file_no from multiple sources
      const file_no = rawRec.file_no || data.new_file_no || data.old_file_no;
      if (!file_no) continue; // Skip rows without a file number
      data.file_no = file_no;

      // Upsert: create if new, update if exists
      const importUser = data.user_name || data.created_by || 'Bulk Import';
      const [instance, created] = await McomRecord.findOrCreate({
        where: { file_no: data.file_no },
        defaults: {
          ...data,
          history: JSON.stringify([{
            name: importUser,
            action: 'Bulk Added',
            time: new Date().toISOString()
          }]),
        },
        transaction,
        skipActivityLog: true
      });

      if (created) {
        inserted++;
      } else {
        const modified_by = data.modified_by || data.user_name || 'Bulk Import Update';
        const merged = mergeImportPayload(instance.toJSON ? instance.toJSON() : instance, data, { importUser: modified_by, importAction: 'Bulk Updated' });
        merged.modified_by = modified_by;
        await instance.update(merged, { transaction, skipActivityLog: true });
        updated++;
      }
    }

    await transaction.commit();

    if ((inserted > 0 || updated > 0) && db.models.SystemLog) {
      // Find a username from the first inserted record or query params, default to 'System'
      const user = records[0]?.user_name || records[0]?.created_by || req.query.user_name || req.body.user_name || 'System';
      await db.models.SystemLog.create({
        user_name: user,
        action: 'Imported M.Com Records',
        details: `Imported ${inserted} new records and updated ${updated} existing records`
      });
    }

    res.json({ success: true, inserted, updated });
  } catch (err) {
    // Roll back everything if any record fails
    await transaction.rollback();
    console.error('POST /mcom/bulk error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ── POST /api/mcom/bulk-delete ─ Delete multiple records by file_no ─────────
router.post('/bulk-delete', async (req, res) => {
  const { file_nos } = req.body;
  if (!Array.isArray(file_nos) || file_nos.length === 0) {
    return res.status(400).json({ error: 'file_nos must be a non-empty array' });
  }

  try {
    const deleted = await McomRecord.destroy({ 
      where: { file_no: file_nos },
      skipActivityLog: true
    });

    if (deleted > 0 && db.models.SystemLog) {
      const user = req.body.user_name || req.query.user_name || 'System';
      await db.models.SystemLog.create({
        user_name: user,
        action: 'Deleted M.Com records',
        details: `Bulk deleted ${deleted} records (File Nos: ${file_nos.join(', ')})`
      });
    }

    res.json({ message: 'Deleted records', deleted });
  } catch (err) {
    console.error('POST /mcom/bulk-delete error:', err);
    res.status(500).json({ error: 'Bulk delete failed: ' + err.message });
  }
});

module.exports = router;
