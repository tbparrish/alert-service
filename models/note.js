var Note = model({
  name: 'Note',
  properties: {
    user: { type: Sequelize.BOOLEAN, allowNull: false },
    closingNote: { type: Sequelize.STRING, allowNull: false },
    content: { type: Sequelize.TEXT, allowNull: false }
  }
});

module.exports = Note;
