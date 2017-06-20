var _ = require('lodash'),
  through = require('through2'),
  gUtil = require('gulp-util'),
  pluginName = 'gulp-group-concat',
  glob = require("globule"),
  Concat = require('concat-with-sourcemaps'),
  Minimatch = require("minimatch").Minimatch,
  vinylSourcemapsApply = require('vinyl-sourcemaps-apply');

module.exports = function (fileGlobs, opt) {
  opt = opt || {};
  if (!_.isPlainObject(fileGlobs)) {
    throw new gUtil.PluginError(pluginName, 'First argument must be an object of names and file globs')
  }

  var outFiles = {};
  var foundSourceMap = false,
    matchers;

  function concatBuffersOnly(files, filename) {
    //no source maps, do it fast
    for (var i = 0; i < files.length; i++) {
      files[i] = files[i].contents;
    }

    return new gUtil.File({
      cwd: "",
      base: "",
      path: filename,
      contents: Buffer.concat(files)
    });
  }

  function concatWithSourceMap(files, filename) {
    var outFile, i, sourceStream, inFiles = {};
    for (i = 0; i < files.length; i++) {
      if (!inFiles[files[i].path]) {
        inFiles[files[i].path] = files[i].contents.toString();
      }
    }
    sourceStream = new Concat(filename, opt.newLine || '\n');
    for (i = 0; i < files.length; i++) {
      sourceStream.add(files[i].relative, inFiles[files[i].path], files[i].sourceMap);
    }
    outFile = new gUtil.File({
      cwd: "",
      base: "",
      path: filename,
      contents: new Buffer(sourceStream.content)
    });
    vinylSourcemapsApply(outFile, sourceStream.sourceMap);
    return outFile;
  }

  function addContent(filename, file) {
    if (!outFiles[filename]) {
      outFiles[filename] = [];
    }
    if (file.sourceMap) {
      foundSourceMap = true;
    }
    outFiles[filename].push(file);
  }

  function relative(file) {
    if (opt.base != null) {
      return path.relative(opt.base, file.path);
    } else {
      return file.relative;
    }
  }

  function rank(s) {
    var index, matcher, _i, _len;
    for (index = _i = 0, _len = matchers.length; _i < _len; index = ++_i) {
      matcher = matchers[index];
      if (matcher.match(s)) {
        return index;
      }
    }
    return matchers.length;
  }


  return through.obj(function (file, encoding, cb) {

    _.each(fileGlobs, function (fileglob, filename) {
      var path = file.cwd ? file.path.substring(file.cwd.length + 1) : file.path;
      var matches = glob.match(fileglob, path);
      if (matches.length) {
        addContent(filename, file);
      }
    });

    //save the files until they're done streaming/buffering
    cb();
  }, function (cb) {
    var self = this;



    //once they're done giving us files, we give them the concatenated results
    _.each(outFiles, function (files, filename) {

      matchers = fileGlobs[filename].map(function (pattern) {
        if (pattern.indexOf("./") === 0) {
          throw new Error("Don't start patterns with `./` - they will never match. Just leave out `./`");
        }
        return Minimatch(pattern);
      });

      files.sort(function (a, b) {
        var aIndex, bIndex;
        aIndex = rank(relative(a));
        bIndex = rank(relative(b));
        if (aIndex === bIndex) {
          return String(relative(a)).localeCompare(relative(b));
        } else {
          return aIndex - bIndex;
        }
      });

      self.push(foundSourceMap ? concatWithSourceMap(files, filename) : concatBuffersOnly(files, filename));
    });

    cb()
  });
};