const merge = require("webpack-merge");
const HtmlWebpackPlugin = require("html-webpack-plugin");

const parts = require("./webpack.parts");

const commonConfig = merge([
  {
    plugins: [
      new HtmlWebpackPlugin({
        title: "Circular Tournament Bracket"
      })
    ]
  },
  parts.loadJS(),
  parts.loadCSS()
]);

const productionConfig = merge([
  parts.loadSVG({ loader: "inline" }),
  parts.loadImages({
    options: {
      limit: 15000,
      name: "[name].[ext]"
    }
  }),
  {
    devtool: "source-map"
  }
]);

const developmentConfig = merge([
  parts.devServer(),
  parts.loadSVG({ loader: "file" }),
  parts.loadImages()
]);

module.exports = mode => {
  if (mode === "production") {
    return merge(commonConfig, productionConfig, { mode });
  }

  return merge(commonConfig, developmentConfig, { mode });
};
