/**
 *      CCU.IO Sonos Adapter
 *      12'2013-2014 Bluefox
 *
 *      Version 0.2
 *      party derived from https://github.com/jishi/node-sonos-web-controller by Jimmy Shimizu
 */
var settings = require(__dirname+'/../../settings.js');

if (!settings.adapters.sonos || !settings.adapters.sonos.enabled) {
    process.exit();
}

var sonosSettings = settings.adapters.sonos.settings;

var logger         = require(__dirname+'/../../logger.js'),
    io_client      = require('socket.io-client'),
    io             = require('socket.io'),
    http           = require('http'),
    static         = require('node-static'),
    fs             = require('fs'),
    crypto         = require('crypto'),
    sonosDiscovery = require('sonos-discovery');

var objects    = {},
    datapoints = {},
    devices    = {},
    httpServer,   // Sonos HTTP server
    sonosSocket;  // Sonos socket for HTTP Server

if (settings.ioListenPort) {
	var ccu_socket = io_client.connect("127.0.0.1", {
		port: settings.ioListenPort
	});
} else if (settings.ioListenPortSsl) {
	var ccu_socket = io_client.connect("127.0.0.1", {
		port: settings.ioListenPortSsl,
		secure: true
	});
} else {
	process.exit();
}

ccu_socket.on('connect', function () {
    logger.info("adapter ping  connected to ccu.io");
});

ccu_socket.on('disconnect', function () {
    logger.info("adapter ping  disconnected from ccu.io");
});

ccu_socket.on('event', function (obj) {
    if (!obj || !obj[0]) {
        return;
    }
    var id  = obj[0];

    if (!objects[id])
        return;

    var dev = null;

    for (var ip in devices) {
        if (id >= devices[ip].DPs.STATE && id <= devices[ip].DPs.CONTROL) {
            dev = devices[ip];
            break;
        }
    }

    if (!dev)
        return;

    // We can control CONTROL, STATE, FAVORITE_SET, VOLUME and MUTE
    var val = obj[1];
    var ts  = obj[2];
    var ack = obj[3];
	
    if (ack)
        return;

    logger.info ("adapter sonos  try to control id " + id + " with " + val);

    if (val === "false") { val = false; }
    if (val === "true")  { val = true; }
    if (parseInt(val) == val) { val = parseInt(val); }


    var player = dev.player;
    if (!player) {
        player = discovery.getPlayerByUUID(dev.uuid);
        dev.player = player;
    }
    if (player) {
        if (id == dev.DPs.STATE) {
            if (val == 0)
                player.pause();
            else
                player.play();
        }
        else
        if (id == dev.DPs.MUTED) {
            player.mute (!!val); // !! is toBoolean()
        }
        else
        if (id == dev.DPs.VOLUME) {
            player.setVolume(val);
        }
        else
        if (id == dev.DPs.CONTROL) {
            if (val == "stop") {
                player.pause ();
            } else
            if (val == "play") {
                player.play ();
            } else
            if (val == "pause") {
                player.pause ();
            } else
            if (val == "next") {
                player.nextTrack ();
            } else
            if (val == "prev") {
                player.previousTrack ();
            } else
            if (val == "mute") {
                player.mute (true);
            }
            if (val == "unmute") {
                player.mute (false);
            }
        }
        else if (id == dev.DPs.FAVORITE_SET) {
            player.replaceWithFavorite(val, function (success) {
                if (success) player.play();
            });
        }
        else
            logger.warn("adapter sonos  try to control unknown id "+id);
    }
    else
        logger.warn("adapter sonos   SONOS " + dev.uuid + " not found");
});

function stop() {
    logger.info("adapter sonos  terminating");

    if (sonosSettings.webserver.enabled) {
        try {
            sonosSocket.server.close();
        }
        catch (e)
        {
            logger.warn ("Cannot stop sonos webserver:"+ e.toString());
        }
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

function setObject(id, obj) {
    objects[id] = obj;

    if (obj.Value) {
        datapoints[obj.Name] = obj.Value;
    }
    ccu_socket.emit("setObject", id, obj);
}

function setState(id, val) {
    if (datapoints[id] === undefined || datapoints[id] !== val) {
        datapoints[id] = val;
        logger.verbose("adapter sonos  setState "+id+" "+val);
        ccu_socket.emit("setState", [id,val,null,true]);
    }
}
function toFormattedTime(time) {
    var hours = Math.floor(time / 3600);
    hours = (hours) ? (hours + ":") : "";
    var min = Math.floor(time / 60) % 60;
    if (min < 10) min = "0"+min;
    var sec = time % 60;
    if (sec < 10) sec = "0"+sec;

    return hours + min + ":" + sec;
}

function takeSonosState (ip, ids, sonosState) {
    setState (ids.DPs.ALIVE, true);
    if (sonosState.playerState!= "TRANSITIONING") {
        setState (ids.DPs.STATE, (sonosState.playerState == "PAUSED_PLAYBACK") ? 0 : ((sonosState.playerState == "PLAYING") ? 1 : 2));
        if (sonosState.playerState == "PLAYING") {
            if (!ids.elapsedTimer) {
                ids.elapsedTimer = setInterval (function (ip_) {
                    devices[ip_].elapsed += ((sonosSettings.elapsedInterval || 5000) / 1000);

                    if (devices[ip_].elapsed > devices[ip_].duration) {
                        devices[ip_].elapsed = devices[ip_].duration;
                    }

                    setState (devices[ip_].DPs.ELAPSED_TIME,    devices[ip_].elapsed);
                    setState (devices[ip_].DPs.ELAPSED_TIME_S,  toFormattedTime(devices[ip_].elapsed));

                }, sonosSettings.elapsedInterval || 5000, ip);
            }
        }
        else {
            if (ids.elapsedTimer) {
                clearInterval (ids.elapsedTimer);
                ids.elapsedTimer = null;
            }
        }
    }
    // elapsed time
    setState (ids.DPs.CURRENT_ALBUM,   sonosState.currentTrack.album);
    setState (ids.DPs.CURRENT_ARTIST,  sonosState.currentTrack.artist);
    setState (ids.DPs.CURRENT_TITLE,   sonosState.currentTrack.title);
    setState (ids.DPs.CURRENT_DURATION,sonosState.currentTrack.duration);
    setState (ids.DPs.CURRENT_DURATION_S, toFormattedTime(sonosState.currentTrack.duration));
    setState (ids.DPs.CURRENT_COVER,   "http://"+settings.binrpc.listenIp+":"+sonosSettings.webserver.port + sonosState.currentTrack.albumArtURI);
    setState (ids.DPs.ELAPSED_TIME,    sonosState.elapsedTime);
    ids.elapsed  = sonosState.elapsedTime;
    ids.duration = sonosState.currentTrack.duration;
    setState (ids.DPs.ELAPSED_TIME_S,  sonosState.elapsedTimeFormatted);
    setState (ids.DPs.VOLUME,          sonosState.volume);
    if (sonosState.groupState)
        setState (ids.DPs.MUTED,       sonosState.groupState.mute);
}

function takeSonosFavorites (ip, ids, favorites) {
	var sFavorites = "";
	for (var favorite in favorites){
		sFavorites = ((sFavorites) ? ", ": "") + favorites[favorite].title;
	};
	
    setState (ids.DPs.FAVORITES, sFavorites);
}

function processSonosEvents (event, data) {
    if (event == "topology-change") {
        if (data.length > 1) {
            for (var i = 0; i < data[1]; i++) {
                var ids = devices[discovery.players[data[0].uuid].address];
                if (ids) {
                    setState (ids.DPs.ALIVE, true);
                    ids.uuid = data[0].uuid;
                }
            }
        }
    } else
    if (event == "transport-state") {
        // Get ccu.io id
        var ids = devices[discovery.players[data.uuid].address];
        if (ids) {
            takeSonosState (discovery.players[data.uuid].address, ids, data.state);
            ids.uuid = data.uuid;
        }
    } else
    if (event == "group-volume") {
        for (var s in data.playerVolumes) {
            var ids = devices[discovery.players[s].address];
            if (ids) {
                setState (ids.DPs.VOLUME, data.playerVolumes[s]);
                setState (ids.DPs.MUTED,  data.groupState.mute);
                ids.uuid = s;
            }
        }
    } else
    if (event == "favorites") {
        // Go through all players
        for (var uuid in discovery.players) {
			var ids = devices[discovery.players[uuid].address];
        	if (ids) {
            	takeSonosFavorites (devices[discovery.players[uuid].address], ids, data);
    	 	}
        }
    }
    else
        console.log (event + ' ' + data);
}

function sonosInit () {
    var dp;
    var chnDp;
    var devChannels = [];

    for (var id in sonosSettings.devices) {
        var ip = sonosSettings.devices[id].ip;
        var i = parseInt(id.substring(1));
        chnDp = sonosSettings.firstId + 20 + i * 20;
        dp    = chnDp + 1;

        var ip_ = ip.replace(/\./g,"_");

        devChannels.push(chnDp);

        devices[ip] = {
            uuid:     "",
            player:   null,
            duration: 0,
            elapsed:  0,
            DPs: {
                STATE:             dp+0,
                VOLUME:            dp+1,
                MUTED:             dp+2,
                CURRENT_TITLE:     dp+3,
                CURRENT_ARTIST:    dp+4,
                CURRENT_ALBUM:     dp+5,
                CURRENT_COVER:     dp+6,
                CURRENT_DURATION:  dp+7,
                CURRENT_DURATION_S:dp+8,
                CONTROL:           dp+9,
                ALIVE:             dp+10,
                ELAPSED_TIME:      dp+11,
                ELAPSED_TIME_S:    dp+12,
                FAVORITES:         dp+13,
                FAVORITE_SET:      dp+14
            }
        };

        var chObject = {
            Name:     (sonosSettings.devices[id]['name']) ? sonosSettings.devices[id]['name'] : ip,
            TypeName: "CHANNEL",
            Address:  "SONOS."+ip_,
            HssType:  "SONOS",
            DPs:      devices[ip].DPs,
            Parent:   sonosSettings.firstId
        };

        if (sonosSettings.devices[id].rooms) {
            chObject.rooms = sonosSettings.devices[id].rooms;
        }
        if (sonosSettings.devices[id].funcs) {
            chObject.funcs = sonosSettings.devices[id].funcs;
        }
        if (sonosSettings.devices[id].favs) {
            chObject.favs = sonosSettings.devices[id].favs;
        }

        setObject(chnDp, chObject);

        setObject(devices[ip].DPs.STATE, {
            Name:         chObject.Address+".STATE",
            ValueType:    16,
            ValueSubType: 29,
            TypeName:     "HSSDP",
            Value:        0, // 0 - Pause, 1 - play, 2 - stop
            Parent:       chnDp
        });
        setObject(devices[ip].DPs.VOLUME, {
            Name:         chObject.Address+".VOLUME",
            ValueType:    4,
            ValueSubType: 0,
            TypeName:     "HSSDP",
            Value:        0,
            Parent:       chnDp
        });
        setObject(devices[ip].DPs.MUTED, {
            Name:         chObject.Address+".MUTED",
            ValueType:    2,
            ValueSubType: 2,
            TypeName:     "HSSDP",
            Value:        false,
            Parent:       chnDp
        });
        setObject(devices[ip].DPs.CURRENT_TITLE, {
            Name:         chObject.Address+".CURRENT_TITLE",
            ValueType:    20,
            ValueSubType: 11,
            TypeName:     "HSSDP",
            Value:        "",
            Parent:       chnDp
        });
        setObject(devices[ip].DPs.CURRENT_ARTIST, {
            Name:         chObject.Address+".CURRENT_ARTIST",
            ValueType:    20,
            ValueSubType: 11,
            TypeName:     "HSSDP",
            Value:        "",
            Parent:       chnDp
        });
        setObject(devices[ip].DPs.CURRENT_ALBUM, {
            Name:         chObject.Address+".CURRENT_ALBUM",
            ValueType:    20,
            ValueSubType: 11,
            TypeName:     "HSSDP",
            Value:        "",
            Parent:       chnDp
        });
        setObject(devices[ip].DPs.CURRENT_COVER, {
            Name:         chObject.Address+".CURRENT_COVER",
            ValueType:    20,
            ValueSubType: 11,
            TypeName:     "HSSDP",
            Value:        "",
            Parent:       chnDp
        });
        setObject(devices[ip].DPs.CURRENT_DURATION, {
            Name:         chObject.Address+".CURRENT_DURATION", // 116 seconds
            ValueType:    4,
            ValueSubType: 0,
            TypeName:     "HSSDP",
            Value:        0,
            Parent:       chnDp
        });
        setObject(devices[ip].DPs.CURRENT_DURATION_S, {
            Name:         chObject.Address+".CURRENT_DURATION_S", // "01:56"
            ValueType:    20,
            ValueSubType: 11,
            TypeName:     "HSSDP",
            Value:        "00:00",
            Parent:       chnDp
        });
        setObject(devices[ip].DPs.CONTROL, {
            Name:         chObject.Address+".CONTROL", // supported: pause, play, next, prev, mute, unmute
            ValueType:    20,
            ValueSubType: 11,
            TypeName:     "HSSDP",
            Value:        "",
            Parent:       chnDp
        });
        setObject(devices[ip].DPs.ALIVE, {
            Name:         chObject.Address+".ALIVE",
            ValueType:    2,
            ValueSubType: 2,
            TypeName:     "HSSDP",
            Value:        false,
            Parent:       chnDp
        });
        setObject(devices[ip].DPs.ELAPSED_TIME, {
            Name:         chObject.Address+".ELAPSED_TIME", // 116 seconds
            ValueType:    4,
            ValueSubType: 0,
            TypeName:     "HSSDP",
            Value:        0,
            Parent:       chnDp
        });
        setObject(devices[ip].DPs.ELAPSED_TIME_S, {
            Name:         chObject.Address+".ELAPSED_TIME_S", // "01:56"
            ValueType:    20,
            ValueSubType: 11,
            TypeName:     "HSSDP",
            Value:        "00:00",
            Parent:       chnDp
        });
        setObject(devices[ip].DPs.FAVORITES, {
            Name:         chObject.Address+".FAVORITES",
            ValueType:    20,
            ValueSubType: 11,
            TypeName:     "HSSDP",
            Value:        "",
            Parent:       chnDp
        });
        setObject(devices[ip].DPs.FAVORITE_SET, {
            Name:         chObject.Address+".FAVORITE_SET",
            ValueType:    20,
            ValueSubType: 11,
            TypeName:     "HSSDP",
            Value:        "",
            Parent:       chnDp
        });
        i++;
    }

    setObject(sonosSettings.firstId, {
        Name:      "SONOS",
        TypeName:  "DEVICE",
        HssType:   "SONOS_ROOT",
        Address:   "SONOS",
        Interface: "CCU.IO",
        Channels:  devChannels
    });

    ccu_socket.on('news', function (data) {
        console.log(data);
        ccu_socket.emit('my other event', { my: 'data' });
    });
}

sonosInit ();

var discovery   = new sonosDiscovery();
var playerIps   = [];
var playerCycle = 0;
var queues      = {};

if (sonosSettings.webserver.enabled) {
    var cacheDir    = __dirname+'/cache';
    var fileServer  = new static.Server(__dirname+'/www');

    fs.mkdir(cacheDir, function (e) {
        if (e && e.code != 'EEXIST')
            console.log('creating cache dir failed.', e);
    });

    httpServer = http.createServer(function (req, res) {

        if (/^\/getaa/.test(req.url)) {
            // this is a resource, download from player and put in cache folder
            var md5url = crypto.createHash('md5').update(req.url).digest('hex');
            var fileName = cacheDir + '/' + md5url;

            if (playerIps.length == 0) {
                for (var i in discovery.players) {
                    playerIps.push(discovery.players[i].address);
                }
            }

			fs.exists = fs.exists || require('path').exists;
            fs.exists(fileName, function (exists) {
                if (exists) {
                    var readCache = fs.createReadStream(fileName);
                    readCache.pipe(res);
                    return;
                }

                var playerIp = playerIps[playerCycle++%playerIps.length];
                console.log('fetching album art from', playerIp);
                http.get({
                    hostname: playerIp,
                    port: 1400,
                    path: req.url
                }, function (res2) {
                    console.log(res2.statusCode);
                    if (res2.statusCode == 200) {
                        var cacheStream = fs.createWriteStream(fileName);
                        res2.pipe(cacheStream);
                    } else if (res2.statusCode == 404) {
                        // no image exists! link it to the default image.
                        console.log(res2.statusCode, 'linking', fileName)
                        fs.link(__dirname+'/lib/browse_missing_album_art.png', fileName, function (e) {
                            res2.resume();
                            if (e) console.log(e);
                        });
                    }

                    res2.on('end', function () {
                        console.log('serving', req.url);
                        var readCache = fs.createReadStream(fileName);
                        readCache.on('error', function (e) {
                            console.log(e);
                        });
                        readCache.pipe(res);
                    });
                }).on('error', function(e) {
                        console.log("Got error: " + e.message);
                    });
            });
        } else {
            req.addListener('end', function () {
                fileServer.serve(req, res);
            }).resume();
        }
    });

    sonosSocket = io.listen(httpServer);
    sonosSocket.set('log level', 1);

    sonosSocket.sockets.on('connection', function (socket) {
        // Send it in a better format
        var players = [];
        var player;
        for (var uuid in discovery.players) {
            player = discovery.players[uuid];
            players.push(player.convertToSimple());
        }

        if (players.length == 0) return;

        socket.emit('topology-change', players);
        player.getFavorites(function (success, favorites) {
            socket.emit('favorites', favorites);
        });

        socket.on('transport-state', function (data) {
            // find player based on uuid
            var player = discovery.getPlayerByUUID(data.uuid);

            if (!player) return;

            // invoke action
            console.log(data)
            player[data.state]();
        });

        socket.on('group-volume', function (data) {
            // find player based on uuid
            var player = discovery.getPlayerByUUID(data.uuid);
            if (!player) return;

            // invoke action
            console.log(data)
            player.groupSetVolume(data.volume);
        });

        socket.on('group-management', function (data) {
            // find player based on uuid
            console.log(data)
            var player = discovery.getPlayerByUUID(data.player);
            if (!player) return;

            if (data.group == null) {
                player.becomeCoordinatorOfStandaloneGroup();
                return;
            }

            player.setAVTransportURI('x-rincon:' + data.group);
        });

        socket.on('play-favorite', function (data) {
            console.log(data)
            var player = discovery.getPlayerByUUID(data.uuid);
            if (!player) return;

            player.replaceWithFavorite(data.favorite, function (success) {
                if (success) player.play();
            });
        });

        socket.on('queue', function (data) {
            loadQueue(data.uuid, socket);
        });

        socket.on('seek', function (data) {
            var player = discovery.getPlayerByUUID(data.uuid);
            if (player.avTransportUri.startsWith('x-rincon-queue')) {
                player.seek(data.trackNo);
                return;
            }

            // Player is not using queue, so start queue first
            player.setAVTransportURI('x-rincon-queue:' + player.uuid + '#0', '', function (success) {
                if (success)
                    player.seek(data.trackNo, function (success) {
                        player.play();
                    });
            });
        });

        socket.on('playmode', function (data) {
            var player = discovery.getPlayerByUUID(data.uuid);
            for (var action in data.state) {
                player[action](data.state[action]);
            }
        });

        socket.on('volume', function (data) {
            var player = discovery.getPlayerByUUID(data.uuid);
            player.setVolume(data.volume);
        });

		socket.on('group-mute', function (data) {
			console.log(data)
			var player = discovery.getPlayerByUUID(data.uuid);
			player.groupMute(data.mute);
		});
	
		socket.on('mute', function (data) {
			var player = discovery.getPlayerByUUID(data.uuid);
			player.mute(data.mute);
		});

		socket.on('track-seek', function (data) {
			var player = discovery.getPlayerByUUID(data.uuid);
			player.trackSeek(data.elapsed);
		});
		
        socket.on("error", function (e) {
            console.log(e);
        })
    });
}

discovery.on('topology-change', function (data) {
    var players = [];
    for (var uuid in discovery.players) {
        var player = discovery.players[uuid];
        players.push(player.convertToSimple());
    }
    if (sonosSocket)
        sonosSocket.sockets.emit('topology-change', players);

    processSonosEvents ('topology-change', data)
});

discovery.on('transport-state', function (data) {
    if (sonosSocket)
        sonosSocket.sockets.emit('transport-state', data);
    processSonosEvents ('transport-state', data)
});

discovery.on('group-volume', function (data) {
    if (sonosSocket)
        sonosSocket.sockets.emit('group-volume', data);
    processSonosEvents ('group-volume', data)
});

discovery.on('favorites', function (data) {
    if (sonosSocket)
        sonosSocket.sockets.emit('favorites', data);
    processSonosEvents ('favorites', data)
});

discovery.on('queue-changed', function (data) {
    console.log('queue-changed', data);
    delete queues[data.uuid];
    loadQueue(data.uuid, sonosSocket.sockets);
    processSonosEvents ('queue-changed', data)
});

discovery.on('group-mute', function (data) {
    if (sonosSocket)
        sonosSocket.sockets.emit('group-mute', data);
});
 
discovery.on('mute', function (data) {
    if (sonosSocket)
        sonosSocket.sockets.emit('mute', data);
});

function loadQueue(uuid, socket) {
    function getQueue(startIndex, requestedCount) {
        var player = discovery.getPlayerByUUID(uuid);
        player.getQueue(startIndex, requestedCount, function (success, queue) {
            if (!success) return;
            socket.emit('queue', {uuid: uuid, queue: queue});

            if (!queues[uuid] || queue.startIndex == 0) {
                queues[uuid] = queue;
            } else {
                queues[uuid].items = queues[uuid].items.concat(queue.items);
            }

            if (queue.startIndex + queue.numberReturned < queue.totalMatches) {
                getQueue(queue.startIndex + queue.numberReturned, 100);
            }
        });
    }

    if (!queues[uuid]) {
        getQueue(0, 100);
    } else {
        var queue = queues[uuid];
        queue.numberReturned = queue.items.length;
        socket.emit('queue', {uuid: uuid, queue: queue});
        if (queue.totalMatches > queue.items.length) {
            getQueue(queue.items.length, 100);
        }
    }
}

if (sonosSettings.webserver.enabled) {
    httpServer.listen(sonosSettings.webserver.port);
    console.log("http sonos server listening on port", sonosSettings.webserver.port);
}

