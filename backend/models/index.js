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
  };

  models.Complaint.belongsTo(models.ManagementCorporation, { foreignKey: 'mc_id' });
  models.AgmRecord.belongsTo(models.ManagementCorporation, { foreignKey: 'mc_id' });
  models.ManagementCorporation.hasOne(models.AgmRecord, { foreignKey: 'mc_id' });

  models.RegistrationPayableInvoice.belongsTo(models.ManagementCorporation, { foreignKey: 'mc_id' });
  models.ManagementCorporation.hasMany(models.RegistrationPayableInvoice, { foreignKey: 'mc_id' });

  // NotificationRead: each row links a user to a dismissed notification
  models.NotificationRead.belongsTo(models.User, { foreignKey: 'user_id' });
  models.NotificationRead.belongsTo(models.Notification, { foreignKey: 'notification_id' });

  return models;
};

module.exports = initializeModels;