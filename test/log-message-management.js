var expect = require('expect.js'),
    describe = require('mocha').describe,
    it = require('mocha').it;

var MicroService = require('persephone-ms');
var ms = MicroService.forTest();

describe('Log Message Management', function(){
    before(function(done){
        ms.ready.then(done);
    });

    describe('Log Message', function () {
        it('should create', function(done){
            ms.command('NotificationCreateCommand', {"notificationType": "KSI Service Errors",  "status":"Open", "hostName": "Guardtime"})
              .then(function (notification) {
                ms.command('LogMessageCreateCommand', {"message": "This should find a message", "notificationId": notification.id })
                .then(function(logMessage){
                  expect(logMessage).to.have.property('id');
                  expect(logMessage).to.have.property('message', 'This should find a message');
                  expect(logMessage).to.have.property('notificationId', notification.id);
                  done();
                });
              })
              .catch(done);
        });

        it('should find log message', function(done){
            ms.command('NotificationCreateCommand', {"notificationType": "KSI Service Warnings",  "status":"Open", "hostName": "Guardtime"})
              .then(function(notification){
                  return ms.command('LogMessageCreateCommand', {"message": "This should find a message", "notificationId": notification.id }).then(function(){
                    return ms.command('LogMessageCreateCommand', {"message": "This should find a message", "notificationId": notification.id }).then(function(logMessage){
                      return ms.command('LogMessageFindQuery', logMessage);
                    });
                  });
              })
              .then(function (logMessages) {
                  expect(logMessages).to.have.length(2);
                  done();
              })
              .catch(done);
        });
    });
});
