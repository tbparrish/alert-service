var expect = require('expect.js'),
    describe = require('mocha').describe,
    it = require('mocha').it;

var MicroService = require('persephone-ms');
var ms = MicroService.forTest();

describe('Note Management', function(){
    before(function(done){
        ms.ready.then(done);
    });

    describe('Note', function () {
        it('should create', function(done){
            ms.command('NotificationCreateCommand', {"notificationType": "KSI Service Errors",  "status":"Open", "hostName": "Guardtime",
          "closedTime": Date.now(), "closedBy": "System Admin" })
              .then(function (notification) {
                ms.command('NoteCreateCommand', {"user": "Iron Man",  "closingNote": false, "content":"I want to be part of the Avengers", "notificationId": notification.id })
                .then(function(note){
                  expect(note).to.have.property('id');
                  expect(note).to.have.property('user', 'Iron Man');
                  expect(note).to.have.property('closingNote', false);
                  expect(note).to.have.property('content', 'I want to be part of the Avengers');
                  expect(note).to.have.property('notificationId', notification.id);
                  done();
                });
              })
              .catch(done);
        });

        it('should find notes', function(done){
            ms.command('NotificationCreateCommand', {"notificationType": "KSI Service Warnings",  "status":"Open", "hostName": "Guardtime"})
              .then(function(notification){
                  return ms.command('NoteCreateCommand', {"user": "Hulk",  "closingNote": false, "content":"I love the green color", "notificationId": notification.id }).then(function(){
                    return ms.command('NoteCreateCommand', {"user": "Batman",  "closingNote": false, "content":"Has everyone seen Robin", "notificationId": notification.id }).then(function(note){
                      return ms.command('NoteFindQuery', note);
                    });
                  });
              })
              .then(function (notes) {
                  expect(notes).to.have.length(2);
                  done();
              })
              .catch(done);
        });

        it('should delete a note', function(done){
            ms.command('NotificationDeleteCommand', {notificationType: "KSI Service Errors"})
              .then(function () {
                return ms.command('NotificationFindQuery').then(function(notifications){
                  return ms.command('NoteDeleteCommand', {id: notifications.notifications[0].notes[0].id, notificationId: notifications.notifications[0].id}).then(function(){
                    return ms.command('NoteFindQuery', notifications.notifications[0].notes[1]);
                  });
                });
              })
              .then(function (notes) {
                 expect(notes).to.have.length(1);
                 done();
              })
              .catch(done);
        });

        it('should update', function(done){
            ms.command('NotificationCreateCommand', {"notificationType": "KSI Service Errors",  "status":"Open", "hostName": "Guardtime",
            "closedTime": Date.now(), "closedBy": "System Admin" })
              .then(function (notification) {
                return ms.command('NoteCreateCommand', {"user": "Iron Man",  "closingNote": false, "content": "I want to be part of the Avengers", "notificationId": notification.id }).then(function(note){
                  note.user = "Superman";
                  return ms.command('NoteUpdateCommand', note);
                });
              })
              .then(function(note){
                  return ms.command('NoteGetQuery', note);
              })
              .then(function (note) {
                  expect(note).to.have.property('user', 'Superman');
                  done();
              })
              .catch(done);
        });

        it('should close a notification', function(done){
            ms.command('NotificationCreateCommand', {"notificationType": "KSI Service Errors",  "status":"Open", "hostName": "Guardtime"})
              .then(function (notification) {
                return ms.command('NoteCreateCommand', {"user": "Iron Man",  "closingNote": true, "content": "I want to be part of the Avengers", "notificationId": notification.id });
              })
              .then(function(notification){
                expect(notification).to.have.property('id');
                expect(notification).to.have.property('closedTime');
                expect(notification).to.have.property('notificationType', 'KSI Service Errors');
                expect(notification).to.have.property('status', 'Closed');
                expect(notification).to.have.property('hostName', 'Guardtime');
                expect(notification).to.have.property('closedTime');
                expect(notification).to.have.property('closedBy', 'Iron Man');
                done();
              })
              .catch(done);
        });
    });
});
