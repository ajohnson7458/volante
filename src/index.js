const fs = require('fs');
const path = require('path');
const utils = require('./utils');

//
// exports
//
module.exports = {
  Hub: require('./hub'),
  Spoke: require('./spoke'),

  // parse version number from package.json
  version: JSON.parse(fs.readFileSync(path.join(utils.findRoot(__dirname), 'package.json'))).version,

  // keyword which denotes volante modules
  moduleKeyword: 'volante',

  // resolve the path of the parent (for internal use)
  modulePath: path.join(utils.findRoot(module.parent.filename), 'node_modules')
};
