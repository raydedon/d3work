/**
 * Created by Ray on 7/16/2017.
 */
angular.module('d3WorkApp')
    .component('chartComponent', {
        bindings: {
            chartType: '@',
            chartData: '<'
        },
        template: require('../html/chart-component.html'),
        controller: ['HttpService', function(HttpService) {
            this.$onInit = () => {
                this.layoutType = 0;
            };
            this.$postLink = () => {};

            this.switchLayoutType = () => {
                window.dispatchEvent(new CustomEvent('customEvent'));
            };

            this.$onDestroy = function () {
                rc.render.queue = [];
            };

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