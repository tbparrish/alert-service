var Notification = model({
  name: 'Notification',
  properties: {
    type: { type: Sequelize.ENUM,
            values: ['KSI Service Errors', 'KSI Service Warnings', 'Aggregator All Parent Failure'],
            allowNull: false,
            validate:  {isIn: [['KSI Service Errors', 'KSI Service Warnings', 'Aggregator All Parent Failure']]}
    },
    status: { type: Sequelize.ENUM,
            values: ['Open', 'Closed'],
            allowNull: false,
            validate:  {isIn: [['Open', 'Closed']]}
    },
    hostName: { type: Sequelize.STRING, allowNull: false },
    closedTime: { type: Sequelize.DATE, allowNull: true },
    closedBy: { type: Sequelize.STRING, allowNull: true }
  }
});

var Note = require('./note');
var LogMessage = require('./logMessage');

Notification.hasMany(Note, { onDelete: "CASCADE" });
Note.belongsTo(Notification, { onDelete: "CASCADE" });

Notification.hasMany(LogMessage, { onDelete: "CASCADE" });
LogMessage.belongsTo(Notification, { onDelete: "CASCADE" });

module.exports = Notification;
