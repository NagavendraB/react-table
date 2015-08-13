var gulp = require('gulp');
var gutil = require('gulp-util');
var browserify = require('browserify');
var streamify = require('gulp-streamify');
var connect = require('connect');
var livereload = require('gulp-livereload');
var http = require('http');
var source = require('vinyl-source-stream');
var rename = require('gulp-rename');
var uglify = require('gulp-uglify');

var CONFIG = {
  namespace: 'ReactTable',
  distDir: 'dist',
  outfile: 'react-table.js',
  examplesPublicDir: './examples/public',
  port: 3111
};

function bify (src, includeReact) {
  var b = browserify({
    entries: src,
    standalone: 'ReactTable'
  });

  b.transform('babelify');

  if (!includeReact) {
    b.transform('browserify-shim');
    b.external('react');
  }

  b.on('error', gutil.log.bind(gutil, 'Browserify Error'));

  return b;
}

function buildScript (bundle, outfileName, dest) {
  dest = dest || './dist';

  return bundle
    .bundle()
    .pipe(source(outfileName))
    .pipe(gulp.dest(dest));
}

gulp.task('build:dev', function () {
  return buildScript(bify('./index.js'), CONFIG.outfile);
});

gulp.task('build:release', function () {
  return buildScript(bify('./index.js'), CONFIG.outfile)
    .pipe(streamify(uglify()))
    .pipe(rename({suffix: '.min'}))
    .pipe(gulp.dest(CONFIG.distDir));
});

gulp.task('build:examples', ['build:release'], function () {
  return buildScript(
    bify('./examples/app.js', true),
    'app.built.js',
    CONFIG.examplesPublicDir
  );
});

gulp.task('serve', ['build:examples'], function (cb) {
  var connectRoute = require('connect-route');
  var fs = require('fs');
  var data = fs.readFileSync('./examples/data/names-small.json', 'utf8');

  var app = connect()
    .use(connect.logger('dev'))
    .use(connect.static('./examples'))
    .use(connect.static('./public'))
    .use(connect.static('./dist'))
    .use(connectRoute(function (router) {
      router.get('/data', function (req, res) {
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify(data));
      });
    }));

    http.createServer(app)
    .listen(CONFIG.port, function () {
      console.log('React Table example served up at', CONFIG.port);
    })
    .on('close', cb);
});

gulp.task('dev', function () {
  livereload.listen();

  gulp.watch(['./src/**/*.js'], ['build:dev', 'build:examples'])
    .on('change', livereload.changed);
  gulp.watch(['./examples/*.js'], ['build:examples'])
    .on('change', livereload.changed);
  gulp.watch(['./examples/public/*.css'])
    .on('change', livereload.changed);

  // .start as alternative to .run http://stackoverflow.com/a/23298810/1048479
  gulp.start('serve');
});

gulp.task('default', ['dev']);
