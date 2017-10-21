/**
 * Created by Ray on 7/16/2017.
 */
angular.module('d3WorkApp')
    .controller('chartListController', ['$scope', 'HttpService', function($scope, HttpService) {
        $scope.charts = HttpService.chartList()
            .then(function (result) {
                $scope.charts = result.data;
            });

        $scope.imageUrl = (image) => {
            return require('../images/' + image + '.png');
        }
    }]);