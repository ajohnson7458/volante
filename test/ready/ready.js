module.exports = {
  name: 'ReadyTestModule',
  props: {
    count: 0,
  },
  init() {
    this.$log('THIS IS INIT');
  },
  updated() {
    this.$log('THIS IS UPDATED');
    this.$ready('im ready');
  }
};