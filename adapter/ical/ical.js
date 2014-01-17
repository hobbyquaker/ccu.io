/**
 *      CCU.IO iCal Adapter
 *      12'2013 vader722
 *
 *      Version 0.5
 *		
 */
var settings = require(__dirname+'/../../settings.js');

if (!settings.adapters.ical || !settings.adapters.ical.enabled) {
    process.exit();
}

var icalSettings = settings.adapters.ical.settings;

var logger = require(__dirname+'/../../logger.js'),
    io     = require('socket.io-client');

var objects = {},
	datapoints = {};
var ical = require('ical'), months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mai', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dez']
var RRule = require('rrule').RRule;
var preview = icalSettings.preview;
var intervalID;
var fontbold = '<span style=\"font-weight:bold;color:'+icalSettings.defColor+'\">';
var fontnormal = '<span style=\"font-weight:normal;color:'+icalSettings.defColor+'\">';
var fontboldorange = '<span style="font-weight:bold;color:orange">';
var fontnormalorange = '<span style="font-weight:normal;color:orange">';
var fontboldred = '<span style="font-weight:bold;color:red">';
var fontnormalred = '<span style="font-weight:normal;color:red">';
var fullTime = icalSettings.fulltime;
var colorize = icalSettings.colorize;
var minoneorange = 0;
var minonered = 0;
var arrDates = Array();

var warn = fontboldred;
var warn2 =fontnormalred;
var prewarn = fontboldorange;
var prewarn2 = fontnormalorange;
var normal = fontbold;
var normal2 = fontnormal;
var debug = icalSettings.debug;

var prefix;
var suffix;


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
    logger.info("adapter iCal  connected to ccu.io");
});

socket.on('disconnect', function () {
    logger.info("adapter iCal  disconnected from ccu.io");
});

socket.on('event', function (obj) {
    if (!obj || !obj[0]) {
        return;
    }
        
    var id = obj[0];
    var val = obj[1];
    var ts = obj[2];
    var ack = obj[3];
        if (obj[0] == icalSettings.firstId) {
          //  logger.info("Event:"+id + " l"+val+"l");
                if (id == icalSettings.firstId && val != "" && val !="autorun" && val != "stopped") {
					var content = val.split(" ");
					setState(icalSettings.firstId + 1, "");
                    //von defURL lesen
					if (content[0] == "read") {
						logger.info("adapter ical reading iCal from default URL: " + icalSettings.defURL);
						readOne(icalSettings.defURL);
					}
                    // autoload starten
                    if (content[0] == "start") {
                        //eventuell alte Instanz stoppen
                        clearInterval(intervalID);
                        logger.info("adapter ical startting autoload every " + icalSettings.runEveryMinutes);
						intervallID = setInterval(readAll,icalSettings.runEveryMinutes * 60000);
                        setState(icalSettings.firstId, "autorun");
                    }
                    //autoload stoppen
                    if (content[0] == "stop") {
                        logger.info("adapter ical stopping autoload");
                        clearInterval(intervalID);
                        setState(icalSettings.firstId, "stopped");
                    }
					//von custom URL lesen
					if (content[0] == "readURL") {
						if (content[1] != "") {
							logger.info("adapter ical reading iCal from URL: " + content[1]);
							readOne(content[1]);
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
        (this>b)-(this<b) : NaN
        );
};



function checkiCal(loc) {

        ical.fromURL(loc, {}, function (err, data) {
			if (err != undefined) {
				logger.info("adapter ical Error Reading from URL: " + err.toString());
			}
           logger.info("adapter ical processing URL" + loc);
            //Variable ablöschen
            setState(icalSettings.firstId + 1, "");
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

            for (var k in data) {
                if (data.hasOwnProperty(k)) {
                    var ev = data[k];
                    var endpreview = new Date();
					var realnow = new Date();
                    var heute = new Date();

					endpreview.setDate(endpreview.getDate() + preview);
                    heute.setHours(0,0,0,0);
					//Now2 1 Sekunde  zurück für Vergleich von ganztägigen Terminen in RRule
					var now2 = new Date();
					//Uhzeit nullen
					now2.setHours(0,0,0,0);
					//Datum 1 Sec zurück wegen Ganztätigen Terminen um 00:00 Uhr
					now2.setSeconds(now2.getSeconds() - 1);
                    tomorrow = new Date();
                    tomorrow.setDate(heute.getDate() + 1);
                    tomorrow.setHours(0,0,0,0);
                    tomorrow2 = new Date();
					
                    //es interessieren nur Termine mit einer Summary
                    if (ev.summary != undefined) {
                    //aha, eine RRULE in dem Termin --> auswerten
                        if (ev.rrule != undefined) {
                            var options = RRule.parseString(ev.rrule.toString());
                            options.dtstart = ev.start
                            rule = new RRule(options)
                            if (debug) {logger.info("RRule termin:" + ev.summary + " " + ev.start.toString() + " " + endpreview.toString() + " now:" + heute + " now2:" + now2 +  " " +rule.toText());}
                            var dates = rule.between(now2, endpreview);
                            //Termine innerhalb des Zeitfensters
                            if (dates.length > 0) {
                                for (var i = 0; i < dates.length; i++) {
                                    //Datum ersetzen für jeden einzelnen Termin in RRule
                                    //TODO: funktioniert nur mit Terminen innerhalt eines Tages, da auch das EndDate ersetzt wird
                                    ev.start.setDate(dates[i].getDate());
                                    ev.start.setMonth(dates[i].getMonth());
                                    ev.start.setFullYear(dates[i].getFullYear());
                                    ev.end.setDate(dates[i].getDate());
                                    ev.end.setMonth(dates[i].getMonth());
                                    ev.end.setFullYear(dates[i].getFullYear());
                                    //Termin auswerten
                                    checkDates(ev,endpreview,heute,tomorrow,realnow," rrule ");
                                }
                            } else {
                                if (debug) {logger.info("Keine RRule Termine innerhalb des Zeitfensters");}
                            }
                        } else {
                            //Kein RRule Termin
                            checkDates(ev,endpreview,heute,tomorrow,realnow," ");

                        }
                    }
                }
            }
           
        })

}

function checkDates(ev,endpreview,heute,tomorrow,realnow,rule) {
    var ft = false;
    //Check ob ganztägig
    if(ev.start.getHours() == "0" && ev.start.getMinutes() == "0" && ev.start.getSeconds() == "0" && ev.end.getHours() == "0" && ev.end.getMinutes() == "0" && ev.end.getSeconds() == "0" ) {
        ft = true;
    }
    //Wenn ganztätig
    if (ft) {
        //Terminstart >= heute  && < previewzeit ---> anzeigen
        if (ev.start < endpreview && ev.start >= heute) {
            var MyTimeString = ('0' + ev.start.getHours()).slice(-2) + ':' + ('0' + (ev.start.getMinutes())).slice(-2);
            colorizeDates(ev,heute,tomorrow);
            var singleDate = prefix + ev.start.getDate() + "." + (ev.start.getMonth() + 1) + "." + ev.start.getFullYear() + " " + MyTimeString + suffix + " " + ev.summary;
            if (debug) {logger.info("Termin (ganztägig) hinzugefügt : " +rule + ev.summary + " am " + singleDate);}
            arrDates.push(singleDate);
        } else {
            //Termin ausserhalb des Zeitfensters
            if (debug) {logger.info("Termin (ganztägig)" + rule +  ev.summary.toString() + " am " + ev.start + " aussortiert, da nicht innerhalb des Zeitfensters");}
        }

    } else {
        //Termin mit Uhrzeit (werden nicht coloriert)
        //Startzeitpunk >= heute && Startzeitpunkt < previewzeit && EndZeitpunkt >= jetzt
        if (ev.start >= heute && ev.start < endpreview && ev.end >= realnow) {
          //  logger.info("Termin mit Uhrzeit: " +rule + ev.start + " end: " + ev.end + " realnow:" +realnow);
            var MyTimeString = ('0' + ev.start.getHours()).slice(-2) + ':' + ('0' + (ev.start.getMinutes())).slice(-2);
            colorizeDates(ev,heute,tomorrow);
            var singleDate = prefix + ev.start.getDate() + "." + (ev.start.getMonth() + 1) + "." + ev.start.getFullYear() + " " + MyTimeString + suffix + " " + ev.summary;
            if (debug) {logger.info("Termin mit Uhrzeit hinzugefügt : "+rule + ev.summary + " am " + singleDate);}
            arrDates.push(singleDate);
        } else {
            //Termin ausserhalb des Zeitfensters
            if (debug) {logger.info("Termin " +ev.summary + rule +" am " + ev.start + " aussortiert, da nicht innerhalb des Zeitfensters");}
        }
    }
}
function colorizeDates(ev,heute,tomorrow) {
    var com = ev.start;
    com.setHours(0,0,0,0);
    //Colorieren wenn gewünscht
    if (colorize) {
        //Heute
        if (com.compare(heute) == 0) {
            prefix = warn;
            suffix = warn2;
        }
        //Morgen
        if (com.compare(tomorrow) == 0) {
            prefix = prewarn;
            suffix = prewarn2;
        }
        //Ansonsten
        if (com.compare(tomorrow) == 1) {
            prefix = normal;
            suffix = normal2;
        }
    } else {
        prefix = normal;
        suffix = normal2;
    }
}

//Alle Kalender einlesen
function readAll() {
	arrDates = new Array();
	if ((icalSettings.defURL != "") && (icalSettings.defURL != undefined)) {
	 	if (debug) {logger.info("adapter ical reading Calendar from URL1"+icalSettings.defURL);}
		checkiCal(icalSettings.defURL);
	}
	if ((icalSettings.defURL2 != "") && (icalSettings.defURL2 != undefined)) {
		if (debug) {logger.info("adapter ical reading Calendar from URL2"+icalSettings.defURL2);}
	 	checkiCal(icalSettings.defURL2);
	}
	if ((icalSettings.defURL3 != "") && (icalSettings.defURL3 != undefined)) {
		if (debug) {logger.info("adapter ical reading Calendar from URL3"+icalSettings.defURL3);}
	 	checkiCal(icalSettings.defURL3);
	}
	//10 Sek warten bis alle eingelesen wurden (hoffentlich)
	 setTimeout(displayDates,10000);
	
}

//Einen Kalender einlesen

function readOne(url) {
	arrDates = new Array();
	checkiCal(url);
	setTimeout(displayDates,4000);
}

//Darstellen nachdem alle eingelesen wurden
function displayDates() {
    if (arrDates.length > 0) {
        setState(icalSettings.firstId + 1, brSeparatedList(arrDates));
    }
}
function parseDate(input) {
    var parts = input.match(/(\d+)/g);
    // note parts[1]-1
    return new Date(parts[2], parts[1]-1, parts[0]);
}

//Sortierfunktion für arr.sort
function SortDates(a,b) {
    //Datum aus dem HTML extrahieren
    var firstindex = a.indexOf(">");
    var lastindex = a.lastIndexOf("<");
    var a1 = a.substr(firstindex+1,(lastindex-firstindex)-1);
    var da1 = a1.split(' ')[0];
    var ti1 = a1.split(' ')[1];
    var d = da1 ;
    //in Date wandeln
    var date1 = parseDate(d);
    date1.setHours(ti1.split(":")[0]);
    date1.setMinutes(ti1.split(":")[1])

    firstindex = b.indexOf(">");
    lastindex = b.lastIndexOf("<");
    b1 = b.substr(firstindex+1,(lastindex-firstindex)-1);
    var da2 = b1.split(' ')[0];
    var ti2 = b1.split(' ')[1];
    var d2 = da2;
    var date2 = parseDate(d2);
    date2.setHours(ti2.split(":")[0]);
    date2.setMinutes(ti2.split(":")[1])
    //vergleichen
    return date1.compare(date2);
}

function brSeparatedList(arr) {
    var text = "";
    //Sortieren nach eigener Methode
    arr.sort(SortDates);
    var length = arr.length;
    if (length > 0) {
        var first = true;
        for (var i=0; i<length; i++) {
            if (!first) {
                text = text + "<br/>";
            } else {
                first = false;
            }
            text = text + arr[i];
        }
    }
	//Wenn fullTime gesetzt dann 00:00 ersetzen durch String
    if (fullTime != "") {
	   text = text.replace(/00:00/g, fullTime);
    }
    return text;
}

function stop() {
    logger.info("adapter ical terminating");
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
	logger.verbose("adapter ical setState "+id+" "+val);
	socket.emit("setState", [id,val,null,true]);
}

function iCalInit() {
    
	setObject(icalSettings.firstId, {
        Name: "iCalReadTrigger",
        TypeName: "VARDP",
    });
	
	setObject(icalSettings.firstId + 1 , {
        Name: "iCalEvents",
        TypeName: "VARDP",
    });
	
	setState(icalSettings.firstId, "");
	setState(icalSettings.firstId + 1, "");
	
	  logger.info("adapter ical objects inserted, starting at: "+icalSettings.firstId);

    if (icalSettings.runEveryMinutes > 0) {
        //Autostart --> first read in 30sec
       // setTimeout(function() {checkiCal(icalSettings.defURL)},4000);
	   setTimeout(readAll,4000);
        //now schedule
        var runeveryminutes = icalSettings.runEveryMinutes * 60000;
        logger.info("adapter ical autorun every " + icalSettings.runEveryMinutes + " Minutes");
        setState(icalSettings.firstId, "autorun");
        //intervalID = setInterval(function() {checkiCal(icalSettings.defURL)},runeveryminutes);
        intervallID = setInterval(readAll,runeveryminutes);
	}

}

logger.info("adapter ical start");

iCalInit();
