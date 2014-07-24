/**
 *      CCU.IO Listen Adapter
 *      07'2014 Bluefox
 *
 *      Version 0.3
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
var adapter  = require(__dirname + '/../../utils/adapter-init.js').Adapter("textCommands");
var http     = require('http'),
    https    = require('https'),
	model    = require(__dirname + '/langModel.js');

adapter.settings.language = adapter.settings.language || 'de';

var objProcess     = adapter.firstId;
var objError       = objProcess + 1;

var regaIndex      = null;
var regaObjects    = null;

var commandsCallbacks = {
	'whatTimeIsIt' :       sayTime,
	'whatIsYourName' :     sayName,
	'outsideTemperature' : sayOutsideTemperature,
	'insideTemperature' :  sayInsideTemperature,
    'userDeviceControl' :  userDeviceControl,
    'blindsUpDown' :       controlBlinds,
    'roleOnOff' :          controlRole,
    'openLock' :           openLock
};

adapter.onConnect = function () {
    // Fetch Data
    adapter.socket.emit('getIndex', function(index) {
        regaIndex = index;
        adapter.socket.emit('getObjects', function(objects) {
            adapter.info("fetched regaObjects")
            regaObjects = objects;
        });
    });

};

adapter.onEvent = function (id, val, ts, ack) {
 	if (id == objProcess && val && !ack) {
        processCommand(val);
	}
};

function sayIDontKnow (lang, withLang) {
    sayIt(lang, withLang, model.sayIDontKnow(lang));
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
    adapter.getState(72959, function (id, val) {
        if (!val) {
            sayIt(lang, withLang, model.sayNoName(lang));
        } else {
            var words = val.toString().split ("/");
            sayIt(lang, withLang, model.sayName(lang, words[0]));
        }
    });
}

function sayIt(lang, withLang, text) {
    if (text) {
        adapter.info("adapter textCommands: response - '" + ((withLang ? (lang ? lang + ";" : "") : "") + text) + "'");
        // Write answer back
        adapter.setState(objProcess, (withLang ? (lang ? lang + ";" : "") : "") + text);

        if (adapter.settings.sayIt) {
            if (lang) {
                adapter.setState(adapter.settings.sayIt, lang + ";" + text);
            } else {
                adapter.setState(adapter.settings.sayIt, text);
            }
        }
    } else {
        adapter.warn("language " + lang + " not supported");
    }
}

function sayIDontUnderstand (lang, text, withLang) {
    sayIt(lang, withLang, model.sayIDontUnderstand (lang, text));
}

function sayNoSuchRoom (lang, text, withLang) {
    sayIt(lang, withLang, model.sayNoSuchRoom (lang));
}

function sayNothingToDo (lang, text, withLang) {
    sayIt(lang, withLang, model.sayNothingToDo (lang));
}

function sayNoSuchRole (lang, text, withLang) {
    sayIt(lang, withLang, model.sayNoSuchRole (lang));
}

function sayOutsideTemperature (lang, text, withLang, arg1, arg2, arg3) {
	if (!arg1) {
		sayIDontKnow (lang, withLang);
		return;
	}
    adapter.getState(arg1, function (id, val) {
		if (val === null || val === undefined) {
			sayIDontKnow (lang, withLang);
			return;
		}

		var t  = val.toString().replace("&deg;", "").replace(",", ".");
		var t_ = parseFloat(t);
		t_ = Math.round(t_);
		
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
			sayIt(lang, withLang, "Temperature draußen ist " + t_ + " grad");
		}
		else if (lang == "en") {
			sayIt(lang, withLang, "Outside temperature is " + t_ + " gradus");
		}
		else {
            adapter.error ("Language " + lang + " is not supported");
		}	
	});
}

function sayInsideTemperature (lang, text, withLang, arg1, arg2, arg3) {
	if (!arg1) {
		sayIDontKnow (lang, withLang);
		return;
	}

    adapter.getState(arg1, function (id, val) {
		if (val === null || val === undefined) {
			sayIDontKnow (lang, withLang);
			return;
		}
	
		var t  = val.toString().replace("&deg;", "").replace(",", ".");
		var t_ = parseFloat(t);
		t_ = Math.round(t_);
		
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
            adapter.error ("Language " + lang + " is not supported");
		}	
	});
}

function userDeviceControl (lang, text, withLang, arg1, arg2, arg3, ack) {
    adapter.info("write to ID " + arg1 + " value: " + arg2)
    adapter.setState(arg1, arg2);
    if (ack) {
        if (ack[0] == '[') {
            try {
                var obj = JSON.parse(ack);
                sayIt(null, withLang, model.getRandomPhrase(obj));
            } catch(ex) {
                adapter.warn("Cannot parse acknowledge :" + ack);
                sayIt(null, withLang, ack);
            }
        } else {
            sayIt(null, withLang, ack);
        }
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

function findRoom (text, lang) {
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

function findRole (text, lang) {
    var sRole = "";
    for (var role in model.roles) {
        var words = model.roles[role][lang].split("/");
        for (var w = 0; w < words.length; w++) {
            if (text.indexOf (words[w]) != -1) {
                sRole = role;
                break;
            }
        }
        if (sRole) {
            break;
        }
    }
    return sRole;
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
				for (var lang in sWhat) {
					var words = sWhat[lang].split("/");
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
		return getChannel(model.rooms[sRoom], "ENUM_ROOMS");
    }
	return null;
}

function getRoleChannel (sRole) {
	if (sRole != "all") {
		return getChannel(model.roles[sRole], "ENUM_FUNCTIONS");
    }
	return null;
}

function controlBlinds (lang, text, withLang, arg1, arg2, arg3, ack) {
	var valPercent = null;
	var toSay = "";
    var defaultRoom = "";
    var pos = text.indexOf(";");
    if (pos != -1) {
        defaultRoom = text.substring(pos + 1);
        text = text.substring(0, pos);
    }

    if (lang == "ru") {
        // test operation
        if (text.indexOf ("открыть") != -1 || text.indexOf ("подними") != -1 || text.indexOf ("открой") != -1 || text.indexOf ("открою") != -1 || text.indexOf ("поднять") != -1) {
            valPercent = 1;
        }
        else
        if (text.indexOf ("закрыть") != -1 || text.indexOf ("закрой") != -1 || text.indexOf ("закрою") != -1 || text.indexOf ("опусти") != -1 || text.indexOf ("опустить") != -1) {
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
        adapter.error("Language " + lang + " is not supported");
        return;
    }

    // find room
    var sRoom = findRoom(text, lang);
    if (!sRoom) {
        sRoom = defaultRoom;
    }
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
        regaRoom = getRoomChannel(sRoom, lang);
		// Unknown room
		if (!regaRoom) {
			sayNoSuchRoom(lang, text, withLang);
			return;
		}
    }
	
	var isSaid = false;
	if (!toSay) {
		if (lang == 'en') {
			toSay = ((valPercent > 0.5) ? 'Open' : 'Close') +
			' the shutter ' + 
			model.roomsDative[sRoom][lang] + 
			((valPercent != 0 && valPercent != 1) ? ' on ' + (valPercent * 100) + ' percent': '');
		} else
		if (lang == 'de') {
			toSay = 'Mache' +
			' die Rolladen ' + 
			model.roomsDative[sRoom][lang] + 
			((valPercent != 0 && valPercent != 1) ? ' auf ' + (valPercent * 100) + ' Prozent': '') +
			((valPercent > 0.5) ? ' auf' : ' zu');
		} else
		if (lang == 'ru') {
			toSay = ((valPercent > 0.5) ? 'Открываю' : 'Закрываю') +
			' окна ' + model.roomsDative[sRoom][lang];

			if (valPercent != 0 && valPercent != 1) {
                var nn = valPercent * 100;
                toSay += ' на ' + valPercent * 100 + ' ';
                if (nn > 4 && nn < 21) {
                    toSay += 'процентов';
                } else {
                    nn = nn % 10;
                    if (nn == 1) {
                        toSay += 'процент';
                    } else if (nn == 2 || nn == 3 || nn == 4) {
                        toSay += 'процентa';
                    } else {
                        toSay += 'процентов';
                    }
                }
            }
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

                    adapter.setState(dev.DPs["LEVEL"], valPercent);
				}
            }
        }
    } else
    if (regaRoom) {
        // Try to find blinds in this room
        for (var devs in regaRoom) {
            if (regaObjects[regaRoom[devs]].HssType == "BLIND") {
                var dev = regaObjects[regaRoom[devs]];
                if (dev.DPs && dev.DPs["LEVEL"]) {
					if (!isSaid) {
						sayIt (lang, withLang, toSay);
						isSaid = true;
					}
                    adapter.setState(dev.DPs["LEVEL"], valPercent);
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
			toSay = 'Es sind keine Rolladen ' +  model.roomsDative[sRoom][lang] + ' gefunden';
		} else
		if (lang == 'ru') {
			toSay =  model.roomsDative[sRoom][lang] + ' нет жалюзей';
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
    var defaultRoom = "";
    var pos = text.indexOf(";");
    if (pos != -1) {
        defaultRoom = text.substring(pos + 1);
        text = text.substring(0, pos);
    }

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
        adapter.error("Language " + lang + " is not supported");
        return;
    }

	// find room
    var sRoom = findRoom(text, lang);
    if (!sRoom) {
        sRoom = defaultRoom;
    }

	// find role
	var sRole = findRole(text, lang);
	
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
        regaRoom = getRoomChannel(sRoom, lang);
		// Unknown room
		if (!regaRoom) {
			sayNoSuchRoom(lang, text, withLang);
			return;
		}
    }

    var regaRole = null;
    if (sRole != "all") {
	    regaRole = getRoleChannel(sRole, lang);
		// Unknown function/role
		if (!regaRole) {
			sayNoSuchRole(lang, text, withLang);
			return;
		}
    }	
	var isSaid = false;
	if (lang == 'en') {
		if (valPercent == 1 || valPercent === "true") {
			toSay = "Switch on ";
		} else
		if (valPercent == 0 || valPercent === "false") {
			toSay = "Switch off ";
		} else {
			toSay = "Set ";
		}
		toSay += model.rolesAccusative[sRole][lang] + ' ';
		toSay += model.roomsDative[sRoom][lang];
		if (valPercent != 0 && valPercent != 1 && valPercent !== "true" && valPercent !== "false") {
			toSay += ' to ' + valPercent * 100 + ' percent';
		}
	} else
	if (lang == 'de') {
		toSay = (valPercent == 0 || valPercent == 1 || valPercent == "true" || valPercent == "false") ? "Schalte " : "Setzte ";
		toSay += model.rolesAccusative[sRole][lang] + ' ';
		toSay += model.roomsDative[sRoom][lang];
		if (valPercent != 0 && valPercent != 1 && valPercent !== "true" && valPercent !== "false") {
			toSay += ' auf ' + valPercent * 100 + ' Prozent';
		}
		if (valPercent == 0 || valPercent == "false") {
			toSay = " aus";
		} else 		
		if (valPercent == 1 || valPercent == "true") {
			toSay = " an";
		}		
	} else
	if (lang == 'ru') {
		if (valPercent == 1 || valPercent === "true") {
			toSay = "Включаю ";
		} else
		if (valPercent == 0 || valPercent === "false") {
			toSay = "Выключаю ";
		} else {
			toSay = "Устанавливаю ";
		}
		toSay += model.rolesAccusative[sRole][lang] + ' ';
		toSay += model.roomsDative[sRoom][lang];
		if (valPercent != 0 && valPercent != 1 && valPercent !== "true" && valPercent != "false") {
            var nn = valPercent * 100;
			toSay += ' на ' + valPercent * 100 + ' ';
            if (nn > 4 && nn < 21) {
                toSay += 'процентов';
            } else {
                nn = nn % 10;
                if (nn == 1) {
                    toSay += 'процент';
                } else if (nn == 2 || nn == 3 || nn == 4) {
                    toSay += 'процентa';
                } else {
                    toSay += 'процентов';
                }
            }
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
							sayIt(lang, withLang, toSay);
							isSaid = true;
						}
                        adapter.setState(dev.DPs["STATE"], valPercent);
					}
				} else
                if (dev.DPs && dev.DPs["LEVEL"]) {
                    // Check the role
                    if (regaRole.indexOf(regaIndex["CHANNEL"][devs]) != -1) {
                        if (!isSaid) {
                            sayIt (lang, withLang, toSay);
                            isSaid = true;
                        }
                        adapter.setState(dev.DPs["LEVEL"], valPercent);
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
						sayIt(lang, withLang, toSay);
						isSaid = true;
					}
                    adapter.setState(dev.DPs["STATE"], valPercent);
				}
			} else {
                if (dev && dev.DPs && dev.DPs["LEVEL"]) {
                    // Check the role
                    if (regaRole.indexOf(regaRoom[devs]) != -1) {
                        if (!isSaid) {
                            sayIt(lang, withLang, toSay);
                            isSaid = true;
                        }
                        adapter.setState(dev.DPs["LEVEL"], valPercent);
                    }
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
			toSay = 'Es gibt kein' + model.rolesGenitive[sRole][lang] + ' ' + model.roomsDative[sRoom][lang];
		} else
		if (lang == 'ru') {
			toSay =  model.roomsDative[sRoom][lang] + ' нет ' + model.rolesGenitive[sRole][lang];
		} else {
			toSay = "";
		}
		
		if (toSay) {
			sayIt (lang, withLang, toSay);	
		}
	}	
}

function openLock (lang, text, withLang, arg1, arg2, arg3, ack, rule) {
    if (rule.value === undefined || rule.value === null || !rule.time || (new Date().getTime() - rule.time > 10000)) {
        rule.value = null;
        var toSay = "";
        var defaultRoom = "";
        var pos = text.indexOf(";");
        if (pos != -1) {
            defaultRoom = text.substring(pos + 1);
            text = text.substring(0, pos);
        }

        if (lang == "ru") {
            // test operation
            if (text.indexOf("открыть") != -1 || text.indexOf("открой") != -1 || text.indexOf("открою") != -1) {
                rule.value = 2;
            }
            else
            if (text.indexOf("закрыть") != -1 || text.indexOf("закрой") != -1 || text.indexOf("закрою") != -1) {
                rule.value = 0;
            }
        }
        else if (lang == "de") {
            // test operation
            if (text.indexOf (" auf") != -1 ||
                text.indexOf ("aufmachen") != -1
                ) {
                rule.value = 2;
            }
            else
            if (text.indexOf ("zumachen") != -1 ||
                text.indexOf (" zu") != -1) {
                rule.value = 0;
            }
        }
        else if (lang == "en") {
            // test operation
            if (text.indexOf ("open") != -1) {
                rule.value = 2;
            }
            else
            if (text.indexOf ("close") != -1) {
                rule.value = 0;
            }
        }
        else {
            adapter.error("Language " + lang + " is not supported");
            return;
        }
        if (rule.value !== null) {
            rule.time = new Date().getTime();
            sayIt(lang, withLang, model.sayAreYouSure(lang));
        }
    } else {
        var toSay = "";
        var isYes = false;
        var pos = text.indexOf(";");
        if (pos != -1) {
            defaultRoom = text.substring(pos + 1);
            text = text.substring(0, pos);
        }

        if (lang == "ru") {
            // test operation
            if (text.indexOf("да") != -1 || text.indexOf("конечно") != -1 || text.indexOf("всенепременно") != -1) {
                isYes = true;
            }
            else
            if (text.indexOf("нет") != -1 || text.indexOf("отмена") != -1) {
                isYes = false;
            }
        }
        else if (lang == "de") {
            // test operation
            if (text.indexOf ("ja") != -1 ||
                text.indexOf ("natürlich") != -1
                ) {
                isYes = true;
            }
            else
            if (text.indexOf ("nein") != -1 || text.indexOf ("nicht") != -1 || text.indexOf ("abbrechen") != -1) {
                isYes = false;
            }
        }
        else if (lang == "en") {
            // test operation
            if (text.indexOf ("yes") != -1 || text.indexOf ("cause") != -1) {
                isYes = true;
            }
            else
            if (text.indexOf ("no") != -1 || text.indexOf ("not") != -1 || text.indexOf ("cancel") != -1) {
                isYes = false;
            }
        }
        else {
            adapter.error("Language " + lang + " is not supported");
            return;
        }
    }
}

function processCommand (cmd) {
    if (!regaIndex || !regaObjects) {
        sayIt(adapter.settings.language, false, "Not ready");
        return;
    }
    adapter.info("request  - '" + cmd + "'");

    var isNothingFound = true;
    var withLang = false;
    var ix = cmd.indexOf (";");
    var lang = adapter.settings.language;
    cmd = cmd.toLowerCase();

    if (ix != -1) {
        withLang = true;
        lang = cmd.substring (0, ix);
        cmd = cmd.substring(ix + 1);
    }
    var cmdWords = cmd.split(" ");

	for (var i = 0; i < adapter.settings.rules.length; i++) {
		var command = adapter.settings.rules[i];
        if (!model.commands[command.name]) continue;

		//console.log ("Check: " + command.name);
		var words = (model.commands[command.name].words) ? model.commands[command.name].words[lang] : null;

        if (!words) {
            words = adapter.settings.rules[i].words;
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
			adapter.info("Found: " + JSON.stringify(model.commands[command.name].description));
			if (commandsCallbacks [command.name])
				commandsCallbacks [command.name] (lang, cmd, withLang, command["arg1"], command["arg2"], command["arg3"], command["ack"]);
			else {
                if (command.ack) {
                    if (typeof command.ack == "object") {
                        sayIt(lang, withLang, model.getRandomPhrase(command.ack[lang] || command.ack['en']));
                    } else {
                        sayIt(lang, withLang, model.getRandomPhrase(command.ack));
                    }
                } else {
                    console.log ("No callback for " + JSON.stringify(model.commands[command.name].description));
                }
			}
			break;
		}
	}

    if (isNothingFound && adapter.settings.keywords) {
        sayIDontUnderstand (lang, cmd, withLang);
    }
}

adapter.createDP(objProcess, null, "TextCommand.Command");
adapter.createDP(objError, null, "TextCommand.Error");

// Add own commands
if (!adapter.settings.rules) {
    adapter.settings.rules = [];
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

        adapter.settings.rules.push(obj);
    }
}
