var appName = "com.stuartquin.pass";
var regex = /www\./
var passTree = {};
var authAttempts = 0;
 
chrome.tabs.onUpdated.addListener(function(tabId, change, tab) {
  authAttempts = 0;
  if (change.status == "complete") {
    lookupPassword(tab.url, sendMessage);
  } else {
    if (Object.keys(passTree).length === 0) {
      loadTree();
    }
  }
});

chrome.browserAction.onClicked.addListener(function(tab) {
});

var sendMessage = function(message) {
  chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
    chrome.tabs.sendMessage(tabs[0].id, message, function(response) {
      console.log(response);
    });
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

var lookupPassword = function(url, callback) {
  var parser = document.createElement("a");
  parser.href = url;
  var domain = parser.hostname.replace(regex, "");

  if (passTree[domain]) {
    chrome.runtime.sendNativeMessage(appName,
                                   {domain: passTree[domain]},
                                   function(response) {
                                      console.log("Received ", response);
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

    lookupPassword(details.url, function(result) {
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
