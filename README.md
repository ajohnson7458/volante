![volante](https://raw.githubusercontent.com/msmiley/msmiley.github.io/master/volante-with-text.svg?sanitize=true)

Volante is a lightweight framework for a hub-and-spoke pattern. It organizes your modules into coherent objects and then provides lots of built-in goodies to make it easier to create your app.

## Features

- structured JSON config file to control the entire wheel and individual modules
- environment variable overrides to config file for changes at run-time
- automatic volante module discovery (found using 'volante' npm keyword)
- built-in logging methods (logging output delegated to volante spoke modules)
- built-in status tracking for modules
- structured event handling
- ability to register for wildcard events ('*')

## `volante.Hub`

The `volante.Hub` may be extended or instanced directly. The public `volante.Hub` methods are typically used to perform final stitching/configuration as shown below.

```js
const volante = require('volante');

let hub = new volante.Hub().attachAll(); // attachAll automatically finds all local Volante modules

hub.loadConfig('config.json'); // load a config file

// the hub can act on any volante event here
hub.on('VolanteExpress.listening', () => {
  console.log('my server is running')
});

```

### Config file format

The config file should be a JSON file and may have the following top level fields which affect Volante config:

- `name` - set the Hub name, effectively setting the name for the entire service
- `debug` - global debug mode flag
- `attach` - array of module npm module names to attach from node_modules
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

#### Environment variable override

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
  props: {
    // effectively the public properties of the module,
    // updated by the config file or real-time by the '<name>.update' event
    someProp: true,
    port: 8080,
  },
  stats: {
    // this section is for storing your spoke module's stats,
    // they will be included in the getStatus output by the Hub
    counter: 0,
  },
  init() {
    // constructor-like initialization
    // called after all props and methods are available on 'this'
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
    '*'() {
      // event wildcard, will get all volante events
    }
  },
  data() { // private variables, as a function so it can be evaluated in context
    return {
      // initialize private data members for Spoke instance, not meant to be changed from
      // outside the module but this is not enforced by JS
      privData: [1,2,3],
    };
  },
  updated() {
    // called automatically after props are updated in response to the
    // config file or real-time by the 'ExampleSpoke.update' event
    this.someMethod(this.someProp);
  },
  methods: {
    // methods are added to Spoke instance (watch for name collisions with props/data/stats)
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
    async methodUsingAwait() {
      // you can add async in front of your method to enable await
      let result = await this.$spokes.OtherModule.doSomething();
    },
  }
}
```

### Built-in Spoke Properties
- `$hub` - a reference to the central `volante.Hub`
- `$spokes` - object of all spokes in wheel, facilitates calling other spoke methods directly
- `$emit` - emit an event across volante wheel
- `$isDebug` - aliases the `this.$hub.isDebug` property to check for debug mode

### Built-in Spoke Methods
- `$ready(...)` - signal that module is ready, also sets internal status-tracking to ready and emits a `<name>.ready` event
- `$log(...)` - normal-level log messages
- `$debug(...)` - debug-level log
- `$warn(...)` - warning-level log
- `$error(...)` - log an error, returns a new Error object which can be thrown, also sets internal state-tracking to error
- `$shutdown()` - request a shutdown

### Conventions

In general, events should only be used for what events are good for - broadcasting one-way information such as "I'm connected", passing metrics around, or other information that could be useful to the entire wheel.

Events are also appropriate when an abstract API has the potential to be implemented by various different providers. The event names could be kept generic and handled by modules which could be easily switched out (e.g. for different databases) - for a loose-knit application which is easily extensible. The drawback with this scheme is that callbacks must be used as events don't return.

```
this.$emit('db.find', {}, (err, results) => {
 // handle error or use results
});
```

More tight-knit applications should probably use methods provided by another module directly. This is fully compatible with newer practices such as async/await and returning a Promise:

```
let result1 = await this.$spokes.OtherModule.asyncMethod();
let result2 = this.$spokes.OtherModule.usefulMethod().then().catch();
```


## License

ISC