// chrome.runtime.sendNativeMessage('com.stuartquin.pass',
//   { text: "Hello" },
//   function(response) {
//     debugger;
//     console.log("Received " + response);
//   });
var appName = "com.stuartquin.pass";
var regex = /www\./
var passTree = {};
 
chrome.tabs.onUpdated.addListener(function(tabId, change, tab) {
  if (change.status == "complete") {
    runPass(tab);
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

var runPass = function(tab) {
  var parser = document.createElement("a");
  parser.href = tab.url;
  var domain = parser.hostname.replace(regex, "");

  if (passTree[domain]) {
    chrome.runtime.sendNativeMessage(appName,
                                   {domain: domain},
                                   function(response) {
                                      console.log("Received ", response);
                                      sendMessage(response);
                                   });
  }
};
