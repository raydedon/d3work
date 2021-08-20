/**
 * Created by Ray on 7/16/2017.
 */
let express = require('express');
let router = express.Router();
let fs = require('fs');
let path = require("path");
let d3 = require('d3');
/* GET users listing. */
router.get('/', function(req, res, next) {
    let file = path.join(__dirname, '../data', 'charts.json');
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
    let file = path.join(__dirname, '../data', 'superstore-sample-data.tsv');
    fs.readFile(file, 'utf8', function (err, data) {
        if (err) {
            console.log('Error: ' + err);
            return;
        }
        res.json(d3.tsvParse(data));
    });
});

router.get('/cluster', function(req, res, next) {
    let file = path.join(__dirname, '../data', 'flare.csv');
    fs.readFile(file, 'utf8', function (err, data) {
        if (err) {
            console.log('Error: ' + err);
            return;
        }
        res.json(d3.csvParse(data));
    });
});

router.get('/customize', function(req, res, next) {
    let file = path.join(__dirname, '../data', 'superstore-sample-data.tsv');
    fs.readFile(file, 'utf8', function (err, data) {
        if (err) {
            console.log('Error: ' + err);
            return;
        }
        res.json(d3.tsvParse(data));
    });
});

router.get('/line', function(req, res, next) {
    res.status(200).json({status:"ok"})
});

router.get('/hierarchy', function(req, res, next) {
    let file = path.join(__dirname, '../data', 'salesHeirarchicalData.tsv');
    fs.readFile(file, 'utf8', function (err, data) {
        if (err) {
            console.log('Error: ' + err);
            return;
        }
        res.json(d3.tsvParse(data));
    });
});

router.get('/chord', function(req, res, next) {
    let file = path.join(__dirname, '../data', 'chordChart.json');
    fs.readFile(file, 'utf8', function (err, data) {
        if (err) {
            console.log('Error: ' + err);
            return;
        }
        res.json(JSON.parse(data));
    });
});

router.get('/force', function(req, res, next) {
    let file = path.join(__dirname, '../data', 'forceLayoutJSON.json');
    fs.readFile(file, 'utf8', function (err, data) {
        if (err) {
            console.log('Error: ' + err);
            return;
        }
        res.json(JSON.parse(data));
    });
});

router.get('/stacked', function(req, res, next) {
    let file = path.join(__dirname, '../data', 'JIRADummyData.json');
    fs.readFile(file, 'utf8', function (err, data) {
        if (err) {
            console.log('Error: ' + err);
            return;
        }
        res.json(JSON.parse(data).data1);
    });
});

router.get('/treemap', function(req, res, next) {
    let file = path.join(__dirname, '../data', 'treeMapData.json');
    fs.readFile(file, 'utf8', function (err, data) {
        if (err) {
            console.log('Error: ' + err);
            return;
        }
        data = JSON.parse(data);
        res.json(data);
    });
});

module.exports = router;
