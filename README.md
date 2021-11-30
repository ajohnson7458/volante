![volante](https://raw.githubusercontent.com/msmiley/msmiley.github.io/master/volante-with-text.svg?sanitize=true)

Volante is a flexible, event-centric framework which facilitates a zero-configuration hub-and-spoke pattern. Leveraging the asynchronous nature of events makes it especially suited for modular microservices and services which span client and server. Although true zero-configuration is not always possible, Volante seeks to minimize configuration by automatically finding all local Volante npm modules and attaching them as spokes.

For when configuration is necessary, Volante makes it easy with a centralized config that can be used to attach spokes, as well as provide initial values for spoke props. Volante looks for environment variables with the volante_ prefix and applies them to the config file object. This makes it easy to override parameters like port numbers or debug mode when deploying production containers.

## Features

- super-lightweight (no build-step, no dependencies other than Node.js >= 7)
- zero-configuration as a goal, but provides easy config from file or env overrides
- automatic volante module loading (matched using 'volante' npm keyword)
- built-in logging methods (logging output delegated to volante spoke modules)
- built-in status tracking for modules

## `volante.Hub`

The `volante.Hub` may be extended or instanced directly. The public `volante.Hub` methods are typically used to perform final stitching/configuration as shown below.

```js
const volante = require('volante');

let hub = new volante.Hub().attachAll(); // attachAll automatically finds all local Volante modules

hub.loadConfig('config.json'); // load a config file

// various events/handlers
hub.emit('VolanteExpress.update', {
  bind: '127.0.0.1',
  port: 3000,
});

hub.on('VolanteExpress.listening', () => {
  console.log('my server is running')
});

// to access an instance directly, use:
let some_module = hub.get('VolanteExpress');
some_module.some_method();

```

### Config file format

The config file should be a `.json` file and may have the following top level fields which affect Volante config:

- `name` - set the Hub name, effectively setting the name for the entire service
- `debug` - global debug mode flag
- `attach` - array of module npm names to attach from node_modules
- `attachLocal` - array of local modules to attach

Additionally, the fields of any top-level object names matching a Volante spoke name will be loaded as that spoke's props. For example, if the config file contains:

```json
{
  "VolanteExpress": {
    "bind": "0.0.0.0",
    "port": 3000,
  }
}
```
the Volante hub will set the `bind` and `port` properties of VolanteExpress at startup (pre-init).

#### Env var override

For the above example config, you can define `volante_VolanteExpress_port=8080` to override the port value. Everything after the `volante_` prefix is case-sensitive, to ensure a positive match in the config file.

### Data members provided by `volante.Hub`

- `config` - the parsed config file contents, with ENV var overrides applied
- `isDebug` - boolean flag indicating if volante is in debug mode
- `isTesting` - boolean flag indicating result of `process.env.NODE_ENV === 'test'`
- `isProduction` - boolean flag indicating result of `process.env.NODE_ENV === 'production'`

### Methods provided by `volante.Hub`

- `on()` - EventEmitter-provided `on`
- `once()` - EventEmitter-provided `once`
- `emit()` - EventEmitter-provided `emit`
- `attachAll()` - find all valid Volante modules
- `attach(name)` - attach Volante module by name
- `attachLocal(path)` - attach a local JS module
- `attachFromObject(obj)` - load a JS object as a Spoke
- `loadConfig(filename)` - load a config file from project root
- `get(name)` - get a Spoke instance by its given name (name: '<>')
- `getSpokeByNpmName(name)` - get a Spoke instance by its npm module name
- `getAttached()` - return spoke topology, including spoke statuses
- `shutdown()` - shutdown Volante

### Events emitted by `volante.Hub`

All Volante built-in events are namespaced with `volante.` They are listed below along with the data item emitted with the event.

- `volante.attachedAll` - all Spokes attached using .attachAll()
  ```js
  Number // number of Spoke modules found
  ```
- `volante.attached` -
  ```js
  String // name of Spoke module
  ```
- `volante.log` - log event
  ```js
  {
    ts: Date,
    lvl: 'normal', // or 'debug', 'warning', 'error'
    src: String, // Spoke class name
    msg: Any
  }
  ```
- `volante.shutdown` - emitted when shutdown initiated
- `volante.done` - emitted when shutdown complete

## Volante Spokes

Volante modules are called Spokes and simply export an object with some predefined members. The object is automatically parsed and instantiated into the Volante framework. The API is heavily influenced by the Vue.js-v2 frontend framework.

### Example Spoke Definition

```js
module.exports = {
  name: 'ExampleSpoke',
  init() {
    // constructor-like initialization
    // called after all props and methods are available on this, i.e.
    this.privData = [0];
    this.someMethod(1);
  },
  done() {
    // destructor-like de-initialization
  },
  events: {
    // events this Spoke subscribes to, can be from this spoke or volante-wide
    'some.event'(arg) {
      // called when Hub receives 'some.event'
      // can use methods, props, or data here, i.e.
      this.someMethod(arg);
    },
  },
  props: {
    // properties added to Spoke instance
    // they are automatically updated when Hub distributes
    // an 'ExampleSpoke.update' event (i.e. `${this.name}.update`)
    someProp: true,
    counter: 0,
  },
  data() { // as a function so it can be evaluated in context
    return {
      // "private" data members for Spoke instance, not meant to be changed from
      // outside the module but this is not enforced
      privData: [1,2,3],
    };
  },
  updated() {
    // called automatically after props are updated in response to the
    // 'ExampleSpoke.update' event (see props)
    this.someMethod(this.someProp);
  },
  methods: {
    // methods are added to Spoke instance (watch for name collisions with props)
    someMethod(arg) {
      // do stuff
      this.someProp = arg;

      // log stuff
      this.$log('called someMethod');

      // send events
      this.$emit('ExampleSpoke.ready', this.someProp);

      // access config file loaded by hub
      switch (this.$hub.config.auth.mechanism) {};

      // special log level which also sets the status for this module as ready,
      // the Hub will report this module as ready unless the module calls this.$error for anything
      this.$ready('connected and good to go');
    },
  }
}
```

### Built-in Spoke Properties
- `$hub` - a reference to the central `volante.Hub`
- `$emit` - emit an event across volante
- `$isDebug` - aliases the `this.$hub.isDebug` property to check for debug mode

### Built-in Spoke Methods
- `$ready(...)` - signal that module is ready, also sets internal status-tracking to ready
- `$log(...)` - normal-level log messages
- `$debug(...)` - debug-level log
- `$warn(...)` - warning-level log
- `$error(...)` - log an error, returns a new Error object which can be thrown, also sets internal state-tracking to error
- `$shutdown()` - request a shutdown

## License

ISC