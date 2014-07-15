/**
 *      CCU.IO Listen Adapter
 *      07'2014 Bluefox
 *
 *      Version 0.2
 *
 *      This adapter receives text command in 72970 and tries to execute it.
 *      If error occurs it will be written into 72971.
 *
 *
 * Copyright (c) 2013-2014 Bluefox dogafox@gmail.com
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

var settings = require(__dirname+'/../../settings.js');

if (!settings.adapters.textCommands || !settings.adapters.textCommands.enabled) {
    process.exit();
}

var logger   = require(__dirname + '/../../logger.js'),
    io       = require('socket.io-client'),
    http     = require('http'),
    https    = require('https'),
	model    = require(__dirname + '/langModel.js');

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
    'blindsUpDown' :       controlBlinds,
    'roleOnOff' :          controlRole
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

function sayNoSuchRoom (lang, text, withLang) {
	var toSay;
	if (lang == 'en') {
		toSay = getRandomPhrase(['Room not present', 'Room not found', 'You don\'t have such a room']);
	} else
	if (lang == 'de') {
		toSay = getRandomPhrase(['Raum ist nicht gefunden', 'Es gibt kein Zimmer mit dem Namen', 'Man muss sagen im welchen Raum oder überall']);
	} else
	if (lang == 'ru') {
		toSay = getRandomPhrase(['Комната не найдена', 'Надо сказать в какой комнате или сказать везде']);
	} else {
		toSay = "";
	}			

	if (toSay) {
		sayIt(lang, withLang, toSay);
	}
}

function sayNothingToDo (lang, text, withLang) {
	var toSay;
	if (lang == 'en') {
		toSay = getRandomPhrase(['I don\'t know, what to do', 'No action defined']);
	} else
	if (lang == 'de') {
		toSay = getRandomPhrase(['Ich weiß nicht, was ich machen soll', 'Aktion ist nicht definiert']);
	} else
	if (lang == 'ru') {
		toSay = getRandomPhrase(['Непонятно, что делать', 'Не задано действие']);
	} else {
		toSay = "";
	}			

	if (toSay) {
		sayIt(lang, withLang, toSay);
	}
}

function sayNoSuchRole (lang, text, withLang) {
	var toSay;
	if (lang == 'en') {
		toSay = getRandomPhrase(['Role not present', 'Role not found', 'You don\'t have such a device']);
	} else
	if (lang == 'de') {
		toSay = getRandomPhrase(['Die Rolle ist nicht gefunden', 'Es gibt keine Rolle mit dem Namen', 'Man muss sagen womit man was machen will']);
	} else
	if (lang == 'ru') {
		toSay = getRandomPhrase(['Устройство не найдено', 'Надо сказать с чем произвести действие']);
	} else {
		toSay = "";
	}			

	if (toSay) {
		sayIt(lang, withLang, toSay);
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
				sayIt(lang, withLang, " Темература на улице один градус");
			else
			if (tr >= 2 && tr <= 4)
				sayIt(lang, withLang, " Темература на улице " + t_ + " градуса");
			else
				sayIt(lang, withLang, " Темература на улице " + t_ + " градусов");
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
				sayIt(lang, withLang, " Темература дома один градус");
			else
			if (tr >= 2 && tr <= 4)
				sayIt(lang, withLang, " Темература дома " + t_ + " градуса");
			else
				sayIt(lang, withLang, " Темература дома " + t_ + " градусов");
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

function findWord (cmdWords, word) {
    for (var t = 0; t < cmdWords.length; t++) {
        if (cmdWords[t] == word) {
            return true;
        }
    }
    return false;
}

function findRoom (text) {
	var sRoom = "";
    for (var room in model.rooms) {
        var words = model.rooms[room][lang].split("/");
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
	return sRoom;
}

function findAnyNumber (text) {
	var valPercent = null
    // Find any number
    var words = text.split(" ");
    for (var w = 0; w < words.length; w++) {
        if (words[w][0] >= '0' && words[w][0] <= '9') {
            valPercent = parseInt(words[w]) / 100;
            break;
        }
    }
	return valPercent;
}

function getChannel (sWhat, sWhere) {
	if (!regaIndex || !regaIndex[sWhere] || !sWhat) {
		return null;
	}
    var regaList = regaIndex[sWhere];
    var regaChannels = null;
	if (regaList) {	
		for (var i = 0; i < regaList.length; i++) {
			if (regaObjects[regaList[i]] && regaObjects[regaList[i]].Name) {
				var regaName = regaObjects[regaList[i]].Name.toLowerCase();
				for (var lang in model.rooms[sWhat]) {
					var words = model.rooms[sWhat][lang].split("/");
					for (var w = 0; w < words.length; w++) {
						if (regaName.indexOf (words[w]) != -1) {
							regaChannels = regaObjects[regaList[i]].Channels; //Array if IDs
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
	}
	return regaChannels;
}

function getRoomChannel (sRoom) {
    if (sRoom != "everywhere") {
		return getChannel(sRoom, "ENUM_ROOMS"); 
    }
	return null;
}

function getRoleChannel (sRole) {
	if (sRoom != "all") {
		return getChannel(sRoom, "ENUM_FUNCTIONS"); 
    }
	return null;
}

function controlBlinds (lang, text, withLang, arg1, arg2, arg3, ack) {
    var cmdWords = text.split(" ");
	var valPercent = null;
	var toSay = "";
	
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

    // find room
    var sRoom = findRoom(text);

    // Find any number
	var num = findAnyNumber(text);
	if (num !== null) {
		valPercent = num;		
	}
	
	// Don't know what to do
    if (valPercent === null) {
        sayNothingToDo(lang, text, withLang);
        return;
    }
	
    var regaChannels = null;
    if (sRoom != "everywhere") {
	    regaChannel = getRoomChannel(sRoom);
		// Unknown room
		if (!regaChannel) {
			sayNoSuchRoom(lang, text, withLang);
			return;
		}
    }
	
	var isSaid = false;
	if (!toSay) {
		if (lang == 'en') {
			toSay += ((valPercent > 0.5) ? 'Open' : 'Close') + 
			' the shutter ' + 
			model.roomsDative[sRoom][lang] + 
			((valPercent != 0 && valPercent != 1) ? ' on ' + (valPercent * 100) + ' percent': '');
		} else
		if (lang == 'de') {
			toSay += 'Mache' + 
			' die Rolladen ' + 
			model.roomsDative[sRoom][lang] + 
			((valPercent != 0 && valPercent != 1) ? ' auf ' + (valPercent * 100) + ' Perzent': '') + 
			((valPercent > 0.5) ? ' auf' : ' zu');
		} else
		if (lang == 'ru') {
			toSay += ((valPercent > 0.5) ? 'Открываю' : 'Закрываю') + 
			' окна ' + 
			(sRoom != "everywhere") ? model.roomsDative[sRoom][lang] : 'по всему дому' + 
			((valPercent != 0 && valPercent != 1) ? ' на ' + (valPercent * 100) + ' процентов': '');
		}
	}

    if (sRoom == "everywhere" && regaIndex["CHANNEL"]) {
        for (var devs in regaIndex["CHANNEL"]) {
            if (regaObjects[regaIndex["CHANNEL"][devs]] && regaObjects[regaIndex["CHANNEL"][devs]].HssType == "BLIND") {
                var dev = regaObjects[regaIndex["CHANNEL"][devs]];
                if (dev.DPs && dev.DPs["LEVEL"]) {
					if (!isSaid) {
						sayIt (lang, withLang, toSay);
						isSaid = true;
					}
				
                    setState (dev.DPs["LEVEL"], valPercent);
				}
            }
        }
    } else
    if (regaChannels) {
        // Try to find blinds in this room
        for (var devs in regaChannels) {
            if (regaObjects[regaChannels[devs]].HssType == "BLIND") {
                var dev = regaObjects[regaChannels[devs]];
                if (dev.DPs && dev.DPs["LEVEL"]) {
					if (!isSaid) {
						sayIt (lang, withLang, toSay);
						isSaid = true;
					}
                    setState (dev.DPs["LEVEL"], valPercent);					
				}
            }
        }
    }
	
	// You dont have it in this room
	if (!isSaid) {
		if (lang == 'en') {
			toSay = 'There is no blinds ' + model.roomsDative[sRoom][lang];
		} else
		if (lang == 'de') {
			toSay = 'Es sind keine Rolladen ' +  model.roomsDative[sRoom][lang] + ' gefunden');
		} else
		if (lang == 'ru') {
			toSay =  model.roomsDative[sRoom][lang] + ' нет жалюзей');
		} else {
			toSay = "";
		}
		
		if (toSay) {
			sayIt (lang, withLang, toSay);	
		}
	}
}

function controlRole (lang, text, withLang, arg1, arg2, arg3, ack) {
	var valPercent = null;
	var toSay = "";
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

	// find room
    var sRoom = findRoom(text);

	// find role
	var sRole = findRole(text);
	
    // Find any number
	var num = findAnyNumber(text);
	if (num !== null) {
		valPercent = num;
	}
	
	// Don't know what to do
    if (valPercent === null) {
        sayNothingToDo(lang, text, withLang);
        return;
    }
	
    var regaRoom = null;
    if (sRoom != "everywhere") {
	    regaChannel = getRoomChannel(sRoom);
		// Unknown room
		if (!regaChannel) {
			sayNoSuchRoom(lang, text, withLang);
			return;
		}
    }

    var regaRole = null;
    if (sRole != "all") {
	    regaRole = getRoleChannel(sRole);
		// Unknown function/role
		if (!regaRole) {
			sayNoSuchRole(lang, text, withLang);
			return;
		}
    }	
	var isSaid = false;
	if (lang == 'en') {
		if (valPercent == 1) {
			toSay = "Switch on ";
		} else
		if (valPercent == 0) {
			toSay = "Switch off ";
		} else {
			toSay = "Set ";
		}
		toSay += model.rolesAccusative[sRole][lang] + ' ';
		toSay += model.roomsDative[sRole][lang];
		if (valPercent != 0 && valPercent != 1) {
			toSay += ' to ' + valPercent * 100 + ' percent';
		}
	} else
	if (lang == 'de') {
		toSay = (valPercent == 0 || valPercent == 1) ? "Schalte " : "Setzte ";
		toSay += model.rolesAccusative[sRole][lang] + ' ';
		toSay += model.roomsDative[sRole][lang];
		if (valPercent != 0 && valPercent != 1) {
			toSay += ' auf ' + valPercent * 100 + ' Prozent';
		}
		if (valPercent == 0) {
			toSay = " aus";
		} else 		
		if (valPercent == 1) {
			toSay = " an";
		}		
	} else
	if (lang == 'ru') {
		if (valPercent == 1) {
			toSay = "Включаю ";
		} else
		if (valPercent == 0) {
			toSay = "Выключаю ";
		} else {
			toSay = "Устанавливаю ";
		}
		toSay += model.rolesAccusative[sRole][lang] + ' ';
		toSay += model.roomsDative[sRole][lang];
		if (valPercent != 0 && valPercent != 1) {
			toSay += ' на ' + valPercent * 100 + ' процентов';
		}
	}

    if (sRoom == "everywhere" && regaIndex["CHANNEL"]) {
        for (var devs in regaIndex["CHANNEL"]) {
            if (regaObjects[regaIndex["CHANNEL"][devs]]) {
                var dev = regaObjects[regaIndex["CHANNEL"][devs]];
				if (dev.DPs && dev.DPs["STATE"]) {
					// Check the role
					if (regaRole.indexOf(regaIndex["CHANNEL"][devs]) != -1) {
						if (!isSaid) {
							sayIt (lang, withLang, toSay);
							isSaid = true;
						}
						setState (dev.DPs["STATE"], valPercent);
					}
				}
            }
        }
    } else
    if (regaRoom) {
        // Try to find blinds in this room
        for (var devs in regaRoom) {
			var dev = regaObjects[regaRoom[devs]];
			if (dev && dev.DPs && dev.DPs["STATE"]) {
				// Check the role
				if (regaRole.indexOf(regaRoom[devs]) != -1) {				
					if (!isSaid) {
						sayIt (lang, withLang, toSay);
						isSaid = true;
					}
					setState (dev.DPs["STATE"], valPercent);
				}
			}
        }
    }
	
	// You dont have it in this room
	if (!isSaid) {
		if (lang == 'en') {
			toSay = 'There is no ' + model.rolesGenitive[sRole][lang] + ' ' + model.roomsDative[sRoom][lang];
		} else
		if (lang == 'de') {
			toSay = 'Es gibt kein' + model.rolesGenitive[sRole][lang] + ' ' + model.roomsDative[sRoom][lang] + ' gefunden');
		} else
		if (lang == 'ru') {
			toSay =  model.roomsDative[sRoom][lang] + ' нет ' + model.rolesGenitive[sRole][lang]);
		} else {
			toSay = "";
		}
		
		if (toSay) {
			sayIt (lang, withLang, toSay);	
		}
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
		var words = (model.commands[command.name].words) ? model.commands[command.name].words[lang] : null;

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
			console.log ("Found: " + JSON.stringify(model.commands[command.name].description));
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
                    console.log ("No callback for " + JSON.stringify(model.commands[command.name].description));
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

for (var cmd in model.commands) {
    if (model.commands[cmd].invisible) {
        var obj = {
            name: cmd,
            words: model.commands[cmd].words
        };
        if (model.commands[cmd].ack) {
            obj.ack = model.commands[cmd].ack;
        }

        textCommandsSettings.rules.push(obj);
    }
}
