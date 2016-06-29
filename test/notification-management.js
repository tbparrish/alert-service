var expect = require('expect.js'),
    describe = require('mocha').describe,
    it = require('mocha').it;

var MicroService = require('persephone-ms');
var ms = MicroService.forTest();

describe('Notification Management', function(){
    before(function(done){
        ms.ready.then(done);
    });

    describe('Notification', function () {
        it('should create', function(done){
            ms.command('NotificationCreateCommand', {"notificationType": "KSI Service Errors", "status":"Closed", "hostName": "Guardtime",
            "closedTime": Date.now(), "closedBy": "System Admin" })
              .then(function (notification) {
                expect(notification).to.have.property('id');
                expect(notification).to.have.property('closedTime');
                expect(notification).to.have.property('notificationType', 'KSI Service Errors');
                expect(notification).to.have.property('status', 'Closed');
                expect(notification).to.have.property('hostName', 'Guardtime');
                expect(notification).to.have.property('closedBy', 'System Admin');
                done();
              })
              .catch(done);
        });

        it('should find notification', function(done){
            ms.command('NotificationCreateCommand', {"notificationType": "KSI Service Warnings",  "status":"Closed", "hostName": "Guardtime",
             "closedTime": Date.now(), "closedBy": "System Admin" })
              .then(function(){
                  return ms.command('NotificationFindQuery');
              })
              .then(function (notifications) {
                  expect(notifications.notifications).to.have.length(2);
                  done();
              })
              .catch(done);
        });

        it('should delete a notification', function(done){
            ms.command('NotificationDeleteCommand', {"notificationType": "KSI Service Errors"})
              .then(function () {
                 return ms.command('NotificationFindQuery');
              })
              .then(function (notifications) {
                 expect(notifications.notifications).to.have.length(1);
                 done();
              })
              .catch(done);
        });

        it('should update', function(done){
            ms.command('NotificationCreateCommand', {"notificationType": "KSI Service Errors",  "status":"Closed", "hostName": "Guardtime",
            "closedTime": Date.now(), "closedBy": "System Admin" })
              .then(function (notification) {
                  notification.notificationType = "Aggregator All Parent Failure";
                  return ms.command('NotificationUpdateCommand', notification);
              })
              .then(function(notification){
                  return ms.command('NotificationGetQuery', {id: notification.id});
              })
              .then(function (notification) {
                  expect(notification).to.have.property('notificationType', 'Aggregator All Parent Failure');
                  done();
              })
              .catch(done);
        });
    });
});
