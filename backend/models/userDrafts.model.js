module.exports = (sequelize, DataTypes) => {
  const UserDraft = sequelize.define('UserDraft', {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    userId: { type: DataTypes.STRING, allowNull: false },
    draftKey: { type: DataTypes.STRING, allowNull: false },
    draftData: { type: DataTypes.TEXT('long'), allowNull: false }
  }, {
    tableName: 'user_drafts',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    indexes: [
      {
        unique: true,
        fields: ['userId', 'draftKey']
      }
    ]
  });
  return UserDraft;
};
