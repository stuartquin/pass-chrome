var validUsernameNames = ["email", "user", "username", "login", "id"];
var validPasswordNames = ["password", "pass", "passwd"];

var isPasswordField = function(input) {
  var name = input.name.toLowerCase();
  var type = input.type.toLowerCase();
  return type === "password" || validPasswordNames.indexOf(name) > -1;
};

var isUsernameField = function(input) {
  var name = input.name.toLowerCase();
  var type = input.type.toLowerCase();
  return type === "email" || validUsernameNames.indexOf(name) > -1;
};

var inputs = Array.prototype.slice.call(document.getElementsByTagName("input"), 0 );
var passwordEls = inputs.filter(isPasswordField);
var usernameEls = inputs.filter(isUsernameField);

chrome.runtime.onMessage.addListener(
  function(request, sender, sendResponse) {
    if (usernameEls.length) {
      usernameEls[0].value = request.username;
    }
    if (passwordEls.length) {
      passwordEls[0].value = request.password;
    }
  });
