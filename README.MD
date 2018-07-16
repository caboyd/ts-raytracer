# Typescript Webgl2 Raytracer

Implementation of a Raytracter in Typescript using webgl2

[Demo](http://iwanttoeatyo.github.io/ts-raytracer/index.html)

## Getting Started

These instructions will get you a copy of the project up and running on your local machine.

### Prerequisites

installations of node and npm

### Installing

Download repository locally

install node modules

```
npm install
```

Run development environment

```
npm run dev
```

## Deployment

### Github pages
 
https://gist.github.com/cobyism/4730490#gistcomment-2375522

#### Pre-Setup
Make sure there is a gh-pages branch in the repository. If not then create an empty one.
Commit and push anything in master branch because it will be deleted locally

```
git checkout --orphan gh-pages
git rm --cached -r .
```
Delete all of the files then commit an empty branch
```
git commit -m "First commit" --allow-empty
git push -u origin gh-pages
```
Get the master branch back
```
git checkout master
git pull origin master
```

#### Setup

Set up a git worktree to deploy to gh-pages

```
rm -rf dist
echo "dist/" >> .gitignore
git worktree add dist gh-pages
```

#### Deploy

Run the gh-publish command

```
npm run gh-publish
```

Which just runs these commands

```
npm run build
cd dist
git add --all
git commit -m "Deploy to gh-pages"
git push origin gh-pages
cd ..
```

## Built With

* [gl-matrix](http://glmatrix.net/) - Vector math
* [html-webpack-plugin](https://www.npmjs.com/package/html-webpack-plugin) - HTML templater
* [copy-webpack-plugin](https://www.npmjs.com/package/copy-webpack-plugin) - Copy files from assets to docs/assets
* [imagemin-webpack-plugin](https://www.npmjs.com/package/imagemin-webpack-plugin) - Compress images
* [raw-loader](https://www.npmjs.com/package/raw-loader) - require files as strings
* [ts-loader](https://www.npmjs.com/package/ts-loader) - require ts files
* [typescript](https://www.typescriptlang.org/) - Typescript Language
* [uglifyjs-webpack-plugin](https://www.npmjs.com/package/uglifyjs-webpack-plugin) - minimizer
* [webpack](https://webpack.js.org/) - Build tool
* [webpack-dev-server](https://www.npmjs.com/package/webpack-dev-server) - Hotload development environment


## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details

