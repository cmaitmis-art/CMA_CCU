const express = require('express');
const router = express.Router();
const db = require('../db');
const { Op } = require('sequelize');
const { CustomerHistory } = db.models;

// GET history for a specific customer
router.get('/', async (req, res) => {
  try {
    const { mcType, customerNo } = req.query;
    if (!mcType || !customerNo) {
      return res.status(400).json({ error: 'mcType and customerNo are required query parameters' });
    }

    // 1. Fetch explicit history logs
    let history = await CustomerHistory.findAll({
      where: {
        customer_no: customerNo,
        mc_type: mcType
      },
      raw: true
    });

    let mcId = null;

    // 2. Dynamically fetch Registration from MC / MCOM
    if (mcType === 'MC') {
      const mc = await db.models.ManagementCorporation.findOne({ 
        where: { file_no: { [Op.like]: `%${customerNo}%` } }, 
        raw: true 
      });
      if (mc) {
        mcId = mc.id;
        const regDate = mc.created_at || mc.reg_date || new Date();
        history.push({
          id: `mc-${mc.id}`,
          year: mc.year || new Date(regDate).getFullYear(),
          created_at: regDate,
          action_type: 'Registration',
          action_by: mc.created_by || 'System',
          description: `MC Registered: ${mc.name || mc.management_corporation_name || ''}`,
          file_path: 'Registration_Certificate'
        });


        if (mc.renewal_paid_years) {
          const years = String(mc.renewal_paid_years).split(',').map(y => y.trim()).filter(Boolean);
          for (const y of years) {
            const yearNum = parseInt(y, 10);
            if (isNaN(yearNum)) continue;
            const rnwDate = mc.renewal_paid_date ? new Date(mc.renewal_paid_date) : new Date(yearNum, 0, 1);

            history.push({
              id: `mc-legacy-rnw-${mc.id}-${y}`,
              year: yearNum,
              created_at: rnwDate,
              action_type: 'Renewal Approved (Legacy)',
              action_by: 'System',
              description: `Renewal approved for year ${y}`,
              file_path: `Legacy_Renewal_Certificate_${y}`
            });


          }
        }

        if (mc.acknowledgement_no) {
          const ackDate = mc.acknowledgement_date || mc.updated_at || new Date();
          history.push({
            id: `mc-ack-${mc.id}`,
            year: new Date(ackDate).getFullYear(),
            created_at: ackDate,
            action_type: 'Acknowledgement Generated',
            action_by: 'System',
            description: `Acknowledgement No: ${mc.acknowledgement_no}`,
            file_path: 'Acknowledgement_Letter'
          });
        }
      }
    } else if (mcType === 'MCOM') {
      const mcom = await db.models.McomRecord.findOne({ 
        where: { file_no: { [Op.like]: `%${customerNo}%` } }, 
        raw: true 
      });
      if (mcom) {
        mcId = mcom.id;
        const regDate = mcom.created_at || mcom.createdAt || new Date();
        history.push({
          id: `mcom-${mcom.id}`,
          year: mcom.year || new Date(regDate).getFullYear(),
          created_at: regDate,
          action_type: 'Registration',
          action_by: mcom.created_by || 'System',
          description: `M.Com Registered: ${mcom.name || mcom.management_committee_name || ''}`,
          file_path: 'Registration_Certificate'
        });


        if (mcom.renewal_paid_years) {
          const years = String(mcom.renewal_paid_years).split(',').map(y => y.trim()).filter(Boolean);
          for (const y of years) {
            const yearNum = parseInt(y, 10);
            if (isNaN(yearNum)) continue;
            const rnwDate = mcom.renewal_paid_date ? new Date(mcom.renewal_paid_date) : new Date(yearNum, 0, 1);

            history.push({
              id: `mcom-legacy-rnw-${mcom.id}-${y}`,
              year: yearNum,
              created_at: rnwDate,
              action_type: 'Renewal Approved (Legacy)',
              action_by: 'System',
              description: `Renewal approved for year ${y}`,
              file_path: `Legacy_Renewal_Certificate_${y}`
            });


          }
        }

        if (mcom.acknowledgement_no) {
          const ackDate = mcom.acknowledgement_date || mcom.updated_at || new Date();
          history.push({
            id: `mcom-ack-${mcom.id}`,
            year: new Date(ackDate).getFullYear(),
            created_at: ackDate,
            action_type: 'Acknowledgement Generated',
            action_by: 'System',
            description: `Acknowledgement No: ${mcom.acknowledgement_no}`,
            file_path: 'Acknowledgement_Letter'
          });
        }
      }
    }

    // 3. Dynamically fetch Renewals
    const systemCoveredYears = new Set();
    if (mcId) {
      const renewals = await db.models.Renewal.findAll({ 
        where: { 
          mc_id: mcId, 
          mc_type: { [Op.in]: ['MC', 'MCOM', 'M.Com', 'Management Corporation', 'Management Committee'] }
        }, 
        raw: true 
      });
      for (const rnw of renewals) {
        // Only include approved renewals as "certificates"
        const stat = rnw.status ? rnw.status.toLowerCase() : '';
        if (stat === 'approved' || stat === 'active') {
          const rnwDate = rnw.created_at || rnw.createdAt || new Date();
          
          let yearsArray = [];
          if (Array.isArray(rnw.years)) {
            yearsArray = rnw.years;
          } else if (typeof rnw.years === 'string') {
            try {
              yearsArray = JSON.parse(rnw.years);
              if (!Array.isArray(yearsArray)) {
                yearsArray = String(rnw.years).split(',').map(y => y.trim()).filter(Boolean);
              }
            } catch (e) {
              yearsArray = String(rnw.years).split(',').map(y => y.trim()).filter(Boolean);
            }
          } else if (rnw.years) {
            yearsArray = [rnw.years];
          }
          
          if (yearsArray.length === 0) {
            yearsArray = [new Date(rnwDate).getFullYear()];
          }

          let latestYear = 0;
          for (const y of yearsArray) {
            const yearNum = parseInt(y, 10);
            if (!isNaN(yearNum)) {
              systemCoveredYears.add(yearNum);
              if (yearNum > latestYear) latestYear = yearNum;
            }
          }
          if (latestYear === 0) latestYear = new Date(rnwDate).getFullYear();

          history.push({
            id: `rnw-${rnw.id}-${latestYear}`,
            year: latestYear,
            created_at: rnwDate,
            action_type: 'Renewal Approved',
            action_by: rnw.approved_by || rnw.action_by || rnw.created_by || 'System',
            description: `Renewal for Rs. ${rnw.amount || '0'} approved for years: ${yearsArray.join(', ')}`,
            file_path: `Renewal_Certificate_multi`
          });
        }
      }
    }

    // 4. Cleanup duplicates
    history = history.filter(record => {
      // Remove legacy records if the year is covered by a real renewal
      if (record.action_type === 'Renewal Approved (Legacy)') {
        if (systemCoveredYears.has(record.year)) return false;
      }
      // Remove explicit records that are just text (duplicates of the single dynamic entry)
      if (record.action_type === 'Renewal Approved' && !record.file_path) {
        return false;
      }
      return true;
    });

    // 5. Sort all combined records by created_at (newest first)
    history.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    res.json(history);
  } catch (error) {
    console.error('Error fetching customer history:', error);
    res.status(500).json({ error: 'Failed to fetch customer history' });
  }
});

// POST to manually upload a document to history (if needed)
router.post('/upload', async (req, res) => {
  try {
    const { customer_no, mc_type, action_type, description, year, file_path, action_by } = req.body;

    const newRecord = await CustomerHistory.create({
      customer_no,
      mc_type: mc_type || 'MC',
      action_type,
      description,
      year,
      file_path,
      action_by
    });

    res.status(201).json(newRecord);
  } catch (error) {
    console.error('Error adding customer history record:', error);
    res.status(500).json({ error: 'Failed to add customer history record' });
  }
});

module.exports = router;
