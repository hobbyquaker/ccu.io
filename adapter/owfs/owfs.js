/**
 *   CCU.IO OWFS Adapter - owfs.js
 *
 *   Initial Version : 05. Mar 2014
 *   Current Version : 0.3.0 [17.07.2014]
 *   
 *   Change Notes:
 *   - Initial Version 0.2.1 
 *   - Version 0.3.0 (Bluefox) Support of multiple IPs and up to 50 sensors per server
 *   - Version 0.3.1 (Bluefox) Possible write and use new adapter packet
 *
 *   Authors: 
 *   Ralf Muenk [muenk@getcom.de]
 *   (c) getcom IT Services
 *   Eisbaeeer  [Eisbaeeer@gmail.com]
 *   Bluefox (dogafox@gmail.com)
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
var adapter    = require(__dirname + '/../../utils/adapter-init.js').Adapter("owfs");
var owfsClient = require('owfs').Client;

// Fix old settings
if (adapter.settings.wire && adapter.settings.IPs._1) {
	adapter.settings.IPs._1.wire = adapter.settings.wire;
}

adapter.onEvent = function (id, val, ts, ack){
    if (ack)
        return;

    // process event here
    if (id >= adapter.firstId && id <= adapter.firstId + 1000) {
        // First find which IP
        var ipID   = Math.floor((id - adapter.firstId - 1) / 50) + 1;
        var wireID = id - ((ipID - 1) * 50 + adapter.firstId + 1);

        if (adapter.settings.IPs["_" + ipID] && adapter.settings.IPs["_" + ipID].wire["_" + wireID]){
            // Control some wire
            writeWire(ipID, wireID, val);
        }
    }
}

var id          = 1;
var rootId      = adapter.firstId;
var channelsIDs = [];

function writeWire(ipID, wireID, value) {
    if (adapter.settings && adapter.settings.IPs["_" + ipID].wire["_" + ipID] && adapter.settings.IPs["_" + ipID].con) {
        adapter.settings.IPs["_" + ipID].con.write(
            "/" + adapter.settings.IPs["_" + ipID].wire["_" + wireID].id + "/" + (adapter.settings.IPs["_" + ipID].wire["_" + wireID].property || "temperature"),
            value,
            function(result) {
                //no idea what is received here
            }
        );
    }
}

function readWire(ipID, wireID) {
    if (adapter.settings && adapter.settings.IPs["_" + ipID].wire["_" + ipID] && adapter.settings.IPs["_" + ipID].con) {
        adapter.settings.IPs["_" + ipID].con.read("/" + adapter.settings.IPs["_" + ipID].wire["_" + wireID].id + "/" + (adapter.settings.IPs["_" + ipID].wire["_" + wireID].property || "temperature"),
            function(result) {
                adapter.setState(adapter.settings.IPs["_" + ipID].channelId + wireID, result);
            }
        );
    }
}

function owfsServerGetValues (ipID){
	if (adapter.settings.IPs["_" + ipID]) {
		var id = 1;
		while (adapter.settings.IPs["_" + ipID].wire["_" + id]) {
			readWire(ipID, id);
			id++;
		}
	}
}

function createPointsForServer(ipID) {
	// Create Datapoints in CCU.IO
	var id = 1;
	var channelId = rootId + (ipID - 1) * 50 + 1;
	adapter.settings.IPs["_" + ipID].channelId = channelId;
	adapter.settings.IPs["_" + ipID].sensorDPs = {};
    if (typeof owfsClient != "undefined") {
        adapter.settings.IPs["_" + ipID].con   = new owfsClient(adapter.settings.IPs["_" + ipID].ip, adapter.settings.IPs["_" + ipID].port);
    }

	while (adapter.settings.IPs["_" + ipID].wire && adapter.settings.IPs["_" + ipID].wire.hasOwnProperty("_" + id)) {
		adapter.settings.IPs["_" + ipID].sensorDPs["Sensor" + id] = channelId + id;
		adapter.setObject(channelId + id, {
			"Name":       "OWFS." + adapter.settings.IPs["_" + ipID].alias + ".SENSORS." + adapter.settings.IPs["_" + ipID].wire["_" + id].alias,
			"TypeName":   "HSSDP",
			"Operations": 5,
			"ValueType":  4,
			"ValueUnit":  "°C",
			"Parent":     channelId,
			_persistent:  true
		});    
		id++;
	};

    adapter.setObject(channelId, {
		Name:        "OWFS." + adapter.settings.IPs["_" + ipID].alias + ".SENSORS",
		TypeName:    "CHANNEL",
		Address:     "OWFS." + adapter.settings.IPs["_" + ipID].alias + ".SENSORS",
		HssType:     "1WIRE-SENSORS",
		DPs:         adapter.settings.IPs["_" + ipID].sensorDPs,
		Parent:      rootId
	});

	// Request first time
	owfsServerGetValues(ipID);
	
	// Interval to read values from owfs-server
	setInterval(owfsServerGetValues, adapter.settings.IPs["_" + ipID].interval || adapter.settings.owserverInterval || 30000, ipID);
	channelsIDs.push(channelId);
}

var id = 1;
while (adapter.settings.IPs["_" + id]) {
	createPointsForServer(id);
	id++;
}

adapter.setObject(rootId, {
	Name:        "OWFS",
	TypeName:    "DEVICE",
	HssType:     "1WIRE",
	Address:     "OWFS",
	Interface:   "CCU.IO",
	Channels:    channelsIDs
});

adapter.logger.info("adapter owfs created datapoints. Starting at: " + rootId);
  
//set var for displaying in datastore (Bluefox: But why??)
//socket.emit("setState", [rootId,    null, null, true]);
//socket.emit("setState", [channelId, null, null, true]);

