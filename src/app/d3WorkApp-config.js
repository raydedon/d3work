/**
 * Created by Ray on 7/14/2017.
 */
angular.module('d3WorkApp')
    .config(['$stateProvider', '$urlRouterProvider', function ($stateProvider, $urlRouterProvider) {
        $urlRouterProvider.otherwise('/home');
        $stateProvider
            .state('home', {
                url: '/home',
                template: require('../html/thumbnail-view.html')
            })
            .state('customize', {
                url: '/customize',
                template: require('../html/customize-chart-landing.html')
            })
            .state('chart', {
                url: '/chart/:chartType',
                template: require('../html/chart.html')
            })
    }]);