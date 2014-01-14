/**
 *      CCU.IO Fritz.Box call monitor Adapter
 *      01'2014 Bluefox
 *      Can store incoming calls into the list.
 *
 *      Version 0.1
 *
 *    Wenn man beim Telefon #96*5* eintippt, wird der TCP-Port 1012 geoffnet.
 *    Mit #96*4* wird dieser wieder geschlossen.
 *
 *    Ausgehende Anrufe:            datum;CALL;      ConnectionID;Nebenstelle;GenutzteNummer;    AngerufeneNummer;
 *    Eingehende Anrufe:            datum;RING;      ConnectionID;Anrufer-Nr; Angerufene-Nummer;
 *    Zustandegekommene Verbindung: datum;CONNECT;   ConnectionID;Nebenstelle;Nummer;
 *    Ende der Verbindung:          datum;DISCONNECT;ConnectionID;dauerInSekunden;
*/
var settings = require(__dirname + '/../../settings.js');
 
if (!settings.adapters.fritzBox || !settings.adapters.fritzBox.enabled) {
    process.exit();
}
 
var fritzBoxSettings = settings.adapters.fritzBox.settings;
 
var logger = require(__dirname + '/../../logger.js'),
    io     = require('socket.io-client'),
    net    = require('net');
       
var socketBox,
    missedCount = 0,
    missedList  = [],
    connecting  = null,
	objects     = {},
	datapoints  = {},
	callStatus  = {};
       
var objState        = fritzBoxSettings.firstId + 0, // Current state of phone: FREE, RING, TALKING
    objRinging      = fritzBoxSettings.firstId + 1, // TRUE if ringing, else false
	objMissedCalls  = fritzBoxSettings.firstId + 2, // Count of missed calls
	objMissedList   = fritzBoxSettings.firstId + 3, // List of missed calls
    objMissedListFormatted   = fritzBoxSettings.firstId + 4, // List of missed calls
    objLastMissed   = fritzBoxSettings.firstId + 5; // Last missed call

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

function createObject(id, obj) {
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

function getState(id, callback) {
    logger.verbose("adapter fritzBox getState "+id);
    socket.emit("getDatapoint", [id], function (id, obj) {
        callback (id, obj);
    });
}

function stop() {
    logger.info("adapter fritzBox terminating");
    socketBox.end;
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

socket.on('connect', function () {
	logger.info("adapter fritzBox connected to ccu.io");
});
 
socket.on('disconnect', function () {
	logger.info("adapter fritzBox disconnected from ccu.io");
});
 
socket.on('event', function (obj) {
	if (!obj || !obj[0]) {
        return;
	}

	if (obj[0] == objMissedCalls && (obj[1] == 0 || obj[1] == "0")) {
        missedCount = 0;
	}
});

function resolveNumber (number) {
    if (number) {
        for (var i = fritzBoxSettings.phonebook.length - 1; i >= 0; i--) {
            if (number.indexOf (fritzBoxSettings.phonebook[i].number) != -1) {
                return fritzBoxSettings.phonebook[i].name;
            }
        }
    }
    return number;
}

function listToText () {
    var text = "";
    for (var i = missedList.length - 1; i >= 0; i--) {
        text += (text ? ";" : "") + missedList[i].time + "/" + resolveNumber (missedList[i].number);
    }

    return text;
}

function listToHtml () {
    var text = '<table class="missedlistTable">';
    for (var i = missedList.length - 1; i >= 0; i--) {
        text += "<tr class='missedlistTableLine'><td class='missedlistTableTime'>" + missedList[i].time + "</td><td class='missedlistTableName'>" + resolveNumber (missedList[i].number) + "</td></tr>";
    }
    text += "</table>"

    return text;
}


function connectToFritzBox () {
    if (connecting) {
        clearTimeout (connecting);
        connecting = null;
    }
    logger.info("adapter fritzBox connecting to:" + fritzBoxSettings.IP);

    socketBox = net.connect({port: 1012, host: fritzBoxSettings.IP}, function() {
        logger.info("adapter fritzBox connected to fritz: " + fritzBoxSettings.IP);
    });

    socketBox.on('close', function () {
        logger.info("adapter fritzBox received 'close'");
        socketBox.end ();
        if (!connecting){
            connecting = setTimeout(function () {
                connectToFritzBox();
            }, 10000);
        }
    });

    socketBox.on('error', function (data) {
        logger.info("adapter fritzBox received 'error':"+data.toString());
        if (!connecting){
            connecting = setTimeout(function () {
                connectToFritzBox();
            }, 10000);
        }
    });

    socketBox.on('end', function () {
        logger.info("adapter fritzBox received 'end'");
        socketBox.end ();
        if (!connecting){
            connecting = setTimeout(function () {
                connectToFritzBox();
            }, 10000);
        }
    });

    socketBox.on('data', function (data) {
        var str = data.toString();
        var obj = str.split(";");
        var item = {
            time :          obj[0], // 01.01.14 12:34:56
            type :          obj[1], // CALL (outgoing), RING (incoming), CONNECT (start), DISCONNECT (end)
            connectionId :  obj[2], // identifier as integer
            extensionLine : 0,
            ownNumber:      "",
            calledNumber:   "",
            durationSecs:   null
        };

        // Outgoing call
        if (item.type == "CALL") {
            item.extensionLine = obj[3];    // used extension line
            item.ownNumber     = obj[4];    // used own number
            item.calledNumber  = obj[5];    // called number
        }
        else // Incoming call
        if (item.type == "RING") {
            item.extensionLine = 0;         // used extension line
            item.calledNumber  = obj[3];    // called number
            item.ownNumber     = obj[4];    // used own number
        }
        else // Start of call
        if (item.type == "CONNECT") {
            item.extensionLine = obj[3];    // used extension line
            item.calledNumber  = obj[4];    // called number
            item.ownNumber     = null;      // used own number
        }
        else // End of call
        if (item.type == "DISCONNECT") {
            item.durationSecs  = obj[3];    // call duration in seconds
        }
        else {
            logger.error ("adapter fritzBox unknown event type " + item.type);
            return;
        }

        logger.info("adapter fritzBox received event (time: " + item.time +
            ", type: "     + item.type +
            ", ID: "       + item.connectionId +
            ", exLine: "   + item.extensionLine +
            ", called: "   + item.calledNumber +
            ", own: "      + item.ownNumber +
            ", sec: "      + item.durationSecs +")");

        if (item.type == "DISCONNECT") {
            // If missed call
            callStatus[item.connectionId].type         = item.type;
            callStatus[item.connectionId].durationSecs = item.durationSecs;

            if (item.durationSecs === 0 || item.durationSecs === "0") {
                logger.info("adapter fritzBox missed call : "+ callStatus[item.connectionId].calledNumber + " / " +callStatus[item.connectionId].time);

                // Delete oldest entry
                if (missedList.length >= fritzBoxSettings.maxMissed) {
                    missedList.split(0,1);
                }

                missedList[missedList.length] = {number: callStatus[item.connectionId].calledNumber, time: callStatus[item.connectionId].time};
                missedCount++;
                setState(objMissedCalls, missedCount);
                setState(objMissedList, listToText());
                setState(objLastMissed, resolveNumber(callStatus[item.connectionId].calledNumber));
                setState(objMissedListFormatted, listToHtml ());
            }

        }
        else {
            callStatus[item.connectionId] = item;
        }

        var newState = "NONE";

        for (var event in callStatus) {
            var status = callStatus[event].type;

            if (status == "RING") {
                newState = "RING";
                break;
            }
            else
            if (status == "CONNECT" || status == "CALL") {
                newState = "TALKING";
                break;
            }
        }

        // Set ringing object
        if (datapoints[objRinging] != (newState == "RING")) {
            setState(objRinging, (newState == "RING"));
        }

        setState(objState, newState);
    });
}

connectToFritzBox();

createObject(objState, {
    Name:     "FRITZBOX.STATE",
    TypeName: "VARDP",
    "DPInfo": "FritzBox",
    Value :   "NONE",
    "ValueType": 20,
    "ValueSubType": 11
});
createObject(objRinging, {
    Name:     "FRITZBOX.RINGING",
    "DPInfo": "FritzBox",
    TypeName: "VARDP",
    Value :   false,
    "ValueType": 4,
    "ValueSubType": 0
});

createObject(objMissedCalls, {
    Name:     "FRITZBOX.MISSED",
    "DPInfo": "FritzBox",
    TypeName: "VARDP",
    "ValueType": 4,
    "ValueSubType": 0
});

createObject(objMissedList, {
    Name:     "FRITZBOX.MISSED_LIST",
    "DPInfo": "FritzBox",
    TypeName: "VARDP",
    "ValueType": 20,
    "ValueSubType": 11
});

createObject(objMissedListFormatted, {
    Name:     "FRITZBOX.MISSED_LIST_FMT",
    "DPInfo": "FritzBox",
    TypeName: "VARDP",
    "ValueType": 20,
    "ValueSubType": 11
});

createObject(objLastMissed, {
    Name:     "FRITZBOX.LAST_MISSED",
    "DPInfo": "FritzBox",
    TypeName: "VARDP",
    "ValueType": 20,
    "ValueSubType": 11
});

// Init objects if they are not stored
getState (objMissedCalls, function (id, obj) {
    if (!obj){
        setState (objMissedCalls, 0);
    }
    else {
        missedCount = obj[0];
    }
});

getState (objMissedList, function (id, obj) {
    if (!obj){
        setState (objMissedList, "");
    }
    else if (obj[0]) {
        var calls = obj[0].split(";");
        for (var i = calls.length - 1; i >= 0; i--) {
            var els = calls[i].split("/", 2);
            missedList[missedList.length] = {number: els[1], time: els[0]};
        }
    }
});