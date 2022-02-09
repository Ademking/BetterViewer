const { src, dest, parallel } = require('gulp');
const concat = require('gulp-concat');
const uglify = require('gulp-uglify');
const { series } = require('gulp');
const { watch } = require('gulp');

const watcher = watch(['css/*.css', 'js/*.js'], function(cb) {
  bundleJS(cb);
  bundleCSS(cb);
  cb();
});


watcher.on('change', function(path, stats) {
  console.log(`File ${path} was changed`);
});

function bundleJS(cb) {
  src([
    './js/lib/*.js',
    './js/app.js'
  ])
    .pipe(concat('all.js'))
    //.pipe(uglify())
    .pipe(dest('dist/'));
    cb();
}

function bundleCSS(cb) {
   src('./css/*.css')
    .pipe(concat('all.css'))
    .pipe(dest('dist/'));
    cb();
}

exports.default = parallel(bundleJS, bundleCSS);
