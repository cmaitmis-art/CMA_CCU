const express = require('express');
const { Op } = require('sequelize');
const router = express.Router();
const db = require('../db');

const { RegistrationPayableInvoice, ManagementCorporation } = db.models;

const WRITABLE_COLS = [
  'mc_id', 'invoice_number', 'invoice_date', 'registration_date', 'period_start', 'period_end', 'due_date',
  'file_no', 'old_file_no', 'new_file_no', 'management_corporation_name', 'category',
  'fee_rate_per_unit', 'fee_amount', 'sscl_amount', 'vat_amount', 'total_amount',
  'status', 'created_by', 'modified_by', 'history',
];

function pickWritable(body) {
  const out = {};
  for (const col of WRITABLE_COLS) {
    if (col in body) {
      out[col] = body[col] === '' ? null : body[col];
    }
  }
  return out;
}

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

router.get('/', async (req, res) => {
  try {
    const { q, mc_id, invoice_number, page = 1, limit = 20 } = req.query;
    const offset = (Math.max(1, Number(page)) - 1) * Math.max(1, Number(limit));
    const where = {};

    if (q) {
      where[Op.or] = [
        { invoice_number: { [Op.like]: `%${q}%` } },
        { file_no: { [Op.like]: `%${q}%` } },
        { new_file_no: { [Op.like]: `%${q}%` } },
        { old_file_no: { [Op.like]: `%${q}%` } },
        { management_corporation_name: { [Op.like]: `%${q}%` } },
      ];
    }
    if (mc_id) where.mc_id = Number(mc_id);
    if (invoice_number) where.invoice_number = invoice_number;

    const { rows: records, count: total } = await RegistrationPayableInvoice.findAndCountAll({
      where,
      offset,
      limit: Number(limit),
      order: [['id', 'DESC']],
      raw: true,
    });

    res.json({ rows: records, total, page: Number(page), limit: Number(limit) });
  } catch (err) {
    console.error('GET /registration-invoices error:', err);
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const invoice = await RegistrationPayableInvoice.findByPk(req.params.id);
    if (!invoice) return res.status(404).json({ error: 'Not found' });
    res.json(invoice.toJSON());
  } catch (err) {
    console.error('GET /registration-invoices/:id error:', err);
    res.status(500).json({ error: err.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const data = pickWritable(req.body);
    coerceInts(data, 'mc_id');

    if (!data.mc_id) return res.status(400).json({ error: 'mc_id is required' });
    if (!data.invoice_number) return res.status(400).json({ error: 'invoice_number is required' });

    const invoice = await RegistrationPayableInvoice.create(data);
    res.status(201).json(invoice.toJSON());
  } catch (err) {
    console.error('POST /registration-invoices error:', err);
    if (err.name === 'SequelizeUniqueConstraintError') {
      return res.status(409).json({ error: 'Duplicate invoice_number' });
    }
    res.status(500).json({ error: err.message });
  }
});

router.patch('/:id', async (req, res) => {
  try {
    const data = pickWritable(req.body);
    coerceInts(data, 'mc_id');

    if (!Object.keys(data).length) return res.status(400).json({ error: 'No fields to update' });

    const invoice = await RegistrationPayableInvoice.findByPk(req.params.id);
    if (!invoice) return res.status(404).json({ error: 'Not found' });

    await invoice.update(data);
    res.json(invoice.toJSON());
  } catch (err) {
    console.error('PATCH /registration-invoices/:id error:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
