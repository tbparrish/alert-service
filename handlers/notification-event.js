var moment = require('moment'),
    setInterval = require('../helpers/timers').setInterval,
    HashMap = require('hashmap');

var _errorNotificationMap = new HashMap();
var _warningNotificationMap = new HashMap();
var _allParentFailureNotificationMap = new HashMap();

var NotificationEvent = function(){
  this.id = null;
  this.notificationMessage = null;
  this.state = 0; // 0 = pending, 1 = open, 2 = closed
  this.createdAt = moment();
  this.updatedAt = moment();
  this.creationCounter = 0;
  this.updateCounter = 0;
};

var NotificationEventHandler = function() {
  // task scheduled to monitor notification HashMaps every 10 seconds (testing)
  //setInterval(this.monitorHashMapTask, 10 * 1000);

  // task scheduled to send out emails every 10 seconds (testing)
  //setInterval(this.emailDailyTask, 13 * 1000);

  //-------------------------------------------------------------------
  // task scheduled to monitor notification HashMaps every 5 minutes
  //setInterval(this.monitorHashMapTask, 5 * 60 * 1000);

  // task scheduled to send out emails every 24 hours
  //setInterval(this.emailDailyTask, 24 * 60 * 60 * 1000);
};
NotificationEventHandler.getUserNotificationPreferences = function() {
  return command('UserFindQuery').then(function(users) {
    return users.map(function(user){
      return {
        name: user.name,
        email: user.email,
        notificationEmail: user.notificationEmail,
        useNotificationEmail: user.useNotificationEmail,
        notificationtypes: user.notificationtypes.map(function(notificationtype){
          return {
            name: notificationtype.name,
            once: notificationtype.usernotificationpreference.once,
            daily: notificationtype.usernotificationpreference.daily
          };
        })
      };
    });
  });
};
NotificationEventHandler.handleErrorState = function(logEvent) {
  if(_errorNotificationMap.has(logEvent.appliance_hostname)) {
    ne = _errorNotificationMap.get(logEvent.appliance_hostname);
    if(ne.state === 0) {
      log.debug("Got "+logEvent.message_type+" Event [host:"+logEvent.appliance_hostname+"]\n\tCondition:\t-Pending State\n\tChanging [host:"+logEvent.appliance_hostname+"] error state from pending to close\n");
      ne.state = 2;
      _errorNotificationMap.remove(logEvent.appliance_hostname);
    } else if(ne.state === 1) {
      command('NotificationUpdateCommand',
        {id: ne.id, state: 2, status: "Closed"}).then(function(notification){
          command('NoteCreateCommand', {"user": "Overwatch",  "closingNote": true,
          "content":"Received service message", "notificationId": notification.id }).then(function(){
            log.debug("Got "+logEvent.message_type+" Event [host:"+logEvent.appliance_hostname+"]\n\tCondition:\t-Open State\n\tChanging [host:"+logEvent.appliance_hostname+"] error state from open to close\n");
            // move to close state
            ne.state = 2;
            // remove from map
            _errorNotificationMap.remove(logEvent.appliance_hostname);
          });
      });
    }
  }

  if(_allParentFailureNotificationMap.has(logEvent.appliance_hostname)) {
    ne = _allParentFailureNotificationMap.get(logEvent.appliance_hostname);
    if(ne.state === 0) {
      log.debug("Got "+logEvent.message_type+" Event [host:"+logEvent.appliance_hostname+"]\n\tCondition:\t-Pending State\n\tChanging [host:"+logEvent.appliance_hostname+"] all parent failure state from pending to close\n");
      ne.state = 2;
      _allParentFailureNotificationMap.remove(logEvent.appliance_hostname);
    } else if(ne.state === 1) {
      command('NotificationUpdateCommand',
        {id: ne.id, state: 2, status: "Closed"}).then(function(notification){
          command('NoteCreateCommand', {"user": "Overwatch",  "closingNote": true,
          "content":"Received service message", "notificationId": notification.id }).then(function(){
            log.debug("Got "+logEvent.message_type+" Event [host:"+logEvent.appliance_hostname+"]\n\tCondition:\t-Open State\n\tChanging [host:"+logEvent.appliance_hostname+"] all parent failure state from open to close\n");
            // move to close state
            ne.state = 2;
            // remove from map
            _allParentFailureNotificationMap.remove(logEvent.appliance_hostname);
          });
      });
    }
  }
};
NotificationEventHandler.prototype.handleError = function(logEvent) {
  var ne = null;
  if(_errorNotificationMap.has(logEvent.appliance_hostname)) {
    ne = _errorNotificationMap.get(logEvent.appliance_hostname);
    log.debug("Got KSI Service Errors Event [host:"+logEvent.appliance_hostname+"]\n\tCondition:\t-Pending State \n\tChanging [host:"+logEvent.appliance_hostname+"] error state count from "+ne.creationCounter+" to "+(ne.creationCounter+1)+"\n");
    ne.creationCounter++;
    ne.updatedAt = moment();
  } else {
    ne = new NotificationEvent();
    ne.creationCounter++;
    ne.notificationMessage = logEvent.message;
    _errorNotificationMap.set(logEvent.appliance_hostname, ne);
    log.debug("Got KSI Service Errors Event [host:"+logEvent.appliance_hostname+"]\n\tCondition:\t-Initial State \n\tChanging [host:"+logEvent.appliance_hostname+"] error state from initial to pending state\n");
  }
};
NotificationEventHandler.prototype.handleWarning = function(logEvent) {
  var ne = null;
  if(_warningNotificationMap.has(logEvent.appliance_hostname)) {
    ne = _warningNotificationMap.get(logEvent.appliance_hostname);
    log.debug("Got KSI Service Warnings Event [host:"+logEvent.appliance_hostname+"]\n\tCondition:\t-Pending State \n\tChanging [host:"+logEvent.appliance_hostname+"] warning state count from "+ne.creationCounter+" to "+(ne.creationCounter+1)+"\n");
    ne.creationCounter++;
    ne.updatedAt = moment();
  } else {
    ne = new NotificationEvent();
    ne.creationCounter++;
    ne.notificationMessage = logEvent.message;
    _warningNotificationMap.set(logEvent.appliance_hostname, ne);
    log.debug("Got KSI Service Warnings Event [host:"+logEvent.appliance_hostname+"]\n\tCondition:\t-Initial State \n\tChanging [host:"+logEvent.appliance_hostname+"] warning state from initial to pending state\n");
  }
};
NotificationEventHandler.prototype.handleAllParentFailure = function(logEvent) {
  var ne = null;
  if(_allParentFailureNotificationMap.has(logEvent.appliance_hostname)) {
    ne = _allParentFailureNotificationMap.get(logEvent.appliance_hostname);
    log.debug("Got All Parent Event [host:"+logEvent.appliance_hostname+"]\n\tCondition:\t-Pending State \n\tChanging [host:"+logEvent.appliance_hostname+"] all parent failure state count from "+ne.creationCounter+" to "+(ne.creationCounter+1)+"\n");
    ne.creationCounter++;
    ne.updatedAt = moment();
  } else {
    ne = new NotificationEvent();
    ne.creationCounter++;
    ne.notificationMessage = logEvent.message;
    _allParentFailureNotificationMap.set(logEvent.appliance_hostname, ne);
    log.debug("Got All Parent Failure Event [host:"+logEvent.appliance_hostname+"]\n\tCondition:\t-Initial State \n\tChanging [host:"+logEvent.appliance_hostname+"] all parent failure state from initial to pending state\n");
  }

  NotificationEventHandler.handleErrorState(logEvent);
};
NotificationEventHandler.prototype.handleRoundResponseFromParent = function(logEvent) {
  NotificationEventHandler.handleErrorState(logEvent);
};
NotificationEventHandler.prototype.emailDailyTask = function(){
  return NotificationEventHandler.getUserNotificationPreferences().then(function(userNotificationPreferences){
    return userNotificationPreferences.map(function(userNotificationPreference){
      return {
         name:  userNotificationPreference.name,
         email: userNotificationPreference.useNotificationEmail ?
                userNotificationPreference.notificationEmail : userNotificationPreference.email,
         notificationSummary: userNotificationPreference.notificationtypes.map(function(notificationtype) {
           var notification = [];
           if((notificationtype.name === "KSI Service Errors") && (notificationtype.daily === false)) {
             _errorNotificationMap.forEach(function(value, key) {
               if(value.state === 1){
                 notification.push({hostname: key, message: value.notificationMessage});
               }
             });
             return { name: notificationtype.name, notification: notification };
           }
           else if((notificationtype.name === "KSI Service Warnings") && (notificationtype.daily === false)) {
             _warningNotificationMap.forEach(function(value, key) {
               if(value.state === 1){
                 notification.push({hostname: key, message: value.notificationMessage});
               }
             });
             return { name: notificationtype.name, notification: notification };
           }
           else if((notificationtype.name === "Aggregator All Parent Failure") && (notificationtype.daily === false)){
             _allParentFailureNotificationMap.forEach(function(value, key) {
               if(value.state === 1){
                 notification.push({hostname: key, message: value.notificationMessage});
               }
             });
             return { name: notificationtype.name, notification: notification };
           }
         })};
    });
  }).then(function(emailNotifications){
    return emailNotifications.map(function(emailNotification) {
      return {
        name: emailNotification.name,
        email: emailNotification.email,
        notificationSummary: emailNotification.notificationSummary.filter(function(n){
          return n.notification.length > 0;
        })};
    });
  }).then(function(emailNotifications){
    return emailNotifications.map(function(emailNotification){
      if( emailNotification.notificationSummary.length > 0 ){
        // TODO: Need to format email
        log.debug("Sending email to " + emailNotification.email);
        return event("EmailNotification",{
          "to": emailNotification.email,
          "subject": "Overwatch Daily Notification Summary",
          "body": JSON.stringify(emailNotification.notificationSummary, null, 2)
        });
      }
    });
  });
};
NotificationEventHandler.prototype.monitorHashMapTask = function(){
  var startTime = null;
  var endTime = null;
  var mins = null;

  // _errorNotificationMap
  _errorNotificationMap.forEach(function(value, key) {
    endTime = moment(moment().toArray());
    if( (value.state === 0) ) {
      startTime = moment(moment(value.createdAt).toArray());
      mins = endTime.diff(startTime, 'seconds');
      if( (mins > 10) ) {
        log.debug("Got KSI Service Errors Event [host:"+key+"]\n\tCondition:\t-Pending State\n\t\t\t-Has been in pending state for more than 10 minutes  \n\tChanging [host:"+key+"] error state from pending to open state\n");
        // move notification from pending state to open state.
        // condition: state = 0 and it was created more than 10 mins ago.
        command('NotificationCreateCommand',
          {"type": "KSI Service Errors",  "status":"Open", "hostName": key,
          "message": value.notificationMessage}).then(function(notification){
            value.id = notification.id; // notification primary key
            value.creationCounter = 0;  // reset counter
            value.state = 1;            // move to open state
          });
      }
    }
  });

  // _warningNotificationMap
  _warningNotificationMap.forEach(function(value, key) {
    endTime = moment(moment().toArray());
    if( (value.state === 0) && (value.creationCounter > 5) ) {
      startTime = moment(moment(value.createdAt).toArray());
      mins = endTime.diff(startTime, 'seconds');
      if( (mins > 10) ) {
        log.debug("Got KSI Service Warnings Event [host:"+key+"]\n\tCondition:\t-Pending State\n\t\t\t-Has been in pending state for more than 10 minutes \n\t\t\t-Has occurred over 5 times \n\tChanging [host:"+key+"] warning state from pending to open state\n");
        // move notification from pending state to open state.
        // condition: state = 0, counter > 5, and it was created more than 10 ago.
        command('NotificationCreateCommand',
          {"type": "KSI Service Warnings",  "status":"Open", "hostName": key,
          "message": value.notificationMessage}).then(function(notification){
            value.id = notification.id; // notification primary key
            value.creationCounter = 0;  // reset counter
            value.state = 1;            // move to open state
          });
      }
    } else if( (value.state === 1) ) {
      startTime = moment(moment(value.updatedAt).toArray());
      mins = endTime.diff(startTime, 'seconds');
      if( (mins > 30) ) {
        log.debug("Got KSI Service Warnings Event [host:"+key+"]\n\tCondition:\t-Open State\n\t\t\t-Has not occurred in the last 30 minutes \n\tChanging [host:"+key+"] warning state from open to close state\n");
        // move notification from open state to close state.
        // condition: state = 1, and this warning has not been seen over the last 30 mins
        command('NotificationUpdateCommand',
          {id: value.id, state: 2, status: "Closed"}).then(function(notification){
            command('NoteCreateCommand', {"user": "Overwatch",  "closingNote": true,
            "content":"No longer happening", "notificationId": notification.id }).then(function(){
              value.state = 2; // move to close state
              // remove from map
              _warningNotificationMap.remove(key);
            });
        });
      }
    }
  });

  // _allParentFailureNotificationMap
  _allParentFailureNotificationMap.forEach(function(value, key) {
    endTime = moment(moment().toArray());
    if( (value.state === 0) ) {
      startTime = moment(moment(value.createdAt).toArray());
      mins = endTime.diff(startTime, 'seconds');
      if( (mins > 10) ) {
        log.debug("Got All Parent Failure Event [host:"+key+"]\n\tCondition:\t-Pending State\n\t\t\t-Has been in pending state for more than 10 minutes  \n\tChanging [host:"+key+"] all parent failure state from pending to open state\n");
        // move notification from pending state to open state.
        // condition: state = 0 and it was created more than 10 mins ago.
        command('NotificationCreateCommand',
          {"type": "All Parent Failure",  "status":"Open", "hostName": key,
          "message": value.notificationMessage}).then(function(notification){
            value.id = notification.id; // notification primary key
            value.creationCounter = 0;  // reset counter
            value.state = 1;            // move to open state
        });
      }
    }
  });
};

var notificationEventHandler = new NotificationEventHandler();

// on("ParsedLogEvent", function(logEvent){
//   switch (logEvent.message_type) {
//     case "ALL_PARENT_FAILURE":
//       notificationEventHandler.handleAllParentFailure(logEvent);
//       break;
//     case "ROUND_RESPONSE_FROM_PARENT":
//       notificationEventHandler.handleRoundResponseFromParent(logEvent);
//       break;
//   }
//
//   switch (logEvent.syslog_severity) {
//     case "emergency":
//     case "alert":
//     case "critical":
//     case "error":
//       notificationEventHandler.handleError(logEvent);
//       break;
//     case "warning":
//       notificationEventHandler.handleWarning(logEvent);
//       break;
//   }
// });
