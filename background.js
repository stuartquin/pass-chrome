var appName = "com.stuartquin.pass";
var regex = /www\./
var passTree = {};
var authAttempts = 0;

// In order of preference
var passwordFormFields = ["password", "pass", "pw"];
var usernameFormFields = ["username", "email", "login", "id", "acct", "user", "name"];
var submittedFields = {};

var currentSiteInfo = {};

var setSuccessBadge = function(tabId) {
  chrome.browserAction.setBadgeText({text: " ", tabId: tabId});
  chrome.browserAction.setBadgeBackgroundColor({color: "#D4EE9F", tabId: tabId});
};

var setAlertBadge = function(tabId) {
  chrome.browserAction.setBadgeText({text: "!", tabId: tabId});
  chrome.browserAction.setBadgeBackgroundColor({color: "#FFA633", tabId: tabId});
};

var getSubmittedDetails = function(url) {
  var domain = getDomain(url);
  return submittedFields[domain];
}

var getCurrentSiteInfo = function() {
  return currentSiteInfo;
};

var getSiteInfo = function(url) {
  var domain = getDomain(url);
  return {
    domain: domain,
    matches: (passTree[domain] ? [passTree[domain]] : []),
    submitted: submittedFields[domain] || {}
  };
}

var getDomain = function(url) {
  var parser = document.createElement("a");
  parser.href = url;
  return parser.hostname.replace(regex, "");
}

var sendLoginDetails = function(message) {
  chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
    chrome.tabs.sendMessage(tabs[0].id, message, function(response) {});
  });
};

var lookupAndFill = function(domain) {
  if (domain) {
    lookupPassword(domain, sendLoginDetails);
  }
};

var sendNativeMessage = function(action, message, callback) {
  chrome.runtime.sendNativeMessage(appName,
                                   {action: action, message: message},
                                   callback);
};

var generatePassword = function(callback) {
  sendNativeMessage("generate", {}, callback);
}

var addLoginDetails = function(message) {
  var details = {domain:domain, username:username, password:password};
  sendNativeMessage("add", message, function(response) {
    console.log(response);
  });
};

var loadTree = function() {
  sendNativeMessage("tree", {}, function(response) {
    passTree = response;
  });
}

var lookupPassword = function(domain, callback) {
  if (passTree[domain]) {
    sendNativeMessage("lookup", {domain: domain}, callback);
  } else {
    callback();
  }
}

/**
 * Prefix search over tree
 */
var searchTree = function(term) {
  var keys = Object.keys(passTree);
  return keys.filter(function(key) {
    return key.toLowerCase().indexOf(term.toLowerCase()) > -1;
  }); 
}

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

/**
 * Called on each tab change
 * Checks known information for a domain
 */
chrome.tabs.onUpdated.addListener(function(tabId, change, tab) {
  authAttempts = 0;

  if (change.status == "complete") {
    currentSiteInfo = getSiteInfo(tab.url);
    lookupAndFill(currentSiteInfo.domain);
    if (passTree[currentSiteInfo.domain]) {
      setSuccessBadge(tab.id);
    }
  } else {
    if (Object.keys(passTree).length === 0) {
      loadTree();
    }
  }
});

/**
 * Called when request made, if POST, check for known password/username
 * fields
 */
chrome.webRequest.onBeforeRequest.addListener(
  function(request) {
    var domain = getDomain(request.url);
    var fields = getLoginFields(request);
    if (fields) {
      submittedFields[domain] = fields;
    }
    return {cancel: false};
  },
  {urls: ["<all_urls>"]},
["requestBody"]);

/**
 * Handle Basic Auth Dialogs
 */
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
