/**
 * Created by kamann on 13.01.14.
 */

var settings = require(__dirname+'/../../settings.js');

if (!settings.adapters.yamaha || !settings.adapters.yamaha.enabled) {
    process.exit();
}

var logger = require(__dirname+'/../../logger.js'),
    io     = require('socket.io-client');

var datapoints = {}, objects = {};

logger.info("Hello Wold");

if (settings.ioListenPort) {
    var socket = io.connect("127.0.0.1", {
        port: settings.ioListenPort
    });
} else if (settings.ioListenPortSsl) {
    var socket = io.connect("127.0.0.1", {
        port: settings.ioListenPortSsl,
        secure: true
    });
} else {
    process.exit();
}

setObject(75101,{
    Name: "Yamaha_Command",
    TypeName: "VARDP"
});
setState(75101, "blabla");
setState(75101, "blabla1");

function setState(id, val) {
    datapoints[id] = [val];
    logger.verbose("adapter onkyo setState "+id+" "+val);
    socket.emit("setState", [id,val,null,true]);
}

function setObject(id, obj) {
    objects[id] = obj;
    if (obj.Value) {
        datapoints[obj.Name] = [obj.Value];
    }
    socket.emit("setObject", id, obj);
}

//Ende des Adapters
function stop() {
    logger.info("adapter yamaha terminating");
    //socketOnkyo.end;
    setTimeout(function () {
        process.exit();
    }, 250);
}

//Bei Unix SIGINT -->ende
process.on('SIGINT', function () {
    stop();
});

//Bei Unix SIGTERM -->ende
process.on('SIGTERM', function () {
    stop();
});
