/**
 * MySQL Adapter for CCU.IO
 *
 * Copyright (c) 10'2013 hobbyquaker http://hobbyquaker.github.io
 *
 * Loggt Events in MySQL Tabelle
 *
 *
 */
var settings = require(__dirname+'/../../settings.js');

if (!settings.adapters.mysql || !settings.adapters.mysql.enabled) {
    process.exit();
}

var logger =    require(__dirname+'/../../logger.js'),
    io =        require('socket.io-client');

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

var regaObjects = {};

var mysql      = require('mysql');

var connection, connected;



socket.on('connect', function () {



    logger.info("adapter mysql connected to ccu.io");


});

socket.on('disconnect', function () {
    logger.info("adapter mysql disconnected from ccu.io");
});

socket.on('event', function (obj) {
    if (!obj || !obj[0]) { return; }
    if (connected) {
        var name = "";
        if (regaObjects[obj[0]]) {
            name = regaObjects[obj[0]].Name;
        }
        var sql = "INSERT INTO events(id, name, val, ack, timestamp, lastchange) VALUES('"+obj[0]+"', '"+name+"', '"+obj[1]+"', "+(obj[3]?"true":"false")+", '"+obj[2]+"', '"+obj[4]+"');";
        connection.query(sql, function(err) {
            if (err) {
                logger.error("adapter mysql INSERT "+err)
            }
        });
        //logger.info("adapter mysql "+sql);
    }

});

socket.emit('getObjects', function(objects) {
    regaObjects = objects;
    logger.info("adapter mysql fetched regaObjects from ccu.io");
    connection = mysql.createConnection({
        host     : settings.adapters.mysql.settings.host,
        user     : settings.adapters.mysql.settings.user,
        password : settings.adapters.mysql.settings.pass,
        database : settings.adapters.mysql.settings.db
    });

    connection.connect(function(err) {
        if (err) {
            logger.error("adapter mysql can't connect to mysql-server "+err);
        }
        logger.info("adapter mysql connected to mysql-server on "+settings.adapters.mysql.settings.host);
        connected = true;
    });

});

