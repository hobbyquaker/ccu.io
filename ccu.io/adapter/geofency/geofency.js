var express =   require('express');
var settings = require(__dirname+'/../../settings.js');

if (!settings.adapters.geofency || !settings.adapters.geofency.enabled) {
    process.exit();
}

var geoSettings = settings.adapters.geofency.settings;


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
    logger.info("adapter geof. connected to ccu.io");
});

socket.on('disconnect', function () {
    logger.info("adapter geof. disconnected from ccu.io");
});

socket.on('event', function (obj) {
    if (!obj || !obj[0]) {
        return;
    }
});

function stop() {
    logger.info("adapter geof. terminating");
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

var i = 0;
for (var id in geoSettings.devices) {
    socket.emit("setObject", geoSettings.devices[id], {
        Name: "Geofency Name "+i,
        DPInfo: id,
        TypeName: "VARDP"
    });
    socket.emit("setObject", geoSettings.devices[id]+1, {
        Name: "Geofency Longitude "+i,
        DPInfo: id,
        TypeName: "VARDP"
    });
    socket.emit("setObject", geoSettings.devices[id]+2, {
        Name: "Geofency Latitude "+i,
        DPInfo: id,
        TypeName: "VARDP"
    });
    socket.emit("setObject", geoSettings.devices[id]+3, {
        Name: "Geofency Entry "+i,
        DPInfo: id,
        TypeName: "VARDP"
    });
    socket.emit("setObject", geoSettings.devices[id]+4, {
        Name: "Geofency Date "+i,
        DPInfo: id,
        TypeName: "VARDP"
    });
    i += 1;
}


app =  express();

app.use(express.basicAuth(geoSettings.user, geoSettings.pass));

var server =    require('http').createServer(app);

server.listen(geoSettings.port);

app.use(express.bodyParser({}));
app.post('/', function (req, res) {
    if (geoSettings.devices[req.body.id]) {
        logger.info("adapter geof. received webhook from id "+req.body.id);
        socket.emit("setState", [geoSettings.devices[req.body.id], req.body.name]);
        socket.emit("setState", [geoSettings.devices[req.body.id]+1, req.body.longitude]);
        socket.emit("setState", [geoSettings.devices[req.body.id]+2, req.body.latitude]);
        socket.emit("setState", [geoSettings.devices[req.body.id]+3, req.body.entry]);
        socket.emit("setState", [geoSettings.devices[req.body.id]+4, req.body.date]);

    } else {
        logger.warn("adapter geof. received webhook from unknown id "+req.body.id);
    }

    res.set('Content-Type', 'text/html');
    res.send("<!DOCTYPE html><html><body>OK</body></html>");
});