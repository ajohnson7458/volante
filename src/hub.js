const fs = require('fs');
const path = require('path');
const EventEmitter = require('events').EventEmitter;
const Spoke = require('./spoke');

//
// Hub provides a base class and reference implementation for a volante Hub.
//
class Hub extends EventEmitter {
  constructor() {
    super();

    this.name = 'VolanteHub';
		this.version = module.parent.exports.version;

    // all loaded volante modules
    this.spokes = [];

    // debug flag
    this.isDebug = false;

    // directory to look for modules, resolved in index.js
    this.nodeModulesPath = module.parent.exports.modulePath;

    // pkg blacklist (don't try to load anything in nodeModulesPath matching these)
    this.packageBlacklist = ['.bin'];
  }
  //
  // find any npm modules with the special keyword calling them out as volante
  // modules
  //
  attachAll() {
    // iterate through node_modules looking for volante modules
    fs.readdirSync(this.nodeModulesPath).forEach((dir) => {
      if (this.packageBlacklist.indexOf(dir) < 0) {
        // path to package.json in module directory
        var pkgPath = path.join(this.nodeModulesPath, dir, 'package.json');

        // try to load package.json for each module
        try {
          var pkg = require(pkgPath);
        } catch(e) {
          console.error(`PARSING ERROR: invalid or missing package.json: ${pkgPath}`);
          return; // no (or invalid) package.json, skip
        }

				// make sure it has all the required fields
        if (pkg.name &&
					  pkg.version &&
					  pkg.description &&
					  pkg.keywords &&
					  pkg.keywords.indexOf(module.parent.exports.moduleKeyword) !== -1) {
          this.attach(pkg.name, pkg.version);
        }
      }
    });
    this.emit('volante.attachedAll', this.spokes.length);
    return this;
  }
  //
  // standard attach function, provide Volante Spoke module name which is assumed
  // to be installed in local node_modules directory
  //
  attach(name, version) {
    this.debug(this.name, `attaching ${name} v${version}`);
    var modPath = path.join(this.nodeModulesPath, name);
    this.attachByFullPath(modPath, version);
  }
  //
  // attach local/relative Volante Spoke module
  //
  attachLocal(name) {
    this.debug(this.name, `attaching local module ${name}`);
    var modPath = path.join(module.parent.exports.parentRoot, name);
    this.attachByFullPath(modPath);
  }
  //
  // attach Volante Spoke module by providing fully resolved path
  //
  attachByFullPath(modPath, version) {
    // load volante module
    try {
      var mod = require(modPath);
    } catch (e) {
      console.error(`ATTACH ERROR: ${e}`);
      return; // invalid module, skip
    }

    // see if the spoke at least has a name
    if (mod.name) {
      var newSpoke = new Spoke(this, mod);
      this.spokes.push({
        name: mod.name,
        instance: newSpoke
      });
    } else {
      console.error(`ATTACH ERROR: spoke definition ${mod} has no name`);
      return; // invalid module, skip
    }
    if (version) {
      this.log(this.name, `attached ${mod.name} v${version}`);
    } else {
      this.log(this.name, `attached ${mod.name}`);
    }
    this.emit('volante.attached', mod.name);
    return this;
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
  debug(src=this.name, ...args) {
    if (arguments.length === 0) {
      // no argument, enable debug
      this.isDebug = true;
    } else {
      // log only if debug was enabled
      if (this.isDebug) {
        this.emit('volante.log', {
          lvl: 'debug',
          src: src,
          msg: args
        });
      }
    }
    return this;
  }
  //
  // normal log message handler
  //
  log(src=this.name, ...args) {
    this.emit('volante.log', {
      lvl: 'normal',
      src: src,
      msg: args
    });
    return this;
  }
  //
  // warning log message handler
  //
  warn(src=this.name, ...args) {
    this.emit('volante.log', {
      lvl: 'warning',
      src: src,
      msg: args
    });
    return this;
  }
  //
  // error handler
  //
  error(src=this.name, ...args) {
    // keep this event as 'error' to take advantage of the checks that
    // make sure the event is handled.
    this.emit('error', {
      lvl: 'error',
      src: src,
      msg: args
    });
    return this;
  }
  //
  // standard shutdown handler
  //
  shutdown(src=this.name) {
    console.warn(`shutdown requested by ${src}`);
    this.emit('volante.shutdown');
    for (let s of this.spokes) {
      s.instance.done && s.instance.done();
    }
    this.emit('volante.done');
    process.exit(0);
  }
}

//
// exports
//
module.exports = Hub;