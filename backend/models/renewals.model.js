module.exports = (sequelize, DataTypes) => {
  const Renewal = sequelize.define('Renewal', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    ref_no: { type: DataTypes.STRING, allowNull: false, unique: true },
    status: { type: DataTypes.STRING, defaultValue: 'pending_approval' },
    applicant_name: { type: DataTypes.TEXT },
    applicant_email: { type: DataTypes.TEXT },
    applicant_phone: { type: DataTypes.TEXT },
    applicant_nic: { type: DataTypes.TEXT },
    mc_id: { type: DataTypes.INTEGER },
    mc_type: { type: DataTypes.TEXT },
    mc_name: { type: DataTypes.TEXT },
    plan_no: { type: DataTypes.TEXT },
    years: { type: DataTypes.TEXT },
    amount: { type: DataTypes.REAL },
    reject_reason: { type: DataTypes.TEXT },
    approved_at: { type: DataTypes.DATE },
    action_by: { type: DataTypes.TEXT }
  }, {
    tableName: 'renewals',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
  });
  return Renewal;
};
