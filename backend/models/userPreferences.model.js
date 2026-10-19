module.exports = (sequelize, DataTypes) => {
  const UserPreference = sequelize.define('UserPreference', {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    userId: { type: DataTypes.STRING, allowNull: false },
    prefKey: { type: DataTypes.STRING, allowNull: false },
    prefValue: { type: DataTypes.TEXT, allowNull: false }
  }, {
    tableName: 'user_preferences',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    indexes: [
      {
        unique: true,
        fields: ['userId', 'prefKey']
      }
    ]
  });
  return UserPreference;
};
