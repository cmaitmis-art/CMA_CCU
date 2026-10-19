module.exports = (sequelize, DataTypes) => {
  const ChatMessage = sequelize.define('ChatMessage', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    sender_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    receiver_id: {
      type: DataTypes.INTEGER,
      allowNull: true, // Null means it's sent to/from the AI assistant
    },
    content: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    message_type: {
      type: DataTypes.STRING,
      defaultValue: 'direct', // 'direct' or 'ai'
    },
    metadata: {
      type: DataTypes.JSON, // E.g., { link: '/customer-history', title: 'CMA/CCU...' }
      allowNull: true,
    },
    deleted_by_sender: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    deleted_by_receiver: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    is_read: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
  }, {
    tableName: 'chat_messages',
    timestamps: true,
  });

  return ChatMessage;
};
