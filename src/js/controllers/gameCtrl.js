app.controller("gameCtrl", ["$scope", "$routeParams", "$http", "$sce", "$interval", "$timeout", "$q", "$window", "$rootScope", "$location", "initialJSON", "$lhttp", "urls", function($scope, $routeParams, $http, $sce, $interval, $timeout, $q, $window, $rootScope, $location, initialJSON, $lhttp, urls) {
  let vm = this;
  let block_auto_refresh = false, request_in_progress = false, refresh_fails = 0, downloadTime;
  vm.ifDisabled = ()=>request_in_progress;
  if (location.protocol == "https:") { location.protocol = "http:"; }
  let data_url = urls.getGames+"?id="+$routeParams.id+"&pass="+initialJSON.pass;
  vm.gamedata = {};
  vm.showRedirectPrompt = false;
  $lhttp.get(data_url, 1500).then(function(data) {
    vm.gamedata = data;
    $scope.master.loc = "Thorin-Games — "+data.title;
    $scope.master.desc = data.description;
    let game_url = $sce.trustAsResourceUrl(vm.gamedata.file);
    if (vm.gamedata.height == "n") { vm.gamedata.height = 0.75 * window.innerHeight; }
    if (vm.gamedata.height == "r" || vm.gamedata.width == "r") {
      vm.showRedirectPrompt = true;
    } else {
      $("embed").attr("src", game_url);
    }
    resizeEmbed();

    downloadTime = Date.now();
  });

  vm.rate = function (x, action) {
    request_in_progress = true; block_auto_refresh = true;
    $http.get(urls.rating+"?action="+action+"&id="+x).then(function(response){
      request_in_progress = false; block_auto_refresh = false;
      vm.gamedata.likes = response.data;
    });
  };

  function refresh_comments () {
    request_in_progress = true; block_auto_refresh = true;
    $http.get(urls.getGames+"?id="+$routeParams.id+"&pass="+initialJSON.pass+"&dt="+Date.now()).success(function(data) {
      vm.gamedata.comments = data.comments;
      downloadTime = Date.now();
      request_in_progress = false; block_auto_refresh = false;
    });
  }

  function check_if_changed() {
    if (!block_auto_refresh && !request_in_progress) {
      block_auto_refresh = true;
      let status_data_url = urls.checkIfChanged+"?d="+Math.floor(Date.now()/10000)+"&id="+$routeParams.id+"&coms="+vm.gamedata.comments.length, start = Date.now();
      $http.get(status_data_url).then(function(response) {
        block_auto_refresh = false; refresh_fails = 0;
        if (JSON.parse(response.data)) { refresh_comments(); }
        for (i = 0; i < vm.gamedata.comments.length; i++) {
          if (!vm.gamedata.comments[i].date) { vm.gamedata.comments[i].date = 1459870175813; }
          vm.gamedata.comments[i].date += (Date.now()-start)/1000;
        }
      }).catch(function(){
        block_auto_refresh = false;
      });
    } else if (refresh_fails>8) {
      vm.gamedata.comments = [{"com":"Lost contact with server - trying to reconnect","author":"..."}];
      block_auto_refresh = false;
      refresh_fails++;
    } else {
      refresh_fails++;
    }
  }

  let promise = $interval(check_if_changed, 2400);

  $scope.$on("$destroy", ()=>$interval.cancel(promise));

  try {
    vm.author = localStorage.username;
  } catch (e) {
    vm.author = "";
  }
  vm.comment = "";
  vm.submit_comment = ()=>{
    if (!request_in_progress && vm.comment.length > 0 && vm.author.length > 0) {
      $scope.commentForm.$setUntouched();
      try {localStorage.username = vm.author} catch (e) { }
      request_in_progress = true; block_auto_refresh = true;
      $http.get(urls.comment+"?id="+$routeParams.id+"&com="+encodeURIComponent(vm.comment)+"&author="+encodeURIComponent(vm.author)).then((response)=>{
        request_in_progress = false; block_auto_refresh = false;
        vm.comment = "";
        refresh_comments();
      }).catch(()=>{
        alert("Your message was not submitted.\nPlease try again.");
        block_auto_refresh = false; request_in_progress = false;
      });
    } else {
      $scope.commentForm.$setTouched();
    }
  };

  vm.goBack = ()=>$scope.master.routeChanged ? $window.history.back(1) : $location.path("/");

  vm.jquery = ()=>{
    let initialHeight = $("textarea").outerHeight();
    $("textarea").keyup(()=>{
      $("a.glyphicon[type=submit]").css("line-height", ($("form.com-container>div").height() - 24)+"px");
      let maxChars = $("textarea").width()*(30/270);
      let newLines = Math.floor($("textarea").val().length/maxChars) + 1;
      $("textarea").css("height", newLines*initialHeight+"px");
      if (!$scope.view.ifMobile) {
        $("html, body").animate({scrollTop: $(document).height()});
      }
    });

    $( window ).resize(resizeEmbed);
  };

  function resizeEmbed() {
    if (/^[\d.,]+%$/.test(vm.gamedata.height)) {
      initialJSON.jquery.then(()=>{
        $("embed").ready(()=>{
          $timeout($("embed").attr, 1000, true, "height", $("embed").width()*(Number(vm.gamedata.height.split("%")[0])/100)+1);
        });
      });
    }
  }

  initialJSON.jquery.then(vm.jquery);

  vm.ifSpace = ()=>window.innerWidth-document.querySelector("embed").clientWidth>140 && !$scope.view.ifMobile;
}]);
