var moment = require('moment'),
    setInterval = require('../helpers/timers').setInterval,
    HashMap = require('hashmap');

var _errorNotificationMap = new HashMap();
var _warningNotificationMap = new HashMap();
var _allParentFailureNotificationMap = new HashMap();

var NotificationEvent = function(){
  this.notificationMessage = null;
  this.state = 0; // 0 = pending, 1 = open, 2 = closed
  this.createdAt = moment();
  this.updatedAt = moment();
  this.creationCounter = 0;
  this.updateCounter = 0;
};

var NotificationEventHandler = function() {
  // task scheduled to monitor notification HashMaps every 10 seconds (testing)
  setInterval(this.monitorHashMapTask, 10 * 1000);

  // task scheduled to send out emails every 24 hours
  //setInterval(this.emailDailyTask, 24 * 60 * 60 * 1000);

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
NotificationEventHandler.prototype.handleError = function(logEvent) {
  //console.log("***handleError***");
  var ne = null;
  if(_errorNotificationMap.has(logEvent.appliance_hostname)) {
    //console.log("already have " + logEvent.appliance_hostname + " for error notification event -- updating...");
    ne = _errorNotificationMap.get(logEvent.appliance_hostname);
    ne.creationCounter++;
    ne.updatedAt = moment();
    //console.log("ne " + JSON.stringify(ne, null, 2));
  } else {
    //console.log("creating  error notification event for " + logEvent.appliance_hostname);
    ne = new NotificationEvent();
    ne.notificationMessage = logEvent.message;
    //console.log("ne " + JSON.stringify(ne, null, 2));
    _errorNotificationMap.set(logEvent.appliance_hostname, ne);
  }
};
NotificationEventHandler.prototype.handleWarning = function(logEvent) {
  //console.log("***handleWarning***");
  var ne = null;
  if(_warningNotificationMap.has(logEvent.appliance_hostname)) {
    //console.log("already have " + logEvent.appliance_hostname + " for warning notification event -- updating...");
    ne = _warningNotificationMap.get(logEvent.appliance_hostname);
    ne.creationCounter++;
    ne.updatedAt = moment();
    //console.log("ne " + JSON.stringify(ne, null, 2));
  } else {
    //console.log("creating  warning notification event for " + logEvent.appliance_hostname);
    ne = new NotificationEvent();
    ne.notificationMessage = logEvent.message;
    //console.log("ne " + JSON.stringify(ne, null, 2));
    _warningNotificationMap.set(logEvent.appliance_hostname, ne);
  }
};
NotificationEventHandler.prototype.handleAllParentFailure = function(logEvent) {
  //console.log("***handleAllParentFailure***");
  if(_allParentFailureNotificationMap.has(logEvent.appliance_hostname)) {
    console.log("already have " + logEvent.appliance_hostname + " for all parent failure notification event -- updating...");
    ne = _allParentFailureNotificationMap.get(logEvent.appliance_hostname);
    ne.creationCounter++;
    ne.updatedAt = moment();
    //console.log("ne " + JSON.stringify(ne, null, 2));
  } else {
    console.log("creating  all parent notification event for " + logEvent.appliance_hostname);
    ne = new NotificationEvent();
    ne.notificationMessage = logEvent.message;
    //console.log("ne " + JSON.stringify(ne, null, 2));
    _allParentFailureNotificationMap.set(logEvent.appliance_hostname, ne);
  }
};
NotificationEventHandler.prototype.handleRoundResponseFromParent = function(logEvent) {
  console.log("***handleRoundResponseFromParent***");
};
NotificationEventHandler.prototype.emailDailyTask = function(){
  //console.log("***emailDailyTask***");
  return NotificationEventHandler.getUserNotificationPreferences().then(function(userNotificationPreferences){
    return userNotificationPreferences.map(function(userNotificationPreference){
      return {
         name:  userNotificationPreference.name,
         email: userNotificationPreference.useNotificationEmail ?
                userNotificationPreference.notificationEmail : userNotificationPreference.email,
         notificationSummary: userNotificationPreference.notificationtypes.map(function(notificationtype) {
           if((notificationtype.name === "Software Upgrades") && (notificationtype.daily === false)) {
              return {name: notificationtype.name, notification: "THIS IS A Software Upgrades"};
           }
           else if((notificationtype.name === "Aggregator All Parent Failure") && (notificationtype.daily === false)) {
             return {name: notificationtype.name, notification: "THIS IS A  Aggregator All Parent Failure"};
           }
           else if((notificationtype.name === "Realtime Log Stream Stopped") && (notificationtype.daily === false)) {
               return {name: notificationtype.name, notification: "THIS IS A  Realtime Log Stream Stopped"};
           }
           else if((notificationtype.name === "KSI Service Warnings") && (notificationtype.daily === false)) {
             return {name: notificationtype.name, notification: "THIS IS A  KSI Service Warnings"};
           }
           else if((notificationtype.name === "KSI Service Errors") && (notificationtype.daily === false)) {
             return {name: notificationtype.name, notification: "THIS IS A  KSI Service Errors"};
           }
         })};
    });
  }).then(function(emailNotifications){
    //console.log("emailNotifications => " + JSON.stringify(emailNotifications, null, 2));
    return emailNotifications.map(function(emailNotification){
      if( emailNotification.notificationSummary.length > 0 ){
        //console.log("Sending email lol..");
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
  console.log("***monitorHashMapTask***");
  var startTime = null;
  var endTime = null;
  var mins = null;

  // _errorNotificationMap
  // console.log("\t***_errorNotificationMap***");
  // _errorNotificationMap.forEach(function(value, key) {
  //   console.log("\tkey = " + JSON.stringify(key, null, 2) + "\n\tvalue = " + JSON.stringify(value, null, 2));
  // });
  // console.log("\n");

  // _warningNotificationMap
  console.log("\t***_warningNotificationMap***");
  _warningNotificationMap.forEach(function(value, key) {
    //console.log("\tkey = " + JSON.stringify(key, null, 2) + "\n\tvalue = " + JSON.stringify(value, null, 2));
    console.log(JSON.stringify(value, null, 2));
    endTime = moment(moment().toArray());
    if( (value.state === 0) && (value.creationCounter > 5) ) {
      startTime = moment(moment(value.createdAt).toArray());
      mins = endTime.diff(startTime, 'seconds');
      if( (mins > 10) ) {
        console.log("moving from pending to open state");
        // move notification from pending state to open state.
        // condition: state = 0, counter > 5, and it was created more than 10 ago.
        value.creationCounter = 0; // reset counter
        value.state = 1; // move to open state
      }
    } else if( (value.state === 1) ) {
      startTime = moment(moment(value.updatedAt).toArray());
      mins = endTime.diff(startTime, 'seconds');
      if( (mins > 30) ) {
        console.log("moving from open to close state");
        // move notification from open state to close state.
        // condition: state = 1, and we have not seen this notification over  30 mins ago.
        value.state = 2; // move to close state
      }
    }
    console.log(JSON.stringify(value, null, 2));
  });

  console.log("\n");

  // _allParentFailureNotificationMap
  // console.log("\t***_allParentFailureNotificationMap***");
  // _allParentFailureNotificationMap.forEach(function(value, key) {
  //   console.log("\tkey = " + JSON.stringify(key, null, 2) + "\n\tvalue = " + JSON.stringify(value, null, 2));
  // });
  // console.log("\n");
};

var notificationEventHandler = new NotificationEventHandler();

on("ParsedLogEvent", function(logEvent){
  //console.log("logEvent => " + JSON.stringify(logEvent, null, 2));

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
