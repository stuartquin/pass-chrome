// chrome.runtime.sendNativeMessage('com.stuartquin.pass',
//   { text: "Hello" },
//   function(response) {
//     debugger;
//     console.log("Received " + response);
//   });
var appName = "com.stuartquin.pass";
var regex = /www\./

chrome.tabs.onUpdated.addListener(function(tabId, change, tab) {
  if (change.status == "complete") {
    runPass(tab);
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

var runPass = function(tab) {
  var parser = document.createElement("a");
  parser.href = tab.url;

  chrome.runtime.sendNativeMessage(appName,
                                   {text: parser.hostname.replace(regex, "")},
                                   function(response) {
                                      console.log("Received ", response);
                                      sendMessage(response);
                                   });
};
