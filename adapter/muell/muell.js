var request = require('request');

var settings = require(__dirname+'/../../settings.js');

if (!settings.adapters.muell || !settings.adapters.muell.enabled) {
    process.exit();
}

var logger =    require(__dirname+'/../../logger.js'),
    io =        require('socket.io-client');


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
    logger.info("adapter muell connected to ccu.io");
});

socket.on('disconnect', function () {
    logger.info("adapter muell disconnected from ccu.io");
});

function stop() {
    logger.info("adapter muell terminating");
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

socket.emit("setObject", 10010, {
    Name: "Mülltermine",
    TypeName: "VARDP"
});

var start = new Date();
var end = new Date(start.getTime() + 3888000000);

var from = ("0"+start.getDate()).slice(-2) + "." + ("0"+(start.getMonth()+1)).slice(-2) + "." + start.getFullYear();
var to = ("0"+end.getDate()).slice(-2) + "." + ("0"+(end.getMonth()+1)).slice(-2) + "." + end.getFullYear();

var url = 'https://service.stuttgart.de/lhs-services/aws_kalender/api/ical.php?strasse=Zedernweg&hausnummer=28&calenderfrom='+from+'&calenderto='+to+'&wastetypes%5Brestmuell%5D=on&wastetypes%5Baltpapier%5D=on';

request(url, function (error, response, body) {
    if (!error && response.statusCode == 200) {

        iCalParse(body);

    }
});

function iCalParse(data) {
    var arr = [];
    var c = -1;
    var tmp = data.split("\n");

    for (var i = 0; i < tmp.length; i++) {
        var line = tmp[i].replace(/\r/, "");
        if (line.match(/^[A-Z-]+:/)) {
            arr[++c] = line;
        } else {
            arr[c] = arr[c] + line.replace(/^[ ]+/, "");
        }
    }


    var error;
    var obj = {};
    var pointer = [];
    var counter = {};

    for (var i = 0; i < arr.length; i++) {

        var line, prop, content;
        var tmp = arr[i].match(/^([A-Z-]+):(.*)$/);
        line = tmp[0]; prop = tmp[1]; content = tmp[2];

        if (prop === "BEGIN" && content.match(/VEVENT/)) {
            if (counter[content] !== undefined) {
                counter[content] += 1;
            } else {
                counter[content] = 0;
            }
            content = content + "_" + counter[content];
        }

        if (prop === "BEGIN") {
            pointer.push(content);
            var sub = {};
            switch (pointer.length) {
                case 1:
                    obj[pointer[0]] = sub;
                    break;
                case 2:
                    obj[pointer[0]][pointer[1]] = sub;
                    break;
                case 3:
                    obj[pointer[0]][pointer[1]][pointer[2]] = sub;
                    break;
                case 4:
                    obj[pointer[0]][pointer[1]][pointer[2]][pointer[3]] = sub;
                    break;
            }

        } else if (prop === "END") {
            pointer.pop();
        } else {
            switch (pointer.length) {
                case 1:
                    obj[pointer[0]][prop] = content;
                    break;
                case 2:
                    obj[pointer[0]][pointer[1]][prop] = content;
                    break;
                case 3:
                    obj[pointer[0]][pointer[1]][pointer[2]][prop] = content;
                    break;
                case 4:
                    obj[pointer[0]][pointer[1]][pointer[2]][pointer[3]][prop] = content;
                    break;
            }
        }

        //console.log(pointer);
        //console.log(obj);


    }

    var events = obj.VCALENDAR;
    var output = [];
    for (var event in obj.VCALENDAR) {
        if (event.match(/^VEVENT_/)) {
            var ts = obj.VCALENDAR[event].DTSTART.match(/^([0-9]{4})([0-9]{2})([0-9]{2})/);
            var desc = obj.VCALENDAR[event].VALARM.DESCRIPTION;

            output.push(ts[1]+ts[2]+ts[3]+" "+ts[3]+"."+ts[2]+"."+ts[1]+" "+desc);
        }
    }


    request("https://www.sita-deutschland.de/loesungen/privathaushalte/abfuhrkalender/stuttgart.html?plz=70597&strasse=Zedernweg", function (err, res, status) {
        res.body = res.body.replace(/(\r\n|\n|\r)/gm,"");
        var parts = res.body.match(/<table class="listing">(.*)<\/table>/);
        var table = parts[1].replace(/[ ]+/, " ");
        var parts = table.match(/<td>[A-Za-z]+ [0-9]{2}\.[0-9]{2}\.[0-9]{4}/g);
        for (var i = 0; i < parts.length; i++) {
            var termin = parts[i].match(/<td>[A-Za-z]+ ([0-9]{2}\.[0-9]{2}\.[0-9]{4})/);
            var gparts = termin[1].match(/([0-9]{2})\.([0-9]{2})\.([0-9]{4})/);
            output.push(gparts[3]+gparts[2]+gparts[1]+" "+termin[1]+" Gelber Sack");
        }
        output.sort();


        var str = "";
        var first = true;
        for (var i = 0; i<4 && i < output.length; i++) {
            if (!first) {
                str += "<br>";
            } else {
                first = false;
            }
            str += output[i].slice(9);
        }

        socket.emit("setState", [10010, str], function () {
            socket.disconnect();
            logger.info("adapter muell terminating");
            setTimeout(function () {
                process.exit();
            }, 1000);
        });



    });





}
