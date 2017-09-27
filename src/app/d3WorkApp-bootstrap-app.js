/**
 * Created by Ray on 7/14/2017.
 */
require('./d3WorkApp-main-module');
require('./d3WorkApp-config');
require('./d3WorkApp-services');
require('./d3WorkApp-chart-list-controller');
require('./d3WorkApp-chart-controller');
require('./d3WorkApp-chart-component');
require('./d3WorkApp-customize-chart-comp');
require('./d3WorkApp-customize-chart-controller');

angular.element(document).ready(function() {
    angular.bootstrap(document, ['d3WorkApp']);
});
