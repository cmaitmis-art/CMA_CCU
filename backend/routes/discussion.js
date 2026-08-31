const express = require("express");
const router = express.Router();
const { Op } = require("sequelize");
const exceljs = require("exceljs");
const moment = require("moment");

module.exports = (models) => {
  const { Discussion, Notification } = models;

  const autoTransitionDiscussions = async () => {
    try {
      // Set to start of today (midnight) for accurate day comparisons
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayMs = today.getTime();
      const tomorrowMs = todayMs + 24 * 60 * 60 * 1000;

      // Find all discussions that are not completed/cancelled
      const candidates = await Discussion.findAll({
        where: {
          status: {
            [Op.notIn]: ['Completed', 'Cancelled']
          }
        }
      });

      for (const disc of candidates) {
        // Determine the target date to evaluate (prefer reminder_date, fallback to meeting_date_time, fallback to date)
        let targetMs = null;
        let targetType = 'none';

        if (disc.reminder_date) {
          const parsed = new Date(disc.reminder_date);
          parsed.setHours(0, 0, 0, 0);
          if (!isNaN(parsed.getTime())) {
            targetMs = parsed.getTime();
            targetType = 'reminder_date';
          }
        } 
        
        if (targetMs === null && disc.meeting_date_time) {
          const rawMeeting = String(disc.meeting_date_time).trim();
          const parsed = new Date(rawMeeting);
          if (!isNaN(parsed.getTime())) {
            parsed.setHours(0, 0, 0, 0);
            targetMs = parsed.getTime();
            targetType = 'meeting_date_time';
          } else {
            const ddmmMatch = rawMeeting.match(
              /^(\d{1,2})\/(\d{1,2})\/(\d{4})\s+(\d{1,2}):(\d{2})\s*(AM|PM)?$/i
            );
            if (ddmmMatch) {
              const [, dd, mm, yyyy] = ddmmMatch;
              const parsedDate = new Date(parseInt(yyyy, 10), parseInt(mm, 10) - 1, parseInt(dd, 10));
              parsedDate.setHours(0, 0, 0, 0);
              targetMs = parsedDate.getTime();
              targetType = 'meeting_date_time';
            }
          }
        }

        if (targetMs === null && disc.date) {
            const parsed = new Date(disc.date);
            parsed.setHours(0, 0, 0, 0);
            if (!isNaN(parsed.getTime())) {
                targetMs = parsed.getTime();
                targetType = 'date';
            }
        }

        if (targetMs === null) {
          // If no parseable date, skip
          continue;
        }

        let newStatus = disc.status;
        let actionNote = '';

        if (targetMs >= tomorrowMs) {
          // Future date -> keep/set as New
          if (disc.status !== 'New') {
             newStatus = 'New';
             actionNote = 'Auto changed to New: future date set';
          }
        } else if (targetMs === todayMs) {
          // Today -> keep/set as In Progress, trigger notification if transitioning from New
          if (disc.status !== 'In Progress') {
             newStatus = 'In Progress';
             actionNote = 'Auto changed to In Progress: date arrived';
             
             // Topbar handles discussion reminders by polling the /pending endpoint directly.
             // No need to create a global popup notification here.

          }
        } else if (targetMs < todayMs) {
          // Past date -> keep/set as Cancelled
          if (disc.status !== 'Cancelled') {
             newStatus = 'Cancelled';
             actionNote = 'Auto cancelled: date passed';
             const cancelNote = '[System: Auto cancelled because the discussion date has passed]';
             disc.reminder_notes = disc.reminder_notes ? `${disc.reminder_notes}\n${cancelNote}` : cancelNote;
          }
        }

        if (newStatus !== disc.status) {
            disc.status = newStatus;

            let historyList = [];
            try {
              if (disc.history) {
                historyList = JSON.parse(disc.history);
              }
            } catch (e) {}

            historyList.push({
              name: 'System',
              action: actionNote,
              time: new Date().toISOString()
            });

            disc.history = JSON.stringify(historyList);
            disc.modified_by = 'System';

            await disc.save();
        }
      }
    } catch (err) {
      console.error("Error in autoTransitionDiscussions:", err);
    }
  };

  // GET all discussions with pagination and search
  router.get("/", async (req, res) => {
    const { page = 1, pageSize = 10, search = "", status = "", year = "", month = "" } = req.query;
    const offset = (page - 1) * pageSize;

    // Important: search should be optional.
    // When search is empty, don't generate a SQL WHERE clause that can crash
    // if the DB collation/type handling is strict.
    const trimmed = String(search ?? '').trim();

    try {
      // Run auto-cancel check before fetching discussions
      await autoTransitionDiscussions();

      const where = {};
      const andConditions = [];

      if (trimmed) {
        andConditions.push({
          [Op.or]: [
            { file_no: { [Op.like]: `%${trimmed}%` } },
            { appointment: { [Op.like]: `%${trimmed}%` } },
            { complaint: { [Op.like]: `%${trimmed}%` } },
            { respond: { [Op.like]: `%${trimmed}%` } },
            { officer: { [Op.like]: `%${trimmed}%` } },
            { status: { [Op.like]: `%${trimmed}%` } },
          ],
        });
      }

      if (status) andConditions.push({ status });
      if (month) {
        if (month.includes('-')) {
          andConditions.push({ date: { [Op.like]: `${month}-%` } });
        } else if (year) {
          andConditions.push({ date: { [Op.like]: `${year}-${month}-%` } });
        } else {
          andConditions.push({ date: { [Op.like]: `%-${month}-%` } });
        }
      } else if (year) {
        andConditions.push({ date: { [Op.like]: `${year}-%` } });
      }

      if (andConditions.length > 0) {
        where[Op.and] = andConditions;
      }

      const { count, rows } = await Discussion.findAndCountAll({
        where,
        limit: parseInt(pageSize),
        offset: parseInt(offset),
      });

      res.status(200).json({
        totalItems: count,
        discussions: rows,
        totalPages: Math.ceil(count / pageSize),
        currentPage: parseInt(page),
      });
    } catch (error) {
      console.error("Error fetching discussions:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // GET dashboard pending discussions
  router.get("/dashboard/pending", async (req, res) => {
    try {
      // Run auto-cancel check first
      await autoTransitionDiscussions();

      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today.getTime() + 24 * 60 * 60 * 1000);

      // Get all active discussions to filter those due today in JS (to handle complex date logic)
      const allActive = await Discussion.findAll({
        where: {
          status: {
            [Op.notIn]: ['Completed', 'Cancelled']
          }
        }
      });
      
      const due = [];
      for (const disc of allActive) {
        let targetMs = null;
        if (disc.reminder_date) {
          const parsed = new Date(disc.reminder_date);
          parsed.setHours(0, 0, 0, 0);
          if (!isNaN(parsed.getTime())) targetMs = parsed.getTime();
        } 
        if (targetMs === null && disc.meeting_date_time) {
          const rawMeeting = String(disc.meeting_date_time).trim();
          const parsed = new Date(rawMeeting);
          if (!isNaN(parsed.getTime())) {
            parsed.setHours(0, 0, 0, 0);
            targetMs = parsed.getTime();
          } else {
            const ddmmMatch = rawMeeting.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
            if (ddmmMatch) {
              const [, dd, mm, yyyy] = ddmmMatch;
              const parsedDate = new Date(parseInt(yyyy, 10), parseInt(mm, 10) - 1, parseInt(dd, 10));
              parsedDate.setHours(0, 0, 0, 0);
              targetMs = parsedDate.getTime();
            }
          }
        }
        if (targetMs === null && disc.date) {
            const parsed = new Date(disc.date);
            parsed.setHours(0, 0, 0, 0);
            if (!isNaN(parsed.getTime())) targetMs = parsed.getTime();
        }

        if (targetMs !== null && targetMs >= today.getTime()) {
           due.push(disc);
        }
      }

      // Get newest discussions (New and Processing)
      const newDiscs = await Discussion.findAll({
        where: { 
          status: { [Op.in]: ['New', 'Processing', 'Pending', 'In Progress'] } 
        },
        order: [['created_at', 'DESC']],
        limit: 5
      });

      res.status(200).json({ due, newDiscs });
    } catch (error) {
      console.error("Error fetching dashboard discussions:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // GET single discussion by ID
  router.get("/:id", async (req, res) => {
    try {
      const discussion = await Discussion.findByPk(req.params.id);
      if (discussion) {
        res.status(200).json(discussion);
      } else {
        res.status(404).json({ error: "Discussion not found" });
      }
    } catch (error) {
      console.error("Error fetching discussion:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // POST create new discussion
  // Audit policy: created_by/modified_by must be from logged-in username.
  // Frontend should not be able to override these fields.
  router.post("/", async (req, res) => {
    let cleanedPayload = null;
    try {
      const { created_by, modified_by, username, ...payload } = req.body || {};
      const authUsername = req.body?.username || req.body?.created_by || created_by || modified_by || 'admin';

      // Define valid Discussion model fields
      const validFields = [
        'date',
        'file_no',
        'appointment',
        'complaint',
        'respond',
        'meeting_date_time',
        'venue',
        'reminder_date',
        'reminder_notes',
        'officer',
        'status',
      ];

      // Convert empty strings and invalid values to null for all fields
      cleanedPayload = {};
      
      // Process only valid fields
      Object.keys(payload).forEach(key => {
        // Skip unknown fields
        if (!validFields.includes(key)) {
          console.warn(`⚠️ Skipping unknown field: "${key}"`);
          return;
        }

        const value = payload[key];
        const stringValue = String(value ?? '').trim();
        
        // Convert empty/invalid strings to null
        if (!stringValue || stringValue === '__EMPTY' || stringValue === '—' || stringValue === 'NaN') {
          cleanedPayload[key] = null;
        } else {
          cleanedPayload[key] = value;
        }
      });

      // Ensure file_no has a value
      if (!cleanedPayload.file_no || cleanedPayload.file_no === null) {
        cleanedPayload.file_no = `FILE-${Date.now()}-${Math.random().toString(36).substring(7)}`;
      }

      // Ensure appointment has a value
      if (!cleanedPayload.appointment || cleanedPayload.appointment === null) {
        cleanedPayload.appointment = `Appointment-${Date.now()}-${Math.random().toString(36).substring(7)}`;
      }

      // Set audit fields
      cleanedPayload.created_by = authUsername;
      cleanedPayload.modified_by = authUsername;

      const initialHistory = [{
        name: authUsername,
        action: 'Added',
        time: new Date().toISOString(),
      }];
      cleanedPayload.history = JSON.stringify(initialHistory);

      console.log('Creating discussion with cleaned payload:', JSON.stringify(cleanedPayload, null, 2));

      const newDiscussion = await Discussion.create(cleanedPayload);
      console.log('✅ Discussion created successfully:', newDiscussion.id);
      res.status(201).json(newDiscussion);
    } catch (error) {
      const errorDetails = error?.errors
        ? error.errors.map(e => ({
            path: e.path,
            message: e.message,
            value: e.value,
          }))
        : undefined;

      console.error("❌ Error creating discussion:", {
        message: error.message,
        name: error.name,
        details: errorDetails || error.toString(),
        received: req.body,
      });

      // Handle specific error types with appropriate HTTP status codes
      if (error.name === 'SequelizeUniqueConstraintError') {
        // 409 Conflict - for unique constraint violations
        const field = error?.errors?.[0]?.path || 'unknown field';
        res.status(409).json({
          error: `A discussion with this ${field} already exists. The ${field} must be unique.`,
          field,
          message: error.message,
          suggestion: `Try using a different value for ${field}`,
        });
      } else if (error.name === 'SequelizeValidationError') {
        // 400 Bad Request - for validation errors
        res.status(400).json({
          error: "Validation failed",
          details: errorDetails,
          message: error.message,
        });
      } else {
        // 500 Internal Server Error - for other errors
        res.status(500).json({
          error: error.message || "Internal server error",
          name: error.name,
        });
      }
    }
  });

  const updateAudit = async (id, req, res) => {
    try {
      const { created_by, modified_by, username, ...payload } = req.body || {};
      const authUsername = req.body?.username || req.body?.created_by || req.body?.modified_by || 'admin';
      const validFields = [
        'date',
        'file_no',
        'appointment',
        'complaint',
        'respond',
        'meeting_date_time',
        'venue',
        'reminder_date',
        'reminder_notes',
        'officer',
        'status',
      ];

      const existingRecord = await Discussion.findByPk(id);
      if (!existingRecord) return res.status(404).json({ error: "Discussion not found" });

      let history = [];
      try {
        history = existingRecord.history ? JSON.parse(existingRecord.history) : [];
      } catch (e) {
        history = [];
      }

      // Clean up empty/invalid values and ignore unsupported fields from the form payload.
      const cleanedPayload = {};
      Object.keys(payload).forEach(key => {
        if (!validFields.includes(key)) {
          console.warn(`⚠️ Update ignored unsupported field: "${key}"`);
          return;
        }

        const value = payload[key];
        const stringValue = String(value ?? '').trim();
        if (!stringValue || stringValue === '__EMPTY' || stringValue === '—' || stringValue === 'NaN') {
          cleanedPayload[key] = null;
        } else {
          cleanedPayload[key] = value;
        }
      });

      const changedFields = [];
      for (const key of Object.keys(cleanedPayload)) {
        const oldVal = existingRecord[key] === '' ? null : existingRecord[key];
        const newVal = cleanedPayload[key] === '' ? null : cleanedPayload[key];
        
        if ((oldVal == null) !== (newVal == null)) {
          changedFields.push(key.replace(/_/g, ' '));
        } else if (oldVal != null && newVal != null) {
          if (String(oldVal) !== String(newVal)) {
            changedFields.push(key.replace(/_/g, ' '));
          }
        }
      }

      let note = 'Modified record';
      if (cleanedPayload.status === 'Active' && existingRecord.status !== 'Active') {
        note = 'Approved & Activated record';
      } else if (cleanedPayload.status === 'Non Active' && existingRecord.status !== 'Non Active') {
        note = 'Rejected record';
      } else if (changedFields.length > 0) {
        note = `Updated ${changedFields.join(', ')}`;
      }

      history.push({
        name: authUsername,
        action: 'Modified',
        time: new Date().toISOString(),
        note
      });

      cleanedPayload.history = JSON.stringify(history);

      const [updated] = await Discussion.update(
        { ...cleanedPayload, modified_by: authUsername },
        {
          where: { id },
        }
      );

      if (!updated) return res.status(404).json({ error: "Discussion not found" });

      const updatedDiscussion = await Discussion.findByPk(id);
      return res.status(200).json(updatedDiscussion);
    } catch (error) {
      console.error("Error updating discussion:", error);
      
      // Handle specific error types with appropriate HTTP status codes
      if (error.name === 'SequelizeUniqueConstraintError') {
        return res.status(409).json({
          error: `A discussion with this value already exists`,
          message: error.message,
        });
      } else if (error.name === 'SequelizeValidationError') {
        return res.status(400).json({
          error: "Validation failed",
          message: error.message,
        });
      } else {
        return res.status(500).json({
          error: "Internal server error",
          message: error.message,
        });
      }
    }
  };

  // PUT update discussion by ID
  router.put("/:id", (req, res) => updateAudit(req.params.id, req, res));

  // PATCH update discussion by ID (alias for PUT)
  router.patch("/:id", (req, res) => updateAudit(req.params.id, req, res));

  // DELETE discussion by ID
  router.delete("/:id", async (req, res) => {
    try {
      const discussion = await Discussion.findByPk(req.params.id);
      const deleted = await Discussion.destroy({
        where: { id: req.params.id },
      });
      if (deleted) {
        if (models.SystemLog) {
          const user = req.body.user_name || req.query.user_name || 'System';
          await models.SystemLog.create({
            user_name: user,
            action: 'Deleted Discussion',
            details: `Deleted discussion record: ${discussion ? (discussion.file_no || discussion.appointment || `ID ${discussion.id}`) : `ID ${req.params.id}`}`
          });
        }
        res.status(204).send();
      } else {
        res.status(404).json({ error: "Discussion not found" });
      }
    } catch (error) {
      console.error("Error deleting discussion:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // DELETE all discussions
  router.delete("/", async (req, res) => {
    try {
      const deleted = await Discussion.destroy({ where: {} });
      if (deleted > 0 && models.SystemLog) {
        const user = req.body.user_name || req.query.user_name || 'System';
        await models.SystemLog.create({
          user_name: user,
          action: 'Deleted ALL Discussions',
          details: `Deleted all ${deleted} discussion records`
        });
      }
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting all discussions:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // POST bulk import discussions from Excel
  router.post("/bulk", async (req, res) => {
    if (!req.files || !req.files.excel) {
      return res.status(400).json({ error: "No Excel file uploaded" });
    }

    const excelFile = req.files.excel;
    const workbook = new exceljs.Workbook();

    try {
      await workbook.xlsx.load(excelFile.data);
      const worksheet = workbook.getWorksheet(1);
      let successCount = 0;
      let failCount = 0;
      const failures = [];

      const processRow = async (cellRow, rowNumber) => {
        try {
          const baseRecord = {
            date: moment(cellRow.getCell(1).value).toDate(),
            file_no: cellRow.getCell(2).value || null,
            appointment: cellRow.getCell(3).value || null,
            complaint: cellRow.getCell(4).value || null,
            respond: cellRow.getCell(5).value || null,
            meeting_date_time: cellRow.getCell(6).value || null,
            officer: cellRow.getCell(7).value || null,
            status: cellRow.getCell(8).value || 'New',
          };

          // Define valid Discussion model fields only
          const validFields = [
            'date',
            'file_no',
            'appointment',
            'complaint',
            'respond',
            'meeting_date_time',
            'officer',
            'status',
            'venue',
            'reminder_date',
            'reminder_notes',
          ];

          // Filter to only valid fields
          const record = {};
          Object.keys(baseRecord).forEach(key => {
            if (validFields.includes(key)) {
              record[key] = baseRecord[key];
            }
          });

          // Ensure required fields have values
          if (!record.file_no || record.file_no === null) {
            record.file_no = `FILE-${Date.now()}-${Math.random().toString(36).substring(7)}`;
          }
          if (!record.appointment || record.appointment === null) {
            record.appointment = `Appointment-${Date.now()}-${Math.random().toString(36).substring(7)}`;
          }

          // Set audit fields
          record.created_by = 'admin';
          record.modified_by = 'admin';

          await Discussion.create(record);
          successCount++;
          console.log(`✅ Row ${rowNumber} imported successfully`);
        } catch (rowError) {
          failCount++;
          failures.push({
            row: rowNumber,
            error: rowError.message,
            name: rowError.name,
          });
          console.error(`❌ Row ${rowNumber} import failed:`, rowError.message);
        }
      };

      // Process each row (skip header at row 1)
      for (let rowNumber = 2; rowNumber <= worksheet.rowCount; rowNumber++) {
        const cellRow = worksheet.getRow(rowNumber);
        await processRow(cellRow, rowNumber);
      }

      res.status(201).json({
        message: `Import completed. ${successCount} succeeded, ${failCount} failed.`,
        successCount,
        failCount,
        failures: failures.length > 0 ? failures : undefined,
      });
    } catch (error) {
      console.error("Error importing discussions:", error);
      res.status(500).json({ error: "Internal server error", details: error.message });
    }
  });

  // POST bulk delete discussions by IDs
  router.post("/bulk-delete", async (req, res) => {
    const { ids } = req.body;

    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: "Invalid or empty array of IDs provided" });
    }

    try {
      const deletedCount = await Discussion.destroy({
        where: {
          id: { [Op.in]: ids },
        },
      });
      if (deletedCount > 0 && models.SystemLog) {
        const user = req.body.user_name || req.query.user_name || 'System';
        await models.SystemLog.create({
          user_name: user,
          action: 'Deleted Discussions',
          details: `Bulk deleted ${deletedCount} discussion records (IDs: ${ids.join(', ')})`
        });
      }
      res.status(200).json({ message: `${deletedCount} discussions deleted successfully` });
    } catch (error) {
      console.error("Error bulk deleting discussions:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  return router;
};