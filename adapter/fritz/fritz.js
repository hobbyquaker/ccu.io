/**
 *      CCU.IO Fritzbox Adapter
 *      01'2014 BasGo
 *      mail: basgo@gmx.de 
 *
 *      Version 0.1
 *
 *      State of datapoint with first ID will be:
 *      FREE    -> if nobody is talking
 *      RING    -> if there's an incoming call
 *      TALKING -> if somebody is talking
 */
var settings = require(__dirname + '/../../settings.js');

if (!settings.adapters.fritz || !settings.adapters.fritz.enabled) {
    process.exit();
}

var fritzSettings = settings.adapters.fritz.settings;

var logger = require(__dirname + '/../../logger.js'),
	io     = require('socket.io-client'),
	net    = require('net');
	
	var socketFritz,
		objects = {},
	    datapoints = {},
		callStatus = {};

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

connectFritz();

function connectFritz() {
	logger.info("adapter fritz starting connect to:" + fritzSettings.IP + " " + fritzSettings.port);
	socketFritz = net.connect({port: fritzSettings.port, host: fritzSettings.IP},
		function() { 
			logger.info("adapter fritz connected to fritz: " + fritzSettings.IP);
	});
}

socketFritz.on('close', function () {
	logger.info("adapter fritz received 'close'");
});

socketFritz.on('end', function () {
	logger.info("adapter fritz received 'end'");
});

socketFritz.on('data', function (data) {
	var dataString = data.toString();
	var obj = dataString.split(";");
	
	var item = {
		time : obj[0],			// 01.01.14 12:34:56
		type : obj[1],			// CALL (outgoing), RING (incoming), CONNECT (start), DISCONNECT (end)
		connectionId : obj[2]	// identifier as integer
	};
	
	logger.info("adapter fritz received event (time: " + item.time + ", type: " + item.type + ", ID: " + item.connectionId + ")");
	
	callStatus[item.connectionId] = item.type;
	
	var newState = "FREE";
	
	for (var event in callStatus) {
		var status = callStatus[event];
		if (status == "RING") {
			newState = "RING";
			break;
		}
		if (status == "CONNECT" || status == "CALL") {
			newState = "TALKING";
			break;
		}
	}

	setState(fritzSettings.firstId, newState);

});

socketFritz.on('error', function (data) {
	logger.info("adapter fritz received 'error':"+data.toString());
	activityTimeout = setTimeout(function () {
		connectFritz();
	}, 10000);
});

socket.on('connect', function () {
	logger.info("adapter fritz connected to ccu.io");
});

socket.on('disconnect', function () {
	logger.info("adapter fritz disconnected from ccu.io");
});

socket.on('event', function (obj) {
	if (!obj || !obj[0]) {
		return;
	}
	
	var id = obj[0];			// ID des geänderten Objektes
	var val = obj[1];			// Wert des geänderten Objektes
	var ts = obj[2];			// Timestamp der letzten Änderung
	var ack = obj[3];			// ACKnowledge der letzten Änderung
	
	if (obj[0] == fritzSettings.firstId) {
		//logger.info("adapter fritz event: "+id+" "+val+" "+ts+" "+ack+" "+obj);
	}
});

function stop() {
	logger.info("adapter fritz terminating");
	socketFritz.end;
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
    objects[id] = obj;
    if (obj.Value) {
        datapoints[obj.Name] = [obj.Value];
    }
    socket.emit("setObject", id, obj);
}

function setState(id, val) {
	datapoints[id] = [val];
	socket.emit("setState", [id,val,null,true]);
}

function FritzInit() {
	
	setObject(fritzSettings.firstId, {
		Name: "FRITZ.STATUS",
		TypeName: "VARDP",
		Value : "FREE"
	});
	
	logger.info("adapter fritz objects inserted, starting at: "+fritzSettings.firstId);
}

FritzInit ();