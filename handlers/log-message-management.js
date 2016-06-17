var INCLUDE = [{ all: true, nested: true }];

on("LogMessageFindQuery", function(data){
    return models.LogMessage.findAll({where: {notificationId: data.notificationId}, include: INCLUDE});
});
on("LogMessageCreateCommand", function(data){
  return models.LogMessage.create(data, {include: INCLUDE});
});
