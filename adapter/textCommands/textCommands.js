/**
 *      CCU.IO Listen Adapter
 *      01'2014 Bluefox
 *
 *      Version 0.1
 *
 *      This adapter receives text command in 72970 and tries to execute it.
 *      If error occurs it will be written into 72971.
 *
 *
 * Copyright (c) 2013 Bluefox dogafox@gmail.com
 *
 * It is licensed under the Creative Commons Attribution-Non Commercial-Share Alike 3.0 license.
 * The full text of the license you can get at http://creativecommons.org/licenses/by-nc-sa/3.0/legalcode
 *
 * Short content:
 * Licensees may copy, distribute, display and perform the work and make derivative works based on it only if they give the author or licensor the credits in the manner specified by these.
 * Licensees may distribute derivative works only under a license identical to the license that governs the original work.
 * Licensees may copy, distribute, display, and perform the work and make derivative works based on it only for noncommercial purposes.
 * (Free for non-commercial use).
 */

var settings = require(__dirname + '/../../settings.js');

if (!settings.adapters.textCommands || !settings.adapters.textCommands.enabled) {
    process.exit();
}

var logger   = require(__dirname + '/../../logger.js'),
    io       = require('socket.io-client'),
    http     = require('http'),
    https    = require('https'),
	commands = require(__dirname + '/langModel.js');

var textCommandsSettings = settings.adapters.textCommands.settings;

textCommandsSettings.language = textCommandsSettings.language || 'de';

var objProcess         = textCommandsSettings.firstId;
var objError           = textCommandsSettings.firstId + 1;

var regaIndex      = null;
var regaObjects    = null;

var commandsCallbacks = {
	'whatTimeIsIt' :       sayTime,
	'whatIsYourName' :     sayName,
	'outsideTemperature' : sayOutsideTemperature,
	'insideTemperature' :  sayInsideTemperature,
    'userDeviceControl' :  userDeviceControl,
    'switchOnOff' :        controlLight,
    'blindsUpDown' :       controlBlinds
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
    // Fetch Data
    socket.emit('getIndex', function(index) {
        regaIndex = index;
        socket.emit('getObjects', function(objects) {
            logger.info("adapter textCommands fetched regaObjects")
            regaObjects = objects;
        });
    });
});

socket.on('disconnect', function () {
    logger.info("adapter textCommands disconnected from ccu.io");
});

socket.on('event', function (obj) {
    if (obj === undefined || !obj[0]) {
        return;
    }
	
	if (obj[0] == objProcess && obj[1] && !obj[3]) {
        processCommand (obj[1]);
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

function getRandomPhrase (arr) {
    if (typeof arr == "object") {
        if (arr.length > 1) {
            var randomNumber = Math.floor(Math.random() * arr.length);
            if (randomNumber > arr.length - 1) {
                randomNumber = arr.length - 1;
            }
            return arr[randomNumber];
        } else {
            return arr[0];
        }
    } else {
        return arr;
    }
}

function sayIDontKnow (lang, withLang) {
	console.log ("I dont know");
	if (lang == "ru") {
		sayIt(lang, withLang,
                getRandomPhrase(["Извините, но ", "Прошу прощения, но ", ""]) +
                getRandomPhrase(["Я не знаю", "Нет данных"]));
	}
	else if (lang == "de") {
		sayIt(lang, withLang,
                getRandomPhrase(["Entschuldigen sie. ", "Es tut mir leid. ", ""]) +
                getRandomPhrase(["Ich weiss nicht", "Keine Daten vorhanden"]));
	}
	else if (lang == "en") {
		sayIt(lang, withLang,
                getRandomPhrase(["I am sorry, but ", "Excus me. ", ""]) +
                getRandomPhrase(["I don't know", "No data available"]));
	}
	else {
		logger.error ("Language " + lang + " is not supported");
	}	
}

function sayTime (lang, text, withLang, arg1, arg2, arg3) {
	var d = new Date();
    var h = d.getHours();
    var m = d.getMinutes();
    if (h < 10) h = "0" + "" + h;
    if (m < 10) m = "0" + "" + m;

    sayIt(lang, withLang, h + ":" + m);
}

function sayName (lang, text, withLang, arg1, arg2, arg3) {

    getState (72959, function (id, obj) {
        if (!obj || obj[0] === undefined || obj[0] === null) {
            if (lang == "ru") {
                sayIt(lang, withLang, "Обращайся ко мне как хочешь. У меня нет имени");
            }
            else if (lang == "de") {
                sayIt(lang, withLang, "Nenne mich wie du willst. Ich habe keinen Namen.");
            }
            else if (lang == "en") {
                sayIt(lang, withLang, "Call me as you wish. I don't have name");
            }
            else {
                logger.error ("Language " + lang + " is not supported");
            }
            return;
        }

        var words = (obj[0]+"").split ("/");
        if (lang == "ru") {
            sayIt(lang, withLang, "Меня зовут " + words[0]);
        }
        else if (lang == "de") {
            sayIt(lang, withLang, "Ich heisse " + words[0]);
        }
        else if (lang == "en") {
            sayIt(lang, withLang, "My name is " + words[0]);
        }
        else {
            logger.error ("Language " + lang + " is not supported");
        }
    });
}

function sayIt(lang, withLang, text) {
    if (text) {
        logger.info("adapter textCommands: response - '" + ((withLang ? (lang ? lang + ";" : "") : "") + text) + "'");
        // Write answer back
        setState(objProcess, (withLang ? (lang ? lang + ";" : "") : "") + text);

        if (textCommandsSettings.sayIt) {
            if (lang) {
                setState(textCommandsSettings.sayIt, lang + ";" + text);
            } else {
                setState(textCommandsSettings.sayIt, text);
            }
        }
    }
}

function sayIDontUnderstand (lang, text, withLang) {
	if (lang == "ru") {
        if (!text) {
            sayIt(lang, withLang, "Я не расслышала комманду");
        }
        else{
            sayIt(lang, withLang, "Я не расслышала и поняла только " + text);
        }
	}
	else if (lang == "de") {
        if (!text) {
            sayIt(lang, withLang, "Ich habe nichts gehoert");
        }
        else{
            sayIt(lang, withLang, "Ich habe gehoert nur "+ text);
        }
	}
	else if (lang == "en") {
        if (!text) {
            sayIt(lang, withLang, "I could not hear you");
        }
        else{
            sayIt(lang, withLang, "I don't understand and could hear only " + text);
        }
	}
	else {
		logger.error ("Language " + lang + " is not supported");
	}	
}

function sayOutsideTemperature (lang, text, withLang, arg1, arg2, arg3) {
	if (!arg1) {
		sayIDontKnow (lang, withLang);
		return;
	}
	getState (arg1, function (id, obj) {
		if (!obj || obj[0] === undefined || obj[0] === null) {
			sayIDontKnow (lang, withLang);
			return;
		}

		var t  = (obj[0]+"").replace("&deg;", "").replace(",", ".");
		var t_ = parseFloat (t);
		t_ = Math.round (t_);
		
		if (lang == "ru") {
			var tr = t % 10;
			if (tr == 1)
				sayIt(lang, withLang, " Температура на улице один градус");
			else
			if (tr >= 2 && tr <= 4)
				sayIt(lang, withLang, " Температура на улице " + t_ + " градуса");
			else
				sayIt(lang, withLang, " Температура на улице " + t_ + " градусов");
		}
		else if (lang == "de") {
			sayIt(lang, withLang, "Tempreature draussen ist " + t_ + " grad");
		}
		else if (lang == "en") {
			sayIt(lang, withLang, "Outside temperature is " + t_ + " gradus");
		}
		else {
			logger.error ("Language " + lang + " is not supported");
		}	
	});
}

function sayInsideTemperature (lang, text, withLang, arg1, arg2, arg3) {
	if (!arg1) {
		sayIDontKnow (lang, withLang);
		return;
	}

	getState (arg1, function (id, obj) {
		if (!obj || obj[0] === undefined || obj[0] === null) {
			sayIDontKnow (lang, withLang);
			return;
		}
	
		var t  = (obj[0] + "").replace("&deg;", "").replace(",", ".");
		var t_ = parseFloat (t);
		t_ = Math.round (t_);
		
		if (lang == "ru") {
			var tr = t % 10;
			if (tr == 1)
				sayIt(lang, withLang, " Температура дома один градус");
			else
			if (tr >= 2 && tr <= 4)
				sayIt(lang, withLang, " Температура дома " + t_ + " градуса");
			else
				sayIt(lang, withLang, " Температура дома " + t_ + " градусов");
		}
		else if (lang == "de") {
			sayIt(lang, withLang, "Tempreature drin ist " + t_ + " grad");
		}
		else if (lang == "en") {
			sayIt(lang, withLang, "Inside temperature is " + t_ + " gradus");
		}
		else {
			logger.error ("Language " + lang + " is not supported");
		}	
	});
}

function userDeviceControl (lang, text, withLang, arg1, arg2, arg3, ack) {
    logger.debug ("adapter textCommands write to ID " + arg1 + " value: " + arg2)
    setState (arg1, arg2);
    if (ack) {
        if (ack[0] == '[') {
            try {
                var obj = JSON.parse(ack);
                sayIt(null, withLang, getRandomPhrase(obj));
            } catch(ex) {
                logger.warn("Cannot parse acknowledge :" + ack);
                sayIt(null, withLang, ack);
            }
        } else {
            sayIt(null, withLang, ack);
        }
    }
}

function userProgramExec (lang, text, withLang, arg1, arg2, arg3, ack) {
    logger.debug ("adapter textCommands write to ID " + arg1 + " value: " + arg2)
    execProgram (arg1);
    if (ack) {
        sayIt(null, withLang, ack);
    }
}

var rooms = {
    "livingRoom": {"ru" : "зал",            "de": "wohnzimmer",           "en": "living" },
    "bedroom":    {"ru" : "спальн",         "de": "schlafzimmer",         "en": "bedroom" },
    "bathroom":   {"ru" : "ванн",           "de": "bad",                  "en": "bath" },
    "office":     {"ru" : "кабинет",        "de": "arbeitszimmer/kabinet","en": "working/office" },
    "nursery":    {"ru" : "детск",          "de": "kinder",               "en": "kids/child/nursery" },
    "wc":         {"ru" : "туалет",         "de": "wc",                   "en": "wc/closet" },
    "floor":      {"ru" : "прихож/коридор", "de": "diele/eingang/flür",   "en": "floor/enter" },
    "kitchen":    {"ru" : "кухн",           "de": "küche",                "en": "kitchen" },
    "everywhere": {"ru" : "везде/все/всё",  "de": "alle/überall",         "en": "all/everywhere" },
    "terrace":    {"ru" : "балкон/терасс",  "de": "balkon/terrasse",      "en": "balcony/terrace/patio " }
}

function findWord (cmdWords, word) {
    for (var t = 0; t < cmdWords.length; t++) {
        if (cmdWords[t] == word) {
            return true;
        }
    }
    return false;
}

function controlBlinds (lang, text, withLang, arg1, arg2, arg3, ack) {
    var valPercent = null;
    var sRoom = "";
    var cmdWords = text.split(" ");
    if (lang == "ru") {
        // test operation
        if (text.indexOf ("открыть") != -1 || text.indexOf ("подними") != -1 || text.indexOf ("открой") != -1 || text.indexOf ("поднять") != -1) {
            valPercent = 1;
        }
        else
        if (text.indexOf ("закрыть") != -1 || text.indexOf ("закрой") != -1 || text.indexOf ("опусти") != -1 || text.indexOf ("опустить") != -1) {
            valPercent = 0;
        }
    }
    else if (lang == "de") {
        // test operation
        if (text.indexOf (" auf") != -1 ||
            text.indexOf ("hoch") != -1 ||
            text.indexOf ("aufmachen") != -1
            ) {
            valPercent = 1;
        }
        else
        if (text.indexOf ("zumachen") != -1 ||
            text.indexOf (" zu") != -1 ||
            text.indexOf ("runter") != -1) {
            valPercent = 0;
        }
    }
    else if (lang == "en") {
        // test operation
        if (text.indexOf ("open") != -1) {
            valPercent = 1;
        }
        else
        if (text.indexOf ("close") != -1) {
            valPercent = 0;
        }
    }
    else {
        logger.error ("Language " + lang + " is not supported");
        return;
    }

    // test room
    for (var room in rooms) {
        var words = rooms[room][lang].split("/");
        for (var w = 0; w < words.length; w++) {
            if (text.indexOf (words[w]) != -1) {
                sRoom = room;
                break;
            }
        }
        if (sRoom) {
            break;
        }
    }

    // Find any number
    var words = text.split(" ");
    for (var w = 0; w < words.length; w++) {
        if (words[w][0] >= '0' && words[w][0] <= '9') {
            valPercent = parseInt(words[w]) / 100;
            break;
        }
    }

    var regaRooms = regaIndex["ENUM_ROOMS"];
    var regaChannels = null;
    for (var i = 0; i < regaRooms.length; i++) {
        if (regaObjects[regaRooms[i]] && regaObjects[regaRooms[i]].Name) {
            var regaName = regaObjects[regaRooms[i]].Name.toLowerCase();
            for (var lroom in rooms[sRoom]) {
                var words = rooms[sRoom][lroom].split("/");
                for (var w = 0; w < words.length; w++) {
                    if (regaName.indexOf (words[w]) != -1) {
                        regaChannels = regaObjects[regaRooms[i]].Channels;
                        break;
                    }
                }
                if (regaChannels) {
                    break;
                }
            }
            if (regaChannels) {
                break;
            }
        }
    }
    if (valPercent === null) {
        sayIDontUnderstand (lang, text, withLang);
        return;
    }

    if (lang == 'en') {
        sayIt (lang, withLang, getRandomPhrase('Execute: ') + text);
    } else
    if (lang == 'de') {
        sayIt (lang, withLang, getRandomPhrase('Führe aus: ') + text);
    } else
    if (lang == 'ru') {
        sayIt (lang, withLang, getRandomPhrase('Выполняю: ') + text);
    }

    if (!regaChannels && regaIndex["CHANNEL"]) {
        for (var devs in regaIndex["CHANNEL"]) {
            if (regaObjects[regaIndex["CHANNEL"][devs]] && regaObjects[regaIndex["CHANNEL"][devs]].HssType == "BLIND") {
                var dev = regaObjects[regaIndex["CHANNEL"][devs]];
                if (dev.DPs && dev.DPs["LEVEL"])
                    setState (dev.DPs["LEVEL"], valPercent);
            }
        }
    } else
    if (regaChannels) {
        // Try to find blinds in this room
        for (var devs in regaChannels) {
            if (regaObjects[regaChannels[devs]].HssType == "BLIND") {
                var dev = regaObjects[regaChannels[devs]];
                if (dev.DPs && dev.DPs["LEVEL"])
                    setState (dev.DPs["LEVEL"], valPercent);
            }
        }
    }
    else {
        sayIDontUnderstand (lang, text, withLang);
        return;
    }
}

function controlLight (lang, text, withLang, arg1, arg2, arg3, ack) {
    var valPercent = null;
    var sRoom = "";
    var cmdWords = text.split(" ");
    if (lang == "ru") {
        // test operation
        if (findWord (cmdWords, "включить") || findWord (cmdWords, "включи") || findWord (cmdWords, "ключи")) {
            valPercent = "true";
        }
        else
        if (findWord (cmdWords, "выключи") || findWord (cmdWords, "выключить")) {
            valPercent = "false";
        }
    }
    else if (lang == "de") {
        // test operation
        if (findWord (cmdWords, "aus") || findWord (cmdWords, "ausmachen") || findWord (cmdWords, "ausschalten")) {
            valPercent = "false";
        }
        else
        if (findWord (cmdWords, "an") || findWord (cmdWords, "ein") || findWord (cmdWords, "einmachen") || findWord (cmdWords, "einschalten")) {
            valPercent = "true";
        }
    }
    else if (lang == "en") {
        // test operation
        if (findWord (cmdWords, "on")) {
            valPercent = "true";
        }
        else
        if (findWord (cmdWords, "off")) {
            valPercent = "false";
        }
    }
    else {
        logger.error ("Language " + lang + " is not supported");
        return;
    }

    // test room
    for (var room in rooms) {
        var words = rooms[room][lang].split("/");
        for (var w = 0; w < words.length; w++) {
            if (text.indexOf (words[w]) != -1) {
                sRoom = room;
                break;
            }
        }
        if (sRoom) {
            break;
        }
    }

    // Find any number
    var words = text.split(" ");
    for (var w = 0; w < words.length; w++) {
        if (words[w][0] >= '0' && words[w][0] <= '9') {
            valPercent = parseInt(words[w]) / 100;
            break;
        }
    }

    var regaRooms = regaIndex["ENUM_ROOMS"];
    var regaChannels = null;
    for (var i = 0; i < regaRooms.length; i++) {
        if (regaObjects[regaRooms[i]] && regaObjects[regaRooms[i]].Name) {
            var regaName = regaObjects[regaRooms[i]].Name.toLowerCase();
            for (var lroom in rooms[sRoom]) {
                var words = rooms[sRoom][lroom].split("/");
                for (var w = 0; w < words.length; w++) {
                    if (regaName.indexOf (words[w]) != -1) {
                        regaChannels = regaObjects[regaRooms[i]].Channels;
                        break;
                    }
                }
                if (regaChannels) {
                    break;
                }
            }
            if (regaChannels) {
                break;
            }
        }
    }
    if (valPercent === null) {
        sayIDontUnderstand (lang, text, withLang);
        return;
    }

    if (lang == 'en') {
        sayIt (lang, withLang, getRandomPhrase('Execute: ') + text);
    } else
    if (lang == 'de') {
        sayIt (lang, withLang, getRandomPhrase('Führe aus: ') + text);
    } else
    if (lang == 'ru') {
        sayIt (lang, withLang, getRandomPhrase('Выполняю: ') + text);
    }

    if (!regaChannels && regaIndex["CHANNEL"]) {
        for (var devs in regaIndex["CHANNEL"]) {
            if (regaObjects[regaIndex["CHANNEL"][devs]] && regaObjects[regaIndex["CHANNEL"][devs]].HssType == "SWITCH") {
                var dev = regaObjects[regaIndex["CHANNEL"][devs]];
                if (dev.DPs && dev.DPs["STATE"])
                    setState (dev.DPs["STATE"], valPercent);
            }
        }
    } else
    if (regaChannels) {
        // Try to find blinds in this room
        for (var devs in regaChannels) {
            if (regaObjects[regaChannels[devs]].HssType == "SWITCH") {
                var dev = regaObjects[regaChannels[devs]];
                if (dev.DPs && dev.DPs["STATE"])
                    setState (dev.DPs["STATE"], valPercent);
            }
        }
    }
    else {
        sayIDontUnderstand (lang, text, withLang);
        return;
    }
}

function processCommand (cmd) {
    if (!regaIndex || !regaObjects) {
        sayIt(lang, withLang, "Not ready");
        return;
    }
    logger.info("adapter textCommands: request  - '" + cmd + "'");

    var isNothingFound = true;
    var withLang = false;
    var ix = cmd.indexOf (";");
    var lang = textCommandsSettings.language;
    cmd = cmd.toLowerCase();

    if (ix != -1) {
        withLang = true;
        lang = cmd.substring (0, ix);
        cmd = cmd.substring(ix + 1);
    }
    var cmdWords = cmd.split(" ");

	for (var i = 0; i < textCommandsSettings.rules.length; i++) {
		var command = textCommandsSettings.rules[i];
		//console.log ("Check: " + command.name);
		var words = (commands[command.name].words) ? commands[command.name].words[lang] : null;

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
					if (findWord(cmdWords, _www[u])) {
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
			if (!findWord (cmdWords, words[j])) {
				isFound = false;
				break;
			}
		}
		if (isFound) {
            isNothingFound = false;
			console.log ("Found: " + JSON.stringify(commands[command.name].description));
			if (commandsCallbacks [command.name])
				commandsCallbacks [command.name] (lang, cmd, withLang, command["arg1"], command["arg2"], command["arg3"], command["ack"]);
			else {
                if (command.ack) {
                    if (typeof command.ack == "object") {
                        sayIt(lang, withLang, getRandomPhrase(command.ack[lang] || command.ack['en']));
                    } else {
                        sayIt(lang, withLang, getRandomPhrase(command.ack));
                    }
                } else {
                    console.log ("No callback for " + JSON.stringify(commands[command.name].description));
                }
			}
			break;
		}
	}

    if (isNothingFound && textCommandsSettings.keywords) {
        sayIDontUnderstand (lang, cmd, withLang);
    }
}

createObject(objProcess, {
    "Name": "TextCommand.Command",
    "TypeName": "VARDP",
    "DPInfo": "TextCommand",
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
    "DPInfo": "TextCommand",
    "ValueMin": null,
    "ValueMax": null,
    "ValueUnit": "",
    "ValueType": 20,
    "ValueSubType": 11,
    "ValueList": ""
});

// Add own commands
if (!textCommandsSettings.rules) {
    textCommandsSettings.rules = [];
}

for (var cmd in commands) {
    if (commands[cmd].invisible) {
        var obj = {
            name: cmd,
            words: commands[cmd].words
        };
        if (commands[cmd].ack) {
            obj.ack = commands[cmd].ack;
        }

        textCommandsSettings.rules.push(obj);
    }
}