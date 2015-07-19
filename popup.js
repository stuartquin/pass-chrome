var background = chrome.extension.getBackgroundPage();
var submitEl = document.getElementById("add-btn");
var urlEl = document.getElementById("add-url");
var usernameEl = document.getElementById("add-username");
var passwordEl = document.getElementById("add-password");


submitEl.addEventListener("click", function(evt) {
  background.addLoginDetails({
    domain: urlEl.value, 
    username: usernameEl.value, 
    password: passwordEl.value
  });
});

var View = (function() {
  function View() {
    this.parentEl = document.getElementById("views");
    this.parentEl.addEventListener("click", function(e) {
      var target = e.target;
      var action = target.dataset.action;
      if (action && View.navActions[action]) {
        View.navActions[action](action);
      }
    });
  }
  View.views = {};
  View.viewStack = [];

  View.register = function(view, instance) {
    View.views[view] = instance;
  };

  View.get = function(view) {
    return View.views[view];
  }

  View.switchView = function(view) {
    if (View.viewStack.length) {
      View.viewStack[View.viewStack.length - 1].hide();
    }
    View.views[view].show();
    View.viewStack.push(View.views[view]);
  };

  View.navActions = {
    "generate": View.switchView,
    "reload": background.loadTree,
    "back": function() {
      if (View.viewStack.length > 1) {
        View.viewStack.pop().hide();
        View.viewStack[View.viewStack.length - 1].show();
      }
    }
  };

  View.prototype.hide = function() {
    this.el.style.display = "none";
  };

  View.prototype.show = function() {
    this.el.style.display = "block";
  };

  return View;
})();


var CreateView = (function() {
  function CreateView() {
    this.el = document.getElementById("create");
  }
  CreateView.prototype = new View();
  return CreateView;
})();

var GenerateView = (function() {
  function GenerateView() {
    var self = this;
    this.el = document.getElementById("generate");
    this.btnEl = document.getElementById("generate-btn");
    this.passwordEl = document.getElementById("generated-password");

    this.btnEl.addEventListener('click', function(e) {
      background.generatePassword(function(result){
        if (result && result.generated) {
          self.passwordEl.value = result.generated; 
        }
      });
    });
  }
  GenerateView.prototype = new View();
  return GenerateView;
})();


var BrowseView = (function() {
  function BrowseView() {
    var self = this;
    this.el = document.getElementById("browse");
    this.resultsEl = document.getElementById("browse-results");
    this.searchEl = document.getElementById("search");

    this.searchEl.addEventListener('keyup', function(e) {
      var term = e.target.value;
      if (term.length > 1) {
        self.renderResults(background.searchTree(term));
      }
    }, true);

    this.resultsEl.addEventListener('click', function(e) {
      var target = e.target;
      var action = target.dataset.action;
      if (action) {
        if (action === "fill") {
          background.lookupAndFill(target.dataset.domain);
        }
      }
    }, true);
  }

  BrowseView.prototype = new View();

  BrowseView.prototype.renderResult = function(result) {
    var el = document.createElement("li");
    if (result === background.getCurrentDomainInfo().domain) {
      el.classList.add("detected-result");
    }
    el.dataset.action = "fill";
    el.dataset.domain = result;
    el.innerHTML = result;

    // var viewBtn = document.createElement("button");
    // viewBtn.dataset.action = "view";
    // viewBtn.innerHTML = "v";
    // el.appendChild(viewBtn);
    return el;
  }

  BrowseView.prototype.renderResults = function(results) {
    var self = this;
    this.resultsEl.innerHTML = "";
    results.forEach(function(result) {
      self.resultsEl.appendChild(self.renderResult(result));
    });
  };
  return BrowseView;
})();

View.register("browse", new BrowseView());
View.register("create", new CreateView());
View.register("generate", new GenerateView());

chrome.tabs.getSelected(null, function(tab) {
  var currentDomain = background.getDomainInfo(tab.url);

  View.switchView("browse");
  if (currentDomain.matches.length) {
    View.get("browse").renderResults(currentDomain.matches);
  }

  if (currentDomain.submitted) {
    var submitted = currentDomain.submitted;
    urlEl.value = currentDomain.domain;
    usernameEl.value = submitted.username;
    passwordEl.value = submitted.password;
    View.switchView("create");
  }
});

