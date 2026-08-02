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

      if (name || username) {
        // Construct search criteria matching variations of name / username
        const userTerms = [];
        if (name) userTerms.push(`%${name}%`);
        if (username) userTerms.push(`%${username}%`);

        const orConditions = [];
        for (const term of userTerms) {
          orConditions.push({ created_by: { [Op.like]: term } });
          orConditions.push({ modified_by: { [Op.like]: term } });
        }

        where = { [Op.or]: orConditions };
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

      // Query latest entries across primary audited tables in parallel
      const [mcs, mcoms, cfiles, complaints, discussions, systemLogs] = await Promise.all([
        models.ManagementCorporation.findAll({ where, limit, order: [['updated_at', 'DESC']] }).catch(() => []),
        models.McomRecord.findAll({ where, limit, order: [['updated_at', 'DESC']] }).catch(() => []),
        models.Cfile.findAll({ where, limit, order: [['updated_at', 'DESC']] }).catch(() => []),
        models.Complaint.findAll({ where, limit, order: [['updated_at', 'DESC']] }).catch(() => []),
        models.Discussion.findAll({ where, limit, order: [['updated_at', 'DESC']] }).catch(() => []),
        models.SystemLog ? models.SystemLog.findAll({ where: sysLogWhere, limit, order: [['created_at', 'DESC']] }).catch(() => []) : [],
      ]);

      const logs = [];

      const getLatestAction = (record, defaultText) => {
        let name = record.modified_by || 'System';
        let note = defaultText;
        if (!record.history) return { name, note };
        try {
          const list = typeof record.history === 'string' ? JSON.parse(record.history) : record.history;
          if (Array.isArray(list) && list.length > 0) {
            // Sort by time descending
            list.sort((a, b) => new Date(b.time || b.date || b.timestamp) - new Date(a.time || a.date || a.timestamp));
            const latest = list[0];
            name = latest.name || latest.user || latest.username || record.modified_by || 'System';
            note = latest.note || latest.action || defaultText;
          }
        } catch (e) { }
        return { name, note };
      };

      mcs.forEach(mc => {
        const { name, note } = getLatestAction(mc, 'updated MC record');
        logs.push({
          id: `mc-${mc.id}`,
          time: mc.updated_at || mc.created_at,
          user: name,
          action: `${note} — ${mc.management_corporation_name || mc.name || mc.file_no || 'MC'}`,
          text: `${name}: ${note} — ${mc.management_corporation_name || mc.name || mc.file_no || 'MC'}`
        });
      });

      mcoms.forEach(m => {
        const { name, note } = getLatestAction(m, 'updated M.Com record');
        logs.push({
          id: `mcom-${m.id}`,
          time: m.updated_at || m.created_at,
          user: name,
          action: `${note} — ${m.management_corporation_name || m.new_file_no || m.old_file_no || 'M.Com'}`,
          text: `${name}: ${note} — ${m.management_corporation_name || m.new_file_no || m.old_file_no || 'M.Com'}`
        });
      });

      cfiles.forEach(cf => {
        const { name, note } = getLatestAction(cf, 'updated C-File');
        logs.push({
          id: `cfile-${cf.id}`,
          time: cf.updated_at || cf.created_at,
          user: name,
          action: `${note} — ${cf.file_no || cf.name_of_apartment || 'C-File'}`,
          text: `${name}: ${note} — ${cf.file_no || cf.name_of_apartment || 'C-File'}`
        });
      });

      complaints.forEach(c => {
        const { name, note } = getLatestAction(c, 'updated Complaint');
        logs.push({
          id: `complaint-${c.id}`,
          time: c.updated_at || c.created_at,
          user: name,
          action: `${note} — ${c.complaint_no || c.subject || 'Complaint'}`,
          text: `${name}: ${note} — ${c.complaint_no || c.subject || 'Complaint'}`
        });
      });

      discussions.forEach(d => {
        const { name, note } = getLatestAction(d, 'updated Discussion');
        logs.push({
          id: `discussion-${d.id}`,
          time: d.updated_at || d.created_at,
          user: name,
          action: `${note} — ${d.appointment || 'Discussion'}`,
          text: `${name}: ${note} — ${d.appointment || 'Discussion'}`
        });
      });

      systemLogs.forEach(log => {
        logs.push({
          id: `syslog-${log.id}`,
          time: log.created_at,
          user: log.user_name || 'System',
          action: `${log.action} — ${log.details}`,
          text: `${log.user_name || 'System'}: ${log.action} — ${log.details}`
        });
      });

      // Sort combined activity logs by timestamp desc
      logs.sort((a, b) => new Date(b.time) - new Date(a.time));
      const slicedLogs = logs.slice(0, limit);

      res.json({ items: slicedLogs });
    } catch (err) {
      console.error('User timeline summary error:', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  return router;
};

