const utils = require('./utils');

//
// Base class for a volante Spoke. Parses Spoke Definition Object (SDO)
// and ingests into itself.
//
class Spoke {
  //
  // Constructor accepts reference to the hub.
  //
  constructor(hub, mod) {
    // save reference to hub
    this.$hub = hub;
    // alias the spokes for brevity
    this.$spokes = hub.spokes;
    this.$setStatus('unknown'); // default status
    this.$isReady = false; // default ready state

    // initialize metadata
    this.name = mod.name;
    this.handledEvents = [
      // all spokes have this one, provides a way to update props
      // via an event
      `${this.name}.update(props)`,
    ];
    // registry of all emitted events (found through naive introspection)
    this.emittedEvents = [];

    this.$addMethods(mod);
    this.$addProps(mod);
    this.$addStats(mod);
    this.$addEvents(mod);
    this.$addData(mod);

    // call init() method if defined
    if (mod.init) {
      mod.init.bind(this)();
    }
    // call updated() after init() if it exists and props were set from config
    if (this.configProps && mod.updated) {
      mod.updated.bind(this)();
    }
    // bind done() for later
    if (mod.done) {
      this.done = mod.done.bind(this);
    }
  }
  //
  // Add methods specified in SDO to this instance
  //
  $addMethods(mod) {
    if (mod.methods) {
      for (let [k,v] of Object.entries(mod.methods)) {
        this[k] = v.bind(this);
      }
    }
  }
  //
  // Add handlers to $hub for events specified in SDO and for props
  //
  $addEvents(mod) {
    if (mod.events) {
      for (let [k,v] of Object.entries(mod.events)) {
        this.handledEvents.push(`${k}${v.toString().match(/\(.*\)/)[0]}`);
        if (k === '*') {
          // tell hub to treat us as a star spoke, onAll is a hub method
          this.$hub.onAll(this.name, v.bind(this));
        } else if (k.indexOf(',') > -1) {
          // multi-event handler, won't execute until all events have fired
          // BUT only happens ONCE
          this.$log(`registering multi-event handler for ${k}`);
          let eventData = {};
          for (let e of k.split(',')) {
            eventData[e] = null; // initial value
            // register for this event
            this.$hub.once(e, (...args) => {
              // save arguments
              eventData[e] = args;

              // see if we have a value for all requested events
              let itsgotime = Object.keys(eventData).reduce((acc, key) => {
                return acc && !!eventData[key];
              }, true);

              // if it's go time, call the handler with event args
              if (itsgotime) {
                v.bind(this)(eventData);
              }
            });
          }
        } else {
          // traditional event register, using method inherited from EventEmitter
          this.$hub.on(k, v.bind(this));
        }
      }

      // add built-in <name>.update handler to modify module props
      this.$hub.on(`${this.name}.update`, (props) => {
        // only allow updating a prop if it was originally in the props
        for (let [k,v] of Object.entries(props)) {
          if (this.$propKeys.indexOf(k) >= 0) {
            this[k] = v;
          } else {
            this.$warn(`cannot update ${k}; not in props`);
          }
        }
        // call updated() method if it exists
        if (mod.updated) {
          mod.updated.bind(this)();
        }
      });

      // find all emitted events
      if (mod.methods) {
        for (let v of Object.values(mod.methods)) {
          this.emittedEvents = this.emittedEvents.concat(utils.findEmits(v.toString()));
        }
      }
      if (mod.init) {
        this.emittedEvents = this.emittedEvents.concat(utils.findEmits(mod.init.toString()));
      }
      if (mod.done) {
        this.emittedEvents = this.emittedEvents.concat(utils.findEmits(mod.done.toString()));
      }
      if (mod.updated) {
        this.emittedEvents = this.emittedEvents.concat(utils.findEmits(mod.updated.toString()));
      }
    }
  }
  //
  // Merge props from SDO to this instance
  //
  $addProps(mod) {
    if (mod.props) {
      // if the hub's config contains a top-level key matching this
      // module's name, merge in the data items into props
      if (this.$hub.config[this.name]) {
        this.$log(`merging hub config for ${this.name} into props`);
        Object.assign(this, mod.props, this.$hub.config[this.name]);
        // set a flag indicating that props were loaded from config
        this.configProps = true;
      } else {
        Object.assign(this, mod.props);
      }
      // save off keys to validate .props event
      this.$propKeys = Object.keys(mod.props);
    } else {
      this.$propKeys = [];
    }
  }
  //
  // Merge stats from SDO to this instance
  //
  $addStats(mod) {
    if (mod.stats) {
      // copy stats fields into module
      Object.assign(this, mod.stats);
      // save off keys to validate .props event
      this.$statKeys = Object.keys(mod.stats);
    } else {
      this.$statKeys = [];
    }
  }
  //
  // Merge data from SDO to this instance
  //
  $addData(mod) {
    if (mod.data) {
      // apply data twice so values can settle if they are dependent
      let appliedData = mod.data.apply(this);
      Object.assign(this, appliedData);
      Object.assign(this, mod.data.apply(this));
      this.$dataKeys = Object.keys(appliedData);
    } else {
      this.$dataKeys = [];
    }
  }
  //
  // Emit an event across the Volante framework
  //
  $emit(...args) {
    this.$hub.emit(...args);
  }
  //
  // Set the internal status object
  //
  $setStatus(status, args = []) {
    // update $isReady flag if status provided is 'ready'
    if (status === 'ready') {
      this.$isReady = true;
    }
    this.$status = {
      status,
      args,
    };
  }
  //
  // Proxy the Hub's isDebug property. Useful for minimizing debug log
  // performance impace by not calling $debug() or rendering its arguments
  // (e.g. by using this.$isDebug && this.$debug(...))
  //
  $isDebug() {
    return this.$hub.isDebug;
  }
  //
  // If no message is provided, enable debug, otherwise
  // this function will emit a log event if debug is enabled.
  //
  $debug(...args) {
    this.$hub.debug(this.name, ...args);
    return this;
  }
  //
  // Special "I'm ready" log message, sets internal status and $isReady flag
  //
  $ready(...args) {
    this.$isReady = true;
    this.$setStatus('ready', ...args);
    this.$hub.ready(this.name, ...args);
    return this;
  }
  //
  // Standard log message handler
  //
  $log(...args) {
    this.$hub.log(this.name, ...args);
    return this;
  }
  //
  // Warning message handler
  //
  $warn(...args) {
    this.$hub.warn(this.name, ...args);
    return this;
  }
  //
  // error handler, returns a throw-able error
  //
  $error(...args) {
    this.$isReady = false; // clear readiness flag
    this.$setStatus('error', ...args);
    this.$hub.error(this.name, ...args);
    return new Error(`${this.name}: ${args.join(',')}`);
  }
  //
  // shutdown request
  //
  $shutdown() {
    this.$hub.shutdown(this.name);
  }
}

//
// exports
//
module.exports = Spoke;