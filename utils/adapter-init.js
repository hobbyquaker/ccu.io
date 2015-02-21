// This is basic functions to create an adapter.
// Usage:
// var adapter = require(__dirname + '/../../utils/adapter-init.js').Adapter("__nameOfAdapter__");
//
// If process still exists, so following functions and attributes are possible:
// adapter.logger      => logger object of logger.js
// adapter.name        => name of adapter
// adapter.socket      => communication coscket with ccu.io (normally not required)
// adapter.onEvent     => callback(obj), that can be set and will be called if any data change event comes from CCU.IO
// adapter.onStop      => callback when the adapter stops
// adapter.settings    => settings of adapter
// adapter.stop()      => stop the adapter (normaly not required)
// adapter.setObject(id, obj)     => create variable, channel or device in CCU.IO
// adapter.getState(id, callback) => get state of the variable, where callback(id, val, ts, ack, lc)
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
        this.logName  = name;
        while (this.logName.length < 5) {
            this.logName += " ";
        }

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
                that.logger.info("adapter " + that.logName + " connected to ccu.io");
                if (that.onConnect) {
                    that.onConnect();
                }
            });
            
            this.socket.on('disconnect', function () {
                that.logger.info("adapter " + that.logName + " disconnected from ccu.io");
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
            this.logger.info("adapter " + this.logName + " terminating");
            if (this.onStop) {
                this.onStop();
            }
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
        
        this.setObject = function (id, obj, callback) {
            this.socket.emit("setObject", id, obj, callback);
        };
        
        this.setState = function (id, val, ack) {
			this.logger.verbose("adapter " + this.logName + " setState " + id + " " + val);
            this.socket.emit("setState", [id, val, null, ack === undefined ? false : ack]);
        };

        this.getState = function (id, callback) {
            if (!callback) return;
            this.socket.emit("getDatapoint", [id], function (id, obj) {
                // got back array with [val,ts,ack,lc]
                if (!obj ||
                    (typeof obj != "object") ||
                    obj[0] === undefined) {
                    callback(id);
                } else {
                    callback(id, obj[0], obj[1], obj[2], obj[3]);
                }
	    	});
        };

        // possible optional arguments:
        //    HssType:     "1WIRE",
        //    Address:     "OWFS",
        //
        // channelIDs is array like [1234,123456,121455]
        this.createDevice = function (deviceID, name, channelIDs, optional) {
            var options = {
                Name:        name,
                TypeName:    "DEVICE",
                Interface:   "CCU.IO",
                Channels:    channelIDs
            };
            if (optional) {
                for (var opt in optional) {
                    options[opt] = optional[opt];
                }
            }
            if (!options.Address) {
                options.Address = name;
            }

            this.setObject(deviceID, options);
        };
        // possible optional arguments:
        //    HssType:     "1WIRE-SENSORS",
        //    Address:     "OWFS.IP1",
        //
        // DPs is object like {"Datapoint1": 123456, "Datapoint2": 123457, "Datapoint4": 123458}
        this.createChannel = function (channelID, deviceID, name, DPs, optional) {
            var options = {
                Name:        name,
                TypeName:    "CHANNEL",
                DPs:         DPs,
                Parent:      deviceID
            };
            if (optional) {
                for (var opt in optional) {
                    options[opt] = optional[opt];
                }
            }
            if (!options.Address) {
                options.Address = name;
            }

            this.setObject(channelID, options);
        };
        // possible optional arguments:
        //    "Operations": 5,
        //    "ValueType":  4,
        //    "ValueUnit":  "°C"
        //
        // DPs is object like {"Datapoint1": 123456, "Datapoint2": 123457, "Datapoint4": 123458}
        this.createDP = function (dpID, channelID, name, isPersistent, optional, callback) {
            var options = {
                "Name":       name,
                "TypeName":   "HSSDP",
                "Parent":     channelID,
                _persistent:  isPersistent
            };
            if (optional) {
                for (var opt in optional) {
                    options[opt] = optional[opt];
                }
            }
            if (!options.Address) {
                options.Address = name;
            }

            this.setObject(dpID, options, callback);
        };

        this.log = function (level, msg) {
            if (level == "silly") {
                this.logger.silly("adapter " + this.logName + " " + msg);
            } else
            if (level == "verbose") {
                this.logger.verbose("adapter " + this.logName + " " + msg);
            } else
            if (level == "info") {
                this.logger.info("adapter " + this.logName + " " + msg);
            } else
            if (level == "warn") {
                this.logger.warn("adapter " + this.logName + " " + msg);
            } else
            if (level == "error") {
                this.logger.error("adapter " + this.logName + " " + msg);
            }  else
            /*if (level == "debug") */{
                this.logger.debug("adapter " + this.logName + " " + msg);
            }
        };
        this.silly = function (msg) {
            this.logger.silly("adapter " + this.logName + " " + msg);
        };
        this.info = function (msg) {
            this.logger.info("adapter " + this.logName + " " + msg);
        };
        this.warn = function (msg) {
            this.logger.warn("adapter " + this.logName + " " + msg);
        };
        this.error = function (msg) {
            this.logger.error("adapter " + this.logName + " " + msg);
        };
        this.debug = function (msg) {
            this.logger.debug("adapter " + this.logName + " " + msg);
        };
        this.verbose = function (msg) {
            this.logger.verbose("adapter " + this.logName + " " + msg);
        };
    }
	return this;
}

module.exports.Adapter = createAdapter;
