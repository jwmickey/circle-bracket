const merge = require("webpack-merge");
const HtmlWebpackPlugin = require("html-webpack-plugin");
const CopyWebpackPlugin = require("copy-webpack-plugin");
const CleanWebpackPlugin = require("clean-webpack-plugin");

const parts = require("./webpack.parts");

const commonConfig = merge([
  {
    plugins: [
      new CleanWebpackPlugin(),
      new HtmlWebpackPlugin({
        title: "Circular Tournament Bracket",
        template: "index.html"
      }),
      new CopyWebpackPlugin([
        {
          from: "seasons",
          to: "seasons",
          force: true,
          transform(content, path) {
            return Promise.resolve(content.toString().replace(/\s+/g, ""));
          }
        }
      ])
    ],
    entry: {
      index: "./src/index.js"
    },
    output: {
      chunkFilename: "[name].bundle.js"
    }
  },
  parts.loadJS(),
  parts.loadCSS(),
  parts.loadSVG()
]);

const productionConfig = merge([
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

const developmentConfig = merge([parts.devServer(), parts.loadImages()]);

module.exports = mode => {
  if (mode === "production") {
    return merge(commonConfig, productionConfig, { mode });
  }

  return merge(commonConfig, developmentConfig, { mode });
};
