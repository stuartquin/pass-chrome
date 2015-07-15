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

var toggleView = function(viewId) {
  views[currentView].style.display = "none";
  views[viewId].style.display = "block";
  currentView = viewId;
}

chrome.tabs.getSelected(null, function(tab) {
  var sites = background.getSiteInfo(tab.url);

  if (sites.matches) {
    views["browse"].renderResults(sites.matches);
  }

  if (sites.submitted) {
    urlEl.value = sites.domain;
    usernameEl.value = sites.submitted.username;
    passwordEl.value = sites.submitted.password;
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
      background.lookupAndFill(e.target.innerHTML);
    }, true);
  }
  BrowseView.prototype = new View();

  BrowseView.prototype.renderResult = function(result) {
    var el = document.createElement("li");
    if (result === background.getCurrentSiteInfo().domain) {
      el.classList.add("detected-result");
    }
    el.innerHTML = result;
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

var views = {
  "browse": new BrowseView(),
  "create": new CreateView()
}

views["browse"].show();
