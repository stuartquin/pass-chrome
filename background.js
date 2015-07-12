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

var runPass = function(tab) {
  var parser = document.createElement("a");
  parser.href = tab.url;

  chrome.runtime.sendNativeMessage(appName,
                                   {text: parser.hostname.replace(regex, "")},
                                   function(response) {
                                     console.log("Received ", response);
                                   });
};

