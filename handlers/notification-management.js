var INCLUDE = [{ all: true, nested: true }];

on("NotificationFindQuery", function(data){
    return models.Notification.findAll({where: data, include: INCLUDE});
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
