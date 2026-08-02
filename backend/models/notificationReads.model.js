/**
 * notificationReads.model.js
 *
 * Tracks which notifications each user has dismissed/read.
 * This replaces the localStorage approach so dismiss state is stored
 * globally in the database — works correctly across devices, browsers,
 * and multiple users on the same machine.
 *
 * Table: notification_reads
 *   id            — auto-increment primary key
 *   user_id       — the user who dismissed it (integer FK to users)
 *   notification_id — the notification that was dismissed (integer FK to notifications)
 *   dismissed_at  — timestamp of dismissal
 *
 * A composite unique constraint on (user_id, notification_id) ensures
 * each user can only dismiss each notification once.
 */
module.exports = (sequelize, DataTypes) => {
  const NotificationRead = sequelize.define(
    'NotificationRead',
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      user_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      notification_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      dismissed_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
      },
    },
    {
      tableName: 'notification_reads',
      timestamps: false,
      indexes: [
        {
          // Composite unique: one dismiss record per user per notification
          unique: true,
          fields: ['user_id', 'notification_id'],
        },
      ],
    }
  );

  return NotificationRead;
};
