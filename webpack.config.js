const path = require('path');
const Webpack = require('webpack');
const ExtractTextPlugin = require("extract-text-webpack-plugin");
const HtmlWebpackPlugin = require('html-webpack-plugin');
const CleanWebpackPlugin = require('clean-webpack-plugin');

const pathsToClean = ['public'];
const cleanOptions = {
    root:     path.resolve(__dirname),
    verbose:  true,
    dry:      false
};

const isProd = (process.env.NODE_ENV || 'dev') === 'prod';

const bootstrapEntryPoints = require('./webpack.bootstrap.config');
const bootstrapConfig = isProd ? bootstrapEntryPoints.prod : bootstrapEntryPoints.dev;

const devSCSS = ['style-loader', 'css-loader', 'postcss-loader', 'sass-loader'];
const prodSCSS = ExtractTextPlugin.extract({
    fallback: 'style-loader',
    //resolve-url-loader may be chained before sass-loader if necessary
    use: ['css-loader', 'postcss-loader', 'sass-loader']
});
const scssConfig = isProd ? prodSCSS : devSCSS;
const devCSS = ['style-loader', 'css-loader', 'postcss-loader'];
const prodCSS = ExtractTextPlugin.extract({
    fallback: 'style-loader',
    //resolve-url-loader may be chained before sass-loader if necessary
    use: ['css-loader', 'postcss-loader']
});
const cssConfig = isProd ? prodCSS : devCSS;
console.log(`NODE_ENV ${isProd} ${process.env.NODE_ENV} ${scssConfig}`);
module.exports = {
    context: path.resolve(__dirname, 'public'),
    devtool: 'cheap-module-eval-source-map',
    entry: {
        main: '../src/app/d3WorkApp-main-module.js',
        bootstrap: bootstrapConfig
    },
    output: {
        path: path.resolve(__dirname, 'public'),
        filename: '[name].bundle.js'
    },
    module: {
        rules: [
            {
                test: /\.js?/,
                exclude: /node_modules/,
                use: 'babel-loader'
            },
            {
                test: /\.css$/,
                use: prodCSS
            },
            {
                test: /\.scss$/,
                use: prodSCSS
            },
            {
                test: /\.(png|jpg|gif|ttf|eot|woff2?|svg)$/,
                use: [{
                    loader: 'url-loader'
                }]
            },
            {
                test: /\.html$/,
                use: 'html-loader',
                exclude: [
                    /(node_modules|public)/
                ]
            },
            {
                test: /bootstrap-sass\/assets\/javascripts\//,
                use: 'imports-loader?jQuery=jquery'
            }
        ]
    },
    performance: {
        hints: "error"
    },
    plugins: [
        new CleanWebpackPlugin(pathsToClean, cleanOptions),
        new ExtractTextPlugin({
            filename: 'styles.css',
            disable: false,
            allChunks: true
        }),
        new HtmlWebpackPlugin({
            title: 'Custom template',
            template: '../views/index.ejs',
            hash: true,
            cache: true
        }),
        new Webpack.ProvidePlugin({
            jQuery: 'jquery',
            $: 'jquery',
            d3: 'd3'
        })
    ],
    watch: true
};