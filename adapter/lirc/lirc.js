/**
 *      CCU.IO LIRC Adapter 0.1
 *
 * Todo:
 *  - implement send_start and send_stop
 *  - connect to multiple lirc daemons
 *  - parse lirc responses and do callbacks (see http://www.lirc.org/html/technical.html#applications)
 *  - save remotes and buttons (poll from lirc via LIST cmd) in regaIndex - for use in dashui widgets
 */


var settings = require(__dirname+'/../../settings.js');

if (!settings.adapters.lirc || !settings.adapters.lirc.enabled) {
    process.exit();
}

var adapterSettings = settings.adapters.lirc.settings;

var isLircConnected = false;
var expectResponse = {};

var logger =    require(__dirname+'/../../logger.js'),
    io =        require('socket.io-client');
var net = require('net');

var client = net.connect({host:adapterSettings.servers[0].host, port: adapterSettings.servers[0].port}, function() {
    isLircConnected = true;
    logger.info('adapter lirc  connected to lirc');
});

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

for (var i in adapterSettings.servers) {
    var dp = settings.adapters.lirc.firstId+(i*12);
    socket.emit("setObject", dp, {
        Name: "LIRC-"+i,
        TypeName: "DEVICE",
        HssType: "LIRC",
        Address: "LIRC-"+i,
        Interface: "CCU.IO",
        Channels: [
            dp+1,
            dp+5
        ]
    });


    socket.emit("setObject", dp+1, {
        Name: "LIRC-"+i+".TRANSMITTER",
        TypeName: "CHANNEL",
        Address: "LIRC-"+i+":1",
        HssType: "LIRC_TRANSMITTER",
        DPs: {
            SEND_ONCE:      dp+2
           // SEND_START:      dp+3,
           // SEND_STOP:        dp+4
        },
        rooms: adapterSettings.servers[i].rooms,
        funcs: adapterSettings.servers[i].funcs,
        favs: adapterSettings.servers[i].favs,

        Parent: dp
    });

    socket.emit("setObject", dp+2, {
        Name: "LIRC-"+i+".TRANSMITTER.SEND_ONCE",
        TypeName: "HSSDP",
        Parent: dp+1
    });
    /*
    socket.emit("setObject", dp+3, {
        Name: "LIRC-"+i+".TRANSMITTER.SEND_START",
        TypeName: "HSSDP",
        Parent: dp+1
    });
    socket.emit("setObject", dp+4, {
        Name: "LIRC-"+i+".TRANSMITTER.SEND_STOP",
        TypeName: "HSSDP",
        Parent: dp+1
    });
*/
    socket.emit("setObject", dp+5, {
        Name: "LIRC-"+i+".RECEIVER",
        TypeName: "CHANNEL",
        Address: "LIRC-"+i+":2",
        HssType: "LIRC_RECEIVER",
        DPs: {
            CMD:      dp+6
        },
        rooms: adapterSettings.servers[i].rooms,
        funcs: adapterSettings.servers[i].funcs,
        favs: adapterSettings.servers[i].favs,
        Parent: dp
    });

    socket.emit("setObject", dp+6, {
        Name: "LIRC-"+i+".RECEIVER.CMD",
        TypeName: "HSSDP",
        Parent: dp+5
    });

}




client.on("data", function (data) {
    data = data.toString();
    if (data.match(/^[0-9a-f]{16} /)) {
        data = data.replace("\n", "");
        var parts = data.split(" ", 4);
        //console.log("< "+parts[3]+" "+parts[2]+" "+parts[1]);
        socket.emit("setState", [settings.adapters.lirc.firstId+6, parts[3]+" "+parts[2]+" "+parts[1], null, true]);
    }
});


function sendOnce(remote, button, repeat, callback) {
    if (typeof repeat === "function") {
        callback = repeat;
        repeat = undefined;
    }
    var str = "SEND_ONCE "+remote+" "+button+(repeat?" "+repeat:"");
    //console.log("> "+str);
    //expectResponse[str] = callback;
    client.write(str);
}

function sendStart(remote, button, callback) {
    var str = "SEND_START "+remote+" "+button;
    //expectResponse[str] = callback;
    client.write(str);
}

function sendStop(remote, button, callback) {
    var str = "SEND_STOP "+remote+" "+button;
    //expectResponse[str] = callback;
    client.write(str);
}

function version(callback) {

    var str = "VERSION";
    //expectResponse[str] = callback;
}

function list(remote, callback) {
    if (typeof remote === "function") {
        callback = remote;
        remote = undefined;
    }
    var str = "LIST"+(remote?" "+remote:"");
    //expectResponse[str] = callback;
    client.write(str);
}





socket.on('connect', function () {
    logger.info("adapter lirc  connected to ccu.io");
});

socket.on('disconnect', function () {
    logger.info("adapter lirc  disconnected from ccu.io");
});

socket.on('event', function (obj) {
    if (!obj || !obj[0]) {
        return;
    }
    if (obj[0] == settings.adapters.lirc.firstId+2) {
        var parts = obj[1].split(" ");
        sendOnce(parts[0], parts[1], parts[2]);
    }
});






function stop() {
    logger.info("adapter lirc  terminating");
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