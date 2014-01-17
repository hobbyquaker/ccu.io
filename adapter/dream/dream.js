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

socket.on('event', function (obj) {
	if (!obj || !obj[0]) {
		return;
	}
	
	var id = obj[0];			// ID des geänderten Objektes
	var val = obj[1];			// Wert des geänderten Objektes
	var ts = obj[2];			// Timestamp der letzten Änderung
	var ack = obj[3];			// ACKnowledge der letzten Änderung
	
	if (obj[0] == dreamSettings.firstId && val != "") {
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
	//logger.info("DREAM setState for ID "+id+" to value '"+val+"'");
	socket.emit("setState", [id,val,null,true]);
}

function DreamInit() {
	var i = 0;
	setObject(dreamSettings.firstId, {
		Name: "DREAM.COMMAND",
		TypeName: "VARDP",
		Value : ""
	});
	
	setObject(dreamSettings.firstId + 1, {
		Name: "DREAM.STANDBY",
		TypeName: "VARDP",
		Value : ""
	});
	
	setObject(dreamSettings.firstId + 2, {
		Name: "DREAM.VOLUME",
		TypeName: "VARDP",
		Value : "0"
	});
	
	setObject(dreamSettings.firstId + 3, {
		Name: "DREAM.MUTED",
		TypeName: "VARDP",
		Value : false
	});
	
	setObject(dreamSettings.firstId + 4, {
		Name: "DREAM.CHANNEL",
		TypeName: "VARDP",
		Value : ""
	});
	
	setObject(dreamSettings.firstId + 5, {
		Name: "DREAM.HDD.CAPACITY",
		TypeName: "VARDP",
		Value : ""
	});
	
	setObject(dreamSettings.firstId + 6, {
		Name: "DREAM.HDD.FREE",
		TypeName: "VARDP",
		Value : ""
	});
	
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

function getResponse (command, path, callback){
	var options = {
		host: dreamSettings.ip,
		port: 80,
		path: path,
		method: 'GET'
	};

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
					callback (command, result);
				}
			});
		});
	});
	req.on('error', function(e) {
		logger.warn("adapter dream received error: "+e.message);
	});

}

function parseBool(string){
	var cleanedString = string[0].replace(/(\r\n|\n|\r)/gm,"");
	switch(cleanedString.toLowerCase()){
		case "true": case "yes": case "1": return true;
		default: return false;
	}
}

function evaluateCommandResponse (command, xml) {
	//logger.info("evaluateCommandResponse - command: "+command+", received XML: "+JSON.stringify(xml));
	switch (command.toUpperCase())
	{
		case "MESSAGE":
		case "RESTART":
		case "REBOOT":
		case "DEEPSTANDBY":
			setState(dreamSettings.firstId, "");
			break;
		case "MUTE":
		case "UNMUTE":
		case "TOOGLEMUTE":
		case "VOLUME":
			setState(dreamSettings.firstId + 2, parseInt(xml.e2volume.e2current[0]));	// 20
			setState(dreamSettings.firstId + 3, parseBool(xml.e2volume.e2ismuted));		// True|False
			setState(dreamSettings.firstId, "");
			break;
		case "WAKEUP":
		case "STANDBY":
		case "TOOGLESTANDBY":
			setState(dreamSettings.firstId + 1, parseBool(xml.e2powerstate.e2instandby));		// true|false
			setState(dreamSettings.firstId, "");
			break;
		case "GETSTANDBY":
			setState(dreamSettings.firstId + 1, parseBool(xml.e2powerstate.e2instandby));		// true|false
			break;
		case "GETVOLUME":
			setState(dreamSettings.firstId + 2, parseInt(xml.e2volume.e2current[0]));	// 20
			setState(dreamSettings.firstId + 3, parseBool(xml.e2volume.e2ismuted));		// True|False
			break;
		case "GETINFO":
			setState(dreamSettings.firstId + 4, xml.e2abouts.e2about[0].e2servicename[0]);				// RTL Television
			setState(dreamSettings.firstId + 5, xml.e2abouts.e2about[0].e2hddinfo[0].capacity[0]);		// 500.107 GB
			setState(dreamSettings.firstId + 6, xml.e2abouts.e2about[0].e2hddinfo[0].free[0]);			// 100.273 GB
			break;
		default:
			logger.warn("adapter dream received unknown command '"+command+"' @ evaluateCommandResponse");
	}
}

function executeCommand(command, value) {
	switch(command.toUpperCase())
	{
		case "MESSAGE":
			var msgTimeout = parseInt(dreamSettings.messageTimeout);
			var msgType = parseInt(dreamSettings.messageType);
			getResponse (command, "/web/message?text="+querystring.escape(value)+"&type="+msgType+"&timeout="+msgTimeout, evaluateCommandResponse);
			break;
		case "MUTE":
			if (datapoints[dreamSettings.firstId + 3] == "false") {
				getResponse (command, "/web/vol?set=mute", evaluateCommandResponse);
			} else {
				setState(dreamSettings.firstId, "");
			}
			break;
		case "UNMUTE":
			if (datapoints[dreamSettings.firstId + 3] == "true") {
				getResponse (command, "/web/vol?set=mute", evaluateCommandResponse);
			} else {
				setState(dreamSettings.firstId, "");
			}
			break;
		case "TOOGLEMUTE":
			getResponse (command, "/web/vol?set=mute", evaluateCommandResponse);
			break;
		case "VOLUME":
			var volume = parseInt(value);
			if (volume > 0 && volume < 101) {
				getResponse (command, "/web/vol?set=set" + volume, evaluateCommandResponse);
			}
			break;
		case "TOOGLESTANDBY":
			getResponse (command, "/web/powerstate?newstate=0", evaluateCommandResponse);
			break;
		case "DEEPSTANDBY":
			getResponse (command, "/web/powerstate?newstate=1", evaluateCommandResponse);
			break;
		case "REBOOT":
			getResponse (command, "/web/powerstate?newstate=2", evaluateCommandResponse);
			break;
		case "RESTART":
			getResponse (command, "/web/powerstate?newstate=3", evaluateCommandResponse);
			break;
		case "WAKEUP":
			getResponse (command, "/web/powerstate?newstate=4", evaluateCommandResponse);
			break;
		case "STANDBY":
			getResponse (command, "/web/powerstate?newstate=5", evaluateCommandResponse);
			break;
		default:
			logger.warn("adapter dream received unknown command '"+command+"' @ executeCommand");
	}
}

function checkStatus() {
	ping.sys.probe(dreamSettings.ip, function (isAlive) {
		if (isAlive) {
			getResponse ("GETSTANDBY", "/web/powerstate", evaluateCommandResponse);
			getResponse ("GETINFO", "/web/about", evaluateCommandResponse);
			getResponse ("GETVOLUME", "/web/vol", evaluateCommandResponse);
		}
	});
}

DreamInit ();