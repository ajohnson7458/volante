const volante = require('..');

let hub = new volante.Hub().attachAll();

hub.attachFromObject({
  name: 'TestSpoke',
  init() {
    this.$ready('test spoke initialized');
    
    this.$hub.onAll(this.name, this.handleEvent);
    setTimeout(() => {
      this.$hub.offAll(this.name);
    }, 2000);
    setInterval(() => {
      this.$emit('testevent', 'hello');
    }, 500);
  },
  methods: {
    handleEvent(...arguments) {
      console.log(arguments);  
    },
  },
});