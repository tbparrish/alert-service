var INCLUDE = [{ all: true, nested: true }];

on("NoteFindQuery", function(data){
    return models.Note.findAll({where: {notificationId: data.notificationId}, include: INCLUDE});
});
on("NoteGetQuery", function(data){
    return models.Note.findOne({where: {id: data.id, notificationId: data.notificationId}});
});
on("NoteCreateCommand", function(data){
  return models.Note.create(data, {include: INCLUDE}).then(function(note){
    if(note.closingNote === true){
      return models.Notification.findOne({where: {id: data.notificationId}})
        .then(function(notification){
          return notification.update({status: "Closed", closedTime: Date.now(), closedBy: data.user}, {include: INCLUDE})
            .finally(function(resp) {
              models.Notification.findAll({where: { status: 'Open' }})
                .then(function(notifications){
                  var totalOpen = notifications.length;
                  event( 'CloseNotificationEvent', { totalOpen: totalOpen } );
                });
              })
        .then(function(notification){
          return command('NotificationGetQuery', {id: notification.id})
          .then(function(notification){
            return command('NotificationClosedCommand', notification);
          });
        });
      });
    } else {
      return note;
    }
  });
});
on("NoteDeleteCommand", function(data){
    return models.Note.findOne({where: {id: data.id, notificationId: data.notificationId}}).then(function(note){
        return note.destroy();
    });
});
on("NoteUpdateCommand", function(data){
    return models.Note.findOne({where: {id: data.id, notificationId: data.notificationId}}).then(function(note){
        return note.update(data, {include: INCLUDE});
    });
});
