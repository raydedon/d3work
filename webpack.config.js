const path = require('path');
const webpack = require('webpack');
let plugins = require('webpack-load-plugins')();
let nodeModules = path.resolve(__dirname, '../node_modules');
let pathToAngular = path.resolve(nodeModules, 'angular/angular.min.js');
const ExtractTextPlugin = require("extract-text-webpack-plugin");
module.exports = {
    context: path.resolve(__dirname, 'public'),
    devtool: 'cheap-module-eval-source-map',
    entry: {
        // main: '../src/app/d3WorkApp-bootstrap-app.js',
        mainCss: '../src/stylesheet/style.scss'
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
            },
            {
                test: /\.woff$/,
                loader: 'url?limit=100000'
            },
            {
                test: /\.woff2$/,
                loader: 'url?limit=100000'
            },
            {
                test: /\.ttf$/,
                loader: 'url?limit=100000'
            },
            {
                test: /\.eot$/,
                loader: 'file'
            },
            {
                test: /\.svg$/,
                loader: 'url?limit=100000'
            },
            {
                test: /\.(png|jpg)$/,
                loader: 'url?limit=25000'
            },
/*
            {
                test: /\.scss$/,
                use: [{
                    loader: 'style-loader', // inject CSS to page
                }, {
                    loader: 'css-loader', // translates CSS into CommonJS modules
                }, {
                    loader: 'postcss-loader', // Run post css actions
                    options: {
                        plugins: function () { // post css plugins, can be exported to postcss.config.js
                            return [
                                require('precss'),
                                require('autoprefixer')
                            ];
                        }
                    }
                }, {
                    loader: 'sass-loader'
                }]
            }
*/
            {
                test: /\.scss$/,
                use: ExtractTextPlugin.extract({
                    fallback: 'style-loader',
                    //resolve-url-loader may be chained before sass-loader if necessary
                    use: [{
                        loader: 'css-loader', // translates CSS into CommonJS modules
                    }, {
                        loader: 'postcss-loader', // Run post css actions
                        options: {
                            plugins: function () { // post css plugins, can be exported to postcss.config.js
                                return [
                                    require('precss'),
                                    require('autoprefixer')
                                ];
                            }
                        }
                    }, {
                        loader: 'sass-loader'
                    }]
                })
            }
        ]
    },
    performance: {
        hints: "error"
    },
    plugins: [
        new ExtractTextPlugin("styles.css"),
    ]
};