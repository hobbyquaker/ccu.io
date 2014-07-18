/**
 *   CCU.IO OWFS Adapter - owfs.js
 *
 *   Initial Version : 05. Mar 2014
 *   Current Version : 0.3.0 [17.07.2014]
 *   
 *   Change Notes:
 *   - Initial Version 0.2.1 
 *   - Version 0.3.0 (Bluefox) Support of multiple IPs and up to 50 sensors per server
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

var logger     = require(__dirname + '/../../logger.js'),
    io         = require('socket.io-client'),
    // call node module 'owfs'
    owfsClient = require('owfs').Client;

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
	

// Fix old settings
if (adapterSettings.wire && adapterSettings.IPs._1) {
	adapterSettings.IPs._1.wire = adapterSettings.wire;
}
	
var id          = 1;
var rootId      = settings.adapters.owfs.firstId;
var channelsIDs = [];

function readWire(ipID, wireID) {
    if (adapterSettings && adapterSettings.IPs["_" + ipID].wire["_" + ipID] && adapterSettings.IPs["_" + ipID].con) {
        adapterSettings.IPs["_" + ipID].con.read("/" + adapterSettings.IPs["_" + ipID].wire["_" + wireID].id + "/" + (adapterSettings.IPs["_" + ipID].wire["_" + wireID].property || "temperature"),
            function(result) {
                socket.emit("setState", [adapterSettings.IPs["_" + ipID].channelId + wireID, result, null, true]);
            }
        );
    }
}

function owfsServerGetValues (ipID){
	if (adapterSettings.IPs["_" + ipID]) {
		var id = 1;
		while (adapterSettings.IPs["_" + ipID].wire["_" + id]) {
			readWire(ipID, id);
			id++;
		}
	}
}

function createPointsForServer(ipID) {
	// Create Datapoints in CCU.IO
	var id = 1;
	var channelId = rootId + (ipID - 1) * 50 + 1;
	adapterSettings.IPs["_" + ipID].channelId = channelId;
	adapterSettings.IPs["_" + ipID].sensorDPs = {};
	adapterSettings.IPs["_" + ipID].con       = new owfsClient(adapterSettings.IPs["_" + ipID].ip, adapterSettings.IPs["_" + ipID].port);

	while (adapterSettings.IPs["_" + ipID].wire && adapterSettings.IPs["_" + ipID].wire.hasOwnProperty("_" + id)) {
		adapterSettings.IPs["_" + ipID].sensorDPs["Sensor" + id] = channelId + id;
		socket.emit("setObject", channelId + id, {
			"Name":       "OWFS." + adapterSettings.IPs["_" + ipID].alias + ".SENSORS." + adapterSettings.IPs["_" + ipID].wire["_" + id].alias,
			"TypeName":   "HSSDP",
			"Operations": 5,
			"ValueType":  4,
			"ValueUnit":  "°C",
			"Parent":     channelId,
			_persistent:  true
		});    
		id++;
	};

	socket.emit("setObject", channelId, {
		Name:        "OWFS." + adapterSettings.IPs["_" + ipID].alias + ".SENSORS",
		TypeName:    "CHANNEL",
		Address:     "OWFS." + adapterSettings.IPs["_" + ipID].alias + ".SENSORS",
		HssType:     "1WIRE-SENSORS",
		DPs:         adapterSettings.IPs["_" + ipID].sensorDPs,
		Parent:      rootId
	});

	// Request first time
	owfsServerGetValues(ipID);
	
	// Interval to read values from owfs-server
	setInterval(owfsServerGetValues, adapterSettings.IPs["_" + ipID].interval || adapterSettings.owserverInterval || 30000, ipID);
	channelsIDs.push(channelId);
}

var id = 1;
while (adapterSettings.IPs["_" + id]) {
	createPointsForServer(id);
	id++;
}

socket.emit("setObject", rootId, {
	Name:        "OWFS",
	TypeName:    "DEVICE",
	HssType:     "1WIRE",
	Address:     "OWFS",
	Interface:   "CCU.IO",
	Channels:    channelsIDs
});

logger.info("adapter owfs created datapoints. Starting at: " + rootId);
  
//set var for displaying in datastore (Bluefox: But why??)
//socket.emit("setState", [rootId,    null, null, true]);
//socket.emit("setState", [channelId, null, null, true]);

