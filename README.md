![volante](https://raw.githubusercontent.com/msmiley/msmiley.github.io/master/volante-with-text.svg?sanitize=true)

Volante is a flexible event-centric framework which facilitates a zero-configuration hub-and-spoke pattern. It's asynchronous nature makes it especially suited for modular microservices and services which span client and server. Although true zero-configuration is not always possible, Volante seeks to minimize configuration by finding all local Volante npm modules and attaching them as spokes automatically and by encouraging the use of sane defaults.

## Features

- zero-configuration as a goal
- automatic volante module loading (matched using npm keywords)
- built-in logging methods

## Usage

```js
const volante = require('volante');

var hub = new volante.Hub();

// various events/handlers
hub.emit(...);
hub.on(...);

// to access an instance directly, use:
var some_module = hub.getInstance('some-volante-module');
some_module.some_method();

```

## Modules

Volante modules extend `volante.Spoke` and should optionally define an `init()` method instead of a `constructor()` to take advantage of `volante.Spoke` boilerplate.

### Properties provided by `volante.Spoke`:
- `this.hub` - a reference to the volante.Hub

### Methods provided by `volante.Spoke`:
- `this.log` - 'normal'-level log messages
- `this.debug` - debug-level logging
- `this.error` - logging an error

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