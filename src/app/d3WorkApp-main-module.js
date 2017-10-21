/**
 * Created by Ray on 7/14/2017.
 */
let angular = require('angular');
require('angular-ui-router');
require('angular-ui-bootstrap');
require('angular-bootstrap-colorpicker');
require('../stylesheet/style.scss');
require('./responsive-chart');

angular.module('d3WorkApp', ['ui.router', 'ui.bootstrap', 'colorpicker.module']);

require('./d3WorkApp-config');
require('./d3WorkApp-services');
require('./d3WorkApp-chart-list-controller');
require('./d3WorkApp-chart-controller');
require('./d3WorkApp-chart-component');
require('./d3WorkApp-customize-chart-comp');
require('./d3WorkApp-customize-chart-controller');
