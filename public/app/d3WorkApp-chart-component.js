/**
 * Created by Ray on 7/16/2017.
 */
angular.module('d3WorkApp')
    .component('chartComponent', {
        bindings: {
            chartType: '@',
            chartData: '<'
        },
        templateUrl: '../html/chart-component.html',
        controller: ['HttpService', function(HttpService) {
            this.$onInit = () => {};
            this.$postLink = () => {};

            this.$onChanges = (changes) => {
                if (changes.chartData && !changes.chartData.isFirstChange()) {
                    rc.addGraph({
                        chartContainerID: 'generic-chart-container',
                        unProcessedDataArray: this.chartData,
                        chartType: this.chartType.toLowerCase()
                    });
                }
            };
        }]
    });