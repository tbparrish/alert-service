var Note = model({
  name: 'Note',
  properties: {
    user: { type: Sequelize.STRING, allowNull: true },
    note: { type: Sequelize.TEXT, allowNull: true }
  }
});

module.exports = Note;
