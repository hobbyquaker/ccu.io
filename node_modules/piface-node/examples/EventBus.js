// Common event bus for entire application, and optionally spy on them.

var EventEmitter = require('events').EventEmitter;
var emitter = new EventEmitter();
var debug = true;

if (debug) {
	var emit = emitter.emit;
	emitter.emit = function() {
		console.log(arguments);
		emit.apply(this, arguments); // JavaScript is pretty much awesome.
	}
}

module.exports = emitter;
