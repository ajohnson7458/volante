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

//
// util function to find an $emit call and evaluate and return the emit name
//
exports.findEmits = function(str) {
  let emits = [];
  str.replace(/\.\$emit\(['"](.+?)['"]\,/g, function(m, p1){ emits.push(p1); });
  return emits;
};

//
// clone sanitized (no functions or circular deps) members specified by keys
// out of the given obj
//
exports.selectProps = function(obj, keys) {
  let ret = {};
  for (let k of keys) {
    try {
      ret[k] = JSON.parse(JSON.stringify(obj[k]));
    } catch(e) {
      ret[k] = '<object with circular references>';
    }
  }
  return ret;
};