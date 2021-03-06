(function(exports) {
    'use strict';

    var bgo = angular.module('build.gnome.org', [
        'ngRoute',
        'bgoControllers',
        'bgoDepGraph',
    ]);

    bgo.config(['$routeProvider', function($routeProvider) {
        $routeProvider.
            when('/', {
                templateUrl: 'partials/gnome-continuous.html',
                controller: 'ContinuousHomeCtrl',
            }).
            when('/build/:buildVersion', {
                templateUrl: 'partials/gnome-continuous-build.html',
                controller: 'ContinuousBuildViewCtrl',
            }).
            otherwise({
                redirectTo: '/',
            });
    }]);

})(window);
