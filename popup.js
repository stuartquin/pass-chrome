var background = chrome.extension.getBackgroundPage();
var submitEl = document.getElementById("add-btn");
var navReloadEl = document.getElementById("nav-reload");
var navGenerateEl = document.getElementById("nav-generate");
var navBackEl = document.getElementById("nav-back");
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

navReloadEl.addEventListener("click", function(evt) {
  background.loadTree();
});

navGenerateEl.addEventListener("click", function(evt) {
  switchView("generate");
});

navBackEl.addEventListener("click", function(evt) {
  if (viewStack.length > 1) {
    var current = viewStack.pop();
    current.hide();
    viewStack[viewStack.length - 1].show();
  }
});

var View = (function() {
  function View() {
  }
  View.prototype.hide = function() {
    this.el.style.display = "none";
  }
  View.prototype.show = function() {
    this.el.style.display = "block";
  }

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

var switchView = function(view) {
  if (viewStack.length) {
    viewStack[viewStack.length - 1].hide();
  }
  views[view].show();
  viewStack.push(views[view]);
};

var views = {
  "browse": new BrowseView(),
  "create": new CreateView(),
  "generate": new GenerateView(),
}

var viewStack = [];

chrome.tabs.getSelected(null, function(tab) {
  var currentDomain = background.getDomainInfo(tab.url);

  switchView("browse");
  if (currentDomain.matches.length) {
    views["browse"].renderResults(currentDomain.matches);
  }

  if (currentDomain.submitted) {
    var submitted = currentDomain.submitted;
    urlEl.value = currentDomain.domain;
    usernameEl.value = submitted.username;
    passwordEl.value = submitted.password;
    switchView("create");
  }
});

