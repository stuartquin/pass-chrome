var background = chrome.extension.getBackgroundPage();


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
  };

  View.resetView = function(view) {
    View.viewStack = [];
    View.switchView(view);
  };

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
    var self = this;
    this.el = document.getElementById("create");
    this.urlEl = document.getElementById("add-url");
    this.usernameEl = document.getElementById("add-username");
    this.passwordEl = document.getElementById("add-password");
    this.submitEl = document.getElementById("add-btn");

    this.submitEl.addEventListener("click", function(evt) {
      var details = {
        domain: self.urlEl.value, 
        username: self.usernameEl.value, 
        password: self.passwordEl.value
      };
      background.addLoginDetails(details, function() {
        chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
          var tab = tabs[0];
          if (tab) {
            updateActiveDomain(tab);
          }
        });
      });
    });
  }
  CreateView.prototype = new View();

  CreateView.prototype.render = function(domainInfo) {
    this.urlEl.value = domainInfo.domain;
    if (domainInfo.submitted) {
      this.passwordEl.value = domainInfo.submitted.password;
      this.usernameEl.value = domainInfo.submitted.username;
    }
  };
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
        self.render(background.searchTree(term));
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

  BrowseView.reload = function(results) {
    var browseView = View.views["browse"];
    browseView.render(results);
  };

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

  BrowseView.prototype.render = function(results) {
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

var updateActiveDomain = function(tab) {
  var domainInfo = background.getDomainInfo(tab.url);

  View.switchView("browse");
  if (domainInfo.matches.length) {
    View.get("browse").render(domainInfo.matches);
  } else {
    if (domainInfo.submitted) {
      View.switchView("create");
      View.get("create").render(domainInfo);
    }
  }
};

chrome.tabs.getSelected(null, updateActiveDomain);
