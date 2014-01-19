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
	querystring	= require('querystring'),
	xml2js		= require("xml2js");

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

function debugLog(message) {
	if (dreamSettings.debugEnabled) {
		logger.info(message);
	}
}

socket.on('event', function (obj) {
	if (!obj || !obj[0]) {
		return;
	}
	
	var dpId = obj[0];			// ID des geänderten Objektes
	var dpVal = obj[1];			// Wert des geänderten Objektes
	var dpTs = obj[2];			// Timestamp der letzten Änderung
	var dpAck = obj[3];			// ACKnowledge der letzten Änderung
	
	// get command datapoints for single boxes, because they need to be watched for changes
	for (var id_ in dreamSettings.boxes) {
		var id = parseInt(id_.substring(1));
		var boxId = (dreamSettings.firstId) + (id * 10);
		if (dpId == boxId && dpVal != "") {
			debugLog("adapter dream event: "+dpId+" "+dpVal+" "+dpTs+" "+dpAck+" "+obj);
			var valString = dpVal.toString();
			var args = valString.split(":");
			if (args.length == 2) {
				executeCommand(args[0], args[1], id_);
			} else if (args.length == 1) {
				executeCommand(args[0], "", id_);
			} else {
				logger.warn("adapter dream expects a command having syntax COMMAND:VALUE");
			}
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
    datapoints[id] = [obj.Value];
    socket.emit("setObject", id, obj);
}

function setState(id, val) {
	datapoints[id] = [val];
	debugLog("DREAM - setState for ID "+id+" to value '"+val+"'");
	socket.emit("setState", [id,val,null,true]);
}

function DreamInit() {
	var i = 0;
	
	for (var id_ in dreamSettings.boxes) {
		var id = parseInt (id_.substring(1));
		var boxId = (dreamSettings.firstId) + (id * 10);
		var boxName = (dreamSettings.boxes[id_]['name']) ? dreamSettings.boxes[id_]['name'] : dreamSettings.boxes[id_].ip;
		var boxNameUpper = boxName.toUpperCase();
		setObject(boxId, {
				Name: "DREAM."+boxNameUpper+".COMMAND",
				TypeName: "VARDP",
				Value : ""
			});
			
			setObject(boxId + 1, {
				Name: "DREAM."+boxNameUpper+".STANDBY",
				TypeName: "VARDP",
				Value : false
			});
			
			setObject(boxId + 2, {
				Name: "DREAM."+boxNameUpper+".VOLUME",
				TypeName: "VARDP",
				Value : "0"
			});
			
			setObject(boxId + 3, {
				Name: "DREAM."+boxNameUpper+".MUTED",
				TypeName: "VARDP",
				Value : false
			});
			
			setObject(boxId + 4, {
				Name: "DREAM."+boxNameUpper+".CHANNEL",
				TypeName: "VARDP",
				Value : ""
			});
			
			setObject(boxId + 5, {
				Name: "DREAM."+boxNameUpper+".HDD.CAPACITY",
				TypeName: "VARDP",
				Value : ""
			});
			
			setObject(boxId + 6, {
				Name: "DREAM."+boxNameUpper+".HDD.FREE",
				TypeName: "VARDP",
				Value : ""
			});
	}
	
	logger.info("adapter dream objects inserted, starting at: "+dreamSettings.firstId);
	
	if (dreamSettings.pollingEnabled) {
		// Fix polling interval if too short
		if (dreamSettings.pollingInterval <= 5000 * (i + 1)) {
			dreamSettings.pollingInterval = 5000 * (i + 1);
		}
		
		logger.info("adapter dream polling enabled - interval " + dreamSettings.pollingInterval + " ms");
		
		setInterval(checkStatus, dreamSettings.pollingInterval);
		checkStatus();
	} else {
		logger.info("adapter dream polling has been disabled by configuration");
	}
}

function getResponse (command, deviceId, path, callback){
	debugLog("getResponse - command: "+command+", deviceId: "+deviceId+", path: "+path);
	var device = dreamSettings.boxes[deviceId];
	var options = {
		host: device.ip,
		port: device.port,
		path: path,
		method: 'GET'
	};
	
	if (typeof device.username != 'undefined' && typeof device.password != 'undefined') {
		if (device.username.length > 0 && device.password.length > 0) {
			options.headers = {
				'Authorization': 'Basic ' + new Buffer(device.username + ':' + device.password).toString('base64')
			}
			//logger.info("DREAM - Used user '"+device.username+"' with password '"+device.password+"' for request");
		}
	}

	debugLog("getResponse - host: "+options.host+", port: "+options.port);
	var req = http.get(options, function(res) {
		var pageData = "";
		res.setEncoding('utf8');
		res.on('data', function (chunk) {
			pageData += chunk;
		});
		res.on('end', function () {
	  		//logger.info("Trying to parse: "+pageData);
			var parser = new xml2js.Parser();
			parser.parseString(pageData, function (err, result) {
				if (callback) {
					callback (command, deviceId, result);
				}
			});
		});
	});
	req.on('error', function(e) {
		logger.warn("adapter dream received error: "+e.message);
	});

}

function parseBool(string){
	var cleanedString = string[0].replace(/(\t\n|\n|\t)/gm,"");
	switch(cleanedString.toLowerCase()){
		case "true": case "yes": case "1": return true;
		default: return false;
	}
}

function evaluateCommandResponse (command, deviceId, xml) {
	debugLog("evaluateCommandResponse - command: "+command+", received XML: "+JSON.stringify(xml));
	
	var id = parseInt(deviceId.substring(1));
	var boxId = (dreamSettings.firstId) + (id * 10);
	
	switch (command.toUpperCase())
	{
		case "MESSAGE":
		case "RESTART":
		case "REBOOT":
		case "DEEPSTANDBY":
			setState(boxId, "");
			break;
		case "MUTE":
		case "UNMUTE":
		case "TOOGLEMUTE":
		case "VOLUME":
			setState(boxId + 2, parseInt(xml.e2volume.e2current[0]));	// 20
			setState(boxId + 3, parseBool(xml.e2volume.e2ismuted));		// True|False
			setState(boxId, "");
			break;
		case "WAKEUP":
		case "STANDBY":
		case "TOOGLESTANDBY":
			setState(boxId + 1, parseBool(xml.e2powerstate.e2instandby));		// true|false
			setState(boxId, "");
			break;
		case "GETSTANDBY":
			setState(boxId + 1, parseBool(xml.e2powerstate.e2instandby));		// true|false
			break;
		case "GETVOLUME":
			setState(boxId + 2, parseInt(xml.e2volume.e2current[0]));	// 20
			setState(boxId + 3, parseBool(xml.e2volume.e2ismuted));		// True|False
			break;
		case "GETINFO":
			setState(boxId + 4, xml.e2abouts.e2about[0].e2servicename[0]);				// RTL Television
			setState(boxId + 5, xml.e2abouts.e2about[0].e2hddinfo[0].capacity[0]);		// 500.107 GB
			setState(boxId + 6, xml.e2abouts.e2about[0].e2hddinfo[0].free[0]);			// 100.273 GB
			break;
		default:
			logger.warn("adapter dream received unknown command '"+command+"' @ evaluateCommandResponse");
	}
}

function executeCommand(command, value, deviceId) {
	logger.info("executeCommand - command: "+command+", value: "+value+", deviceId: "+deviceId);
	var id = parseInt(deviceId.substring(1));
	var boxId = (dreamSettings.firstId) + (id * 10);
	
	switch(command.toUpperCase())
	{
		case "MESSAGE":
			var msgTimeout = parseInt(dreamSettings.messageTimeout);
			var msgType = parseInt(dreamSettings.messageType);
			getResponse (command, deviceId, "/web/message?text="+querystring.escape(value)+"&type="+msgType+"&timeout="+msgTimeout, evaluateCommandResponse);
			break;
		case "MUTE":
			if (datapoints[boxId + 3] == "false") {
				getResponse (command, deviceId, "/web/vol?set=mute", evaluateCommandResponse);
			} else {
				setState(boxId, "");
			}
			break;
		case "UNMUTE":
			if (datapoints[boxId + 3] == "true") {
				getResponse (command, deviceId, "/web/vol?set=mute", evaluateCommandResponse);
			} else {
				setState(boxId, "");
			}
			break;
		case "TOOGLEMUTE":
			getResponse (command, deviceId, "/web/vol?set=mute", evaluateCommandResponse);
			break;
		case "VOLUME":
			var volume = parseInt(value);
			if (volume > 0 && volume < 101) {
				getResponse (command, deviceId, "/web/vol?set=set" + volume, evaluateCommandResponse);
			}
			break;
		case "TOOGLESTANDBY":
			getResponse (command, deviceId, "/web/powerstate?newstate=0", evaluateCommandResponse);
			break;
		case "DEEPSTANDBY":
			getResponse (command, deviceId, "/web/powerstate?newstate=1", evaluateCommandResponse);
			break;
		case "REBOOT":
			getResponse (command, deviceId, "/web/powerstate?newstate=2", evaluateCommandResponse);
			break;
		case "RESTART":
			getResponse (command, deviceId, "/web/powerstate?newstate=3", evaluateCommandResponse);
			break;
		case "WAKEUP":
			getResponse (command, deviceId, "/web/powerstate?newstate=4", evaluateCommandResponse);
			break;
		case "STANDBY":
			getResponse (command, deviceId, "/web/powerstate?newstate=5", evaluateCommandResponse);
			break;
		default:
			logger.warn("adapter dream received unknown command '"+command+"' @ executeCommand");
	}
}

function checkStatus() {
	for (var id_ in dreamSettings.boxes) {
		var id = parseInt(id_.substring(1));
		var boxId = (dreamSettings.firstId) + (id * 10);
		var boxName = "DREAM."+(dreamSettings.boxes[id_]['name']) ? dreamSettings.boxes[id_]['name'] : dreamSettings.boxes[id_].ip;

		ping.sys.probe(dreamSettings.boxes[id_]['ip'], function (isAlive) {
			if (isAlive) {
				getResponse ("GETSTANDBY", id_, "/web/powerstate", evaluateCommandResponse);
				getResponse ("GETINFO", id_, "/web/about", evaluateCommandResponse);
				getResponse ("GETVOLUME", id_, "/web/vol", evaluateCommandResponse);
			}
		});
	}
}

DreamInit ();