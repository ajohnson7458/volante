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
		this.$addProps(mod);
		this.$addEvents(mod);
		this.$addData(mod);

		if (mod.init) {
	    // call init() method
	    mod.init.bind(this)();
		}
		if (mod.done) {
			// bind done() for later
			this.done = mod.done.bind(this);
		}
  }
	//
	// Add methods specified in SDO to this instance
	//
	$addMethods(mod) {
		if (mod.methods) {
			for (let [k,v] of Object.entries(mod.methods)) {
				this[k] = v;
			}
		}
	}
	//
	// Add handlers to $hub for events specified in SDO and for props
	//
	$addEvents(mod) {
		if (mod.events) {
			for (let [k,v] of Object.entries(mod.events)) {
				this.$hub.on(k, v.bind(this));
			}

			// add .update handler to modify module props
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
		}
	}
	//
	// Merge props from SDO to this instance
	//
	$addProps(mod) {
		if (mod.props) {
			Object.assign(this, mod.props);
			// save off keys to validate .props event
			this.$propKeys = Object.keys(mod.props);
		}
	}
	//
	// Merge data from SDO to this instance
	//
	$addData(mod) {
		if (mod.data) {
			Object.assign(this, mod.data);
		}
	}
	//
	// Emit an event across the Volante framework
	//
	$emit(...args) {
		this.$hub.emit(...args);
	}
	//
	// Proxy the Hub's isDebug property. Useful for minimizing debug log
	// performance impace by not calling $debug() or rendering its arguments
	// (e.g. this.$isDebug && this.$debug(...))
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
  // error handler
  //
  $error(...args) {
    this.$hub.error(this.name, ...args);
    return this;
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