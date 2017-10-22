/**
 * Created by Ray on 7/26/2017.
 */
angular.module('d3WorkApp')
    .controller('customizeChartController', ['$stateParams', 'HttpService', '$scope', function($stateParams, HttpService, $scope) {
        $scope.chartType = $stateParams.chartType || 'CUSTOMIZE';
        $scope.colors = d3.scaleOrdinal(d3.schemeCategory10).range();
        $scope.settingsObj = {
            chartContainerID: 'panelId',
            chartType: $scope.chartType.toLowerCase(),
            series: [{color: $scope.colors[0]}, {color: $scope.colors[1]}, {color: $scope.colors[2]}],
            legend: {align: 'right', verticalAlign: 'top'},
            tickWidth: 1,
            xAxis: {},
            yAxis: {},
            strokeWidth: 1,
            tickLength: 6,
            unProcessedDataArray: []
        };
        $scope.processedDataArray = [];
        $scope.yearArr = [];
        $scope.year = '';
        let thisCtrl = this;
        HttpService.chartDataByType($scope.chartType.toLowerCase())
            .then((response) => {
                $scope.processedDataArray = thisCtrl.groupNAggregateNSortJSONData(response.data || {});
                angular.forEach($scope.processedDataArray, function (value, index) {
                    $scope.yearArr.push(value.key);
                });
                $scope.year = $scope.yearArr[0];
                $scope.settingsObj.unProcessedDataArray = $scope.processedDataArray.filter(function(d) {return d.key ===  $scope.year})[0].values;
                $scope.settingsObj = angular.copy($scope.settingsObj);
            }, (failedResponse) => {
                console.log('failed to retrieve chart data');
            });
        this.groupNAggregateNSortJSONData = (issuesRawData) => {
            return d3.nest()
                .key(function(d) {
                    var year = parseInt(d3.timeParse("%d-%m-%Y")(d['Order Date']).getFullYear());
                    return year;
                }).sortKeys(d3.ascending)
                .entries(issuesRawData);
        };
        $scope.updateSettingsReloadGraph = (event) => {
            if(event.settingsObj) {
                $scope.settingsObj = angular.copy(event.settingsObj);
            }
            if(event.year) {
                $scope.year = event.year;
                let obj = angular.copy($scope.settingsObj);
                obj.unProcessedDataArray = $scope.processedDataArray.filter(function(d) {return d.key ===  $scope.year})[0].values;
                $scope.settingsObj = obj;
            }
        };
    }]);