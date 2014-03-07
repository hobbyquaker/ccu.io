/**
 *      CCU.IO OpenWeatherMap Adapter
 *      02'2014 BasGo
 *      mail: basgo@gmx.de
 *
 *      Version 0.1
 *
 *      development at https://github.com/BasGo/ccu.io/tree/master/adapter/owm
 *
 */
var settings = require(__dirname + '/../../settings.js');

if (!settings.adapters.owm || !settings.adapters.owm.enabled) {
    process.exit();
}

var owmSettings = settings.adapters.owm.settings;

var reqOptions = {
    host: 'api.openweathermap.org',
    port: 80,
    path: '/data/2.5/weather?id='+owmSettings.cityCode+'&units=metric&lang=de',
    method: 'GET'
};

var logger = require(__dirname + '/../../logger.js'),
    io     = require('socket.io-client'),
    http   = require('http');

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

function logDebug(message) {
    if (owmSettings.debugEnabled) {
        logger.info("adapter owm   " + message);
    }
}

function logInfo(message) {
    logger.info("adapter owm   " + message);
}

function logWarning(message) {
    logger.warn("adapter owm   " + message);
}

socket.on('connect', function () {
    logDebug("connected to ccu.io");
});

socket.on('disconnect', function () {
    logDebug("disconnected from ccu.io");
});

function stop() {
    logDebug("terminating");
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

var req = http.get(reqOptions, function(res) {
    var pageData = "";
    res.on('data', function (chunk) {
        pageData += chunk;
    });
    res.on('end', function () {
        var result = JSON.parse(pageData);
        analyzeResult(result);
    });
});

req.on('error', function(e) {
    logWarning("received error: "+e.message);
});

req.end();

function analyzeResult(result) {
    var curTimestamp     = result["dt"];
    var convertedTime    = new Date(curTimestamp * 1000);
    var curTemp          = result["main"]["temp"];
    var curHumidity      = result["main"]["humidity"];
    var curPressure      = result["main"]["pressure"];
    var curWindSpeed     = result["wind"]["speed"];
    var curWindDirection = result["wind"]["deg"];
    var curClouds        = result["clouds"]["all"];

    logDebug("got data with timestamp: "+convertedTime.toString());
    logDebug("received data (temp: "+curTemp+", humidity: "+curHumidity+", pressure: "+curPressure+")");

    socket.emit("setObject", owmSettings.firstId + 0, {
        Name: "OPENWEATHERMAP.TEMPERATURE",
        DPInfo: "Lufttemperatur",
        TypeName: "VARDP",
        "ValueMin": null,
        "ValueMax": null,
        "ValueUnit": "°C",
        "ValueType": 4
    }, function() {
        socket.emit("setState", [owmSettings.firstId + 0, curTemp]);
    });

    socket.emit("setObject", owmSettings.firstId + 1, {
        Name: "OPENWEATHERMAP.HUMIDITY",
        DPInfo: "Luftfeuchtigkeit",
        TypeName: "VARDP",
        "ValueMin": null,
        "ValueMax": null,
        "ValueUnit": "%",
        "ValueType": 4
    }, function() {
        socket.emit("setState", [owmSettings.firstId + 1, curHumidity]);
    });

    socket.emit("setObject", owmSettings.firstId + 2, {
        Name: "OPENWEATHERMAP.PRESSURE",
        DPInfo: "Luftdruck",
        TypeName: "VARDP",
        "ValueMin": null,
        "ValueMax": null,
        "ValueUnit": "hpa",
        "ValueType": 4
    }, function() {
        socket.emit("setState", [owmSettings.firstId + 2, curPressure]);
    });

    socket.emit("setObject", owmSettings.firstId + 3, {
        Name: "OPENWEATHERMAP.WIND.SPEED",
        DPInfo: "Windgeschwindigkeit",
        TypeName: "VARDP",
        "ValueMin": null,
        "ValueMax": null,
        "ValueUnit": "m/s",
        "ValueType": 4
    }, function() {
        socket.emit("setState", [owmSettings.firstId + 3, curWindSpeed]);
    });

    socket.emit("setObject", owmSettings.firstId + 4, {
        Name: "OPENWEATHERMAP.WIND.DIRECTION",
        DPInfo: "Windrichtung",
        TypeName: "VARDP",
        "ValueMin": null,
        "ValueMax": null,
        "ValueUnit": "°",
        "ValueType": 4
    }, function() {
        socket.emit("setState", [owmSettings.firstId + 4, result["wind"]["deg"]]);
    });

    socket.emit("setObject", owmSettings.firstId + 5, {
        Name: "OPENWEATHERMAP.CLOUDS",
        DPInfo: "Wolkendichte",
        TypeName: "VARDP",
        "ValueMin": null,
        "ValueMax": null,
        "ValueUnit": "%",
        "ValueType": 4
    }, function() {
        socket.emit("setState", [owmSettings.firstId + 5, curClouds]);
        setTimeout(stop, 10000);
    });
}