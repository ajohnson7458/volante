module.exports = {
  name: 'ReadyTestModule2',
  props: {
    count: 0,
  },
  init() {
    this.$log('THIS IS INIT');
  },
  updated() {
    this.$log('THIS IS UPDATED');
    this.$ready('im ready');
  },
  events: {
    'ReadyTestModule.ready'() {
      this.$log('ReadyTestModule just told me its ready');
    }
  },
};