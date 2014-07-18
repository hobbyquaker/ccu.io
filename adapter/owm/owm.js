/**
 *      CCU.IO OpenWeatherMap Adapter
 *      02'2014 BasGo
 *      mail: basgo@gmx.de
 *
 *      Version 0.2
 *
 *      development at https://github.com/BasGo/ccu.io/tree/master/adapter/owm
 *
 */
var settings = require(__dirname + '/../../settings.js');

if (!settings.adapters.owm || !settings.adapters.owm.enabled) {
    process.exit();
}

var owmSettings = settings.adapters.owm.settings;

var pollingInterval = owmSettings.period || 5;

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


function analyzeResult(result) {
    var curTimestamp     = result["dt"];
    var convertedTime    = new Date(curTimestamp * 1000);
    var curTemp          = result["main"]["temp"];
    var curHumidity      = result["main"]["humidity"];
    var curPressure      = result["main"]["pressure"];
    var curWindSpeed     = result["wind"]["speed"];
    var curWindDirection = result["wind"]["deg"];
    var curClouds        = result["clouds"]["all"];

    logInfo("got data with timestamp: "+convertedTime.toString());
    logInfo("received data (temp: "+curTemp+", humidity: "+curHumidity+", pressure: "+curPressure+")");

    socket.emit("setState", [owmSettings.firstId + 2, curTemp]);
    socket.emit("setState", [owmSettings.firstId + 3, curHumidity]);
    socket.emit("setState", [owmSettings.firstId + 4, curPressure]);

    socket.emit("setState", [owmSettings.firstId + 5, curWindSpeed]);
    socket.emit("setState", [owmSettings.firstId + 6, result["wind"]["deg"]]);
    socket.emit("setState", [owmSettings.firstId + 7, curClouds]);
}

function getValues() {
    logDebug("Checking values ...");
    var req = http.get(reqOptions, function(res) {
	    var pageData = "";
	    res.on('data', function (chunk) {
	        pageData += chunk;
	    });
	    res.on('end', function () {
	    	try {
		        var result = JSON.parse(pageData);
		        analyzeResult(result);
	    	} catch (e)
	    	{
	    		logger.error("adapter owm    Cannot parse answer: " + pageData + " (" + e + ")");
	    	}
	    });
    });

    req.on('error', function(e) {
    	logWarning("received error: "+e.message);
    });

    req.end();
}

function OwmInit() {

    socket.emit("setObject", owmSettings.firstId, {
        Name: "OpenWeatherMap",
        TypeName: "DEVICE",
        HssType: "OWM",
        Address: "OpenWeatherMap",
        Interface: "CCU.IO",
        Channels: [
            owmSettings.firstId + 1,
            owmSettings.firstId + 2
        ],
        _persistent: true
    });

    socket.emit("setObject", owmSettings.firstId + 1, {
        Name: "OpenWeatherMap Wetterdaten",
        TypeName: "CHANNEL",
        Address: "OpenWeatherMap Wetterdaten",
        HssType: "OWM-DATA",
        DPs: {
            TEMPERATURE: owmSettings.firstId + 2,
            HUMIDITY: owmSettings.firstId + 3,
            PRESSURE: owmSettings.firstId + 4,
            WINDSPEED: owmSettings.firstId + 5,
            WINDDIRECTION: owmSettings.firstId + 6,
            CLOUDS: owmSettings.firstId + 7
        },
        Parent: owmSettings.firstId,
        _persistent: true
    });

    socket.emit("setObject", owmSettings.firstId + 2, {
        Name: "Lufttemperatur",
        DPInfo: "Lufttemperatur",
        TypeName: "VARDP",
        "ValueMin": null,
        "ValueMax": null,
        "ValueUnit": "°C",
        "ValueType": 4,
        "Parent": owmSettings.firstId + 1,
        _persistent: true
    });

    socket.emit("setObject", owmSettings.firstId + 3, {
        Name: "Luftfeuchtigkeit",
        DPInfo: "Luftfeuchtigkeit",
        TypeName: "VARDP",
        "ValueMin": null,
        "ValueMax": null,
        "ValueUnit": "%",
        "ValueType": 4,
        "Parent": owmSettings.firstId + 1,
        _persistent: true
    });

    socket.emit("setObject", owmSettings.firstId + 4, {
        Name: "Luftdruck",
        DPInfo: "Luftdruck",
        TypeName: "VARDP",
        "ValueMin": null,
        "ValueMax": null,
        "ValueUnit": "hpa",
        "ValueType": 4,
        "Parent": owmSettings.firstId + 1,
        _persistent: true
    });

    socket.emit("setObject", owmSettings.firstId + 5, {
        Name: "Windgeschwindigkeit",
        DPInfo: "Windgeschwindigkeit",
        TypeName: "VARDP",
        "ValueMin": null,
        "ValueMax": null,
        "ValueUnit": "m/s",
        "ValueType": 4,
        "Parent": owmSettings.firstId + 1,
        _persistent: true
    });

    socket.emit("setObject", owmSettings.firstId + 6, {
        Name: "Windrichtung",
        DPInfo: "Windrichtung",
        TypeName: "VARDP",
        "ValueMin": null,
        "ValueMax": null,
        "ValueUnit": "°",
        "ValueType": 4,
        "Parent": owmSettings.firstId + 1,
        _persistent: true
    });

    socket.emit("setObject", owmSettings.firstId + 7, {
        Name: "Wolkendichte",
        DPInfo: "Wolkendichte",
        TypeName: "VARDP",
        "ValueMin": null,
        "ValueMax": null,
        "ValueUnit": "%",
        "ValueType": 4,
        "Parent": owmSettings.firstId + 1,
        _persistent: true
    });

    // Fix polling interval if too short
    if (pollingInterval <= 1) {
        pollingInterval = 1;
    }

    logInfo("polling enabled - interval " + pollingInterval + " minutes");

    setInterval(getValues, pollingInterval * 60 * 1000);
    getValues();
}

OwmInit();
