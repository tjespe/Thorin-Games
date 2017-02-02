var app = angular.module("app", ['ngRoute']);

app.config(["$routeProvider", "$sceProvider", "$locationProvider", '$controllerProvider', '$provide', '$compileProvider', '$filterProvider', '$sceDelegateProvider', function($routeProvider, $sceProvider, $locationProvider, $controllerProvider, $provide, $compileProvider, $filterProvider, $sceDelegateProvider) {
  $sceDelegateProvider.resourceUrlWhitelist([
      'self',
      'https://script.google.com'
  ]);

  var vp = 'src/views/';
  var params = window.location.search;

  $routeProvider
    .when('/', {
      templateUrl: vp+'home.php'+params
    })
  .when('/tag/:category', {
    templateUrl: vp+'category.php'+params,
    controller:'categoryCtrl',
    controllerAs:'cat'
  })
  .when('/search/:category', {
    templateUrl: vp+'category.php'+params,
    controller:'categoryCtrl',
    controllerAs:'cat'
  })
  .when('/id/:id', {
    controller: 'gameCtrl',
    controllerAs: 'g',
    templateUrl: vp+'game.php'+params
  })
  .when('/submit', {
    templateUrl: vp+'submit.php'+params
  })
  .when('/cookies', {
    templateUrl: vp+'policy.php'+params
  })
  .when('/contact', {
    templateUrl: vp+'contact.php'+params
  })
  .when('/game/:id', {
    redirectTo: '/id/:id'
  })
  .when('/tag', {
    redirectTo: '/'
  })
  .when('/403', {
    templateUrl: vp+'error.php?error_code=403'
  })
  .when('/401', {
    templateUrl: vp+'error.php?error_code=401'
  })
  .otherwise({
    templateUrl: vp+'error.php?error_code=404'
  });
  $sceProvider.enabled(true);

  $locationProvider.html5Mode(true);

  // Activate lazy-loading of modules:
  app._controller = app.controller;
  app._service = app.service;
  app._factory = app.factory;
  app._value = app.value;
  app._directive = app.directive;
  // Provider-based controller.
  app.controller = function( name, constructor ) {
    $controllerProvider.register( name, constructor );
    return( this );
  };
  // Provider-based service.
  app.service = function( name, constructor ) {
    $provide.service( name, constructor );
    return( this );
  };
  // Provider-based factory.
  app.factory = function( name, factory ) {
    $provide.factory( name, factory );
    return( this );
  };
  // Provider-based value.
  app.value = function( name, value ) {
    $provide.value( name, value );
    return( this );
  };
  // Provider-based directive.
  app.directive = function( name, factory ) {
    $compileProvider.directive( name, factory );
    return( this );
  };
  // Provider-based filter
  app.filter = function (name, constructor) {
    $filterProvider.register(name, constructor);
    return( this );
  };
}]);

app.service('initialJSON', ['$http', '$lhttp', function ($http, $lhttp) {
  var vm = this;
  vm.pass = encodeURIComponent(window.location.search.slice(1)+window.location.hash.slice(1));
  var url = 'https://static.thorin-games.tk/js/initialJSON.php';
  if (vm.pass.length>0) url += '?pass='+vm.pass;

  vm.json = $lhttp.get(url);

  vm.jquery = $lhttp.get("https://code.jquery.com/jquery-2.2.3.min.js", 0);

  vm.jquery.then(function (data) {
    eval(data);
  });
}]);

app.directive('script', function() {
  return {
    restrict: 'E',
    scope: false,
    link: function(scope, elem, attr) {
      if (attr.type === 'text/javascript-lazy') {
        var code = elem[0].text;
        eval(code);
        /*var code = elem.text();
          var f = new Function(code);
          f();*/
      }
    }
  };
});

app.service('$lhttp', ['$http', '$q', '$timeout', function ($http, $q, $timeout) {
  let vm = this;
  vm.ldbOn = true;
  try {
    !function(){function e(t,o){return n?void(n.transaction("s").objectStore("s").get(t).onsuccess=function(e){var t=e.target.result&&e.target.result.v||null;o(t)}):void setTimeout(function(){e(t,o)},100)}var t=window.indexedDB||window.mozIndexedDB||window.webkitIndexedDB||window.msIndexedDB;if(!t)return void console.error("indexDB not supported");var n,o={k:"",v:""},r=t.open("d2",1);r.onsuccess=function(e){n=this.result},r.onerror=function(e){console.error("indexedDB request error"),console.log(e)},r.onupgradeneeded=function(e){n=null;var t=e.target.result.createObjectStore("s",{keyPath:"k"});t.transaction.oncomplete=function(e){n=e.target.db}},window.ldb={get:e,set:function(e,t){o.k=e,o.v=t,n.transaction("s","readwrite").objectStore("s").put(o)}}}();
  } catch (e) {
    console.warn("Unable to use lbd, using localStorage instead. Error:",e);
    vm.ldbOn = false;
  }

  vm.get = (url, timeout, options, promise)=>{
    let deferred = $q.defer();
    if (typeof options === 'undefined') var options = {};
    options.timeout = deferred.promise;
    let request = $http.get(url, options);
    request.success(function (data) {
      try {
        ldb.set(url, JSON.stringify(data));
      } catch (e) {
        try {
          localStorage[url] = JSON.stringify(data);
        } catch (e) {
          console.log("Couldn't save "+url+"-data to storage. Error:",e);
        }
      }
      deferred.resolve(data);
    });
    request.error(function (data, status) {
      try {
        ldb.get(url, (data)=>{
          if (data !== null) {
            deferred.resolve(JSON.parse(data));
          } else {
            typeof localStorage[url] !== "undefined" ? deferred.resolve(JSON.parse(localStorage[url])) : deferred.reject("ERROR");
          }
        });
      } catch (e) {
        try {
          typeof localStorage[url] !== "undefined" ? deferred.resolve(JSON.parse(localStorage[url])) : deferred.reject("ERROR");
        } catch (e) {
          deferred.reject("ERROR");
        }
      }
    });
    if (typeof timeout !== "undefined") {
      $timeout(function () {
        if (vm.ldbOn) {
          ldb.get(url, (data)=>{
            data !== null ? deferred.resolve(JSON.parse(data)) : "";
          });
        } else if (typeof Storage !== "undefined" && url in localStorage) {
          deferred.resolve(JSON.parse(localStorage[url]));
        }
      }, timeout);
    }
    if (typeof promise !== "undefined") {
      promise.catch(()=>{
        deferred.reject("Canceled");
      });
    }
    return deferred.promise;
  };
}]);
