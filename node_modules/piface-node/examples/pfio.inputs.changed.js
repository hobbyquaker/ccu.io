var pfio = require('../build/Release/pfio');
var EventBus = require('./EventBus');

var prev_state = 0;

// Watch for Ctrl+C
process.on('SIGINT', stopListening);

// Main busy loop uses setTimeout internally, rather than setInterval.  It was because I had
// different delays in different cases, but I don't think it really matters a whole lot either
// way.
startListening();

function startListening() {
	pfio.init();
	watchInputs();
}

function stopListening() {
	pfio.deinit();
	process.exit(0);
}

// Watches for state changes
function watchInputs() {
	var state;
	state = pfio.read_input();
	if (state !== prev_state) {
		EventBus.emit('pfio.inputs.changed', state, prev_state);
		prev_state = state;
	}
	setTimeout(watchInputs, 10);
}
