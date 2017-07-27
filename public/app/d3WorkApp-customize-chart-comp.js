/**
 * Created by Ray on 7/26/2017.
 */
angular.module('d3WorkApp')
    .component('customizeChartComponent', {
        bindings: {
            chartType: '@',
            chartData: '<',
            settings: '<'
        },
        templateUrl: '../html/customize-chart-component.html',
        controller: ['HttpService', function(HttpService) {
            this.$onInit = () => {
                this.settings = {};
                this.settings.legend = {};
                this.settings.legend.align = 'right';
                this.settings.legend.verticalAlign = 'top';

                this.settings.series = [];
                this.processedDataArray = [];
            };
            this.$postLink = () => {
                if (this.chartType === 'CUSTOMIZE') {
                    let colors = d3.scaleOrdinal(d3.schemeCategory10).range();
                    $.each($('input[name="seriesColor"]'), function (index) {
                        $(this).val(colors[index]);
                    });
                    $('#cp1').colorpicker({
                        color: $('#seriesColor1').val(),
                        format: "hex"
                    }).on('changeColor', function () {
                        this.prepareConfigObjAndRedraw();
                    });
                    $('#cp2').colorpicker({
                        color: $('#seriesColor2').val(),
                        format: "hex"
                    }).on('changeColor', function () {
                        this.prepareConfigObjAndRedraw();
                    });
                    $('#cp3').colorpicker({
                        color: $('#seriesColor3').val(),
                        format: "hex"
                    }).on('changeColor', function () {
                        this.prepareConfigObjAndRedraw();
                    });
                    $('#cpXTC').colorpicker({
                        color: $('#xAxisTickColor').val(),
                        format: "hex"
                    }).on('changeColor', function () {
                        this.prepareConfigObjAndRedraw();
                    });
                    $('#cpXLC').colorpicker({
                        color: $('#xAxisLabelColor').val(),
                        format: "hex"
                    }).on('changeColor', function () {
                        this.prepareConfigObjAndRedraw();
                    });
                    $('#cpYTC').colorpicker({
                        color: $('#yAxisTickColor').val(),
                        format: "hex"
                    }).on('changeColor', function () {
                        this.prepareConfigObjAndRedraw();
                    });
                    $('#cpYLC').colorpicker({
                        color: $('#yAxisLabelColor').val(),
                        format: "hex"
                    }).on('changeColor', function () {
                        this.prepareConfigObjAndRedraw();
                    });
                }
            };

            this.groupNAggregateNSortJSONData = (issuesRawData) => {
                return d3.nest()
                    .key(function(d) {
                        var year = parseInt(d3.timeParse("%d-%m-%Y")(d['Order Date']).getFullYear());
                        return year;
                    }).sortKeys(d3.ascending)
                    .entries(issuesRawData);
            };

            this.$onChanges = (changes) => {
                if (changes.chartData && !changes.chartData.isFirstChange()) {
                    this.processedDataArray = this.groupNAggregateNSortJSONData(this.chartData);
                    $.each(this.processedDataArray, function (index, value) {
                        $('#yearSelector').append($('<option/>', {
                            value: value.key,
                            text : value.key
                        }));
                    });
                    rc.addGraph({
                        chartContainerID: 'panelId',
                        unProcessedDataArray: this.processedDataArray[0].values,
                        chartType: this.chartType.toLowerCase()
                    });
                }
            };
        }]
    });