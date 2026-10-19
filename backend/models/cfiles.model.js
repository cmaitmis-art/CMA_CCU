module.exports = (sequelize, DataTypes) => {
  const Cfile = sequelize.define(
    'Cfile',
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      file_no: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
      },
      name_of_apartment: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      address: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      date: {
        type: DataTypes.DATEONLY,
        allowNull: true,
      },
      reason: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      complainer_details: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      registered_ccu_file_no: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      remarks: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      category: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      title: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      file_type: {
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
        type: DataTypes.STRING,
        allowNull: true,
        defaultValue: 'New',
      },
      assigned_department: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      closed_by: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      closed_department: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      closed_reason: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      closed_document_path: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      closed_document_name: {
        type: DataTypes.TEXT,
        allowNull: true,
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
      tableName: 'cfiles',
      timestamps: true,
      createdAt: 'created_at',
      updatedAt: 'updated_at',
    }
  );

  return Cfile;
};