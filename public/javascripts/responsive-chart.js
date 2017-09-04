/**
 * Created by Ray on 25-01-2017.
 */
(function() {
// set up main rc object
    var rc = {};

// the major global objects under the rc namespace
    rc.dev = false; //set false when in production
    rc.tooltip = rc.tooltip || {}; // For the tooltip system
    rc.utils = rc.utils || {}; // Utility subsystem
    rc.models = rc.models || {}; //stores all the possible models/components
    rc.charts = {}; //stores all the ready to use charts
    rc.logs = {}; //stores some statistics and potential error messages
    rc.dom = {}; //DOM manipulation functions

// Node/CommonJS - require D3
    if (typeof(module) !== 'undefined' && typeof(exports) !== 'undefined' && typeof(d3) == 'undefined') {
        d3 = require('d3');
    }

    rc.dispatch = d3.dispatch('render_start', 'render_end');

    if (rc.dev) {
        rc.dispatch.on('render_start', function(e) {
            rc.logs.startTime = +new Date();
        });

        rc.dispatch.on('render_end', function(e) {
            rc.logs.endTime = +new Date();
            rc.logs.totalTime = rc.logs.endTime - rc.logs.startTime;
            rc.log('total', rc.logs.totalTime); // used for development, to keep track of graph generation times
        });
    }

    rc.log = function() {
        if (rc.dev && window.console && console.log && console.log.apply)
            console.log.apply(console, arguments);
        else if (rc.dev && window.console && typeof console.log == "function" && Function.prototype.bind) {
            var log = Function.prototype.bind.call(console.log, console);
            log.apply(console, arguments);
        }
        return arguments[arguments.length - 1];
    };

    rc.render = function(step) {
        // number of graphs to generate in each timeout loop
        step = step || 1;

        rc.render.active = true;
        rc.dispatch.call('render_start');

        var renderLoop = function() {
            var chart, graph;

            for (var i = 0; i < step && (graphConfigObj = rc.render.queue[i]); i++) {
                chart = rc.utils.generateChart(graphConfigObj);
            }

            rc.render.queue.splice(0, i);

            if (rc.render.queue.length) {
                setTimeout(renderLoop);
            } else {
                rc.dispatch.call('render_end');
                rc.render.active = false;
            }
        };

        setTimeout(renderLoop);
    };

    rc.render.active = false;
    rc.render.queue = [];

    rc.addGraph = function(obj) {
        if (rc.utils.isObjectEmpty(obj)) {
            return;
        }
        rc.render.queue.push(obj);

        if (!rc.render.active) {
            rc.render();
        }
    };

    if (typeof(module) !== 'undefined' && typeof(exports) !== 'undefined') {
        module.exports = rc;
    }

    if (typeof(window) !== 'undefined') {
        window.rc = rc;
    }

    rc.utils.generateChart = function(obj) {
        switch(obj.chartType) {
            case 'combined':
                rc.models.combinedChart(obj);
                break;
            case 'cluster':
                rc.models.radialDendogramChart(obj);
                break;
            case 'line':
                rc.models.lineChart(obj);
                break;
            case 'customize':
                rc.models.combinedChart(obj);
                break;
            case 'hierarchy':
                rc.models.hierarchyChart(obj);
                break;
            case 'chord':
                rc.models.chordChart(obj);
                break;
            case 'force':
                rc.models.forceChart(obj);
                break;
            case 'stacked':
                rc.models.stackedChart(obj);
                break;
            case 'treemap':
                rc.models.treeMapChart(obj);
                break;
            default:
                rc.models.combinedChart(obj);
        }
    };

    rc.utils.getChartContainer = function(obj) {
        if (obj.hasOwnProperty('chartContainerID') && obj.chartContainerID && obj.chartContainerID.trim().length) {
            return document.getElementById(obj.chartContainerID);
        } else {
            return document.getElementsByTagName('body');
        }
    };

    rc.utils.isObjectEmpty = function(obj) {
        if ('object' !== typeof obj) {
            throw new Error('Object must be specified.');
        }

        if (null === obj) {
            return true;
        }

        if ('undefined' !== Object.keys) {
            // Using ECMAScript 5 feature.
            return (0 === Object.keys(obj).length);
        } else {
            // Using legacy compatibility mode.
            for (var key in obj) {
                if (obj.hasOwnProperty(key)) {
                    return false;
                }
            }
            return true;
        }
    };

    rc.utils.addResizeEventHandler = function(chartContainer, resizeTheChart) {
        window.addEventListener('resize', function() {chartContainer.dispatchEvent(new Event('resize'));});
        chartContainer.addEventListener('resize', resizeTheChart);
    };

    rc.utils.addCustomEventHandler = function(chartContainer, customEventHandler) {
        window.addEventListener('customEvent', function(e) {
            chartContainer.dispatchEvent(new CustomEvent('customEvent'));
        });
        chartContainer.addEventListener('customEvent', customEventHandler);
    };

    rc.utils.getAxisLabelColor = (axisObj) => {
        if (axisObj !== undefined && axisObj.labelColor !== undefined && axisObj.labelColor.length !== 0) {
            return axisObj.labelColor;
        } else {
            return '#000000';
        }
    };

    rc.utils.getAxisTickColor = (axisObj) => {
        if (axisObj !== undefined && axisObj.tickColor !== undefined && axisObj.tickColor.length !== 0) {
            return axisObj.tickColor;
        } else {
            return '#000000';
        }
    };

    rc.utils.getPropValue = (obj, propName, defaultValue) => {
        if (obj !== undefined && obj[propName] !== undefined) {
            return obj[propName];
        } else {
            return defaultValue;
        }
    };

    rc.utils.getAxisTickWidth = (axisObj) => {
        return rc.utils.getPropValue(axisObj, 'tickWidth', 1);
    };

    rc.utils.getTickLabelFontSize = (axisObj) => {
        return rc.utils.getPropValue(axisObj, 'tickLabelFontSize', 10);
    };

    rc.utils.getTickLength = (axisObj) => {
        return rc.utils.getPropValue(axisObj, 'tickLength', 6);
    };

    rc.utils.getDisplayGridLines = (axisObj) => {
        return rc.utils.getPropValue(axisObj, 'displayGridLines', false);
    };

    rc.utils.getLayoutType = (obj) => {
        return rc.utils.getPropValue(obj, 'layoutType', 0);
    };

    rc.models.combinedChart = function(obj) {
        var breakPoint = 768,
            chartContainer = rc.utils.getChartContainer(obj),
            chartContainerInnerWidth, chartPlotAreaInnerWidth, svg, margin, width, height, innerHeight;

        svg = d3.select(chartContainer).append('svg');
        var canvasInnerWrapper = svg.append('g'),
            scaleX = d3.scaleBand().paddingInner(0.1).paddingOuter(0.03),
            scaleX1 = d3.scaleBand().padding(0.01),
            scaleY = d3.scaleLinear(),
            scaleZ = (undefined !== obj.series && obj.series.map(function(d) { return d.color; }).length > 0) ? d3.scaleOrdinal().range(obj.series.map(function(d) { return d.color; })) : d3.scaleOrdinal(d3.schemeCategory10),
            xAxisTicks = d3.set(),
            xAxisTicks1 = d3.set(),
            invisibleSeries = d3.set(),
            visibleBarNColumnSeries = d3.set(),
            unProcessedDataArray = obj.unProcessedDataArray,
            processedData = [],
            prevYaxisOrient = (chartContainerInnerWidth > breakPoint) ? 'left' : 'right';
        updateDimensions();
        var line = d3.line()
            .curve(d3.curveLinear)
            .x(function(d) {
                return scaleX(d.key) + scaleX.bandwidth()/2;
            })
            .y(function(d) {
                return scaleY(d.value);
            });

        processTheRawDataAndDrawGraph();
        rc.utils.addResizeEventHandler(chartContainer, resizeTheChart);

        function updateDimensions() {
            chartContainerInnerWidth = chartContainer.offsetWidth - 30;
            margin = chartContainerInnerWidth > breakPoint ? {top: 20, right: 80, bottom: 30, left: 50} : {top: 20, right: 0, bottom: 30, left: 0};
            width = chartContainerInnerWidth > 960 ? 960 : (chartContainerInnerWidth > breakPoint ? breakPoint : chartContainerInnerWidth);
            width = width - parseFloat(getComputedStyle(chartContainer).paddingLeft) - parseFloat(getComputedStyle(chartContainer).paddingRight);
            height = 0.6 * width;
            innerHeight = height - margin.top - margin.bottom;
            chartPlotAreaInnerWidth = width - margin.left - margin.right;
            svg.attr('height', height)
                .attr('width', width);
            canvasInnerWrapper.attr('transform', 'translate(' + margin.left + ', ' + margin.top + ')');
            scaleX.range([0, chartPlotAreaInnerWidth]);
            scaleY.range([innerHeight, 0]);
        }

        function processTheRawDataAndDrawGraph() {
            processedData = groupNAggregateNSortJSONData(unProcessedDataArray);
            addPreFixNSuffix();
            drawCompleteChart(false)
        }

        function fetchIssuesAndDrawGraph(updateChart) {
            d3.tsv('/helper/superstore-sample-data.tsv', function(err, data) {
                unProcessedDataArray = unProcessedDataArray.concat(data);
                processedData = groupNAggregateNSortJSONData(unProcessedDataArray);
                addPreFixNSuffix();
                drawCompleteChart(processedData, updateChart);
            });
        }

        function addPreFixNSuffix() {
            addPreFixNSuffixToX();
            addPreFixNSuffixToY();
        }

        function addPreFixNSuffixToX() {
            processedData = processedData.map(function(d) {
                d.values = d.values.map(function(d) {
                    d.key = 'Q' + ++d.key;
                    return d;
                });
                return d;
            });
            xAxisTicks = d3.set(xAxisTicks.values().map(function (d) {
                d = 'Q' + ++d;
                return d;
            }));
        }

        function addPreFixNSuffixToY() {
        }

        function drawCompleteChart(updateChart) {
            configureAxes();
            renderAxes(updateChart);
            drawSeries();
            drawLegend();
        }

        function drawCompleteChartOnResize() {
            renderAxes(true);
            drawSeries();
            drawLegend();
        }

        function configureAxes() {
            configureBottomAxisScale();
            configureLeftAxisScale(processedData);
            configureSeriesZAxis(processedData);
            configureGroupedBottomAxisScale(processedData);
        }

        function renderAxes(updateChart) {
            drawBottomAxis(updateChart);
            drawLeftAxis(updateChart);
        }

        function horizontallyAlignLegend(rect, text,  legendObj) {
            var horizontalAlignment = (legendObj !== undefined && legendObj.align !== undefined) ? legendObj.align : '';
            switch(horizontalAlignment) {
                case 'left':
                    rect.attr("x", 0);
                    text.attr("x", 24)
                        .attr("text-anchor", "start");
                    break;
                case 'center':
                    rect.attr("x", chartPlotAreaInnerWidth/2);
                    text.attr("x", chartPlotAreaInnerWidth/2 + 24)
                        .attr("text-anchor", "start");
                    break;
                case 'right':
                    rect.attr("x", chartPlotAreaInnerWidth - 17);
                    text.attr("x", chartPlotAreaInnerWidth - 24)
                        .attr("text-anchor", "end");
                    break;
                default:
                    rect.attr("x", chartPlotAreaInnerWidth - 17);
                    text.attr("x", chartPlotAreaInnerWidth - 24)
                        .attr("text-anchor", "end");
                    break;
            }
        }

        function verticallyAlignLegend(legend, legendObj) {
            var verticalAlignment = (legendObj !== undefined && legendObj.verticalAlign !== undefined) ? legendObj.verticalAlign : '';
            switch(verticalAlignment) {
                case 'top':
                    legend.attr("transform", function(d, i) { return "translate(0," + i * 20 + ")"; });
                    break;
                case 'middle':
                    legend.attr("transform", function(d, i) { return "translate(0," + ((innerHeight/2 - processedData.length*20/2) + (i * 20)) + ")"; });
                    break;
                case 'bottom':
                    legend.attr("transform", function(d, i) { return "translate(0," + ((innerHeight - processedData.length*20) + (i * 20)) + ")"; });
                    break;
                default:
                    legend.attr("transform", function(d, i) { return "translate(0," + i * 20 + ")"; });
                    break;
            }
        }

        function drawLegend() {
            var legend = canvasInnerWrapper.selectAll(".legend")
                .data(processedData);

            verticallyAlignLegend(legend, obj.legend);
            var rect = legend.select('rect')
                .attr("width", 16)
                .attr("height", 16)
                .attr("fill", function(d) {
                    return !d.invisible ? scaleZ(d.key) : '#ffffff';
                })
                .attr("stroke", function(d) {
                    return scaleZ(d.key);
                })
                .attr("stroke-width", 2);
            var text = legend.select("text")
                .attr("y", 9)
                .attr("dy", ".35em")
                .attr("text-anchor", "end")
                .text(function(d) {
                    return d.key;
                });
            horizontallyAlignLegend(rect, text, obj.legend);
            var legendEnter = legend.enter().append("g")
                .attr("class", "legend")
                .style("font", "10px sans-serif");
            verticallyAlignLegend(legendEnter, obj.legend);

            var legendEnterRect = legendEnter.append("rect")
                .attr("width", 16)
                .attr("height", 16)
                .attr("fill", function(d) {
                    return !d.invisible ? scaleZ(d.key) : '#ffffff';
                })
                .attr("stroke", function(d) {
                    return scaleZ(d.key);
                })
                .attr("stroke-width", 2);

            var legendEnterTxt = legendEnter.append("text")
                .attr("x", chartPlotAreaInnerWidth - 24)
                .attr("y", 9)
                .attr("dy", ".35em")
                .text(function(d) {
                    return d.key;
                });
            horizontallyAlignLegend(legendEnterRect, legendEnterTxt, obj.legend);
            legend.exit().remove();

            legend = canvasInnerWrapper.selectAll(".legend");
            legend.on('click', function(d) {
                d.invisible = !d.invisible;
                d.values.forEach(function(item, index) {
                    item.invisible = !item.invisible;
                });
                invisibleSeries.has(d.key) ? invisibleSeries.remove(d.key) : invisibleSeries.add(d.key);
                drawCompleteChart(true);
            });
        }

        function acceptOnly2016(obj) {
            return d3.timeParse("%d-%m-%Y")(obj['Order Date']).getFullYear() === 2016;
        }

        function groupNAggregateNSortJSONData(issuesRawData) {
            var seriesData = d3.nest()
                .key(function(d) {
                    var year = parseInt(d3.timeParse("%d-%m-%Y")(d['Order Date']).getFullYear());
                    xAxisTicks1.add(year);
                    return year;
                }).sortKeys(d3.ascending)
                .key(function(d) {
                    return d['Product Category'];
                })
                .key(function(d) {
                    var qNumber = parseInt(d3.timeParse("%d-%m-%Y")(d['Order Date']).getMonth()/3);
                    xAxisTicks.add(qNumber);
                    return qNumber;
                }).sortKeys(d3.ascending)
                .rollup(function(v) { return v.length; })
                .entries(issuesRawData);
            seriesData.map(function(d) {
                if (invisibleSeries.has(d.key)) {
                    d.invisible = true;
                    d.values.forEach(function(item, index) {
                        item.invisible = true;
                    });
                } else {
                    return d;
                }
            });
            return seriesData[seriesData.length - 1].values;
        }

        function configureLeftAxisScale(ticksArray) {
            var minValue = d3.min(ticksArray.filter(function(d) {return !d.invisible;}), function(c) {
                return d3.min(c.values, function(d) {
                    return d.value;
                });
            });
            (minValue = minValue === undefined ? 0 : minValue) !== 0 ? minValue-- : minValue
            var maxValue = d3.max(ticksArray.filter(function(d) {return !d.invisible;}), function(c) {
                return d3.max(c.values, function(d) {
                    return d.value;
                });
            });
            maxValue = maxValue === undefined ? 0 : maxValue;
            scaleY.domain([minValue, maxValue]);
        }

        function getAxisLabelColor(axisObj) {
            if (axisObj !== undefined && axisObj.labelColor !== undefined && axisObj.labelColor.length !== 0) {
                return axisObj.labelColor;
            } else {
                return '#000000';
            }
        }

        function getAxisTickColor(axisObj) {
            if (axisObj !== undefined && axisObj.tickColor !== undefined && axisObj.tickColor.length !== 0) {
                return axisObj.tickColor;
            } else {
                return '#000000';
            }
        }

        function getAxisTickWidth(axisObj) {
            if (axisObj !== undefined && axisObj.tickWidth !== undefined) {
                return axisObj.tickWidth;
            } else {
                return 1;
            }
        }

        function getTickLabelFontSize(axisObj) {
            if (axisObj !== undefined && axisObj.tickLabelFontSize !== undefined) {
                return axisObj.tickLabelFontSize;
            } else {
                return 10;
            }
        }

        function getTickLength(axisObj) {
            if (axisObj !== undefined && axisObj.tickLength !== undefined) {
                return axisObj.tickLength;
            } else {
                return 6;
            }
        }

        function getDisplayGridLines(axisObj) {
            if (axisObj !== undefined && axisObj.displayGridLines !== undefined) {
                return Boolean(axisObj.displayGridLines);
            } else {
                return false;
            }
        }

        function drawLeftAxis(updateChart) {
            var changeDevice = false;
            if (chartContainerInnerWidth > breakPoint && prevYaxisOrient === 'right') {
                changeDevice = true;
            } else if (chartContainerInnerWidth <= breakPoint && prevYaxisOrient === 'left') {
                changeDevice = true;
            }
            prevYaxisOrient = chartContainerInnerWidth > breakPoint ? 'left' : 'right';
            var tickLabelAxisGrp;
            if  (updateChart) {
                var t = d3.transition()
                    .duration(500)
                    .ease(d3.easeLinear);
                if (changeDevice) {
                    canvasInnerWrapper.selectAll('.axis.axis--y').remove();
                    if (getDisplayGridLines(obj.yAxis)) {
                        canvasInnerWrapper.insert("g", ":first-child")
                            .attr("class", "axis axis--y axis-for-grid-lines")
                            .call(chartContainerInnerWidth > breakPoint ? d3.axisLeft(scaleY).tickSizeInner(-chartPlotAreaInnerWidth) : d3.axisRight(scaleY).tickArguments([innerHeight/50]).tickSizeInner(chartPlotAreaInnerWidth))
                            .selectAll("text").remove();
                    }
                    tickLabelAxisGrp = canvasInnerWrapper.append("g")
                        .attr("class", "axis axis--y axis-for-ticks-labels-axis")
                        .call(chartContainerInnerWidth > breakPoint ? d3.axisLeft(scaleY).tickSizeInner(getTickLength(obj.yAxis)).tickSizeOuter(0) : d3.axisRight(scaleY).tickArguments([innerHeight/50]).tickSizeInner(getTickLength(obj.yAxis)).tickSizeOuter(0));
                } else {
                    if (getDisplayGridLines(obj.yAxis)) {
                        canvasInnerWrapper.select('.axis.axis--y.axis-for-grid-lines')
                            .transition(t)
                            .call(chartContainerInnerWidth > breakPoint ? d3.axisLeft(scaleY).tickSizeInner(-chartPlotAreaInnerWidth) : d3.axisRight(scaleY).tickArguments([innerHeight / 50]).tickSizeInner(chartPlotAreaInnerWidth))
                            .selectAll("text").remove();
                    }
                    tickLabelAxisGrp = canvasInnerWrapper.select('.axis.axis--y.axis-for-ticks-labels-axis')
                        .transition(t)
                        .call(chartContainerInnerWidth > breakPoint ? d3.axisLeft(scaleY).tickSizeInner(getTickLength(obj.yAxis)).tickSizeOuter(0): d3.axisRight(scaleY).tickArguments([innerHeight/50]).tickSizeInner(getTickLength(obj.yAxis)).tickSizeOuter(0));

                }
            } else {
                if (getDisplayGridLines(obj.yAxis)) {
                    canvasInnerWrapper.insert("g", ":first-child")
                        .attr("class", "axis axis--y axis-for-grid-lines")
                        .call(chartContainerInnerWidth > breakPoint ? d3.axisLeft(scaleY).tickSizeInner(-chartPlotAreaInnerWidth) : d3.axisRight(scaleY).tickArguments([innerHeight / 50]).tickSizeInner(chartPlotAreaInnerWidth))
                        .selectAll("text").remove();
                }
                tickLabelAxisGrp = canvasInnerWrapper.append("g")
                    .attr("class", "axis axis--y axis-for-ticks-labels-axis")
                    .call(chartContainerInnerWidth > breakPoint ? d3.axisLeft(scaleY).tickSizeInner(getTickLength(obj.yAxis)).tickSizeOuter(0) : d3.axisRight(scaleY).tickArguments([innerHeight/50]).tickSizeInner(getTickLength(obj.yAxis)).tickSizeOuter(0));
            }
            tickLabelAxisGrp.selectAll('text')
                .attr('fill', getAxisLabelColor(obj.yAxis))
                .attr('font-size', getTickLabelFontSize(obj.yAxis));
            tickLabelAxisGrp.selectAll('line')
                .attr('stroke', getAxisTickColor(obj.yAxis))
                .style('stroke', getAxisTickColor(obj.yAxis))
                .style('stroke-width', getAxisTickWidth(obj.yAxis));
        }

        function configureBottomAxisScale() {
            scaleX.domain(xAxisTicks.values().sort());
        }

        function drawBottomAxis(updateChart) {
            var tickLabelAxisGrp;
            if  (updateChart) {
                var t = d3.transition()
                    .duration(500)
                    .ease(d3.easeLinear);
                if (getDisplayGridLines(obj.xAxis)) {
                    canvasInnerWrapper.select('.axis.axis--x.axis-for-grid-lines')
                        .attr("transform", "translate(0," + innerHeight + ")")
                        .transition(t)
                        .call(d3.axisBottom(scaleX).tickSizeOuter(0).tickSizeInner(-innerHeight))
                        .selectAll("text").remove();
                }
                tickLabelAxisGrp = canvasInnerWrapper.select('.axis.axis--x.axis-for-ticks-labels-axis')
                    .attr("transform", "translate(0," + innerHeight + ")")
                    .transition(t)
                    .call(d3.axisBottom(scaleX).tickSizeInner(getTickLength(obj.xAxis)).tickSizeOuter(0));
            } else {
                if (getDisplayGridLines(obj.xAxis)) {
                    canvasInnerWrapper.insert("g", ":first-child")
                        .attr("class", "axis axis--x axis-for-grid-lines")
                        .attr("transform", "translate(0," + innerHeight + ")")
                        .call(d3.axisBottom(scaleX).tickSizeOuter(0).tickSizeInner(-innerHeight))
                        .selectAll("text").remove();
                }
                tickLabelAxisGrp = canvasInnerWrapper.append('g')
                    .attr("class", "axis axis--x axis-for-ticks-labels-axis")
                    .attr("transform", "translate(0," + innerHeight + ")")
                    .call(d3.axisBottom(scaleX).tickSizeInner(getTickLength(obj.xAxis)).tickSizeOuter(0));
            }
            tickLabelAxisGrp.selectAll('text')
                .attr('fill', getAxisLabelColor(obj.xAxis))
                .attr('font-size', getTickLabelFontSize(obj.xAxis));
            tickLabelAxisGrp.selectAll('line')
                .attr('stroke', getAxisTickColor(obj.xAxis))
                .style('stroke', getAxisTickColor(obj.xAxis))
                .style('stroke-width', getAxisTickWidth(obj.xAxis));
        }

        function configureSeriesZAxis(seriesData) {
            scaleZ.domain(seriesData.map(function(c) { return c.key; }));
        }

        function configureGroupedBottomAxisScale(seriesData) {
            // calculate the total bar series and column series. so that the x axis category can be divided in that many equal columns.
            scaleX1.domain(seriesData.filter(function(d, i) {
                if (i%2 === 0 && !d.invisible) {
                    visibleBarNColumnSeries.add(d.key);
                    return d.key;
                }
            }).map(function(c) { return c.key; })).rangeRound([0, scaleX.bandwidth()]);
        }

        function drawSeries() {
            processedData.map(function (d, i) {
                if (i % 2 === 0) {
                    drawColumnSeries([processedData[i]], i);
                } else {
                    drawLineSeries([processedData[i]], i);
                }
            });
        }

        function drawLineSeries(lineSeriesData, index) {
            var t = d3.transition()
                .duration(500)
                .ease(d3.easeLinear);
            var seriesConfigObj = {};
            if (obj.series !== undefined && (obj.series.length > (index + 1))) {
                seriesConfigObj = obj.series[index];
            }
            var priority = canvasInnerWrapper.selectAll('.series.line-series.series-' + index)
                .data(lineSeriesData);
            priority.select('.line')
                .attr("stroke-dasharray", 0)
                .attr("stroke-dashoffset", 0)
                .transition(t)
                .attr('d', function(d) {
                    return !d.invisible ? line(d.values) : null;
                })
                .attr("fill", "none")
                .style('stroke', function(d) {
                    return scaleZ(d.key);
                })
                .style('stroke-width', seriesConfigObj.strokeWidth !== undefined ? seriesConfigObj.strokeWidth : 2)
                .style('stroke-linejoin', 'round')
                .style('stroke-linecap', 'round');
            var priorityEnter = priority.enter()
                .append('g')
                .attr('class', 'series line-series series-' + index);
            var lineSeriesPath = priorityEnter.append('path')
                .attr('class', 'line')
                .attr('d', function(d) {
                    return !d.invisible ? line(d.values) : null;
                })
                .attr("fill", "none")
                .style('stroke', function(d) {
                    return scaleZ(d.key);
                })
                .style('stroke-width', seriesConfigObj.strokeWidth !== undefined ? seriesConfigObj.strokeWidth : 2)
                .style('stroke-linejoin', 'round')
                .style('stroke-linecap', 'round')
                .attr("stroke-dasharray", function(d) { return this.getTotalLength() })
                .attr("stroke-dashoffset", function(d) { return this.getTotalLength() });
            priority.exit().remove();

            var dataPoints = canvasInnerWrapper.selectAll('.series.line-series.series-' + index)
                .selectAll('.data-point')
                .data(function(d) {
                    return d.values.map(function(element) {
                        element.parentKey = d.key;
                        return element;
                    });
                });
            dataPoints.transition(t)
                .attr("r", function(d) {
                    return !d.invisible ? 4 : 0;
                })
                .attr("fill", function(d) {
                    return scaleZ(d.parentKey);
                })
                .attr("stroke", function(d) {
                    return scaleZ(d.parentKey);
                })
                .attr("cx", function(d) {
                    return scaleX(d.key) + scaleX.bandwidth()/2;
                })
                .attr("cy", function(d) {
                    return scaleY(d.value);
                });
            dataPoints.enter()
                .append('circle')
                .attr('class', 'data-point')
                .attr("r", 0)
                .attr("fill", function(d) {
                    return scaleZ(d.parentKey);
                })
                .attr("stroke", function(d) {
                    return scaleZ(d.parentKey);
                })
                .attr("cx", function(d) {
                    return scaleX(d.key) + scaleX.bandwidth()/2;
                })
                .attr("cy", function(d) {
                    return scaleY(d.value);
                });

            lineSeriesPath.transition(t)
                .delay(400)
                .tween("line", function() {
                    var totalLength = this.getTotalLength();
                    var interp = d3.interpolateNumber(totalLength, 0);
                    var self = this;
                    return function(t) {
                        var offset = interp(t);
                        d3.select(self).attr("stroke-dashoffset", offset);
                        var xPos = self.getPointAtLength(totalLength - offset).x;
                        canvasInnerWrapper.selectAll(".data-point").each(function() {
                            var point = d3.select(this);
                            if (xPos > parseInt(point.attr('cx'))) {
                                point.attr("r", 4);
                            }
                        })
                    };
                });

            canvasInnerWrapper.selectAll('.series.line-series.series-' + index)
                .selectAll('.data-point')
                .on("mouseover", function(){
                    d3.select(this).classed('hover', true);
                    return d3.select('.data-points-tooltip').classed("in", true).style('border-color', scaleZ(d3.select(this).data()[0].parentKey))
                        .select('.tooltip-inner').html('<div>' + d3.select(this).data()[0].key + '</div><div><div id="circle" style="background-color: ' + scaleZ(d3.select(this).data()[0].parentKey) + '"></div>&nbsp;' + d3.select(this).data()[0].parentKey + '&nbsp;' + d3.select(this).data()[0].value + '</div>');
                })
                .on("mousemove", function(){
                    return d3.select('.data-points-tooltip').style("top", (d3.event.pageY-10)+"px").style("left",(d3.event.pageX+10)+"px");
                })
                .on("mouseout", function(){
                    d3.select(this).classed('hover', false);
                    return d3.select('.data-points-tooltip').classed("in", false);
                });
            dataPoints.exit().remove();
        }

        function drawColumnSeries(columnSeriesData, index) {
            var t = d3.transition()
                .duration(500)
                .ease(d3.easeLinear);
            var priority = canvasInnerWrapper.selectAll('.series.bar-series.series-' + index)
                .data(columnSeriesData);
            var priorityEnter = priority.enter()
                .insert("g", "g.series")
                .attr('class', 'series bar-series series-' + index);
            priority.exit().remove();

            var columns = canvasInnerWrapper.selectAll('.series.bar-series.series-' + index)
                .selectAll('.bar')
                .data(function(d) {
                    return d.values.filter(function(element) {
                        if(!element.invisible) {
                            element.parentKey = d.key;
                            return element;
                        }
                    });
                });
            columns.transition(t)
                .attr("fill", function(d) {
                    return scaleZ(d.parentKey);
                })
                .attr("x", function(d) {
                    return scaleX(d.key) + scaleX1(d.parentKey);
                })
                .attr("y", function(d) {
                    return scaleY(d.value);
                })
                .attr("width", scaleX1.bandwidth())
                .attr("height", function(d) {
                    return innerHeight - scaleY(d.value);
                });

            var columnsEnter = columns.enter()
                .append('rect')
                .attr('class', 'bar')
                .attr("fill", function(d) {
                    return scaleZ(d.parentKey);
                })
                .attr("x", function(d) {
                    return scaleX(d.key) + scaleX1(d.parentKey);
                })
                .attr("width", scaleX1.bandwidth())
                .attr("y", function(d) {
                    return innerHeight;
                })
                .attr("height", function(d) {
                    return 0;
                });
            columnsEnter.transition(t.delay(100))
                .attr("y", function(d) {
                    return scaleY(d.value);
                })
                .attr("height", function(d) {
                    return innerHeight - scaleY(d.value);
                });

            displayValueOnColumnNBar(index);

            canvasInnerWrapper.selectAll('.series.bar-series.series-' + index)
                .selectAll('.bar')
                .on("mouseover", function(){
                    d3.select(this).classed('hover', true);
                    return d3.select('.data-points-tooltip').classed("in", true).style('border-color', scaleZ(d3.select(this).data()[0].parentKey))
                        .select('.tooltip-inner').html('<div>' + d3.select(this).data()[0].key + '</div><div><div id="circle" style="background-color: ' + scaleZ(d3.select(this).data()[0].parentKey) + '"></div>&nbsp;' + d3.select(this).data()[0].parentKey + '&nbsp;' + d3.select(this).data()[0].value + '</div>');
                })
                .on("mousemove", function(){
                    return d3.select('.data-points-tooltip').style("top", (d3.event.pageY-10)+"px").style("left",(d3.event.pageX+10)+"px");
                })
                .on("mouseout", function(){
                    d3.select(this).classed('hover', false);
                    return d3.select('.data-points-tooltip').classed("in", false);
                });
            columns.exit().remove();
        }

        function displayValueOnColumnNBar(index) {
            if (!(obj.displayValueOnColBar && Boolean(obj.displayValueOnColBar))) {
                return false;
            }
            var t = d3.transition()
                .duration(500)
                .ease(d3.easeLinear);
            var columnsValue = canvasInnerWrapper.selectAll('.series.bar-series.series-' + index)
                .selectAll('text')
                .data(function(d) {
                    return d.values.filter(function(element) {
                        if(!element.invisible && (innerHeight - scaleY(element.value)) > 20) {
                            element.parentKey = d.key;
                            return element;
                        }
                    });
                });
            columnsValue.attr("class", "value")
                .attr("x", function(d) {
                    return scaleX(d.key) + scaleX1(d.parentKey) + (scaleX1.bandwidth()/2);
                })
                .attr("text-anchor", "middle")
                .text(function(d){
                    return (d.value);
                })
                .attr('fill', '#ffffff')
                .style('font-weight', 'bold')
                .transition(t)
                .attr("y", function(d) {
                    return scaleY(d.value) + 15;
                });

            var columnsValueEnter = columnsValue.enter()
                .append('text')
                .attr('class', 'value')
                .attr("x", function(d) {
                    return scaleX(d.key) + scaleX1(d.parentKey) + (scaleX1.bandwidth()/2);
                })
                .attr("y", function(d) {
                    return innerHeight;
                })
                .attr("text-anchor", "middle")
                .text(function(d){
                    return (d.value);
                })
                .attr('fill', '#ffffff')
                .style('font-weight', 'bold');
            columnsValueEnter.transition(t.delay(100))
                .attr("y", function(d) {
                    return scaleY(d.value) + 15;
                });

            columnsValue.exit().remove();
        }

        function resizeTheChart() {
            updateDimensions();
            drawCompleteChart(true);
        }
    };

    rc.models.radialDendogramChart = function(obj) {
        var breakPoint = 768,
            chartContainer = rc.utils.getChartContainer(obj),
            chartContainerInnerWidth,
            chartPlotAreaInnerWidth, svg, margin, width, height,
            unProcessedDataArray = obj.unProcessedDataArray,
            processedData = [];

        svg = d3.select(chartContainer).append('svg');
        var canvasInnerWrapper = svg.append('g');
        var stratify = d3.stratify()
            .parentId(function(d) { return d.id.substring(0, d.id.lastIndexOf(".")); });
        var cluster = d3.cluster();

        processedData = stratify(unProcessedDataArray)
            .sort(function(a, b) { return a.height - b.height || a.id.localeCompare(b.id); });
        updateDimensions();
        drawCompleteChart();
        rc.utils.addResizeEventHandler(chartContainer, resizeTheChart);

        function resizeTheChart() {
            updateDimensions();
            drawCompleteChart();
        }

        function drawCompleteChart() {
            var t = d3.transition()
                .duration(500)
                .ease(d3.easeLinear);
            var link = canvasInnerWrapper.selectAll(".link")
                .data(processedData.descendants().slice(1));
            link.transition(t)
                .attr("d", function(d) {
                    return "M" + project(d.x, d.y)
                        + " C" + project(d.x, (d.y + d.parent.y) / 2)
                        + " " + project(d.parent.x, (d.y + d.parent.y) / 2)
                        + " " + project(d.parent.x, d.parent.y);
                });

            link.exit().remove();

            link.enter().append("path")
                .attr("class", "link")
                .transition(t)
                .attr("d", function(d) {
                    return "M" + project(d.x, d.y)
                        + " C" + project(d.x, (d.y + d.parent.y) / 2)
                        + " " + project(d.parent.x, (d.y + d.parent.y) / 2)
                        + " " + project(d.parent.x, d.parent.y);
                });

            var node = canvasInnerWrapper.selectAll(".node")
                .data(processedData.descendants());
            node.transition(t)
                .attr("class", function(d) { return "node" + (d.children ? " node--internal" : " node--leaf"); })
                .attr("transform", function(d) { return "translate(" + project(d.x, d.y) + ")"; });

            node.exit().remove();

            var nodeEnter = node.enter().append("g");

            nodeEnter.transition(t)
                .attr("class", function(d) { return "node" + (d.children ? " node--internal" : " node--leaf"); })
                .attr("transform", function(d) { return "translate(" + project(d.x, d.y) + ")"; });

            nodeEnter.append("circle")
                .transition(t)
                .attr("r", 2.5);

            nodeEnter.append("text")
                .transition(t)
                .attr("dy", "0.31em")
                .attr("x", function(d) { return d.x < 180 === !d.children ? 6 : -6; })
                .style("text-anchor", function(d) { return d.x < 180 === !d.children ? "start" : "end"; })
                .attr("transform", function(d) { return "rotate(" + (d.x < 180 ? d.x - 90 : d.x + 90) + ")"; })
                .text(function(d) { return d.id.substring(d.id.lastIndexOf(".") + 1); });
        }

        function updateDimensions() {
            chartContainerInnerWidth = chartContainer.offsetWidth - parseFloat(getComputedStyle(chartContainer).paddingLeft) - parseFloat(getComputedStyle(chartContainer).paddingRight);
            width = chartContainerInnerWidth > 960 ? 960 : (chartContainerInnerWidth > breakPoint ? breakPoint : chartContainerInnerWidth);
            height = width;
            svg.attr('height', height)
                .attr('width', width);
            canvasInnerWrapper.attr('transform', 'translate(' + width/2 + ', ' + (height/2) + ')');
            cluster.size([360, width / 2 - 120]);
            cluster(processedData);

        }

        function project(x, y) {
            var angle = (x - 90) / 180 * Math.PI, radius = y;
            return [radius * Math.cos(angle), radius * Math.sin(angle)];
        }
    }

    rc.models.lineChart = (obj) => {
        var breakPoint = 768,
            chartContainer = rc.utils.getChartContainer(obj),
            chartContainerInnerWidth, chartPlotAreaInnerWidth, svg, margin, width, height, innerHeight;

        svg = d3.select(chartContainer).append('svg');
        let canvasInnerWrapper = svg.append('g'),
            scaleX = d3.scalePoint(),
            scaleY = d3.scaleLinear(),
            scaleZ = (undefined !== obj.series && obj.series.map(function(d) { return d.color; }).length > 0) ? d3.scaleOrdinal().range(obj.series.map(function(d) { return d.color; })) : d3.scaleOrdinal(d3.schemeCategory10),
            xAxisTicks = d3.set(),
            invisibleSeries = d3.set(),
            unProcessedDataArray = [],
            processedData = [],
            prevYaxisOrient = (chartContainerInnerWidth > breakPoint) ? 'left' : 'right';
        updateDimensions();
        var line = d3.line()
            .curve(d3.curveLinear)
            .x(function(d) {
                return scaleX(d.key);
            })
            .y(function(d) {
                return scaleY(d.value);
            });

        d3.json("/filter/13974", function(error, data) {
            fetchIssuesAndDrawGraph({'searchUrl': data.searchUrl, 'startAt': 0, 'maxResults': 50}, false);
        });

        function fetchIssuesAndDrawGraph(jsonObj, updateChart) {
            d3.json("/issue")
                .header("Content-Type", "application/json")
                .post(JSON.stringify({'searchUrl': jsonObj.searchUrl, 'startAt': parseInt(jsonObj.startAt), 'maxResults': parseInt(jsonObj.maxResults)}),
                    function(err, data){
                        unProcessedDataArray = unProcessedDataArray.concat(data.result);
                        console.log("got response for issues the length of data is : " + unProcessedDataArray.length);
                        processTheRawDataAndDrawGraph(updateChart);
                        if (parseInt(data.total) - (parseInt(data.startAt) + parseInt(data.maxResults)) > 0) {
                            fetchIssuesAndDrawGraph({'searchUrl': jsonObj.searchUrl, 'startAt': parseInt(data.startAt) + parseInt(data.maxResults), 'maxResults': data.maxResults}, true);
                        }
                    }
                );
        }
        rc.utils.addResizeEventHandler(chartContainer, resizeTheChart);

        function processTheRawDataAndDrawGraph(updateChart) {
            processedData = groupNAggregateNSortJSONData(unProcessedDataArray);
            //addPreFixNSuffix();
            drawCompleteChart(updateChart)
        }

        function drawCompleteChart(updateChart) {
            configureAxes();
            renderAxes(updateChart);
            drawLineSeries();
            drawLegend();
        }

        function horizontallyAlignLegend(rect, text,  legendObj) {
            var horizontalAlignment = (legendObj !== undefined && legendObj.align !== undefined) ? legendObj.align : '';
            switch(horizontalAlignment) {
                case 'left':
                    rect.attr("x", 0);
                    text.attr("x", 24)
                        .attr("text-anchor", "start");
                    break;
                case 'center':
                    rect.attr("x", chartPlotAreaInnerWidth/2);
                    text.attr("x", chartPlotAreaInnerWidth/2 + 24)
                        .attr("text-anchor", "start");
                    break;
                case 'right':
                    rect.attr("x", chartPlotAreaInnerWidth - 17);
                    text.attr("x", chartPlotAreaInnerWidth - 24)
                        .attr("text-anchor", "end");
                    break;
                default:
                    rect.attr("x", chartPlotAreaInnerWidth - 17);
                    text.attr("x", chartPlotAreaInnerWidth - 24)
                        .attr("text-anchor", "end");
                    break;
            }
        }

        function verticallyAlignLegend(legend, legendObj) {
            var verticalAlignment = (legendObj !== undefined && legendObj.verticalAlign !== undefined) ? legendObj.verticalAlign : '';
            switch(verticalAlignment) {
                case 'top':
                    legend.attr("transform", function(d, i) { return "translate(0," + i * 20 + ")"; });
                    break;
                case 'middle':
                    legend.attr("transform", function(d, i) { return "translate(0," + ((innerHeight/2 - processedData.length*20/2) + (i * 20)) + ")"; });
                    break;
                case 'bottom':
                    legend.attr("transform", function(d, i) { return "translate(0," + ((innerHeight - processedData.length*20) + (i * 20)) + ")"; });
                    break;
                default:
                    legend.attr("transform", function(d, i) { return "translate(0," + i * 20 + ")"; });
                    break;
            }
        }

        function drawLegend() {
            var legend = canvasInnerWrapper.selectAll(".legend")
                .data(processedData);

            verticallyAlignLegend(legend, obj.legend);
            var rect = legend.select('rect')
                .attr("width", 16)
                .attr("height", 16)
                .attr("fill", function(d) {
                    return !d.invisible ? scaleZ(d.key) : '#ffffff';
                })
                .attr("stroke", function(d) {
                    return scaleZ(d.key);
                })
                .attr("stroke-width", 2);
            var text = legend.select("text")
                .attr("y", 9)
                .attr("dy", ".35em")
                .attr("text-anchor", "end")
                .text(function(d) {
                    return d.key;
                });
            horizontallyAlignLegend(rect, text, obj.legend);
            var legendEnter = legend.enter().append("g")
                .attr("class", "legend")
                .style("font", "10px sans-serif");
            verticallyAlignLegend(legendEnter, obj.legend);

            var legendEnterRect = legendEnter.append("rect")
                .attr("width", 16)
                .attr("height", 16)
                .attr("fill", function(d) {
                    return !d.invisible ? scaleZ(d.key) : '#ffffff';
                })
                .attr("stroke", function(d) {
                    return scaleZ(d.key);
                })
                .attr("stroke-width", 2);

            var legendEnterTxt = legendEnter.append("text")
                .attr("x", chartPlotAreaInnerWidth - 24)
                .attr("y", 9)
                .attr("dy", ".35em")
                .text(function(d) {
                    return d.key;
                });
            horizontallyAlignLegend(legendEnterRect, legendEnterTxt, obj.legend);
            legend.exit().remove();

            legend = canvasInnerWrapper.selectAll(".legend");
            legend.on('click', function(d) {
                d.invisible = !d.invisible;
                d.values.forEach(function(item, index) {
                    item.invisible = !item.invisible;
                });
                invisibleSeries.has(d.key) ? invisibleSeries.remove(d.key) : invisibleSeries.add(d.key);
                drawCompleteChart(true);
            });
        }

        function drawLineSeries() {
            var t = d3.transition()
                .duration(2000)
                .ease(d3.easeLinear);
            var seriesConfigObj = {};
            if (obj.series !== undefined && (obj.series.length > (index + 1))) {
                seriesConfigObj = obj.series[index];
            }
            var priority = canvasInnerWrapper.selectAll('.series.line-series')
                .data(processedData);
            priority.select('.line')
                .attr("stroke-dasharray", 0)
                .attr("stroke-dashoffset", 0)
                .transition(t)
                .attr('d', function(d) {
                    return !d.invisible ? line(d.values) : null;
                })
                .attr("fill", "none")
                .style('stroke', function(d) {
                    return scaleZ(d.key);
                })
                .style('stroke-width', seriesConfigObj.strokeWidth !== undefined ? seriesConfigObj.strokeWidth : 1)
                .style('stroke-linejoin', 'round')
                .style('stroke-linecap', 'round');
            priority.select('text')
                .datum(function(d) {
                    return {key: d.key, invisible: d.invisible, value: d.values[d.values.length - 1]};
                })
                .attr("transform", function(d) { return "translate(" + scaleX(d.value.key) + "," + scaleY(d.value.value) + ")"; })
                .attr("x", 3)
                .attr("dy", "0.35em")
                .style("font", "10px sans-serif")
                .text(function(d) {
                    return !d.invisible ? d.key : '';
                });

            var priorityEnter = priority.enter()
                .append('g')
                .attr('class', 'series line-series');
            var lineSeriesPath = priorityEnter.append('path')
                .attr('class', 'line')
                .attr('d', function(d) {
                    return !d.invisible ? line(d.values) : null;
                })
                .attr("fill", "none")
                .style('stroke', function(d) {
                    return scaleZ(d.key);
                })
                .style('stroke-width', seriesConfigObj.strokeWidth !== undefined ? seriesConfigObj.strokeWidth : 1)
                .style('stroke-linejoin', 'round')
                .style('stroke-linecap', 'round')
                .attr("stroke-dasharray", function(d) { return this.getTotalLength() })
                .attr("stroke-dashoffset", function(d) { return this.getTotalLength() });
            priorityEnter.append("text")
                .datum(function(d) {
                    return {key: d.key, invisible: d.invisible, value: d.values[d.values.length - 1]};
                })
                .attr("transform", function(d) { return "translate(" + scaleX(d.value.key) + "," + scaleY(d.value.value) + ")"; })
                .attr("x", 3)
                .attr("dy", "0.35em")
                .style("font", "10px sans-serif")
                .text(function(d) {
                    return !d.invisible ? d.key : '';
                });
            priority.exit().remove();

            var dataPoints = canvasInnerWrapper.selectAll('.series.line-series')
                .selectAll('.data-point')
                .data(function(d) {
                    return d.values.map(function(element) {
                        element.parentKey = d.key;
                        return element;
                    });
                });
            dataPoints.transition(t)
                .attr("r", function(d) {
                    return !d.invisible ? 2.5 : 0;
                })
                .attr("fill", function(d) {
                    return scaleZ(d.parentKey);
                })
                .attr("stroke", function(d) {
                    return scaleZ(d.parentKey);
                })
                .attr("cx", function(d) {
                    return scaleX(d.key) + scaleX.bandwidth()/2;
                })
                .attr("cy", function(d) {
                    return scaleY(d.value);
                });
            dataPoints.enter()
                .append('circle')
                .attr('class', 'data-point')
                .attr("r", 0)
                .attr("fill", function(d) {
                    return scaleZ(d.parentKey);
                })
                .attr("stroke", function(d) {
                    return scaleZ(d.parentKey);
                })
                .attr("cx", function(d) {
                    return scaleX(d.key) + scaleX.bandwidth()/2;
                })
                .attr("cy", function(d) {
                    return scaleY(d.value);
                });

            lineSeriesPath.transition(t)
                .delay(400)
                .tween("line", function() {
                    var totalLength = this.getTotalLength();
                    var interp = d3.interpolateNumber(totalLength, 0);
                    var self = this;
                    return function(t) {
                        var offset = interp(t);
                        d3.select(self).attr("stroke-dashoffset", offset);
                        var xPos = self.getPointAtLength(totalLength - offset).x;
                        canvasInnerWrapper.selectAll(".data-point").each(function() {
                            var point = d3.select(this);
                            if (xPos > parseInt(point.attr('cx'))) {
                                point.attr("r", 2.5);
                            }
                        })
                    };
                });

            canvasInnerWrapper.selectAll('.series.line-series')
                .selectAll('.data-point')
                .on("mouseover", function(){
                    $(this).addClass('hover');
                    return d3.select('.data-points-tooltip')
                        .classed("in", true)
                        .style('border-color', scaleZ(d3.select(this).data()[0].parentKey))
                        .select('.tooltip-inner')
                        .html('<div>' + d3.select(this).data()[0].key + '</div><div><div id="circle" style="background-color: ' + scaleZ(d3.select(this).data()[0].parentKey) + '"></div>&nbsp;' + d3.select(this).data()[0].parentKey + '&nbsp;' + d3.select(this).data()[0].value + '</div>');
                })
                .on("mousemove", function(){
                    return d3.select('.data-points-tooltip').style("top", (d3.event.pageY-10)+"px").style("left",(d3.event.pageX+10)+"px");
                })
                .on("mouseout", function(){
                    d3.select(this).classed('hover', false);
                    return d3.select('.data-points-tooltip').classed("in", false);
                });
            dataPoints.exit().remove();
        }

        function configureAxes() {
            configureBottomAxisScale();
            configureLeftAxisScale(processedData);
            configureSeriesZAxis(processedData);
        }

        function configureBottomAxisScale() {
            scaleX.domain(xAxisTicks.values().sort());
        }

        function configureLeftAxisScale(ticksArray) {
            var minValue = d3.min(ticksArray.filter(function(d) {return !d.invisible;}), function(c) {
                return d3.min(c.values, function(d) {
                    return d.value;
                });
            });
            (minValue = minValue === undefined ? 0 : minValue) !== 0 ? minValue-- : minValue
            var maxValue = d3.max(ticksArray.filter(function(d) {return !d.invisible;}), function(c) {
                return d3.max(c.values, function(d) {
                    return d.value;
                });
            });
            maxValue = maxValue === undefined ? 0 : maxValue;
            scaleY.domain([minValue, maxValue]);
        }

        function configureSeriesZAxis(seriesData) {
            scaleZ.domain(seriesData.map(function(c) { return c.key; }));
        }

        function renderAxes(updateChart) {
            drawBottomAxis(updateChart);
            drawLeftAxis(updateChart);
        }

        function drawBottomAxis(updateChart) {
            var tickLabelAxisGrp;
            if  (updateChart) {
                var t = d3.transition()
                    .duration(750)
                    .ease(d3.easeLinear);
                if (rc.utils.getDisplayGridLines(obj.xAxis)) {
                    canvasInnerWrapper.select('.axis.axis--x.axis-for-grid-lines')
                        .attr("transform", "translate(0," + innerHeight + ")")
                        .transition(t)
                        .call(d3.axisBottom(scaleX).tickSizeOuter(0).tickSizeInner(-innerHeight))
                        .selectAll("text").remove();
                }
                tickLabelAxisGrp = canvasInnerWrapper.select('.axis.axis--x.axis-for-ticks-labels-axis')
                    .attr("transform", "translate(0," + innerHeight + ")")
                    .transition(t)
                    .call(d3.axisBottom(scaleX).tickSizeInner(rc.utils.getTickLength(obj.xAxis)).tickSizeOuter(0));
            } else {
                if (rc.utils.getDisplayGridLines(obj.xAxis)) {
                    canvasInnerWrapper.insert("g", ":first-child")
                        .attr("class", "axis axis--x axis-for-grid-lines")
                        .attr("transform", "translate(0," + innerHeight + ")")
                        .call(d3.axisBottom(scaleX).tickSizeOuter(0).tickSizeInner(-innerHeight))
                        .selectAll("text").remove();
                }
                tickLabelAxisGrp = canvasInnerWrapper.append('g')
                    .attr("class", "axis axis--x axis-for-ticks-labels-axis")
                    .attr("transform", "translate(0," + innerHeight + ")")
                    .call(d3.axisBottom(scaleX).tickSizeInner(rc.utils.getTickLength(obj.xAxis)).tickSizeOuter(0));
            }
            tickLabelAxisGrp.selectAll('text')
                .attr('fill', rc.utils.getAxisLabelColor(obj.xAxis))
                .attr('font-size', rc.utils.getTickLabelFontSize(obj.xAxis));
            tickLabelAxisGrp.selectAll('line')
                .attr('stroke', rc.utils.getAxisTickColor(obj.xAxis))
                .style('stroke', rc.utils.getAxisTickColor(obj.xAxis))
                .style('stroke-width', rc.utils.getAxisTickWidth(obj.xAxis));
        }

        function drawLeftAxis(updateChart) {
            var changeDevice = false;
            if (chartContainerInnerWidth > breakPoint && prevYaxisOrient === 'right') {
                changeDevice = true;
            } else if (chartContainerInnerWidth <= breakPoint && prevYaxisOrient === 'left') {
                changeDevice = true;
            }
            prevYaxisOrient = chartContainerInnerWidth > breakPoint ? 'left' : 'right';
            var tickLabelAxisGrp;
            if  (updateChart) {
                var t = d3.transition()
                    .duration(750)
                    .ease(d3.easeLinear);
                if (changeDevice) {
                    canvasInnerWrapper.selectAll('.axis.axis--y').remove();
                    if (rc.utils.getDisplayGridLines(obj.yAxis)) {
                        canvasInnerWrapper.insert("g", ":first-child")
                            .attr("class", "axis axis--y axis-for-grid-lines")
                            .call(chartContainerInnerWidth > breakPoint ? d3.axisLeft(scaleY).tickSizeInner(-chartPlotAreaInnerWidth) : d3.axisRight(scaleY).tickArguments([innerHeight/50]).tickSizeInner(chartPlotAreaInnerWidth))
                            .selectAll("text").remove();
                    }
                    tickLabelAxisGrp = canvasInnerWrapper.append("g")
                        .attr("class", "axis axis--y axis-for-ticks-labels-axis")
                        .call(chartContainerInnerWidth > breakPoint ? d3.axisLeft(scaleY).tickSizeInner(rc.utils.getTickLength(obj.yAxis)).tickSizeOuter(0) : d3.axisRight(scaleY).tickArguments([innerHeight/50]).tickSizeInner(rc.utils.getTickLength(obj.yAxis)).tickSizeOuter(0));
                } else {
                    if (rc.utils.getDisplayGridLines(obj.yAxis)) {
                        canvasInnerWrapper.select('.axis.axis--y.axis-for-grid-lines')
                            .transition(t)
                            .call(chartContainerInnerWidth > breakPoint ? d3.axisLeft(scaleY).tickSizeInner(-chartPlotAreaInnerWidth) : d3.axisRight(scaleY).tickArguments([innerHeight / 50]).tickSizeInner(chartPlotAreaInnerWidth))
                            .selectAll("text").remove();
                    }
                    tickLabelAxisGrp = canvasInnerWrapper.select('.axis.axis--y.axis-for-ticks-labels-axis')
                        .transition(t)
                        .call(chartContainerInnerWidth > breakPoint ? d3.axisLeft(scaleY).tickSizeInner(rc.utils.getTickLength(obj.yAxis)).tickSizeOuter(0): d3.axisRight(scaleY).tickArguments([innerHeight/50]).tickSizeInner(rc.utils.getTickLength(obj.yAxis)).tickSizeOuter(0));

                }
            } else {
                if (rc.utils.getDisplayGridLines(obj.yAxis)) {
                    canvasInnerWrapper.insert("g", ":first-child")
                        .attr("class", "axis axis--y axis-for-grid-lines")
                        .call(chartContainerInnerWidth > breakPoint ? d3.axisLeft(scaleY).tickSizeInner(-chartPlotAreaInnerWidth) : d3.axisRight(scaleY).tickArguments([innerHeight / 50]).tickSizeInner(chartPlotAreaInnerWidth))
                        .selectAll("text").remove();
                }
                tickLabelAxisGrp = canvasInnerWrapper.append("g")
                    .attr("class", "axis axis--y axis-for-ticks-labels-axis")
                    .call(chartContainerInnerWidth > breakPoint ? d3.axisLeft(scaleY).tickSizeInner(rc.utils.getTickLength(obj.yAxis)).tickSizeOuter(0) : d3.axisRight(scaleY).tickArguments([innerHeight/50]).tickSizeInner(rc.utils.getTickLength(obj.yAxis)).tickSizeOuter(0));
            }
            tickLabelAxisGrp.selectAll('text')
                .attr('fill', rc.utils.getAxisLabelColor(obj.yAxis))
                .attr('font-size', rc.utils.getTickLabelFontSize(obj.yAxis));
            tickLabelAxisGrp.selectAll('line')
                .attr('stroke', rc.utils.getAxisTickColor(obj.yAxis))
                .style('stroke', rc.utils.getAxisTickColor(obj.yAxis))
                .style('stroke-width', rc.utils.getAxisTickWidth(obj.yAxis));
        }

        function addPreFixNSuffix() {
            addPreFixNSuffixToX();
            addPreFixNSuffixToY();
        }

        function addPreFixNSuffixToX() {
            processedData = processedData.map(function(d) {
                d.values = d.values.map(function(d) {
                    d.key = 'Q' + ++d.key;
                    return d;
                });
                return d;
            });
            xAxisTicks = d3.set(xAxisTicks.values().map(function (d) {
                d = 'Q' + ++d;
                return d;
            }));
        }

        function addPreFixNSuffixToY() {
        }


        function groupNAggregateNSortJSONData(issuesRawData) {
            var seriesData = d3.nest()
                .key(function(d) {
                    return d.priorityName;
                })
                .key(function(d) {
                    xAxisTicks.add(parseFloat(d.versionID));
                    return parseFloat(d.versionID);
                }).sortKeys(d3.ascending)
                .rollup(function(v) { return v.length; })
                .entries(issuesRawData);
            seriesData.map(function(d) {
                if (invisibleSeries.has(d.key)) {
                    d.invisible = true;
                    d.values.forEach(function(item, index) {
                        item.invisible = true;
                    });
                } else {
                    return d;
                }
            });
            return seriesData;
        }

        function updateDimensions() {
            chartContainerInnerWidth = chartContainer.offsetWidth - 30;
            margin = chartContainerInnerWidth > breakPoint ? {top: 20, right: 80, bottom: 30, left: 50} : {top: 20, right: 0, bottom: 30, left: 0};
            width = chartContainerInnerWidth > 960 ? 960 : (chartContainerInnerWidth > breakPoint ? breakPoint : chartContainerInnerWidth);
            width = width - parseFloat(getComputedStyle(chartContainer).paddingLeft) - parseFloat(getComputedStyle(chartContainer).paddingRight);
            height = 0.6 * width;
            innerHeight = height - margin.top - margin.bottom;
            chartPlotAreaInnerWidth = width - margin.left - margin.right;
            svg.attr('height', height)
                .attr('width', width);
            canvasInnerWrapper.attr('transform', 'translate(' + margin.left + ', ' + margin.top + ')');
            scaleX.range([0, chartPlotAreaInnerWidth]);
            scaleY.rangeRound([innerHeight, 0]);
        }

        function resizeTheChart() {
            updateDimensions();
            drawCompleteChart(true);
        }
    }

    rc.models.hierarchyChart = (obj) => {
        let breakPoint = 768,
            chartContainer = rc.utils.getChartContainer(obj),
            chartContainerInnerWidth, chartPlotAreaInnerWidth, svg, margin, width, height, innerHeight,
            processedData = [],
            unProcessedDataArray = obj.unProcessedDataArray,
            hierarchicalRoot = {},
            selectedNode = null,
            draggingNode = null;
        // panning variables
        var panSpeed = 200;
        var panBoundary = 20; // Within 20px from edges will pan when dragging.;

        svg = d3.select(chartContainer).append('svg').call(d3.zoom().scaleExtent([0.1, 3]).on("zoom", zoom));
        var canvasInnerWrapper = svg.append('g');
        var treemap = d3.tree();
        var i = 0;
        var dragListener = d3.drag()
            .on("start", dragStarted)
            .on("drag", dragging)
            .on("end", dragEnded);
        processTheRawDataAndDrawGraph();


        function processTheRawDataAndDrawGraph() {
            processedData = groupNAggregateNSortJSONData(unProcessedDataArray);
            hierarchicalRoot = d3.hierarchy(processedData, function(d) {
                return d.values;
            }).sum(function(d) {
                return d.value;
            }).sort(function(a, b) {
                return b.data.key.toLowerCase() < a.data.key.toLowerCase() ? 1 : -1;
            });
            updateDimensions();
            drawCompleteChart(hierarchicalRoot);
        }

        function dragStarted(d) {
            if (d == hierarchicalRoot) {
                return;
            }
            booleanDragStarted = true;
        }

        function dragging(d) {
            if (d == hierarchicalRoot) {
                return;
            }
            if (booleanDragStarted) {
                domNode = this;
                initiateDrag(d, domNode);
            }
            d.x0 += d3.event.dy;
            d.y0 += d3.event.dx;
            d3.select(this).attr("transform", "translate(" + d.y0 + "," + d.x0 + ")");
            updateTempConnector();
        }

        function dragEnded(d) {
            if (d == hierarchicalRoot) {
                return;
            }
            domNode = this;
            if (selectedNode) {
                // now remove the element from the parent, and insert it into the new elements children
                var index = draggingNode.parent.children.indexOf(draggingNode);
                if (index > -1) {
                    draggingNode.parent.children.splice(index, 1);
                    if (draggingNode.parent.children.length == 0) {
                        draggingNode.parent.children = null;
                        delete draggingNode.parent.children;
                    }
                }
                if (typeof selectedNode.children !== 'undefined' || typeof selectedNode._children !== 'undefined') {
                    if (typeof selectedNode.children !== 'undefined') {
                        selectedNode.children.push(draggingNode);
                    } else {
                        selectedNode._children.push(draggingNode);
                    }
                } else {
                    selectedNode.children = [];
                    selectedNode.children.push(draggingNode);
                }
                // Make sure that the node being added to is expanded so user can see added node is correctly moved
                expand(selectedNode);
                endDrag();
            } else {
                endDrag();
            }
        }

        function endDrag() {
            d3.selectAll('.ghostCircle').attr('class', 'ghostCircle');
            d3.select(domNode).attr('class', 'node');
            // now restore the mouseover event or we won't be able to drag a 2nd time
            d3.select(domNode).select('.ghostCircle').attr('pointer-events', '');
            updateTempConnector();
            if (draggingNode !== null) {
                if (selectedNode != null) {
                    prepareData();
                    selectedNode = null;
                }
                drawCompleteChart(hierarchicalRoot);
                draggingNode = null;
            }
        }

        function prepareData() {
            var tempHierarchyRoot = d3.hierarchy(traverse(hierarchicalRoot), function(d) {
                return d.values;
            }).sum(function(d) {
                return d.value;
            }).sort(function(a, b) {
                return b.data.key.toLowerCase() < a.data.key.toLowerCase() ? 1 : -1;
            });
            tempHierarchyRoot.x0 = innerHeight / 2;
            tempHierarchyRoot.y0 = 0;
            tempHierarchyRoot.children.forEach(collapse);
            collapseAppropriateNode(hierarchicalRoot, tempHierarchyRoot);
            hierarchicalRoot = tempHierarchyRoot;
        }

        function collapseAppropriateNode(originalTree, destinationTree) {
            if (typeof originalTree.children !== 'undefined' || typeof originalTree._children !== 'undefined') {
                if (typeof originalTree.children !== 'undefined') {
                    if (typeof destinationTree.children == 'undefined') {
                        destinationTree.children = destinationTree._children;
                        delete destinationTree._children;
                    }
                    destinationTree.children.map(function(destTemp) {
                        collapseAppropriateNode(originalTree.children.filter(function(d) { return d.data.key === destTemp.data.key})[0], destTemp);
                    });
                    return;
                } else {
                    /*
                     destinationTree.children = destinationTree._children;
                     delete destinationTree._children;
                     return;
                     */
                }
            }
            return;
        }

        function traverse(treeSourceRoot) {
            var obj = {};
            obj.key = treeSourceRoot.data.key;
            var children;
            if (typeof treeSourceRoot.children !== 'undefined' || typeof treeSourceRoot._children !== 'undefined') {
                if (typeof treeSourceRoot.children !== 'undefined') {
                    children = treeSourceRoot.children;
                } else {
                    children = treeSourceRoot._children;
                }
                obj.values = children.map(function(d) {
                    return traverse(d);
                });
                return obj;
            }
            obj.value = treeSourceRoot.value;
            return obj;
        }

        function initiateDrag(d, domNode) {
            draggingNode = d;
            d3.select(domNode).select('.ghostCircle').attr('pointer-events', 'none');
            d3.selectAll('.ghostCircle').attr('class', 'ghostCircle show');
            d3.select(domNode).attr('class', 'node activeDrag');

            canvasInnerWrapper.selectAll("g.node").sort(function(a, b) { // select the parent and sort the path's
                if (a.id != draggingNode.id) return 1; // a is not the hovered element, send "a" to the back
                else return -1; // a is the hovered element, bring "a" to the front
            });
            // if nodes has children, remove the links and nodes
            if (d.descendants().length > 1) {
                // remove link paths
                canvasInnerWrapper.selectAll("path.link")
                    .data(d.descendants().slice(1), function(d) {
                        return d.id;
                    })
                    .remove();
                // remove child nodes
                canvasInnerWrapper.selectAll("g.node")
                    .data(d.descendants(), function(d) {
                        return d.id;
                    }).filter(function(d, i) {
                    if (d.id == draggingNode.id) {
                        return false;
                    }
                    return true;
                }).remove();
            }

            // remove parent link
            canvasInnerWrapper.selectAll('path.link').filter(function(d, i) {
                if (d.id == draggingNode.id) {
                    return true;
                }
                return false;
            }).remove();

            booleanDragStarted = false;
        }

        function groupNAggregateNSortJSONData(issuesRawData) {
            var seriesData = d3.nest()
                .key(function(d) {
                    return d.Territory;
                }).sortKeys(d3.ascending)
                .rollup(function(v) {
                    return v.length;
                })
                .key(function(d) {
                    return d.State;
                }).sortKeys(d3.ascending)
                .key(function(d) {
                    return d.County;
                }).sortKeys(d3.ascending)
                .key(function(d) {
                    return d.City;
                }).sortKeys(d3.ascending)
                .rollup(function(v) {
                    return d3.sum(v, function(d) { return parseInt(d.Population.replace(/,/g, ""), 10);});
                })
                .entries(issuesRawData);
            return {key: 'Territories', values: seriesData};
        }


        // Define the zoom function for the zoomable tree

        function zoom() {
            canvasInnerWrapper.attr("transform", d3.event.transform);
        }

        function drawCompleteChart(source) {
            var t = d3.transition()
                .duration(500)
                .ease(d3.easeLinear);
            var levelWidth = [1];

            var childCount = function(level, n) {

                if (n.children && n.children.length > 0) {
                    if (levelWidth.length <= level + 1) levelWidth.push(0);

                    levelWidth[level + 1] += n.children.length;
                    n.children.forEach(function(d) {
                        childCount(level + 1, d);
                    });
                }
            };
            childCount(0, hierarchicalRoot);
            treemap.size([d3.max(levelWidth) * 25,  levelWidth.length * 180]);
            treemap(hierarchicalRoot);
            var rootDescendants = hierarchicalRoot.descendants(),
                links = hierarchicalRoot.descendants().slice(1);
            // Normalize for fixed-depth.
            rootDescendants.forEach(function(d){ d.y = d.depth * 200});

            var node = canvasInnerWrapper.selectAll(".node")
                .data(rootDescendants, function(d) { return d.id || (d.id = ++i); });

            var nodeEnter = node.enter().append("g")
                .call(dragListener)
                .attr("class", function(d) { return "node" + (d.children || d._children ? " node--internal" : " node--leaf"); })
                .attr("transform", function(d) {
                    return "translate(" + source.y0 + "," + source.x0 + ")";
                })
                .on('click', click);

            nodeEnter.append("circle")
                .transition(t)
                .attr("r", 4)
                .attr('cursor', function(d) {
                    return d.children || d._children ? "pointer" : "default";
                })
                .style("fill", function(d) {
                    return d._children ? "lightsteelblue" : "#fff";
                });

            nodeEnter.append("text")
                .transition(t)
                .attr("dy", "0.31em")
                .attr("x", function(d) {
                    return d.children || d._children ? -10 : 10;
                })
                .style("text-anchor", function(d) { return d.children || d._children ? "end" : "start"; })
                .text(function(d) {
                    return d.data.key + ' (' + d3.format(".2s")(d.value) + ')';
                })
                .style("font-size", "10");
            // phantom node to give us mouseover in a radius around it
            nodeEnter.append("circle")
                .attr('class', 'ghostCircle')
                .attr("r", 20)
                .attr("opacity", 0.2) // change this to zero to hide the target area
                .style("fill", "red")
                .attr('pointer-events', 'mouseover')
                .on("mouseover", function(node) {
                    overCircle(node);
                })
                .on("mouseout", function(node) {
                    outCircle(node);
                });

            var nodeUpdate = nodeEnter.merge(node);
            // Transition to the proper position for the node
            nodeUpdate.transition(t)
                .attr("transform", function(d) {
                    return "translate(" + d.y + "," + d.x + ")";
                });

            // Update the node attributes and style
            nodeUpdate.select('circle')
                .attr('r', 4)
                .style("fill", function(d) {
                    return d._children ? "lightsteelblue" : "#fff";
                })
                .attr('cursor', function(d) {
                    return d.children || d._children ? "pointer" : "default";
                });

            // Remove any exiting nodes
            var nodeExit = node
                .exit()
                .transition(t)
                .attr("transform", function(d) {
                    return "translate(" + source.y + "," + source.x + ")";
                })
                .remove();

            // On exit reduce the node circles size to 0
            nodeExit.select('circle')
                .attr('r', 0);

            // On exit reduce the opacity of text labels
            nodeExit.select('text')
                .style('fill-opacity', 0);

            // Update the links...
            var link = canvasInnerWrapper.selectAll('.link')
                .data(links, function(d) { return d.id || (d.id = ++i); });

            // Enter any new links at the parent's previous position.
            var linkEnter = link.enter().insert('path', "g")
                .attr("class", "link")
                .attr('d', function(d){
                    var o = {x: source.x0, y: source.y0};
                    return linkedPath(o, o)
                });

            // UPDATE
            var linkUpdate = linkEnter.merge(link);

            // Transition back to the parent element position
            linkUpdate.transition(t)
                .attr('d', function(d){ return linkedPath(d.parent, d) });

            // Remove any exiting links
            var linkExit = link.exit()
                .transition(t)
                .attr('d', function(d) {
                    var o = {x: source.x, y: source.y};
                    return linkedPath(o, o);
                })
                .remove();

            // Store the old positions for transition.
            rootDescendants.forEach(function(d){
                d.x0 = d.x;
                d.y0 = d.y;
            });
        }

        function updateDimensions() {
            chartContainerInnerWidth = chartContainer.offsetWidth;
            margin = chartContainerInnerWidth > breakPoint ? {top: 20, right: 100, bottom: 30, left: 200} : {top: 20, right: 0, bottom: 30, left: 0};
            width = chartContainerInnerWidth > 960 ? chartContainerInnerWidth : (chartContainerInnerWidth > breakPoint ? breakPoint : chartContainerInnerWidth);
            width = width - parseFloat(getComputedStyle(chartContainer).paddingLeft) - parseFloat(getComputedStyle(chartContainer).paddingRight);
            height = 0.6 * width;
            innerHeight = height - margin.top - margin.bottom;
            chartPlotAreaInnerWidth = width - margin.left - margin.right;
            svg.attr('height', height)
                .attr('width', width);
            canvasInnerWrapper.attr('transform', 'translate(' + margin.left + ', ' + margin.top + ')');
            treemap.size([innerHeight,  chartPlotAreaInnerWidth]);
            hierarchicalRoot.children.forEach(collapse);
            hierarchicalRoot.x0 = innerHeight / 2;
            hierarchicalRoot.y0 = 0;
        }

        function linkedPath(source, target) {
            if (!source && !target) {
                return null;
            }
            return "M" + source.y + "," + source.x
                + " C" + (source.y + target.y) / 2 + "," + source.x
                + " " + (source.y + target.y) / 2 + "," + target.x
                + " " + target.y + "," + target.x;
        }

        function collapse(d) {
            if(d.children) {
                d._children = d.children;
                d._children.forEach(collapse);
                delete d.children;
            }
        }

        function click(d) {
            if (!(d.children || d._children)) {
                event.preventDefault();
                return false;
            }
            if (d.children) {
                d._children = d.children;
                delete d.children;
            } else {
                d.children = d._children;
                delete d._children;
            }
            drawCompleteChart(d);
        }

        function expand(d) {
            if (d._children) {
                d.children = d._children;
                d.children.forEach(expand);
                delete d._children;
            }
        }

        function overCircle(d) {
            selectedNode = d;
            updateTempConnector();
        }

        function outCircle(d) {
            selectedNode = null;
            updateTempConnector();
        }

        // Function to update the temporary connector indicating dragging affiliation
        function updateTempConnector() {
            var data = [{}];
            if (draggingNode !== null && selectedNode !== null) {
                // have to flip the source coordinates since we did this for the existing connectors on the original tree
                data = {
                    source: {
                        x: selectedNode.y0,
                        y: selectedNode.x0
                    },
                    target: {
                        x: draggingNode.y0,
                        y: draggingNode.x0
                    }
                };
            }
            var link = canvasInnerWrapper.selectAll(".templink")
                .data(data, function(d) { return d.id || (d.id = ++i);});

            link.enter().append("path")
                .attr("class", "templink")
                .attr('d', function(d){
                    return linkedPath(d.source, d.source)
                })
                .attr('pointer-events', 'none');

            link.attr("d", function(d){ return linkedPath(d.target, d.source) });

            link.exit().remove();
        }
    }

    /*
        rc.models.chordChart = (obj) => {
            let width = 960,
                height = 700,
                svg = d3.select("svg")
                    .attr("width", width)
                    .attr("height", height),
                outerRadius = Math.min(width, height) / 2 - 10,
                innerRadius = outerRadius - 24,
                chord = d3.chord()
                    .padAngle(0.04)
                    .sortSubgroups(d3.descending),
                arc = d3.arc()
                    .innerRadius(innerRadius)
                    .outerRadius(outerRadius),
                ribbon = d3.ribbon()
                    .radius(innerRadius);

            queue()
                .defer(d3.csv, "https://bost.ocks.org/mike/uberdata/cities.csv")
                .defer(d3.json, "https://bost.ocks.org/mike/uberdata/matrix.json")
                .await(ready);

            function ready(error, cities, matrix) {
                if (error) throw error;

                let g = svg.append("g")
                    .attr("class", "circle")
                    .attr("transform", "translate(" + width / 2 + "," + height / 2 + ")")
                    .datum(chord(matrix));

                let group = g.append("g")
                    .attr("class", "groups")
                    .selectAll("g")
                    .data(function (chords) {
                        return chords.groups;
                    })
                    .enter().append("g")
                    .on("mouseover", mouseover);
                let groupPath = group.append("path")
                    .style("fill", function (d) {
                        return cities[d.index].color;
                    })
                    .style("stroke", function (d) {
                        return d3.rgb(cities[d.index].color).darker();
                    })
                    .attr("id", function(d, i) { return "group" + i; })
                    .attr("d", arc);

                let groupText = group.append("text")
                    .attr("x", 6)
                    .attr("dy", 15);

                groupText.append("textPath")
                    .attr("xlink:href", function(d, i) { return "#group" + i; })
                    .text(function(d, i) { return cities[i].name; });

                // Remove the labels that don't fit. :(
                groupText.filter(function(d, i) {
                    return groupPath._groups[0][i].getTotalLength() / 2 - 16 < this.getComputedTextLength();
                })
                    .remove();

                let ribbons = g.append("g")
                    .attr("class", "ribbons")
                    .selectAll("path")
                    .data(function (chords) {
                        return chords;
                    })
                    .enter().append("path")
                    .attr("d", ribbon)
                    .style("fill", function (d) {
                        return cities[d.target.index].color;
                    })
                    .style("stroke", function (d) {
                        return d3.rgb(cities[d.target.index].color).darker();
                    });

                function mouseover(d, i) {
                    ribbons.classed("fade", function(p) {
                        return p.source.index != i && p.target.index != i;
                    });
                }
            }
        }
    */

    rc.models.chordChart = (obj) => {
        var breakPoint = 768,
            chartContainer = rc.utils.getChartContainer(obj),
            chartContainerInnerWidth, chartPlotAreaInnerWidth, svg, margin, width, height, innerHeight, outerRadius,
            innerRadius,
            arc, ribbon,
            cities = obj.unProcessedDataArray.cities,
            matrix = obj.unProcessedDataArray.matrix;

        svg = d3.select(chartContainer).append('svg');
        let canvasInnerWrapper = svg.append('g'),
            chord = d3.chord()
                .padAngle(0.04)
                .sortSubgroups(d3.descending);
        updateDimensions();

        let group = canvasInnerWrapper.append("g")
            .attr("class", "groups")
            .selectAll("g")
            .data(function (chords) {
                return chords.groups;
            })
            .enter().append("g")
            .on("mouseover", mouseover);
        let groupPath = group.append("path")
            .style("fill", function (d) {
                return cities[d.index].color;
            })
            .style("stroke", function (d) {
                return d3.rgb(cities[d.index].color).darker();
            })
            .attr("id", function(d, i) { return "group" + i; })
            .attr("d", arc);

        let groupText = group.append("text")
            .attr("x", 6)
            .attr("dy", 15);

        groupText.append("textPath")
            .attr("xlink:href", function(d, i) { return "#group" + i; })
            .text(function(d, i) { return cities[i].name; });

        // Remove the labels that don't fit. :(
        groupText.filter(function(d, i) {
            return groupPath._groups[0][i].getTotalLength() / 2 - 16 < this.getComputedTextLength();
        })
            .remove();

        let ribbons = canvasInnerWrapper.append("g")
            .attr("class", "ribbons")
            .selectAll("path")
            .data(function (chords) {
                return chords;
            })
            .enter().append("path")
            .attr("d", ribbon)
            .attr("class", "ribbon-path")
            .style("fill", function (d) {
                return cities[d.target.index].color;
            })
            .style("stroke", function (d) {
                return d3.rgb(cities[d.target.index].color).darker();
            });

        function mouseover(d, i) {
            ribbons.classed("path-faded-away", function(p) {
                return p.source.index != i && p.target.index != i;
            });
        }

        function updateDimensions() {
            chartContainerInnerWidth = chartContainer.offsetWidth - 30;
            margin = chartContainerInnerWidth > breakPoint ? {top: 20, right: 20, bottom: 20, left: 20} : {top: 20, right: 0, bottom: 20, left: 0};
            width = chartContainerInnerWidth > 960 ? 960 : (chartContainerInnerWidth > breakPoint ? breakPoint : chartContainerInnerWidth);
            width = width - parseFloat(getComputedStyle(chartContainer).paddingLeft) - parseFloat(getComputedStyle(chartContainer).paddingRight);
            height = 1 * width;
            innerHeight = height - margin.top - margin.bottom;
            chartPlotAreaInnerWidth = width - margin.left - margin.right;
            svg.attr('height', height)
                .attr('width', width);
            outerRadius = Math.min(chartPlotAreaInnerWidth, innerHeight) / 2 - 10;
            innerRadius = outerRadius - 24;
            arc = d3.arc()
                .innerRadius(innerRadius)
                .outerRadius(outerRadius);
            ribbon = d3.ribbon()
                .radius(innerRadius);
            canvasInnerWrapper.attr("class", "circle")
                .attr("transform", "translate(" + chartPlotAreaInnerWidth / 2 + "," + innerHeight / 2 + ")")
                .datum(chord(matrix));
        }
    }

    rc.models.forceChart = (obj) => {
        // fix the id issue with the data.
        let breakPoint = 768,
            chartContainer = rc.utils.getChartContainer(obj),
            chartContainerInnerWidth, chartPlotAreaInnerWidth, svg, margin, width, height, innerHeight, simulation,
            root = d3.hierarchy(obj.unProcessedDataArray, function(d) {
                return d.children;
            }).sum(function(d) {
                return d.size;
            }).sort(function(a, b) {
                return b.value - a.value;
            }),
            totalValue = 15/root.value,
            nodeSvg, linkSvg;

        svg = d3.select(chartContainer).append('svg');
        let canvasInnerWrapper = svg.append('g');
        updateDimensions();

        function update() {
            var nodes = root.descendants(),
                links = root.links();
            linkSvg = canvasInnerWrapper.selectAll(".link")
                .data(links, function(d) {
                    return d.target.id;
                })

            linkSvg.exit().remove();

            var linkEnter = linkSvg.enter()
                .append("line")
                .attr("class", "link");

            linkSvg = linkEnter.merge(linkSvg)

            nodeSvg = canvasInnerWrapper.selectAll(".node")
                .data(nodes, function(d) {
                    return d.id;
                });

            nodeSvg.exit().remove();

            var nodeEnter = nodeSvg.enter()
                .append("g")
                .attr("class", "node")
                .on("mouseover", function() {
                    var t = d3.transition()
                        .duration(500)
                        .ease(d3.easeLinear);
                    d3.select(this).select('text')
                        .transition(t)
                        .style('display', 'block');
                })
                .on("mouseout", function() {
                    var t = d3.transition()
                        .duration(500)
                        .ease(d3.easeLinear);
                    d3.select(this).select('text')
                        .transition(t)
                        .style('display', 'none');
                })
                .on("click", click)
                .call(d3.drag()
                    .on("start", dragstarted)
                    .on("drag", dragged)
                    .on("end", dragended))

            nodeEnter.append("circle")
                .attr("r", function(d) {
                    return d.value * totalValue + 4;
                });

            nodeEnter.append("text")
                .attr('stroke', '#232323')
                .attr("dy", 3)
                .attr("x", function(d) { return d.children ? -8 : 8; })
                .style("text-anchor", function(d) { return d.children ? "end" : "start"; })
                .style('display', 'none')
                .text(function(d) { return d.data.name + ' (' + d.value + ')'; });

            nodeSvg = nodeEnter.merge(nodeSvg);
            nodeSvg.select('circle')
                .style("fill", color);

            simulation
                .nodes(nodes)
                .force("collide", d3.forceCollide().strength(.5).radius(function(d) {
                    return d.value * totalValue + 4;
                }));

            simulation.force("link")
                .links(links);

        }

        function zoomed() {
            canvasInnerWrapper.attr("transform", d3.event.transform);
        }

        function ticked() {
            if(linkSvg)
                linkSvg
                    .attr("x1", function(d) { return d.source.x; })
                    .attr("y1", function(d) { return d.source.y; })
                    .attr("x2", function(d) { return d.target.x; })
                    .attr("y2", function(d) { return d.target.y; });

            if(nodeSvg)
                nodeSvg
                    .attr("transform", function(d) { return "translate(" + d.x + ", " + d.y + ")"; });
        }

        function click (d) {
            if (d.children) {
                d._children = d.children;
                d.children = null;
            } else {
                d.children = d._children;
                d._children = null;
            }
            update();
            simulation.restart();
        }

        function dragstarted(d) {
            if (!d3.event.active) simulation.alphaTarget(0.3).restart()
        }

        function dragged(d) {
            d.fx = d3.event.x;
            d.fy = d3.event.y;
        }

        function dragended(d) {
            if (!d3.event.active) simulation.alphaTarget(0);
            d.fx = undefined;
            d.fy = undefined;
        }

        function color(d) {
            return d._children ? "#3182bd" : d.children ? "#c6dbef" : "#fd8d3c";
        }

        function updateDimensions() {
            chartContainerInnerWidth = chartContainer.offsetWidth - 30;
            margin = chartContainerInnerWidth > breakPoint ? {top: 20, right: 20, bottom: 20, left: 20} : {top: 20, right: 0, bottom: 20, left: 0};
            width = chartContainerInnerWidth > 960 ? 960 : (chartContainerInnerWidth > breakPoint ? breakPoint : chartContainerInnerWidth);
            width = width - parseFloat(getComputedStyle(chartContainer).paddingLeft) - parseFloat(getComputedStyle(chartContainer).paddingRight);
            height = 0.6 * width;
            innerHeight = height - margin.top - margin.bottom;
            chartPlotAreaInnerWidth = width - margin.left - margin.right;
            svg.attr('height', height)
                .attr('width', width)
                .call(d3.zoom().scaleExtent([1 / 2, 8]).on("zoom", zoomed));
            canvasInnerWrapper.attr('transform', 'translate(' + margin.left + ', ' + margin.top + ')');
            simulation = d3.forceSimulation()
                .force("link", d3.forceLink().id(function(d) {
                    return d.id;
                }))
                .force("charge", d3.forceManyBody())
                .force("center", d3.forceCenter(chartPlotAreaInnerWidth / 2, innerHeight / 2))
                .force("x", d3.forceX())
                .force("y", d3.forceY())
                .on("tick", ticked),
                update();
        }
    }

    rc.models.stackedChart = (obj) => {
        let breakPoint = 768,
            chartContainer = rc.utils.getChartContainer(obj),
            chartContainerInnerWidth, chartPlotAreaInnerWidth, svg, margin, width, height, innerHeight,
            {chartUpdate} = obj;
        svg = d3.select(chartContainer).append('svg');
        let canvasInnerWrapper = svg.append('g'),
            scaleX = d3.scaleBand().paddingInner(0.1).paddingOuter(0.03).align(0.1),
            scaleY = d3.scaleLinear(),
            scaleZ = (undefined !== obj.series && obj.series.map(function(d) { return d.color; }).length > 0) ? d3.scaleOrdinal().range(obj.series.map(function(d) { return d.color; })) : d3.scaleOrdinal(d3.schemeCategory10),
            xAxisTicks = d3.set(),
            zAxisTicks = d3.set(),
            invisibleSeries = d3.set(),
            processedUnstackedData = [],
            layoutType = parseInt(rc.utils.getLayoutType(obj)),
            unProcessedDataArray = obj.unProcessedDataArray,
            yGroupMax = 0,
            yStackMax = 0;

        updateDimensions();

        drawCompleteChart(processRawData(unProcessedDataArray), chartUpdate);
        rc.utils.addCustomEventHandler(chartContainer, customEventHandler);

        function customEventHandler(e) {
            switchGraphType(parseInt($("input:radio[name=layoutType]:checked").val()));
        }

        function processRawData(data) {
            data = data.map(function(group) {
                zAxisTicks.add(group.key);
                return group.values.map(function(d) {
                    var obj = {};
                    obj[group.key] = d.value;
                    obj.versionID = parseFloat(d.key);
                    xAxisTicks.add(obj.versionID);
                    return obj;
                });
            });
            data = [].concat.apply([], data);
            data = d3.nest()
                .key(function(d) {
                    return parseFloat(d.versionID);
                })
                .sortKeys(d3.ascending)
                .entries(data);
            data = data.map(function(group) {
                var obj = {};
                group.values.map(function(d) {
                    return Object.assign(obj, d);
                });
                return obj;
            });
            /*
             var data = [
             {month: new Date(2015, 0, 1), apples: 3840, bananas: 1920, cherries: 960, dates: 400},
             {month: new Date(2015, 1, 1), apples: 1600, bananas: 1440, cherries: 960, dates: 400},
             {month: new Date(2015, 2, 1), apples:  640, bananas:  960, cherries: 640, dates: 400},
             {month: new Date(2015, 3, 1), apples:  320, bananas:  480, cherries: 640, dates: 400}
             ];
             */
            processedUnstackedData = data;
            return calculateStackedData();
        }

        function calculateStackedData() {
            var stack = d3.stack()
                .keys(zAxisTicks.values().filter(x => invisibleSeries.values().indexOf(x) === -1).sort())
                .order(d3.stackOrderNone)
                .offset(d3.stackOffsetNone);
            /*
             [
             [[   0, 3840], [   0, 1600], [   0,  640], [   0,  320]], // apples
             [[3840, 5760], [1600, 3040], [ 640, 1600], [ 320,  800]], // bananas
             [[5760, 6720], [3040, 4000], [1600, 2240], [ 800, 1440]], // cherries
             [[6720, 7120], [4000, 4400], [2240, 2640], [1440, 1840]], // dates
             ]
             */
            var multiSeriesData = stack(processedUnstackedData);
            yGroupMax = multiSeriesData.length === 0 ? 0 : d3.max(multiSeriesData, function(seriesData) { return d3.max(seriesData, function(d) { return d[1] - d[0]; }); });
            yStackMax = multiSeriesData.length === 0 ? 0 : d3.max(multiSeriesData[multiSeriesData.length - 1], function(d) { return d[1]; });
            return multiSeriesData;
        }

        function drawCompleteChart(stackedData, updateChart = false) {
            configureAxes();
            renderAxes(updateChart);
            drawSeries(stackedData);
            drawLegend();
        }

        function renderAxes(updateChart) {
            drawBottomAxis(updateChart);
            drawLeftAxis(updateChart);
        }

        function configureAxes() {
            configureBottomAxisScale();
            configureLeftAxisScale();
            configureSeriesZAxis();
        }

        function configureLeftAxisScale() {
            scaleY.domain([0, layoutType ? yGroupMax : yStackMax]);
        }

        function drawLeftAxis(updateChart) {
            if  (updateChart) {
                var t = d3.transition()
                    .duration(750)
                    .ease(d3.easeLinear);
                canvasInnerWrapper.select('.axis.axis--y')
                    .transition(t)
                    .call(d3.axisLeft(scaleY));
            } else {
                canvasInnerWrapper.append("g")
                    .attr("class", "axis axis--y")
                    .call(d3.axisLeft(scaleY))
                    .append('text')
                    .attr("transform", "rotate(-90)")
                    .attr("y", 6)
                    .attr("dy", "0.71em")
                    .attr("fill", "#000")
                    .text("Defect counts");
            }
        }

        function configureBottomAxisScale() {
            scaleX.domain(xAxisTicks.values().sort());
        }

        function drawBottomAxis(updateChart) {
            if  (updateChart) {
                var t = d3.transition()
                    .duration(750)
                    .ease(d3.easeLinear);
                canvasInnerWrapper.select('.axis.axis--x')
                    .transition(t)
                    .call(d3.axisBottom(scaleX));
            } else {
                canvasInnerWrapper.append('g')
                    .attr("class", "axis axis--x")
                    .attr("transform", "translate(0," + innerHeight + ")")
                    .call(d3.axisBottom(scaleX));
            }
        }

        function configureSeriesZAxis() {
            scaleZ.domain(zAxisTicks.values().sort());
        }

        function drawSeries(seriesData) {
            let t = d3.transition()
                .duration(750)
                .ease(d3.easeLinear);
            let seriesGroup = canvasInnerWrapper.selectAll(".series")
                .data(seriesData);
            seriesGroup.exit().remove(); // EXIT


            seriesGroup = seriesGroup.enter().append("g")
                .attr("class", "series")
                .merge(seriesGroup)
                .attr("fill", function(d) { return scaleZ(d.key); });
            seriesGroup.selectAll("*").remove();

            var seriesRect = seriesGroup
                .selectAll("rect")
                .data(function(d) { return d; });

            seriesRect.exit().remove();

            seriesRect.enter().append("rect")
                .merge(seriesRect)
                .attr("x", function(d) {
                    return layoutType ? scaleX(d.data.versionID) + scaleX.bandwidth() / zAxisTicks.values().length* zAxisTicks.values().sort().indexOf(d3.select(this.parentNode).data()[0].key) : scaleX(d.data.versionID);
                })
                .attr("y", function(d) {
                    return layoutType ? scaleY(d[1] - d[0]): scaleY(d[1]);
                })
                .attr("height", function(d) {
                    return layoutType ? innerHeight - scaleY(d[1] - d[0]) : scaleY(d[0]) - scaleY(d[1]);
                })
                .attr("width", (d) => {
                    return layoutType ? scaleX.bandwidth() / zAxisTicks.values().length : scaleX.bandwidth()
                });
        }

        function drawLegend() {
            let legend = canvasInnerWrapper.selectAll(".legend")
                .data(zAxisTicks.values().sort());
            legend.exit().remove(); // EXIT

            legend  = legend.enter()
                .append("g")
                .attr("class", "legend")
                .merge(legend);
            legend.selectAll("*").remove();
            legend.attr("transform", function(d, i) { return "translate(0," + i * 20 + ")"; })
                .style("font", "10px sans-serif");

            legend.append("rect")
                .attr("x", chartPlotAreaInnerWidth - 16)
                .attr("width", 16)
                .attr("height", 16)
                .attr("fill", function(d) {
                    return invisibleSeries.values().indexOf(d) === -1 ? scaleZ(d) : '#ffffff';
                })
                .attr("stroke", function(d) {
                    return scaleZ(d);
                })
                .attr("stroke-width", 2);

            legend.append("text")
                .attr("x", chartPlotAreaInnerWidth - 24)
                .attr("y", 9)
                .attr("dy", ".35em")
                .attr("text-anchor", "end")
                .text(function(d) {
                    return d;
                });

            legend.on('click', function(d) {
                invisibleSeries.has(d) ? invisibleSeries.remove(d) : invisibleSeries.add(d);
                drawCompleteChart(calculateStackedData(), true);
            });
        }

        function transitionStacked() {
            layoutType = 0;
            configureLeftAxisScale();
            drawLeftAxis(true);
            var t = d3.transition()
                .duration(750)
                .ease(d3.easeLinear)
                .delay(function(d, i) { return i * 10; });
            canvasInnerWrapper.selectAll('g.series').selectAll("rect")
                .transition(t)
                .attr("x", function(d, i, j) {
                    return scaleX(d.data.versionID);
                })
                .attr("y", function(d) {
                    return scaleY(d[1]);
                })
                .attr("height", function(d) {
                    return scaleY(d[0]) - scaleY(d[1]);
                })
                .attr("width", scaleX.bandwidth())
                .transition(t);
        }

        function transitionGrouped() {
            layoutType = 1;
            configureLeftAxisScale();
            drawLeftAxis(true);
            var t = d3.transition()
                .duration(750)
                .ease(d3.easeLinear)
                .delay(function(d, i) { return i * 10; });
            canvasInnerWrapper.selectAll('g.series').selectAll("rect")
                .transition(t)
                .attr("x", function(d) {
                    return scaleX(d.data.versionID) + scaleX.bandwidth() / zAxisTicks.values().length* zAxisTicks.values().sort().indexOf(d3.select(this.parentNode).data()[0].key);
                })
                .attr("width", scaleX.bandwidth() / zAxisTicks.values().length)
                .transition(t)
                .attr("y", function(d) {
                    return scaleY(d[1] - d[0]);
                })
                .attr("height", function(d) {
                    return innerHeight - scaleY(d[1] - d[0]);
                });
        }

        function switchGraphType(radioBtn) {
            if (radioBtn) {
                transitionGrouped();
            } else {
                transitionStacked();
            }
        }

        function updateDimensions() {
            chartContainerInnerWidth = chartContainer.offsetWidth - 30;
            margin = chartContainerInnerWidth > breakPoint ? {top: 20, right: 80, bottom: 30, left: 50} : {top: 20, right: 0, bottom: 30, left: 0};
            width = chartContainerInnerWidth > 960 ? 960 : (chartContainerInnerWidth > breakPoint ? breakPoint : chartContainerInnerWidth);
            width = width - parseFloat(getComputedStyle(chartContainer).paddingLeft) - parseFloat(getComputedStyle(chartContainer).paddingRight);
            height = 0.6 * width;
            innerHeight = height - margin.top - margin.bottom;
            chartPlotAreaInnerWidth = width - margin.left - margin.right;
            svg.attr('height', height)
                .attr('width', width);
            canvasInnerWrapper.attr('transform', 'translate(' + margin.left + ', ' + margin.top + ')');
            scaleX.range([0, chartPlotAreaInnerWidth]);
            scaleY.range([innerHeight, 0]);
        }
    };

    rc.models.treeMapChart = (obj) => {
        let breakPoint = 768,
            chartContainer = rc.utils.getChartContainer(obj),
            chartContainerInnerWidth, chartPlotAreaInnerWidth, svg, margin, width, height, innerHeight, simulation,
            root = hierarchyChart({key: 'World', values: d3.nest().key(function(d) { return d.region; }).key(function(d) { return d.subregion; }).entries(obj.unProcessedDataArray)});
        root.children.forEach(collapse);

        svg = d3.select(chartContainer).append('svg');
        let canvasInnerWrapper = svg.append('g');
        updateDimensions();
        let treemap = d3.treemap()
            .tile(d3.treemapResquarify)
            .size([width, height])
            .round(true)
            .paddingInner(1);
        treemap(root);
        let aggregatedGroup = canvasInnerWrapper.append('g')
            .attr('class', 'aggregate');
        aggregatedGroup.append("rect")
            .attr("y", -margin.top)
            .attr("width", width)
            .attr("height", margin.top);

        aggregatedGroup.append("text")
            .attr("x", 6)
            .attr("y", 6 - margin.top)
            .attr("dy", ".75em");
        let childrenGroup = canvasInnerWrapper.append('g')
            .attr('class', 'children');
        display(root);

        function hierarchyChart(obj) {
            return d3.hierarchy(obj, function(d) {
                return d.values;
            }).sum(function(d) {
                return d.value;
            }).eachBefore(function(d) {
                d.data.id = (d.parent ? d.parent.data.id + "." : "") + d.data.key;
                d._children = d.children;
            }).sort(function(a, b) { return b.height - a.height || b.value - a.value; });
        }

        function display(treeRoot) {
            let fader = function(color) { return d3.interpolateRgb(color, "#fff")(0.2); },
                color = d3.scaleOrdinal(d3.schemeCategory10.map(fader)),
                format = d3.format(",d"),
                t = d3.transition()
                    .duration(500)
                    .ease(d3.easeLinear);

            let aggregatedGroup = canvasInnerWrapper.select('g.aggregate');
            aggregatedGroup.datum(treeRoot)
                .on("click", transitionParent)
                .select('rect')
                .attr("fill", function(d) {
                    return color(d.data.id);
                });
            aggregatedGroup.select('text')
                .text(function(d) {
                    return name(d);
                });

            let cell = canvasInnerWrapper.select('g.children').selectAll("g")
                .data(treeRoot.leaves());

            let newCells = cell.enter().append("g");

            let allCells = newCells.merge(cell)
                .on("click", expandChild)
                .transition(t)
                .attr("transform", function(d) {
                    return "translate(" + d.x0 + "," + d.y0 + ")";
                });

            newCells.append("rect");
            newCells.append("text")
                .attr("x", 6)
                .attr("y", 20);

            cell.exit().remove();


            allCells.select('rect').attr("id", function(d) {
                return d.data.id;
            })
                .attr("width", function(d) {
                    return d.x1 - d.x0;
                })
                .attr("height", function(d) {
                    return d.y1 - d.y0;
                })
                .attr("fill", function(d) {
                    return color(d.data.id);
                });

            allCells.select('text').text(function(d) {
                return d.data.key + ' (' + format(d.value) + ')';
            });

            function name(d) {
                return d.parent
                    ? name(d.parent) + " / " + d.data.key + " (" + format(d.value) + ")"
                    : d.data.key + " (" + format(d.value) + ")";
            }
        }

        function transitionParent(aggregateChildren) {
            if(!aggregateChildren.parent) return;
            display(aggregateChildren.parent);
        }

        function expandChild(parentRoot) {
            if(parentRoot.height === 0) return;
            let treemap = d3.treemap()
                .tile(d3.treemapResquarify)
                .size([width, height])
                .round(true)
                .paddingInner(1);
            let childTreeRoot = hierarchyChart(parentRoot.data);
            childTreeRoot.children.forEach(collapse);
            treemap(childTreeRoot);
            childTreeRoot.parent = parentRoot.parent;
            display(childTreeRoot);
        }

        function collapse(d) {
            if(d.children) {
                d._children = d.children;
                d._children.forEach(collapse);
                delete d.children;
            }
        }

        function updateDimensions() {
            chartContainerInnerWidth = chartContainer.offsetWidth - 30;
            margin = {top: 24, right: 0, bottom: 0, left: 0};
            width = chartContainerInnerWidth > 960 ? 960 : (chartContainerInnerWidth > breakPoint ? breakPoint : chartContainerInnerWidth);
            width = width - parseFloat(getComputedStyle(chartContainer).paddingLeft) - parseFloat(getComputedStyle(chartContainer).paddingRight);
            height = 0.6 * width;
            svg.attr('height', height)
                .attr('width', width);
            canvasInnerWrapper.attr('transform', 'translate(' + margin.left + ', ' + margin.top + ')')
                .style("shape-rendering", "crispEdges");
        }
    }
})();
