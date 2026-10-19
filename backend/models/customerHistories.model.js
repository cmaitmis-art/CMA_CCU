module.exports = (sequelize, DataTypes) => {
  const CustomerHistory = sequelize.define('CustomerHistory', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    customer_no: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    mc_type: {
      type: DataTypes.STRING,
      allowNull: true,
      defaultValue: 'MC' // MC or MCOM
    },
    action_type: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    year: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    file_path: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    action_by: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
  }, {
    tableName: 'customer_histories',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
  });

  return CustomerHistory;
};
