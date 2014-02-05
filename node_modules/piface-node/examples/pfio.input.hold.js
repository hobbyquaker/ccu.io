// hold.js
// subscribes to: pfio.input.changed
// publishes: pfio.input.held

var EventBus = require('./EventBus');

var timeout = [];

EventBus.on('pfio.input.changed', function(pin, state) {
	if (state == 1) {
		timeout[pin] = setTimeout(function() {
			EventBus.emit('pfio.input.hold',pin,state);
		}, 500);
	} else {
		if (timeout[pin]) {
			clearTimeout(timeout[pin]);
		}
	}
});
