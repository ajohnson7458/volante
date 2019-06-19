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

exports.cloneDeepNoFunctions = function(d) {
  let ret;
  // set up recursion for arrays and objects
  if (d instanceof Array) {
    ret = [];
    // iterate
    for (let v of d) {
      if (typeof(v) === 'function') {
        continue;
      } else if (v instanceof Object || v instanceof Array) {
        ret.push(exports.cloneDeepNoFunctions(v));
      } else {
        ret.push(v);
      }
    }
  } else if (d instanceof Object) {
    ret = {};
    // iterate
    for (let [k,v] of Object.entries(d)) {
      if (typeof(v) === 'function') {
        continue;
      } else if (v instanceof Object || v instanceof Array) {
        ret[k] = exports.cloneDeepNoFunctions(v);
      } else {
        ret[k] = v;
      }
    }
  } else {
    ret = d;
  }
  return ret;
};

exports.selectProps = function(obj, keys) {
  let ret = {};
  for (let k of keys) {
    ret[k] = exports.cloneDeepNoFunctions(obj[k]);
  }
  return ret;
};