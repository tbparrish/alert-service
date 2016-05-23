var INCLUDE = [{ all: true, nested: true }];

on("NoteFindQuery", function(data){
    return models.Note.findAll({where: {notificationId: data.notificationId}, include: INCLUDE});
});
on("NoteGetQuery", function(data){
    return models.Note.findOne({where: {id: data.id, notificationId: data.notificationId}});
});
on("NoteCreateCommand", function(data){
  return models.Note.create(data, {include: INCLUDE});
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
