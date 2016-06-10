var INCLUDE = [{ all: true, nested: true }];

on("NotificationFindQuery", function(data){
    var limit = data.limit ? data.limit : Number.MAX_SAFE_INTEGER;
    var offset = data.offset ? data.offset : 0;
    delete data.limit;
    delete data.offset;

    return models.Notification.findAll({where: data})
      .then(function(notifications){
        return models.Notification.findAll({where: data, limit: limit, offset: offset, order: '"createdAt" DESC', include: INCLUDE})
      .then(function(notifications) {
        return {totalItems: notifications.length, notifications: notifications };
      });
    });
});
on("NotificationGetQuery", function(data){
    return models.Notification.findOne({where: data, include: INCLUDE});
});
on("NotificationCreateCommand", function(data){
    return models.Notification.create(data, {include: INCLUDE});
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
