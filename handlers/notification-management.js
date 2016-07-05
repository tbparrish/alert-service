var INCLUDE = [{ all: true, nested: true }];

on("NotificationFindQuery", function(data){
  var limit;
  var offset;
  var length;
  var order = [];

  if(data) {
    limit = data.limit ? data.limit : Number.MAX_SAFE_INTEGER;
    offset =  data.offset ? data.offset : 0;
    delete data.limit;
    delete data.offset;

    if(data.orderField && data.orderSort){
      if(data.orderField === "hostName") {
        order.push(['hostName', data.orderSort]);
        order.push(['createdAt', 'DESC']);
      } else if(data.orderField === "createdAt") {
        order.push(['createdAt', data.orderSort]);
      } else if(data.orderField === "status") {
        // if order to get this to work properly the sort order must be reversed.
        if(data.orderSort === 'ASC') {
          order.push(['status', 'DESC']);
        } else {
          order.push(['status', 'ASC']);
        }
        order.push(['createdAt', 'DESC']);
      } else {
        order.push([data.orderField, data.orderSort]);
        order.push(['createdAt', 'DESC']);
      }
      delete data.orderField;
      delete data.orderSort;
    } else {
      order.push(['status', 'ASC']);
      order.push(['createdAt', 'DESC']);
    }
  } else {
    limit = 100;
    offset = 0;
  }

  return models.Notification.findAll({where: data})
    .then(function(notifications){
      length = notifications.length;
      return models.Notification.findAll({where: data, limit: limit, offset: offset, order: order, include: INCLUDE})
      .then(function(notifications) {
        return {totalRecords: length, notifications: notifications };
      });
  });
});
on("NotificationGetQuery", function(data){
    return models.Notification.findOne({where: data, include: INCLUDE});
});
on("NotificationCreateCommand", function(data){
    return models.Notification.create(data, {include: INCLUDE})
        .finally(function(resp) {
            models.Notification.findAll({where: { status: 'Open' }})
                .then(function(notifications){
                    var totalOpen = notifications.length;
                    event( 'OpenNotificationEvent', { totalOpen: totalOpen } );
                });
        });
});
on("NotificationDeleteCommand", function(data){
    return models.Notification.findOne({where: data}).then(function(notification){
        return notification.destroy();
    });
});
on("NotificationUpdateCommand", function(data){
    return models.Notification.findOne({where: {id: data.id}}).then(function(notification){
        return notification.update(data, {include: INCLUDE});
    });
});
