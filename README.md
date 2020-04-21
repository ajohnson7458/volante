![volante](https://raw.githubusercontent.com/msmiley/msmiley.github.io/master/volante-with-text.svg?sanitize=true)

Volante is a flexible, event-centric framework which facilitates a zero-configuration hub-and-spoke pattern. Leveraging the asynchronous nature of events makes it especially suited for modular microservices and services which span client and server. Although true zero-configuration is not always possible, Volante seeks to minimize configuration by automatically finding all local Volante npm modules and attaching them as spokes.

## Features

- super-lightweight (no build-step, no dependencies other than Node.js >= 7)
- zero-configuration as a goal
- automatic volante module loading (matched using 'volante' npm keyword)
- built-in logging methods (logging output delegated to volante spoke modules)

## `volante.Hub`

The `volante.Hub` may be extended or instanced directly. The public `volante.Hub` methods are typically used to perform final stitching/configuration as shown below.

```js
const volante = require('volante');

let hub = new volante.Hub().attachAll(); // attachAll automatically finds all local Volante modules

// various events/handlers
hub.emit('VolanteExpress.update', {
  bind: '127.0.0.1',
  port: 3000,
});

hub.on('VolanteExpress.listening', () => {
  console.log('my server is running')
});

// to access an instance directly, use:
let some_module = hub.getInstanceByNpmName('some-volante-module-by-npm-name');
some_module.some_method();

```

### Methods provided by `volante.Hub`

- `on()` - EventEmitter-provided `on`
- `once()` - EventEmitter-provided `once`
- `emit()` - EventEmitter-provided `emit`
- `attachAll()` - find all valid Volante modules
- `attach(name)` - attach Volante module by name
- `attachLocal(path)` - attach a local JS module
- `attachFromObject(obj)` - load a JS object as a Spoke
- `getSpoke(name)` - get a Spoke instance by its given name (name: '<>')
- `getSpokeByNpmName(name)` - get a Spoke instance by its npm module name
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
		},
	}
}
```

### Built-in Properties
- `$hub` - a reference to the central `volante.Hub`
- `$emit` - emit an event across volante

### Built-in Methods
- `$log(...)` - normal-level log messages
- `$debug(...)` - debug-level log
- `$warn(...)` - warning-level log
- `$error(...)` - log an error, return a new Error ready to throw
- `$shutdown()` - request a shutdown

## License

ISC