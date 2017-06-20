# gulp-group-concat-order


该插件结合了[gulp-group-concat](https://www.npmjs.com/package/gulp-group-concat)  和 [gulp-order](https://www.npmjs.com/package/gulp-order)的思想而成。




####usage

var gulp = require('gulp'),
  groupConcat = require('gulp-group-concat');
 
gulp.src('**/*.js')
  .pipe(groupConcat({
    'final.inline.js': ['**/*.js', '!**/*.test.js'],
    'final.test.js': '**/*.test.js'
  }))
  .pipe(gulp.dest('dest'));