/**
 *      CCU.IO Ping Adapter
 *      11'2013 Bluefox
 *
 *      Version 0.2
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

var stateIDs = {},
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
    socket.emit("setObject", id, obj);
}

function pingInit () {
    var devChannels = [];
    var i = 0;

    for (var id_ in pingSettings.IPs) {
        var id = parseInt (id_.substring(1));

        var ip_ = pingSettings.IPs[id_].ip.replace(/\./g,"_");

        devChannels.push((pingSettings.firstId + 1) + (id * 2));
		
        var chObject = {
            Name: (pingSettings.IPs[id_]['name']) ? pingSettings.IPs[id_]['name'] : pingSettings.IPs[id_].ip,
            TypeName: "CHANNEL",
            Address:  "PING."+ip_,
            HssType:  "PING",
            DPs: {
                STATE: (pingSettings.firstId + 1) + (id * 2) + 1
            },
            Parent:   pingSettings.firstId
        };
		
		if (pingSettings.IPs[id_].rooms) {
			chObject.rooms = pingSettings.IPs[id_].rooms;
		}
		if (pingSettings.IPs[id_].funcs) {
			chObject.funcs = pingSettings.IPs[id_].funcs;
		}
		if (pingSettings.IPs[id_].favs) {
			chObject.favs = pingSettings.IPs[id_].favs;
		}
		
		setObject((pingSettings.firstId + 1) + (id * 2), chObject);

		setObject((pingSettings.firstId + 1) + (id * 2) + 1, {
            Name:      "PING."+ip_+".STATE",
            ValueType: 2,
            TypeName:  "HSSDP",
            Value:     false,
            Parent:    (pingSettings.firstId + 1) + (id * 2)
        });

        stateIDs["PING."+ip_+".STATE"] = (pingSettings.firstId + 1) + (id * 2) + 1;

        i++;
    }
		
    setObject(pingSettings.firstId, {
        Name:      "Ping",
        TypeName:  "DEVICE",
        HssType:   "PING",
        Address:   "PING",
        Interface: "CCU.IO",
        Channels:  devChannels
    });

    logger.info("adapter ping  inserted objects");
	// Fix polling interval if too short
	if (pingSettings.pollingInterval <= 5000 * (i + 1)) {
		pingSettings.pollingInterval = 5000 * (i + 1);
	}

    logger.info("adapter ping  polling enabled - interval "+pingSettings.pollingInterval+"ms");

    setInterval(pollIp, pingSettings.pollingInterval);
    pollIp (undefined);
}

function setState(id, val) {
    id = stateIDs[id];
    logger.verbose("adapter ping  setState "+id+" "+val);
    socket.emit("setState", [id,val,null,true]);
}

function pollIp(ip) {
    var isFound = false;
    curIP = null;

    for (var id_ in pingSettings.IPs) {
        if (ip == undefined) {
            curIP = pingSettings.IPs[id_].ip;
            break;
        }

        if (isFound) {
            curIP = pingSettings.IPs[id_].ip;
            break;
        }

        if (ip ==  pingSettings.IPs[id_].ip) {
            isFound = true;
        }
    }

    if (curIP != null) {
        logger.verbose("adapter ping  polling ip " + curIP);
        try {
	        ping.sys.probe(curIP, function(isAlive){
	            if (!isAlive) {
	                logger.verbose("adapter ping  result for "+curIP+" is UNRECHABLE");
	                setState("PING."+curIP.replace(/\./g,"_")+".STATE",  false);
	            } else {
	                logger.verbose("adapter ping  result for "+curIP+" is ALIVE");
	                setState("PING."+curIP.replace(/\./g,"_")+".STATE",  true);
	            }
	        });
        } catch(e)
        {
            logger.error("adapter ping  error by probe of " + curIP + ": " + e);
        }
        setTimeout (pollIp, 5000, curIP);
    }
}

pingInit ();

