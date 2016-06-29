var tableMissing = function(err) {
    if (err instanceof Error)
        throw err;
    return err.match(/No description found for "notifications"/);
};
module.exports = {
    up: function(queryInterface, Sequelize) {
      return queryInterface.describeTable("notifications").then(function(description) {
        if( description.type ){
          queryInterface.removeColumn('notifications', 'message');
        }
        if( !description.notificationType ){
          queryInterface.addColumn('notifications', 'notificationType', { type: Sequelize.ENUM,
                  values: ['KSI Service Errors', 'KSI Service Warnings', 'Aggregator All Parent Failure'],
                  allowNull: false,
                  validate:  {isIn: [['KSI Service Errors', 'KSI Service Warnings', 'Aggregator All Parent Failure']]}
          });
        }
      }).catch(tableMissing);
    },
    down: function(queryInterface, Sequelize) {
      return queryInterface.describeTable("notifications").then(function(description) {
        if( !description.type ){
          queryInterface.addColumn('notifications', 'type', { type: Sequelize.ENUM,
                  values: ['KSI Service Errors', 'KSI Service Warnings', 'Aggregator All Parent Failure'],
                  allowNull: false,
                  validate:  {isIn: [['KSI Service Errors', 'KSI Service Warnings', 'Aggregator All Parent Failure']]}
          });
        }
        if( description.notificationType ){
          queryInterface.removeColumn('notifications', 'notificationType');
        }
      }).catch(tableMissing);
    }
};
