/**
 *      CCU.IO LIRC Adapter 0.3
 *
 * Todo:
 *  - implement send_start and send_stop
 *  - connect to multiple lirc daemons (see telnet adapter)
 *  - parse lirc responses and execute callbacks (see http://www.lirc.org/html/technical.html#applications)
 *  - save remotes and buttons (poll from lirc via LIST cmd) in regaIndex(?) - for use in dashui widgets
 *
 * Changelog:
 *
 *
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

var client;

function lircConnect() {
    console.log("lircConnect");
    if (!isLircConnected) {

        client = net.connect({host:adapterSettings.servers[0].host, port: adapterSettings.servers[0].port}, function() {
            //console.log("connected");
            logger.info('adapter lirc  connected to lirc');
            isLircConnected = true;

        });

        client.on("error", function (data) {
            logger.error('adapter lirc  '+data.toString());
            //console.log(data.toString());
        });

        client.on("end", function () {
            //console.log("client end event");
            isLircConnected = false;
            //lircConnect();
        });

        client.on("timeout", function () {
            logger.error('adapter lirc  lirc connection timeout');
            //console.log("client timeout event");
            isLircConnected = false;
            //lircConnect();
        });

        client.on("close", function () {
            logger.info('adapter lirc  connection to lirc closed');
            console.log("client close event");
            isLircConnected = false;
            setTimeout(lircConnect, 5000);
        });

        client.on("data", function (data) {
            data = data.toString();
            if (data.match(/^[0-9a-f]{16} /)) {
                data = data.replace(/\n$/, "");
                var msgs = data.split("\n");
                for (var i = 0; i < msgs.length; i++) {
                    //console.log("< "+msgs[i]);
                    var parts = msgs[i].split(" ", 4);
                    socket.emit("setState", [settings.adapters.lirc.firstId+6, parts[3]+","+parts[2]+(parseInt(parts[1],16)>0?","+parseInt(parts[1],16):""), null, true]);
                }
            } else {
                //console.log("? "+data);
            }
        });


    } else {
        //console.log("already connected/connecting");
    }

}

lircConnect();

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

function sendOnce(remote, button, repeat, callback) {
    if (typeof repeat === "function") {
        callback = repeat;
        repeat = undefined;
    }
    var str = "SEND_ONCE "+remote+" "+button+(repeat?" "+repeat.toString(16):"")+"\n";
    //expectResponse[str] = callback;
    //console.log("> "+str);
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
        var parts = obj[1].split(",");
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