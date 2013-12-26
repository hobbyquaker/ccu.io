var settings = require(__dirname+'/../../settings.js');


if (!settings.adapters.rpi || !settings.adapters.rpi.enabled) {
    process.exit();
}

var adapterSettings = settings.adapters.rpi.settings;

var logger =    require(__dirname+'/../../logger.js'),
    io =        require('socket.io-client'),
    fs =        require("fs");
var gpio =      require("gpio");
var gpioIDs =   {};
var gpioObjs =  {};

if (settings.ioListenPort) {
    var socket = io.connect(settings.binrpc.listenIp, {
        port: settings.ioListenPort
    });
} else if (settings.ioListenPortSsl) {
    var socket = io.connect(settings.binrpc.listenIp, {
        port: settings.ioListenPortSsl,
        secure: true
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


socket.on('event', function (obj) {
    if (!obj || !obj[0]) {
        return;
    }
    var id = obj[0];
    var val = obj[1];

    if (gpioObjs[id]) {
        if (val && val !== "0") {
            gpioObjs[id].set();
        } else {
            gpioObjs[id].reset();
        }
    }

});

socket.emit("setObject", settings.adapters.rpi.firstId, {
    Name: "RPI",
    TypeName: "DEVICE",
    HssType: "RPI",
    Address: "RPI",
    Interface: "CCU.IO",
    Channels: [
        72501
    ]
});

socket.emit("setObject", settings.adapters.rpi.firstId+1, {
    Name: "RPI.SENSORS",
    TypeName: "CHANNEL",
    Address: "RPI.SENSORS",
    HssType: "RPI_SENSORS",
    DPs: {
        TEMPERATURE: settings.adapters.rpi.firstId+2
    },
    Parent: settings.adapters.rpi.firstId
});

socket.emit("setObject", settings.adapters.rpi.firstId+3, {
    Name: "RPI.SYSTEM",
    TypeName: "CHANNEL",
    Address: "RPI.SYSTEM",
    HssType: "RPI_SYSTEM",
    DPs: {
        LOAD: settings.adapters.rpi.firstId+4
    },
    Parent: settings.adapters.rpi.firstId
});


var dpId = settings.adapters.rpi.firstId+5;
for (var gpioNr in adapterSettings.gpio) {
    socket.emit("setObject", dpId, {
        Name: "RPI.GPIO"+gpioNr,
        TypeName: "CHANNEL",
        Address: "RPI.GPIO"+gpioNr,
        HssType: "RPI_GPIO",
        DPs: {
            DIRECTION: dpId+1,
            STATE: dpId+2
        },
        Parent: settings.adapters.rpi.firstId
    });
    socket.emit("setObject", dpId+1, {
        "Name": "RPI.GPIO"+gpioNr+".DIRECTION",
        "TypeName": "HSSDP",
        "Parent": dpId,

    });

    socket.emit("setObject", dpId+2, {
        "Name": "RPI.GPIO"+gpioNr+".STATE",
        "TypeName": "HSSDP",
        "Parent": dpId
    });
    gpioIDs[gpioNr] = dpId+2;


    gpioObjs[dpId+2] = gpio.export(parseInt(gpioNr,10), {
        direction: adapterSettings.gpio[gpioNr].direction,
        ready: function() {


        }
    });

    if (adapterSettings.gpio[gpioNr].direction == "in") {
        var dpIn = dpId+2
        gpioObjs[dpId+2].on("change", function(val) {
            socket.emit("setState", [dpIn, val]);
        });
    }

    socket.emit("setState", [dpId+1, adapterSettings.gpio[gpioNr].direction]);

    dpId += 3;


}

socket.emit("setObject", settings.adapters.rpi.firstId+2, {
    "Name": "RPI.SENSORS.TEMPERATURE",
    "TypeName": "HSSDP",
    "Operations": 5,
    "ValueType": 4,
    "ValueUnit": "°C",
    "Parent": settings.adapters.rpi.firstId+1
});

socket.emit("setObject", settings.adapters.rpi.firstId+4, {
    "Name": "RPI.SYSTEM.LOAD",
    "TypeName": "HSSDP",
    "Operations": 5,
    "ValueType": 4,
    "ValueUnit": "",
    "Parent": settings.adapters.rpi.firstId+3
});

function getValues() {
    var temp = fs.readFileSync("/sys/class/thermal/thermal_zone0/temp").toString();
    var loadavg = fs.readFileSync("/proc/loadavg").toString().split(" ");
    temp = parseFloat(temp) / 1000;
    temp = temp.toFixed(1);
    socket.emit("setState", [settings.adapters.rpi.firstId+2, temp]);
    socket.emit("setState", [settings.adapters.rpi.firstId+4, parseFloat(loadavg[0])]);
}

getValues();

setInterval(getValues, settings.adapters.rpi.settings.interval || 60000);