var settings = require(__dirname+'/../../settings.js');

if (!settings.adapters.rpi || !settings.adapters.rpi.enabled) {
    process.exit();
}

var logger =    require(__dirname+'/../../logger.js'),
    io =        require('socket.io-client'),
    fs =        require("fs");


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


socket.on('connect', function () {
    logger.info("adapter rpi   connected to ccu.io");
});

socket.on('disconnect', function () {
    logger.info("adapter rpi   disconnected from ccu.io");
});

function stop() {
    logger.info("adapter rpi   terminating");
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


socket.emit("setObject", 72500, {
    Name: "RPI",
    TypeName: "DEVICE",
    HssType: "RPI",
    Address: "RPI",
    Interface: "CCU.IO",
    Channels: [
        72501
    ]
});

socket.emit("setObject", 72501, {
    Name: "RPI.SENSORS",
    TypeName: "CHANNEL",
    Address: "RPI.SENSORS",
    HssType: "RPI_SENSORS",
    DPs: {
        TEMPERATURE: 72502
    },
    Parent: 72500
});

socket.emit("setObject", 72503, {
    Name: "RPI.SYSTEM",
    TypeName: "CHANNEL",
    Address: "RPI.SYSTEM",
    HssType: "RPI_SYSTEM",
    DPs: {
        LOAD: 72504
    },
    Parent: 72500
});

socket.emit("setObject", 72502, {
    "Name": "RPI.SENSORS.TEMPERATURE",
    "TypeName": "HSSDP",
    "Operations": 5,
    "ValueType": 4,
    "ValueUnit": "°C",
    "Parent": 72501
});

socket.emit("setObject", 72504, {
    "Name": "RPI.SYSTEM.LOAD",
    "TypeName": "HSSDP",
    "Operations": 5,
    "ValueType": 4,
    "ValueUnit": "",
    "Parent": 72503
});

function getValues() {
    var temp = fs.readFileSync("/sys/class/thermal/thermal_zone0/temp").toString();
    var loadavg = fs.readFileSync("/proc/loadavg").toString().split(" ");
    temp = parseFloat(temp) / 1000;
    temp = temp.toFixed(1);
    socket.emit("setState", [72502, temp]);
    socket.emit("setState", [72504, parseFloat(loadavg[0])]);
}

getValues();

setInterval(getValues, settings.adapters.rpi.settings.interval || 60000);