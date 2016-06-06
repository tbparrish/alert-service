var Note = model({
  name: 'Note',
  properties: {
    user: { type: Sequelize.STRING, allowNull: false },
    closingNote: { type: Sequelize.BOOLEAN, allowNull: false },
    content: { type: Sequelize.TEXT, allowNull: false }
  }
});

module.exports = Note;
