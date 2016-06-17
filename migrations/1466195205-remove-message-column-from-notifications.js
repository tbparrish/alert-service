var tableMissing = function(err) {
    if (err instanceof Error)
        throw err;
    return err.match(/No description found for "notifications"/);
};
module.exports = {
    up: function(queryInterface, Sequelize) {
      return queryInterface.describeTable("notifications").then(function(description) {
        if( description.message ){
          queryInterface.removeColumn('notifications', 'message');
        }
      }).catch(tableMissing);
    },
    down: function(queryInterface, Sequelize) {
      return queryInterface.describeTable("notifications").then(function(description) {
        if( !description.message ){
          queryInterface.addColumn('notifications', 'message', { type: Sequelize.TEXT, allowNull: false});
        }
      }).catch(tableMissing);
    }
};
