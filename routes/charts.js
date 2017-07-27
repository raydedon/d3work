/**
 * Created by Ray on 7/16/2017.
 */
var express = require('express');
var router = express.Router();
var fs = require('fs');
var path = require("path");
var d3 = require('d3');

/* GET users listing. */
router.get('/', function(req, res, next) {
    var file = path.join(__dirname, '../data', 'charts.json');
    fs.readFile(file, 'utf8', function (err, data) {
        if (err) {
            console.log('Error: ' + err);
            return;
        }
        data = JSON.parse(data);
        res.json(data);
    });
});

router.get('/combined', function(req, res, next) {
    var file = path.join(__dirname, '../data', 'superstore-sample-data.tsv');
    fs.readFile(file, 'utf8', function (err, data) {
        if (err) {
            console.log('Error: ' + err);
            return;
        }
        res.json(d3.tsvParse(data));
    });
});

router.get('/cluster', function(req, res, next) {
    var file = path.join(__dirname, '../data', 'flare.csv');
    fs.readFile(file, 'utf8', function (err, data) {
        if (err) {
            console.log('Error: ' + err);
            return;
        }
        res.json(d3.csvParse(data));
    });
});

router.get('/customize', function(req, res, next) {
    var file = path.join(__dirname, '../data', 'superstore-sample-data.tsv');
    fs.readFile(file, 'utf8', function (err, data) {
        if (err) {
            console.log('Error: ' + err);
            return;
        }
        res.json(d3.tsvParse(data));
    });
});

/*
router.get('/line', function(req, res, next) {
    var file = path.join(__dirname, '../data', 'flare.csv');
    fs.readFile(file, 'utf8', function (err, data) {
        if (err) {
            console.log('Error: ' + err);
            return;
        }
        res.json(d3.csvParse(data));
    });
});
*/

module.exports = router;
