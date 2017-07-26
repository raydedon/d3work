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
})();
