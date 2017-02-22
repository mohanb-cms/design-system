'use strict';

const count = require('gulp-count');
const cssnano = require('cssnano');
const del = require('del');
const autoprefixer = require('autoprefixer');
const postcss = require('gulp-postcss');
const postcssImport = require('postcss-import');
const sass = require('gulp-sass');
const stylelint = require('gulp-stylelint');
const runSequence = require('run-sequence');

const config = {
  vendorSrc: 'src/styles/vendor'
};

module.exports = (gulp, shared) => {
  // The bulk of our Sass task. Transforms our Sass into CSS, then runs through
  // a variety of postcss processes (inlining, prefixing, minifying, etc).
  function processSass(cwd = '') {
    const sassCompiler = sass({
      outputStyle: 'expanded',
      includePaths: [`${cwd}node_modules`]
    });

    const postcssPlugins = [
      postcssImport(), // inline imports
      autoprefixer(),  // add any necessary vendor prefixes
      cssnano()        // minify css
    ];

    return gulp
      .src(`${cwd}src/styles/**/*.scss`)
      .pipe(sassCompiler)
      .pipe(postcss(postcssPlugins))
      .pipe(gulp.dest(`${cwd}dist/styles`))
      .pipe(count('## Sass files processed'))
      .pipe(shared.browserSync.stream({match: '**/*.css'})); // Auto-inject into docs
  }

  // Lint Sass files using stylelint. Further configuration for CSS linting
  // can be handled in stylelint.config.js
  function lintSass(cwd = '') {
    return gulp
      .src([`${cwd}src/styles/**/*.scss`])
      .pipe(stylelint({
        failAfterError: false,
        reporters: [
          { formatter: 'string', console: true },
        ],
        syntax: 'scss',
      }))
      .pipe(count('## Sass files linted'));
  }

  // Prune the vendor directory
  gulp.task('sass:clean-vendor', () => {
    return del(config.vendorSrc);
  });

  // Copy 3rd-party Sass dependencies into a "vendor" subdirectory
  gulp.task('sass:copy-vendor', () => {
    var packages = [
      './node_modules/bourbon/app/assets/stylesheets/**/_font-stacks.scss',
      './node_modules/uswds/src/stylesheets/**/_variables.scss',
    ];

    return gulp
      .src(packages)
      .pipe(gulp.dest(file => {
        const packageName = file.path.match(/node_modules\/([a-zA-Z_]*)\//)[1];
        return `${config.vendorSrc}/${packageName}`;
      }));
  });

  gulp.task('sass:lint-assets', () => lintSass());
  gulp.task('sass:lint-docs', () => lintSass('docs/'));

  gulp.task('sass:process-assets', () => processSass());
  gulp.task('sass:process-docs', () => processSass('docs/'));

  gulp.task('sass', done => {
    runSequence(
      'sass:clean-vendor',
      'sass:copy-vendor',
      [
        'sass:lint-assets',
        'sass:lint-docs'
      ],
      [
        'sass:process-assets',
        'sass:process-docs'
      ],
      done
    );
  });
};