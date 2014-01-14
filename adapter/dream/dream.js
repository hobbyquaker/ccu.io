/**
 *      CCU.IO Dreambox Adapter
 *      01'2014 BasGo
 *      mail: basgo@gmx.de 
 *
 *      Version 0.1
 *
 *      Possible commands:
 *      MESSAGE:Messagetext
 *      REBOOT
 *      RESTART
 *      STANDBY
 *      WAKEUP
 *      MUTE
 *      VOLUME:1-100
 */
var settings = require(__dirname + '/../../settings.js');

if (!settings.adapters.dream || !settings.adapters.dream.enabled) {
    process.exit();
}

var dreamSettings = settings.adapters.dream.settings;

var logger		= require(__dirname + '/../../logger.js'),
	io			= require('socket.io-client'),
	request		= require('request'),
	net			= require('net'),
	ping		= require("ping"),
	http		= require('http'),
	querystring	= require('querystring');

var boxUrl = "http://"+dreamSettings.ip+"/web";	

var objects = {},
	datapoints = {};

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
	logger.info("adapter dream connected to ccu.io");
});

socket.on('disconnect', function () {
	logger.info("adapter dream disconnected from ccu.io");
});

socket.on('event', function (obj) {
	if (!obj || !obj[0]) {
		return;
	}
	
	var id = obj[0];			// ID des geänderten Objektes
	var val = obj[1];			// Wert des geänderten Objektes
	var ts = obj[2];			// Timestamp der letzten Änderung
	var ack = obj[3];			// ACKnowledge der letzten Änderung
	
	if (obj[0] == dreamSettings.firstId + 1 && val != "") {
		logger.info("adapter dream event: "+id+" "+val+" "+ts+" "+ack+" "+obj);
		var valString = val.toString();
		var args = valString.split(":");
		if (args.length == 2) {
			executeCommand(args[0], args[1]);
		} else if (args.length == 1) {
			executeCommand(args[0], "");
		} else {
			logger.info("adapter dream expects a command having syntax COMMAND:VALUE");
		}
	}
});

function stop() {
	logger.info("adapter dream terminating");
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

function DreamInit() {
	var i = 0;
	setObject(dreamSettings.firstId, {
		Name: "DREAM.STATUS",
		TypeName: "VARDP",
		Value : ""
	});
	
	setObject(dreamSettings.firstId + 1, {
		Name: "DREAM.COMMAND",
		TypeName: "VARDP",
		Value : ""
	});
	
	logger.info("adapter dream objects inserted, starting at: "+dreamSettings.firstId);
	
	// Fix polling interval if too short
	if (dreamSettings.pollingInterval <= 5000 * (i + 1)) {
		dreamSettings.pollingInterval = 5000 * (i + 1);
	}

	logger.info("adapter dream polling enabled - interval " + dreamSettings.pollingInterval + "ms");

	setInterval(checkStatus, dreamSettings.pollingInterval);
	checkStatus();
}

function sendCommand(path, expected) {
	var commandUrl = boxUrl + path;
	request(commandUrl,
		function (error, response, body) {
			if (body && body.indexOf(expected) != -1){
				logger.info("adapter dream successfully requested URL '"+commandUrl+"'");
				setState(dreamSettings.firstId + 1, "");
			} else {
				logger.info("adapter dream missed expected '"+expected+"' for URL '"+commandUrl+"'");
			}
		}
	);
}

function executeCommand(command, value) {
	switch(command)
	{
		case "MESSAGE":
			var msgTimeout = parseInt(dreamSettings.messageTimeout);
			sendCommand("/message?text="+querystring.escape(value)+"&type=1&timeout="+msgTimeout , "<e2state>True</e2state>");
			break;
		case "MUTE":
			sendCommand("/vol?set=mute", "<e2result>True</e2result>");
			break;
		case "VOLUME":
			var volume = parseInt(value);
			if (volume > 0 && volume < 101) {
				sendCommand("/vol?set=set" + volume, "<e2result>True</e2result>");
			}
			break;
		case "REBOOT":
			sendCommand("/powerstate?newstate=2", "<e2result>True</e2result>");
			break;
		case "RESTART":
			sendCommand("/powerstate?newstate=3", "<e2result>True</e2result>");
			break;
		case "WAKEUP":
			sendCommand("/powerstate?newstate=4", "<e2result>True</e2result>");
			break;
		case "STANDBY":
			sendCommand("/powerstate?newstate=5", "<e2result>True</e2result>");
			break;
		default:
			logger.warn("adapter dream received unknown command '"+command+"'");
	}
}

function checkStatus() {
	var powerstateUrl = boxUrl + "/powerstate";
	//logger.info("adapter dream sends a ping to IP "+dreamSettings.ip);
	
	ping.sys.probe(dreamSettings.ip, function (isAlive) {
		if (!isAlive) {
			//logger.info("adapter dream box with IP "+dreamSettings.ip+" is UNREACHABLE");
		} else {
			request({uri: powerstateUrl, timeout: 4000}, function (error, response, body) {
					if (body && body.indexOf("<e2instandby>true</e2instandby>") != -1){
						setState(dreamSettings.firstId, "STANDBY");
					} else {
						setState(dreamSettings.firstId, "RUNNING");
					}
				});
		}
	});
	//setTimeout(checkDream, 5000, curIP);
}

DreamInit ();