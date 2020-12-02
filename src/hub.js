const fs = require('fs');
const path = require('path');
const EventEmitter = require('events').EventEmitter;
const Spoke = require('./spoke');
const utils = require('./utils');

//
// Hub provides a base class and reference implementation for a volante Hub.
//
class Hub extends EventEmitter {
  constructor() {
    super();

    this.name = 'VolanteHub';
    this.version = module.parent.exports.version;
    this.parentVersion = module.parent.exports.parentVersion;
    this.startTime = new Date();

    // all loaded volante modules
    this.spokes = [];
    // spokes which registered for all ('*') events
    this.starSpokes = [];
    this.config = {};

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
    if (version) {
      this.debug(this.name, `attaching ${name} v${version}`);
    } else {
      this.debug(this.name, `attaching ${name}`);
    }
    var modPath = path.join(this.nodeModulesPath, name);
    this.attachByFullPath(modPath, version);
    return this;
  }
  //
  // attach local/relative Volante Spoke module
  //
  attachLocal(name) {
    this.debug(this.name, `attaching local module ${name}`);
    var modPath = path.join(module.parent.exports.parentRoot, name);
    this.attachByFullPath(modPath);
    return this;
  }
  //
  // attach Volante Spoke module by providing fully resolved path
  //
  attachByFullPath(modPath, version) {
    // load volante module
    try {
      var mod = require(modPath);
      // see if the spoke at least has a name
      if (mod.name) {
        var newSpoke = new Spoke(this, mod);
        this.spokes.push({
          name: mod.name,
          version: version ? version:'unknown',
          instance: newSpoke
        });
        if (version) {
          this.log(this.name, `attached ${mod.name} v${version}`);
        } else {
          this.log(this.name, `attached ${mod.name}`);
        }
        this.emit('volante.attached', mod.name);
      } else {
        console.error(`ATTACH ERROR: spoke definition ${mod} has no name`);
      }
    } catch (e) {
      console.error(`ATTACH ERROR: modPath: ${modPath}`, e);
    }
    return this;
  }
  //
  // Attach a Spoke module by using the provided
  // Spoke Definition Object directly
  //
  attachFromObject(obj) {
    this.debug(this.name, `attaching module from object`);
    // see if the provided object at least has a name
    if (obj.name) {
      var newSpoke = new Spoke(this, obj);
      this.spokes.push({
        name: obj.name,
        instance: newSpoke
      });
      this.log(this.name, `attached module from object ${obj.name}`);
    } else {
      console.error(`ATTACH OBJECT ERROR: spoke definition ${obj} has no name`);
    }
    return this;
  }
  //
  // Load config file relative to project root
  // config file will be overridden by any env vars with the following pattern:
  // volante_config_<underscore_path>
  // i.e. to modify the server.port data item in the config, set the following env var:
  // volante_config_server_port=3000
  //
  loadConfig(filename) {
    let p = path.join(module.parent.exports.parentRoot, filename);
    if (fs.existsSync(p)) {
      console.log(`> loading config file: ${filename}`);
      try {
        let config = require(p);

        // let env vars override config items if they are prefixed by
        // volante_config_ and have an underscore-delimited path
        for (let [k, v] of Object.entries(process.env)) {
          // overrides have to start with volante_
          if (k.match(/^volante_/i)) {
            // split off path
            let kp = k.split(/volante_/i)[1].split('_').join('.');
            utils.deepSet(config, kp, v);
          }
        }

        this.config = config;
        // look for a top-level debug flag
        if (this.config.debug) {
          this.debug();
        }
        // look for top-level attach flag
        if (this.config.attach && this.config.attach.length) {
          for (let m of this.config.attach) {
            this.attach(m);
          }
        }
        // look for top-level attachLocal flag
        if (this.config.attachLocal && this.config.attachLocal.length) {
          for (let m of this.config.attachLocal) {
            this.attachLocal(m);
          }
        }
      } catch(e) {
        console.error('error loading config file', e);
      }
    } else {
      console.error('!!!!!!\nCONFIG ERROR: couldnt find config file\n!!!!!!');
    }
    return this;
  }
  //
  // get the instance of the spoke with the given module name
  //
  getSpokeByNpmName(name) {
    for (let s of this.spokes) {
      if (s.name === name) {
        return s.instance;
      }
    }
    return null;
  }
  //
  // get the instance of the spoke with the given module name
  //
  getSpoke(name) {
    for (let s of this.spokes) {
      if (s.instance.name && s.instance.name === name) {
        return s.instance;
      }
    }
    return null;
  }
  //
  // get method is alias to getSpoke
  //
  get(name) {
    return this.getSpoke(name);
  }
  //
  // If no message is provided, enable debug mode on the hub, otherwise
  // this function will emit a log event if debug is enabled.
  //
  debug(src, ...args) {
    if (arguments.length === 0) {
      // no argument, enable debug
      this.isDebug = true;
    } else {
      // log only if debug was enabled
      if (this.isDebug) {
        this.emit('volante.log', {
          ts: new Date(),
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
  log(src, ...args) {
    this.emit('volante.log', {
      ts: new Date(),
      lvl: 'normal',
      src: src,
      msg: args
    });
    return this;
  }
  //
  // warning log message handler
  //
  warn(src, ...args) {
    this.emit('volante.log', {
      ts: new Date(),
      lvl: 'warning',
      src: src,
      msg: args
    });
    return this;
  }
  //
  // error handler
  //
  error(src, ...args) {
    this.emit('volante.log', {
      ts: new Date(),
      lvl: 'error',
      src: src,
      msg: args
    });
    return this;
  }
  //
  // shutdown handler
  //
  shutdown(src=this.name) {
    this.warn(this.name, `shutdown requested by ${src}`);
    this.emit('volante.shutdown');
    for (let s of this.spokes) {
      s.instance.done && s.instance.done();
    }
    this.emit('volante.done');
    setTimeout(() => {
      console.warn('done.');
      process.exit(0);
    }, 1000);
    return this;
  }
  //
  // called by spoke.js to register a spoke to receive all events ('*')
  //
  onAll(f) {
    this.starSpokes.push(f);
  }
  //
  // volante hub event middleware, currently we only send to any spokes
  // which registered for '*' (all events)
  //
  emit(type, ...args) {
    // remove any functions from args, not supported for star spokes
    let saniArgs = [];
    for (let a of args) {
      if (typeof(a) !== 'function') {
        saniArgs.push(a);
      }
    }
    // send sanitized args to any spokes which registered for '*'
    this.starSpokes.forEach(f => f(type, ...saniArgs));
    // emit using EventEmitter
    super.emit(type, ...args);
    return this;
  }
  //
  // get topology of volante wheel, this iterates through every spoke and copies
  // its props and data, so don't call it too often
  //
  getAttached() {
    let ret = [
      {
        name: 'Volante Hub',
        isDebug: this.isDebug,
      },
    ];
    for (let s of this.spokes) {
      ret.push({
        name: s.name,
        version: s.version,
        props: utils.selectProps(s.instance, s.instance.$propKeys),
        data: utils.selectProps(s.instance, s.instance.$dataKeys),
        handledEvents: s.instance.handledEvents,
        emittedEvents: s.instance.emittedEvents,
      });
    }
    return ret;
  }
  //
  // get the volante wheel uptime
  //
  getUptime() {
    return (new Date()) - this.startTime;
  }
}

//
// exports
//
module.exports = Hub;