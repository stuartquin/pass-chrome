var background = chrome.extension.getBackgroundPage();

document.addEventListener('copy', function(e) {
  var content = document.getElementById("add-password").value
  e.clipboardData.setData('text/plain', content);
  e.preventDefault();
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
    this.copyEl = document.getElementById("add-copy");
    this.generateEl = document.getElementById("add-generate");

    this.generateEl.addEventListener("click", function(evt) {
      background.generatePassword(function(result){
        if (result && result.generated) {
          self.passwordEl.value = result.generated; 
        }
      });
    });

    this.copyEl.addEventListener("click", function(evt) {
      document.execCommand("copy");
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

  CreateView.prototype.toggleMode = function(mode) {
    if (mode === "edit") {
      this.copyEl.classList.remove("hidden");
      this.generateEl.classList.add("hidden");
    } else {
      this.copyEl.classList.add("hidden");
      this.generateEl.classList.remove("hidden");
    }
  }

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

    if (this.passwordEl.value) {
      this.toggleMode("edit");
    } else {
      this.toggleMode("create");
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
      // Down Key
      if (e.keyCode === 40) {
        self.resultsEl.focus();
        self.resultsEl.selectedIndex = 0;
        background.lookupAndFill(self.resultsEl.selectedOptions[0].value);
        return;
      }

      var term = e.target.value;
      if (term.length > 1) {
        self.render(term);
      }
    });

    this.resultsEl.addEventListener('dblclick', function(e){
      var target = BrowseView.getActionTarget(e);
      editExistingDomain(target.dataset.domain);
    }, true);
    this.resultsEl.addEventListener('keyup', function(e){
      if (e.keyCode === 13) {
        var target = BrowseView.getActionTarget(e);
        editExistingDomain(target.dataset.domain);
      }
    }, true);
    this.resultsEl.addEventListener('change', function(e){
      var target = BrowseView.getActionTarget(e);
      background.lookupAndFill(target.dataset.domain);
    }, true);
  }

  BrowseView.prototype = new View();

  BrowseView.reload = function() {
    var browseView = View.views["browse"];
    browseView.render();
  };

  BrowseView.getActionTarget = function(e) {
    var target = e.target;
    if (target.tagName === "SELECT") {
      target = target.selectedOptions[0];
    }
    return target;
  };

  BrowseView.prototype.renderResult = function(result) {
    var el = document.createElement("option");
    if (result === background.getCurrentDomainInfo().domain) {
      el.classList.add("detected-result");
    }
    el.dataset.action = "fill";
    el.dataset.domain = result;
    el.innerHTML = result;
    return el;
  }

  BrowseView.prototype.render = function(term) {
    if (term) {
      var self = this;
      var results = background.searchTree(term);
      this.resultsEl.innerHTML = "";

      results.forEach(function(result) {
        self.resultsEl.appendChild(self.renderResult(result));
      });
    }
    this.searchEl.focus();
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
  View.get("browse").render(domainInfo.domain);

  if (domainInfo.submitted) {
    View.switchView("create");
  }
};

chrome.tabs.getSelected(null, updateActiveDomain);
