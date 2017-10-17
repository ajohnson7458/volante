//
// Base class for a volante Spoke
//
class Spoke {
  //
  // Constructor accepts reference to the hub.
  //
  constructor(hub) {
    // save reference to hub
    this.hub = hub;

    // call user-defined init() function, if present
    if (this.init && typeof(this.init) === 'function') {
      this.init();
    }
  }

  //
  // If no message is provided, enable debug on this handler, otherwise
  // this function will emit a log event if debug is enabled.
  //
  debug(msg) {
    this.hub.debug(msg, this.constructor.name);
    return this;
  }

  //
  // Standard log message handler
  //
  log(msg) {
    this.hub.log(msg, this.constructor.name);
    return this;
  }

  //
  // error handler
  //
  error(err) {
    this.hub.error(err, this.constructor.name);
    return this;
  }

}

//
// exports
//
module.exports = Spoke;