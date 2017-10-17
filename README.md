![volante](https://raw.githubusercontent.com/msmiley/msmiley.github.io/master/volante-with-text.svg?sanitize=true)

Volante is a flexible, event-centric framework which facilitates a zero-configuration hub-and-spoke pattern. Leveraging the asynchronous nature of events makes it especially suited for modular microservices and services which span client and server. Although true zero-configuration is not always possible, Volante seeks to minimize configuration by finding all local Volante npm modules and attaching them as spokes automatically and by encouraging the use of sane defaults.

## Features

- zero-configuration as a goal
- automatic volante module loading (matched using 'volante' npm keyword)
- built-in logging methods

## Hub

```js
const volante = require('volante');

var hub = new volante.Hub().attachAll();

// various events/handlers
hub.emit(...);
hub.on(...);

// to access an instance directly, use:
var some_module = hub.getInstance('some-volante-module');
some_module.some_method();

```

### Methods provided by `volante.Hub`

- `on()` - EventEmitter-provided `on`
- `once()` - EventEmitter-provided `once`
- `emit()` - EventEmitter-provided `emit`
- `attachAll()` - find all valid Volante modules
- `attach(name)` - attach Volante module by name
- `getInstance(name)` - get a Spoke instance by module name
- `log(Object)` - normal-level log messages
- `debug(Object)` - debug-level log, also enables debug mode when called without an argument
- `error(Object)` - log an error
- `shutdown()` - shutdown Volante

### Events emitted by `volante.Hub`

All Volante built-in events are namespaced with `volante.` They are listed below along with the data item emitted with the event.

- `volante.attachAll` - all Spokes attached using .attachAll()
  ```js
  Number // number of Spoke modules found
  ```
- `volante.attached` -
  ```js
  String // name of Spoke module
  ```
- `volante.log` - normal log level event
  ```js
  {
    lvl: 'normal',
    src: String, // Spoke class name
    msg: String
  }
  ```
- `volante.debug` - debug log level event
  ```js
  {
    lvl: 'debug',
    src: String, // Spoke class name
    msg: String
  }
  ```
- `volante.error` - error log event
  ```js
  {
    lvl: 'error',
    src: String, // Spoke class name
    msg: String
  }
  ```
- `volante.shutdown` - emitted when shutdown initiated
- `volante.done` - emitted when shutdown complete

## Spokes

Volante modules extend `volante.Spoke` and should optionally define an `init()` method instead of a `constructor()` to take advantage of `volante.Spoke` boilerplate.

### Properties provided by `volante.Spoke`
- `hub` - a reference to the central `volante.Hub`
  - mainly used for `.on()` and `.emit()`

### Methods provided by `volante.Spoke`
- `log(Object)` - normal-level log messages
- `debug(Object)` - debug-level log
- `error(Object)` - log an error
- `shutdown()` - request a shutdown

### Example

```js
const volante = require('volante');

class VolanteModule extends volante.Spoke {

  init() {
    this.hub.on('volante-module.some-command', (obj) => {
      this.process(obj);
    });
  }

  process() {
    this.debug('processing');
    ...
    this.hub.emit('volante-module.results', obj);
  }
}
```


## License

ISC