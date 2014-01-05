/**
 *      CCU.IO telnet-client Adapter 0.1
 *
 * Todo:
 *
 * Changelog:
 *
 *
**/


var settings = require(__dirname+'/../../settings.js');

if (!settings.adapters.telnet || !settings.adapters.telnet.enabled) {
    process.exit();
}

var adapterSettings = settings.adapters.telnet.settings,
    logger =    require(__dirname+'/../../logger.js'),
    io =        require('socket.io-client'),
    net =       require('net'),
    client = [],
    datapoints = {},
    sendDatapoints = [];

function telnetConnect(server) {
        client[server] = net.connect({host:adapterSettings.servers[server].host, port: adapterSettings.servers[server].port}, function() {
            logger.info('adapter telnet connected to '+server+" ("+adapterSettings.servers[server].host+":"+adapterSettings.servers[server].port+")");
            socket.emit("setState", [datapoints[server].CONNECTION, true, null, true]);
        });

        client[server].on("error", function (data) {
            logger.error('adapter telnet '+server+" ("+adapterSettings.servers[server].host+":"+adapterSettings.servers[server].port+") "+data.toString());
        });

        client[server].on("end", function () {
            //console.log("client end event");
        });

        client[server].on("timeout", function () {
            logger.error('adapter telnet connection timeout '+server+" ("+adapterSettings.servers[server].host+":"+adapterSettings.servers[server].port+") ");
            socket.emit("setState", [datapoints[server].CONNECTION, false, null, true]);
        });

        client[server].on("close", function () {
            logger.verbose('adapter telnet connection closed '+server+" ("+adapterSettings.servers[server].host+":"+adapterSettings.servers[server].port+") ");
            //console.log("client close event");
            socket.emit("setState", [datapoints[server].CONNECTION, false, null, true]);
            setTimeout(function (_server) {
                telnetConnect(_server);
            }, adapterSettings.servers[server].reconnectInterval || 10000, server);
        });

        client[server].on("data", function (data) {
            data = data.toString();
            //console.log("< "+data);
            socket.emit("setState", [datapoints[server].RECEIVE, data, null, true]);
        });
}


// Mit CCU.IO verbinden
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

// Objekte auf CCU.IO anlegen
var channels = [];
var i = 0;
for (var server in adapterSettings.servers) {
    var dp = 1 + settings.adapters.telnet.firstId+(i*4);
    i += 1;

    datapoints[server] = {
        SEND: dp+2,
        RECEIVE: dp+3,
        CONNECTION: dp+1
    };
    sendDatapoints.push(dp+2);

    socket.emit("setObject", dp, {
        Name: "TELNET."+server,
        TypeName: "CHANNEL",
        Address: adapterSettings.servers[server].host,
        HssType: "TELNET_SEND",
        DPs: {
            SEND:       dp+2,
            RECEIVE:    dp+3,
            CONNECTION: dp+1
        },
        rooms:  adapterSettings.servers[server].rooms,
        funcs:  adapterSettings.servers[server].funcs,
        favs:   adapterSettings.servers[server].favs,
        Parent: settings.adapters.telnet.firstId
    });

    socket.emit("setObject", dp+1, {
        Name: "TELNET."+server+".CONNECTION",
        TypeName: "HSSDP",
        Parent: dp
    });

    socket.emit("setObject", dp+2, {
        Name: "TELNET."+server+".SEND",
        TypeName: "HSSDP",
        Parent: dp
     });

    socket.emit("setObject", dp+3, {
        Name: "TELNET."+server+".RECEIVE",
        TypeName: "HSSDP",
        Parent: dp
    });
}

//console.log(sendDatapoints);
socket.emit("setObject", settings.adapters.telnet.firstId, {
    Name: "TELNET",
    TypeName: "DEVICE",
    HssType: "TELNET_CLIENT",
    Address: "CCU-IO.TELNET",
    Interface: "CCU-IO",
    Channels: channels
});


// Von CCU.IO empfangene Events verarbeiten
socket.on('event', function (obj) {
    if (!obj || !obj[0]) {
        return;
    }
    var needle,
        id = parseInt(obj[0], 10),
        val = obj[1];

    // Datenpunkt relevant?
    //console.log("? "+id);
    if (sendDatapoints.indexOf(id) == -1) {
        return false;
    }
    //console.log("! "+id);
    // Server finden
    for (var server in datapoints) {
        if (datapoints[server].SEND == id) {
            needle = server;
            break;
        }
    }
    if (needle) {
        //console.log("> "+val);
        client[needle].write(val+(adapterSettings.servers[needle].noNewLine?"":"\n"));
    }
});

socket.on('connect', function () {
    logger.info("adapter telnet connected to ccu.io");
});

socket.on('disconnect', function () {
    logger.info("adapter lirc  disconnected from ccu.io");
});


// Prozess
function stop() {
    logger.info("adapter telnet terminating");
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


// Verbinden!
setTimeout(function () {
    for (var server in adapterSettings.servers) {
        telnetConnect(server);
    }
}, 2500);
