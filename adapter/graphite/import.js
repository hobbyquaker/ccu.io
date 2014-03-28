// TODO automatic Import of all Logfiles...

var settings = require(__dirname+'/../../settings.js');

if (!settings.adapters.graphite || !settings.adapters.graphite.enabled) {
    process.exit();
}

var adapterSettings = settings.adapters.graphite.settings;

var LazySocket = require('lazy-socket');
var graphite = LazySocket.createConnection(adapterSettings.port, adapterSettings.host);

var io =        require('socket.io-client'),
    fs =        require('fs');

var nameCache = {};

var sendQueue = [];

var startWait = true;
setTimeout(function() {
    socket.emit('getObjects', function(data) {
        console.log("graphite import fetched regaObjects");
        regaObjects = data;
        startWait = false;
        socket.disconnect();
        readLogs();

    });
}, 1);

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
    console.log("graphite import connected to ccu.io");
});

socket.on('disconnect', function () {
    console.log("graphite import disconnected from ccu.io");
});

function readLogs() {
    console.log("graphite import started");

    var file = process.argv[2];
    if (!file) {
        console.log("usage: node import.js devices-variables.log.2014-03-27");
    }
    readLog(file);

    /*
    fs.readdir(__dirname+"/../../log", function (err, data) {
        data = data.sort();
        for (var i = 0; i < data.length; i++) {
            readLog(data[i]);
        }
    });
    */
}

function readLog(file) {
            var fileBuf = fs.readFileSync(__dirname+"/../../log/"+file);
            var fileArr = fileBuf.toString().split("\n");
            if (fileArr.length < 1) {
                console.log("error reading logfile");
                return;
            }

            console.log(file+" "+fileArr.length);

            for (var i = 0; i < fileArr.length; i++) {
                sendQueue.push(fileArr[i].split(" "));
            }
}

function popQueue() {
    if (sendQueue.length > 0) {
        var line = buildLine(sendQueue.pop());
        sendLine(line);
        if (sendQueue.length == 0) {
            console.log("graphite import queue empty");
        }
    }
}

setInterval(popQueue, 20);

function buildLine(obj) {
    var name = adapterSettings.prefix+".";
    var id = obj[1];
    var val = obj[2];
    if (val === "true" || val === true) {
        val = 1;
    } else if (val === "false" || val === false) {
        val = 0;
    } else if (isNaN(val) || val === "") {
        return;
    }
    var ts = obj[0];

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
    return name+" "+val+" "+ts+ "\n";
}

function sendLine(data, cb) {

    graphite.write(data, 'utf-8', function(err) {
    });

}

function stop() {
    console.log("graphite import terminating");
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