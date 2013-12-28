var settings = require(__dirname+'/../../settings.js'),
    cp       = require('child_process');


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
        "Parent": dpId
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

socket.emit("setObject", settings.adapters.rpi.firstId+30, {
    Name: "RPI.DISK",
    TypeName: "CHANNEL",
    Address: "RPI.DISK",
    HssType: "RPI_DISK",
    DPs: {
        SIZE:  settings.adapters.rpi.firstId+31,
        USED:  settings.adapters.rpi.firstId+32,
        FREE:  settings.adapters.rpi.firstId+33,
        USAGE: settings.adapters.rpi.firstId+34
    },
    Parent: settings.adapters.rpi.firstId
});

socket.emit("setObject", settings.adapters.rpi.firstId+31, {
    "Name": "RPI.DISK.SIZE",
    "TypeName": "HSSDP",
    "Operations": 5,
    "ValueType": 4,
    "ValueUnit": "Gb",
    "Parent": settings.adapters.rpi.firstId+30
});
socket.emit("setObject", settings.adapters.rpi.firstId+32, {
    "Name": "RPI.DISK.USED",
    "TypeName": "HSSDP",
    "Operations": 5,
    "ValueType": 4,
    "ValueUnit": "Gb",
    "Parent": settings.adapters.rpi.firstId+30
});
socket.emit("setObject", settings.adapters.rpi.firstId+33, {
    "Name": "RPI.DISK.FREE",
    "TypeName": "HSSDP",
    "Operations": 5,
    "ValueType": 4,
    "ValueUnit": "Gb",
    "Parent": settings.adapters.rpi.firstId+30
});
socket.emit("setObject", settings.adapters.rpi.firstId+34, {
    "Name": "RPI.DISK.USAGE",
    "TypeName": "HSSDP",
    "Operations": 5,
    "ValueType": 4,
    "ValueUnit": "%",
    "Parent": settings.adapters.rpi.firstId+30
});

function getDiskUsage () {
	cp.exec('df -h /', function(err, resp) { 
		if (!err && resp) {
			// Filesystem      Size  Used Avail Use% Mounted on
			// /dev/root       7.3G  2.5G  4.5G  36% /
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
				socket.emit("setState", [settings.adapters.rpi.firstId+31, parseFloat(vals[1])]);
				socket.emit("setState", [settings.adapters.rpi.firstId+32, parseFloat(vals[2])]);
				socket.emit("setState", [settings.adapters.rpi.firstId+33, parseFloat(vals[3])]);
				socket.emit("setState", [settings.adapters.rpi.firstId+34, parseFloat(vals[4])]);
			}
			else  {
				logger.warn("adapter rpi   cannot parse" + resp);
			}
		}
	});
}

function getValues() {
    var temp = fs.readFileSync("/sys/class/thermal/thermal_zone0/temp").toString();
    var loadavg = fs.readFileSync("/proc/loadavg").toString().split(" ");
    temp = parseFloat(temp) / 1000;
    temp = temp.toFixed(1);
    socket.emit("setState", [settings.adapters.rpi.firstId+2, temp]);
    socket.emit("setState", [settings.adapters.rpi.firstId+4, parseFloat(loadavg[0])]);
	
	getDiskUsage ();
}

getValues();

setInterval(getValues, settings.adapters.rpi.settings.interval || 60000);