

var settings = require(__dirname+'/../../settings.js');

if (!settings.adapters.textCommands || !settings.adapters.textCommands.enabled) {
    process.exit();
}

var logger   = require(__dirname+'/../../logger.js'),
    io       = require('socket.io-client'),
    http     = require('http'),
    https    = require('https'),
	commands = require(__dirname+'/langModel.js');

var textCommandsSettings = settings.adapters.textCommands.settings;

textCommandsSettings.language = textCommandsSettings.language || 'de';
textCommandsSettings.keywords = (textCommandsSettings.keywords !== undefined && textCommandsSettings.keywords !== null) ? textCommandsSettings.keywords : 'system';

var objProcess  = textCommandsSettings.firstId;
var objError    = textCommandsSettings.firstId + 1;
var objKeywords = textCommandsSettings.firstId + 2;

var commandsCallbacks = {
	'whatTimeIsIt' :       sayTime,
	'whatIsYourName' :     sayName,
	'outsideTemperature' : sayOutsideTemperature,
	'insideTemperature' :  sayInsideTemperature,
    'userDeviceControl' :  userDeviceControl
}

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
    logger.info("adapter textCommands connected to ccu.io");
});

socket.on('disconnect', function () {
    logger.info("adapter textCommands disconnected from ccu.io");
});

socket.on('event', function (obj) {
    if (obj === undefined || !obj[0]) {
        return;
    }
	
	if (obj[0] == objProcess && obj[1]) {
		checkCommand (obj[1]);
	}
    else
    if (obj[0] == objKeywords && obj[1] !== undefined) {
        textCommandsSettings.keywords = obj[1];
    }
});

function stop() {
    logger.info("adapter textCommands terminating");
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

function createObject(id, obj) {
    socket.emit("setObject", id, obj);
}

function setState(id, val) {
	logger.verbose("adapter textCommands setState "+id+" "+val);
	socket.emit("setState", [id,val,null,true]);
}

function execProgram(id) {
    logger.verbose("adapter textCommands execProgram "+id);
    socket.emit("programExecute", [id]);
}

function getState(id, callback) {
	logger.verbose("adapter textCommands getState "+id);
	socket.emit("getDatapoint", [id], function (id, obj) {
		callback (id, obj);
	});
}

function sayIDontKnow () {
	console.log ("I dont know");
	if (textCommandsSettings.language == "ru") {
		setState (textCommandsSettings.sayIt, textCommandsSettings.language+";Я не знаю");
	}
	else if (textCommandsSettings.language == "de") {
		setState (textCommandsSettings.sayIt, textCommandsSettings.language+";Ich weiss nicht");
	}
	else if (textCommandsSettings.language == "en") {
		setState (textCommandsSettings.sayIt, textCommandsSettings.language+";I don't know");
	}
	else {
		logger.error ("Language " + textCommandsSettings.language + " is not supported");
	}	
}

function sayTime (text, arg1, arg2, arg3) {
	var d = new Date();
	if (textCommandsSettings.language == "ru") {
		setState (textCommandsSettings.sayIt, textCommandsSettings.language+";"+d.getHours() +  ":" + d.getMinutes());
	}
	else if (textCommandsSettings.language == "de") {
		setState (textCommandsSettings.sayIt, textCommandsSettings.language+";"+d.getHours() +  ":" + d.getMinutes());
	}
	else if (textCommandsSettings.language == "en") {
		setState (textCommandsSettings.sayIt, textCommandsSettings.language+";"+d.getHours() +  ":" + d.getMinutes());
	}
	else {
		logger.error ("Language " + textCommandsSettings.language + " is not supported");
	}
}

function sayName (text, arg1, arg2, arg3) {
	if (!textCommandsSettings.keywords) {
		if (textCommandsSettings.language == "ru") {
			setState (textCommandsSettings.sayIt, textCommandsSettings.language+";Обращайся ко мне как хочешь. У меня нет имени");
		}
		else if (textCommandsSettings.language == "de") {
			setState (textCommandsSettings.sayIt, textCommandsSettings.language+";Nenne mich wie du willst. Ich habe keinen Namen.");
		}
		else if (textCommandsSettings.language == "en") {
			setState (textCommandsSettings.sayIt, textCommandsSettings.language+";Call me as you wish. I don't have name");
		}
		else {
			logger.error ("Language " + textCommandsSettings.language + " is not supported");
		}		
		return;
	}

	var words = textCommandsSettings.keywords.split ("/");
	if (textCommandsSettings.language == "ru") {
		setState (textCommandsSettings.sayIt, textCommandsSettings.language+";Меня зовут " + words[0]);
	}
	else if (textCommandsSettings.language == "de") {
		setState (textCommandsSettings.sayIt, textCommandsSettings.language+";Ich heisse " + words[0]);
	}
	else if (textCommandsSettings.language == "en") {
		setState (textCommandsSettings.sayIt, textCommandsSettings.language+";My name is " + words[0]);
	}
	else {
		logger.error ("Language " + textCommandsSettings.language + " is not supported");
	}
}

function sayIDontUnderstand (text) {
	if (textCommandsSettings.language == "ru") {
        if (!text) {
            setState (textCommandsSettings.sayIt, textCommandsSettings.language+";Я не расслышала комманду");
        }
        else{
            setState (textCommandsSettings.sayIt, textCommandsSettings.language+";Я не расслышала и поняла только " + text);
        }
	}
	else if (textCommandsSettings.language == "de") {
        if (!text) {
            setState (textCommandsSettings.sayIt, textCommandsSettings.language+";Ich habe nichts gehört");
        }
        else{
    		setState (textCommandsSettings.sayIt, textCommandsSettings.language+";Ich habe gehört nur "+ text);
        }
	}
	else if (textCommandsSettings.language == "en") {
        if (!text) {
            setState (textCommandsSettings.sayIt, textCommandsSettings.language+";I could not hear you");
        }
        else{
    		setState (textCommandsSettings.sayIt, textCommandsSettings.language+";I don't understand and could hear only " + text);
        }
	}
	else {
		logger.error ("Language " + textCommandsSettings.language + " is not supported");
	}	
}

function sayOutsideTemperature (text, arg1, arg2, arg3) {
	if (!arg1) {
		sayIDontKnow ();
		return;
	}
	getState (arg1, function (id, obj) {
		if (!obj || obj[0] === undefined || obj[0] === null) {
			sayIDontKnow ();
			return;
		}

		var t  = (obj[0]+"").replace("&deg;", "").replace(",", ".");
		var t_ = parseFloat (t);
		t_ = Math.round (t_);
		
		if (textCommandsSettings.language == "ru") {
			var tr = t % 10;
			if (tr == 1)
				setState (textCommandsSettings.sayIt, textCommandsSettings.language+"; Темература на улице один градус");
			else
			if (tr >= 2 && tr <= 4)
				setState (textCommandsSettings.sayIt, textCommandsSettings.language+"; Темература на улице " + t_ + " градуса");
			else
				setState (textCommandsSettings.sayIt, textCommandsSettings.language+"; Темература на улице " + t_ + " градусов");
		}
		else if (textCommandsSettings.language == "de") {
			setState (textCommandsSettings.sayIt, textCommandsSettings.language+";Tempreature draussen ist " + t_ + " grad");
		}
		else if (textCommandsSettings.language == "en") {
			setState (textCommandsSettings.sayIt, textCommandsSettings.language+";Outside temperature is " + t_ + " gradus");
		}
		else {
			logger.error ("Language " + textCommandsSettings.language + " is not supported");
		}	
	});
}

function sayInsideTemperature (text, arg1, arg2, arg3) {
	if (!arg1) {
		sayIDontKnow ();
		return;
	}

	getState (arg1, function (id, obj) {
		if (!obj || obj[0] === undefined || obj[0] === null) {
			sayIDontKnow ();
			return;
		}
	
		var t  = (obj[0] + "").replace("&deg;", "").replace(",", ".");
		var t_ = parseFloat (t);
		t_ = Math.round (t_);
		
		if (textCommandsSettings.language == "ru") {
			var tr = t % 10;
			if (tr == 1)
				setState (textCommandsSettings.sayIt, textCommandsSettings.language+"; Темература дома один градус");
			else
			if (tr >= 2 && tr <= 4)
				setState (textCommandsSettings.sayIt, textCommandsSettings.language+"; Темература дома " + t_ + " градуса");
			else
				setState (textCommandsSettings.sayIt, textCommandsSettings.language+"; Темература дома " + t_ + " градусов");
		}
		else if (textCommandsSettings.language == "de") {
			setState (textCommandsSettings.sayIt, textCommandsSettings.language+";Tempreature drin ist " + t_ + " grad");
		}
		else if (textCommandsSettings.language == "en") {
			setState (textCommandsSettings.sayIt, textCommandsSettings.language+";Inside temperature is " + t_ + " gradus");
		}
		else {
			logger.error ("Language " + textCommandsSettings.language + " is not supported");
		}	
	});
}

function userDeviceControl (text, arg1, arg2, arg3, ack) {
    logger.debug ("adapter textCommands write to ID " + arg1 + " value: " + arg2)
    setState (arg1, arg2);
    if (ack) {
        setState (textCommandsSettings.sayIt, ack);
    }
}

function userProgramExec (text, arg1, arg2, arg3, ack) {
    logger.debug ("adapter textCommands write to ID " + arg1 + " value: " + arg2)
    execProgram (arg1);
    if (ack) {
        setState (textCommandsSettings.sayIt, ack);
    }
}

function processCommand (cmd) {
	console.log (cmd);
    var isNothingFound = true;
	
	for (var i = 0; i < textCommandsSettings.rules.length; i++) {
		var command = textCommandsSettings.rules[i];
		console.log ("Check: " + command.name);
		var words = (commands[command.name].words) ? commands[command.name].words[textCommandsSettings.language] : null;
        if (!words) {
            words = textCommandsSettings.rules[i].words;
        }
		if (typeof (words) != "array") {
			words = words.split(" ");
		}		
		var isFound = true;
		for (var j = 0; j < words.length; j++) {
			
			if (words[j].indexOf ('/') != -1) {
				var _www = words[j].split('/');
				var _isFound = false;
				for (var u = 0; u < _www.length; u++) {
					if (cmd.indexOf (_www[u]) != -1) {
						_isFound = true;
						break;
					}
				}
				if (!_isFound){
					isFound = false;
					break;
				}	
			}
			else
			if (cmd.indexOf (words[j]) == -1) {
				isFound = false;
				break;
			}
		}
		if (isFound) {
            isNothingFound = false;
			console.log ("Found: " + commands[command.name].description);
			if (commandsCallbacks [command.name])
				commandsCallbacks [command.name] (cmd, command["arg1"], command["arg2"], command["arg3"], command["ack"]);
			else {
				console.log ("No callback for " + commands[command.name].description);
			}
			break;
		}
	}

    if (isNothingFound && textCommandsSettings.keywords) {
        sayIDontUnderstand (cmd);
    }
};

// try to find keyword at the start of the text
function checkCommand (text) {
	// If there is no keyword => go to process command
	if (!textCommandsSettings.keywords) {
		processCommand (text);
		return true;
	}

	// "system/computer"
	var words = textCommandsSettings.keywords.split ("/");

	var isFound = false;
	for (var t = 0; t < words.length; t++) {
		if (words[t] == text.substring (0, words[t].length)) {
			isFound = true;
			text = text.substring (words[t].length + 1);
			break;
		}
	}
	
	if (isFound) {
		processCommand (text);
	}
	else {
		// No keyword found
		setState (objError, 'No keyword ("'+textCommandsSettings.keywords+'") found: ' + text);
	}
}

createObject(objProcess, {
    "Name": "TextCommand.Command",
    "TypeName": "VARDP",
    "DPInfo": "Listen",
    "ValueMin": null,
    "ValueMax": null,
    "ValueUnit": "",
    "ValueType": 20,
    "ValueSubType": 11,
    "ValueList": ""
});

createObject(objError, {
    "Name": "TextCommand.Error",
    "TypeName": "VARDP",
    "DPInfo": "Listen",
    "ValueMin": null,
    "ValueMax": null,
    "ValueUnit": "",
    "ValueType": 20,
    "ValueSubType": 11,
    "ValueList": ""
});

createObject(objKeywords, {
    "Name": "TextCommand.Keywords",
    "TypeName": "VARDP",
    "DPInfo": "Listen",
    "ValueMin": null,
    "ValueMax": null,
    "ValueUnit": "",
    "ValueType": 20,
    "ValueSubType": 11,
    "ValueList": ""
});
if (textCommandsSettings.keywords) {
    setState (objKeywords, textCommandsSettings.keywords);
}

