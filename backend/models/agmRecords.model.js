const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const AgmRecord = sequelize.define('AgmRecord', {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    mc_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    file_no: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    mc_name: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    agm_date: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    next_agm_date: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    agm_date_vise: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    document_path: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    document_name: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    uploaded_by: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
  }, {
    tableName: 'agm_records',
    timestamps: true,
  });

  return AgmRecord;
};
