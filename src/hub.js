const fs = require('fs');
const path = require('path');
const EventEmitter = require('events').EventEmitter;
const Spoke = require('./spoke');
const utils = require('./utils');

//
// Hub provides a base class and reference implementation for a volante Hub.
// it extends EventEmitter so that user's may emit and receive events on it
//
class Hub extends EventEmitter {
  constructor() {
    super();
    // up the max listeners for EventEmitter to prevent warnings
    this.setMaxListeners(1000);
    // the default name, can be set through config file
    this.name = 'VolanteHub';
    // expose some useful values
    this.version = module.parent.exports.version;
    this.parentRoot = module.parent.exports.parentRoot;
    this.parentVersion = module.parent.exports.parentVersion;
    // global start time, used for calculating volante uptime
    this.startTime = new Date();
    // all loaded volante modules
    this.spokes = {};
    // spokes which registered for all ('*') events
    this.starSpokes = [];
    // stores the config loaded using loadConfig
    this.config = {};
    // debug flag
    this.isDebug = false;
    // testing flag, set from NODE_ENV
    this.isTesting = process.env.NODE_ENV === 'test';
    // testing flag, set from NODE_ENV
    this.isProduction = process.env.NODE_ENV === 'production';
    // directory to look for modules, resolved in index.js
    this.nodeModulesPath = module.parent.exports.modulePath;
    // pkg blacklist (don't try to load anything in nodeModulesPath matching these)
    this.packageBlacklist = ['.bin'];
  }
  //
  // Load JSON config file relative to project root
  // config file will be overridden by any env vars with the following pattern:
  // volante_<underscore_path>
  // i.e. if you're using VolanteExpress and want to modify the port,
  // set the following env var: volante_VolanteExpress_port=3000
  //
  loadConfig(filename) {
    // config file should be relative to module root
    let p = path.join(module.parent.exports.parentRoot, filename);
    if (fs.existsSync(p)) {
      console.log(`>\n> volante is loading config from: ${filename}\n>`);
      try {
        // load it
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
        // save full object to hub
        this.config = config;
        // look for a top-level name field so we can set the cluster name
        if (this.config.name && typeof(this.config.name) === 'string') {
          this.name = this.config.name;
        }
        // look for a top-level debug flag
        if ((typeof(this.config.debug) === 'boolean' && this.config.debug) ||
             this.config.debug === 'true') {
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
        this.shutdown();
      }
    } else {
      console.error('!!!!!!\nCONFIG ERROR: couldnt find config file\n!!!!!!');
      this.shutdown();
    }
    return this;
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
    this.emit('volante.attachedAll', Object.keys(this.spokes).length);
    return this;
  }
  //
  // standard attach function, provide Volante Spoke module name which is assumed
  // to be installed in local node_modules directory
  //
  attach(name, version) {
    if (!version) {
      // try to find package.json and get the version
      var pkgPath = path.join(this.nodeModulesPath, name, 'package.json');
      // try to load package.json
      try {
        var pkg = require(pkgPath);
      } catch(e) {
        console.error(`error finding package.json for ${name}`);
        this.shutdown(); // shutdown since this shouldn't happen
      }
      version = pkg.version;
    }
    this.debug(this.name, `attaching ${name} v${version}`);
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
      // see if the spoke at least has a name field
      if (mod.name) {
        // instantiate a Spoke using this module definition
        var newSpoke = new Spoke(this, mod);
        // set version from provided npm (if applicable)
        newSpoke.version = version ? version:'none';
        this.spokes[mod.name] = newSpoke;
        if (version) {
          this.log(this.name, `attached ${mod.name} v${version}`);
        } else {
          this.log(this.name, `attached ${mod.name}`);
        }
        this.emit('volante.attached', mod.name);
      } else {
        console.error(`ATTACH ERROR: spoke definition ${mod} has no name`);
        this.shutdown();
      }
    } catch (e) {
      console.error(`ATTACH ERROR: modPath: ${modPath}`, e);
      this.shutdown();
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
      // set version to none since this is just from an obj (not npm pkg)
      newSpoke.version = 'none';
      this.spokes[obj.name] = newSpoke;
      this.log(this.name, `attached module from object ${obj.name}`);
    } else {
      console.error(`ATTACH OBJECT ERROR: spoke definition ${obj} has no name`);
      this.shutdown();
    }
    return this;
  }

  //
  // get method for spokes via their name string
  //
  get(name) {
    return this.spokes[name];
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
  // ready log message handler
  //
  ready(src, ...args) {
    // emit a special .ready message using this spoke modules name
    this.emit(`${src}.ready`, ...args);
    // emit a ready log
    this.emit('volante.log', {
      ts: new Date(),
      lvl: 'ready',
      src: src,
      msg: args
    });
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
    for (let s of Object.values(this.spokes)) {
      s.done && s.done();
    }
    this.emit('volante.done');
    setTimeout(() => {
      console.warn('done.');
      process.exit(0);
    }, 1000);
    return this;
  }
  //
  // called by spoke.js (or manually at this.$hub.onAll if you know what you are doing)
  // to register a spoke to receive all events ('*')
  //
  onAll(src, handler) {
    this.warn(this.name, `${src} subcribing for all events`);
    let ss = this.starSpokes.find(o => o.src === src);
    if (!ss) {
      this.starSpokes.push({
        src,
        handler,
      });
    }
  }
  //
  // unsubscribe a star spoke
  //
  offAll(src) {
    this.warn(this.name, `${src} unsubcribing from all events`);
    let idx = this.starSpokes.find(o => o.src === src);
    this.starSpokes.splice(idx, 1);
  }
  //
  // volante hub event emitter, checks for any spokes
  // which registered for '*' (all events)
  //
  emit(type, ...args) {
    // if there are star spokes in the system, we'll have to
    // send every event to each
    if (this.starSpokes.length > 0) {
      // remove any functions from args, they are not supported for star spokes
      let saniArgs = [];
      for (let a of args) {
        if (typeof(a) !== 'function') {
          saniArgs.push(a);
        }
      }
      // send sanitized args to any spokes which registered for '*'
      this.starSpokes.forEach(f => f.handler(type, ...saniArgs));
    }
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
        name: this.name,
        isDebug: this.isDebug,
      },
    ];
    for (let s of Object.values(this.spokes)) {
      ret.push({
        name: s.name,
        version: s.version,
        props: utils.selectProps(s, s.$propKeys),
        data: utils.selectProps(s, s.$dataKeys),
        handledEvents: s.handledEvents,
        emittedEvents: s.emittedEvents,
      });
    }
    return ret;
  }
  //
  // get status and stats for all attached spokes, include totals
  //
  getStatus() {
    let ret = {
      name: this.name,
      isDebug: this.isDebug,
      spokes: [],
      statusCounts: {
        unknown: 0,
        ready: 0,
        error: 0,
      },
    };
    for (let s of Object.values(this.spokes)) {
      switch (s.$status.status) {
        case 'ready':
          ret.statusCounts.ready++;
          break;
        case 'error':
          ret.statusCounts.error++;
          break;
        default:
          ret.statusCounts.unknown++;
          break;
      }
      ret.spokes.push({
        name: s.name,
        version: s.version,
        status: s.$status,
        stats: utils.selectProps(s, s.$statKeys),
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