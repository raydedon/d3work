/**
 * Created by Ray on 7/16/2017.
 */
angular.module('d3WorkApp')
    .factory('HttpService', ['$http', '$q', function($http, $q) {
        var service = {
            chartList: () => {
                var defer = $q.defer();
                $http.get('/charts').then(function(data) {
                    defer.resolve(data);
                });
                return defer.promise;
            },
            chartDataByType: (chartType) => {
                let defer = $q.defer();
                $http.get(`/charts/${chartType}`)
                    .then(function(data) {
                        defer.resolve(data);
                    }, function(data) {
                        defer.reject("Failed to get chart data");
                    });
                return defer.promise;
            }
        };
        return service;
    }]);