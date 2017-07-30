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

    rc.utils.getAxisTickWidth = (axisObj) => {
        if (axisObj !== undefined && axisObj.tickWidth !== undefined) {
            return axisObj.tickWidth;
        } else {
            return 1;
        }
    };

    rc.utils.getTickLabelFontSize = (axisObj) => {
        if (axisObj !== undefined && axisObj.tickLabelFontSize !== undefined) {
            return axisObj.tickLabelFontSize;
        } else {
            return 10;
        }
    };

    rc.utils.getTickLength = (axisObj) => {
        if (axisObj !== undefined && axisObj.tickLength !== undefined) {
            return axisObj.tickLength;
        } else {
            return 6;
        }
    };

    rc.utils.getDisplayGridLines = (axisObj) => {
        if (axisObj !== undefined && axisObj.displayGridLines !== undefined) {
            return Boolean(axisObj.displayGridLines);
        } else {
            return false;
        }
    };

    rc.models.combinedChart = function(obj) {
        var breakPoint = 768,
            chartContainer = rc.utils.getChartContainer(obj),
            chartContainerInnerWidth, chartPlotAreaInnerWidth, svg, margin, width, height, innerHeight;
        d3.select(chartContainer).html('');
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
        d3.select(chartContainer).html('');
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
        d3.select(chartContainer).html('');
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
        d3.select(chartContainer).html('');
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
})();
