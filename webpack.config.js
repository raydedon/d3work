const path = require('path');
const webpack = require('webpack');
let plugins = require('webpack-load-plugins')();
let nodeModules = path.resolve(__dirname, '../node_modules');
let pathToAngular = path.resolve(nodeModules, 'angular/angular.min.js');

module.exports = {
    context: path.resolve(__dirname, 'public'),
    devtool: 'cheap-module-eval-source-map',
    entry: {
        main: '../src/app/d3WorkApp-bootstrap-app.js'
    },
    resolve: {
        alias: {
            'angular': pathToAngular
        }
    },
    output: {
        path: path.resolve(__dirname, 'public'),
        filename: '[name].bundle.js'
    },
    module: {
        rules: [
            {
                test: /\.js$/,
                exclude: [/node_modules/],
                use: ['babel-loader']
            },
            {
                test: /\.html$/,
                use: [{
                    loader: 'html-loader',
                    options: {
                        minimize: true
                    }
                }]
            }
        ]
    },
    performance: {
        hints: "error"
    }
};