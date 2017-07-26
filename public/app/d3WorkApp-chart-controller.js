/**
 * Created by Ray on 7/16/2017.
 */
angular.module('d3WorkApp')
    .controller('chartController', ['$scope', '$stateParams', 'HttpService', function($scope, $stateParams, HttpService) {
        $scope.chartType = $stateParams.chartType;
        $scope.chartData = [];
        HttpService.chartDataByType($scope.chartType.toLowerCase())
            .then((response) => {
                $scope.chartData = response;
            }, (failedResponse) => {
                console.log('failed to retrieve chart data');
            })
    }]);