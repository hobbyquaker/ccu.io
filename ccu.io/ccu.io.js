/**
 *      CCU.IO version 0.4
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

    ioListenPort: 2100,

    ccuIp: "172.16.23.3",

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

    binrpc: {
        listenIp: "172.16.23.19",
        listenPort: 2101,
        inits: [
            { id: "io_cuxd",    port: 8701 },
            { id: "io_rf",      port: 2001 },
            { id: "io_wired",   port: 2000 }
        ]
    }
};


var datapoints = {},
    regaObjects = {},
    regaIndex = {
        Name: {},
        Address: {}
    };

var logger = require('./logger.js');
var binrpc = require("./binrpc.js");
var rega = require("./rega.js");

logger.info("ccu.io copyright (c) 2013 hobbyquaker");

var io = require('socket.io').listen(settings.ioListenPort);
//var socketlist = [];

var homematic = new binrpc({
    ccuIp: settings.ccuIp,
    listenIp: settings.binrpc.listenIp,
    listenPort: settings.binrpc.listenPort,
    inits: settings.binrpc.inits,
    methods: {
        event: function (obj) {
            var res = [];
            switch (obj[0]) {
                case "io_cuxd":
                case "CUxD":
                    res = ["CUxD." + obj[1] + "." + obj[2], obj[3]];
                    break;
                case "io_rf":
                    res = ["BidCos-RF." + obj[1] + "." + obj[2], obj[3]];
                    break;
                case "io_wired":
                    res = ["BidCos-Wired." + obj[1] + "." + obj[2], obj[3]];
                    break;
                default:
                    res = [obj[0] + "." + obj[1] + "." + obj[2], obj[3]];
            }
            io.sockets.emit("event", res);
            return "";
        }
    }
});



function loadRega(index) {
    if (!index) { index = 0; }
    var type = settings.regahss.metaScripts[index];
    regahss.runScriptFile(type, function (data) {
        var data = JSON.parse(data);
        logger.verbose("generating index");
        for (var id in data) {
            var idInt = parseInt(id, 10);

            for (var key in data[id]) {
                if (typeof data[id][key] == "string" && key !== "Channels" && key !== "DPs") {
                    data[id][key] = unescape(data[id][key]);
                }
            }
            if (!regaIndex[data[id].TypeName]) {
                regaIndex[data[id].TypeName] = [];
            }
            regaIndex[data[id].TypeName].push(idInt);
            regaIndex.Name[data[id].Name] = [idInt, data[id].TypeName, data[id].Parent];
            if (data[id].Address) {
                regaIndex.Address[data[id].Address] = [idInt, data[id].TypeName, data[id].Parent];
            }

            regaObjects[id] = data[id];

            datapoints[id] = [data[id].Value, data[id].Timestamp];

        }

        index += 1;
        if (index < settings.regahss.metaScripts.length) {
            loadRega(index);
        } else {
            settings.regaReady = true;

        }

    });

}



var regahss = new rega({
    ccuIp: settings.ccuIp,
    ready: function() {

    }
});

    loadRega();


io.sockets.on('connection', function (socket) {
    //socketlist.push(socket);



    logger.info("socket.io <-- "  + " connected");




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
        logger.info("socket.io <-- "  + " disconnected");
        //socketlist.splice(socketlist.indexOf(socket), 1);
    });
    socket.on('close', function () {
        logger.info("socket.io <-- "  + " socket closed");
        //socketlist.splice(socketlist.indexOf(socket), 1);
    });

});


process.on('SIGINT', function () {
    /*socketlist.forEach(function(socket) {
     logger.info("socket.io --> "  + " destroying socket");

     socket.destroy();
     });

     */
    logger.info("socket.io closing server");
    io.server.close();

});
