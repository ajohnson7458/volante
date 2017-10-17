const fs = require('fs');
const path = require('path');
const EventEmitter = require('events').EventEmitter;

//
// Hub provides a base class and reference implementation for a volante Hub.
//
class Hub extends EventEmitter {
  constructor() {
    super();
    // all loaded volante modules
    this.spokes = [];

    // internal debug flag
    this._isDebug = false;

    // directory to look for modules, resolved in index.js
    this.nodeModulesPath = module.parent.exports.modulePath;
    this.findSpokes();
  }

  //
  // find any npm modules with the specialy keyword calling them out as volante
  // modules
  //
  findSpokes() {
    // iterate through node_modules looking for volante modules
    fs.readdirSync(this.nodeModulesPath).forEach((dir) => {
      // path to current module
      var modPath = path.join(this.nodeModulesPath, dir);
      // path to package.json in module directory
      var pkgPath = path.join(modPath, 'package.json');

      // try to load package.json for each module
      try {
        var pkg = require(pkgPath);
      } catch(e) {
        console.error(`PARSING ERROR: invalid package.json found: ${pkgPath}`);
        return; // no (or invalid) package.json, skip
      }

      if (pkg['keywords'] && pkg['keywords'].indexOf(module.parent.exports.moduleKeyword) !== -1) {
        // load volante module
        try {
          var mod = require(modPath);
        } catch (e) {
          console.error(`PARSING ERROR: invalid module found: ${modPath}`);
          return; // invalid module, skip
        }

        // see if module is valid volante module
        if (pkg.name && pkg.version && pkg.description && mod.prototype instanceof(module.parent.exports.Spoke)) {
          var newspoke = new mod(this);
          this.spokes.push({
            name: pkg.name,
            instance: newspoke
          });
        }
      }
    });
  }

  //
  // get the instance of the spoke with the given module name
  //
  getInstance(name) {
    for (let s of this.spokes) {
      if (s.name === name) {
        return s.instance;
      }
    }
    return null;
  }

  //
  // If no message is provided, enable debug mode on the hub, otherwise
  // this function will emit a log event if debug is enabled.
  //
  debug(msg, src=this.constructor.name) {
    if (msg === undefined) {
      // no argument, enable debug
      this._isDebug = true;
    } else {
      // log only if debug was enabled
      if (this._isDebug) {
        this.emit('volante.log', {
          lvl: 'debug',
          src: src,
          msg: msg
        });
      }
    }
    return this;
  }

  //
  // Standard log message handler
  //
  log(msg, src=this.constructor.name) {
    this.emit('volante.log', {
      lvl: 'normal',
      src: src,
      msg: msg
    });
    return this;
  }

  //
  // error handler
  //
  error(err, src=this.constructor.name) {
    // keep this event as 'error' to take advantage of the native checks that
    // make sure the event is handled.
    this.emit('volante.error', {
      lvl: 'error',
      src: src,
      msg: err
    });
    return this;
  }
}

//
// exports
//
module.exports = Hub;