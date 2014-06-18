var settings = require(__dirname+'/../../settings.js');

if (!settings.adapters.graphite || !settings.adapters.graphite.enabled) {
    process.exit();
}

var adapterSettings = settings.adapters.graphite.settings;

var LazySocket = require('lazy-socket');
var graphite = LazySocket.createConnection(adapterSettings.port, adapterSettings.host);

var logger =    require(__dirname+'/../../logger.js'),
    io =        require('socket.io-client');

var nameCache = {};

var startWait = true;
setTimeout(function() {
    socket.emit('getObjects', function(data) {
        logger.info("adapter grpht fetched regaObjects");
        regaObjects = data;
        startWait = false;
        logger.info("adapter grpht started");
    });
}, 60000);

if (settings.ioListenPort) {
    var socket = io.connect("127.0.0.1", {
        port: settings.ioListenPort
    });
} else if (settings.ioListenPortSsl) {
    var socket = io.connect("127.0.0.1", {
        port: settings.ioListenPortSsl,
        secure: true,
    });
} else {
    process.exit();
}

var regaObjects;


socket.on('connect', function () {
    logger.info("adapter grpht connected to ccu.io");
});

socket.on('disconnect', function () {
    logger.info("adapter grpht disconnected from ccu.io");
});

socket.on('event', function (obj) {
    if (startWait || !obj || !obj[0]) {
        return;
    }
    var name = adapterSettings.prefix+".";
    var id = obj[0];
    var val = obj[1];
    if (val === "true" || val === true) {
        val = 1;
    } else if (val === "false" || val === false) {
        val = 0;
    } else if (isNaN(val) || val === "") {
        return;
    }
    var ts = obj[2];

    if (nameCache[id]) {
        name = nameCache[id];
    } else {

        if (regaObjects[id] && regaObjects[id].Name) {
            if (adapterSettings.logNames) {
                if (regaObjects[id].Parent) {
                    if (adapterSettings.logDeviceNames && regaObjects[regaObjects[id].Parent].Parent) {
                        name = name + regaObjects[regaObjects[regaObjects[id].Parent].Parent].Name+".";
                    }
                    name = name + regaObjects[regaObjects[id].Parent].Name;
                    var dpParts = regaObjects[id].Name.split(".");
                    name = name + "."+dpParts[2];
                } else {
                    name = name + regaObjects[id].Name;
                }
            } else {
                name = name + regaObjects[id].Name;
            }
        } else {
            name = name + id;
        }

        name = name.replace(/\/| /g, "_").toLowerCase().replace(/ä/g,"ae").replace(/ö/g,"oe").replace(/ü/g,"ue").replace(/ß/g,"ss");
        nameCache[id] = name;

    }

    var sendData = name+" "+val+" "+Math.floor((new Date(ts)).getTime() / 1000)+ "\n";
    //console.log(sendData);
    queue.push(sendData);


});

var queue = [];

function popQueue() {
    if (queue.length > 0) {
        var sendData = queue.pop();
        graphite.write(sendData, 'utf-8', function(err) {});
    }
}

setInterval(popQueue, 100);

function stop() {
    logger.info("adapter grpht terminating");
    setTimeout(function () {
        process.exit();
    }, 250);
}

process.on('SIGINT', function () {
    stop();
});

process.on('SIGTERM', function () {
    stop();
});