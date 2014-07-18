// This is basic functions to create an adapter.
// Usage:
// var adapter = require(__dirname + '/../../utils/adapter-init.js').Adapter("__nameOfAdapter__");
//
// If process still exists, so following functions and attributes are possible:
// adapter.logger      => logger object of logger.js
// adapter.name        => name of adapter
// adapter.socket      => communication coscket with ccu.io (normally not required)
// adapter.onEvent     => callback(obj), that can be set and will be called if any data change event comes from CCU.IO
// adapter.settings    => settings of adapter
// adapter.stop()      => stop the adapter (normaly not required)
// adapter.setObject(id, obj)     => create variable, channel or device in CCU.IO
// adapter.getState(id, callback) => get state of the variable
// adapter.setState(id, val)      => set state of the variable

// the on event can be set later after creation:
// adapter.onEvent = function (id, val, ts, ack) {
//    if (ack)
//        return;
//        
//    // process event here
//    if (id >= adapter.firstId && id <= adapter.firstId + 1000) {
//    	
//    }
// };

function createAdapter(name, onEvent) {
	// read settings file
    var settings = require(__dirname + '/../settings.js'),
        // used for communication with CCU.IO
        io       = require('socket.io-client');
        
    // Load logger module    
    this.logger = require(__dirname + '/../logger.js');
    
    // If settings not exist or adapter is disabled
    if (!settings.adapters[name] || !settings.adapters[name].enabled) {
    	
        if (!settings.adapters[name]) {
            this.logger.error("adapter " + name + " - no settings found for this adapter");
        }
        // End of process, do nothing
        process.exit();
    } else {
        this.socket   = null;
        this.settings = settings.adapters[name].settings;
        this.firstId  = settings.adapters[name].firstId || this.settings.firstId;
        this.name     = name;
        this.onEvent  = onEvent;

        if (settings.ioListenPort) {
            this.socket = io.connect("127.0.0.1", {
                port: settings.ioListenPort
            });
        } else if (settings.ioListenPortSsl) {
            this.socket = io.connect("127.0.0.1", {
                port:   settings.ioListenPortSsl,
                secure: true
            });
        } else {
            process.exit();
        }

        var that = this;
        if (this.socket) {
            this.socket.on('connect', function () {
                that.logger.info("adapter " + that.name + " connected to ccu.io");
            });
            
            this.socket.on('disconnect', function () {
                that.logger.info("adapter " + that.name + " disconnected from ccu.io");
            });
            
            this.socket.on('event', function (obj) {
                if (!obj || !obj[0]) {
                    return;
                }
                
                if (that.onEvent) {
                    //           id,     val,    ts,     ack
                    that.onEvent(obj[0], obj[1], obj[2], obj[3]);
                }
            });
        }
        
        this.stop = function () {
            this.logger.info("adapter " + this.name + " terminating");
            setTimeout(function () {
                process.exit();
            }, 250);
        };
        
        process.on('SIGINT', function () {
            that.stop();
        });
        
        process.on('SIGTERM', function () {
            that.stop();
        });
        
        this.setObject = function (id, obj) {
            this.socket.emit("setObject", id, obj);
        };
        
        this.setState = function (id, val) {
			this.logger.verbose("adapter " + this.name + " setState " + id + " " + val);
            this.socket.emit("setState", [id, val, null, true]);
        };

        this.getState = function (id, callback) {
            this.socket.emit("getDatapoint", [id], function (id, obj) {
        		callback (id, obj);
	    	});
        };
	}
	return this;
}

module.exports.Adapter = createAdapter;
