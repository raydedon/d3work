/**
 * Created by Ray on 7/30/2017.
 */
var express = require('express');
var router = express.Router();
var Client = require('node-rest-client').Client;
var issuesProcessor = require('../helper/issues-processor');

/* GET filter listing. */
router.get('/:id', function(req, res, next) {
    if (!req.params.id) {
        res.status(500);
        res.send({"Error": "Looks like you are not sending the filter id to get the filter details."});
        console.log("Looks like you are not sending the filter id to get the filter details.");
    }
    console.info("https://jira.optymyze.net/rest/api/latest/filter/" + req.params.id);
    var options_auth = { user: "ray", password: "Passw0rd@12345" };
    var client = new Client(options_auth);
    client.get("https://jira.optymyze.net/rest/api/latest/filter/" + req.params.id, function (data, response) {
        // parsed response body as js object
        console.log('data: ' + data.searchUrl);
        res.json({'searchUrl': data.searchUrl});
    });

});

module.exports = router;