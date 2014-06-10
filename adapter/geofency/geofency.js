/**
 *      CCU.IO Geofency Adapter
 *      11'2013 Hobbyquaker
 *
 *      Version 0.4
 *
 *
 */

var settings = require(__dirname+'/../../settings.js');

if (!settings.adapters.geofency || !settings.adapters.geofency.enabled) {
    process.exit();
}

var geoSettings = settings.adapters.geofency.settings,
    firstId = settings.adapters.geofency.firstId,
    express =   require('express'),
    logger =    require(__dirname+'/../../logger.js'),
    io =        require('socket.io-client'),
    app =       express();

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
    logger.info("adapter geofy connected to ccu.io");
});

socket.on('disconnect', function () {
    logger.info("adapter geofy disconnected from ccu.io");
});

function stop() {
    logger.info("adapter geofy terminating");
    setTimeout(function () {
        process.exit();
    }, 500);
}

process.on('SIGINT', function () {
    stop();
});

process.on('SIGTERM', function () {
    stop();
});


app.use(express.basicAuth(geoSettings.user, geoSettings.pass));

if (geoSettings.ssl) {
    var fs = require('fs');
    var server = require('https').createServer({
        key: fs.readFileSync(__dirname+'/cert/privatekey.pem'),
        cert: fs.readFileSync(__dirname+'/cert/certificate.pem')
    }, app);
} else {
    var server = require('http').createServer(app);
}

server.listen(geoSettings.port);

for (var i = 0; i < geoSettings.devices.length; i++) {
    var dpId = firstId + (i * 5);

    socket.emit("setObject", dpId, {
        Name: "Geofency Name "+geoSettings.devices[i],
        TypeName: "VARDP"
    });
    socket.emit("setObject", dpId+1, {
        Name: "Geofency Longitude "+geoSettings.devices[i],
        TypeName: "VARDP"
    });
    socket.emit("setObject", dpId+2, {
        Name: "Geofency Latitude "+geoSettings.devices[i],
        TypeName: "VARDP"
    });
    socket.emit("setObject", dpId+3, {
        Name: "Geofency Entry "+geoSettings.devices[i],
        TypeName: "VARDP"
    });
    socket.emit("setObject", dpId+4, {
        Name: "Geofency Date "+geoSettings.devices[i],
        TypeName: "VARDP"
    });
}

app.use(express.bodyParser({}));
app.post('/*', function (req, res) {
    res.set('Content-Type', 'text/html');
    var id = parseInt(req.path.slice(1), 10);
    if (geoSettings.devices[id]) {
        var dpId = firstId + (id * 5);
        logger.info("adapter geofy received webhook from device "+id);
        socket.emit("setState", [dpId, req.body.name]);
        socket.emit("setState", [dpId+1, req.body.longitude]);
        socket.emit("setState", [dpId+2, req.body.latitude]);
        socket.emit("setState", [dpId+3, req.body.entry]);
        socket.emit("setState", [dpId+4, formatTimestamp(req.body.date)]);
        res.status(200);
        res.send("OK");
    } else {
        logger.warn("adapter geofy received webhook for unknown device "+id);
        res.status(404);
        res.send("UNKNOWN DEVICE");
    }
});

function formatTimestamp(str) {
    var timestamp = new Date(str);
    var ts = timestamp.getFullYear() + '-' +
        ("0" + (timestamp.getMonth() + 1).toString(10)).slice(-2) + '-' +
        ("0" + (timestamp.getDate()).toString(10)).slice(-2) + ' ' +
        ("0" + (timestamp.getHours()).toString(10)).slice(-2) + ':' +
        ("0" + (timestamp.getMinutes()).toString(10)).slice(-2) + ':' +
        ("0" + (timestamp.getSeconds()).toString(10)).slice(-2);
    return ts;
}
