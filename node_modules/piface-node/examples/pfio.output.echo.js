var pfio = require('../build/Release/pfio');
var EventBus = require('./EventBus');

EventBus.on('pfio.inputs.changed', function(state) {
	pfio.write_output(state);
});
