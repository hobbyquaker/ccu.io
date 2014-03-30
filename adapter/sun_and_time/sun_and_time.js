/**
 *
 * Sun and time Adapter for CCU.IO v1.3
 *
 * Copyright (c) 03'2014 Steffen https://github.com/smiling-Jack
 *
 */

var settings = require(__dirname+'/../../settings.js');

if (!settings.adapters.sun_and_time || !settings.adapters.sun_and_time.enabled) {
    process.exit();
}

var AdapterSettings = settings.adapters.sun_and_time.settings;

var logger  =   require(__dirname+'/../../logger.js');
var io      =   require('socket.io-client');
var suncalc =   require('suncalc');
var scheduler=  require('node-schedule');
var firstID =   300000;

logger.info("_________________________________________________________________sun_and_time_____________________________________________________________");

if (settings.ioListenPort) {
    var socket = io.connect("127.0.0.1", {
        port: settings.ioListenPort
    });
} else if (settings.ioListenPortSsl) {
    var socket = io.connect("127.0.0.1", {
        port: settings.ioListenPortSsl,
        secure: true,
    });
} else {
    process.exit();
}


socket.on('connect', function () {
    logger.info("adapter sun_and_time  connected to ccu.io");
});

socket.on('disconnect', function () {
    logger.info("adapter sun_and_time disconnected from ccu.io");
});

socket.on('event', function (obj) {
    if (!obj || !obj[0]) {
        return;
    }
});

function stop() {
    logger.info("adapter sun_and_time terminating");
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

socket.emit("setObject", firstID, {
    Name: "Sun_and_Time",
    TypeName: "DEVICE",
    HssType: "Sun_and_Time",
    Address: "sun_and_time",
    Interface: "CCU.IO",
    Channels: [
            firstID+10,firstID+20,firstID+30
    ],
    _persistent: false
});

        socket.emit("setObject", firstID+10, {
            Name: "Sun",
            TypeName: "CHANNEL",
            Address: "Sun_and_Time.Sun",
            HssType: "sun",
            DPs: {
                Day_Night: firstID+11,
                Horizontalwinkel: firstID+12,
                Richting: firstID+13
            },
            Parent: firstID,
            _persistent: false
        });

                socket.emit("setObject", firstID+11, {
                    "Name": "Day_Night",
                    "TypeName": "HSSDP",
                    "Address": "Sun_and_Time.Sun.Day_Night",
                    "Parent": firstID+10,
                    _persistent: true
                });

                socket.emit("setObject", firstID+12, {
                    "Name": "Horizontalwinkel",
                    "TypeName": "HSSDP",
                    "Address": "Sun_and_Time.Sun.Horizontalwinkel",
                    "Parent": firstID+10,
                    _persistent: true
                });

                socket.emit("setObject", firstID+13, {
                    "Name": "Richting",
                    "TypeName": "HSSDP",
                    "Address": "Sun_and_Time.Sun.Richting",
                    "Parent": firstID+10,
                    _persistent: true
                });

        socket.emit("setObject", firstID+20, {
            Name: "Time",
            TypeName: "CHANNEL",
            Address: "Sun_and_Time.time",
            HssType: "Time",
            DPs: {
                Day_Time: firstID+21
            },
            Parent: firstID,
            _persistent: false
        });

                socket.emit("setObject", firstID+21, {
                    "Name": "Tageszeit",
                    "TypeName": "HSSDP",
                    "Address": "Sun_and_Time.Sun.Day_Time",
                    "Parent": firstID+20,
                    _persistent: true
                });

        socket.emit("setObject", firstID+30, {
            Name: "Feiertag",
            TypeName: "CHANNEL",
            Address: "Sun_and_Time.hollyday",
            HssType: "time",
            DPs: {
                Feiertag_Heute: firstID+31,
                Feiertag_Heute_Name: firstID+32,
                Feiertag_Morgen: firstID+33,
                Feiertag_Morgen_Name: firstID+34,
                Feiertag_Uebermorgen: firstID+35,
                Feiertag_Uebermorgen_Name: firstID+36,
                Feiertag_naechster_Datum: firstID+37,
                Feiertag_naechster_Datum_Name: firstID+38

            },
            Parent: firstID,
            _persistent: false
        });

socket.emit("setObject", firstID+31, {
    "Name": "Feiertag_Heute",
    "TypeName": "HSSDP",
    "Address": "Sun_and_Time.Sun.Feiertag_Heute",
    "Parent": firstID+30,
    _persistent: true
});
socket.emit("setObject", firstID+32, {
    "Name": "Feiertag_Heute_Name",
    "TypeName": "HSSDP",
    "Address": "Sun_and_Time.Sun.Feiertag_Heute_Name",
    "Parent": firstID+30,
    _persistent: true
});
socket.emit("setObject", firstID+33, {
    "Name": "Feiertag_Morgen",
    "TypeName": "HSSDP",
    "Address": "Sun_and_Time.Sun.Feiertag_Morgen",
    "Parent": firstID+30,
    _persistent: true
});
socket.emit("setObject", firstID+34, {
    "Name": "Feiertag_Morgen_Name",
    "TypeName": "HSSDP",
    "Address": "Sun_and_Time.Sun.Feiertag_Morgen_Name",
    "Parent": firstID+30,
    _persistent: true
});
socket.emit("setObject", firstID+35, {
    "Name": "Feiertag_Uebermorgen",
    "TypeName": "HSSDP",
    "Address": "Sun_and_Time.Sun.Feiertag_Uebermorgen",
    "Parent": firstID+30,
    _persistent: true
});
socket.emit("setObject", firstID+36, {
    "Name": "Feiertag_Uebermorgen_Name",
    "TypeName": "HSSDP",
    "Address": "Sun_and_Time.Sun.Feiertag_Uebermorgen_Name",
    "Parent": firstID+30,
    _persistent: true
});
socket.emit("setObject", firstID+37, {
    "Name": "Feiertag_naechster_Datum",
    "TypeName": "HSSDP",
    "Address": "Sun_and_Time.Sun.Feiertag_naechster_Datum",
    "Parent": firstID+30,
    _persistent: true
});
socket.emit("setObject", firstID+38, {
    "Name": "Feiertag_naechster_Datum_Name",
    "TypeName": "HSSDP",
    "Address": "Sun_and_Time.Sun.Feiertag_naechster_Datum_Name",
    "Parent": firstID+30,
    _persistent: true
});


var allHolidays = {"BW":{"20130106":"Heilige Drei Könige","20130329":"Karfreitag","20130331":"Ostersonntag","20130401":"Ostermontag","20130501":"1. Mai","20130509":"Christi Himmelfahrt","20130519":"Pfingstsonntag","20130520":"Pfingstmontag","20130530":"Fronleichnam","20131003":"Tag der deutschen Einheit","20131101":"Allerheiligen","20131225":"Erster Weihnachtsfeiertag","20131226":"Zweiter Weihnachtsfeiertag","20140101":"Neujahr","20140106":"Heilige Drei Könige","20140418":"Karfreitag","20140420":"Ostersonntag","20140421":"Ostermontag","20140501":"1. Mai","20140529":"Christi Himmelfahrt","20140608":"Pfingstsonntag","20140609":"Pfingstmontag","20140619":"Fronleichnam","20141003":"Tag der deutschen Einheit","20141101":"Allerheiligen","20141225":"Erster Weihnachtsfeiertag","20141226":"Zweiter Weihnachtsfeiertag","20150101":"Neujahr","20150106":"Heilige Drei Könige","20150403":"Karfreitag","20150405":"Ostersonntag","20150406":"Ostermontag","20150501":"1. Mai","20150514":"Christi Himmelfahrt","20150524":"Pfingstsonntag","20150525":"Pfingstmontag","20150604":"Fronleichnam","20151003":"Tag der deutschen Einheit","20151101":"Allerheiligen","20151225":"Erster Weihnachtsfeiertag","20151226":"Zweiter Weihnachtsfeiertag","20160101":"Neujahr","20160106":"Heilige Drei Könige","20160325":"Karfreitag","20160327":"Ostersonntag","20160328":"Ostermontag","20160501":"1. Mai","20160505":"Christi Himmelfahrt","20160515":"Pfingstsonntag","20160516":"Pfingstmontag","20160526":"Fronleichnam","20161003":"Tag der deutschen Einheit","20161101":"Allerheiligen","20161225":"Erster Weihnachtsfeiertag","20161226":"Zweiter Weihnachtsfeiertag","20170101":"Neujahr","20170106":"Heilige Drei Könige","20170414":"Karfreitag","20170416":"Ostersonntag","20170417":"Ostermontag","20170501":"1. Mai","20170525":"Christi Himmelfahrt","20170604":"Pfingstsonntag","20170605":"Pfingstmontag","20170615":"Fronleichnam","20171003":"Tag der deutschen Einheit","20171101":"Allerheiligen","20171225":"Erster Weihnachtsfeiertag","20171226":"Zweiter Weihnachtsfeiertag","20180101":"Neujahr","20180106":"Heilige Drei Könige","20180330":"Karfreitag","20180401":"Ostersonntag","20180402":"Ostermontag","20180501":"1. Mai","20180510":"Christi Himmelfahrt","20180520":"Pfingstsonntag","20180521":"Pfingstmontag","20180531":"Fronleichnam","20181003":"Tag der deutschen Einheit","20181101":"Allerheiligen","20181225":"Erster Weihnachtsfeiertag","20181226":"Zweiter Weihnachtsfeiertag","20190101":"Neujahr","20190106":"Heilige Drei Könige","20190419":"Karfreitag","20190421":"Ostersonntag","20190422":"Ostermontag","20190501":"1. Mai","20190530":"Christi Himmelfahrt","20190609":"Pfingstsonntag","20190610":"Pfingstmontag","20190620":"Fronleichnam","20191003":"Tag der deutschen Einheit","20191101":"Allerheiligen","20191225":"Erster Weihnachtsfeiertag","20191226":"Zweiter Weihnachtsfeiertag"},"BY":{"20130106":"Heilige Drei Könige","20130329":"Karfreitag","20130331":"Ostersonntag","20130401":"Ostermontag","20130501":"1. Mai","20130509":"Christi Himmelfahrt","20130519":"Pfingstsonntag","20130520":"Pfingstmontag","20130530":"Fronleichnam","20130815":"Mariä Himmelfahrt","20131003":"Tag der deutschen Einheit","20131101":"Allerheiligen","20131225":"Erster Weihnachtsfeiertag","20131226":"Zweiter Weihnachtsfeiertag","20140101":"Neujahr","20140106":"Heilige Drei Könige","20140418":"Karfreitag","20140420":"Ostersonntag","20140421":"Ostermontag","20140501":"1. Mai","20140529":"Christi Himmelfahrt","20140608":"Pfingstsonntag","20140609":"Pfingstmontag","20140619":"Fronleichnam","20140815":"Mariä Himmelfahrt","20141003":"Tag der deutschen Einheit","20141101":"Allerheiligen","20141225":"Erster Weihnachtsfeiertag","20141226":"Zweiter Weihnachtsfeiertag","20150101":"Neujahr","20150106":"Heilige Drei Könige","20150403":"Karfreitag","20150405":"Ostersonntag","20150406":"Ostermontag","20150501":"1. Mai","20150514":"Christi Himmelfahrt","20150524":"Pfingstsonntag","20150525":"Pfingstmontag","20150604":"Fronleichnam","20150815":"Mariä Himmelfahrt","20151003":"Tag der deutschen Einheit","20151101":"Allerheiligen","20151225":"Erster Weihnachtsfeiertag","20151226":"Zweiter Weihnachtsfeiertag","20160101":"Neujahr","20160106":"Heilige Drei Könige","20160325":"Karfreitag","20160327":"Ostersonntag","20160328":"Ostermontag","20160501":"1. Mai","20160505":"Christi Himmelfahrt","20160515":"Pfingstsonntag","20160516":"Pfingstmontag","20160526":"Fronleichnam","20160815":"Mariä Himmelfahrt","20161003":"Tag der deutschen Einheit","20161101":"Allerheiligen","20161225":"Erster Weihnachtsfeiertag","20161226":"Zweiter Weihnachtsfeiertag","20170101":"Neujahr","20170106":"Heilige Drei Könige","20170414":"Karfreitag","20170416":"Ostersonntag","20170417":"Ostermontag","20170501":"1. Mai","20170525":"Christi Himmelfahrt","20170604":"Pfingstsonntag","20170605":"Pfingstmontag","20170615":"Fronleichnam","20170815":"Mariä Himmelfahrt","20171003":"Tag der deutschen Einheit","20171101":"Allerheiligen","20171225":"Erster Weihnachtsfeiertag","20171226":"Zweiter Weihnachtsfeiertag","20180101":"Neujahr","20180106":"Heilige Drei Könige","20180330":"Karfreitag","20180401":"Ostersonntag","20180402":"Ostermontag","20180501":"1. Mai","20180510":"Christi Himmelfahrt","20180520":"Pfingstsonntag","20180521":"Pfingstmontag","20180531":"Fronleichnam","20180815":"Mariä Himmelfahrt","20181003":"Tag der deutschen Einheit","20181101":"Allerheiligen","20181225":"Erster Weihnachtsfeiertag","20181226":"Zweiter Weihnachtsfeiertag","20190101":"Neujahr","20190106":"Heilige Drei Könige","20190419":"Karfreitag","20190421":"Ostersonntag","20190422":"Ostermontag","20190501":"1. Mai","20190530":"Christi Himmelfahrt","20190609":"Pfingstsonntag","20190610":"Pfingstmontag","20190620":"Fronleichnam","20190815":"Mariä Himmelfahrt","20191003":"Tag der deutschen Einheit","20191101":"Allerheiligen","20191225":"Erster Weihnachtsfeiertag","20191226":"Zweiter Weihnachtsfeiertag"},"BE":{"20130329":"Karfreitag","20130331":"Ostersonntag","20130401":"Ostermontag","20130501":"1. Mai","20130509":"Christi Himmelfahrt","20130519":"Pfingstsonntag","20130520":"Pfingstmontag","20131003":"Tag der deutschen Einheit","20131225":"Erster Weihnachtsfeiertag","20131226":"Zweiter Weihnachtsfeiertag","20140101":"Neujahr","20140418":"Karfreitag","20140420":"Ostersonntag","20140421":"Ostermontag","20140501":"1. Mai","20140529":"Christi Himmelfahrt","20140608":"Pfingstsonntag","20140609":"Pfingstmontag","20141003":"Tag der deutschen Einheit","20141225":"Erster Weihnachtsfeiertag","20141226":"Zweiter Weihnachtsfeiertag","20150101":"Neujahr","20150403":"Karfreitag","20150405":"Ostersonntag","20150406":"Ostermontag","20150501":"1. Mai","20150514":"Christi Himmelfahrt","20150524":"Pfingstsonntag","20150525":"Pfingstmontag","20151003":"Tag der deutschen Einheit","20151225":"Erster Weihnachtsfeiertag","20151226":"Zweiter Weihnachtsfeiertag","20160101":"Neujahr","20160325":"Karfreitag","20160327":"Ostersonntag","20160328":"Ostermontag","20160501":"1. Mai","20160505":"Christi Himmelfahrt","20160515":"Pfingstsonntag","20160516":"Pfingstmontag","20161003":"Tag der deutschen Einheit","20161225":"Erster Weihnachtsfeiertag","20161226":"Zweiter Weihnachtsfeiertag","20170101":"Neujahr","20170414":"Karfreitag","20170416":"Ostersonntag","20170417":"Ostermontag","20170501":"1. Mai","20170525":"Christi Himmelfahrt","20170604":"Pfingstsonntag","20170605":"Pfingstmontag","20171003":"Tag der deutschen Einheit","20171225":"Erster Weihnachtsfeiertag","20171226":"Zweiter Weihnachtsfeiertag","20180101":"Neujahr","20180330":"Karfreitag","20180401":"Ostersonntag","20180402":"Ostermontag","20180501":"1. Mai","20180510":"Christi Himmelfahrt","20180520":"Pfingstsonntag","20180521":"Pfingstmontag","20181003":"Tag der deutschen Einheit","20181225":"Erster Weihnachtsfeiertag","20181226":"Zweiter Weihnachtsfeiertag","20190101":"Neujahr","20190419":"Karfreitag","20190421":"Ostersonntag","20190422":"Ostermontag","20190501":"1. Mai","20190530":"Christi Himmelfahrt","20190609":"Pfingstsonntag","20190610":"Pfingstmontag","20191003":"Tag der deutschen Einheit","20191225":"Erster Weihnachtsfeiertag","20191226":"Zweiter Weihnachtsfeiertag"},"BB":{"20130329":"Karfreitag","20130331":"Ostersonntag","20130401":"Ostermontag","20130501":"1. Mai","20130509":"Christi Himmelfahrt","20130519":"Pfingstsonntag","20130520":"Pfingstmontag","20131003":"Tag der deutschen Einheit","20131031":"Reformationstag","20131225":"Erster Weihnachtsfeiertag","20131226":"Zweiter Weihnachtsfeiertag","20140101":"Neujahr","20140418":"Karfreitag","20140420":"Ostersonntag","20140421":"Ostermontag","20140501":"1. Mai","20140529":"Christi Himmelfahrt","20140608":"Pfingstsonntag","20140609":"Pfingstmontag","20141003":"Tag der deutschen Einheit","20141031":"Reformationstag","20141225":"Erster Weihnachtsfeiertag","20141226":"Zweiter Weihnachtsfeiertag","20150101":"Neujahr","20150403":"Karfreitag","20150405":"Ostersonntag","20150406":"Ostermontag","20150501":"1. Mai","20150514":"Christi Himmelfahrt","20150524":"Pfingstsonntag","20150525":"Pfingstmontag","20151003":"Tag der deutschen Einheit","20151031":"Reformationstag","20151225":"Erster Weihnachtsfeiertag","20151226":"Zweiter Weihnachtsfeiertag","20160101":"Neujahr","20160325":"Karfreitag","20160327":"Ostersonntag","20160328":"Ostermontag","20160501":"1. Mai","20160505":"Christi Himmelfahrt","20160515":"Pfingstsonntag","20160516":"Pfingstmontag","20161003":"Tag der deutschen Einheit","20161031":"Reformationstag","20161225":"Erster Weihnachtsfeiertag","20161226":"Zweiter Weihnachtsfeiertag","20170101":"Neujahr","20170414":"Karfreitag","20170416":"Ostersonntag","20170417":"Ostermontag","20170501":"1. Mai","20170525":"Christi Himmelfahrt","20170604":"Pfingstsonntag","20170605":"Pfingstmontag","20171003":"Tag der deutschen Einheit","20171031":"Reformationstag","20171225":"Erster Weihnachtsfeiertag","20171226":"Zweiter Weihnachtsfeiertag","20180101":"Neujahr","20180330":"Karfreitag","20180401":"Ostersonntag","20180402":"Ostermontag","20180501":"1. Mai","20180510":"Christi Himmelfahrt","20180520":"Pfingstsonntag","20180521":"Pfingstmontag","20181003":"Tag der deutschen Einheit","20181031":"Reformationstag","20181225":"Erster Weihnachtsfeiertag","20181226":"Zweiter Weihnachtsfeiertag","20190101":"Neujahr","20190419":"Karfreitag","20190421":"Ostersonntag","20190422":"Ostermontag","20190501":"1. Mai","20190530":"Christi Himmelfahrt","20190609":"Pfingstsonntag","20190610":"Pfingstmontag","20191003":"Tag der deutschen Einheit","20191031":"Reformationstag","20191225":"Erster Weihnachtsfeiertag","20191226":"Zweiter Weihnachtsfeiertag"},"HB":{"20130329":"Karfreitag","20130331":"Ostersonntag","20130401":"Ostermontag","20130501":"1. Mai","20130509":"Christi Himmelfahrt","20130519":"Pfingstsonntag","20130520":"Pfingstmontag","20131003":"Tag der deutschen Einheit","20131225":"Erster Weihnachtsfeiertag","20131226":"Zweiter Weihnachtsfeiertag","20140101":"Neujahr","20140418":"Karfreitag","20140420":"Ostersonntag","20140421":"Ostermontag","20140501":"1. Mai","20140529":"Christi Himmelfahrt","20140608":"Pfingstsonntag","20140609":"Pfingstmontag","20141003":"Tag der deutschen Einheit","20141225":"Erster Weihnachtsfeiertag","20141226":"Zweiter Weihnachtsfeiertag","20150101":"Neujahr","20150403":"Karfreitag","20150405":"Ostersonntag","20150406":"Ostermontag","20150501":"1. Mai","20150514":"Christi Himmelfahrt","20150524":"Pfingstsonntag","20150525":"Pfingstmontag","20151003":"Tag der deutschen Einheit","20151225":"Erster Weihnachtsfeiertag","20151226":"Zweiter Weihnachtsfeiertag","20160101":"Neujahr","20160325":"Karfreitag","20160327":"Ostersonntag","20160328":"Ostermontag","20160501":"1. Mai","20160505":"Christi Himmelfahrt","20160515":"Pfingstsonntag","20160516":"Pfingstmontag","20161003":"Tag der deutschen Einheit","20161225":"Erster Weihnachtsfeiertag","20161226":"Zweiter Weihnachtsfeiertag","20170101":"Neujahr","20170414":"Karfreitag","20170416":"Ostersonntag","20170417":"Ostermontag","20170501":"1. Mai","20170525":"Christi Himmelfahrt","20170604":"Pfingstsonntag","20170605":"Pfingstmontag","20171003":"Tag der deutschen Einheit","20171225":"Erster Weihnachtsfeiertag","20171226":"Zweiter Weihnachtsfeiertag","20180101":"Neujahr","20180330":"Karfreitag","20180401":"Ostersonntag","20180402":"Ostermontag","20180501":"1. Mai","20180510":"Christi Himmelfahrt","20180520":"Pfingstsonntag","20180521":"Pfingstmontag","20181003":"Tag der deutschen Einheit","20181225":"Erster Weihnachtsfeiertag","20181226":"Zweiter Weihnachtsfeiertag","20190101":"Neujahr","20190419":"Karfreitag","20190421":"Ostersonntag","20190422":"Ostermontag","20190501":"1. Mai","20190530":"Christi Himmelfahrt","20190609":"Pfingstsonntag","20190610":"Pfingstmontag","20191003":"Tag der deutschen Einheit","20191225":"Erster Weihnachtsfeiertag","20191226":"Zweiter Weihnachtsfeiertag"},"HH":{"20130329":"Karfreitag","20130331":"Ostersonntag","20130401":"Ostermontag","20130501":"1. Mai","20130509":"Christi Himmelfahrt","20130519":"Pfingstsonntag","20130520":"Pfingstmontag","20131003":"Tag der deutschen Einheit","20131225":"Erster Weihnachtsfeiertag","20131226":"Zweiter Weihnachtsfeiertag","20140101":"Neujahr","20140418":"Karfreitag","20140420":"Ostersonntag","20140421":"Ostermontag","20140501":"1. Mai","20140529":"Christi Himmelfahrt","20140608":"Pfingstsonntag","20140609":"Pfingstmontag","20141003":"Tag der deutschen Einheit","20141225":"Erster Weihnachtsfeiertag","20141226":"Zweiter Weihnachtsfeiertag","20150101":"Neujahr","20150403":"Karfreitag","20150405":"Ostersonntag","20150406":"Ostermontag","20150501":"1. Mai","20150514":"Christi Himmelfahrt","20150524":"Pfingstsonntag","20150525":"Pfingstmontag","20151003":"Tag der deutschen Einheit","20151225":"Erster Weihnachtsfeiertag","20151226":"Zweiter Weihnachtsfeiertag","20160101":"Neujahr","20160325":"Karfreitag","20160327":"Ostersonntag","20160328":"Ostermontag","20160501":"1. Mai","20160505":"Christi Himmelfahrt","20160515":"Pfingstsonntag","20160516":"Pfingstmontag","20161003":"Tag der deutschen Einheit","20161225":"Erster Weihnachtsfeiertag","20161226":"Zweiter Weihnachtsfeiertag","20170101":"Neujahr","20170414":"Karfreitag","20170416":"Ostersonntag","20170417":"Ostermontag","20170501":"1. Mai","20170525":"Christi Himmelfahrt","20170604":"Pfingstsonntag","20170605":"Pfingstmontag","20171003":"Tag der deutschen Einheit","20171225":"Erster Weihnachtsfeiertag","20171226":"Zweiter Weihnachtsfeiertag","20180101":"Neujahr","20180330":"Karfreitag","20180401":"Ostersonntag","20180402":"Ostermontag","20180501":"1. Mai","20180510":"Christi Himmelfahrt","20180520":"Pfingstsonntag","20180521":"Pfingstmontag","20181003":"Tag der deutschen Einheit","20181225":"Erster Weihnachtsfeiertag","20181226":"Zweiter Weihnachtsfeiertag","20190101":"Neujahr","20190419":"Karfreitag","20190421":"Ostersonntag","20190422":"Ostermontag","20190501":"1. Mai","20190530":"Christi Himmelfahrt","20190609":"Pfingstsonntag","20190610":"Pfingstmontag","20191003":"Tag der deutschen Einheit","20191225":"Erster Weihnachtsfeiertag","20191226":"Zweiter Weihnachtsfeiertag"},"HE":{"20130329":"Karfreitag","20130331":"Ostersonntag","20130401":"Ostermontag","20130501":"1. Mai","20130509":"Christi Himmelfahrt","20130519":"Pfingstsonntag","20130520":"Pfingstmontag","20130530":"Fronleichnam","20131003":"Tag der deutschen Einheit","20131225":"Erster Weihnachtsfeiertag","20131226":"Zweiter Weihnachtsfeiertag","20140101":"Neujahr","20140418":"Karfreitag","20140420":"Ostersonntag","20140421":"Ostermontag","20140501":"1. Mai","20140529":"Christi Himmelfahrt","20140608":"Pfingstsonntag","20140609":"Pfingstmontag","20140619":"Fronleichnam","20141003":"Tag der deutschen Einheit","20141225":"Erster Weihnachtsfeiertag","20141226":"Zweiter Weihnachtsfeiertag","20150101":"Neujahr","20150403":"Karfreitag","20150405":"Ostersonntag","20150406":"Ostermontag","20150501":"1. Mai","20150514":"Christi Himmelfahrt","20150524":"Pfingstsonntag","20150525":"Pfingstmontag","20150604":"Fronleichnam","20151003":"Tag der deutschen Einheit","20151225":"Erster Weihnachtsfeiertag","20151226":"Zweiter Weihnachtsfeiertag","20160101":"Neujahr","20160325":"Karfreitag","20160327":"Ostersonntag","20160328":"Ostermontag","20160501":"1. Mai","20160505":"Christi Himmelfahrt","20160515":"Pfingstsonntag","20160516":"Pfingstmontag","20160526":"Fronleichnam","20161003":"Tag der deutschen Einheit","20161225":"Erster Weihnachtsfeiertag","20161226":"Zweiter Weihnachtsfeiertag","20170101":"Neujahr","20170414":"Karfreitag","20170416":"Ostersonntag","20170417":"Ostermontag","20170501":"1. Mai","20170525":"Christi Himmelfahrt","20170604":"Pfingstsonntag","20170605":"Pfingstmontag","20170615":"Fronleichnam","20171003":"Tag der deutschen Einheit","20171225":"Erster Weihnachtsfeiertag","20171226":"Zweiter Weihnachtsfeiertag","20180101":"Neujahr","20180330":"Karfreitag","20180401":"Ostersonntag","20180402":"Ostermontag","20180501":"1. Mai","20180510":"Christi Himmelfahrt","20180520":"Pfingstsonntag","20180521":"Pfingstmontag","20180531":"Fronleichnam","20181003":"Tag der deutschen Einheit","20181225":"Erster Weihnachtsfeiertag","20181226":"Zweiter Weihnachtsfeiertag","20190101":"Neujahr","20190419":"Karfreitag","20190421":"Ostersonntag","20190422":"Ostermontag","20190501":"1. Mai","20190530":"Christi Himmelfahrt","20190609":"Pfingstsonntag","20190610":"Pfingstmontag","20190620":"Fronleichnam","20191003":"Tag der deutschen Einheit","20191225":"Erster Weihnachtsfeiertag","20191226":"Zweiter Weihnachtsfeiertag"},"MV":{"20130329":"Karfreitag","20130331":"Ostersonntag","20130401":"Ostermontag","20130501":"1. Mai","20130509":"Christi Himmelfahrt","20130519":"Pfingstsonntag","20130520":"Pfingstmontag","20131003":"Tag der deutschen Einheit","20131031":"Reformationstag","20131225":"Erster Weihnachtsfeiertag","20131226":"Zweiter Weihnachtsfeiertag","20140101":"Neujahr","20140418":"Karfreitag","20140420":"Ostersonntag","20140421":"Ostermontag","20140501":"1. Mai","20140529":"Christi Himmelfahrt","20140608":"Pfingstsonntag","20140609":"Pfingstmontag","20141003":"Tag der deutschen Einheit","20141031":"Reformationstag","20141225":"Erster Weihnachtsfeiertag","20141226":"Zweiter Weihnachtsfeiertag","20150101":"Neujahr","20150403":"Karfreitag","20150405":"Ostersonntag","20150406":"Ostermontag","20150501":"1. Mai","20150514":"Christi Himmelfahrt","20150524":"Pfingstsonntag","20150525":"Pfingstmontag","20151003":"Tag der deutschen Einheit","20151031":"Reformationstag","20151225":"Erster Weihnachtsfeiertag","20151226":"Zweiter Weihnachtsfeiertag","20160101":"Neujahr","20160325":"Karfreitag","20160327":"Ostersonntag","20160328":"Ostermontag","20160501":"1. Mai","20160505":"Christi Himmelfahrt","20160515":"Pfingstsonntag","20160516":"Pfingstmontag","20161003":"Tag der deutschen Einheit","20161031":"Reformationstag","20161225":"Erster Weihnachtsfeiertag","20161226":"Zweiter Weihnachtsfeiertag","20170101":"Neujahr","20170414":"Karfreitag","20170416":"Ostersonntag","20170417":"Ostermontag","20170501":"1. Mai","20170525":"Christi Himmelfahrt","20170604":"Pfingstsonntag","20170605":"Pfingstmontag","20171003":"Tag der deutschen Einheit","20171031":"Reformationstag","20171225":"Erster Weihnachtsfeiertag","20171226":"Zweiter Weihnachtsfeiertag","20180101":"Neujahr","20180330":"Karfreitag","20180401":"Ostersonntag","20180402":"Ostermontag","20180501":"1. Mai","20180510":"Christi Himmelfahrt","20180520":"Pfingstsonntag","20180521":"Pfingstmontag","20181003":"Tag der deutschen Einheit","20181031":"Reformationstag","20181225":"Erster Weihnachtsfeiertag","20181226":"Zweiter Weihnachtsfeiertag","20190101":"Neujahr","20190419":"Karfreitag","20190421":"Ostersonntag","20190422":"Ostermontag","20190501":"1. Mai","20190530":"Christi Himmelfahrt","20190609":"Pfingstsonntag","20190610":"Pfingstmontag","20191003":"Tag der deutschen Einheit","20191031":"Reformationstag","20191225":"Erster Weihnachtsfeiertag","20191226":"Zweiter Weihnachtsfeiertag"},"NI":{"20130329":"Karfreitag","20130331":"Ostersonntag","20130401":"Ostermontag","20130501":"1. Mai","20130509":"Christi Himmelfahrt","20130519":"Pfingstsonntag","20130520":"Pfingstmontag","20131003":"Tag der deutschen Einheit","20131225":"Erster Weihnachtsfeiertag","20131226":"Zweiter Weihnachtsfeiertag","20140101":"Neujahr","20140418":"Karfreitag","20140420":"Ostersonntag","20140421":"Ostermontag","20140501":"1. Mai","20140529":"Christi Himmelfahrt","20140608":"Pfingstsonntag","20140609":"Pfingstmontag","20141003":"Tag der deutschen Einheit","20141225":"Erster Weihnachtsfeiertag","20141226":"Zweiter Weihnachtsfeiertag","20150101":"Neujahr","20150403":"Karfreitag","20150405":"Ostersonntag","20150406":"Ostermontag","20150501":"1. Mai","20150514":"Christi Himmelfahrt","20150524":"Pfingstsonntag","20150525":"Pfingstmontag","20151003":"Tag der deutschen Einheit","20151225":"Erster Weihnachtsfeiertag","20151226":"Zweiter Weihnachtsfeiertag","20160101":"Neujahr","20160325":"Karfreitag","20160327":"Ostersonntag","20160328":"Ostermontag","20160501":"1. Mai","20160505":"Christi Himmelfahrt","20160515":"Pfingstsonntag","20160516":"Pfingstmontag","20161003":"Tag der deutschen Einheit","20161225":"Erster Weihnachtsfeiertag","20161226":"Zweiter Weihnachtsfeiertag","20170101":"Neujahr","20170414":"Karfreitag","20170416":"Ostersonntag","20170417":"Ostermontag","20170501":"1. Mai","20170525":"Christi Himmelfahrt","20170604":"Pfingstsonntag","20170605":"Pfingstmontag","20171003":"Tag der deutschen Einheit","20171225":"Erster Weihnachtsfeiertag","20171226":"Zweiter Weihnachtsfeiertag","20180101":"Neujahr","20180330":"Karfreitag","20180401":"Ostersonntag","20180402":"Ostermontag","20180501":"1. Mai","20180510":"Christi Himmelfahrt","20180520":"Pfingstsonntag","20180521":"Pfingstmontag","20181003":"Tag der deutschen Einheit","20181225":"Erster Weihnachtsfeiertag","20181226":"Zweiter Weihnachtsfeiertag","20190101":"Neujahr","20190419":"Karfreitag","20190421":"Ostersonntag","20190422":"Ostermontag","20190501":"1. Mai","20190530":"Christi Himmelfahrt","20190609":"Pfingstsonntag","20190610":"Pfingstmontag","20191003":"Tag der deutschen Einheit","20191225":"Erster Weihnachtsfeiertag","20191226":"Zweiter Weihnachtsfeiertag"},"NW":{"20130329":"Karfreitag","20130331":"Ostersonntag","20130401":"Ostermontag","20130501":"1. Mai","20130509":"Christi Himmelfahrt","20130519":"Pfingstsonntag","20130520":"Pfingstmontag","20130530":"Fronleichnam","20131003":"Tag der deutschen Einheit","20131101":"Allerheiligen","20131225":"Erster Weihnachtsfeiertag","20131226":"Zweiter Weihnachtsfeiertag","20140101":"Neujahr","20140418":"Karfreitag","20140420":"Ostersonntag","20140421":"Ostermontag","20140501":"1. Mai","20140529":"Christi Himmelfahrt","20140608":"Pfingstsonntag","20140609":"Pfingstmontag","20140619":"Fronleichnam","20141003":"Tag der deutschen Einheit","20141101":"Allerheiligen","20141225":"Erster Weihnachtsfeiertag","20141226":"Zweiter Weihnachtsfeiertag","20150101":"Neujahr","20150403":"Karfreitag","20150405":"Ostersonntag","20150406":"Ostermontag","20150501":"1. Mai","20150514":"Christi Himmelfahrt","20150524":"Pfingstsonntag","20150525":"Pfingstmontag","20150604":"Fronleichnam","20151003":"Tag der deutschen Einheit","20151101":"Allerheiligen","20151225":"Erster Weihnachtsfeiertag","20151226":"Zweiter Weihnachtsfeiertag","20160101":"Neujahr","20160325":"Karfreitag","20160327":"Ostersonntag","20160328":"Ostermontag","20160501":"1. Mai","20160505":"Christi Himmelfahrt","20160515":"Pfingstsonntag","20160516":"Pfingstmontag","20160526":"Fronleichnam","20161003":"Tag der deutschen Einheit","20161101":"Allerheiligen","20161225":"Erster Weihnachtsfeiertag","20161226":"Zweiter Weihnachtsfeiertag","20170101":"Neujahr","20170414":"Karfreitag","20170416":"Ostersonntag","20170417":"Ostermontag","20170501":"1. Mai","20170525":"Christi Himmelfahrt","20170604":"Pfingstsonntag","20170605":"Pfingstmontag","20170615":"Fronleichnam","20171003":"Tag der deutschen Einheit","20171101":"Allerheiligen","20171225":"Erster Weihnachtsfeiertag","20171226":"Zweiter Weihnachtsfeiertag","20180101":"Neujahr","20180330":"Karfreitag","20180401":"Ostersonntag","20180402":"Ostermontag","20180501":"1. Mai","20180510":"Christi Himmelfahrt","20180520":"Pfingstsonntag","20180521":"Pfingstmontag","20180531":"Fronleichnam","20181003":"Tag der deutschen Einheit","20181101":"Allerheiligen","20181225":"Erster Weihnachtsfeiertag","20181226":"Zweiter Weihnachtsfeiertag","20190101":"Neujahr","20190419":"Karfreitag","20190421":"Ostersonntag","20190422":"Ostermontag","20190501":"1. Mai","20190530":"Christi Himmelfahrt","20190609":"Pfingstsonntag","20190610":"Pfingstmontag","20190620":"Fronleichnam","20191003":"Tag der deutschen Einheit","20191101":"Allerheiligen","20191225":"Erster Weihnachtsfeiertag","20191226":"Zweiter Weihnachtsfeiertag"},"RP":{"20130329":"Karfreitag","20130331":"Ostersonntag","20130401":"Ostermontag","20130501":"1. Mai","20130509":"Christi Himmelfahrt","20130519":"Pfingstsonntag","20130520":"Pfingstmontag","20130530":"Fronleichnam","20131003":"Tag der deutschen Einheit","20131101":"Allerheiligen","20131225":"Erster Weihnachtsfeiertag","20131226":"Zweiter Weihnachtsfeiertag","20140101":"Neujahr","20140418":"Karfreitag","20140420":"Ostersonntag","20140421":"Ostermontag","20140501":"1. Mai","20140529":"Christi Himmelfahrt","20140608":"Pfingstsonntag","20140609":"Pfingstmontag","20140619":"Fronleichnam","20141003":"Tag der deutschen Einheit","20141101":"Allerheiligen","20141225":"Erster Weihnachtsfeiertag","20141226":"Zweiter Weihnachtsfeiertag","20150101":"Neujahr","20150403":"Karfreitag","20150405":"Ostersonntag","20150406":"Ostermontag","20150501":"1. Mai","20150514":"Christi Himmelfahrt","20150524":"Pfingstsonntag","20150525":"Pfingstmontag","20150604":"Fronleichnam","20151003":"Tag der deutschen Einheit","20151101":"Allerheiligen","20151225":"Erster Weihnachtsfeiertag","20151226":"Zweiter Weihnachtsfeiertag","20160101":"Neujahr","20160325":"Karfreitag","20160327":"Ostersonntag","20160328":"Ostermontag","20160501":"1. Mai","20160505":"Christi Himmelfahrt","20160515":"Pfingstsonntag","20160516":"Pfingstmontag","20160526":"Fronleichnam","20161003":"Tag der deutschen Einheit","20161101":"Allerheiligen","20161225":"Erster Weihnachtsfeiertag","20161226":"Zweiter Weihnachtsfeiertag","20170101":"Neujahr","20170414":"Karfreitag","20170416":"Ostersonntag","20170417":"Ostermontag","20170501":"1. Mai","20170525":"Christi Himmelfahrt","20170604":"Pfingstsonntag","20170605":"Pfingstmontag","20170615":"Fronleichnam","20171003":"Tag der deutschen Einheit","20171101":"Allerheiligen","20171225":"Erster Weihnachtsfeiertag","20171226":"Zweiter Weihnachtsfeiertag","20180101":"Neujahr","20180330":"Karfreitag","20180401":"Ostersonntag","20180402":"Ostermontag","20180501":"1. Mai","20180510":"Christi Himmelfahrt","20180520":"Pfingstsonntag","20180521":"Pfingstmontag","20180531":"Fronleichnam","20181003":"Tag der deutschen Einheit","20181101":"Allerheiligen","20181225":"Erster Weihnachtsfeiertag","20181226":"Zweiter Weihnachtsfeiertag","20190101":"Neujahr","20190419":"Karfreitag","20190421":"Ostersonntag","20190422":"Ostermontag","20190501":"1. Mai","20190530":"Christi Himmelfahrt","20190609":"Pfingstsonntag","20190610":"Pfingstmontag","20190620":"Fronleichnam","20191003":"Tag der deutschen Einheit","20191101":"Allerheiligen","20191225":"Erster Weihnachtsfeiertag","20191226":"Zweiter Weihnachtsfeiertag"},"SL":{"20130329":"Karfreitag","20130331":"Ostersonntag","20130401":"Ostermontag","20130501":"1. Mai","20130509":"Christi Himmelfahrt","20130519":"Pfingstsonntag","20130520":"Pfingstmontag","20130530":"Fronleichnam","20130815":"Mariä Himmelfahrt","20131003":"Tag der deutschen Einheit","20131101":"Allerheiligen","20131225":"Erster Weihnachtsfeiertag","20131226":"Zweiter Weihnachtsfeiertag","20140101":"Neujahr","20140418":"Karfreitag","20140420":"Ostersonntag","20140421":"Ostermontag","20140501":"1. Mai","20140529":"Christi Himmelfahrt","20140608":"Pfingstsonntag","20140609":"Pfingstmontag","20140619":"Fronleichnam","20140815":"Mariä Himmelfahrt","20141003":"Tag der deutschen Einheit","20141101":"Allerheiligen","20141225":"Erster Weihnachtsfeiertag","20141226":"Zweiter Weihnachtsfeiertag","20150101":"Neujahr","20150403":"Karfreitag","20150405":"Ostersonntag","20150406":"Ostermontag","20150501":"1. Mai","20150514":"Christi Himmelfahrt","20150524":"Pfingstsonntag","20150525":"Pfingstmontag","20150604":"Fronleichnam","20150815":"Mariä Himmelfahrt","20151003":"Tag der deutschen Einheit","20151101":"Allerheiligen","20151225":"Erster Weihnachtsfeiertag","20151226":"Zweiter Weihnachtsfeiertag","20160101":"Neujahr","20160325":"Karfreitag","20160327":"Ostersonntag","20160328":"Ostermontag","20160501":"1. Mai","20160505":"Christi Himmelfahrt","20160515":"Pfingstsonntag","20160516":"Pfingstmontag","20160526":"Fronleichnam","20160815":"Mariä Himmelfahrt","20161003":"Tag der deutschen Einheit","20161101":"Allerheiligen","20161225":"Erster Weihnachtsfeiertag","20161226":"Zweiter Weihnachtsfeiertag","20170101":"Neujahr","20170414":"Karfreitag","20170416":"Ostersonntag","20170417":"Ostermontag","20170501":"1. Mai","20170525":"Christi Himmelfahrt","20170604":"Pfingstsonntag","20170605":"Pfingstmontag","20170615":"Fronleichnam","20170815":"Mariä Himmelfahrt","20171003":"Tag der deutschen Einheit","20171101":"Allerheiligen","20171225":"Erster Weihnachtsfeiertag","20171226":"Zweiter Weihnachtsfeiertag","20180101":"Neujahr","20180330":"Karfreitag","20180401":"Ostersonntag","20180402":"Ostermontag","20180501":"1. Mai","20180510":"Christi Himmelfahrt","20180520":"Pfingstsonntag","20180521":"Pfingstmontag","20180531":"Fronleichnam","20180815":"Mariä Himmelfahrt","20181003":"Tag der deutschen Einheit","20181101":"Allerheiligen","20181225":"Erster Weihnachtsfeiertag","20181226":"Zweiter Weihnachtsfeiertag","20190101":"Neujahr","20190419":"Karfreitag","20190421":"Ostersonntag","20190422":"Ostermontag","20190501":"1. Mai","20190530":"Christi Himmelfahrt","20190609":"Pfingstsonntag","20190610":"Pfingstmontag","20190620":"Fronleichnam","20190815":"Mariä Himmelfahrt","20191003":"Tag der deutschen Einheit","20191101":"Allerheiligen","20191225":"Erster Weihnachtsfeiertag","20191226":"Zweiter Weihnachtsfeiertag"},"SN":{"20130329":"Karfreitag","20130331":"Ostersonntag","20130401":"Ostermontag","20130501":"1. Mai","20130509":"Christi Himmelfahrt","20130519":"Pfingstsonntag","20130520":"Pfingstmontag","20131003":"Tag der deutschen Einheit","20131031":"Reformationstag","20131120":"Buß und Bettag","20131225":"Erster Weihnachtsfeiertag","20131226":"Zweiter Weihnachtsfeiertag","20140101":"Neujahr","20140418":"Karfreitag","20140420":"Ostersonntag","20140421":"Ostermontag","20140501":"1. Mai","20140529":"Christi Himmelfahrt","20140608":"Pfingstsonntag","20140609":"Pfingstmontag","20141003":"Tag der deutschen Einheit","20141031":"Reformationstag","20141119":"Buß und Bettag","20141225":"Erster Weihnachtsfeiertag","20141226":"Zweiter Weihnachtsfeiertag","20150101":"Neujahr","20150403":"Karfreitag","20150405":"Ostersonntag","20150406":"Ostermontag","20150501":"1. Mai","20150514":"Christi Himmelfahrt","20150524":"Pfingstsonntag","20150525":"Pfingstmontag","20151003":"Tag der deutschen Einheit","20151031":"Reformationstag","20151118":"Buß und Bettag","20151225":"Erster Weihnachtsfeiertag","20151226":"Zweiter Weihnachtsfeiertag","20160101":"Neujahr","20160325":"Karfreitag","20160327":"Ostersonntag","20160328":"Ostermontag","20160501":"1. Mai","20160505":"Christi Himmelfahrt","20160515":"Pfingstsonntag","20160516":"Pfingstmontag","20161003":"Tag der deutschen Einheit","20161031":"Reformationstag","20161116":"Buß und Bettag","20161225":"Erster Weihnachtsfeiertag","20161226":"Zweiter Weihnachtsfeiertag","20170101":"Neujahr","20170414":"Karfreitag","20170416":"Ostersonntag","20170417":"Ostermontag","20170501":"1. Mai","20170525":"Christi Himmelfahrt","20170604":"Pfingstsonntag","20170605":"Pfingstmontag","20171003":"Tag der deutschen Einheit","20171031":"Reformationstag","20171122":"Buß und Bettag","20171225":"Erster Weihnachtsfeiertag","20171226":"Zweiter Weihnachtsfeiertag","20180101":"Neujahr","20180330":"Karfreitag","20180401":"Ostersonntag","20180402":"Ostermontag","20180501":"1. Mai","20180510":"Christi Himmelfahrt","20180520":"Pfingstsonntag","20180521":"Pfingstmontag","20181003":"Tag der deutschen Einheit","20181031":"Reformationstag","20181121":"Buß und Bettag","20181225":"Erster Weihnachtsfeiertag","20181226":"Zweiter Weihnachtsfeiertag","20190101":"Neujahr","20190419":"Karfreitag","20190421":"Ostersonntag","20190422":"Ostermontag","20190501":"1. Mai","20190530":"Christi Himmelfahrt","20190609":"Pfingstsonntag","20190610":"Pfingstmontag","20191003":"Tag der deutschen Einheit","20191031":"Reformationstag","20191120":"Buß und Bettag","20191225":"Erster Weihnachtsfeiertag","20191226":"Zweiter Weihnachtsfeiertag"},"ST":{"20130106":"Heilige Drei Könige","20130329":"Karfreitag","20130331":"Ostersonntag","20130401":"Ostermontag","20130501":"1. Mai","20130509":"Christi Himmelfahrt","20130519":"Pfingstsonntag","20130520":"Pfingstmontag","20131003":"Tag der deutschen Einheit","20131031":"Reformationstag","20131225":"Erster Weihnachtsfeiertag","20131226":"Zweiter Weihnachtsfeiertag","20140101":"Neujahr","20140106":"Heilige Drei Könige","20140418":"Karfreitag","20140420":"Ostersonntag","20140421":"Ostermontag","20140501":"1. Mai","20140529":"Christi Himmelfahrt","20140608":"Pfingstsonntag","20140609":"Pfingstmontag","20141003":"Tag der deutschen Einheit","20141031":"Reformationstag","20141225":"Erster Weihnachtsfeiertag","20141226":"Zweiter Weihnachtsfeiertag","20150101":"Neujahr","20150106":"Heilige Drei Könige","20150403":"Karfreitag","20150405":"Ostersonntag","20150406":"Ostermontag","20150501":"1. Mai","20150514":"Christi Himmelfahrt","20150524":"Pfingstsonntag","20150525":"Pfingstmontag","20151003":"Tag der deutschen Einheit","20151031":"Reformationstag","20151225":"Erster Weihnachtsfeiertag","20151226":"Zweiter Weihnachtsfeiertag","20160101":"Neujahr","20160106":"Heilige Drei Könige","20160325":"Karfreitag","20160327":"Ostersonntag","20160328":"Ostermontag","20160501":"1. Mai","20160505":"Christi Himmelfahrt","20160515":"Pfingstsonntag","20160516":"Pfingstmontag","20161003":"Tag der deutschen Einheit","20161031":"Reformationstag","20161225":"Erster Weihnachtsfeiertag","20161226":"Zweiter Weihnachtsfeiertag","20170101":"Neujahr","20170106":"Heilige Drei Könige","20170414":"Karfreitag","20170416":"Ostersonntag","20170417":"Ostermontag","20170501":"1. Mai","20170525":"Christi Himmelfahrt","20170604":"Pfingstsonntag","20170605":"Pfingstmontag","20171003":"Tag der deutschen Einheit","20171031":"Reformationstag","20171225":"Erster Weihnachtsfeiertag","20171226":"Zweiter Weihnachtsfeiertag","20180101":"Neujahr","20180106":"Heilige Drei Könige","20180330":"Karfreitag","20180401":"Ostersonntag","20180402":"Ostermontag","20180501":"1. Mai","20180510":"Christi Himmelfahrt","20180520":"Pfingstsonntag","20180521":"Pfingstmontag","20181003":"Tag der deutschen Einheit","20181031":"Reformationstag","20181225":"Erster Weihnachtsfeiertag","20181226":"Zweiter Weihnachtsfeiertag","20190101":"Neujahr","20190106":"Heilige Drei Könige","20190419":"Karfreitag","20190421":"Ostersonntag","20190422":"Ostermontag","20190501":"1. Mai","20190530":"Christi Himmelfahrt","20190609":"Pfingstsonntag","20190610":"Pfingstmontag","20191003":"Tag der deutschen Einheit","20191031":"Reformationstag","20191225":"Erster Weihnachtsfeiertag","20191226":"Zweiter Weihnachtsfeiertag"},"SH":{"20130329":"Karfreitag","20130331":"Ostersonntag","20130401":"Ostermontag","20130501":"1. Mai","20130509":"Christi Himmelfahrt","20130519":"Pfingstsonntag","20130520":"Pfingstmontag","20131003":"Tag der deutschen Einheit","20131225":"Erster Weihnachtsfeiertag","20131226":"Zweiter Weihnachtsfeiertag","20140101":"Neujahr","20140418":"Karfreitag","20140420":"Ostersonntag","20140421":"Ostermontag","20140501":"1. Mai","20140529":"Christi Himmelfahrt","20140608":"Pfingstsonntag","20140609":"Pfingstmontag","20141003":"Tag der deutschen Einheit","20141225":"Erster Weihnachtsfeiertag","20141226":"Zweiter Weihnachtsfeiertag","20150101":"Neujahr","20150403":"Karfreitag","20150405":"Ostersonntag","20150406":"Ostermontag","20150501":"1. Mai","20150514":"Christi Himmelfahrt","20150524":"Pfingstsonntag","20150525":"Pfingstmontag","20151003":"Tag der deutschen Einheit","20151225":"Erster Weihnachtsfeiertag","20151226":"Zweiter Weihnachtsfeiertag","20160101":"Neujahr","20160325":"Karfreitag","20160327":"Ostersonntag","20160328":"Ostermontag","20160501":"1. Mai","20160505":"Christi Himmelfahrt","20160515":"Pfingstsonntag","20160516":"Pfingstmontag","20161003":"Tag der deutschen Einheit","20161225":"Erster Weihnachtsfeiertag","20161226":"Zweiter Weihnachtsfeiertag","20170101":"Neujahr","20170414":"Karfreitag","20170416":"Ostersonntag","20170417":"Ostermontag","20170501":"1. Mai","20170525":"Christi Himmelfahrt","20170604":"Pfingstsonntag","20170605":"Pfingstmontag","20171003":"Tag der deutschen Einheit","20171225":"Erster Weihnachtsfeiertag","20171226":"Zweiter Weihnachtsfeiertag","20180101":"Neujahr","20180330":"Karfreitag","20180401":"Ostersonntag","20180402":"Ostermontag","20180501":"1. Mai","20180510":"Christi Himmelfahrt","20180520":"Pfingstsonntag","20180521":"Pfingstmontag","20181003":"Tag der deutschen Einheit","20181225":"Erster Weihnachtsfeiertag","20181226":"Zweiter Weihnachtsfeiertag","20190101":"Neujahr","20190419":"Karfreitag","20190421":"Ostersonntag","20190422":"Ostermontag","20190501":"1. Mai","20190530":"Christi Himmelfahrt","20190609":"Pfingstsonntag","20190610":"Pfingstmontag","20191003":"Tag der deutschen Einheit","20191225":"Erster Weihnachtsfeiertag","20191226":"Zweiter Weihnachtsfeiertag"},"TH":{"20130329":"Karfreitag","20130331":"Ostersonntag","20130401":"Ostermontag","20130501":"1. Mai","20130509":"Christi Himmelfahrt","20130519":"Pfingstsonntag","20130520":"Pfingstmontag","20131003":"Tag der deutschen Einheit","20131031":"Reformationstag","20131225":"Erster Weihnachtsfeiertag","20131226":"Zweiter Weihnachtsfeiertag","20140101":"Neujahr","20140418":"Karfreitag","20140420":"Ostersonntag","20140421":"Ostermontag","20140501":"1. Mai","20140529":"Christi Himmelfahrt","20140608":"Pfingstsonntag","20140609":"Pfingstmontag","20141003":"Tag der deutschen Einheit","20141031":"Reformationstag","20141225":"Erster Weihnachtsfeiertag","20141226":"Zweiter Weihnachtsfeiertag","20150101":"Neujahr","20150403":"Karfreitag","20150405":"Ostersonntag","20150406":"Ostermontag","20150501":"1. Mai","20150514":"Christi Himmelfahrt","20150524":"Pfingstsonntag","20150525":"Pfingstmontag","20151003":"Tag der deutschen Einheit","20151031":"Reformationstag","20151225":"Erster Weihnachtsfeiertag","20151226":"Zweiter Weihnachtsfeiertag","20160101":"Neujahr","20160325":"Karfreitag","20160327":"Ostersonntag","20160328":"Ostermontag","20160501":"1. Mai","20160505":"Christi Himmelfahrt","20160515":"Pfingstsonntag","20160516":"Pfingstmontag","20161003":"Tag der deutschen Einheit","20161031":"Reformationstag","20161225":"Erster Weihnachtsfeiertag","20161226":"Zweiter Weihnachtsfeiertag","20170101":"Neujahr","20170414":"Karfreitag","20170416":"Ostersonntag","20170417":"Ostermontag","20170501":"1. Mai","20170525":"Christi Himmelfahrt","20170604":"Pfingstsonntag","20170605":"Pfingstmontag","20171003":"Tag der deutschen Einheit","20171031":"Reformationstag","20171225":"Erster Weihnachtsfeiertag","20171226":"Zweiter Weihnachtsfeiertag","20180101":"Neujahr","20180330":"Karfreitag","20180401":"Ostersonntag","20180402":"Ostermontag","20180501":"1. Mai","20180510":"Christi Himmelfahrt","20180520":"Pfingstsonntag","20180521":"Pfingstmontag","20181003":"Tag der deutschen Einheit","20181031":"Reformationstag","20181225":"Erster Weihnachtsfeiertag","20181226":"Zweiter Weihnachtsfeiertag","20190101":"Neujahr","20190419":"Karfreitag","20190421":"Ostersonntag","20190422":"Ostermontag","20190501":"1. Mai","20190530":"Christi Himmelfahrt","20190609":"Pfingstsonntag","20190610":"Pfingstmontag","20191003":"Tag der deutschen Einheit","20191031":"Reformationstag","20191225":"Erster Weihnachtsfeiertag","20191226":"Zweiter Weihnachtsfeiertag"}}


function checkHolidays() {

    var d0 = new Date();
    var d1 = new Date(d0.getTime() + 86400000);
    var d2 = new Date(d1.getTime() + 86400000);

    var ts0 = d0.getFullYear() + ("0" + (d0.getMonth() + 1)).slice(-2) + ("0" + d0.getDate()).slice(-2);
    var ts1 = d1.getFullYear() + ("0" + (d1.getMonth() + 1)).slice(-2) + ("0" + d1.getDate()).slice(-2);
    var ts2 = d2.getFullYear() + ("0" + (d2.getMonth() + 1)).slice(-2) + ("0" + d2.getDate()).slice(-2);

    var holiday0 = false;
    var holiday1 = false;
    var holiday2 = false;

    var holiday0name = "";
    var holiday1name = "";
    var holiday2name = "";

    var holidayNextDate = "";
    var holidayNextName = "";

    var holidays = allHolidays[AdapterSettings.Bundesland];

    if (holidays[ts0]) {
        holiday0 = true;
        holiday0name = holidays[ts0];
    }

    if (holidays[ts1]) {
        holiday1 = true;
        holiday1name = holidays[ts1];
    }

    if (holidays[ts2]) {
        holiday2 = true;
        holiday2name = holidays[ts2];
    }

    for (var ts in holidays) {
        if (ts > ts0) {
            holidayNextDate = ts.substr(0,4)+"-"+ts.substr(4,2)+"-"+ts.substr(6,2);
            holidayNextName = holidays[ts];
            break;
        }
    }

    socket.emit("setState", [firstID+31, holiday0]);
    socket.emit("setState", [firstID+32, holiday0name]);
    socket.emit("setState", [firstID+33, holiday1]);
    socket.emit("setState", [firstID+34, holiday1name]);
    socket.emit("setState", [firstID+35, holiday2]);
    socket.emit("setState", [firstID+36, holiday2name]);
    socket.emit("setState", [firstID+37, holidayNextDate]);
    socket.emit("setState", [firstID+38, holidayNextName]);

    logger.info("hallo")
}

// Einmal bei Scriptstart ausführen
checkHolidays();

// Täglich um 0:10 Uhr ausführen
scheduler.scheduleJob("0 10 * * *", function(){
    checkHolidays();
});
