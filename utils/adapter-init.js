function createAdapter(name, onEvent) {
    var settings = require(__dirname + '../settings.js'),
        io       = require('socket.io-client');
        
    this.logger = require(__dirname + '/../../logger.js');
    
    if (!settings.adapters.[name] || !settings.adapters.[name].enabled) {
        if (!settings.adapters.[name]) {
            this.logger.error("adapter " + name + " - no settings found for this adapter");
        }
        process.exit();
    } else {
        this.socket   = null;
        this.settings = settings.adapters[name].settings;
        this.name     = name;
        this.onEvent  = onEvent;

        if (this.settings.ioListenPort) {
            this.socket = io.connect("127.0.0.1", {
                port: this.settings.ioListenPort
            });
        } else if (this.settings.ioListenPortSsl) {
            this.socket = io.connect("127.0.0.1", {
                port:   this.settings.ioListenPortSsl,
                secure: true,
            });
        } else {
            process.exit();
        }
        
        if (this.socket) {
            this.socket.on('connect', function () {
                this.logger.info("adapter " + this.name + " connected to ccu.io");
            });
            
            this.socket.on('disconnect', function () {
                this.logger.info("adapter " + this.name + " disconnected from ccu.io");
            });
            
            this.socket.on('event', function (obj) {
                if (!obj || !obj[0]) {
                    return;
                }
                
                if (this.onEvent) {
                    this.onEvent(obj);
                }
            });
        }
        
        this.stop = function () {
            logger.info("adapter " + this.name + " terminating");
            setTimeout(function () {
                process.exit();
            }, 250);
        }
        
        var that = this;
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
        	logger.verbose("adapter " + this.name + " setState " + id + " " + val);
        	socket.emit("setState", [id, val, null, true]);
        };

        this.getState = function (id, callback) {
	        socket.emit("getDatapoint", [id], function (id, obj) {
        		callback (id, obj);
	    });
	}
}

        
}

module.exports.adapter = createAdapter;
