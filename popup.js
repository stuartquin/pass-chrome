var background = chrome.extension.getBackgroundPage();
var submitEl = document.getElementById("add-btn");
var urlEl = document.getElementById("add-url");
var usernameEl = document.getElementById("add-username");
var passwordEl = document.getElementById("add-password");

submitEl.addEventListener("click", function(evt) {
  background.addLoginDetails(urlEl.value, usernameEl.value, passwordEl.value);
});


chrome.tabs.getSelected(null, function(tab) {
  var submitted = background.getSubmittedDetails(tab.url);

  if (submitted) {
    urlEl.value = background.getDomain(tab.url);
    usernameEl.value = submitted.username;
    passwordEl.value = submitted.password;
  }
});
