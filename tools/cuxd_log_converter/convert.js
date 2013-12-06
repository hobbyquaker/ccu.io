var settings = require(__dirname+'/../../settings.js'),
    io =        require('socket.io-client'),
    fs =        require('fs');

var regaObjects,
    regaIndex;

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
    console.log("connected to ccu.io");
});

socket.on('disconnect', function () {
    console.log("disconnected from ccu.io");
});

socket.emit("getIndex", function(index) {
    regaIndex = index;
    console.log("fetched regaIndex from ccu.io");
    socket.emit("getObjects", function(objects) {
        regaObjects = objects;
        console.log("fetched regaObjects from ccu.io");
        socket.disconnect();
        main();
    });
});

function main() {
    // logs verzeichnis lesen
    fs.readdir(__dirname+"/logs", function (err, data) {
        for (var i = 0; i < data.length; i++) {
            var file = data[i];
            if (file !== ".gitignore") {
                convertLog(file);
            }
        }
    });
}

function convertLog(file) {
    var content = fs.readFileSync(__dirname+"/logs/"+file);
    var matches = file.match(/.*\.([0-9]{4})([0-9]{2})([0-9]{2})-[0-9]{4}$/);
    var year = matches[1],
        month = matches[2],
        day = matches[3];

    var tmp = new Date(year, month-1, day);
    var before = new Date(tmp.getTime() - 86400000);
    var outputFile = __dirname+"/../../log/devices-variables.log."+before.getFullYear()+"-"+String("0"+(before.getMonth()+1)).slice(-2)+"-"+String("0"+before.getDate()).slice(-2);

    var output = "";

    var notFound = [];

    var arr = String(content).split("\n");
    var l = arr.length;

    console.log("converting "+file+" ("+l+" entries)");

    for (var i = 0; i < l; i++) {
        if (arr[i]) {
            var lineArr = arr[i].split(" ", 3);
            if (lineArr.length == 3) {
                var ts = (new Date(lineArr[0])).getTime() / 1000;
                var val = lineArr[2];
                var dpArr = lineArr[1].split(".");
                var dp;
                if (dpArr[1]) {
                    ch = regaIndex.Address[dpArr[0]];
                    if (ch) {
                        if (regaObjects[ch[0]] && regaObjects[ch[0]].DPs) {
                            dp = regaObjects[ch[0]].DPs[dpArr[1]];
                        }
                    }
                } else {
                    dp = regaIndex.Name[dpArr[0]];
                }

                if (dp) {
                    //console.log(ts+" "+dp+" "+val);
                    output += ts + " " + dp + " " + val + "\n";
                } else {
                    if (notFound.indexOf(lineArr[1]) == -1) {
                        notFound.push(lineArr[1]);
                        console.log("  datapoint "+lineArr[1]+" not found");
                    }

                }
            } else {
                console.log("  malformed line in logfile");
            }

        }


    }
    console.log("  writing to "+outputFile);
    fs.appendFileSync(outputFile, output);

}

function stop() {
    console.log("terminating");
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