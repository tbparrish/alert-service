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
            ms.command('NotificationCreateCommand', {"type": "KSI Errors",  "status":"CLOSED", "hostName": "Guardtime", "closedTime": Date.now(), "closedBy": "System Admin" })
              .then(function (notification) {
                expect(notification).to.have.property('id');
                expect(notification).to.have.property('closedTime');
                expect(notification).to.have.property('type', 'KSI Errors');
                expect(notification).to.have.property('status', 'CLOSED');
                expect(notification).to.have.property('hostName', 'Guardtime');
                expect(notification).to.have.property('closedBy', 'System Admin');
                done();
              })
              .catch(done);
        });

        it('should find notification', function(done){
            ms.command('NotificationCreateCommand', {"type": "KSI Warnings",  "status":"CLOSED", "hostName": "Guardtime", "closedTime": Date.now(), "closedBy": "System Admin" })
              .then(function(){
                  return ms.command('NotificationFindQuery');
              })
              .then(function (notifications) {
                  expect(notifications).to.have.length(2);
                  done();
              })
              .catch(done);
        });

        it('should delete a notification', function(done){
            ms.command('NotificationDeleteCommand', {"type": "KSI Errors"})
              .then(function () {
                 return ms.command('NotificationFindQuery');
              })
              .then(function (notifications) {
                 expect(notifications).to.have.length(1);
                 done();
              })
              .catch(done);
        });

        it('should update', function(done){
            ms.command('NotificationCreateCommand', {"type": "KSI Errors",  "status":"CLOSED", "hostName": "Guardtime", "closedTime": Date.now(), "closedBy": "System Admin" })
              .then(function (notification) {
                  notification.type = "Realtime Log Stream Stopped";
                  return ms.command('NotificationUpdateCommand', notification);
              })
              .then(function(notification){
                  return ms.command('NotificationGetQuery', {id: notification.id});
              })
              .then(function (notification) {
                  expect(notification).to.have.property('type', 'Realtime Log Stream Stopped');
                  done();
              })
              .catch(done);
        });
    });
});
