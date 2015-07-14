var background = chrome.extension.getBackgroundPage();
var submitEl = document.getElementById("add-btn");
var reloadEl = document.getElementById("action-reload");
var urlEl = document.getElementById("add-url");
var usernameEl = document.getElementById("add-username");
var passwordEl = document.getElementById("add-password");

submitEl.addEventListener("click", function(evt) {
  background.addLoginDetails(urlEl.value, usernameEl.value, passwordEl.value);
});

reloadEl.addEventListener("click", function(evt) {
  background.loadTree();
});


chrome.tabs.getSelected(null, function(tab) {
  var sites = background.getSiteInfo(tab.url);
  var submitted = background.getSubmittedDetails(tab.url);
  if (sites.matches) {
  }

  if (sites.submitted) {
    urlEl.value = sites.domain;
    usernameEl.value = submitted.username;
    passwordEl.value = submitted.password;
  }
});
