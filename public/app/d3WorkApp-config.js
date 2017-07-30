/**
 * Created by Ray on 7/14/2017.
 */
angular.module('d3WorkApp')
    .config(['$stateProvider', '$urlRouterProvider', function ($stateProvider, $urlRouterProvider) {
        $urlRouterProvider.otherwise('/home');
        $stateProvider
            .state('home', {
                url: '/home',
                templateUrl: '../html/thumbnail-view.html'
            })
            .state('customize', {
                url: '/customize',
                templateUrl: '../html/customize-chart-landing.html'
            })
            .state('chart', {
                url: '/chart/:chartType',
                templateUrl: '../html/chart.html'
            })
    }]);