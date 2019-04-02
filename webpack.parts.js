exports.devServer = ({ host, port } = {}) => ({
  devServer: {
    open: true,
    stats: "errors-only",
    overlay: true,
    host,
    port
  }
});

exports.loadImages = ({ include, exclude, options } = {}) => ({
  module: {
    rules: [
      {
        test: /\.(png|jpg)$/,
        include,
        exclude,
        use: {
          loader: "url-loader",
          options
        }
      },
      {
        test: /\.svg$/,
        use: {
          loader: "svg-inline-loader",
          options: {
            removeTags: true,
            removeSVGTagAttrs: false
          }
        }
      }
    ]
  }
});

exports.loadCSS = ({ include, exclude } = {}) => ({
  module: {
    rules: [
      {
        test: /\.css$/,
        include,
        exclude,

        use: ["style-loader", "css-loader"]
      },
      {
        test: /\.(scss|sass)$/,
        use: [
          "style-loader",
          "css-loader",
          {
            loader: "fast-sass-loader",
            options: {}
          }
        ]
      }
    ]
  }
});
