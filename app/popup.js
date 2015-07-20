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
    "create": View.switchView,
    "reload": function() {
      background.loadTree()
    },
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

  View.prototype.render = function() {};

  View.prototype.show = function() {
    this.el.style.display = "block";
    this.render();
  };

  View.prototype.togglePasswordView = function() {
    var self = this;
    var viewEl = this.el.querySelector(".view-password");
    if (viewEl) {
      viewEl.addEventListener("click", function(evt) {
        evt.stopPropagation();
        if (self.passwordEl.type === "password") {
          self.passwordEl.type = "text";
          evt.target.classList.remove("fa-eye");
          evt.target.classList.add("fa-eye-slash");
        } else {
          self.passwordEl.type = "password";
          evt.target.classList.add("fa-eye");
          evt.target.classList.remove("fa-eye-slash");
        }
        return false;
      });
    }
  }

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
    this.generateEl = document.getElementById("add-generate");

    this.generateEl.addEventListener("click", function(evt) {
      background.generatePassword(function(result){
        if (result && result.generated) {
          self.passwordEl.value = result.generated; 
        }
      });
    });

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

    this.togglePasswordView();
  }
  CreateView.prototype = new View();

  CreateView.prototype.render = function(result) {
    var domainInfo = result;
    if (!domainInfo) {
      domainInfo = background.getCurrentDomainInfo();
    }
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
    this.lengthEl = document.getElementById("generated-length");
    this.booleanEls = {
      "capitalize": document.getElementById("generated-capitalize"),
      "numeric": document.getElementById("generated-numeric"),
      "symbol": document.getElementById("generated-symbol")
    }

    for (var i = 4; i < 100; i++) {
      var opt = document.createElement("option");
      opt.value = i;
      opt.innerText = i;
      if (i == 12) {
        opt.selected = true;
      }
      this.lengthEl.appendChild(opt);
    }

    this.btnEl.addEventListener('click', function(e) {
      background.setGenerateOptions(self.getOptions());
      self.generatePassword();
    });
    this.togglePasswordView();
  }
  GenerateView.prototype = new View();
  
  GenerateView.prototype.generatePassword = function() {
    var self = this;
    background.generatePassword(function(result){
      if (result && result.generated) {
        self.passwordEl.value = result.generated; 
        self.passwordEl.focus();
        self.passwordEl.select();
      }
    });
  };

  GenerateView.prototype.render = function(results) {
    this.generatePassword();
  };

  GenerateView.prototype.getOptions = function() {
    var options = {length: this.lengthEl.value};
    for (var i in this.booleanEls) {
      options[i] = this.booleanEls[i].checked
    }
    return options;
  };

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
        if (action === "edit") {
          editExistingDomain(target.dataset.domain);
        }
      }
    }, true);
  }

  BrowseView.prototype = new View();

  BrowseView.reload = function() {
    var browseView = View.views["browse"];
    browseView.render();
  };

  BrowseView.prototype.renderResult = function(result) {
    var el = document.createElement("li");
    if (result === background.getCurrentDomainInfo().domain) {
      el.classList.add("detected-result");
    }
    el.dataset.action = "fill";
    el.dataset.domain = result;
    el.innerHTML = result;

    var viewBtn = document.createElement("a");
    viewBtn.dataset.action = "edit";
    viewBtn.dataset.domain = result;
    viewBtn.classList.add("view-domain");
    viewBtn.classList.add("fa");
    viewBtn.classList.add("fa-edit");
    el.appendChild(viewBtn);
    return el;
  }

  BrowseView.prototype.render = function(results) {
    var self = this;
    var matches = results;
    if (!matches) {
      matches = background.getCurrentDomainInfo().matches; 
    }

    this.resultsEl.innerHTML = "";
    matches.forEach(function(result) {
      self.resultsEl.appendChild(self.renderResult(result));
    });
  };
  return BrowseView;
})();

View.register("browse", new BrowseView());
View.register("create", new CreateView());
View.register("generate", new GenerateView());

var editExistingDomain = function(domain) {
  background.lookupPassword(domain, function(result) {
    if (result) {
      var domainInfo = {
        domain: domain,
        submitted: result
      }
      View.switchView("create");
      View.get("create").render(domainInfo);
    }
  });
}

var updateActiveDomain = function(tab) {
  var domainInfo = background.getDomainInfo(tab.url);

  View.switchView("browse");
  if (domainInfo.matches.length) {
    View.get("browse").render(domainInfo.matches);
  } else {
    if (domainInfo.submitted) {
      View.switchView("create");
    }
  }
  //View.switchView("create");
};

chrome.tabs.getSelected(null, updateActiveDomain);
