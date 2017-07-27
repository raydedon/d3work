/**
 * Created by Ray on 7/26/2017.
 */
angular.module('d3WorkApp')
    .controller('customizeChartController', ['$scope', '$stateParams', 'HttpService', function($scope, $stateParams, HttpService) {
        $scope.chartType = $stateParams.chartType || 'CUSTOMIZE';
        $scope.chartData = [];
        HttpService.chartDataByType($scope.chartType.toLowerCase())
            .then((response) => {
                $scope.processedDataArray = this.groupNAggregateNSortJSONData(response);
/*
                angular.forEach(processedDataArray, function (index, value) {
                    $('#yearSelector').append($('<option/>', {
                        value: value.key,
                        text : value.key
                    }));
                });
*/
                this.prepareConfigObj();
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
        this.settings = {};
        this.prepareConfigObj = () => {
            let obj = this.settings;
            obj.chartContainerID = 'panelId';
            obj.unProcessedDataArray = this.processedDataArray.filter(function(d) {return d.key === $('#yearSelector').val()})[0].values;
            obj.legend = {};
            obj.legend.align = this.settings.legend.align;
            obj.legend.verticalAlign = this.settings.legend.verticalAlign;
            obj.series = [];
            $.each($('input[name="seriesColor"]'), function(index) {
                obj.series.push({color: $(this).val()});
            });
            obj.series[1].strokeWidth = $('#seriesStrokeWidth2').val();
            obj.displayValueOnColBar = $('#displayValueOnColBar').is(':checked');
            obj.xAxis = {};
            obj.xAxis.tickColor = $('#xAxisTickColor').val();
            obj.xAxis.tickWidth = $('#xAxisTickWidth').val();
            obj.xAxis.tickLength = $('#xAxisTickLength').val();
            obj.xAxis.labelColor = $('#xAxisLabelColor').val();
            obj.xAxis.tickLabelFontSize = $('#xAxisLabelFontSize').val();
            obj.xAxis.displayGridLines = $('#xAxisDisplayGridLines').is(':checked');
            obj.yAxis = {};
            obj.yAxis.tickColor = $('#yAxisTickColor').val();
            obj.yAxis.tickWidth = $('#yAxisTickWidth').val();
            obj.yAxis.tickLength = $('#yAxisTickLength').val();
            obj.yAxis.labelColor = $('#yAxisLabelColor').val();
            obj.yAxis.tickLabelFontSize = $('#yAxisLabelFontSize').val();
            obj.yAxis.displayGridLines = $('#yAxisDisplayGridLines').is(':checked');
        };

        this.updateSettingsObjectForCustomizeChart = () => {

        }
    }]);