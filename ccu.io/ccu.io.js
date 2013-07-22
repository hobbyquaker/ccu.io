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
        cacheMeta: false

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


var regadata = {
    variables: {},
    programs: {},
    rooms: {},
    functions: {},
    devices: {},
    strtable: {},
    reference: {}
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

var regahss = new rega({
    ccuIp: settings.ccuIp
});


io.sockets.on('connection', function (socket) {
    //socketlist.push(socket);

    logger.info("socket.io <-- "  + " connected");
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
