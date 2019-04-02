const merge = require("webpack-merge");
const HtmlWebpackPlugin = require("html-webpack-plugin");

const parts = require("./webpack.parts");

const commonConfig = merge([
    {
        plugins: [
            new HtmlWebpackPlugin({
                title: "Webpack demo",
            }),
        ],
    },
    parts.loadCSS()
]);

const productionConfig = merge([
    parts.loadImages({
        options: {
            limit: 15000,
            name: "[name].[ext]",
        }
    }),
]);

const developmentConfig = merge([
    parts.devServer(),
    parts.loadImages(),
]);

module.exports = mode => {
    if (mode === "production") {
        return merge(commonConfig, productionConfig, { mode });
    }

    return merge(commonConfig, developmentConfig, { mode });
}
