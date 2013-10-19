var request = require('request');

request('https://service.stuttgart.de/lhs-services/aws_kalender/api/ical.php?strasse=Zedernweg&hausnummer=28&calenderfrom=18.10.2013&calenderto=18.11.2013&wastetypes%5Brestmuell%5D=on&wastetypes%5Baltpapier%5D=on', function (error, response, body) {
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


    console.log("\n----\n");
    console.log(JSON.stringify(obj, null, 2));
}
