var JSFtp = require("jsftp");
var parseString = require('xml2js').parseString;
//ftp://gds10502:mWSnwYMD@ftp-outgoing2.dwd.de

var settings = require(__dirname+'/../../settings.js');

if (!settings.adapters.dwd || !settings.adapters.dwd.enabled) {
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
        secure: true
    });
} else {
    process.exit();
}




socket.on('connect', function () {
    logger.info("adapter dwd   connected to ccu.io");
});

socket.on('disconnect', function () {
    logger.info("adapter dwd   disconnected from ccu.io");
});

socket.on('event', function (obj) {
    if (!obj || !obj[0]) {
        return;
    }
});

function stop() {
    logger.info("adapter dwd   terminating");
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

var dwdSettings = settings.adapters.dwd.settings;


var ftp = new JSFtp({
    host: dwdSettings.host,
    user: dwdSettings.user, // defaults to "anonymous"
    pass: dwdSettings.pass // defaults to "@anonymous"
});

var files = [];
var xml = [];

ftp.ls("gds/specials/warnings/xml/"+dwdSettings.dienststelle, function(err, res) {
    if (err) {
        logger.info("adapter dwd   ftp ls error");
    }
    for (var i = 0; i < res.length; i++) {
        if (res[i].name.match(new RegExp(dwdSettings.kreis+"\.xml$"))) {
            files.push(res[i].name);
        }
    }
    getFile(0);

});

function getFile(i) {
    if (!i) { i = 0; }
    if (!files[i]) {
        received();
        return;
    }
    ftp.get("gds/specials/warnings/xml/"+dwdSettings.dienststelle+"/"+files[i], function(err, socket) {
        if (err) {
            logger.error("adapter dwd   ftp get error");
            return;
        }
        var str = "";
        socket.on("data", function(d) { str += d.toString(); })
        socket.on("close", function(hadErr) {
            if (hadErr) {
                logger.error("adapter dwd   error retrieving file");
            } else {
                logger.info("adapter dwd   got weather warning");
            }
            xml[i] = str;
            setTimeout(function (c) {
                getFile(c);
            }, 1000, i+1);
        });
        socket.resume();
    });
}

function received() {
    ftp.raw.quit();

    var warnungen = {};

    for (var i = 0; i < xml.length; i++) {
        parseString(xml[i], {explicitArray: false}, function(err, res) {
            //console.log(res.alert.msgType+" "+res.alert.info.eventCode.value+" "+res.alert.info.event+" "+res.alert.info.severity+" "+res.alert.info.effective+" "+res.alert.info.expires);
            if (res.alert.msgType == "Alert") {
                warnungen[res.alert.info.eventCode.value] = {
                    text:       res.alert.info.event,
                    desc:       res.alert.info.description,
                    head:       res.alert.info.headline,
                    start:      res.alert.info.effective,
                    expires:    res.alert.info.expires,
                    severity:   res.alert.info.severity
                };
            }

            if (res.alert.msgType == "Cancel") {
                if (warnungen[res.alert.info.eventCode.value]) {
                    delete(warnungen[res.alert.info.eventCode.value]);
                }
            }
        });

    }
    var warnung = {
        text: "",
        desc: "",
        head: "",
        start: "2037-01-01",
        expires: "0000-00-00"
    };
    var first = true;
    for (item in warnungen) {
        if (!first) {
            warnung.text += ", ";
            warnung.desc += ", ";
            warnung.head += ", ";
        } else {
            first = false;
        }
        if (warnung.start > warnungen[item].start) { warnung.start = warnungen[item].start; }
        if (warnung.expires < warnungen[item].expires) { warnung.expires = warnungen[item].expires; }
        warnung.text += warnungen[item].text;
        warnung.desc += warnungen[item].desc;
        warnung.head += warnungen[item].head;
        // TODO checken ob severity größer ist
        warnung.severity = warnungen[item].severity;
    }

    if (warnung.start == "2037-01-01") { warnung.start = ""; }
    if (warnung.expires == "0000-00-00") { warnung.expires = ""; }

    var firstId = settings.adapters.dwd.firstId;

    socket.emit("setObject", firstId, {
        Name: "DWD Warnung Beginn",
        DPInfo: "",
        TypeName: "VARDP",
    }, function() {
        socket.emit("setState", [firstId, warnung.start || ""]);
    });

    socket.emit("setObject", firstId+1, {
        Name: "DWD Warnung Ende",
        DPInfo: "",
        TypeName: "VARDP",
    }, function() {
        socket.emit("setState", [firstId+1, warnung.expires || ""]);
    });

    socket.emit("setObject", firstId+2, {
        Name: "DWD Warnung Severity",
        DPInfo: "",
        TypeName: "VARDP",
    }, function() {
        socket.emit("setState", [firstId+2, warnung.severity || ""]);
    });

    socket.emit("setObject", firstId+3, {
        Name: "DWD Warnung Text",
        DPInfo: "",
        TypeName: "VARDP",
    }, function() {
        socket.emit("setState", [firstId+3, warnung.text || ""]);
    });

    socket.emit("setObject", firstId+4, {
        Name: "DWD Warnung Headline",
        DPInfo: "",
        TypeName: "VARDP",
    }, function() {
        socket.emit("setState", [firstId+4, warnung.head || ""]);
    });

    socket.emit("setObject", firstId+5, {
        Name: "DWD Warnung Beschreibung",
        DPInfo: "",
        TypeName: "VARDP",
    }, function() {
        socket.emit("setState", [firstId+5, warnung.desc || ""]);
        setTimeout(stop, 10000);
    });

}
