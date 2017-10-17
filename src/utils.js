const fs = require('fs');
const path = require('path');

//
// util function to find the root (dir containing package.json) for a given path
//
exports.findRoot = function(p) {
  var rpath = path.resolve(p);
  if (fs.existsSync(path.join(rpath, 'package.json'))) {
    return rpath;
  } else {
    var parent = path.dirname(rpath);
    if (parent !== rpath) {
      return exports.findRoot(parent);
    } else {
      // if a parent root cannot be found, naively default to using our own root
      return exports.findRoot(__dirname);
    }
  }
};

