/**
 *      CCU.IO Cubietruck Adapter 0.1
 *
 *      20140123  Eisbaeeer - added PiFace
 *                enable|disable PiFace with "piface": false|true
 *                in settings.json
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
    wireIDs =   {},
    firstId =   settings.adapters.cubie.firstId,
    pfio =      null,
    socket =    null,
    vars_init = null,
    PiFaceIN =  null,
    inp =       null;

//PiFace requirements
if (adapterSettings.piface) {
    pfio = require("piface-node");
    pfio.init();
    vars_init = '1';   //Init fuer Inputs
    PiFaceIN = [];
    inp = [];
}
//

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
        72501
    ],
    _persistent: true
});

socket.emit("setObject", firstId+1, {
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

//PiFace
if (adapterSettings.piface) {

    var pifaceinDPs = {
        IN0:  dpId+1,
        IN1:  dpId+2,
        IN2:  dpId+3,
        IN3:  dpId+4,
        IN4:  dpId+5,
        IN5:  dpId+6,
        IN6:  dpId+7,
        IN7:  dpId+8
    };

    socket.emit("setObject", dpId, {
        Name: adapterSettings.deviceName+".PIFACEIN",
        TypeName: "CHANNEL",
        Address: adapterSettings.deviceName+".PIFACEIN",
        HssType: "PiFace-IN",
        DPs: swapDPs,
        Parent: firstId +35
    });

    socket.emit("setObject", dpId+1, {
        "Name": adapterSettings.deviceName+".PIFACEIN.IN0",
        "TypeName": "HSSDP",
        "Operations": 5,
        "ValueType": 4,
        "ValueUnit": "",
        "Parent": dpId
    });

    socket.emit("setObject", dpId+2, {
        "Name": adapterSettings.deviceName+".PIFACEIN.IN1",
        "TypeName": "HSSDP",
        "Operations": 5,
        "ValueType": 4,
        "ValueUnit": "",
        "Parent": dpId
    });

    socket.emit("setObject", dpId+3, {
        "Name": adapterSettings.deviceName+".PIFACEIN.IN2",
        "TypeName": "HSSDP",
        "Operations": 5,
        "ValueType": 4,
        "ValueUnit": "",
        "Parent": dpId
    });

    socket.emit("setObject", dpId+4, {
        "Name": adapterSettings.deviceName+".PIFACEIN.IN3",
        "TypeName": "HSSDP",
        "Operations": 5,
        "ValueType": 4,
        "ValueUnit": "",
        "Parent": dpId
    });

    socket.emit("setObject", dpId+5, {
        "Name": adapterSettings.deviceName+".PIFACEIN.IN4",
        "TypeName": "HSSDP",
        "Operations": 5,
        "ValueType": 4,
        "ValueUnit": "",
        "Parent": dpId
    });

    socket.emit("setObject", dpId+6, {
        "Name": adapterSettings.deviceName+".PIFACEIN.IN5",
        "TypeName": "HSSDP",
        "Operations": 5,
        "ValueType": 4,
        "ValueUnit": "",
        "Parent": dpId
    });

    socket.emit("setObject", dpId+7, {
        "Name": adapterSettings.deviceName+".PIFACEIN.IN6",
        "TypeName": "HSSDP",
        "Operations": 5,
        "ValueType": 4,
        "ValueUnit": "",
        "Parent": dpId
    });

    socket.emit("setObject", dpId+8, {
        "Name": adapterSettings.deviceName+".PIFACEIN.IN7",
        "TypeName": "HSSDP",
        "Operations": 5,
        "ValueType": 4,
        "ValueUnit": "",
        "Parent": dpId
    });

    dpId += 9;

    var pifaceoutDPs = {
        OUT0:  dpId+1,
        OUT1:  dpId+2,
        OUT2:  dpId+3,
        OUT3:  dpId+4,
        OUT4:  dpId+5,
        OUT5:  dpId+6,
        OUT6:  dpId+7,
        OUT7:  dpId+8
    };

    socket.emit("setObject", dpId, {
        Name: adapterSettings.deviceName+".PIFACEOUT",
        TypeName: "CHANNEL",
        Address: adapterSettings.deviceName+".PIFACEOUT",
        HssType: "PiFace-OUT",
        DPs: swapDPs,
        Parent: firstId
    });

    socket.emit("setObject", dpId+1, {
        "Name": adapterSettings.deviceName+".PIFACEOUT.OUT0",
        "TypeName": "HSSDP",
        "Operations": 5,
        "ValueType": 4,
        "ValueUnit": "",
        "Parent": dpId
    });

    socket.emit("setObject", dpId+2, {
        "Name": adapterSettings.deviceName+".PIFACEOUT.OUT1",
        "TypeName": "HSSDP",
        "Operations": 5,
        "ValueType": 4,
        "ValueUnit": "",
        "Parent": dpId
    });

    socket.emit("setObject", dpId+3, {
        "Name": adapterSettings.deviceName+".PIFACEOUT.OUT2",
        "TypeName": "HSSDP",
        "Operations": 5,
        "ValueType": 4,
        "ValueUnit": "",
        "Parent": dpId
    });

    socket.emit("setObject", dpId+4, {
        "Name": adapterSettings.deviceName+".PIFACEOUT.OUT3",
        "TypeName": "HSSDP",
        "Operations": 5,
        "ValueType": 4,
        "ValueUnit": "",
        "Parent": dpId
    });

    socket.emit("setObject", dpId+5, {
        "Name": adapterSettings.deviceName+".PIFACEOUT.OUT4",
        "TypeName": "HSSDP",
        "Operations": 5,
        "ValueType": 4,
        "ValueUnit": "",
        "Parent": dpId
    });

    socket.emit("setObject", dpId+6, {
        "Name": adapterSettings.deviceName+".PIFACEOUT.OUT5",
        "TypeName": "HSSDP",
        "Operations": 5,
        "ValueType": 4,
        "ValueUnit": "",
        "Parent": dpId
    });

    socket.emit("setObject", dpId+7, {
        "Name": adapterSettings.deviceName+".PIFACEOUT.OUT6",
        "TypeName": "HSSDP",
        "Operations": 5,
        "ValueType": 4,
        "ValueUnit": "",
        "Parent": dpId
    });

    socket.emit("setObject", dpId+8, {
        "Name": adapterSettings.deviceName+".PIFACEOUT.OUT7",
        "TypeName": "HSSDP",
        "Operations": 5,
        "ValueType": 4,
        "ValueUnit": "",
        "Parent": dpId
    });



    //Wird aufgerufen bei Änderungen von Objekten in CCU.IO.
    socket.on('event', function (obj) {
        if (!obj || !obj[0]) {
            return;
        }

        //ID des geänderten Objektes
        var id = obj[0];
        //Wert des geänderten Objektes
        var val = obj[1];
        //Timestamp der letzten Änderung
        var ts = obj[2];
        //ACKnowledge der letzten Änderung
        var ack = obj[3];

        if (obj[0] == pifaceoutDPs.OUT0 && obj[3] != true || obj[0] == pifaceoutDPs.OUT1 && obj[3] != true  || obj[0] == pifaceoutDPs.OUT2 && obj[3] != true  || obj[0] == pifaceoutDPs.OUT3 && obj[3] != true  || obj[0] == pifaceoutDPs.OUT4 && obj[3] != true  || obj[0] == pifaceoutDPs.OUT5 && obj[3] != true  || obj[0] == pifaceoutDPs.OUT6 && obj[3] != true  || obj[0] == pifaceoutDPs.OUT7 && obj[3] != true  ) {
            //log("info", "adapter   CUBIE: OUT event: " );

            if (id == pifaceoutDPs.OUT0 && val == "1" || id == pifaceoutDPs.OUT0 && val == "true" ) {
                pfio.digital_write(0,1); // (pin, state)
                socket.emit("setState", [pifaceoutDPs.OUT0, true,null,true]);
            }
            if (id == pifaceoutDPs.OUT0 && val == "0" || id == pifaceoutDPs.OUT0 && val == "false" ) {
                pfio.digital_write(0,0); // (pin, state)
                socket.emit("setState", [pifaceoutDPs.OUT0, false,null,true]);
            }

            if (id == pifaceoutDPs.OUT1 && val == "1" || id == pifaceoutDPs.OUT1 && val == "true" ){
                pfio.digital_write(1,1); // (pin, state)
                socket.emit("setState", [pifaceoutDPs.OUT1, true,null,true]);
            }
            if (id == pifaceoutDPs.OUT1 && val == "0" || id == pifaceoutDPs.OUT1 && val == "false" ){
                pfio.digital_write(1,0); // (pin, state)
                socket.emit("setState", [pifaceoutDPs.OUT1, false,null,true]);
            }

            if (id == pifaceoutDPs.OUT2 && val == "1" || id == pifaceoutDPs.OUT2 && val == "true" ){
                pfio.digital_write(2,1); // (pin, state)
                socket.emit("setState", [pifaceoutDPs.OUT2, true,null,true]);
            }
            if (id == pifaceoutDPs.OUT2 && val == "0" || id == pifaceoutDPs.OUT2 && val == "false" ){
                pfio.digital_write(2,0); // (pin, state)
                socket.emit("setState", [pifaceoutDPs.OUT2, false,null,true]);
            }

            if (id == pifaceoutDPs.OUT3 && val == "1" || id == pifaceoutDPs.OUT3 && val == "true" ){
                pfio.digital_write(3,1); // (pin, state)
                socket.emit("setState", [pifaceoutDPs.OUT3, true,null,true]);
            }
            if (id == pifaceoutDPs.OUT3 && val == "0" || id == pifaceoutDPs.OUT3 && val == "false" ){
                pfio.digital_write(3,0); // (pin, state)
                socket.emit("setState", [pifaceoutDPs.OUT3, false,null,true]);
            }

            if (id == pifaceoutDPs.OUT4 && val == "1" || id == pifaceoutDPs.OUT4 && val == "true" ){
                pfio.digital_write(4,1); // (pin, state)
                socket.emit("setState", [pifaceoutDPs.OUT4, true,null,true]);
            }
            if (id == pifaceoutDPs.OUT4 && val == "0" || id == pifaceoutDPs.OUT4 && val == "false" ){
                pfio.digital_write(4,0); // (pin, state)
                socket.emit("setState", [pifaceoutDPs.OUT4, false,null,true]);
            }

            if (id == pifaceoutDPs.OUT5 && val == "1" || id == pifaceoutDPs.OUT5 && val == "true" ){
                pfio.digital_write(5,1); // (pin, state)
                socket.emit("setState", [pifaceoutDPs.OUT5, true,null,true]);
            }
            if (id == pifaceoutDPs.OUT5 && val == "0" || id == pifaceoutDPs.OUT5 && val == "false" ){
                pfio.digital_write(5,0); // (pin, state)
                socket.emit("setState", [pifaceoutDPs.OUT5, false,null,true]);
            }

            if (id == pifaceoutDPs.OUT6 && val == "1" || id == pifaceoutDPs.OUT6 && val == "true" ){
                pfio.digital_write(6,1); // (pin, state)
                socket.emit("setState", [pifaceoutDPs.OUT6, true,null,true]);
            }
            if (id == pifaceoutDPs.OUT6 && val == "0" || id == pifaceoutDPs.OUT6 && val == "false" ){
                pfio.digital_write(6,0); // (pin, state)
                socket.emit("setState", [pifaceoutDPs.OUT6, false,null,true]);
            }

            if (id == pifaceoutDPs.OUT7 && val == "1" || id == pifaceoutDPs.OUT7 && val == "true" ){
                pfio.digital_write(7,1); // (pin, state)
                socket.emit("setState", [pifaceoutDPs.OUT7, true,null,true]);
                
            }
            if (id == pifaceoutDPs.OUT7 && val == "0" || id == pifaceoutDPs.OUT7 && val == "false" ){
                pfio.digital_write(7,0); // (pin, state)
                socket.emit("setState", [pifaceoutDPs.OUT7, false,null,true]);
            }

        }
    });
}

if (adapterSettings.piface) {
    function PiFaceGetValues () {
        PiFaceIN[0] = pfio.digital_read(0);         
        PiFaceIN[1] = pfio.digital_read(1);
        PiFaceIN[2] = pfio.digital_read(2);
        PiFaceIN[3] = pfio.digital_read(3);
        PiFaceIN[4] = pfio.digital_read(4);
        PiFaceIN[5] = pfio.digital_read(5);
        PiFaceIN[6] = pfio.digital_read(6);
        PiFaceIN[7] = pfio.digital_read(7);
        //log("info", "adapter   CUBIE: IN: " + PiFaceIN[0]);
        
        if (PiFaceIN[0] == '1') {
          PiFaceIN[0] = 'true'
          }
        if (PiFaceIN[0] == '0') {
          PiFaceIN[0] = 'false'
          }

        if (PiFaceIN[1] == '1') {
          PiFaceIN[1] = 'true'
          }
        if (PiFaceIN[1] == '0') {
          PiFaceIN[1] = 'false'
          }

        if (PiFaceIN[2] == '1') {
          PiFaceIN[2] = 'true'
          }
        if (PiFaceIN[2] == '0') {
          PiFaceIN[2] = 'false'
          }

        if (PiFaceIN[3] == '1') {
          PiFaceIN[3] = 'true'
          }
        if (PiFaceIN[3] == '0') {
          PiFaceIN[3] = 'false'
          }

        if (PiFaceIN[4] == '1') {
          PiFaceIN[4] = 'true'
          }
        if (PiFaceIN[4] == '0') {
          PiFaceIN[4] = 'false'
          }

        if (PiFaceIN[5] == '1') {
          PiFaceIN[5] = 'true'
          }
        if (PiFaceIN[5] == '0') {
          PiFaceIN[5] = 'false'
          }

        if (PiFaceIN[6] == '1') {
          PiFaceIN[6] = 'true'
          }
        if (PiFaceIN[6] == '0') {
          PiFaceIN[6] = 'false'
          }

        if (PiFaceIN[7] == '1') {
          PiFaceIN[7] = 'true'
          }
        if (PiFaceIN[7] == '0') {
          PiFaceIN[7] = 'false'
          }
      
        if (vars_init == '1') {
            //log("info", "adapter CUBIE INIT Inputs");
            inp[0] = PiFaceIN[0];
            inp[1] = PiFaceIN[1];
            inp[2] = PiFaceIN[2];
            inp[3] = PiFaceIN[3];
            inp[4] = PiFaceIN[4];
            inp[5] = PiFaceIN[5];
            inp[6] = PiFaceIN[6];
            inp[7] = PiFaceIN[7];

//            if (PiFaceIN[0] == 'false' || PiFaceIN[0] == 'true') {
                socket.emit("setState", [pifaceinDPs.IN0, PiFaceIN[0], null,true]);
//            }
//            if (PiFaceIN[1] == 'false' || PiFaceIN[1] == 'true') {
                socket.emit("setState", [pifaceinDPs.IN1, PiFaceIN[1], null,true]);
//            }
//            if (PiFaceIN[2] == 'false' || PiFaceIN[2] == 'true') {
                socket.emit("setState", [pifaceinDPs.IN2, PiFaceIN[2], null,true]);
//            }
//            if (PiFaceIN[3] == 'false' || PiFaceIN[3] == 'true') {
                socket.emit("setState", [pifaceinDPs.IN3, PiFaceIN[3], null,true]);
//            }
//            if (PiFaceIN[4] == 'false' || PiFaceIN[4] == 'true') {
                socket.emit("setState", [pifaceinDPs.IN4, PiFaceIN[4], null,true]);
//            }
//            if (PiFaceIN[5] == 'false' || PiFaceIN[5] == 'true') {
                socket.emit("setState", [pifaceinDPs.IN5, PiFaceIN[5], null,true]);
//            }
//            if (PiFaceIN[6] == 'false' || PiFaceIN[6] == 'true') {
                socket.emit("setState", [pifaceinDPs.IN6, PiFaceIN[6], null,true]);
//            }
//            if (PiFaceIN[7] == 'false' || PiFaceIN[7] == 'true') {
                socket.emit("setState", [pifaceinDPs.IN7, PiFaceIN[7], null,true]);
//            }
            vars_init = "0";             //Ende INIT
        }
        else {
            //log("info", "adapter CUBIE check inputs to write in ccu.io");
            //log("info", "adapter CUBIE " + inp[0]  + PiFaceIN[0] );

            if (PiFaceIN[0] !== inp[0]) {
                socket.emit("setState", [pifaceinDPs.IN0, PiFaceIN[0], null,true]);
                inp[0] = PiFaceIN[0];
            }
            if (PiFaceIN[1] !== inp[1]) {
                socket.emit("setState", [pifaceinDPs.IN1, PiFaceIN[1], null,true]);
                inp[1] = PiFaceIN[1];
            }
            if (PiFaceIN[2] !== inp[2]) {
                socket.emit("setState", [pifaceinDPs.IN2, PiFaceIN[2], null,true]);
                inp[2] = PiFaceIN[2];
            }
            if (PiFaceIN[3] !== inp[3]) {
                socket.emit("setState", [pifaceinDPs.IN3, PiFaceIN[3], null,true]);
                inp[3] = PiFaceIN[3];
            }
            if (PiFaceIN[4] !== inp[4]) {
                socket.emit("setState", [pifaceinDPs.IN4, PiFaceIN[4], null,true]);
                inp[4] = PiFaceIN[4];
            }
            if (PiFaceIN[5] !== inp[5]) {
                socket.emit("setState", [pifaceinDPs.IN5, PiFaceIN[5], null,true]);
                inp[5] = PiFaceIN[5];
            }
            if (PiFaceIN[6] !== inp[6]) {
                socket.emit("setState", [pifaceinDPs.IN6, PiFaceIN[6], null,true]);
                inp[6] = PiFaceIN[6];
            }
            if (PiFaceIN[7] !== inp[7]) {
                socket.emit("setState", [pifaceinDPs.IN7, PiFaceIN[7], null,true]);
                inp[7] = PiFaceIN[7];
            }
        }
        //log("info", "adapter   CUBIE: IN: " + PiFaceIN());
    }
}



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
    var temp = fs.readFileSync("/sys/devices/platform/sunxi-i2c.0/i2c-0/0-0034/temp1_input").toString();
    var loadavg = fs.readFileSync("/proc/loadavg").toString().split(" ");
    temp = parseFloat(temp) / 1000;
    temp = temp.toFixed(1);
    socket.emit("setState", [firstId+2, temp]);
    socket.emit("setState", [firstId+4, parseFloat(loadavg[0])]);
    get1wire();
    getDiskUsage();
    getMemUsage();
}

function getBattData() {
    var temp = fs.readFileSync("/sys/class/power_supply/battery/uevent").toString();
    var lines = temp.split("\n");
    temp = lines[2].split("=");
    var status = (temp);
    temp = lines[5].split("=");
    var health = (temp);
    temp = lines[9].split("=");
    var ActVolt = (temp / 100000).toFixed(2);
    temp = lines[10].split("=");
    var ActCurr = (temp / 1000).toFixed(0);
	temp = lines[12].split("=");
    var BattCap = (temp).toFixed(0);
    temp = lines[13].split("=");
    var BattTemp = (temp / 10).toFixed(1);
   
    socket.emit("setState", [batteryDPs.STATUS, status]);
	socket.emit("setState", [batteryDPs.HEALTH, health]);
	socket.emit("setState", [batteryDPs.VOLTAGE, ActVolt]);
	socket.emit("setState", [batteryDPs.CURRENT, ActCurr]);
	socket.emit("setState", [batteryDPs.CAPACITY, BattCap]);
	socket.emit("setState", [batteryDPs.TEMPERATURE, BattTemp]);
   
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

if (adapterSettings.piface) {
    setInterval(PiFaceGetValues, 50);
}

function log(sev, msg) {
    socket.emit("log", sev, "adapter CUBIE   "+(adapterSettings.deviceName?"("+adapterSettings.deviceName+") ":"")+msg);
}             
