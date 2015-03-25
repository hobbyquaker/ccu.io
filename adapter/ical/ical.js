/**
 *      CCU.IO iCal Adapter
 *      12'2013 vader722
 *
 *      Version 1.2
 *
 *      + checking predefined Events and set variable when desired
 *      + hiding Event when desired
 *      + clearing variables when there are no Events
 */

var settings = require(__dirname+'/../../settings.js');

if (!settings.adapters.ical || !settings.adapters.ical.enabled) {
    process.exit();
}

var icalSettings = settings.adapters.ical.settings;

var logger = require(__dirname+'/../../logger.js'),
    io     = require('socket.io-client'),
    RRule  = require('rrule').RRule,
    ical   = require('ical'),
    ce     = require('cloneextend');

var objects       = {},
	datapoints    = {},
    noFormatDates = [];
    preview       = icalSettings.preview,
    intervalID    = null;



var fontbold         = '<span style=\"font-weight:bold;color:' + icalSettings.defColor + '\">';
var fontnormal       = '<span style=\"font-weight:normal;color:' + icalSettings.defColor + '\">';
var fontboldorange   = '<span style="font-weight:bold;color:orange">';
var fontnormalorange = '<span style="font-weight:normal;color:orange">';
var fontboldred      = '<span style="font-weight:bold;color:red">';
var fontnormalred    = '<span style="font-weight:normal;color:red">';

var fullTime         = icalSettings.fulltime;
var colorize         = icalSettings.colorize;
var replaceDates     = icalSettings.replaceDates;
var todayString      = icalSettings.todayString;
var tomorrowString   = icalSettings.tomorrowString;
var dayafterString   = icalSettings.dayafterString;
var debug            = icalSettings.debug;
var everyCalOneColor = icalSettings.everyCalOneColor;


var warn     = fontboldred + "<span class='icalWarn'>";
var warn2    = "</span></span>" + fontnormalred + "<span class='icalWarn2'>";
var prewarn  = fontboldorange + "<span class='icalPreWarn'>";
var prewarn2 = "</span></span>" + fontnormalorange + "<span class='icalPreWarn2'>";
var preprewarn  = prewarn;
var preprewarn2 = prewarn2;
var normal   = fontbold + "<span class='icalNormal'>";
var normal2  = "</span></span>" + fontnormal + "<span class='icalNormal2'>";


var runningParser   = [];
var eventsDP        = [];
var processedEvents = [];

//Start bei firstID + 10
var idDP             = icalSettings.firstId + 10;
var idCalReadTrigger = icalSettings.firstId;
var idCalEvents      = icalSettings.firstId + 1;
var idCalEventCount  = icalSettings.firstId + 2;
var idCalEventsJson  = icalSettings.firstId + 3;

var socket;

if (settings.ioListenPort) {
	socket = io.connect("127.0.0.1", {
		port: settings.ioListenPort
	});
} else if (settings.ioListenPortSsl) {
	socket = io.connect("127.0.0.1", {
		port: settings.ioListenPortSsl,
		secure: true
	});
} else {
	process.exit();
}

socket.on('connect', function () {
    logger.info("adapter ical  connected to ccu.io");
});

socket.on('disconnect', function () {
    logger.info("adapter ical  disconnected from ccu.io");
});

socket.on('event', function (obj) {
    if (!obj || !obj[0]) {
        return;
    }
        
    var id  = obj[0];
    var val = obj[1];
    var ack = obj[3]; // normally ack should be checked to be 0
    if (ack) {
        return;
    }

    if (id == idCalReadTrigger) {
        //  logger.info("Event:"+id + " l"+val+"l");
        if (id == idCalReadTrigger && val != "" && val != "autorun" && val != "stopped") {
            var content = val.split(" ");
            //One time read all calenders
            if (content[0] == "read") {
                logger.info("adapter ical  reading one time from all callenders ");
                readAll();
            }
            // autoload starten
            if (content[0] == "start") {
                //eventuell alte Instanz stoppen
                if (intervalID) {
                    clearInterval(intervalID);
                }
                logger.info("adapter ical  startting autoload every " + icalSettings.runEveryMinutes);
                intervalID = setInterval(readAll, icalSettings.runEveryMinutes * 60000);
                setState(idCalReadTrigger, "autorun");
            }
            //autoload stoppen
            if (content[0] == "stop") {
                logger.info("adapter ical  stopping autoload");
                if (intervalID) {
                    clearInterval(intervalID);
                }
                setState(idCalReadTrigger, "stopped");
            }
            //von custom URL lesen
            if (content[0] == "readURL") {
                if (content[1] != "") {
                    logger.info("adapter ical  reading iCal from URL: " + content[1]);
                    readOne(content[1]);
                }
            }
            //Test
            if (content[0] == "check") {
                if (content[1] != "") {
                    logger.info("adapter ical  checking: " + content[1]);
                    checkForEvents(content[1]);
                }
            }
            if (content[0] == "readAll") {
                if (content[1] != "") {
                    logger.info("adapter ical  readAll ");
                    readAll();
                }
            }
        }
    }
});

/* Compare the current date against another date.
 *
 * @param b  {Date} the other date
 * @returns   -1 : if this < b
 *             0 : if this === b
 *             1 : if this > b
 *            NaN : if a or b is an illegal date
 */
Date.prototype.compare = function(b) {
    if (b.constructor !== Date) {
        throw "invalid_date";
    }

    return (isFinite(this.valueOf()) && isFinite(b.valueOf()) ?
        (this > b) - (this < b) : NaN
        );
};

function checkiCal (loc, count, calName, cb) {

    //Benötigt eine angepasste Version von node-ical, damit die übergebenden Opts auch wieder zurückkommen
    // Syntax ical.fromURL(URL,opts,callback) returns err,opts,data
        ical.fromURL(loc, calName, function (err, _calName, data) {
			if (err != undefined) {
				logger.warn("adapter ical  Error Reading from URL: " + err.toString());
			}
            logger.info("adapter ical  processing URL: " + _calName + " " + loc);
         /* for (var k in data) {
             if (data.hasOwnProperty(k)) {
             var value = data[k];
             console.log("property name is " + k + " value is " + value);
             for (var l in value) {
             if (value.hasOwnProperty(l)) {
             var val = value[l];
             console.log("property name2 is " + k + " " + l + " value is " + val);
             }
             }
             }
             }*/
            var realnow    = new Date();
            var today      = new Date();
            today.setHours(0,0,0,0);
            var endpreview = new Date();
            endpreview.setDate(endpreview.getDate() + preview);

            //Now2 1 Sekunde  zurück für Vergleich von ganztägigen Terminen in RRule
            var now2 = new Date();
            //Uhzeit nullen
            now2.setHours(0,0,0,0);
            //Datum 1 Sec zurück wegen Ganztätigen Terminen um 00:00 Uhr
            now2.setSeconds(now2.getSeconds() - 1);

            for (var k in data) {
                if (data.hasOwnProperty(k)) {
                    var ev = data[k];

                    //es interessieren nur Termine mit einer Summary und nur Einträge vom Typ VEVENT
                    if ((ev.summary != undefined) && (ev.type == "VEVENT") ) {
                        //aha, eine RRULE in dem Termin --> auswerten
                        if (ev.rrule != undefined) {
                            var options = RRule.parseString(ev.rrule.toString());
                            options.dtstart = ev.start
                            rule = new RRule(options)
                            if (debug) {
                                logger.info("adapter ical  RRule termin:" + ev.summary + " " + ev.start.toString() + " " + endpreview.toString() + " now:" + today + " now2:" + now2 +  " " +rule.toText());
                            }
                            var dates = rule.between(now2, endpreview);
                            //Termine innerhalb des Zeitfensters
                            if (dates.length > 0) {
                                for (var i = 0; i < dates.length; i++) {
                                    // ein deep-copy clone anlegen da ansonsten das setDate&co
                                    // die daten eines anderes Eintrages überschreiben
                                    var ev2 = ce.clone(ev);

                                    //Datum ersetzen für jeden einzelnen Termin in RRule
                                    //TODO: funktioniert nur mit Terminen innerhalb eines Tages, da auch das EndDate ersetzt wird
                                    ev2.start.setDate(dates[i].getDate());
                                    ev2.start.setMonth(dates[i].getMonth());
                                    ev2.start.setFullYear(dates[i].getFullYear());
                                    
                                    ev2.end.setDate(dates[i].getDate());
                                    ev2.end.setMonth(dates[i].getMonth());
                                    ev2.end.setFullYear(dates[i].getFullYear());

                                    //Termin auswerten
                                    if (ev2.exdate) {
                                        //Wenn es exdate
                                        if (ev2.exdate != today) {
                                            checkDates(ev2, endpreview, today, realnow," rrule ", _calName);
                                        }
                                    } else {
                                        checkDates(ev2, endpreview, today, realnow," rrule ", _calName);
                                    }
                                }
                            } else {
                                if (debug) {
                                    logger.info("adapter ical  Keine RRule Termine innerhalb des Zeitfensters");
                                }
                            }
                        } else {
                            //Kein RRule Termin
                            checkDates(ev, endpreview, today, realnow, " ", _calName);
                        }
                    }
                }
            }
            //wir sind fertig callback aufrufen
            cb(count);
        });
}

function checkDates (ev, endpreview, today, realnow, rule, calName) {
    var ft = false;
    var reason;

    //Check ob ganztägig
    // Für Outlook schauen ob ev.summary eventuell Unterparameter enthält
    if (ev.summary.hasOwnProperty("val")) {
        //Ja, also Betreff auslesen
        reason = ev.summary["val"];
    } else {
        //Nein
        reason = ev.summary;
    }
    //Wenn es kein Starttermin gibt --> ignorieren
    if (ev.start == undefined) {
        return;
    }

    if(ev.start.getHours()   == "0" &&
       ev.start.getMinutes() == "0" &&
       ev.start.getSeconds() == "0" &&
       ev.end.getHours()     == "0" &&
       ev.end.getMinutes()   == "0" &&
       ev.end.getSeconds()   == "0" ) {
        ft = true;
    }
    //Wenn ganztätig
    if (ft) {
        //Terminstart >= today  && < previewzeit  oder endzeitpunkt > today && < previewzeit ---> anzeigen
        if ((ev.start < endpreview && ev.start >= today) || (ev.end > today && ev.end <= endpreview)) {
            //Nur ganztägige Termine werden gefprüft
            if (checkForEvents(reason, today, ev, true, realnow)) {
                var date = formatDate(ev.start, true);

                insertSorted(noFormatDates, {
                        date:     date.text,
                        event:    reason,
                        _class:  'ical_' + calName + ' ' + date._class,
                        _date:    ev.start,
                        _calName: calName
                    });
                if (debug) {
                    logger.info("adapter ical  Termin (ganztägig) hinzugefügt : " + JSON.stringify(rule) + " " + reason + " am " + date.text);
                }
            } else {
                if (debug) {
                    logger.info("adapter ical  Termin (ganztägig) nicht dargestellt, da in Events nicht gewünscht :" + reason);
                }
            }
        } else {
            //Termin ausserhalb des Zeitfensters
            if (debug) {
                logger.info("adapter ical  Termin (ganztägig)" + JSON.stringify(rule) +  reason + " am " + ev.start.toString() + " aussortiert, da nicht innerhalb des Zeitfensters");
            }
        }
    } else {
        //Termin mit Uhrzeit
        //Startzeitpunk >= today && Startzeitpunkt < previewzeit && EndZeitpunkt >= jetzt
        if ((ev.start >= today && ev.start < endpreview && ev.end >= realnow) || (ev.end >= realnow && ev.end <= endpreview) ) {
            // logger.info("Termin mit Uhrzeit: " +rule + ev.start + " end: " + ev.end + " realnow:" +realnow);
            //Nur hinzufügen wenn gewünscht
            if (checkForEvents(reason, today, ev, false, realnow)) {
                var date = formatDate(ev.start, true);
                insertSorted(noFormatDates, {
                        date:    date.text,
                        event:   reason,
                        _class:  'ical_' + calName + ' ' + date._class,
                        _date:    ev.start,
                        _calName: calName
                    });

                if (debug) {
                    logger.info("adapter ical  Termin mit Uhrzeit hinzugefügt : " + JSON.stringify(rule) + " " + reason + " am " + date.text);
                }
            } else {
                if (debug) {
                    logger.info("adapter ical  Termin nicht dargestellt, da in Events nicht gewünscht :" + reason);
                }
            }
        } else {
            //Termin ausserhalb des Zeitfensters
            if (debug) {
                logger.info("adapter ical  Termin " + reason + " " + JSON.stringify(rule) +" am " + ev.start.toString() + " aussortiert, da nicht innerhalb des Zeitfensters");
            }
        }
    }
}
function colorizeDates(date, today, tomorrow, dayafter, col) {
     var result = {
         prefix: normal,
         suffix: normal2
     };
    date.setHours(0,0,0,0);

    //Colorieren wenn gewünscht
    if (colorize) {
        //Heute
        if (date.compare(today) == 0) {
            result.prefix = warn;
            result.suffix = warn2;
        } else
        //Morgen
        if (date.compare(tomorrow) == 0) {
            result.prefix = prewarn;
            result.suffix = prewarn2;
        } else
        if (date.compare(dayafter) == 0) {
            result.prefix = preprewarn;
            result.suffix = preprewarn2;
        } else
        //Starttermin in der Vergangenheit
        if (date.compare(today) == -1) {
            result.prefix = normal;
            result.suffix = normal2;
        }
    } else {
        //Wenn gewünscht jeder Kalender eigene Farbe
        if (everyCalOneColor) {
            console.log("Farbe:" + col);
            result.prefix = '<span style=\"font-weight:bold;color:' + col + '\">' + "<span class='icalNormal'>";
            result.suffix = "</span></span>" + '<span style=\"font-weight:normal;color:' + col + '\">' + "<span class='icalNormal2'>";
        }
    }
    return result;
}

function checkForEvents(betreff, today, ev, ft, realnow) {
    var id;
    //unbekannte Events darstellen
    var rv = true;

    // Schauen ob es ein Event in der Tabelle gibt
    for (var counter in eventsDP) {
        if (betreff.search(new RegExp(eventsDP[counter]["Event"], 'g')) > -1) {
            id = eventsDP[counter]["ID"];
            //auslesen ob das Event angezeigt werden soll
            rv = eventsDP[counter]["display"];
            if (debug) {
                logger.info("adapter ical  found Event in Table: " + eventsDP[counter]["Event"] + " " + id);
            }

            if (ft) {
                //Ganztägige Termine
                //Nur weitermachen wenn der Termin today ist
                if ((ev.start <= today) && (ev.end >= today)) {
                    //merken welche Events wir bearbeitet haben
                    processedEvents.push(betreff);
                    //Wenn schon bearbeitet
                    if (eventsDP[counter]["processed"]) {
                        //nix tun
                        if (debug) {
                            logger.info("adapter ical  Event schon bearbeitet");
                        }
                    } else {
                        //Ansonsten bearbeiten
                        eventsDP[counter]["processed"] = true;
                        eventsDP[counter]["state"] = true;
                        logger.info("adapter ical  Setze ID: " + id + " auf true");
                        setState(id, true);
                    }
                }
            } else {
                //Termine mit Uhrzeit
                //Nur weitermachen wenn der Termin aktuell gültig ist
                console.log("Termin mit Uhrzeit:" + ev.start + " " + realnow + " " + ev.end);
                if ((ev.start <= realnow) && (ev.end >= realnow)) {
                    //if ((ev.start >= today && ev.start < endpreview && ev.end >= realnow) || (ev.end >= realnow && ev.end <= endpreview) ) {
                    //merken welche Events wir bearbeitet haben
                    processedEvents.push(betreff);
                    //Wenn schon bearbeitet
                    if (eventsDP[counter]["processed"]) {
                        //nix tun
                        if (debug) {
                            logger.info("adapter ical  Event schon bearbeitet");
                        }
                    } else {
                        //Ansonsten bearbeiten
                        eventsDP[counter]["processed"] = true;
                        eventsDP[counter]["state"] = true;
                        logger.info("adapter ical  Setze ID: " + id + " auf true");
                        setState(id, true);
                    }
                }
            }
        }
    }
    return rv;
}

function pastProcessEvents() {
    // Tabelle durchgehen
    var found = false;
    for (var counter in eventsDP) {
        if (eventsDP[counter]["processed"]) {
            //Dieses Element wurde bearbeitet --> nun schauen ob es auch in diesem Durchlauf noch vorhanden war
            for (var i in processedEvents) {
                if (processedEvents[i].search(new RegExp(eventsDP[counter]["Event"], 'g')) > -1) {
                //if (processedEvents[i] == eventsDP[counter]["Event"]) {
                    found = true;
                }
            }
            if (found) {
                //Alles gut, Element noch da
            } else {
                //Nein, also Event vorbei --> Variable auf false
                eventsDP[counter]["processed"] = false;
                eventsDP[counter]["state"] = false;
                var id = eventsDP[counter]["ID"];
                logger.info("adapter ical  Setze ID: " + id + " auf false");
                setState(id,false);
            }
       }
    }
    //Abgearbeitet --> Array löschen
    processedEvents.length = 0;
}

function createEventsDP() {
    var id;
    var found = false;
    var eintrag;

    //In den Settings schauen ob es ein Event gibt
    for (var ev in icalSettings["Events"]) {
        //Anlegen in CCU.IO
        setObject(idDP , {
            Name: ev,
            TypeName: "VARDP"
        });
        //console.log("yo:" + icalSettings["Events"][ev]["enabled"]);
        if(icalSettings["Events"][ev]["enabled"]) {
            //Anlegen in interner Liste
            var evDP = new Object();
            evDP["Event"] = ev;
            evDP["ID"] = idDP;
            evDP["processed"] = false;
            evDP["state"] = false;
            evDP["display"] = icalSettings["Events"][ev]["display"];
            eventsDP.push(evDP);
            //Beim start alle ablöschen
            setState(idDP,false);
        }
        idDP += 1;
    }
}

//Alle Kalender einlesen
function readAll() {
    noFormatDates = [];
	var count = 0;
	
	//neue Notation
	if (icalSettings["Calendar"]) {
        //eigene Instanz hinzufügen, falls die Kalender schnell abgearbeitet werden
        runningParser.push(0);
		for (var cal in icalSettings["Calendar"]) {
			if ((icalSettings["Calendar"][cal]["calURL"] != "") && (icalSettings["Calendar"][cal]["calURL"] != undefined)) {
				count += 1;
			 	if (debug) {
                    logger.info("adapter ical  reading Calendar from URL: " + JSON.stringify(icalSettings["Calendar"][cal]) + " color: " + icalSettings["Calendar"][cal]["calColor"] );
                }
                //merker für Kalender hinzufügen
                runningParser.push(count);
                checkiCal(icalSettings["Calendar"][cal]["calURL"], count, cal, function (count) {
                    //diese Instanz aus Liste löschen
                    runningParser.pop();
                    //Wenn diese Instanz die letzte ist, dann darstellen
                    if (runningParser.length == 0) {
                        if (debug) {
                            logger.info("adapter ical  displaying dates because of callback");
                        }
                        displayDates();
                    }
                });
			}
		}
        //unsere Instanz löschen
        runningParser.pop();
        //Wenn es die letzte Instanz war, dann darstellen
        if (runningParser.length == 0) {
            if (debug) {logger.info("adapter ical  displaying dates");}
            displayDates();
        }
	}
}

//Einen Kalender einlesen
function readOne(url) {
    noFormatDates = [];
	checkiCal(url, icalSettings.defColor, 1, '', function (count) {
        //Returnwert egal, da nur ein Kalender
        //Auswertung fertig --> Darstellen
        displayDates();
    });
}

function formatDate (_date, withTime) {
    var day   = _date.getDate();
    var month = _date.getMonth() + 1;
    var year  = _date.getFullYear();
    var _time = "";

    if (withTime) {
        var hours   = _date.getHours();
        var minutes = _date.getMinutes();
        if (fullTime && !hours && !minutes) {
            _time = ' ' + fullTime;
        } else {
            if (hours < 10) {
                hours = "0" + hours.toString();
            }
            if (minutes < 10) {
                minutes = "0" + minutes.toString();
            }

            _time = " " + hours + ":" + minutes;
        }
    }
    var _class = '';
    var d = new Date();
    if (day   == d.getDate() &&
        month == (d.getMonth() + 1) &&
        year  == d.getFullYear()) {
        _class = 'ical_today';
    }
    d.setDate(d.getDate() + 1);
    if (day   == d.getDate() &&
        month == (d.getMonth() + 1) &&
        year  == d.getFullYear()) {
        _class = 'ical_tomorrow';
    }
    d.setDate(d.getDate() + 1);
    if (day   == d.getDate() &&
        month == (d.getMonth() + 1) &&
        year  == d.getFullYear()) {
        _class = 'ical_dayafter';
    }

    if (replaceDates) { 
        if (_class == 'ical_today') {
            return {text: todayString + _time, _class: _class};
        }
        if (_class == 'ical_tomorrow') {
            return {text: tomorrowString + _time, _class: _class};
        }
        if (_class == 'ical_dayafter') {
            return {text: dayafterString + _time, _class: _class};
        }
    }

    if (icalSettings.dataPaddingWithZeros) {
        day   = day;
        month = month;

        if (day < 10) {
            day = "0" + day.toString();
        }
        if (month < 10) {
            month = "0" + month.toString();
        }
    }

    return {text: day + "." + month + "." + year + _time, _class: _class};
}

//Darstellen nachdem alle eingelesen wurden
function displayDates() {
    if (noFormatDates.length) {
        setState(idCalEvents, brSeparatedList(noFormatDates));
        //Erweiterung von nicx
        var todayEventcounter = 0;
        for (var t = 0; t < noFormatDates.length; t++) {
            if (noFormatDates[t]._class.indexOf('ical_today') != -1) {
                todayEventcounter++;
            }
        }
        setState(idCalEventCount, todayEventcounter);
        setState(idCalEventsJson, JSON.stringify(noFormatDates));
    } else {
        setState(idCalEvents, "");
        setState(idCalEventCount = 0);
        setState(idCalEventsJson , "");
    }

    //Am Ende schauen ob Events vorbei sind
    pastProcessEvents();
}

function insertSorted (arr, element) {
    if (!arr.length) {
        arr.push(element);
    } else {
        if (arr[0]._date > element._date) {
            arr.unshift(element);
        } else if (arr[arr.length - 1]._date < element._date) {
            arr.push(element);
        } else {
            if (arr.length == 1) {
                arr.push(element);
            } else {
                for (var i = 0; i < arr.length - 1; i++){
                    if (arr[i]._date <= element._date &&
                        arr[i + 1]._date > element._date) {
                        arr.splice(i + 1, 0, element);
                        element = null;
                        break;
                    }
                }
                if (element) {
                    arr.push(element);
                }
            }
        }
    }
}

function brSeparatedList(arr) {
    var text     = "";
    var first    = true;

    var today    = new Date();
    var tomorrow = new Date();
    var dayafter = new Date();
    today.setHours(0,0,0,0);
    tomorrow.setDate(today.getDate() + 1);
    tomorrow.setHours(0,0,0,0);
    dayafter.setDate(tomorrow.getDate() + 1);
    dayafter.setHours(0,0,0,0);

    for (var i = 0; i < noFormatDates.length; i++) {
        var date = formatDate(noFormatDates[i]._date, true);
        var xfix = colorizeDates(noFormatDates[i]._date, today, tomorrow, dayafter, icalSettings["Calendar"][noFormatDates[i]._calName]["calColor"]);

        if (!first) {
            text += "<br/>";
        } else {
            first = false;
        }
        text += xfix.prefix + date.text + xfix.suffix + " " + noFormatDates[i].event + "</span></span>";
    }

    return text;
}

function stop() {
    logger.info("adapter ical  terminating");
    if (intervalID) {
        clearInterval(intervalID);
    }
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
	logger.verbose("adapter ical  setState "+id+" "+val);
	socket.emit("setState", [id,val,null,true]);
}

function iCalInit() {
    
	setObject(idCalReadTrigger, {
        Name: "iCalReadTrigger",
        TypeName: "VARDP"
    });
	
	setObject(idCalEvents , {
        Name: "iCalEvents",
        TypeName: "VARDP"
    });
    setObject(idCalEventCount , {
        Name: "iCalEventCount",
        TypeName: "VARDP"
    });
    setObject(idCalEventsJson , {
        Name: "iCalEventsJson",
        TypeName: "VARDP"
    });

    createEventsDP();
	
    logger.info("adapter ical  objects inserted, starting at: " + idCalReadTrigger);

    if (icalSettings.runEveryMinutes > 0) {
        //Autostart --> first read in 4sec
	    setTimeout(readAll, 4000);
        //now schedule
        var runeveryminutes = icalSettings.runEveryMinutes * 60000;
        logger.info("adapter ical  autorun every " + icalSettings.runEveryMinutes + " Minutes");
        setState(idCalReadTrigger, "autorun");
        //intervalID = setInterval(function() {checkiCal(icalSettings.defURL)},runeveryminutes);
        intervalID = setInterval(readAll, runeveryminutes);
	}
}

logger.info("adapter ical  start");

iCalInit();

