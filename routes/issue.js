/**
 * Created by Ray on 7/30/2017.
 */
var express = require('express');
var router = express.Router();
var Client = require('node-rest-client').Client;
var issuesProcessor = require('../helper/issues-processor');
var querystring = require('querystring');
var fs = require('fs');
var path = require("path");

/* GET issues listing. */
router.post('/', function(req, res, next) {
    if (!req.body.searchUrl) {
        res.status(500);
        res.send({"Error": "Looks like you are not sending the search url."});
        console.log("Looks like you are not sending the search url.");
    }
    var options_auth = { user: "ray", password: "Passw0rd@123456" };
    var client = new Client(options_auth);
    var params = {'startAt': req.body.startAt, 'maxResults': req.body.maxResults};
    var searchURL = req.body.searchUrl + '&' + querystring.stringify(params);
    client.get(searchURL, function (data, response) {
        var result = issuesProcessor.processIssuesJSON(data);
        result.searchUrl = data.searchUrl;
        res.json(result);
    });
});

module.exports = router;
