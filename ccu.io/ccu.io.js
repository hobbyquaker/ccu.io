/**
 *      CCU.IO
 *
 *      Socket.IO based HomeMatic Interface
 *
 *      Copyright (c) 2013 http://hobbyquaker.github.io
 *
 *      CC BY-NC 3.0
 *
 *      Kommerzielle Nutzung nicht gestattet!
 *
 */

var settings = {

    ioListenPort: 8080,

    ccuIp: "172.16.23.3",
    binrpc: {
        listenIp: "172.16.23.19",
        listenPort: 2101,
        inits: [
            { id: "io_cuxd",    port: 8701 },
            { id: "io_rf",      port: 2001 },
            { id: "io_wired",   port: 2000 }
        ]
    },

    regahss: {
        pollData: true,
        pollMeta: true,
        pollDataInterval: 10000,
        pollDataTrigger: "BidCos-RF.BidCoS-RF:50.PRESS_LONG",
        pollMetaInterval: 172800000,
        cacheMeta: false,
        metaScripts: [
            "variables",
            "programs",
            "rooms",
            "functions",
            "devices",
            "channels",
            "datapoints"
        ]
    },

    version: "0.5"
};


var datapoints = {},
    regaObjects = {},
    regaIndex = {
        Name: {},
        Address: {}
    };



var logger =    require('./logger.js');

logger.info("ccu.io        version "+settings.version);
logger.info("              copyright (c) 2013 hobbyquaker");
logger.info("              press ctrl-c to stop");

var binrpc =    require("./binrpc.js");
var rega =      require("./rega.js");
var express =   require('express'),
    app = express(),
    server =    require('http').createServer(app),
    socketio =  require('socket.io'),
    io;
var socketlist = [];
var homematic = {};
var regahss = new rega({
    ccuIp: settings.ccuIp,
    ready: function() {

    }
});

loadRegaData();

function sendEvent(id, arr) {
    logger.verbose("socket.io --> broadcast event "+JSON.stringify(arr))
    io.sockets.emit("event", arr);
}

function setDatapoint(id, val, ts, ack) {

    // unescape HomeMatic Script WriteURL()
    if (typeof val == "string") {
        val = unescape(val);
    }

    var oldval = datapoints[id];
    datapoints[id] = [val,ts,ack];

    if (!oldval) {
        // Neu
        logger.warn("rega      <-- unknown variable "+id);
        sendEvent(id, [val,ts,ack]);
    } else if (val !== oldval[0]) {
        // Änderung
        logger.debug("chg "+JSON.stringify(oldval)+" -> "+JSON.stringify([val,ts,ack]));
        sendEvent(id, [val,ts,ack]);
    } else {
        if (ack && !oldval[2]) {
            // Bestätigung
            logger.debug("ack "+JSON.stringify(oldval)+" -> "+JSON.stringify([val,ts,ack]));
            sendEvent(id, [val,ts,ack]);
        } else if (ts !== oldval[1]) {
            // Aktualisierung
            logger.debug("ts "+JSON.stringify(oldval)+" -> "+JSON.stringify([val,ts,ack]));
            sendEvent(id, [val,ts,ack]);
        } else {
            // Keine Änderung
            logger.debug("eq "+JSON.stringify(oldval)+" -> "+JSON.stringify([val,ts,ack]));
        }

    }
}

function pollRega() {
    regahss.runScriptFile("polling", function (data) {
        var data = JSON.parse(data);
        for (id in data) {
            setDatapoint(id, data[id][0], data[id][1], true);
        }
        setTimeout(pollRega, settings.regahss.pollDataInterval);
    });

}

function loadRegaData(index) {
    if (!index) { index = 0; }
    var type = settings.regahss.metaScripts[index];
    regahss.runScriptFile(type, function (data) {
        var data = JSON.parse(data);
        logger.info("rega          indexing "+type);
        for (var id in data) {
            var idInt = parseInt(id, 10);

            // HomeMatic Scropt "WriteURL" dekodieren
            for (var key in data[id]) {
                // Nur Strings und auf keinen Fall Kanal- oder Datenpunkt-Arrays
                if (typeof data[id][key] == "string" && key !== "Channels" && key !== "DPs") {
                    data[id][key] = unescape(data[id][key]);
                }
            }

            // Index erzeugen
            var TypeName = data[id].TypeName;
            // Typen-Index (einfach ein Array der IDs)
            if (!regaIndex[TypeName]) {
                regaIndex[TypeName] = [];
            }
            regaIndex[TypeName].push(idInt);
            // Namens-Index
            regaIndex.Name[data[id].Name] = [idInt, TypeName, data[id].Parent];
            // ggf. Adressen-Index
            if (data[id].Address) {
                regaIndex.Address[data[id].Address] = [idInt, TypeName, data[id].Parent];
            }

            // Werte setzen
            datapoints[id] = [data[id].Value, data[id].Timestamp, true];

            // Werte entfernen, Meta-Daten setzen
            delete data[id].Value;
            delete data[id].Timestamp
            regaObjects[id] = data[id];

        }

        index += 1;
        if (index < settings.regahss.metaScripts.length) {
            loadRegaData(index);
        } else {
            settings.regaReady = true;
            logger.info("rega          data succesfully loaded");
            if (settings.regahss.pollData) {
                pollRega();
            }
            initRpc();
            initWebserver();

        }

    });

}

function initRpc() {
    homematic = new binrpc({
        ccuIp: settings.ccuIp,
        listenIp: settings.binrpc.listenIp,
        listenPort: settings.binrpc.listenPort,
        inits: settings.binrpc.inits,
        methods: {
            event: function (obj) {
                var res = [];
                var bidcos;
                switch (obj[0]) {
                    case "io_cuxd":
                    case "CUxD":
                        bidcos = "CUxD." + obj[1] + "." + obj[2];
                        break;
                    case "io_rf":
                        bidcos = "BidCos-RF." + obj[1] + "." + obj[2];
                        break;
                    case "io_wired":
                        bidcos = "BidCos-Wired." + obj[1] + "." + obj[2];
                        break;
                    default:
                        res = [obj[0] + "." + obj[1] + "." + obj[2], obj[3]];
                }

                res = [bidcos, obj[3]];
                var ts = new Date();
                var timestamp = ts.getFullYear() + '-' +
                    ("0" + (ts.getMonth() + 1).toString(10)).slice(-2) + '-' +
                    ("0" + (ts.getDate() + 1).toString(10)).slice(-2) + ' ' +
                    ("0" + (ts.getHours()).toString(10)).slice(-2) + ':' +
                    ("0" + (ts.getMinutes()).toString(10)).slice(-2) + ':' +
                    ("0" + (ts.getSeconds()).toString(10)).slice(-2);


                // Get ReGa id
                var regaObj = regaIndex.Name[bidcos];
                if (regaObj && regaObj[0]) {
                    logger.verbose("socket.io --> broadcast event "+JSON.stringify([regaObj[0], obj[3], timestamp, true]))
                    io.sockets.emit("event", [regaObj[0], obj[3], timestamp, true]);
                    datapoints[regaObj[0]] = [obj[3], timestamp, true];
                }

                /* TODO REMOVE */
                io.sockets.emit("event", res);

                return "";
            }
        }
    });
}

function initWebserver() {
    app.use('/', express.static(__dirname + '/www'));
    server.listen(settings.ioListenPort);
    logger.info("web server    listening on port "+settings.ioListenPort);

    io = socketio.listen(server);
    io.set('logger', { debug: function(obj) {logger.debug("socket.io: "+obj)}, info: function(obj) {logger.debug("socket.io: "+obj)} , error: function(obj) {logger.error("socket.io: "+obj)}, warn: function(obj) {logger.warn("socket.io: "+obj)} });
    initSocketIO();
}

function initSocketIO() {
    io.sockets.on('connection', function (socket) {
        socketlist.push(socket);
        var address = socket.handshake.address;
        logger.info("socket.io <-- " + address.address + ":" + address.port + " " + socket.transport + " connected");

        socket.on('getDatapoints', function(callback) {
            logger.info("socket.io <-- getData");
            callback(datapoints);
        });

        socket.on('getObjects', function(callback) {
            logger.info("socket.io <-- getMeta");
            callback(regaObjects);
        });


        socket.on('getIndex', function(callback) {
            logger.info("socket.io <-- getData");
            callback(regaIndex);
        });

        socket.on('setState', function(callback) {
            logger.info("socket.io <-- setValue");
            callback();
        });

        socket.on('runProgram', function(callback) {
            logger.info("socket.io <-- runProgram");
            callback();
        });

        socket.on('runScript', function(callback) {
            logger.info("socket.io <-- script");
            callback();
        });

        socket.on('disconnect', function () {
            var address = socket.handshake.address;
            logger.info("socket.io <-- " + address.address + ":" + address.port + " " + socket.transport + " disconnected");
            socketlist.splice(socketlist.indexOf(socket), 1);
        });
        socket.on('close', function () {
            var address = socket.handshake.address;
            logger.info("socket.io <-- " + address.address + ":" + address.port + " " + socket.transport + " closed");
            socketlist.splice(socketlist.indexOf(socket), 1);
        });
    });
    logger.info("ccu.io        ready");
}

process.on('SIGINT', function () {
    /*
    socketlist.forEach(function(socket) {
        logger.info("socket.io --> "  + " destroying socket");
        socket.destroy();
    });
     */

    logger.info("socket.io     closing server");
    io.server.close();
    setTimeout(function() {
        logger.info("ccu.io        terminating")
        process.exit(0);
    }, 1000);
});
