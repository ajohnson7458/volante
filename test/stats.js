const volante = require('..');
const util = require('util');

let hub = new volante.Hub().attachAll();

hub.attachFromObject({
  name: 'TestSpoke',
  stats: {
    counter: 0,
  },
  init() {
    this.$ready('test spoke initialized');
    setInterval(() => {
      this.counter++;
      this.getStatus();
    }, 1000);
  },
  methods: {
    getStatus() {
      console.log(util.inspect(this.$hub.getStatus(), true, null, true));
    },
  },
});