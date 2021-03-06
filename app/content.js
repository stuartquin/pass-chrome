var validUsernameNames = ["email", "user", "username", "login", "id", "emailaddress"];
var validUsernameTypes = ["email", "text"];
var validPasswordNames = ["password", "pass", "passwd"];

var isPasswordField = function(input) {
  var type = input.type.toLowerCase();
  return input.offsetParent !== null && type === "password";
};

var isUsernameField = function(input) {
  var name = input.name.toLowerCase();
  var type = input.type.toLowerCase();
  return type === "email" || validUsernameNames.indexOf(name) > -1;
};

var getBestUsernameField = function(inputs, passwordEl) {
  var form = passwordEl.form;
  if (form) {
    for (var i = 0; i < validUsernameTypes.length; i++) {
      var type = validUsernameTypes[i]
      var qry = form.querySelectorAll("input[type='"+type+"']")
      if (qry.length && qry[0] !== passwordEl) {
        return qry[0];
      }
    }
  }
  var usernameEls = inputs.filter(isUsernameField);
  return usernameEls[0];
}

var fillFields = function(request) {
  var passwordEl, usernameEl = null;
  var inputs = Array.prototype.slice.call(document.getElementsByTagName("input"), 0 );
  var passwordEls = inputs.filter(isPasswordField);

  if (passwordEls.length) {
    passwordEl = passwordEls[0];
    passwordEl.value = request.password;
    usernameEl = getBestUsernameField(inputs, passwordEl);

    if (usernameEl && !usernameEl.readOnly && request.username) {
      usernameEl.value = request.username;
    }
    return true;
  }
  return false;
}

chrome.runtime.onMessage.addListener(
  function(request, sender, sendResponse) {
    sendResponse(fillFields(request));
  });
