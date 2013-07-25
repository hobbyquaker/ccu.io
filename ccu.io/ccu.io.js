/**
 *      CCU.IO version 0.3
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
    regaIndex = {};

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

var regahss = new rega({
    ccuIp: settings.ccuIp,
    methods: {
        event: function (type, id, value, timestamp) {
            switch (type) {
                case "SYSVAR":
                    io.sockets.emit("event", ["ReGaHss."+id+".Value", value]);
                    io.sockets.emit("event", ["ReGaHss."+id+".Timestamp", timestamp]);

                    break;
                case "PROGRAM":
                    io.sockets.emit("event", ["ReGaHss."+id+".Active", value]);
                    io.sockets.emit("event", ["ReGaHss."+id+".Timestamp", timestamp]);

                    break;
            }
        }
    }
});


function loadVariables() {
    regahss.runScriptFile("variables", function (data) {
        for (var id in data) {
            data[id].ObjType = "VARDP";

            datapoints[id] = [data[id].Value, data[id].Timestamp];

            regaObjects[id] = data[id];
            regaIndex[data[id].Name] = [id,"VARDP"];
        }
        loadPrograms();
    });

}

function loadPrograms() {
    regahss.runScriptFile("programs", function (data) {
        for (var id in data) {
            data[id].ObjType = "PROGRAM";

            datapoints[id] = [data[id].Value, data[id].Timestamp];


            regaObjects[id] = data[id];
            regaIndex[data[id].Name] = [id,"PROGRAM"];
        }
        loadRooms();
    });
}


function loadRooms() {
    regahss.runScriptFile("rooms", function (data) {
        for (var id in data) {
            data[id].ObjType = "ROOM";
            regaObjects[id] = data[id];
            regaIndex[data[id].Name] = [id,"ROOM"];
        }
        loadFunctions();
    });
}

function loadFunctions() {
    regahss.runScriptFile("functions", function (data) {
        for (var id in data) {
            data[id].ObjType = "FUNCTION";
            regaObjects[id] = data[id];
            regaIndex[data[id].Name] = [id,"FUNCTION"];
        }
        loadDevices();
    });
}

function loadDevices() {
    regahss.runScriptFile("devices", function (data) {
        for (var id in data) {
            data[id].ObjType = "DEVICE";
            regaObjects[id] = data[id];
            regaIndex[data[id].Name] = [id,"DEVICE"];
            regaIndex[data[id].Address] = [id,"DEVICE"];
        }
        loadChannels();
    });
}

function loadChannels() {
    regahss.runScriptFile("channels", function (data) {
        for (var id in data) {
            data[id].ObjType = "CHANNEL";
            regaObjects[id] = data[id];
            regaIndex[data[id].Name] = [id,"CHANNEL",data[id]["Parent"]];
            regaIndex[data[id].Address] = [id,"CHANNEL",data[id]["Parent"]];
        }
        loadDatapoints();
    });
}

function loadDatapoints() {
    regahss.runScriptFile("datapoints", function (data) {
        for (var id in data) {
            data[id].ObjType = "DP";

            datapoints[id] = [data[id].Value, data[id].Timestamp];

            regaObjects[id] = data[id];

            regaIndex[data[id].Name] = [id,"DP",data[id]["Parent"]];
            regaIndex[data[id].Address] = [id,"DP",data[id]["Parent"]];
        }
        console.log(regaObjects);
        console.log(regaIndex);
    });
}


function initRega() {
    loadVariables();

}

initRega();

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
