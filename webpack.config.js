const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const CopyWebpackPlugin = require('copy-webpack-plugin');
const ImageminPlugin = require('imagemin-webpack-plugin').default;
const UglifyJsPlugin = require("uglifyjs-webpack-plugin");

let PROD = (process.env.NODE_ENV === 'production');

module.exports = {
	entry: './src/main.ts',
	output: {
		path: path.resolve(__dirname, 'docs'),
		filename: 'bundle.js',
		publicPath: ''
	},
	plugins: [
		new HtmlWebpackPlugin({
				title: '',
				filename: 'index.html',
				template: 'index.html'
			}
		),
		new CopyWebpackPlugin([
			{from: 'assets',
				to: 'assets',
				ignore: [ '*.bmp' ]
			}
		]),
		new ImageminPlugin(
			{
				test: /\.(jpe?g|png|gif|svg)$/i,
				jpegtran: {
					progressive: true
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
		loaders: [
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
				test: /\.(txt|obj|mtl|bmp|jpg)$/,
				loader: 'raw-loader'
			}
		]
	},
	devServer: {
		historyApiFallback: true,
		hot: true
	},
	devtool: "source-map"
};

if(PROD){
	module.exports.plugins.push(new UglifyJsPlugin({
		uglifyOptions: {
			sourceMap: true,
			compress: {
				ecma: 6,
				warnings: false
			},
			output: {comments: false}
		}
	}));
}