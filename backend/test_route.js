const express = require('express');
const app = express();
const db = require('./db');

async function test() {
  await db.sequelize.authenticate();
  
  // mock req, res
  const req = { query: { mcType: 'MC', customerNo: 'CMA/CCU/19/MC/994' } };
  let jsonResult = null;
  const res = {
    json: (data) => { jsonResult = data; },
    status: (s) => ({ json: (d) => { console.log('ERROR:', s, d); } })
  };

  const { Op } = require('sequelize');
  const { CustomerHistory, ManagementCorporation, Renewal } = db.models;
  const mcType = req.query.mcType;
  const customerNo = req.query.customerNo;

  let history = await CustomerHistory.findAll({
    where: {
      customer_no: customerNo,
      mc_type: mcType
    },
    raw: true
  });

  let mcId = null;
  const mc = await ManagementCorporation.findOne({ 
    where: { file_no: { [Op.like]: `%${customerNo}%` } }, 
    raw: true 
  });
  if (mc) {
    mcId = mc.id;
    history.push({
      id: `mc-${mc.id}`,
      action_type: 'Registration',
    });
  }

  if (mcId) {
    const renewals = await Renewal.findAll({ where: { mc_id: mcId, mc_type: mcType }, raw: true });
    for (const rnw of renewals) {
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

        for (const y of yearsArray) {
          const yearNum = parseInt(y, 10);
          if (isNaN(yearNum)) continue;

          history.push({
            id: `rnw-${rnw.id}-${yearNum}`,
            year: yearNum,
            created_at: rnwDate,
            action_type: 'Renewal Approved (Dynamic)',
            action_by: rnw.approved_by || rnw.action_by || rnw.created_by || 'System',
            description: `Renewal approved for year ${yearNum}`,
            file_path: `Renewal_Certificate_${yearNum}`
          });
        }
      }
    }
  }

  history.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  
  console.log(JSON.stringify(history, null, 2));
  process.exit(0);
}

test();
