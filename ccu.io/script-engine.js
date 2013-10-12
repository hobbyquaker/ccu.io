/**
 *      CCU.IO Script Engine
 *
 *      Copyright (c) 2013 http://hobbyquaker.github.io
 *
 *      CC BY-NC 3.0
 *
 *      Kommerzielle Nutzung nicht gestattet!
 *
 */


var regaObjects = {},
    regaIndex = {},
    datapoints = {};

var scriptEngine = {
    util:           require('util'),
    settings:       require(__dirname+'/settings.js'),
    logger:         require(__dirname+'/logger.js'),
    //vm:             require('vm'),
    io:             require('socket.io-client'),
    fs:             require('fs'),
    socket: {},
    subscribers: [],
    init: function () {
        var that = this;
        if (that.settings.ioListenPort) {
            that.socket = that.io.connect("127.0.0.1", {
                port: that.settings.ioListenPort
            });
        } else if (settings.ioListenPortSsl) {
            that.socket = that.io.connect("127.0.0.1", {
                port: that.settings.ioListenPortSsl,
                secure: true
            });
        } else {
            process.exit();
        }
        
        that.socket.on('connect', function () {
            that.logger.info("script-engine connected to ccu.io");
        });

        that.socket.on('disconnect', function () {
            that.logger.info("script-engine disconnected from ccu.io");
        });

        // Fetch Data
        that.socket.emit('getIndex', function(index) {
            that.logger.info("script-engine fetched regaIndex")
            regaIndex = index;
            that.socket.emit('getObjects', function(objects) {
                that.logger.info("script-engine fetched regaObjects")
                regaObjects = objects;
                that.socket.emit('getDatapoints', function(dps) {
                    that.logger.info("script-engine fetched datapoints")
                    datapoints = dps;
                    that.initEventHandler();
                    that.startEngine();
                });
            });
        });


    },
    initEventHandler: function () {
        var that = this;
        that.socket.on('event', function (obj) {

            var id =    obj[0];
            var oldObj = datapoints[id];

            datapoints[id] = [obj[1], obj[2], obj[3], obj[4]];

            var length = that.subscribers.length;

            for (var i = 0; i < length; i++) {
                var pattern = that.subscribers[i].pattern;
                if (pattern.id && pattern.id == id) {
                    that.subscribers[i].callback(obj, oldObj);
                }
            }

        });
    },
    startEngine: function () {
        var that = this;
        that.logger.info("script-engine starting");
        that.fs.readdir(__dirname+"/scripts", function (err, data) {
            for (var i = 0; i < data.length; i++) {
                var path = __dirname+"/scripts/"+data[i];
                runScript(path);
            }
        });
    }
}

function runScript(path) {
    scriptEngine.logger.info("script-engine loading "+path);
    var script = scriptEngine.fs.readFileSync(path);
    // Todo use vm.runInContext
    //var context = scriptEngine.vm.createContext(global);
    //scriptEngine.vm.runInContext(script, context, path);
    //scriptEngine.vm.runInThisContext(script, path);

    var length = scriptEngine.subscribers.length;

    try {
        eval(script.toString());
        scriptEngine.logger.info("script-engine registered "+(scriptEngine.subscribers.length-length)+" subscribers");
        scriptEngine.logger.info("script-engine finished "+path);
    } catch (e) {
        scriptEngine.logger.info("script-engine "+path+" "+e);
    }



}



// Global Stuff for use in Scripts
function log(msg) {
    scriptEngine.logger.info("script        "+msg);
}

function subscribe(pattern, callback) {
    scriptEngine.subscribers.push({
        pattern: pattern,
        callback: callback
    });
}

function setState(id, val, callback) {
    scriptEngine.socket.emit("setState", [id, val], function () {
        if (callback) {
            callback();
        }
    });
}

function executeProgram(id, callback) {
    scriptEngine.socket.emit("executeProgram", id, function () {
        if (callback) {
            callback();
        }
    });
}

scriptEngine.init();


