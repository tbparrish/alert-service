var LogMessage = model({
  name: 'LogMessage',
  properties: {
    message: { type: Sequelize.TEXT, allowNull: false }
  }
});

module.exports = LogMessage;
