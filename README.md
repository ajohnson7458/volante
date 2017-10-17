# Volante

Volante is a flexible event-centric framework which facilitates a hub-and-spoke pattern. It's asynchronous nature makes it especially suited for network services.

## Features

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

