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
		
		this.name = mod.name;
		
		this.$addMethods(mod);
		this.$addEvents(mod);
		this.$addProps(mod);

		if (mod.init) {
	    // call init() method
	    mod.init.bind(this)();
		}
  }
	//
	// Add methods specified in SDO to this instance
	//
	$addMethods(mod) {
		for (let [k,v] of Object.entries(mod.methods)) {
			this[k] = v;
		}
	}
	//
	// Add handlers to $hub for events specified in SDO and for props
	//
	$addEvents(mod) {
		for (let [k,v] of Object.entries(mod.events)) {
			this.$hub.on(k, v.bind(this));
		}
		
    this.$hub.on(`${this.name}.props`, (props) => {
      Object.assign(this, props);
	    // call updated() method if it exists
			if (mod.updated) {
		    mod.updated.bind(this)();
			}
    });
		
	}
	//
	// Merge props from SDO to this instance
	//
	$addProps(mod) {
		if (mod.props) {
			Object.assign(this, mod.props);
		}
	}
	//
	// Emit an event across the Volante framework
	//
	$emit(...args) {
		this.$hub.emit(...args);
	}
  //
  // If no message is provided, enable debug on this handler, otherwise
  // this function will emit a log event if debug is enabled.
  //
  debug(msg) {
    this.$hub.debug(msg, this.name);
    return this;
  }

  //
  // Standard log message handler
  //
  log(msg) {
    this.$hub.log(msg, this.name);
    return this;
  }

  //
  // Warning message handler
  //
  warn(msg) {
    this.$hub.warn(msg, this.name);
    return this;
  }

  //
  // error handler
  //
  error(err) {
    this.$hub.error(err, this.name);
    return this;
  }

}

//
// exports
//
module.exports = Spoke;