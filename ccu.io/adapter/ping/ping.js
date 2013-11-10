/**
 *      CCU.IO Ping Adapter
 *      11'2013 Bluefox
 *
 *      Version 0.1
 *
 */
var settings = require(__dirname+'/../../settings.js');

if (!settings.adapters.ping || !settings.adapters.ping.enabled) {
    process.exit();
}

var pingSettings = settings.adapters.ping.settings;

var logger = require(__dirname+'/../../logger.js'),
    io     = require('socket.io-client'),
	ping   = require("ping");

var objects = {},
    datapoints = {},
    curIP = null;

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
    logger.info("adapter ping  connected to ccu.io");
});

socket.on('disconnect', function () {
    logger.info("adapter ping  disconnected from ccu.io");
});

function stop() {
    logger.info("adapter ping  terminating");
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

function setObject(id, obj) {
    objects[id] = obj;
    if (obj.Value) {
        datapoints[obj.Name] = [obj.Value];
    }
    socket.emit("setObject", id, obj);
}

function pingInit () {
	var dp = pingSettings.firstId + 1;
    var devChannels = [];
	var i = 0;
	
    for (var ip in pingSettings.IPs) {
        var ip_ = ip.replace(/\./g,"_");

        devChannels.push(dp);
		
        var chObject = {
            Name: (pingSettings.IPs[ip]['name']) ? pingSettings.IPs[ip]['name'] : ip,
            TypeName: "CHANNEL",
            Address: "PING."+ip_,
            HssType: "PING",
            DPs: {
                STATE: dp+1
            },
            Parent: pingSettings.firstId
        };
		
		if (pingSettings.IPs[ip].rooms) {
			chObject.rooms = pingSettings.IPs[ip].rooms;
		}
		if (pingSettings.IPs[ip].funcs) {
			chObject.funcs = pingSettings.IPs[ip].funcs;
		}
		if (pingSettings.IPs[ip].favs) {
			chObject.favs = pingSettings.IPs[ip].favs;
		}
		
		setObject(dp, chObject);

		setObject(dp+1, {
            Name: "PING."+ip_+".STATE",
            ValueType: 2,
            TypeName: "HSSDP",
            Value: false,
            Parent: dp
        });
		dp += 2;
    }
		
    setObject(pingSettings.firstId, {
        Name: "Ping",
        TypeName: "DEVICE",
        HssType: "PING",
        Address: "PING",
        Interface: "CCU.IO",
        Channels: devChannels
    });

    logger.info("adapter ping  inserted objects");

    logger.info("adapter ping  polling enabled - interval "+pingSettings.pollingInterval+"ms");

    setInterval(pollIp, pingSettings.pollingInterval);
    pollIp (undefined);
}

function setState(id, val) {
	datapoints[id] = [val];
	logger.verbose("adapter ping  setState "+id+" "+val);
	socket.emit("setState", [id,val,null,true]);
}

function pollIp(ip) {
    var isFound = false;
    curIP = null;
    for (var ip_ in pingSettings.IPs) {
        if (ip == undefined) {
            curIP = ip_;
            break;
        }

        if (isFound) {
            curIP = ip_;
            break;
        }

        if (ip == ip_) {
            isFound = true;
        }
    }
    if (curIP != null) {
        logger.verbose("adapter ping  polling ip "+curIP);
        ping.sys.probe(curIP, function(isAlive){
            if (!isAlive) {
                logger.verbose("adapter ping  result for "+curIP+" is UNRECHABLE");
                setState("PING."+curIP.replace(/\./g,"_")+".STATE",  false);
            } else {
                logger.verbose("adapter ping  result for "+curIP+" is ALIVE");
                setState("PING."+curIP.replace(/\./g,"_")+".STATE",  true);
            }
        });
        setTimeout (pollIp, 5000, curIP);
    }
}

pingInit ();

