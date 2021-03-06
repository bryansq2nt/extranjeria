'use strict';
const { src, dest, watch, series } = require('gulp');
const log = require('fancy-log');
const colors = require('ansi-colors');
const browserSync = require('browser-sync').create();
const sass = require('gulp-sass')(require('sass'));
const bourbon = require('node-bourbon').includePaths;
const rename = require('gulp-rename');
const concat = require('gulp-concat');
const del = require('del');
const panini = require('panini');
const uglify = require('gulp-uglify-es').default;
const sourcemaps = require('gulp-sourcemaps');
const imagemin = require('gulp-imagemin');
const prettyHtml = require('gulp-pretty-html');
const sassLint = require('gulp-sass-lint');
const htmllint = require('gulp-htmllint');
const jshint = require('gulp-jshint');
const newer = require('gulp-newer');
const autoprefixer = require('gulp-autoprefixer');
const accessibility = require('gulp-accessibility');
const babel = require('gulp-babel');
const nodepath = 'node_modules/';

sass.compiler = require('sass');

// ------------ SETUP TASKS -------------
// Copy Bulma filed into Bulma development folder
function setupBulma() {
  console.log('---------------COPYING BULMA FILES---------------');
  return src([nodepath + 'bulma/*.sass', nodepath + 'bulma/**/*.sass'])
    .pipe(dest('src/assets/sass/'));
}

// ------------ DEVELOPMENT TASKS -------------

// COMPILE SCSS INTO CSS
function compileSCSS() {
  console.log('---------------COMPILING SCSS---------------');
  return src(['src/assets/scss/main.scss'])
    .pipe(sass({
      outputStyle: 'compressed',
      sourceComments: true,
      sourceMap: true,
      includePaths: bourbon
    }).on('error', sass.logError))
    .pipe(autoprefixer('last 2 versions'))
    .pipe(dest('dist/assets/css'))
    .pipe(browserSync.stream());
}

// USING PANINI, TEMPLATE, PAGE AND PARTIAL FILES ARE COMBINED TO FORM HTML MARKUP
function compileHTML() {
  console.log('---------------COMPILING HTML WITH PANINI---------------');
  panini.refresh();
  return src('src/pages/**/*.html')
    .pipe(panini({
      root: 'src/pages/',
      layouts: 'src/layouts/',
      /*pageLayouts: {
        //All pages inside src/pages/blog will use the blog.html layout
        'blog': 'blog'
      }*/
      partials: 'src/partials/',
      helpers: 'src/helpers/',
      data: 'src/data/'
    }))
    .pipe(dest('dist'))
    .pipe(browserSync.stream());
}

// COPY CUSTOM JS
function compileJS() {
  console.log('---------------COMPILE CUSTOM JS---------------');
  return src([
    'src/assets/js/functions.js',
    'src/assets/js/main.js',
    'src/assets/js/auth.js',
    'src/assets/js/touch.js',
    'src/assets/js/dashboards/personal-1.js',
  ])
    .pipe(babel())
    .pipe(uglify())
    .pipe(dest('dist/assets/js/'))
    .pipe(browserSync.stream());
}

// RESET PANINI'S CACHE OF LAYOUTS AND PARTIALS
function resetPages(done) {
  console.log('---------------CLEARING PANINI CACHE---------------');
  panini.refresh();
  done();
}

// SASS LINT
function scssLint() {
  console.log('---------------SASS LINTING---------------');
  return src('src/assets/scss/**/*.scss')
    .pipe(sassLint({
      configFile: '.scss-lint.yml'
    }))
    .pipe(sassLint.format())
    .pipe(sassLint.failOnError());
}

// HTML LINTER
function htmlLint() {
  console.log('---------------HTML LINTING---------------');
  return src('dist/*.html')
    .pipe(htmllint({}, htmllintReporter));
}

function htmllintReporter(filepath, issues) {
  if (issues.length > 0) {
    issues.forEach((issue) => {
      log(colors.cyan('[gulp-htmllint] ') + colors.white(filepath + ' [' + issue.line + ']: ') + colors.red('(' + issue.code + ') ' + issue.msg));
    });
    process.exitCode = 1;
  } else {
    console.log('---------------NO HTML LINT ERROR---------------');
  }
}

// JS LINTER
function jsLint() {
  return src('src/assets/js/*.js')
    .pipe(jshint())
    .pipe(jshint.reporter('default'));
}

// WATCH FILES
function watchFiles() {
  watch('src/**/*.html', compileHTML);
  watch('src/assets/scss/**/*.scss', compileSCSS);
  watch('src/assets/js/**/*.js', compileJS);
  watch('src/assets/img/**/*', copyImages);
}


// BROWSER SYNC
function browserSyncInit(done) {
  console.log('---------------BROWSER SYNC---------------');
  browserSync.init({
    server: './dist'
  });
  return done();
}

// ------------ OPTIMIZATION TASKS -------------

// COPIES AND MINIFY IMAGE TO DIST
function minifyImages() {
  console.log('---------------OPTIMIZING IMAGES---------------');
  return src('src/assets/img/**/*.+(png|jpg|jpeg|gif|svg|mp4|webm|ogg)')
    .pipe(newer('dist/assets/img/'))
    .pipe(imagemin([
      imagemin.gifsicle({ optimizationLevel: 3, interlaced: true }),
      imagemin.mozjpeg({ quality: 85 }),
      imagemin.optipng({ optimizationLevel: 3 }),
      imagemin.svgo()
    ], {
      verbose: true
    }))
    .pipe(dest('dist/assets/img/'))
    .pipe(browserSync.stream());
}

function copyImages() {
  console.log('---------------COPY IMAGES---------------');
  return src('src/assets/img/**/*.+(png|jpg|jpeg|gif|svg|mp4|webm|ogg)')
    .pipe(newer('dist/assets/img/'))
    .pipe(dest('dist/assets/img/'))
    .pipe(browserSync.stream());
}


// PLACES FONT FILES IN THE DIST FOLDER
function copyFont() {
  console.log('---------------COPYING FONTS INTO DIST FOLDER---------------');
  return src([
    'src/assets/font/*',
  ])
    .pipe(dest('dist/assets/fonts'))
    .pipe(browserSync.stream());
}

// PLACES DATA FILES IN THE DIST FOLDER
function copyData() {
  console.log('---------------COPYING DATA INTO DIST FOLDER---------------');
  return src([
    'src/data/**/*',
  ])
    .pipe(dest('dist/assets/data'))
    .pipe(browserSync.stream());
}

// CONCATENATE JS PLUGINS
function concatPlugins() {
  console.log('---------------CONCATENATE JS PLUGINS---------------');
  return src([
    nodepath + 'jquery/dist/jquery.min.js',
    nodepath + 'd3/dist/d3.min.js',
    nodepath + 'feather-icons/dist/feather.min.js',
    nodepath + 'lozad/dist/lozad.min.js',
    nodepath + 'peity/jquery.peity.min.js',
    nodepath + 'hammerjs/hammer.min.js',
    nodepath + 'notyf/notyf.min.js',
    nodepath + 'simplebar/dist/simplebar.min.js',
    nodepath + 'apexcharts/dist/apexcharts.min.js',
    nodepath + 'billboard.js/dist/billboard.min.js',
    'src/assets/vendor/js/*',
  ])
    .pipe(concat('app.js'))
    .pipe(sourcemaps.init())
    .pipe(uglify())
    .pipe(sourcemaps.write('./'))
    .pipe(dest('dist/assets/js'))
    .pipe(browserSync.stream());
}

// CONCATENATE CSS PLUGINS
function concatCssPlugins() {
  console.log('---------------CONCATENATE CSS PLUGINS---------------');
  return src([
    nodepath + 'notyf/notyf.min.css',
    nodepath + 'simplebar/dist/simplebar.min.css',
    nodepath + 'billboard.js/dist/billboard.min.css',
    'src/assets/vendor/css/*',
  ])
    .pipe(sourcemaps.init())
    .pipe(concat('app.css'))
    .pipe(sourcemaps.write('./'))
    .pipe(dest('dist/assets/css'))
    .pipe(browserSync.stream());
}

// COPY JS VENDOR FILES
function jsVendor() {
  console.log('---------------COPY JAVASCRIPT VENDOR FILES INTO DIST---------------');
  return src([
    'src/assets/vendor/js/*',
  ])
    .pipe(dest('dist/assets/vendor/js'))
    .pipe(browserSync.stream());
}

// COPY CSS VENDOR FILES
function cssVendor() {
  console.log('---------------COPY CSS VENDOR FILES INTO DIST---------------');
  return src([
    'src/assets/vendor/css/*',

  ])
    .pipe(dest('dist/assets/vendor/css'))
    .pipe(browserSync.stream());
}

// PRETTIFY HTML FILES
function prettyHTML() {
  console.log('---------------HTML PRETTIFY---------------');
  return src('dist/*.html')
    .pipe(prettyHtml({
      indent_size: 4,
      indent_char: ' ',
      unformatted: ['code', 'pre', 'em', 'strong', 'span', 'i', 'b', 'br']
    }))
    .pipe(dest('dist'));
}

// DELETE DIST FOLDER
function cleanDist(done) {
  console.log('---------------REMOVING OLD FILES FROM DIST---------------');
  del.sync('dist');
  return done();
}

// ACCESSIBILITY CHECK
function HTMLAccessibility() {
  return src('dist/*.html')
    .pipe(accessibility({
      force: true
    }))
    .on('error', console.log)
    .pipe(accessibility.report({
      reportType: 'txt'
    }))
    .pipe(rename({
      extname: '.txt'
    }))
    .pipe(dest('accessibility-reports'));
}



// RUN ALL LINTERS
exports.linters = series(htmlLint, scssLint, jsLint);

// RUN ACCESSIILITY CHECK
exports.accessibility = HTMLAccessibility;

//SETUP
exports.setup = series(setupBulma);

// DEV
exports.dev = series(
  cleanDist,
  copyFont,
  copyData,
  jsVendor,
  cssVendor,
  compileHTML,
  concatPlugins,
  concatCssPlugins,
  compileJS,
  copyImages,
  resetPages,
  prettyHTML,
  compileSCSS,
  browserSyncInit,
  watchFiles
);

// BUILD
exports.build = series(
  cleanDist,
  copyFont,
  copyData,
  jsVendor,
  cssVendor,
  compileHTML,
  concatPlugins,
  concatCssPlugins,
  compileJS,
  minifyImages,
  resetPages,
  prettyHTML,
  compileSCSS,
);

