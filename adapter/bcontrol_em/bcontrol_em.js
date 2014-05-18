/**
 *  Adapter für B-control Energy Manager
 *
 *  Version 0.1
 *
 *  (c) 4'2014 hobbyquaker
 *
 *
 *
 */

var ftpd = require('ftpd');

var settings = require(__dirname+'/../../settings.js');

if (!settings.adapters.bcontrol_em || !settings.adapters.bcontrol_em.enabled) {
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

var adapterSettings = settings.adapters.bcontrol_em.settings;
var firstId = settings.adapters.bcontrol_em.firstId;
adapterSettings.users = {};
adapterSettings.users[adapterSettings.user] = adapterSettings.pass;

var metaObjects = {},
    metaIndex = {},
    dataLoaded = false;

socket.emit('getObjects', function(objects) {
    logger.info("adapter bem   fetched metaObjects from ccu.io");
    metaObjects = objects;
    socket.emit('getIndex', function(objIndex) {
        logger.info("adapter bem   fetched metaIndex from ccu.io");
        metaIndex = objIndex;
        dataLoaded = true;
    });
});

function bemDev(file, text) {

    if (!text) return;

    var snArr = file.match(/-SN([0-9]+)-/);
    var sn = snArr[1];

    var dev = {
        Name: "B-control EnergyManager SN"+sn,
        Address: "BEM"+sn,
        HssType: "BCONTROL-ENERGYMANAGER",
        TypeName: "DEVICE",
        Interface: "BEM",
        _findNextId: true,
        _persistent: true
    };

    var devId;

    if (metaIndex.Address[dev.Address]) {

        // Gerät bereits vorhanden
        devId = metaIndex.Address[dev.Address][0];
        //console.log(devId, dev);
        bemCh(devId, dev, text);

    } else {

        // Gerät muss neu angelegt werden
        socket.emit("setObject", firstId, dev, function (id) {
            devId = id;
            //console.log(devId, dev);
            metaIndex.Address[dev.Address] = [devId];
            bemCh(devId, dev, text);
        });
    }

}

var channelCount = 0;
var setChannelCounter = 0;
var channels = [];
var channelIds = [];
var dpIds = [];

function bemCh(devId, dev, text) {

    // Split Lines
    var lines = text.split("\r\n");

    // Split Bezeichnung
    var desc = lines[0].split(";");

    //console.log(desc);

    // Split Seriennummern
    var serials = lines[1].split(";");

    // Split OBIS-Codes
    var obis = lines[2].split(";");

    // Pure Data
    lines.splice(0, 4);

    // Anzahl Kanäle
    channelCount = (desc.length - 1) / 2;
    setChannelCounter = channelCount;

    for (var i = 0; i < channelCount; i++) {
        var idx = (i * 2) + 2;
        channels[i] = {
            Name: "EnergyManager " + desc[idx],
            Address: dev.Address + ":" + JSON.parse(serials[idx]),
            HssType: "OBIS_" + obis[idx],
            TypeName: "CHANNEL",
            Parent: devId,
            _persistent: true,
            _findNextId: true

        }
    }
    //console.log(channels);
    setBemCh(lines);
}

function setBemCh(lines) {
    console.log("setBemCh()");
    if (setChannelCounter == 0) {
        //console.log("all channels set!");
        //console.log(channelIds);
        //console.log(dpIds);
        setBemValues(lines);
        return;
    }
    var i = --setChannelCounter;

    var dp1 = {
        Name: "BEM." + channels[i].Address + ".MEAN15MINUTES",
        TypeName: "HSSDP",
        ValueUnit: "W",
        _persistent: true,
        _findNextId: true
    };

    if (metaIndex.Address[channels[i].Address]) {
        // Kanal existiert bereits
        channelIds[i] = metaIndex.Address[channels[i].Address][0];

        if (metaIndex.Name[dp1.Name]) {
            // Datenpunkt existiert bereits
            dpIds[i] = metaIndex.Name[dp1.Name][0];
            setBemCh(lines);
        } else {
            // Datenpunkt muss angelegt werden
            dp1.Parent = channelIds[i];
            socket.emit("setObject", firstId, dp1, function (dpId) {
                dpIds[i] = dpId;
                metaIndex.Name[dp1.Name] = [dpId];
                setBemCh(lines);
            });
        }

    } else {

        // Kanal muss angelegt werden
        socket.emit("setObject", firstId, channels[i], function (id) {
            channelIds[i] = id;
            metaIndex.Address[channels[i].Address] = id;

            // Datenpunkt muss angelegt werden
            dp1.Parent = id;
            socket.emit("setObject", firstId, dp1, function (dpId) {
                dpIds[i] = dpId;
                metaIndex.Name[dp1.Name] = [dpId];
                setBemCh(lines);
            });

        });
    }
}

function setBemValues(lines) {
    //console.log(" --- data");
    //console.log(lines);
    //console.log("---");
    //console.log(lines[lines.length - 2]);
    var parts = lines[lines.length - 2].split(";");
    for (var i = 0; i < channelCount; i++) {
        var idx = (i * 2) + 2;
        var val = parseFloat(parts[idx]) * 4;
        socket.emit("setState", [dpIds[i], val, null, true]);
        //console.log("setState " + dpIds[i]+ " "+val);
    }
}

function receiver(name, text) {

    var nameParts = name.split("/");

    var user = nameParts[1];
    var file = nameParts[2];


    if (!dataLoaded) {
        return;
    }

    logger.info("adapter bem   received file "+file+" from user "+user);

    //console.log(text);

    bemDev(file, text);

}

// implements only empty dir and file receiving
var ftpfs = {
    readdir: function (path, callback) {
        logger.verbose("adapter bem   readdir", arguments);
        callback(null, []);

    },
    stat: function (path, callback) {
        logger.verbose("adapter bem   stat", arguments);
        var ts = new Date();
        callback(null, {
            isDirectory: function () {
                return true;
            },
            mode: 16877,
            size: 68,
            mtime: ts
        });
    },
    writeFile: function (file, buf, callback) {
        ////console.log("adapter bem   writeFile", arguments);
        callback();
        receiver(file, buf.toString());
    },
    createWriteStream: function () {
        logger.info("adapter bem   createWriteStream", arguments);
    },
    createReadStream: function () {
        logger.info("adapter bem   createReadStream", arguments);
    },
    readFile: function () {
        logger.info("adapter bem   readFile", arguments);
    },
    unlink: function () {
        logger.info("adapter bem   unlink", arguments);
    },
    mkdir: function () {
        logger.info("adapter bem   mkdir", arguments);
    },
    open: function () {
        logger.info("adapter bem   open", arguments);
    },
    close: function () {
        logger.info("adapter bem   close", arguments);
    },
    rmdir: function () {
        logger.info("adapter bem   rmdir", arguments);
    },
    rename: function () {
        logger.info("adapter bem   rename", arguments);
    }

};

var options = {
    pasvPortRangeStart: 4000,
    pasvPortRangeEnd: 5000,
    useWriteFile: true,
    getInitialCwd: function(connection, callback) {
        logger.info("adapter bem   getInitialCwd", connection.username);
        callback(null, '/');
    },
    getRoot: function(connection, callback) {
        logger.info("adapter bem   getRoot", connection.username);
        callback(null, '/'+connection.username);
    }
};



var server = new ftpd.FtpServer(adapterSettings.host, options);

server.on('client:connected', function(conn) {
    var username;
    logger.info('adapter bem   connect from ' + conn.socket.remoteAddress);
    conn.on('command:user', function(user, success, failure) {
        logger.info('adapter bem   ' + conn.socket.remoteAddress + ' username '+user);

        username = user;

        if (adapterSettings.users[username] !== undefined) {
            success();
        } else {
            logger.warn("adapter bem   user "+username+" unkown");
            failure();
        }


    });
    conn.on('command:pass', function(pass, success, failure) {
        if (username == 'anonymous') {
            success(username, ftpfs);
            logger.info("adapter bem   user "+username+" logged in");
        } else if (pass == adapterSettings.users[username]) {
            success(username, ftpfs);
            logger.info("adapter bem   user "+username+" logged in");
        } else {
            logger.warn("adapter bem   user "+username+" wrong password");
            failure();
        }
    });
});

server.listen(adapterSettings.port);
logger.info('adapter bem   ftp server listening on '+adapterSettings.host+':'+adapterSettings.port);

socket.on('connect', function () {
    logger.info("adapter bem   connected to ccu.io");
});

socket.on('disconnect', function () {
    logger.info("adapter bem   disconnected from ccu.io");
});


function stop() {
    logger.info("adapter bem   terminating");
    server.close();
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
