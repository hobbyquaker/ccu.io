var EventBus = require('./EventBus');
require('./pfio.inputs.changed');

// Breaks up the inputs.changed event into individual pin events input.changed.
EventBus.on('pfio.inputs.changed', function(state, prev_state) {
	var changed = prev_state ^ state;
	for (var pin = 0; pin < 8; pin++) {
		if ((changed & (1 << pin)) === (1 << pin)) {
			EventBus.emit('pfio.input.changed', pin, ((state & (1 << pin)) === (1 << pin)));
		}
	}
});
