/**
 * Created by Ray on 7/26/2017.
 */
angular.module('d3WorkApp')
    .component('customizeChartComponent', {
        bindings: {
            settingsObj: '<',
            count: '@',
            yearArr: '<',
            year: '<',
            updateSettingsReloadGraph: '&'
        },
        templateUrl: '../html/customize-chart-component.html',
        controller: ['HttpService', function(HttpService) {
            this.$onInit = () => {};
            this.$postLink = () => {};

            this.$onChanges = (changes) => {
                if (changes.count && !changes.count.isFirstChange()) {
                    this.settingsObj = angular.copy(this.settingsObj);
                    rc.addGraph(this.settingsObj);
                }
            };

            this.changeSettingsReloadGraph = () => {
                this.updateSettingsReloadGraph({
                    $event: {
                        settingsObj: this.settingsObj
                    }
                });
            };

            this.changeYearReloadGraph = () => {
                this.updateSettingsReloadGraph({
                    $event: {
                        year: this.year
                    }
                });
            };
            this.toggleGridLines = () => {
                this.settingsObj.xAxis.displayGridLines = this.settingsObj.displayGridLines;
                this.settingsObj.yAxis.displayGridLines = this.settingsObj.displayGridLines;
                this.changeSettingsReloadGraph();
            };

            this.fiddleTickWidth = () => {
                this.settingsObj.xAxis.tickWidth = this.settingsObj.tickWidth;
                this.settingsObj.yAxis.tickWidth = this.settingsObj.tickWidth;
                this.changeSettingsReloadGraph();
            };

            this.fiddleStrokeWidth = () => {
                this.settingsObj.series[0].strokeWidth = this.settingsObj.strokeWidth;
                this.settingsObj.series[1].strokeWidth = this.settingsObj.strokeWidth;
                this.settingsObj.series[2].strokeWidth = this.settingsObj.strokeWidth;
                this.changeSettingsReloadGraph();
            };

            this.fiddleTickLength = () => {
                this.settingsObj.xAxis.tickLength = this.settingsObj.tickLength;
                this.settingsObj.yAxis.tickLength = this.settingsObj.tickLength;
                this.changeSettingsReloadGraph();
            };
        }]
    });