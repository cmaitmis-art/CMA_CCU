const { DataTypes } = require('sequelize');

const defineUser = require('./users.model');
const defineManagementCorporation = require('./managementCorporations.model');
const defineMcomRecord = require('./mcomRecords.model');
const defineCfile = require('./cfiles.model');
const defineComplaint = require('./complaints.model');
const defineDailyActivity = require('./dailyActivities.model');
const defineReportDocument = require('./reportsDocuments.model');
const defineDiscussion = require('./discussions.model');
const defineRegistrationPayableInvoice = require('./registrationPayableInvoices.model');
const defineNotification = require('./notifications.model');
const defineNotificationRead = require('./notificationReads.model');
const defineAgmRecord = require('./agmRecords.model');
const defineSystemLog = require('./systemLogs.model');
const defineSetting = require('./settings.model');
const defineRenewal = require('./renewals.model');
const defineRole = require('./roles.model');
const defineCustomerHistory = require('./customerHistories.model');
const defineChatMessage = require('./chatMessages.model');
const defineCalendarEvent = require('./calendarEvents.model');
const defineUserPreference = require('./userPreferences.model');
const defineUserDraft = require('./userDrafts.model');

const initializeModels = (sequelize) => {
  const models = {
    User: defineUser(sequelize, DataTypes),
    ManagementCorporation: defineManagementCorporation(sequelize, DataTypes),
    McomRecord: defineMcomRecord(sequelize, DataTypes),
    Cfile: defineCfile(sequelize, DataTypes),
    Complaint: defineComplaint(sequelize, DataTypes),
    DailyActivity: defineDailyActivity(sequelize, DataTypes),
    ReportDocument: defineReportDocument(sequelize, DataTypes),
    Discussion: defineDiscussion(sequelize, DataTypes),
    RegistrationPayableInvoice: defineRegistrationPayableInvoice(sequelize, DataTypes),
    Notification: defineNotification(sequelize, DataTypes),
    NotificationRead: defineNotificationRead(sequelize, DataTypes),
    AgmRecord: defineAgmRecord(sequelize, DataTypes),
    SystemLog: defineSystemLog(sequelize, DataTypes),
    Setting: defineSetting(sequelize, DataTypes),
    Renewal: defineRenewal(sequelize, DataTypes),
    Role: defineRole(sequelize, DataTypes),
    CustomerHistory: defineCustomerHistory(sequelize, DataTypes),
    ChatMessage: defineChatMessage(sequelize, DataTypes),
    CalendarEvent: defineCalendarEvent(sequelize, DataTypes),
    UserPreference: defineUserPreference(sequelize, DataTypes),
    UserDraft: defineUserDraft(sequelize, DataTypes),
  };

  models.Complaint.belongsTo(models.ManagementCorporation, { foreignKey: 'mc_id' });
  models.AgmRecord.belongsTo(models.ManagementCorporation, { foreignKey: 'mc_id' });
  models.ManagementCorporation.hasOne(models.AgmRecord, { foreignKey: 'mc_id' });

  models.RegistrationPayableInvoice.belongsTo(models.ManagementCorporation, { foreignKey: 'mc_id' });
  models.ManagementCorporation.hasMany(models.RegistrationPayableInvoice, { foreignKey: 'mc_id' });

  // NotificationRead: each row links a user to a dismissed notification
  models.NotificationRead.belongsTo(models.User, { foreignKey: 'user_id' });
  models.NotificationRead.belongsTo(models.Notification, { foreignKey: 'notification_id' });

  // ChatMessage relationships
  models.ChatMessage.belongsTo(models.User, { as: 'Sender', foreignKey: 'sender_id' });
  models.ChatMessage.belongsTo(models.User, { as: 'Receiver', foreignKey: 'receiver_id' });
  models.User.hasMany(models.ChatMessage, { foreignKey: 'sender_id', as: 'SentMessages' });
  models.User.hasMany(models.ChatMessage, { foreignKey: 'receiver_id', as: 'ReceivedMessages' });

  // Add Global Hooks for Activity Logging
  const IGNORED_MODELS = ['SystemLog', 'DailyActivity', 'Notification', 'NotificationRead', 'User', 'CustomerHistory', 'ChatMessage'];
  
  Object.keys(models).forEach(modelName => {
    if (IGNORED_MODELS.includes(modelName)) return;
    const model = models[modelName];

    const logAction = async (instance, action, options) => {
      try {
        if (options && options.skipActivityLog) return;

        // Only log if the instance has user information, to prevent 'System' spam
        let user = null;
        if (options && options.user) {
          user = options.user;
        } else if (instance.updated_by || instance.modified_by || instance.action_by || instance.uploaded_by || instance.created_by) {
          user = instance.updated_by || instance.modified_by || instance.action_by || instance.uploaded_by || instance.created_by;
        }

        if (!user || user === 'System') return; // Skip automatic logs that don't have a specific user

        let idStr = instance.file_no || instance.complaint_no || instance.new_file_no || instance.management_corporation_name || instance.name_of_apartment || instance.subject || instance.file_name || instance.ref_no || instance.id || '';
        let desc = `${modelName}`;
        if (idStr) desc += ` — ${idStr}`;

        await models.SystemLog.create({
          user_name: user,
          action: `${action} ${modelName}`,
          details: desc,
          created_at: new Date()
        });
      } catch (err) {
        console.error(`Hook log error on ${action} ${modelName}:`, err.message);
      }
    };

    model.addHook('afterCreate', (instance, options) => logAction(instance, 'Added', options));
    model.addHook('afterUpdate', (instance, options) => logAction(instance, 'Updated', options));
    model.addHook('afterDestroy', (instance, options) => logAction(instance, 'Deleted', options));
  });

  return models;
};

module.exports = initializeModels;