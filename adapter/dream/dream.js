/**
 *      CCU.IO Dreambox Adapter
 *      01'2014 BasGo
 *      mail: basgo@gmx.de
 *
 *      Version 0.8
 *
 *      development at https://github.com/BasGo/ccu.io/tree/master/adapter/dream
 *
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

function logDebug(message) {
    if (dreamSettings.debugEnabled) {
        logger.info("adapter dream " + message);
    }
}

function logInfo(message) {
    logger.info("adapter dream " + message);
}

function logWarning(message) {
    logger.warn("adapter dream " + message);
}

socket.on('connect', function () {
    logInfo("connected to ccu.io");
});

socket.on('disconnect', function () {
    logInfo("disconnected from ccu.io");
});

socket.on('event', function (obj) {
    if (!obj || !obj[0]) {
        return;
    }

    var dpId = obj[0];			// ID des geÃ¤nderten Objektes
    var dpVal = obj[1];			// Wert des geÃ¤nderten Objektes
    var dpTs = obj[2];			// Timestamp der letzten Ã„nderung
    var dpAck = obj[3];			// ACKnowledge der letzten Ã„nderung

    // get command datapoints for single boxes, because they need to be watched for changes
    for (var id_ in dreamSettings.boxes) {
        var id = parseInt(id_.substring(1));
        var boxId = (dreamSettings.firstId) + (id * 10);
        if (dpId == boxId && dpVal != "") {
            logDebug("received event: "+dpId+" "+dpVal+" "+dpTs+" "+dpAck+" "+obj);
            var valString = dpVal.toString();
            var args = valString.split(":");
            if (args.length == 2) {
                executeCommand(args[0], args[1], id_);
            } else if (args.length == 1) {
                executeCommand(args[0], "", id_);
            } else {
                logWarning("expects a command having syntax COMMAND:VALUE");
            }
        }
    }
});

function stop() {
    logInfo("terminating");
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
    logDebug("sets object with ID "+id+" and name "+obj.Name+" to value '"+obj.Value+"'");
    socket.emit("setObject", id, obj);
}

function setState(id, val) {
    datapoints[id] = [val];
    logDebug("sets state for ID "+id+" to value '"+val+"'");
    socket.emit("setState", [id,val,null,true]);
}

function DreamInit() {
    var i = 0;

    for (var id_ in dreamSettings.boxes) {
        logDebug("initializes box with deviceId "+id_);
        var id = parseInt (id_.substring(1));
        var boxId = (dreamSettings.firstId) + (id * 10);
        var boxName = (dreamSettings.boxes[id_]['name']) ? dreamSettings.boxes[id_]['name'] : dreamSettings.boxes[id_].ip.replace(/\./g,"_");
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

    logDebug("objects inserted, starting at: "+dreamSettings.firstId);

    if (dreamSettings.pollingEnabled) {
        // Fix polling interval if too short
        if (dreamSettings.pollingInterval <= 5000 * (i + 1)) {
            dreamSettings.pollingInterval = 5000 * (i + 1);
        }

        logInfo("polling enabled - interval " + dreamSettings.pollingInterval + " ms");

        setInterval(checkStatus, dreamSettings.pollingInterval);
        checkStatus();
    } else {
        logInfo("polling has been disabled by configuration");
    }
}

function getResponse (command, deviceId, path, callback){
    var device = dreamSettings.boxes[deviceId];
    var options = {
        host: device.ip,
        port: device.port,
        path: path,
        method: 'GET'
    };

    logDebug("creating request for command '"+command+"' (deviceId: "+deviceId+", host: "+options.host+", port: "+options.port+", path: '"+options.path+"')");

    if (typeof device.username != 'undefined' && typeof device.password != 'undefined') {
        if (device.username.length > 0 && device.password.length > 0) {
            options.headers = {
                'Authorization': 'Basic ' + new Buffer(device.username + ':' + device.password).toString('base64')
            }
            logDebug("using authorization with user '"+device.username+"'");
        } else {
            logDebug("using no authorization");
        }
    }


    var req = http.get(options, function(res) {
        var pageData = "";
        res.setEncoding('utf8');
        res.on('data', function (chunk) {
            pageData += chunk;
        });
        res.on('end', function () {
            var parser = new xml2js.Parser();
            parser.parseString(pageData, function (err, result) {
                if (callback) {
                    callback (command, deviceId, result);
                }
            });
        });
    });
    req.on('error', function(e) {
        logWarning("received error: "+e.message);
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
    logDebug("evaluating response for command '"+command+"': "+JSON.stringify(xml));

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
        case "MUTE_TOGGLE":
        case "VOLUME":
            setState(boxId + 2, parseInt(xml.e2volume.e2current[0]));	// 20
            setState(boxId + 3, parseBool(xml.e2volume.e2ismuted));		// True|False
            setState(boxId, "");
            break;
        case "WAKEUP":
        case "STANDBY":
        case "OFF":
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
        case "KEY":
        case "VOLUME_UP":
        case "VOLUME_DOWN":
        case "LEFT":
        case "RIGHT":
        case "UP":
        case "DOWN":
        case "EXIT":
        case "CH_UP":
        case "CH_DOWN":
        case "SELECT":
        case "OK":
        case "BOUQUET_UP":
        case "BOUQUET_DOWN":
        case "INFO":
        case "MENU":
            setState(boxId, "");
        default:
            logWarning("received unknown command '"+command+"' @ evaluateCommandResponse");
    }
}

function executeCommand(command, value, deviceId) {
    logDebug("executing command '"+command+"' with value '"+value+"' for device '"+deviceId+"'");
    var id = parseInt(deviceId.substring(1));
    var boxId = (dreamSettings.firstId) + (id * 10);

    switch(command.toUpperCase())
    {
        case "MESSAGE":
            var msgTimeout = parseInt(dreamSettings.messageTimeout);
            var msgType = parseInt(dreamSettings.messageType);
            getResponse (command, deviceId, "/web/message?text="+querystring.escape(value)+"&type="+msgType+"&timeout="+msgTimeout, evaluateCommandResponse);
            break;
        case "KEY":
            getResponse (command, deviceId, "/web/remotecontrol?command="+querystring.escape(value), evaluateCommandResponse);
            break;
        case "VOLUME_UP":
            getResponse (command, deviceId, "/web/remotecontrol?command=115", evaluateCommandResponse);
            break;
        case "VOLUME_DOWN":
            getResponse (command, deviceId, "/web/remotecontrol?command=114", evaluateCommandResponse);
            break;
        case "BOUQUET_UP":
            getResponse (command, deviceId, "/web/remotecontrol?command=402", evaluateCommandResponse);
            break;
        case "BOUQUET_DOWN":
            getResponse (command, deviceId, "/web/remotecontrol?command=403", evaluateCommandResponse);
            break;
        case "LEFT":
        case "CH_DOWN":
            getResponse (command, deviceId, "/web/remotecontrol?command=105", evaluateCommandResponse);
            break;
        case "RIGHT":
        case "CH_UP":
            getResponse (command, deviceId, "/web/remotecontrol?command=106", evaluateCommandResponse);
            break;
        case "UP":
            getResponse (command, deviceId, "/web/remotecontrol?command=103", evaluateCommandResponse);
            break;
        case "DOWN":
            getResponse (command, deviceId, "/web/remotecontrol?command=108", evaluateCommandResponse);
            break;
        case "EXIT":
            getResponse (command, deviceId, "/web/remotecontrol?command=174", evaluateCommandResponse);
            break;
        case "INFO":
            getResponse (command, deviceId, "/web/remotecontrol?command=358", evaluateCommandResponse);
            break;
        case "MENU":
            getResponse (command, deviceId, "/web/remotecontrol?command=139", evaluateCommandResponse);
            break;
        case "SELECT":
        case "OK":
            getResponse (command, deviceId, "/web/remotecontrol?command=352", evaluateCommandResponse);
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
        case "MUTE_TOGGLE":
            getResponse (command, deviceId, "/web/vol?set=mute", evaluateCommandResponse);
            break;
        case "VOLUME":
            var volume = parseInt(value);
            if (volume > 0 && volume < 101) {
                getResponse (command, deviceId, "/web/vol?set=set" + volume, evaluateCommandResponse);
            }
            break;
        case "STANDBY_TOGGLE":
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
        case "OFF":
            getResponse (command, deviceId, "/web/powerstate?newstate=5", evaluateCommandResponse);
            break;
        default:
            logWarning("received unknown command '"+command+"' @ executeCommand");
    }
}

function checkStatus() {
    for (var id_ in dreamSettings.boxes) {
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