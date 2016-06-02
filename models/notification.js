var Notification = model({
  name: 'Notification',
  properties: {
    type: { type: Sequelize.STRING, allowNull: false },
    status: { type: Sequelize.ENUM,
            values: ['Open', 'Closed'],
            allowNull: false,
            validate:  {isIn: [['Open', 'Closed']]}
    },
    hostName: { type: Sequelize.STRING, allowNull: false },
    message: { type: Sequelize.TEXT, allowNull: false },
    closedTime: { type: Sequelize.DATE, allowNull: true },
    closedBy: { type: Sequelize.STRING, allowNull: true }
  }
});

var Note = require('./note');

Notification.hasMany(Note, { onDelete: "CASCADE" });
Note.belongsTo(Notification, { onDelete: "CASCADE" });

module.exports = Notification;
