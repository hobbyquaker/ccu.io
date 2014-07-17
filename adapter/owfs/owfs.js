/**
 *   CCU.IO OWFS Adapter - owfs.js
 *
 *   Initial Version : 05. Mar 2014
 *   Current Version : 0.1 Alpha 1
 *   
 *   Change Notes:
 *   - Initial Version 0.2.1 
 *
 *   Authors: 
 *   Ralf Muenk [muenk@getcom.de]
 *   (c) getcom IT Services
 *   Eisbaeeer  [Eisbaeeer@gmail.com]
 *     
 *
 *   This is a part of the iXmaster project started in 2014.
 *
 *   This program is free software; you can redistribute it and/or modify
 *   it under the terms of the GNU General Public License as published by
 *   the Free Software Foundation; either version 3 of the License, or
 *   (at your option) any later version.*   Licence: GNU General Public License.
 *   For more information visit http://www.gnu.org.
 *
**/

var settings = require(__dirname + '/../../settings.js');

if (!settings.adapters.owfs || !settings.adapters.owfs.enabled) {
    process.exit();
}

var adapterSettings = settings.adapters.owfs.settings;

var logger =    require(__dirname + '/../../logger.js'),
    io =        require('socket.io-client'),
    // call node module 'owfs'
    owfs =      require('owfs');
    
var Client = require("owfs").Client,
     host  = adapterSettings.IPs._1.ip,
     port  = adapterSettings.IPs._1.port;

var rootId    = settings.adapters.owfs.firstId;
var channelId = rootId + 1;
var sensorDPs = {};

var con = new Client(host, port);         

// create express HTTP server
//var app = require('express')() 
//  , server = require('http').createServer(app), // express HTTP server
//    port = process.env.PORT || '8888'; //use environment variable $PORT as port; if not set default is 8888
  
//server.listen(port);

// Further in your code to get your files passed to the browser...

//app.get('/', function (req, res) {
//    res.sendfile(__dirname + '/index.html');
//});
//app.get('/img/minus-5-32.png', function (req, res) {
//    res.sendfile(__dirname + '/img/minus-5-32.png');
//});
//app.get('/img/plus-5-32.png', function (req, res) {
//    res.sendfile(__dirname + '/img/plus-5-32.png');
//});
//app.get('/img/search-5-32.png', function (req, res) {
//    res.sendfile(__dirname + '/img/search-5-32.png');
//});
//app.get('/owfs-dirlisting.js', function (req, res) {
//    res.sendfile(__dirname + '/owfs-dirlisting.js');
//});
//end express HTTP server



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


socket.on('connect', function () {
    logger.info("adapter owfs connected to ccu.io");
});

socket.on('disconnect', function () {
    logger.info("adapter owfs disconnected from ccu.io");
});

socket.on('event', function (obj) {
    if (!obj || !obj[0]) {
        return;
    }
});

function stop() {
    logger.info("adapter owfs terminating");
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

function setObject(id, obj) {
    socket.emit("setObject", id, obj);
}

function readWire(_id) {
    if (adapterSettings && adapterSettings.wire.["_" + _id]) {
        con.read("/" + adapterSettings.wire.["_" + _id].id + "/" + (adapterSettings.wire.["_" + _id].property || "temperature"), 
            function(result) {
                socket.emit("setState", [channelId + _id, result, null, true]);
            }
        );
    }
}

function owfsServerGetValues (){
    var id = 1;
    while (adapterSettings.wire["_" + id]) {
        readWire(id);
        id++;
    }
}

// Create Datapoints in CCU.IO
var id = 1;

while (adapterSettings.wire && adapterSettings.wire["_" + id]) {

    sensorDPs["Sensor" + id] = channelId + id;
    
    socket.emit("setObject", sensorDPs["Sensor" + id], {
        "Name":       adapterSettings.IPs.["_" + id].alias + ".SENSORS." + adapterSettings.wire.["_" + id].alias,
        "TypeName":   "HSSDP",
        "Operations": 5,
        "ValueType":  4,
        "ValueUnit":  "°C",
        "Parent":     channelId,
        _persistent:  true
    });    
    id++;
};

socket.emit("setObject", rootId, {
    Name:        adapterSettings.IPs._1.alias,
    TypeName:    "DEVICE",
    HssType:     "1WIRE",
    Address:     adapterSettings.IPs._1.alias,
    Interface:   "CCU.IO",
    Channels:    [channelId],
    _persistent: true
});

socket.emit("setObject", channelId, {
    Name:        adapterSettings.IPs._1.alias + ".SENSORS",
    TypeName:    "CHANNEL",
    Address:     adapterSettings.IPs._1.alias + ".SENSORS",
    HssType:     "1WIRE-SENSORS",
    DPs:         sensorDPs,
    Parent:      rootId,
    _persistent: true
});


logger.info("adapter owfs created datapoints. Starting at: " + rootId);
  
// Interval to read values from owfs-server
setInterval(owfsServerGetValues, adapterSettings.owserverInterval || 30000);

//set var for displaying in datastore (Bluefox: But why??)
socket.emit("setState", [rootId,    null,null,true]);
socket.emit("setState", [channelId, null,null,true]);

