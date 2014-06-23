/**
 *  Adapter für B-control Energy Manager HTTP/JSON
 *
 *  Version 0.2
 *
 *  (c) 6'2014 hobbyquaker
 *
 *
 *
 */



var settings = require(__dirname+'/../../settings.js');

if (!settings.adapters.bcontrol_em_http || !settings.adapters.bcontrol_em_http.enabled) {
    process.exit();
}

var logger =    require(__dirname+'/../../logger.js'),
    io =        require('socket.io-client');
var request =   require('request');
var cookieJar = request.jar();

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

var adapterSettings = settings.adapters.bcontrol_em_http.settings;
var firstId = settings.adapters.bcontrol_em_http.firstId;
var numMeters;



function getAuthCookie(callback) {
    logger.info("adapter bem2  login on " + adapterSettings.host);
    request.get({
        url: 'http://' + adapterSettings.host + '/index.php',
        jar: cookieJar
    }, function (err, res, body) {
        if (err) {
            logger.error('adapter bem2  auth failed');
            stop();
        } else {
            callback();
        }
    });
}
var createObjects = [];
var meters = [];
function getMeters(callback) {

    request.get({
        url: 'http://' + adapterSettings.host + '/mum-webservice/meters.php',
        jar: cookieJar
    }, function (err, res, body) {
        var data = JSON.parse(body);
        var data = data.meters;
        if (data.authentication == false) {
            logger.error("adapter bem2  auth failure");
            setTimeout(function () {
                getAuthCookie(getMeters);
            }, 60000);
            return;
        }
        logger.info("adapter bem2  found " + data.length + " sensors");
        numMeters = data.length;
        for (var i = 0; i < data.length; i++) {
            var obj = {
                Name: (data[i].label == "Teridian" ? 'BEM Gesamtverbrauch' : 'BEM ' + data[i].label) + ' ' + data[i].serial + ":" + data[i].model + ":" + data[i].type,
                Address: 'BEM.' + data[i].serial + '.METER',
                TypeName: 'VARDP',
                "ValueMin": null,
                "ValueMax": null,
                "ValueUnit": "W",
                "ValueType": 4,
                "ValueSubType": 0,
                "ValueList": ""
            };

            if (metaIndex.Address[obj.Address]) {
                meters[data[i].id] = metaIndex.Address[obj.Address][0];
            } else {
                obj._findNextId = true;
                obj._persistent = true;
                obj.bemId = data[i].id;
                createObjects.push(obj);
            }

        }

        createObject();
    });
}

var createIndex = 0;
function createObject() {
    if (createObjects.length > createIndex) {
        var bemId = createObjects[createIndex].bemId;
        delete createObjects[createIndex].bemId;
        logger.info("adapter bem2  creating datapoint " + createObjects[createIndex].Name);
        socket.emit("setObject", firstId, createObjects[createIndex], function (id) {
            metaIndex.Address[createObjects[createIndex].Address] = [id];
            meters[bemId] = id;
            createIndex += 1;
            createObject();
        });
    } else {
        startLoop();
    }

}

var meter_index = 0;


function startLoop() {
    if (++meter_index >= numMeters) meter_index = 0;
    getValue(meter_index, function () {
        setTimeout(startLoop, adapterSettings.pause);
    });
}

function getValue(meter_id, callback) {
    request.post({
        jar: cookieJar,
        url: 'http://' + adapterSettings.host + '/mum-webservice/consumption.php?meter_id=' + meter_id
    }, function (err, res, body) {
        var data = JSON.parse(body);
        if (data.authentication == false) {
            logger.error("adapter bem2  auth failure");
            getAuthCookie(getMeters);
            return;
        }

        var idx = ('0' + (meter_id + 1)).slice(-2);
        socket.emit('setState', [meters[meter_id], parseFloat((data[idx + "_power"] * 1000).toFixed(1)), null, true]);
        callback();
    });
}


var metaObjects = {},
    metaIndex = {},
    dataLoaded = false;

socket.emit('getObjects', function(objects) {
    logger.info("adapter bem2  fetched metaObjects from ccu.io");
    metaObjects = objects;
    socket.emit('getIndex', function(objIndex) {
        logger.info("adapter bem2  fetched metaIndex from ccu.io");
        metaIndex = objIndex;
        dataLoaded = true;
        getAuthCookie(getMeters);
    });
});


function stop() {
    logger.info("adapter bem2  terminating");
    try {
        server.close();
    } catch (e) {

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
