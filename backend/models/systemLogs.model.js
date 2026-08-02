const { DataTypes } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  const SystemLog = sequelize.define(
    'SystemLog',
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      user_name: {
        type: DataTypes.STRING,
        allowNull: true,
        defaultValue: 'System',
      },
      action: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      details: {
        type: DataTypes.TEXT,
        allowNull: false,
      },
      created_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
      },
    },
    {
      tableName: 'system_logs',
      timestamps: false,
    }
  );

  return SystemLog;
};
