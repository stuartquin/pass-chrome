var appName = "com.stuartquin.pass";
var regex = /www\./
var passTree = {};
var authAttempts = 0;

// In order of preference
var passwordFormFields = ["password", "pass", "pw"];
var usernameFormFields = ["username", "email", "login", "id", "acct", "user"];
var submittedFields = {};

chrome.tabs.onUpdated.addListener(function(tabId, change, tab) {
  authAttempts = 0;

  if (change.status == "complete") {
    lookupPassword(getDomain(tab.url), sendLoginDetails);
  } else {
    if (Object.keys(passTree).length === 0) {
      loadTree();
    }
  }
});

var setSuccessBadge = function(tabId) {
  chrome.browserAction.setBadgeText({text: "*", tabId: tabId});
  chrome.browserAction.setBadgeBackgroundColor({color: "#22AA22", tabId: tabId});
};

var setAlertBadge = function(tabId) {
  chrome.browserAction.setBadgeText({text: "!", tabId: tabId});
  chrome.browserAction.setBadgeBackgroundColor({color: "#FFA633", tabId: tabId});
};

var getSubmittedDetails = function(url) {
  var domain = getDomain(url);
  return submittedFields[domain];
}

var sendLoginDetails = function(message) {
  chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
    chrome.tabs.sendMessage(tabs[0].id, message, function(response) {
      if (response) {
        setSuccessBadge(tabs[0].id);
      }
    });
  });
};

var addLoginDetails = function(domain, username, password) {
  var details = {domain:domain, username:username, password:password};
  chrome.runtime.sendNativeMessage(appName,
                                   {action: "add",details: details},
                                   function(response) {
                                     console.log(response);
                                   });
};

var loadTree = function() {
  chrome.runtime.sendNativeMessage(appName,
                                   {action: "tree"},
                                   function(response) {
                                    passTree = response;
                                    console.log(response);
                                   });
}

var getDomain = function(url) {
  var parser = document.createElement("a");
  parser.href = url;
  return parser.hostname.replace(regex, "");
}

var lookupPassword = function(domain, callback) {
  if (passTree[domain]) {
    chrome.runtime.sendNativeMessage(appName,
                                   {domain: passTree[domain]},
                                   function(response) {
                                      callback(response);
                                   });
  } else {
    callback();
  }
}

chrome.webRequest.onAuthRequired.addListener(
  function(details, callbackFn) {
    console.log("onAuthRequired!", details, callbackFn);
    if (authAttempts > 0) {
      return callbackFn({cancel: true});
    }
    authAttempts++;

    lookupPassword(getDomain(details.url), function(result) {
      if (result) {
        callbackFn({authCredentials: result});
      } else {
        callbackFn({cancel: true});
      }
    });
  },
  {urls: ["<all_urls>"]},
  ['asyncBlocking']
);

var getKnownField = function(fields, knownFields) {
  var field = Object.keys(fields).filter(function(formField) {
    return knownFields.filter(function(field) {
      return formField.toLowerCase().indexOf(field) > -1;
    }).length > 0;
  });

  return field[0];
};

var getLoginFields = function(request) {
  if (request.method === "POST") {
    var body = request.requestBody;
    if (body.formData) {
      var usernameField = getKnownField(body.formData, usernameFormFields);
      var passwordField = getKnownField(body.formData, passwordFormFields);

      if (passwordField) {
        setAlertBadge(request.tabId);
        return {
          username: body.formData[usernameField],
          password: body.formData[passwordField]
        };
      }
    }
  }
};

chrome.webRequest.onBeforeRequest.addListener(
  function(request) {
    var domain = getDomain(request.url);
    if (!passTree[domain]) {
      var fields = getLoginFields(request);
      if (fields) {
        submittedFields[domain] = fields;
      } 
    }
    return {cancel: false};
  },
  {urls: ["<all_urls>"]},
  ["requestBody"]);
