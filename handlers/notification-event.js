var moment = require('moment'),
    setInterval = require('../helpers/timers').setInterval,
    HashMap = require('hashmap');

// hashmap objects to store log event for keep track
// of notification states.
var _errorNotificationMap = new HashMap();
var _warningNotificationMap = new HashMap();
var _allParentFailureNotificationMap = new HashMap();

// email subjects
var DAILY_EMAIL_SUBJECT = "Overwatch Daily Notification Summary";
var ONCE_EMAIL_SUBJECT  = "Overwatch Once Notification Summary";

// default value to stage notification in pending state before
// moving to open state.
var notificationStagingDuration = 10;

// object stored in hashmap
var NotificationEvent = function(){
  this.id = null;
  this.notificationMessage = null;
  this.state = 0; // 0 = pending, 1 = open, 2 = closed
  this.createdAt = moment();
  this.updatedAt = moment();
  this.creationCounter = 0;
  this.updateCounter = 0;
  this.movedToOpenState = false;
};

var NotificationEventHandler = function() {
  // sync internal cache with db
  NotificationEventHandler.syncCacheWithDB();

  // set notificationStagingDuration to configurable value
  if( config.notificationStagingDuration && (!isNaN(config.notificationStagingDuration))) {
    notificationStagingDuration = config.notificationStagingDuration;
  }
  log.debug("Notification Staging Duration was set to " + notificationStagingDuration);

  // task scheduled to monitor notification HashMaps every 5 minutes
  setInterval(this.monitorHashMapTask, 5 * 60 * 1000);

  // task scheduled to send out emails every 24 hours
  setInterval(this.emailDailyTask, 24 * 60 * 60 * 1000);
};
NotificationEventHandler.prototype.handleError = function(logEvent) {
  var ne = null;
  if(_errorNotificationMap.has(logEvent.appliance_hostname)) {
    ne = _errorNotificationMap.get(logEvent.appliance_hostname);
    if( ne.state === 0 ) {
      log.debug("Got KSI Service Errors Event [host:"+logEvent.appliance_hostname+"]\n\tCondition:\t-Pending State \n\tChanging [host:"+logEvent.appliance_hostname+"] error state count from "+ne.creationCounter+" to "+(ne.creationCounter+1)+"\n");
    } else if( ne.state === 1 ) {
      log.debug("Got KSI Service Errors Event [host:"+logEvent.appliance_hostname+"]\n\tCondition:\t-Open State \n\tChanging [host:"+logEvent.appliance_hostname+"] error state count from "+ne.creationCounter+" to "+(ne.creationCounter+1)+"\n");
      ne.notificationMessage = logEvent.message;
      command('NotificationUpdateCommand', {id: ne.id, message: logEvent.message});
    }
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
    if( ne.state === 0 ) {
      log.debug("Got KSI Service Warnings Event [host:"+logEvent.appliance_hostname+"]\n\tCondition:\t-Pending State \n\tChanging [host:"+logEvent.appliance_hostname+"] warning state count from "+ne.creationCounter+" to "+(ne.creationCounter+1)+"\n");
    } else if( ne.state === 1 ) {
      log.debug("Got KSI Service Warnings Event [host:"+logEvent.appliance_hostname+"]\n\tCondition:\t-Open State \n\tChanging [host:"+logEvent.appliance_hostname+"] warning state count from "+ne.creationCounter+" to "+(ne.creationCounter+1)+"\n");
      ne.notificationMessage = logEvent.message;
      command('NotificationUpdateCommand', {id: ne.id, message: logEvent.message});
    }
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
  if(_errorNotificationMap.has(logEvent.appliance_hostname)) {
    NotificationEventHandler.handleErrorState(logEvent);
  } else {
    if(_allParentFailureNotificationMap.has(logEvent.appliance_hostname)) {
      ne = _allParentFailureNotificationMap.get(logEvent.appliance_hostname);
      if( ne.state === 0 ) {
        log.debug("Got All Parent Event [host:"+logEvent.appliance_hostname+"]\n\tCondition:\t-Pending State \n\tChanging [host:"+logEvent.appliance_hostname+"] all parent failure state count from "+ne.creationCounter+" to "+(ne.creationCounter+1)+"\n");
      } else if( ne.state === 1 ) {
        log.debug("Got All Parent Event [host:"+logEvent.appliance_hostname+"]\n\tCondition:\t-Open State \n\tChanging [host:"+logEvent.appliance_hostname+"] all parent failure state count from "+ne.creationCounter+" to "+(ne.creationCounter+1)+"\n");
        ne.notificationMessage = logEvent.message;
        command('NotificationUpdateCommand', {id: ne.id, message: logEvent.message});
      }
      ne.creationCounter++;
      ne.updatedAt = moment();
    } else {
      ne = new NotificationEvent();
      ne.creationCounter++;
      ne.notificationMessage = logEvent.message;
      _allParentFailureNotificationMap.set(logEvent.appliance_hostname, ne);
      log.debug("Got All Parent Failure Event [host:"+logEvent.appliance_hostname+"]\n\tCondition:\t-Initial State \n\tChanging [host:"+logEvent.appliance_hostname+"] all parent failure state from initial to pending state\n");
    }
  }
};
NotificationEventHandler.prototype.handleRoundResponseFromParent = function(logEvent) {
  NotificationEventHandler.handleErrorState(logEvent);
};
NotificationEventHandler.prototype.emailDailyTask = function() {
  NotificationEventHandler.sendEmail(DAILY_EMAIL_SUBJECT);
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
      mins = endTime.diff(startTime, 'minutes');
      if( (mins > notificationStagingDuration) ) {
        log.debug("Got KSI Service Errors Event [host:"+key+"]\n\tCondition:\t-Pending State\n\t\t\t-Has been in pending state for more than 10 minutes  \n\tChanging [host:"+key+"] error state from pending to open state\n");
        // move notification from pending state to open state.
        // condition: state = 0 and it was created more than 10 mins ago.
        command('NotificationCreateCommand',{"type": "KSI Service Errors",  "status":"Open", "hostName": key, "message": value.notificationMessage}).then(function(notification){
            value.id = notification.id;
          });
          value.creationCounter = 0;
          value.state = 1;
          value.movedToOpenState = true;
      }
    }
  });

  // _warningNotificationMap
  _warningNotificationMap.forEach(function(value, key) {
    endTime = moment(moment().toArray());
    if( (value.state === 0) && (value.creationCounter > 5) ) {
      startTime = moment(moment(value.createdAt).toArray());
      mins = endTime.diff(startTime, 'minutes');
      if( (mins > notificationStagingDuration) ) {
        log.debug("Got KSI Service Warnings Event [host:"+key+"]\n\tCondition:\t-Pending State\n\t\t\t-Has been in pending state for more than 10 minutes \n\t\t\t-Has occurred over 5 times \n\tChanging [host:"+key+"] warning state from pending to open state\n");
        // move notification from pending state to open state.
        // condition: state = 0, counter > 5, and it was created more than 10 ago.
        command('NotificationCreateCommand',{"type": "KSI Service Warnings",  "status":"Open", "hostName": key,"message": value.notificationMessage}).then(function(notification){
            value.id = notification.id;
          });
          value.creationCounter = 0;
          value.state = 1;
          value.movedToOpenState = true;
      }
    } else if( (value.state === 1) ) {
      startTime = moment(moment(value.updatedAt).toArray());
      mins = endTime.diff(startTime, 'minutes');
      if( (mins > 30) ) {
        log.debug("Got KSI Service Warnings Event [host:"+key+"]\n\tCondition:\t-Open State\n\t\t\t-Has not occurred in the last 30 minutes \n\tChanging [host:"+key+"] warning state from open to close state\n");
        // move notification from open state to close state.
        // condition: state = 1, and this warning has not been seen over the last 30 mins
        command('NotificationUpdateCommand', {id: value.id, status: "Closed"}).then(function(notification) {
            command('NoteCreateCommand', {"user": "Overwatch",  "closingNote": true,"content":"No longer happening", "notificationId": notification.id });
        });
        value.state = 2;
        _warningNotificationMap.remove(key);
      }
    }
  });

  // _allParentFailureNotificationMap
  _allParentFailureNotificationMap.forEach(function(value, key) {
    endTime = moment(moment().toArray());
    if( (value.state === 0) ) {
      startTime = moment(moment(value.createdAt).toArray());
      mins = endTime.diff(startTime, 'minutes');
      if( (mins > notificationStagingDuration) ) {
        log.debug("Got All Parent Failure Event [host:"+key+"]\n\tCondition:\t-Pending State\n\t\t\t-Has been in pending state for more than 10 minutes  \n\tChanging [host:"+key+"] all parent failure state from pending to open state\n");
        // move notification from pending state to open state.
        // condition: state = 0 and it was created more than 10 mins ago.
        command('NotificationCreateCommand',{"type": "Aggregator All Parent Failure",  "status":"Open", "hostName": key,"message": value.notificationMessage}).then(function(notification){
            value.id = notification.id;
        });
        value.creationCounter = 0;
        value.state = 1;
        value.movedToOpenState = true;
      }
    }
  });

  // send mail for all of the notifications that just moved from pending to opened state.
  NotificationEventHandler.sendEmail(ONCE_EMAIL_SUBJECT);
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
      log.debug("Got "+logEvent.message_type+" Event [host:"+logEvent.appliance_hostname+"]\n\tCondition:\t-Open State\n\tChanging [host:"+logEvent.appliance_hostname+"] error state from open to close\n");
      command('NotificationUpdateCommand',{id: ne.id, status: "Closed"}).then(function(notification){
          command('NoteCreateCommand', {"user": "Overwatch",  "closingNote": true,"content":"Received service message", "notificationId": notification.id });
      });
      ne.state = 2;
      _errorNotificationMap.remove(logEvent.appliance_hostname);
    }
  }

  if(_allParentFailureNotificationMap.has(logEvent.appliance_hostname)) {
    ne = _allParentFailureNotificationMap.get(logEvent.appliance_hostname);
    if(ne.state === 0) {
      log.debug("Got "+logEvent.message_type+" Event [host:"+logEvent.appliance_hostname+"]\n\tCondition:\t-Pending State\n\tChanging [host:"+logEvent.appliance_hostname+"] all parent failure state from pending to close\n");
      ne.state = 2;
      _allParentFailureNotificationMap.remove(logEvent.appliance_hostname);
    } else if(ne.state === 1) {
      log.debug("Got "+logEvent.message_type+" Event [host:"+logEvent.appliance_hostname+"]\n\tCondition:\t-Open State\n\tChanging [host:"+logEvent.appliance_hostname+"] all parent failure state from open to close\n");
      command('NotificationUpdateCommand',{id: ne.id, status: "Closed"}).then(function(notification){
          command('NoteCreateCommand', {"user": "Overwatch",  "closingNote": true,"content":"Received service message", "notificationId": notification.id });
      });
      ne.state = 2;
      _allParentFailureNotificationMap.remove(logEvent.appliance_hostname);
    }
  }
};
NotificationEventHandler.sendEmail = function(emailSubject) {
  return NotificationEventHandler.getUserNotificationPreferences().then(function(userNotificationPreferences){
    return userNotificationPreferences.map(function(userNotificationPreference){
      return {
         name:  userNotificationPreference.name,
         email: userNotificationPreference.useNotificationEmail ?
                userNotificationPreference.notificationEmail : userNotificationPreference.email,
         notificationSummary: userNotificationPreference.notificationtypes.map(function(notificationtype) {
         if( emailSubject === ONCE_EMAIL_SUBJECT ) {
           return NotificationEventHandler.buildOnceEmailSummary(notificationtype);
         } else if( emailSubject === DAILY_EMAIL_SUBJECT ) {
           return NotificationEventHandler.buildDailyEmailSummary(notificationtype);
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
        return event("EmailNotification",{
          "type": "NOTIFICATION_EMAIL",
          "to": emailNotification.email,
          "subject": emailSubject,
          "body": emailNotification.notificationSummary
        });
      }
    });
  });
};
NotificationEventHandler.buildOnceEmailSummary = function(notificationtype){
  var notification = [];
  if(notificationtype.name === "KSI Service Errors") {
    if(notificationtype.once === true) {
      _errorNotificationMap.forEach(function(value, key) {
        if( (value.movedToOpenState === true) && (value.state === 1) ) {
          notification.push({hostname: key, message: value.notificationMessage, count: value.creationCounter});
          value.movedToOpenState = false;
        }
      });
    }
    return { name: notificationtype.name, notification: notification };
  } else if(notificationtype.name === "KSI Service Warnings") {
    if(notificationtype.once === true) {
      _warningNotificationMap.forEach(function(value, key) {
        if( (value.movedToOpenState === true) && (value.state === 1) ) {
          notification.push({hostname: key, message: value.notificationMessage, count: value.creationCounter});
          value.movedToOpenState = false;
        }
      });
    }
    return { name: notificationtype.name, notification: notification };
  } else if(notificationtype.name === "Aggregator All Parent Failure") {
    if(notificationtype.once === true) {
      _allParentFailureNotificationMap.forEach(function(value, key) {
        if( (value.movedToOpenState === true) && (value.state === 1) ) {
          notification.push({hostname: key, message: value.notificationMessage, count: value.creationCounter});
          value.movedToOpenState = false;
        }
      });
    }
    return { name: notificationtype.name, notification: notification };
  }
};
NotificationEventHandler.buildDailyEmailSummary = function(notificationtype){
  var notification = [];
  if(notificationtype.name === "KSI Service Errors") {
    if(notificationtype.daily === true) {
      _errorNotificationMap.forEach(function(value, key) {
        if( value.state === 1 ) {
          notification.push({hostname: key, message: value.notificationMessage, count: value.creationCounter});
        }
      });
    }
    return { name: notificationtype.name, notification: notification };
  } else if(notificationtype.name === "KSI Service Warnings") {
    if(notificationtype.daily === true) {
      _warningNotificationMap.forEach(function(value, key) {
        if( value.state === 1 ) {
          notification.push({hostname: key, message: value.notificationMessage, count: value.creationCounter});
        }
      });
    }
    return { name: notificationtype.name, notification: notification };
  } else if(notificationtype.name === "Aggregator All Parent Failure") {
    if(notificationtype.daily === true) {
      _allParentFailureNotificationMap.forEach(function(value, key) {
        if( value.state === 1 ) {
          notification.push({hostname: key, message: value.notificationMessage, count: value.creationCounter});
        }
      });
    }
    return { name: notificationtype.name, notification: notification };
  }
};
NotificationEventHandler.syncCacheWithDB = function() {
  // add all open notifications to cache at start up
  return command('NotificationFindQuery',{status: "Open", offset: 0, limit: Number.MAX_SAFE_INTEGER})
  .then(function(notifications) {
    return notifications.notifications.map(function(notification){
      // create open notification
      var ne = new NotificationEvent();
      ne.id = notification.id;
      ne.creationCounter++;
      ne.notificationMessage = notification.message;
      ne.state = 1;
      switch (notification.type) {
        case "KSI Service Errors":
              _errorNotificationMap.set(notification.hostName, ne);
          break;
        case "KSI Service Warnings":
              _warningNotificationMap.set(notification.hostName, ne);
          break;
        case "Aggregator All Parent Failure":
              _allParentFailureNotificationMap.set(notification.hostName, ne);
          break;
      }
    });
  });
};

var notificationEventHandler = new NotificationEventHandler();

on("ParsedLogEvent", function(logEvent){
  switch (logEvent.message_type) {
    case "ALL_PARENT_FAILURE":
      notificationEventHandler.handleAllParentFailure(logEvent);
      break;
    case "ROUND_RESPONSE_FROM_PARENT":
      notificationEventHandler.handleRoundResponseFromParent(logEvent);
      break;
  }

  switch (logEvent.syslog_severity) {
    case "emergency":
    case "alert":
    case "critical":
    case "error":
      notificationEventHandler.handleError(logEvent);
      break;
    case "warning":
      notificationEventHandler.handleWarning(logEvent);
      break;
  }
});

on("NotificationClosedCommand", function(notification) {
  // notification closure could have being emitted via front-end or
  // based off of clousure createria in either case we we make sure its removed from cache.
  // This is to make sure we are in sync with the db.
  switch (notification.type) {
    case "KSI Service Errors":
      if(_errorNotificationMap.has(notification.hostName)) {
        _errorNotificationMap.remove(notification.hostName);
      }
      break;
    case "KSI Service Warnings":
      if(_warningNotificationMap.has(notification.hostName)) {
        _warningNotificationMap.remove(notification.hostName);
      }
      break;
    case "Aggregator All Parent Failure":
      if(_allParentFailureNotificationMap.has(notification.hostName)) {
        _allParentFailureNotificationMap.remove(notification.hostName);
      }
      break;
  }
  return notification;
});
