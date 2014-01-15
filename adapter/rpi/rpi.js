/**
 *      CCU.IO RaspberryPi Adapter 0.2
 *
 *
 */

if (process.argv[2] == "--standalone") {
    var settings = require(__dirname+'/standalone-settings.js');
} else {
    var settings = require(__dirname+'/../../settings.js');
}


if (!settings.adapters.rpi || !settings.adapters.rpi.enabled) {
    process.exit();
}


var adapterSettings = settings.adapters.rpi.settings,
    io =        require('socket.io-client'),
    fs =        require("fs"),
    cp =        require('child_process'),
    gpio =      require("gpio"),
    gpioIDs =   {},
    gpioObjs =  {},
    wireIDs =   {};




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
    log("info", "connected to ccu.io");
});

socket.on('disconnect', function () {
    log("info", "disconnected from ccu.io");
});

function stop() {
    log("info", "terminating");
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
    Name: adapterSettings.deviceName,
    TypeName: "DEVICE",
    HssType: "RPI",
    Address: adapterSettings.deviceName,
    Interface: "CCU.IO",
    Channels: [
        72501
    ]
});

socket.emit("setObject", settings.adapters.rpi.firstId+1, {
    Name: adapterSettings.deviceName+".SENSORS",
    TypeName: "CHANNEL",
    Address: adapterSettings.deviceName+".SENSORS",
    HssType: "RPI-SENSORS",
    DPs: {
        TEMPERATURE: settings.adapters.rpi.firstId+2
    },
    Parent: settings.adapters.rpi.firstId
});

socket.emit("setObject", settings.adapters.rpi.firstId+3, {
    Name: adapterSettings.deviceName+".SYSTEM",
    TypeName: "CHANNEL",
    Address: adapterSettings.deviceName+".SYSTEM",
    HssType: "RPI-SYSTEM",
    DPs: {
        LOAD: settings.adapters.rpi.firstId+4
    },
    Parent: settings.adapters.rpi.firstId
});




socket.emit("setObject", settings.adapters.rpi.firstId+2, {
    "Name": adapterSettings.deviceName+".SENSORS.TEMPERATURE",
    "TypeName": "HSSDP",
    "Operations": 5,
    "ValueType": 4,
    "ValueUnit": "°C",
    "Parent": settings.adapters.rpi.firstId+1
});

socket.emit("setObject", settings.adapters.rpi.firstId+4, {
    "Name": adapterSettings.deviceName+".SYSTEM.LOAD",
    "TypeName": "HSSDP",
    "Operations": 5,
    "ValueType": 4,
    "ValueUnit": "",
    "Parent": settings.adapters.rpi.firstId+3
});

socket.emit("setObject", settings.adapters.rpi.firstId+3, {
    Name: adapterSettings.deviceName+".SYSTEM",
    TypeName: "CHANNEL",
    Address: adapterSettings.deviceName+".SYSTEM",
    HssType: "RPI-SYSTEM",
    DPs: {
        LOAD: settings.adapters.rpi.firstId+4
    },
    Parent: settings.adapters.rpi.firstId
});

var dpId = settings.adapters.rpi.firstId+5;
if (adapterSettings.gpio) {
    for (var gpioNr in adapterSettings.gpio) {
        socket.emit("setObject", dpId, {
            Name: adapterSettings.deviceName+".GPIO"+gpioNr,
            TypeName: "CHANNEL",
            Address: adapterSettings.deviceName+".GPIO"+gpioNr,
            HssType: "RPI-GPIO",
            DPs: {
                DIRECTION: dpId+1,
                STATE: dpId+2
            },
            Parent: settings.adapters.rpi.firstId
        });
        socket.emit("setObject", dpId+1, {
            "Name": adapterSettings.deviceName+".GPIO"+gpioNr+".DIRECTION",
            "TypeName": "HSSDP",
            "Parent": dpId
        });

        socket.emit("setObject", dpId+2, {
            "Name": adapterSettings.deviceName+".GPIO"+gpioNr+".STATE",
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
}


var wireDPs = {};
if (adapterSettings["1wire"]) {
    for (var wireDevice in adapterSettings["1wire"]) {
        socket.emit("setObject", dpId, {
            Name: adapterSettings["1wire"][wireDevice].name,
            TypeName: "CHANNEL",
            Address: adapterSettings.deviceName+".1WIRE:"+wireDevice,
            HssType: "RPI-1WIRE",
            DPs: dpId+1,
            Parent: settings.adapters.rpi.firstId
        });

        socket.emit("setObject", dpId+1, {
            "Name": adapterSettings.deviceName+".1WIRE:"+wireDevice+".TEMPERATURE",
            "TypeName": "HSSDP",
            "ValueUnit": "°C",
            "Parent": dpId
        });
        wireDPs[wireDevice] = dpId+1;
        dpId += 2;
    }
}

var diskDPs = {
    SIZE:  dpId+1,
    USED:  dpId+2,
    FREE:  dpId+3,
    USAGE: dpId+4
};

socket.emit("setObject", dpId, {
    Name: adapterSettings.deviceName+".DISK",
    TypeName: "CHANNEL",
    Address: adapterSettings.deviceName+".DISK",
    HssType: "RPI-DISK",
    DPs: diskDPs,
    Parent: settings.adapters.rpi.firstId
});

socket.emit("setObject", dpId+1, {
    "Name": adapterSettings.deviceName+".DISK.SIZE",
    "TypeName": "HSSDP",
    "Operations": 5,
    "ValueType": 4,
    "ValueUnit": "GB",
    "Parent": dpId
});
socket.emit("setObject", dpId+2, {
    "Name": adapterSettings.deviceName+".DISK.USED",
    "TypeName": "HSSDP",
    "Operations": 5,
    "ValueType": 4,
    "ValueUnit": "GB",
    "Parent": dpId
});
socket.emit("setObject", dpId+3, {
    "Name": adapterSettings.deviceName+".DISK.FREE",
    "TypeName": "HSSDP",
    "Operations": 5,
    "ValueType": 4,
    "ValueUnit": "GB",
    "Parent": dpId
});
socket.emit("setObject", dpId+4, {
    "Name": adapterSettings.deviceName+".DISK.USAGE",
    "TypeName": "HSSDP",
    "Operations": 5,
    "ValueType": 4,
    "ValueUnit": "%",
    "Parent": dpId
});

dpId += 5;

var memDPs = {
    SIZE:  dpId+1,
    FREE:  dpId+2,
    USAGE: dpId+3
};

socket.emit("setObject", dpId, {
    Name: adapterSettings.deviceName+".MEM",
    TypeName: "CHANNEL",
    Address: adapterSettings.deviceName+".MEM",
    HssType: "RPI-MEM",
    DPs: memDPs,
    Parent: settings.adapters.rpi.firstId
});

socket.emit("setObject", dpId+1, {
    "Name": adapterSettings.deviceName+".MEM.SIZE",
    "TypeName": "HSSDP",
    "Operations": 5,
    "ValueType": 4,
    "ValueUnit": "MB",
    "Parent": dpId
});

socket.emit("setObject", dpId+2, {
    "Name": adapterSettings.deviceName+".MEM.FREE",
    "TypeName": "HSSDP",
    "Operations": 5,
    "ValueType": 4,
    "ValueUnit": "MB",
    "Parent": dpId
});

socket.emit("setObject", dpId+3, {
    "Name": adapterSettings.deviceName+".MEM.USAGE",
    "TypeName": "HSSDP",
    "Operations": 5,
    "ValueType": 4,
    "ValueUnit": "MB",
    "Parent": dpId
});

dpId += 4;

var swapDPs = {
    SIZE:  dpId+1,
    FREE:  dpId+2,
    USAGE: dpId+3
};

socket.emit("setObject", dpId, {
    Name: adapterSettings.deviceName+".SWAP",
    TypeName: "CHANNEL",
    Address: adapterSettings.deviceName+".SWAP",
    HssType: "RPI-SWAP",
    DPs: swapDPs,
    Parent: settings.adapters.rpi.firstId
});

socket.emit("setObject", dpId+1, {
    "Name": adapterSettings.deviceName+".SWAP.SIZE",
    "TypeName": "HSSDP",
    "Operations": 5,
    "ValueType": 4,
    "ValueUnit": "MB",
    "Parent": dpId
});

socket.emit("setObject", dpId+2, {
    "Name": adapterSettings.deviceName+".SWAP.FREE",
    "TypeName": "HSSDP",
    "Operations": 5,
    "ValueType": 4,
    "ValueUnit": "MB",
    "Parent": dpId
});

socket.emit("setObject", dpId+3, {
    "Name": adapterSettings.deviceName+".SWAP.USAGE",
    "TypeName": "HSSDP",
    "Operations": 5,
    "ValueType": 4,
    "ValueUnit": "MB",
    "Parent": dpId
});


function getDiskUsage () {
    cp.exec('df -h /', function(err, resp) {
        if (!err && resp) {
            var i = resp.indexOf ("/");
            if (i != -1) {
                resp = resp.substring(i);
                resp = resp.replace(/  /g, ' ');
                resp = resp.replace(/  /g, ' ');
                resp = resp.replace(/  /g, ' ');
                // /dev/root 7.3G 2.5G 4.5G 36% /
            }
            var vals = resp.split(' ');
            if (vals.length == 6) {
                socket.emit("setState", [diskDPs.SIZE, parseFloat(vals[1])]);
                socket.emit("setState", [diskDPs.USED, parseFloat(vals[2])]);
                socket.emit("setState", [diskDPs.FREE, parseFloat(vals[3])]);
                socket.emit("setState", [diskDPs.USAGE, parseFloat(vals[4])]);
            }
            else  {
                log("info", "cannot parse" + resp);
            }
        }
    });
}

function getMemUsage() {
    var temp = fs.readFileSync("/proc/meminfo").toString();
    var lines = temp.split("\n");
    temp = lines[0].split(" ");
    var memTotal = (temp[temp.length-2] / 1024).toFixed(0);
    temp = lines[1].split(" ");
    var memFree = (temp[temp.length-2] / 1024).toFixed(0);

    var memUsage = (((memTotal-memFree) / memTotal) * 100).toFixed(1);

    temp = lines[13].split(" ");
    var swapTotal = (temp[temp.length-2] / 1024).toFixed(0);
    temp = lines[14].split(" ");
    var swapFree = (temp[temp.length-2] / 1024).toFixed(0);


    var swapUsage = (((swapTotal-swapFree) / swapTotal) * 100).toFixed(1);

    socket.emit("setState", [memDPs.SIZE, memTotal]);
    socket.emit("setState", [memDPs.FREE, memFree]);
    socket.emit("setState", [memDPs.USAGE, memUsage]);

    socket.emit("setState", [swapDPs.SIZE, swapTotal]);
    socket.emit("setState", [swapDPs.FREE, swapFree]);
    socket.emit("setState", [swapDPs.USAGE, swapUsage]);
}

function getValues() {
    var temp = fs.readFileSync("/sys/class/thermal/thermal_zone0/temp").toString();
    var loadavg = fs.readFileSync("/proc/loadavg").toString().split(" ");
    temp = parseFloat(temp) / 1000;
    temp = temp.toFixed(1);
    socket.emit("setState", [settings.adapters.rpi.firstId+2, temp]);
    socket.emit("setState", [settings.adapters.rpi.firstId+4, parseFloat(loadavg[0])]);
    get1wire();
    getDiskUsage();
    getMemUsage();
}

function get1wire() {
    for (var wireDevice in adapterSettings["1wire"]) {
        try {
            var temp = fs.readFileSync("/sys/bus/w1/devices/"+wireDevice+"/w1_slave").toString();
        } catch (e) {
            log("error", "can't read /sys/bus/w1/devices/"+wireDevice+"/w1_slave");
        }
        var lines = temp.split("\n");
        var l1 = lines[0].split(" ");
        if (l1[l1.length-1] != "NO") {
            var l2 = lines[1].split(" ");
            var x = l2[l2.length-1].split("=");
            var t = (x[1] / 1000).toFixed(1);
            socket.emit("setState", [wireDPs[wireDevice], t]);
        }
    }
}

getValues();

setInterval(getValues, settings.adapters.rpi.settings.interval || 180000);

function log(sev, msg) {
    socket.emit("log", sev, "adapter rpi   "+(adapterSettings.deviceName?"("+adapterSettings.deviceName+") ":"")+msg);
}