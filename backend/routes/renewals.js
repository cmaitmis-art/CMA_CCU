const express = require('express');
const router = express.Router();
const db = require('../db');

// GET all renewals (for Approval Queue)
router.get('/', async (req, res) => {
  try {
    const { Renewal } = db.models;
    const renewals = await Renewal.findAll({
      order: [['created_at', 'DESC']]
    });
    
    // Parse years JSON for the frontend
    const formatted = renewals.map(r => {
      const data = r.toJSON();
      data.years = data.years ? JSON.parse(data.years) : [];
      return data;
    });

    res.json(formatted);
  } catch (err) {
    console.error('Failed to fetch renewals:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET single renewal
router.get('/:refNo', async (req, res) => {
  try {
    const { Renewal } = db.models;
    const renewal = await Renewal.findOne({ where: { ref_no: req.params.refNo } });
    if (!renewal) return res.status(404).json({ error: 'Record not found' });
    const data = renewal.toJSON();
    data.years = data.years ? JSON.parse(data.years) : [];
    res.json(data);
  } catch (err) {
    console.error('Failed to fetch renewal:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST a new renewal (from Portal)
router.post('/', async (req, res) => {
  try {
    const { Renewal } = db.models;
    const { applicant, mc, years, amount } = req.body;

    const refNo = 'GOVPAY-' + Date.now().toString().slice(-8) + '-' + Math.floor(Math.random() * 900 + 100);

    const renewal = await Renewal.create({
      ref_no: refNo,
      status: 'pending_approval',
      applicant_name: applicant ? `${applicant.firstName} ${applicant.lastName}`.trim() : null,
      applicant_email: applicant?.email,
      applicant_phone: applicant?.phone,
      applicant_nic: applicant?.nic,
      mc_id: mc?.id,
      mc_type: mc?.type,
      mc_name: mc?.name,
      plan_no: mc?.planNo,
      years: JSON.stringify(years || []),
      amount: amount
    });

    const data = renewal.toJSON();
    data.years = years || [];

    try {
      const { Notification } = db.models;
      const notificationsRouter = require('./notifications');
      const notification = await Notification.create({
        type: 'alert',
        title: 'New Renewal Requested',
        message: `${data.mc_name || 'An MC/M.Com'} (${data.plan_no || 'Unknown Plan'}) has submitted a renewal payment of Rs. ${data.amount.toLocaleString()} for approval.`,
        target_role: 'admin',
        link: '/mc-renewal-approval',
      });
      notificationsRouter.emitter.emit('new', notification);
    } catch (notifErr) {
      console.error('Failed to create notification:', notifErr);
    }

    res.json(data);
  } catch (err) {
    console.error('Failed to create renewal:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST approve renewal
router.post('/:refNo/approve', async (req, res) => {
  try {
    const { Renewal, ManagementCorporation, McomRecord, Notification } = db.models;
    const renewal = await Renewal.findOne({ where: { ref_no: req.params.refNo } });
    if (!renewal) return res.status(404).json({ error: 'Record not found' });

    renewal.status = 'active';
    renewal.approved_at = new Date();
    await renewal.save();

    const years = renewal.years ? JSON.parse(renewal.years) : [];
    const maxYear = years.length > 0 ? Math.max(...years.map(y => parseInt(y))) : new Date().getFullYear();

    // Auto-update MC or MCom
    try {
      if (renewal.mc_id) {
        const todayStr = new Date().toISOString().slice(0, 10); // "YYYY-MM-DD"
        if (renewal.mc_type === 'M.Com' && McomRecord) {
          const mcom = await McomRecord.findByPk(renewal.mc_id);
          if (mcom) {
            mcom.renewal_paid = true;
            mcom.renewal_paid_year = maxYear; // Integer
            mcom.renewal_paid_amount = renewal.amount;
            mcom.renewal_paid_date = todayStr;
            mcom.renewal_receipt_no = renewal.ref_no;
            mcom.renewal_status = 'Active';
            mcom.renewal_date_vise = 'Active';
            await mcom.save();
          }
        } else if (ManagementCorporation) {
          const mc = await ManagementCorporation.findByPk(renewal.mc_id);
          if (mc) {
            mc.renewal_paid = true;
            mc.renewal_paid_year = maxYear; // Integer
            mc.renewal_paid_amount = renewal.amount;
            mc.renewal_paid_date = todayStr;
            mc.renewal_receipt_no = renewal.ref_no;
            mc.renewal_payment_status = 'Active';
            mc.renewal_date_vise = 'Active';
            await mc.save();
          }
        }
      }
    } catch (autoUpdateErr) {
      console.error("Failed to auto-update MC/MCom for renewal approval:", autoUpdateErr);
      // We don't throw here, we still want the renewal to be approved!
    }

    try {
      const notificationsRouter = require('./notifications');
      const notification = await Notification.create({
        type: 'alert',
        title: 'Renewal Approved',
        message: `Renewal payment of Rs. ${renewal.amount.toLocaleString()} for ${renewal.mc_name || 'MC'} has been approved and records updated automatically.`,
        target_role: 'admin',
        link: '/mc-management',
      });
      notificationsRouter.emitter.emit('new', notification);
    } catch (notifErr) {
      console.error('Failed to create notification:', notifErr);
    }

    const data = renewal.toJSON();
    data.years = years;
    res.json(data);
  } catch (err) {
    console.error('Failed to approve renewal:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST reject renewal
router.post('/:refNo/reject', async (req, res) => {
  try {
    const { Renewal } = db.models;
    const renewal = await Renewal.findOne({ where: { ref_no: req.params.refNo } });
    if (!renewal) return res.status(404).json({ error: 'Record not found' });

    renewal.status = 'rejected';
    renewal.reject_reason = req.body.reason || '';
    renewal.approved_at = null;
    await renewal.save();

    const data = renewal.toJSON();
    data.years = data.years ? JSON.parse(data.years) : [];
    res.json(data);
  } catch (err) {
    console.error('Failed to reject renewal:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
