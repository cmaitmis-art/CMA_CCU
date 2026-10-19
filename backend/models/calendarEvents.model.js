module.exports = (sequelize, DataTypes) => {
  const CalendarEvent = sequelize.define('CalendarEvent', {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    title: { type: DataTypes.STRING, allowNull: false },
    date: { type: DataTypes.STRING, allowNull: false },
    visibility: { type: DataTypes.STRING, defaultValue: 'Only Me' },
    authorId: { type: DataTypes.STRING, allowNull: false }
  }, {
    tableName: 'calendar_events',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
  });
  return CalendarEvent;
};
