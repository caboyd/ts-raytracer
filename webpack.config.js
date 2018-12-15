const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const CopyWebpackPlugin = require('copy-webpack-plugin');
const ImageminPlugin = require('imagemin-webpack');
const imageminJpegtran = require("imagemin-jpegtran");
const imageminOptipng = require("imagemin-optipng");

module.exports = (env, argv) => {
	const isProduction = argv.mode === 'production';
	return {
		entry: './src/main.ts',
		output: {
			path: path.resolve(__dirname, 'dist'),
			filename: 'bundle.js',
			publicPath: ''
		},
		//Required for imgui-js to work
		node: {
			fs: 'empty'
		},
		plugins: [
			new HtmlWebpackPlugin({
					title: '',
					filename: 'index.html',
					template: 'index.html',
					minify: {
						collapseWhitespace: isProduction,
						minifyCSS: isProduction
					}
				}
			),
			new CopyWebpackPlugin([
				{
					from: 'assets',
					to: 'assets',
					ignore: ['*.bmp', '.gitkeep']
				}
			]),
			new ImageminPlugin(
				{
					bail: false, // Ignore errors on corrupted images
					cache: true,
					imageminOptions: {

						plugins: [
							imageminJpegtran({
								progressive: true
							}),
							imageminOptipng({
								optimizationLevel: 5
							}),
						]
					}
				}
			)
		],
		resolve: {
			modules: [
				path.resolve(__dirname),
				'src',
				'node_modules'
			],
			// Add `.ts` and `.tsx` as a resolvable extension.
			extensions: ['.webpack.js', '.web.js', '.ts', '.tsx', '.js', '.vert', '.frag'],
		},
		module: {
			rules: [
				// all files with a `.ts` or `.tsx` extension will be handled by `ts-loader`
				{
					test: /\.tsx?$/,
					loader: 'ts-loader'
				},
				{
					test: /\.(glsl|vs|fs|frag|vert)$/,
					loader: 'raw-loader'
				},
				{
					test: /\.(txt|obj|mtl|bmp)$/,
					loader: 'raw-loader'
				},
				{
					test: /\.(jpe?g|png|gif|svg)$/i,
					use: [
						{
							loader: "file-loader"
						}
					]
				}
			]
		},
		devtool: "source-map"
	};
}