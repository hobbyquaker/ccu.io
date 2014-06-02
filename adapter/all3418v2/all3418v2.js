/**
 *  Adapter für ALLNET ALL3418v2 / IP Thermometer LAN / WLAN ®
 *
 *  Version 0.1
 *
 *  6'2014 hobbyquaker
 *
 *
 *
 */

var ftpd = require('ftpd');

var settings = require(__dirname+'/../../settings.js');

if (!settings.adapters.all3418v2 || !settings.adapters.all3418v2.enabled) {
    process.exit();
}

var logger =    require(__dirname+'/../../logger.js');


var io =        require('socket.io-client');


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

var adapterSettings = settings.adapters.all3418v2.settings;
var firstId = settings.adapters.all3418v2.firstId;
adapterSettings.users = {};
adapterSettings.users[adapterSettings.user] = adapterSettings.pass;

var metaObjects = {},
    metaIndex = {},
    dataLoaded = false;

socket.emit('getObjects', function(objects) {
    logger.info("adapter all3418v2   fetched metaObjects from ccu.io");
    metaObjects = objects;
    socket.emit('getIndex', function(objIndex) {
        logger.info("adapter all3418v2   fetched metaIndex from ccu.io");
        metaIndex = objIndex;
        dataLoaded = true;
    });
});

function all3418v2Dev(file, text) {

    if (!text) return;

    var tmpArr = file.split('_');
    var sn = tmpArr[0];

    var dev = {
        Name: "ALLNET 3418v2 " + sn,
        Address: sn,
        HssType: "all3418v2",
        TypeName: "DEVICE",
        Interface: "ALLNET",
        _findNextId: true,
        _persistent: true
    };

    var devId;

    if (metaIndex.Address[dev.Address]) {

        // Gerät bereits vorhanden
        devId = metaIndex.Address[dev.Address][0];
        //console.log(devId, dev);
        all3418v2Ch(devId, dev, text);

    } else {

        // Gerät muss neu angelegt werden

        logger.info("adapter all3418v2   creating device " + dev.Address);
        socket.emit("setObject", firstId, dev, function (id) {
            devId = id;
            //console.log(devId, dev);
            metaIndex.Address[dev.Address] = [devId];
            all3418v2Ch(devId, dev, text);
        });
    }

}

var channelCount = 0;
var setChannelCounter = 0;
var channels = [];
var channelIds = [];
var dpIds = [];

function all3418v2Ch(devId, dev, text) {

    // Split Lines
    if (text.match(/\r\n/)) {
        var lines = text.split("\r\n");
    } else {
        var lines = text.split("\n");
    }



    // Split Anschlussnummern
    var chno = lines[0].split(";");
    chno.splice(0, 3);


    // Split Anschlussnamen
    var chname = lines[1].split(";");
    chname.splice(0, 3);


    // Anzahl Kanäle
    channelCount = (chno.length);
    setChannelCounter = channelCount;



	// Pure Data
    lines.splice(0, 2);

	
    for (var i = 0; i < channelCount; i++) {
        channels[i] = {
            Name: dev.Address + " " + chname[i].replace(/"/g, ''),
            Address: dev.Address + "." + chno[i].replace(/"/g, ''),
            HssType: "all3418v2",
            TypeName: "CHANNEL",
            Parent: devId,
            _persistent: true,
            _findNextId: true
        }
    }


    //console.log(channels);
    setall3418v2Ch(lines, dev);
}

function setall3418v2Ch(lines, dev) {

    if (setChannelCounter == 0) {
        //console.log("all channels set!");
        //console.log(channelIds);
        //console.log(dpIds);
        setall3418v2Values(lines);
        return;
    }
    var i = --setChannelCounter;

    var dp1 = {
        Name: channels[i].Address + ".AVG15",
        TypeName: "HSSDP",
        ValueUnit: "",
        _persistent: true,
        _findNextId: true
    };

    if (metaIndex.Address[channels[i].Address]) {
        // Kanal existiert bereits
        channelIds[i] = metaIndex.Address[channels[i].Address][0];

        if (metaIndex.Name[dp1.Name]) {
            // Datenpunkt existiert bereits
            dpIds[i] = metaIndex.Name[dp1.Name][0];
            setall3418v2Ch(lines, dev);
        } else {
            // Datenpunkt muss angelegt werden
            dp1.Parent = channelIds[i];
            socket.emit("setObject", firstId, dp1, function (dpId) {
                dpIds[i] = dpId;
                metaIndex.Name[dp1.Name] = [dpId];
                setall3418v2Ch(lines, dev);
            });
        }

    } else {

        // Kanal muss angelegt werden
        logger.info("adapter all3418v2   creating channel " + channels[i].Address);
        socket.emit("setObject", firstId, channels[i], function (id) {
            channelIds[i] = id;
            metaIndex.Address[channels[i].Address] = id;

            // Datenpunkt muss angelegt werden
            dp1.Parent = id;
            socket.emit("setObject", firstId, dp1, function (dpId) {
                dpIds[i] = dpId;
                metaIndex.Name[dp1.Name] = [dpId];
                setall3418v2Ch(lines);
            });

        });
    }
}

function setall3418v2Values(lines) {
    //console.log(" --- data");
    //console.log(lines);
    //console.log("---");
    //console.log(lines[lines.length - 2]);
    var parts = lines[0].split(";");
    for (var i = 0; i < channelCount; i++) {
        var idx = (i + 3);
        var val = parseFloat(parts[idx]);
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

    logger.info("adapter all3418v2   received file "+file+" from user "+user);

    //console.log(text);

    all3418v2Dev(file, text);

}

// implements only empty dir and file receiving
var ftpfs = {
    readdir: function (path, callback) {
        logger.verbose("adapter all3418v2   readdir", arguments);
        callback(null, []);

    },
    stat: function (path, callback) {
        logger.verbose("adapter all3418v2   stat", arguments);
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
        ////console.log("adapter all3418v2   writeFile", arguments);
        callback();
        receiver(file, buf.toString());
    },
    createWriteStream: function () {
        logger.info("adapter all3418v2   createWriteStream", arguments);
    },
    createReadStream: function () {
        logger.info("adapter all3418v2   createReadStream", arguments);
    },
    readFile: function () {
        logger.info("adapter all3418v2   readFile", arguments);
    },
    unlink: function () {
        logger.info("adapter all3418v2   unlink", arguments);
    },
    mkdir: function () {
        logger.info("adapter all3418v2   mkdir", arguments);
    },
    open: function () {
        logger.info("adapter all3418v2   open", arguments);
    },
    close: function () {
        logger.info("adapter all3418v2   close", arguments);
    },
    rmdir: function () {
        logger.info("adapter all3418v2   rmdir", arguments);
    },
    rename: function () {
        logger.info("adapter all3418v2   rename", arguments);
    }

};

var options = {
    pasvPortRangeStart: 4000,
    pasvPortRangeEnd: 5000,
    useWriteFile: true,
    getInitialCwd: function(connection, callback) {
        logger.info("adapter all3418v2   getInitialCwd", connection.username);
        callback(null, '/');
    },
    getRoot: function(connection, callback) {
        logger.info("adapter all3418v2   getRoot", connection.username);
        callback(null, '/'+connection.username);
    }
};



var server = new ftpd.FtpServer(adapterSettings.host, options);

server.on('client:connected', function(conn) {
    var username;
    logger.info('adapter all3418v2   connect from ' + conn.socket.remoteAddress);
    conn.on('command:user', function(user, success, failure) {
        logger.info('adapter all3418v2   ' + conn.socket.remoteAddress + ' username '+user);

        username = user;

        if (adapterSettings.users[username] !== undefined) {
            success();
        } else {
            logger.warn("adapter all3418v2   user "+username+" unkown");
            failure();
        }


    });
    conn.on('command:pass', function(pass, success, failure) {
        if (username == 'anonymous') {
            success(username, ftpfs);
            logger.info("adapter all3418v2   user "+username+" logged in");
        } else if (pass == adapterSettings.users[username]) {
            success(username, ftpfs);
            logger.info("adapter all3418v2   user "+username+" logged in");
        } else {
            logger.warn("adapter all3418v2   user "+username+" wrong password");
            failure();
        }
    });
});

server.listen(adapterSettings.port);
logger.info('adapter all3418v2   ftp server listening on '+adapterSettings.host+':'+adapterSettings.port);

socket.on('connect', function () {
    logger.info("adapter all3418v2   connected to ccu.io");
});

socket.on('disconnect', function () {
    logger.info("adapter all3418v2   disconnected from ccu.io");
});


function stop() {
    logger.info("adapter all3418v2   terminating");
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
