const express = require('express');
const { Op } = require('sequelize');

module.exports = (models) => {
  const router = express.Router();
  const { DailyActivity } = models;

  // Create or update a daily activity record for the same user/date
  router.post('/upsert', async (req, res) => {
    try {
      const {
        user_id,
        activity_date,
        activity_text,
        activity_category,
        status,
      } = req.body || {};

      if (!user_id) return res.status(400).json({ error: 'user_id is required' });
      if (!activity_date) return res.status(400).json({ error: 'activity_date is required' });
      if (!activity_text) return res.status(400).json({ error: 'activity_text is required' });

      const existing = await DailyActivity.findOne({
        where: {
          user_id,
          activity_date,
        },
      });

      const payload = {
        user_id,
        activity_date,
        activity_text,
        activity_category: activity_category ?? null,
        status: status ?? null,
        updated_at: new Date(),
      };

      let record;
      if (existing) {
        await existing.update(payload);
        record = existing;
      } else {
        record = await DailyActivity.create(payload);
      }

      res.status(existing ? 200 : 201).json(record);
    } catch (err) {
      console.error('DailyActivity upsert error:', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // List activities by optional date filter
  router.get('/', async (req, res) => {
    try {
      const { user_id, date } = req.query;

      if (!user_id) return res.status(400).json({ error: 'user_id is required' });

      const where = { user_id };
      if (date) {
        // date expected as YYYY-MM-DD
        where.activity_date = { [Op.eq]: date };
      }

      const items = await DailyActivity.findAll({
        where,
        order: [['activity_date', 'DESC'], ['id', 'DESC']],
      });

      res.json({ items });
    } catch (err) {
      console.error('DailyActivity list error:', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Delete a daily activity
  router.delete('/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const record = await DailyActivity.findByPk(id);
      if (!record) {
        return res.status(404).json({ error: 'Activity not found' });
      }
      await record.destroy();
      res.json({ message: 'Activity deleted successfully' });
    } catch (err) {
      console.error('DailyActivity delete error:', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Get dynamic user timeline activity logs across all modules
  router.get('/user-timeline', async (req, res) => {
    try {
      const { name, username } = req.query;
      const limit = parseInt(req.query.limit) || 5;
      let where = {};
      let whereWithHistory = {};

      if (name || username) {
        // Construct search criteria matching variations of name / username
        const userTerms = [];
        if (name) userTerms.push(`%${name}%`);
        if (username) userTerms.push(`%${username}%`);

        const orConditions = [];
        const orConditionsWithHistory = [];

        for (const term of userTerms) {
          orConditions.push({ created_by: { [Op.like]: term } });
          orConditions.push({ modified_by: { [Op.like]: term } });

          orConditionsWithHistory.push({ created_by: { [Op.like]: term } });
          orConditionsWithHistory.push({ modified_by: { [Op.like]: term } });
          orConditionsWithHistory.push({ history: { [Op.like]: term } });
        }

        where = { [Op.or]: orConditions };
        whereWithHistory = { [Op.or]: orConditionsWithHistory };
      }

      let sysLogWhere = {};
      if (name || username) {
        const userTerms = [];
        if (name) userTerms.push(`%${name}%`);
        if (username) userTerms.push(`%${username}%`);
        const orConditions = [];
        for (const term of userTerms) {
          orConditions.push({ user_name: { [Op.like]: term } });
        }
        sysLogWhere = { [Op.or]: orConditions };
      }

      // We fetch more records (limit * 5) from DB so we can filter out Bulk imports in JS
      // This prevents the bug where a record that was once bulk imported (and has 'Bulk' in its history)
      // is forever excluded from the timeline even if it's manually updated later.
      const fetchLimit = limit * 5;

      const user_id = req.query.user_id;

      // Query latest entries across primary audited tables in parallel
      const [mcs, mcoms, cfiles, complaints, discussions, renewals, agmRecords, invoices, reports, systemLogs, dailyActs, allUsers] = await Promise.all([
        models.ManagementCorporation.findAll({ where: whereWithHistory, limit: fetchLimit, order: [['updated_at', 'DESC']] }).catch(() => []),
        models.McomRecord.findAll({ where: whereWithHistory, limit: fetchLimit, order: [['updated_at', 'DESC']] }).catch(() => []),
        models.Cfile.findAll({ where: whereWithHistory, limit: fetchLimit, order: [['updated_at', 'DESC']] }).catch(() => []),
        models.Complaint.findAll({ where: whereWithHistory, limit: fetchLimit, order: [['updated_at', 'DESC']] }).catch(() => []),
        models.Discussion.findAll({ where: whereWithHistory, limit: fetchLimit, order: [['updated_at', 'DESC']] }).catch(() => []),
        models.Renewal ? models.Renewal.findAll({ where, limit: fetchLimit, order: [['updated_at', 'DESC']] }).catch(() => []) : [],
        models.AgmRecord ? models.AgmRecord.findAll({ where, limit: fetchLimit, order: [['updatedAt', 'DESC']] }).catch(() => []) : [],
        models.RegistrationPayableInvoice ? models.RegistrationPayableInvoice.findAll({ where: whereWithHistory, limit: fetchLimit, order: [['updated_at', 'DESC']] }).catch(() => []) : [],
        models.ReportDocument ? models.ReportDocument.findAll({ where, limit: fetchLimit, order: [['created_at', 'DESC']] }).catch(() => []) : [],
        models.SystemLog ? models.SystemLog.findAll({ where: sysLogWhere, limit: fetchLimit, order: [['created_at', 'DESC']] }).catch(() => []) : [],
        models.DailyActivity && user_id ? models.DailyActivity.findAll({ where: { user_id }, limit: fetchLimit, order: [['activity_date', 'DESC']] }).catch(() => []) : [],
        models.User ? models.User.findAll({ attributes: ['name', 'designation', 'role'] }).catch(() => []) : []
      ]);

      const userRoleMap = {};
      if (allUsers) {
        allUsers.forEach(u => {
          if (u.name) {
            userRoleMap[u.name.trim()] = u.designation || u.role || 'User';
          }
        });
      }

      const logs = [];

      const extractAllActions = (records, defaultText, idPrefix, getTitle) => {
        records.forEach(record => {
          const title = getTitle(record) || idPrefix;
          let pushedFromHistory = false;
          if (record.history) {
            try {
              const list = typeof record.history === 'string' ? JSON.parse(record.history) : record.history;
              if (Array.isArray(list) && list.length > 0) {
                list.forEach((item, index) => {
                  const recordUser = record.modified_by || record.updated_by || record.created_by || record.uploaded_by || record.action_by || 'System';
                  let name = item.name || item.user || item.username || recordUser;
                  
                  // Append role if present and not already appended
                  const role = userRoleMap[name?.trim()];
                  if (role && name && !name.includes('(')) {
                    name = `${name} (${role})`;
                  }

                  const note = item.note || item.action || defaultText;
                  const time = item.time || item.date || item.timestamp || record.updated_at || record.created_at;
                  logs.push({
                    id: `${idPrefix}-${record.id}-hist-${index}`,
                    time,
                    user: name,
                    action: `${note} — ${title}`,
                    text: `${name}: ${note} — ${title}`
                  });
                });
                pushedFromHistory = true;
              }
            } catch (e) { }
          }
          // Removed the !pushedFromHistory block so that we do not generate
          // fake logs for bulk imported items. Real updates will either be
          // in the history JSON array or recorded natively in SystemLog.
        });
      };

      extractAllActions(mcs, 'updated MC record', 'mc', r => r.management_corporation_name || r.name || r.file_no);
      extractAllActions(mcoms, 'updated M.Com record', 'mcom', r => r.management_corporation_name || r.new_file_no || r.old_file_no);
      extractAllActions(cfiles, 'updated C-File', 'cfile', r => r.file_no || r.name_of_apartment);
      extractAllActions(complaints, 'updated Complaint', 'complaint', r => r.complaint_no || r.subject);
      extractAllActions(discussions, 'updated Discussion', 'discussion', r => r.appointment);
      extractAllActions(invoices, 'updated Invoice', 'invoice', r => `Invoice ${r.invoice_number || r.id}`);

      renewals.forEach(r => {
        logs.push({
          id: `renewal-${r.id}`,
          time: r.updated_at || r.created_at,
          user: r.action_by || 'System',
          action: `updated MC Renewal — ${r.ref_no || r.mc_name || 'Renewal'} (Status: ${r.status || 'Pending'})`,
          text: `${r.action_by || 'System'}: updated MC Renewal — ${r.ref_no || r.mc_name || 'Renewal'} (Status: ${r.status || 'Pending'})`
        });
      });

      agmRecords.forEach(a => {
        logs.push({
          id: `agm-${a.id}`,
          time: a.updatedAt || a.createdAt,
          user: a.uploaded_by || 'System',
          action: `updated AGM Record — ${a.file_no || a.mc_name || 'AGM'}`,
          text: `${a.uploaded_by || 'System'}: updated AGM Record — ${a.file_no || a.mc_name || 'AGM'}`
        });
      });

      invoices.forEach(i => {
        const { name, note } = getLatestAction(i, 'updated Invoice');
        logs.push({
          id: `invoice-${i.id}`,
          time: i.updated_at || i.created_at,
          user: name,
          action: `${note} — Invoice ${i.invoice_number || i.id}`,
          text: `${name}: ${note} — Invoice ${i.invoice_number || i.id}`
        });
      });

      reports.forEach(r => {
        logs.push({
          id: `report-${r.id}`,
          time: r.created_at,
          user: r.created_by || 'System',
          action: `uploaded Report — ${r.file_name}`,
          text: `${r.created_by || 'System'}: uploaded Report — ${r.file_name}`
        });
      });

      systemLogs.forEach(log => {
        let logUser = log.user_name || 'System';
        
        const role = userRoleMap[logUser?.trim()];
        if (role && logUser && !logUser.includes('(')) {
          logUser = `${logUser} (${role})`;
        }

        logs.push({
          id: `syslog-${log.id}`,
          time: log.created_at,
          user: logUser,
          action: `${log.action} — ${log.details}`,
          text: `${logUser}: ${log.action} — ${log.details}`
        });
      });

      if (dailyActs) {
        dailyActs.forEach(act => {
          let uName = name || username || 'User';
          
          const role = userRoleMap[uName?.trim()];
          if (role && uName && !uName.includes('(')) {
            uName = `${uName} (${role})`;
          }

          logs.push({
            id: `act-${act.id}`,
            time: act.activity_date || act.updated_at,
            user: uName,
            action: act.activity_category || 'Activity Update',
            text: `${uName}: Logged daily activity — ${act.activity_text}`
          });
        });
      }

      // Sort combined activity logs by timestamp desc
      logs.sort((a, b) => new Date(b.time) - new Date(a.time));
      
      // Filter out bulk imports at the JS level (only if the LATEST action was a Bulk action)
      let nonBulkLogs = logs.filter(log => !log.action.includes('Bulk Added') && !log.action.includes('Bulk Updated') && log.user !== 'System');

      if (name || username) {
        const lowerName = (name || '').toLowerCase();
        const lowerUser = (username || '').toLowerCase();
        nonBulkLogs = nonBulkLogs.filter(log => {
          const logUser = (log.user || '').toLowerCase();
          return (lowerName && logUser.includes(lowerName)) || (lowerUser && logUser.includes(lowerUser));
        });
      }

      const slicedLogs = nonBulkLogs.slice(0, limit);

      res.json({ items: slicedLogs });
    } catch (err) {
      console.error('User timeline summary error:', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  return router;
};

