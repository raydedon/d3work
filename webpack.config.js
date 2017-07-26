module.exports = {
  entry: './index.js',
  output: {
    path: './',
    filename: 'bundle.js',
    publicPath: ''
  },
  module: {
    loaders: [{
      test: /\.scss$/,
      loader: 'style!css!sass'
    }]
  }
}