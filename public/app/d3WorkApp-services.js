/**
 * Created by Ray on 7/16/2017.
 */
angular.module('d3WorkApp')
    .factory('HttpService', ['$http', '$q', function($http, $q) {
        var service = {
            chartList: () => {
                var defer = $q.defer();
                $http.get('/charts').success(function(data) {
                    defer.resolve(data);
                });
                return defer.promise;
            },
            chartDataByType: (chartType) => {
                let defer = $q.defer();
                $http.get(`/charts/${chartType}`)
                    .success(function(data) {
                        defer.resolve(data);
                    })
                    .error(function() {
                        defer.reject("Failed to get chart data");
                    });
                return defer.promise;
            }
        };
        return service;
    }]);