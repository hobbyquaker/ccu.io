/**
 *      CCU.IO Cubietruck Adapter 0.1
 *
 */

if (process.argv[2] == "--standalone") {
    var settings = require(__dirname+'/standalone-settings.js');
} else {
    var settings = require(__dirname+'/../../settings.js');
}

if (!settings.adapters.cubie || !settings.adapters.cubie.enabled) {
    process.exit();
}

var adapterSettings = settings.adapters.cubie.settings,
    io =        require('socket.io-client'),
    fs =        require("fs"),
    cp =        require('child_process'),
    gpio =      require("gpio"),
    gpioIDs =   {},
    gpioObjs =  {},
    firstId =   settings.adapters.cubie.firstId,
    socket =    null,
    inp =       null;


if (settings.ioListenPort) {
    socket = io.connect(settings.binrpc.listenIp, {
        port: settings.ioListenPort
    });
} else if (settings.ioListenPortSsl) {
    socket = io.connect(settings.binrpc.listenIp, {
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

socket.emit("setObject", firstId, {
    Name: adapterSettings.deviceName,
    TypeName: "DEVICE",
    HssType: "CUBIE",
    Address: adapterSettings.deviceName,
    Interface: "CCU.IO",
    Channels: [
        firstId + 1
    ],
    _persistent: true
});

socket.emit("setObject", firstId + 1, {
    Name: adapterSettings.deviceName+".SENSORS",
    TypeName: "CHANNEL",
    Address: adapterSettings.deviceName+".SENSORS",
    HssType: "CUBIE-SENSORS",
    DPs: {
        TEMPERATURE: firstId + 2
    },
    Parent: firstId,
    _persistent: true
});

socket.emit("setObject", firstId + 2, {
    "Name": adapterSettings.deviceName+".SENSORS.TEMPERATURE",
    "TypeName": "HSSDP",
    "Operations": 5,
    "ValueType": 4,
    "ValueUnit": "°C",
    "Parent": firstId+1,
    _persistent: true
});

socket.emit("setObject", firstId + 3, {
    Name: adapterSettings.deviceName+".SYSTEM",
    TypeName: "CHANNEL",
    Address: adapterSettings.deviceName+".SYSTEM",
    HssType: "CUBIE-SYSTEM",
    DPs: {
        LOAD: firstId+4
    },
    Parent: firstId,
    _persistent: true
});

socket.emit("setObject", firstId + 4, {
    "Name": adapterSettings.deviceName+".SYSTEM.LOAD",
    "TypeName": "HSSDP",
    "Operations": 5,
    "ValueType": 4,
    "ValueUnit": "",
    "Parent": firstId+3,
    _persistent: true
});

socket.emit("setObject", firstId + 3, {
    Name: adapterSettings.deviceName+".SYSTEM",
    TypeName: "CHANNEL",
    Address: adapterSettings.deviceName+".SYSTEM",
    HssType: "CUBIE-SYSTEM",
    DPs: {
        LOAD: firstId+4
    },
    Parent: firstId,
    _persistent: true
});

var dpId = firstId + 5;
if (adapterSettings.gpio) {
    for (var gpioNr in adapterSettings.gpio) {
        socket.emit("setObject", dpId, {
            Name: adapterSettings.deviceName + ".GPIO" + gpioNr,
            TypeName: "CHANNEL",
            Address: adapterSettings.deviceName + ".GPIO" + gpioNr,
            HssType: "CUBIE-GPIO",
            DPs: {
                DIRECTION: dpId+1,
                STATE: dpId+2
            },
            Parent: firstId,
            _persistent: true
        });
        socket.emit("setObject", dpId+1, {
            "Name": adapterSettings.deviceName+".GPIO" + gpioNr + ".DIRECTION",
            "TypeName": "HSSDP",
            "Parent": dpId,
            _persistent: true
        });

        socket.emit("setObject", dpId+2, {
            "Name": adapterSettings.deviceName + ".GPIO" + gpioNr + ".STATE",
            "TypeName": "HSSDP",
            "Parent": dpId,
            _persistent: true
        });
        gpioIDs[gpioNr] = dpId+2;

        gpioObjs[dpId + 2] = gpio.export(parseInt(gpioNr,10), {
            direction: adapterSettings.gpio[gpioNr].direction,
            ready: function() {


            }
        });

        if (adapterSettings.gpio[gpioNr].direction == "in") {
            var dpIn = dpId + 2;
            gpioObjs[dpId + 2].on("change", function(val) {
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
            HssType: "CUBIE-1WIRE",
            DPs: dpId+1,
            Parent: firstId,
            _persistent: true
        });

        socket.emit("setObject", dpId+1, {
            "Name": adapterSettings.deviceName+".1WIRE:"+wireDevice+".TEMPERATURE",
            "TypeName": "HSSDP",
            "ValueUnit": "°C",
            "Parent": dpId,
            _persistent: true
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
    HssType: "CUBIE-DISK",
    DPs: diskDPs,
    Parent: firstId,
    _persistent: true
});

socket.emit("setObject", dpId+1, {
    "Name": adapterSettings.deviceName+".DISK.SIZE",
    "TypeName": "HSSDP",
    "Operations": 5,
    "ValueType": 4,
    "ValueUnit": "GB",
    "Parent": dpId,
    _persistent: true
});
socket.emit("setObject", dpId+2, {
    "Name": adapterSettings.deviceName+".DISK.USED",
    "TypeName": "HSSDP",
    "Operations": 5,
    "ValueType": 4,
    "ValueUnit": "GB",
    "Parent": dpId,
    _persistent: true
});
socket.emit("setObject", dpId+3, {
    "Name": adapterSettings.deviceName+".DISK.FREE",
    "TypeName": "HSSDP",
    "Operations": 5,
    "ValueType": 4,
    "ValueUnit": "GB",
    "Parent": dpId,
    _persistent: true
});
socket.emit("setObject", dpId+4, {
    "Name": adapterSettings.deviceName+".DISK.USAGE",
    "TypeName": "HSSDP",
    "Operations": 5,
    "ValueType": 4,
    "ValueUnit": "%",
    "Parent": dpId,
    _persistent: true
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
    HssType: "CUBIE-MEM",
    DPs: memDPs,
    Parent: firstId,
    _persistent: true
});

socket.emit("setObject", dpId+1, {
    "Name": adapterSettings.deviceName+".MEM.SIZE",
    "TypeName": "HSSDP",
    "Operations": 5,
    "ValueType": 4,
    "ValueUnit": "MB",
    "Parent": dpId,
    _persistent: true
});

socket.emit("setObject", dpId+2, {
    "Name": adapterSettings.deviceName+".MEM.FREE",
    "TypeName": "HSSDP",
    "Operations": 5,
    "ValueType": 4,
    "ValueUnit": "MB",
    "Parent": dpId,
    _persistent: true
});

socket.emit("setObject", dpId+3, {
    "Name": adapterSettings.deviceName+".MEM.USAGE",
    "TypeName": "HSSDP",
    "Operations": 5,
    "ValueType": 4,
    "ValueUnit": "MB",
    "Parent": dpId,
    _persistent: true
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
    HssType: "CUBIE-SWAP",
    DPs: swapDPs,
    Parent: firstId,
    _persistent: true
});

socket.emit("setObject", dpId+1, {
    "Name": adapterSettings.deviceName+".SWAP.SIZE",
    "TypeName": "HSSDP",
    "Operations": 5,
    "ValueType": 4,
    "ValueUnit": "MB",
    "Parent": dpId,
    _persistent: true
});

socket.emit("setObject", dpId+2, {
    "Name": adapterSettings.deviceName+".SWAP.FREE",
    "TypeName": "HSSDP",
    "Operations": 5,
    "ValueType": 4,
    "ValueUnit": "MB",
    "Parent": dpId,
    _persistent: true
});

socket.emit("setObject", dpId+3, {
    "Name": adapterSettings.deviceName+".SWAP.USAGE",
    "TypeName": "HSSDP",
    "Operations": 5,
    "ValueType": 4,
    "ValueUnit": "MB",
    "Parent": dpId,
    _persistent: true
});

dpId += 7;

var batteryDPs = {
    STATUS:  dpId+1,
    HEALTH:  dpId+2,
    VOLTAGE: dpId+3,
	CURRENT: dpId+4,
	CAPACITY: dpId+5,
	TEMPERATURE: dpId+6
};

socket.emit("setObject", dpId, {
    Name: adapterSettings.deviceName+".BATTERY",
    TypeName: "CHANNEL",
    Address: adapterSettings.deviceName+".BATTERY",
    HssType: "CUBIE-BATTERY",
    DPs: batteryDPs,
    Parent: firstId,
    _persistent: true
});

socket.emit("setObject", dpId+1, {
    "Name": adapterSettings.deviceName+".BATTERY.STATUS",
    "TypeName": "HSSDP",
    "Operations": 5,
    "ValueType": 4,
    "ValueUnit": "MB",
    "Parent": dpId,
    _persistent: true
});

socket.emit("setObject", dpId+2, {
    "Name": adapterSettings.deviceName+".BATTERY.HEALTH",
    "TypeName": "HSSDP",
    "Operations": 5,
    "ValueType": 4,
    "ValueUnit": "MB",
    "Parent": dpId,
    _persistent: true
});

socket.emit("setObject", dpId+3, {
    "Name": adapterSettings.deviceName+".BATTERY.VOLTAGE",
    "TypeName": "HSSDP",
    "Operations": 5,
    "ValueType": 4,
    "ValueUnit": "V",
    "Parent": dpId,
    _persistent: true
});

socket.emit("setObject", dpId+4, {
    "Name": adapterSettings.deviceName+".BATTERY.CURRENT",
    "TypeName": "HSSDP",
    "Operations": 5,
    "ValueType": 4,
    "ValueUnit": "mA",
    "Parent": dpId,
    _persistent: true
});

socket.emit("setObject", dpId+5, {
    "Name": adapterSettings.deviceName+".BATTERY.CAPACITY",
    "TypeName": "HSSDP",
    "Operations": 5,
    "ValueType": 4,
    "ValueUnit": "%",
    "Parent": dpId,
    _persistent: true
});

socket.emit("setObject", dpId+6, {
    "Name": adapterSettings.deviceName+".BATTERY.TEMPERATURE",
    "TypeName": "HSSDP",
    "Operations": 5,
    "ValueType": 4,
    "ValueUnit": "°C",
    "Parent": dpId,
    _persistent: true
});


dpId += 9;

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
    try {
        var temp = fs.readFileSync("/sys/devices/platform/sunxi-i2c.0/i2c-0/0-0034/temp1_input").toString();
        var loadavg = fs.readFileSync("/proc/loadavg").toString().split(" ");
        temp = parseFloat(temp) / 1000;
        temp = temp.toFixed(1);
        socket.emit("setState", [firstId+2, temp]);
        socket.emit("setState", [firstId+4, parseFloat(loadavg[0])]);
        get1wire();
        getDiskUsage();
        getMemUsage();
        getBattData();
    } catch(e) {
        log("error", e);
    }
}

function getBattData() {
    var temp = fs.readFileSync("/sys/class/power_supply/battery/uevent").toString();
    var lines = temp.split("\n");

    for (var i = 0; i < lines.length; i++) {
        if (!lines[i] || !lines[i].trim()) continue;
        
        var tmp = lines[i].split("=");
        if (tmp.length != 2) continue;
        if (tmp[0] == 'POWER_SUPPLY_STATUS') {
            socket.emit("setState", [batteryDPs.STATUS, tmp[1]]);
        } else
        if (tmp[0] == 'POWER_SUPPLY_HEALTH') {
            socket.emit("setState", [batteryDPs.HEALTH, tmp[1]]);
        } else
        if (tmp[0] == 'POWER_SUPPLY_VOLTAGE_NOW') {
            socket.emit("setState", [batteryDPs.VOLTAGE, (parseInt(tmp[1]) / 1000000).toFixed(2)]);
        } else
        if (tmp[0] == 'POWER_SUPPLY_CURRENT_NOW') {
            socket.emit("setState", [batteryDPs.CURRENT, Math.round((parseInt(tmp[1]) / 1000))]);
        } else
        if (tmp[0] == 'POWER_SUPPLY_CAPACITY') {
            socket.emit("setState", [batteryDPs.CAPACITY, parseInt(tmp[1])]);
        } else
        if (tmp[0] == 'POWER_SUPPLY_TEMP') {
            socket.emit("setState", [batteryDPs.TEMPERATURE, (parseInt(tmp[1]) / 10).toFixed(1)]);
        }
    }
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

setInterval(getValues, adapterSettings.interval || 180000);

function log(sev, msg) {
    socket.emit("log", sev, "adapter CUBIE   "+(adapterSettings.deviceName?"("+adapterSettings.deviceName+") ":"")+msg);
}             
