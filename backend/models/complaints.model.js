module.exports = (sequelize, DataTypes) => {
  const Complaint = sequelize.define(
    'Complaint',
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      serial_no: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      letter_date: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      received_ccu: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      mc_no: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      apartment_name: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      complaint_name: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      issue_heading: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      file_marked: {
        type: DataTypes.BOOLEAN,
        allowNull: true,
        defaultValue: false,
      },
      tr_marked: {
        type: DataTypes.BOOLEAN,
        allowNull: true,
        defaultValue: false,
      },
      reply_marked: {
        type: DataTypes.BOOLEAN,
        allowNull: true,
        defaultValue: false,
      },
      remarks: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      category: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      document_path: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      document_name: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      status: {
        type: DataTypes.TEXT,
        allowNull: false,
        defaultValue: 'New',
      },
      created_by: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      modified_by: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      history: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
    },
    {
      tableName: 'complaints',
      timestamps: true,
      createdAt: 'created_at',
      updatedAt: 'updated_at',
    }
  );

  return Complaint;
};
