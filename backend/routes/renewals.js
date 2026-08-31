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

    const allRenewals = await Renewal.findAll({ attributes: ['ref_no'] });
    const mrRenewals = allRenewals
      .map(r => r.ref_no)
      .filter(ref => ref && ref.startsWith('MR'))
      .map(ref => parseInt(ref.replace('MR', ''), 10))
      .filter(n => !isNaN(n));

    let nextNum = 1;
    if (mrRenewals.length > 0) {
      nextNum = Math.max(...mrRenewals) + 1;
    }

    const refNo = `MR${String(nextNum).padStart(5, '0')}`;

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
        link: 'renewal_approval:' + renewal.ref_no,
      });
      notificationsRouter.emitter.emit('new', notification);
    } catch (notifErr) {
      console.error('Failed to create notification:', notifErr);
    }

    try {
      const { ManagementCorporation, McomRecord } = db.models;

      if (mc?.id) {
        if (mc.type === 'M.Com' && McomRecord) {
          const mcom = await McomRecord.findByPk(mc.id);
          if (mcom) {
            mcom.renewal_payment_status = 'Pending Approval';
            mcom.status = 'Pending';
            await mcom.save();
          }
        } else if (ManagementCorporation) {
          const mcRec = await ManagementCorporation.findByPk(mc.id);
          if (mcRec) {
            mcRec.renewal_payment_status = 'Pending Approval';
            mcRec.status = 'Pending';
            await mcRec.save();
          }
        }
      }
    } catch (autoUpdateErr) {
      console.error('Failed to auto-update MC status to pending:', autoUpdateErr);
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
    renewal.action_by = req.body.actionBy || '';
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
            const isActive = maxYear >= new Date().getFullYear();
            const targetStatus = isActive ? 'Active' : 'Non Active';

            let combinedYears = years.join(', ');
            if (mcom.renewal_paid_years) {
              const existing = mcom.renewal_paid_years.split(',').map(y => parseInt(y.trim(), 10)).filter(y => !isNaN(y));
              const current = years ? years.map(y => parseInt(y)) : [];
              const merged = Array.from(new Set([...existing, ...current])).sort((a, b) => a - b);
              combinedYears = merged.join(', ');
            }

            mcom.renewal_paid = true;
            mcom.renewal_paid_year = maxYear; // Integer
            mcom.renewal_paid_years = combinedYears;
            mcom.renewal_paid_amount = renewal.amount;
            mcom.renewal_paid_date = todayStr;
            mcom.renewal_receipt_no = renewal.ref_no;
            mcom.renewal_period = maxYear.toString();
            mcom.renewal_status = targetStatus;
            mcom.renewal_date_vise = targetStatus;
            mcom.active_non_active = targetStatus;
            mcom.status = targetStatus;
            mcom.renewal_payment_status = 'Approved';
            mcom.acknowledgement_no = `ACK/MCOM/${mcom.new_file_no || mcom.file_no || mcom.id}/${maxYear}`;
            mcom.acknowledgement_date = todayStr;
            await mcom.save();

            // -- CUSTOMER HISTORY LOG --
            try {
              await db.models.CustomerHistory.create({
                customer_no: mcom.file_no || mcom.new_file_no || mcom.id.toString(),
                mc_type: 'MCOM',
                action_type: 'Renewal Approved',
                description: `Renewal for Rs. ${renewal.amount} approved for years: ${years.join(', ')}`,
                year: maxYear,
                file_path: null,
                action_by: req.body.actionBy || 'System'
              });
            } catch (histErr) {
              console.error('Failed to log CustomerHistory for MCOM renewal:', histErr);
            }
          }
        } else if (ManagementCorporation) {
          const mc = await ManagementCorporation.findByPk(renewal.mc_id);
          if (mc) {
            let combinedYears = years.join(', ');
            if (mc.renewal_paid_years) {
              const existing = mc.renewal_paid_years.split(',').map(y => parseInt(y.trim(), 10)).filter(y => !isNaN(y));
              const current = years ? years.map(y => parseInt(y)) : [];
              const merged = Array.from(new Set([...existing, ...current])).sort((a, b) => a - b);
              combinedYears = merged.join(', ');
            }

            mc.renewal_paid = true;
            mc.renewal_paid_year = maxYear; // Integer
            mc.renewal_paid_years = combinedYears;
            mc.renewal_paid_amount = renewal.amount;
            mc.renewal_paid_date = todayStr;
            mc.renewal_receipt_no = renewal.ref_no;
            mc.renewal_period = maxYear.toString();
            mc.renewal_payment_status = 'Approved';
            mc.renewal_date_vise = 'Active';
            mc.status = 'Active';
            mc.acknowledgement_no = `ACK/${mc.file_no || mc.id}/${maxYear}`;
            mc.acknowledgement_date = todayStr;
            await mc.save();

            // -- CUSTOMER HISTORY LOG --
            try {
              await db.models.CustomerHistory.create({
                customer_no: mc.file_no || mc.new_file_no || mc.id.toString(),
                mc_type: 'MC',
                action_type: 'Renewal Approved',
                description: `Renewal for Rs. ${renewal.amount} approved for years: ${years.join(', ')}`,
                year: maxYear,
                file_path: null,
                action_by: req.body.actionBy || 'System'
              });
            } catch (histErr) {
              console.error('Failed to log CustomerHistory for MC renewal:', histErr);
            }
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
        link: (renewal.mc_type === 'M.Com' ? 'mcom-renewal:' : 'mc-renewal:') + renewal.mc_id,
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
    const { Renewal, ManagementCorporation, McomRecord } = db.models;
    const renewal = await Renewal.findOne({ where: { ref_no: req.params.refNo } });
    if (!renewal) return res.status(404).json({ error: 'Record not found' });

    renewal.status = 'rejected';
    renewal.reject_reason = req.body.reason || '';
    renewal.action_by = req.body.actionBy || '';
    renewal.approved_at = null;
    await renewal.save();

    // Revert MC status back so they can try again
    try {
      if (renewal.mc_id) {
        if (renewal.mc_type === 'M.Com' && McomRecord) {
          const mcom = await McomRecord.findByPk(renewal.mc_id);
          if (mcom && mcom.renewal_payment_status === 'Pending Approval') {
            mcom.renewal_payment_status = null;
            mcom.status = 'Non Active';
            await mcom.save();
          }
        } else if (ManagementCorporation) {
          const mc = await ManagementCorporation.findByPk(renewal.mc_id);
          if (mc && mc.renewal_payment_status === 'Pending Approval') {
            mc.renewal_payment_status = null;
            mc.status = 'Non Active';
            // Note: technically we could also remove the rejected year from renewal_paid_years,
            // but for safety we just clear the pending state so it opens up the UI again.
            await mc.save();
          }
        }
      }
    } catch (e) {
      console.error('Failed to revert MC status on reject:', e);
    }

    const data = renewal.toJSON();
    data.years = data.years ? JSON.parse(data.years) : [];
    res.json(data);
  } catch (err) {
    console.error('Failed to reject renewal:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
