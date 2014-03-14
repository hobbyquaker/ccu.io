
/**
 *      CCU Adapter
 *
 *      Socket.IO based HomeMatic Interface
 *
 *      Copyright (c) 2013 http://hobbyquaker.github.io
 *
 *      CC BY-NC 3.0
 *
 *      Kommerzielle Nutzung nicht gestattet!
 *
 */

// Keep WebStorm satisfied
if (typeof __dirname == "undefined") {
    var __dirname = "";
}

var settings = require(__dirname+'/../../settings.js');

if (!settings.adapters.ccu || !settings.adapters.ccu.enabled) {
    process.exit();
}

/** @namespace settings.adapters.ccu */
var ccuSettings = settings.adapters.ccu.settings;

ccuSettings.stringTableLanguage = ccuSettings.stringTableLanguage || "de";


/** @namespace ccuSettings.regahss */
/** @namespace ccuSettings.binrpc */
/** @namespace ccuSettings.binrpc.checkEvents */
/** @namespace ccuSettings.ccuIp */
/** @namespace ccuSettings.stringTableLanguage */
ccuSettings.regahss.metaScripts = [
    "favorites",
    "variables",
    "programs",
    "rooms",
    "functions",
    "devices",
    "channels",
    "datapoints",
    "alarms"
];

ccuSettings.binrpc.inits = [];

var logger =    require(__dirname+'/../../logger.js'),
    binrpc =    require(__dirname+"/binrpc.js"),
    rega =      require(__dirname+"/rega.js"),
    request =   require('request'),
    io =        require('socket.io-client'),
    pollTimer,
    ccuReachable = false,
    ccuRegaUp = false,
    initsDone = false,
    lastEvents = {},
    socket;

if (settings.ioListenPort) {
    socket = io.connect("127.0.0.1", {
        port: settings.ioListenPort
    });
} else if (settings.ioListenPortSsl) {
    socket = io.connect("127.0.0.1", {
        port: settings.ioListenPortSsl,
        secure: true
    });
} else {
    process.exit();
}

if (ccuSettings.binrpc.rfdEnabled) {
    ccuSettings.binrpc.inits.push({id:ccuSettings.binrpc.rfdId, port:ccuSettings.binrpc.rfdPort});
}
if (ccuSettings.binrpc.hs485dEnabled) {
    ccuSettings.binrpc.inits.push({id:ccuSettings.binrpc.hs485dId, port:ccuSettings.binrpc.hs485dPort});
}
if (ccuSettings.binrpc.cuxdEnabled) {
    ccuSettings.binrpc.inits.push({id:ccuSettings.binrpc.cuxdId, port:ccuSettings.binrpc.cuxdPort});
}

socket.on('connect', function () {
    logger.info("adapter CCU   connected to node.control");

    socket.on ("reloadData", function () {
        regaReady = false;
        socket.emit ("setStatus", "ccuRegaData", regaReady);
        clearRegaData();
        loadRegaData(0, null, true);
    });

    socket.on ("ccuRestartRPC", function () {
        initRpc();
    });

    socket.on ("ccuSetState", function (id, val) {
        // Bidcos or Rega?
        /*
         if (ctrlIndex.HSSDP.indexOf(id) != -1) {
         // Set State via xmlrpc_bin
         var name = ctrlObjects[id].Name;
         var parts = name.split(".");
         var iface = parts[0],
         port = homematic.ifacePorts[iface],
         channel = parts[1],
         dp = parts[2];
         // TODO BINRPC FLOAT....?
         homematic.request(port, "setValue", [channel, dp, val.toString()]);
         logger.info("BINRPC setValue "+channel+dp+" "+val);
         } else { */
        // Set State via ReGa
        var xval;
        if (typeof val == "string") {
            xval = "'" + val.replace(/'/g, '"') + "'";
        } else {
            xval = val;
        }
        var script = "Write(dom.GetObject("+id+").State("+xval+"));";

        regahss.script(script, function (data) {
            //logger.verbose("rega      <-- "+data);
            /*if (callback) {
                callback(data);
            }*/
        });

        //}

        // Bei Update von Thermostaten den nächsten Event von SET_TEMPERATURE und CONTROL_MODE ignorieren!
        if (regaObjects[id] && regaObjects[id].Name) {

            if (regaObjects[id].Name.match(/SET_TEMPERATURE$/) || regaObjects[id].Name.match(/MANU_MODE$/) || regaObjects[id].Name.match(/SETPOINT$/)) {
                var parent = regaObjects[regaObjects[id].Parent];
                var setTemp = parent.DPs["SET_TEMPERATURE"];
                var ctrlMode = parent.DPs["CONTROL_MODE"];
                if (ignoreNextUpdate.indexOf(setTemp) == -1) {
                    ignoreNextUpdate.push(setTemp);
                }
                if (ignoreNextUpdate.indexOf(ctrlMode) == -1) {
                    ignoreNextUpdate.push(ctrlMode);
                }
                logger.verbose("adapter CCU   ignoring next update for "+JSON.stringify(ignoreNextUpdate));
            }
        }
    });

    socket.on ("ccuProgramExecute", function (id, callback) {
       programExecute (id, function () {
           if (callback) callback();
       });
    });
    socket.on ("ccuAlarmReceipt", function (id) {
        logger.verbose("adapter CCU   alarmReceipt "+id+" "+regaObjects[id].Name);
        regahss.script("dom.GetObject("+id+").AlReceipt();");
    });

    socket.on ("ccuRunScript", function (id, callback) {
        logger.verbose("socket.io <-- script");
        regahss.script(script, function (data) {
            if (callback) { callback(data); }
        });
    });
});

socket.on('disconnect', function () {
    logger.info("adapter CCU   disconnected from node.control");
});

if (ccuSettings.binrpc.checkEvents && ccuSettings.binrpc.checkEvents.enabled) {
    setInterval(function () {
        if (initsDone && ccuRegaUp) {
            var now = Math.floor((new Date()).getTime() / 1000);
            /** @namespace ccuSettings.binrpc.checkEvents.testAfter */
            var check = now - ccuSettings.binrpc.checkEvents.testAfter;
            /** @namespace ccuSettings.binrpc.checkEvents.reinitAfter */
            var reinit = now - ccuSettings.binrpc.checkEvents.reinitAfter;
            for (var i = 0; i < ccuSettings.binrpc.inits.length; i++) {
                var init = ccuSettings.binrpc.inits[i];
                if (lastEvents[init.id] < reinit) {

                    if (ccuSettings.binrpc.checkEvents.testTrigger[init.id]) {
                        logger.warn("binrpc    --> re-init "+init.id);

                        homematic.request(init.port, "init", ["xmlrpc_bin://"+ccuSettings.binrpc.listenIp+":"+ccuSettings.binrpc.listenPort,init.id], function(data, name) {
                            if (data === "") {
                                logger.info("binrpc    <-- init on "+name+" successful");
                                lastEvents[init.id] = Math.floor((new Date()).getTime() / 1000);
                            } else {
                                logger.error("binrpc    <-- init on "+name+" failure");
                            }
                        });

                    } else {
                        logger.warn("binrpc        checkEvent.trigger undefined for "+init.id);
                    }

                } else if (lastEvents[init.id] < check) {
                    logger.verbose("binrpc        checking init "+init.id);
                    if (ccuSettings.binrpc.checkEvents.testTrigger[init.id]) {
                        var id = regaIndex.Name[ccuSettings.binrpc.checkEvents.testTrigger[init.id]][0];
                        regahss.script("dom.GetObject("+id+").State(true);");
                    } else {
                        logger.warn("binrpc        checkEvent.trigger undefined for "+init.id);
                    }
                } else {
                    logger.verbose("binrpc        init "+init.id+" ok - last event "+(now-lastEvents[init.id])+"s ago");
                }
            }
        }

        updateStatus();

    }, (ccuSettings.binrpc.checkEvents.interval * 1000));
}

var homematic,
    datapoints = {},
    regaObjects = {},
    regaIndex = {
        Name: {},
        Address: {},
        ENUM_ROOMS: [],
        ENUM_FUNCTIONS: [],
        FAVORITE: [],
        DEVICE: [],
        CHANNEL: [],
        HSSDP: [],
        VARDP: [],
        ALDP: [],
        ALARMDP: [],
        PROGRAM: []
    },
    regaReady = false;

var ignoreNextUpdate = [];

logger.info ("adapter CCU   starting adapter CCU");

function updateStatus () {
    socket.emit("updateStatus");
}

var regahss = new rega({
    ccuIp: ccuSettings.ccuIp,
    ready: function(err) {
        if (err == "ReGaHSS down") {
            logger.error("rega          ReGaHSS down");
            ccuReachable = true;
            ccuRegaUp    = false;
            socket.emit ("setStatus", {ccuReachable: ccuReachable, ccuRegaUp: ccuRegaUp});
            tryReconnect();
        } else if (err == "CCU unreachable") {
            logger.error("adapter CCU   CCU unreachable");
            ccuReachable = false;
            ccuRegaUp    = false;
            socket.emit ("setStatus", {ccuReachable: ccuReachable, ccuRegaUp: ccuRegaUp});
            tryReconnect();
        } else {
            logger.info("rega          ReGaHSS up");
            ccuReachable = true;
            ccuRegaUp    = true;

            regahss.loadStringTable(ccuSettings.stringTableLanguage, function (data) {
                socket.emit ("setStringtable", data);
                regahss.checkTime(loadRegaData);
            });

            socket.emit ("setStatus", {ccuReachable: ccuReachable, ccuRegaUp:ccuRegaUp});
        }
    }
});

var stats = {
    cuxd:  0,
    wired: 0,
    rf:    0
};

function tryReconnect() {
    if (regahss && regahss.options && regahss.options.ccuIp) {
        logger.info("adapter CCU   trying to reconnect to CCU");
        request('http://'+regahss.options.ccuIp+'/ise/checkrega.cgi', function (error, response, body) {
            if (!error && response.statusCode == 200) {
                if (body == "OK") {
                    logger.info("adapter CCU   ReGaHSS up");
                    ccuReachable = true;
                    ccuRegaUp    = true;
                    socket.emit ("setStatus", {ccuReachable: ccuReachable, ccuRegaUp: ccuRegaUp});
                    reconnect();
                } else {
                    logger.error("adapter CCU   ReGaHSS down");
                    ccuRegaUp = false;
                    socket.emit ("setStatus", "ccuRegaUp", ccuRegaUp);
                    setTimeout(tryReconnect, 10000);
                }
            } else {
                logger.error("adapter CCU   CCU unreachable");
                ccuRegaUp    = false;
                ccuReachable = false;
                socket.emit ("setStatus", {ccuReachable: ccuReachable, ccuRegaUp: ccuRegaUp});
                setTimeout(tryReconnect, 10000);

            }
        });
    }

}

function reconnect() {

    regahss.loadStringTable(ccuSettings.stringTableLanguage, function (data) {
        socket.emit ("setStringtable", data);
    });

    if (initsDone) {
        initsDone = false;
        homematic.stopInits();
    }

    regaReady = false;

    socket.emit ("setStatus", {initsDone: initsDone, ccuRegaData: regaReady});
    clearRegaData();
    setTimeout(function () {
        regahss.checkTime(function () {
            loadRegaData (0, null, null, true);
        });
    }, 2500);
}

function formatTimestamp() {
    var timestamp = new Date();
    return timestamp.getFullYear() + '-' +
        ("0" + (timestamp.getMonth() + 1).toString(10)).slice(-2) + '-' +
        ("0" + (timestamp.getDate()).toString(10)).slice(-2) + ' ' +
        ("0" + (timestamp.getHours()).toString(10)).slice(-2) + ':' +
        ("0" + (timestamp.getMinutes()).toString(10)).slice(-2) + ':' +
        ("0" + (timestamp.getSeconds()).toString(10)).slice(-2);
}

function pollRega() {
    regahss.runScriptFile("polling", function (data) {
        if (!data) {
            ccuRegaUp = false;
            socket.emit ("setStatus", "ccuRegaUp", ccuRegaUp);
            tryReconnect();
            return false;
        }
        var _data = JSON.parse(data);
        var newDatapoints = [];
        var val;

        for (var id in _data) {
            if (typeof _data[id][0] == "string") {
                val = unescape(_data[id][0]);
            } else {
                val = _data[id][0];
            }

            // Hat sich die Anzahl der Servicemeldungen geändert?
            if (id == 41 && datapoints[41][0] != val) {
                pollServiceMsgs();
            }
            newDatapoints[id] = [_data[id][0], formatTimestamp(), true, _data[id][1]];
            datapoints[id] = newDatapoints[id];
        }

        if (newDatapoints.length > 0) {
            socket.emit ("setStates", newDatapoints);
        }
        pollTimer = setTimeout(pollRega, ccuSettings.regahss.pollDataInterval);
    });
}

function pollServiceMsgs() {
    logger.info("adapter CCU   polling service messages");
    regahss.runScriptFile("alarms", function (data) {
        if (!data) {
            ccuRegaUp = false;
            socket.emit ("setStatus", "ccuRegaUp", ccuRegaUp);
            tryReconnect();
            return false;
        }
        var data = JSON.parse(data);
        var newDatapoints = [];
        for (id in data) {
            var ts = Math.round((new Date()).getTime() / 1000);
            newDatapoints[id] = [data[id].AlState, data[id].LastTriggerTime, true, data[id].AlOccurrenceTime];
            datapoints[id] = newDatapoints[id];
        }
        socket.emit ("setStates", newDatapoints);
    });
}

function loadRegaData(index, err, rebuild, triggerReload) {
    if (!index) { index = 0; }

    var type = ccuSettings.regahss.metaScripts[index];
    logger.info("rega          fetching "+type);
    regahss.runScriptFile(type, function (_data) {
        var data = JSON.parse(_data);
        logger.info("adapter CCU   indexing "+type);
        var timestamp = formatTimestamp();
        for (var id in data) {
            var idInt = parseInt(id, 10);

            // HomeMatic Script "WriteURL" dekodieren
            for (var key in data[id]) {
                // Nur Strings und auf keinen Fall Kanal- oder Datenpunkt-Arrays
                if (typeof data[id][key] == "string" && key !== "Channels" && key !== "DPs") {
                    data[id][key] = unescape(data[id][key]);
                }
                // Datenpunkt-Namen dekodieren
                if (key == "DPs") {
                    for (var subkey in data[id][key]) {
                        var val = data[id][key][subkey];
                        delete data[id][key][subkey];
                        data[id][key][unescape(subkey)] = val;
                    }
                }
            }

            // Index erzeugen
            if (type == "alarms") {
                var TypeName = "ALDP";
            } else {
                var TypeName = data[id].TypeName;
            }
            // Typen-Index (einfach ein Array der IDs)
            if (!regaIndex[TypeName]) {
                regaIndex[TypeName] = [];
            }
            regaIndex[TypeName].push(idInt);
            // Namens-Index
            regaIndex.Name[data[id].Name] = [idInt, TypeName, data[id].Parent];
            // ggf. Adressen-Index
            if (data[id].Address) {
                regaIndex.Address[data[id].Address] = [idInt, TypeName, data[id].Parent];
            }

            // ggf. Werte setzen
            if (type == "variables") {
                datapoints[id] = [data[id].Value, data[id].Timestamp, true, data[id].Timestamp];
                // Werte aus data Objekt entfernen
                delete data[id].Value;
                delete data[id].Timestamp;
            }
            if (type == "datapoints") {
                datapoints[id] = [data[id].Value, timestamp, true, data[id].Timestamp];
                // Werte aus data Objekt entfernen
                delete data[id].Value;
                delete data[id].Timestamp;
            }
            if (type == "alarms") {

                if (regaObjects[data[id].Parent]) {
                    // ggf Kanal ergänzen
                    if (!regaObjects[data[id].Parent].ALDPs) {
                        regaObjects[data[id].Parent].ALDPs = {};
                    }
                    var tmpType = data[id].Name.split(".");
                    tmpType = tmpType[1];
                    regaObjects[data[id].Parent].ALDPs[tmpType] = parseInt(id, 10);
                }

                // Wert setzen
                datapoints[id] = [data[id].AlState, data[id].LastTriggerTime, true, data[id].AlOccurrenceTime];
                // Werte aus data Objekt entfernen
                delete data[id].AlState;
                delete data[id].LastTriggerTime;
                delete data[id].AlOccurrenceTime;
            }

            if (data[id].ValueUnit && data[id].ValueUnit == "�C") {
                data[id].ValueUnit = "°C";
            }

            // Meta-Daten setzen
            regaObjects[id] = data[id];
        }

        index += 1;
        if (index < ccuSettings.regahss.metaScripts.length) {
            loadRegaData(index, null, rebuild);
        } else {
            regaReady = true;
            socket.emit ("setStatus", "ccuRegaData", regaReady);

            // Send new data to node.control
            socket.emit ("newData", regaObjects, regaIndex, datapoints);

            if (rebuild) {
                logger.info("rega          data succesfully reloaded");
                socket.emit("reloadDataReady");
            } else {
                logger.info("rega          data succesfully loaded");
                if (ccuSettings.regahss.pollData) {
                    pollRega();
                }
                initRpc();

                if (triggerReload) {
                    socket.emit("reloadDataReady");
                }
            }
        }
    });

}

if (settings.stats) {
    setInterval(function () {
        socket.emit ("setStats", stats);
    }, settings.statsIntervalMinutes * 60000);
}

function initRpc() {

    for (var i = 0; i < ccuSettings.binrpc.inits.length; i++) {
        lastEvents[ccuSettings.binrpc.inits[i].id] = Math.floor((new Date()).getTime() / 1000);
    }

    if (!homematic) {
        homematic = new binrpc({
            ccuIp:      ccuSettings.ccuIp,
            listenIp:   ccuSettings.binrpc.listenIp,
            listenPort: ccuSettings.binrpc.listenPort,
            inits:      ccuSettings.binrpc.inits,
            methods: {
                event: function (obj) {

                    if (!regaReady) { return; }

                    var timestamp = formatTimestamp();

                    var bidcos;
                    switch (obj[0]) {
                        case "io_cuxd":
                        case "CUxD":
                            lastEvents.io_cuxd = Math.floor((new Date()).getTime() / 1000);
                            stats.cuxd += 1;
                            bidcos = "CUxD." + obj[1] + "." + obj[2];
                            break;
                        case "io_rf":
                            lastEvents.io_rf = Math.floor((new Date()).getTime() / 1000);
                            stats.rf += 1;
                            bidcos = "BidCos-RF." + obj[1] + "." + obj[2];
                            break;
                        case "io_wired":
                            lastEvents.io_wired = Math.floor((new Date()).getTime() / 1000);
                            stats.wired += 1;
                            bidcos = "BidCos-Wired." + obj[1] + "." + obj[2];
                            break;
                        default:
                        //
                            break;
                    }

                    if (ccuSettings.regahss.pollDataTriggerEnabled && bidcos == ccuSettings.regahss.pollDataTrigger) {
                        clearTimeout(pollTimer);
                        pollRega();
                    }

                    // STATE korrigieren
                    if (obj[2] == "STATE") {
                        if (obj[3] === "1" || obj[3] === 1) {
                            obj[3] = true;
                        } else if (obj[3] === "0" || obj[3] === 0) {
                            obj[3] = false;
                        }
                    }

                    // Get ReGa id
                    var regaObj = regaIndex.Name[bidcos];

                    if (regaObj && regaObj[0] && ignoreNextUpdate.indexOf(regaObj[0]) != -1) {
                        logger.verbose("adapter CCU   ignoring event dp "+regaObj[0]);
                        ignoreNextUpdate.splice(ignoreNextUpdate.indexOf(regaObj[0]), 1);
                        return;
                    }

                    if (regaObj && regaObj[0]) {
                        var id = regaObj[0];
                        var val = obj[3];
                        logger.verbose("socket.io --> broadcast event "+JSON.stringify([id, val, timestamp, true]));
                        var event = [id, val, timestamp, true, timestamp];

                        if (datapoints[id]) {
                            if (datapoints[id][0] != val) {
                                // value changed
                                datapoints[id] = [val, timestamp, true, timestamp];
                            } else {
                                // no change - keep LastChange
                                datapoints[id] = [val, timestamp, true, datapoints[id][3]];
                                event = [id, val, timestamp, true, datapoints[id][3]];
                            }
                        } else {
                            datapoints[id] = [val, timestamp, true, timestamp];
                        }
                        socket.emit ("setState", [id, val, timestamp, true]);
                    }

                    return "";
                }
            }
        });
    } else {
        homematic.init();
    }
    initsDone = true;
    socket.emit ("setStatus", "initsDone", initsDone);
}

function programExecute(id, callback) {
    logger.verbose("socket.io <-- programExecute");
    regahss.script("Write(dom.GetObject("+id+").ProgramExecute());", function (data) {
        if (callback) { callback(data); }
    });
}

function clearRegaData() {
    for (var obj in regaObjects) {
        delete regaObjects[obj];
    }
    for (var item in regaIndex.Name) {
        delete regaIndex.Name[item];
    }
    for (var item in regaIndex.Address) {
        delete regaIndex.Address[item];
    }

    regaIndex.HSSDP = null; // Command for garbage collector
    regaIndex.HSSDP = [];

    regaIndex.ALDP = null; // Command for garbage collector
    regaIndex.ALDP = [];

    regaIndex.ALARMDP = null; // Command for garbage collector
    regaIndex.ALARMDP = [];

    regaIndex.VARDP = null; // Command for garbage collector
    regaIndex.VARDP = [];

    regaIndex.FAVORITE = null; // Command for garbage collector
    regaIndex.FAVORITE = [];

    regaIndex.ENUM_ROOMS = null; // Command for garbage collector
    regaIndex.ENUM_ROOMS = [];

    regaIndex.ENUM_FUNCTIONS = null; // Command for garbage collector
    regaIndex.ENUM_FUNCTIONS = [];

    regaIndex.DEVICE  = null; // Command for garbage collector
    regaIndex.DEVICE  = [];

    regaIndex.CHANNEL = null; // Command for garbage collector
    regaIndex.CHANNEL = [];

    regaIndex.PROGRAM = null; // Command for garbage collector
    regaIndex.PROGRAM = [];
}

process.on('SIGINT', function () {
    stop();
});

process.on('SIGTERM', function () {
    stop();
});

function stop() {
    if (homematic && initsDone) {
        homematic.stopInits();
    }

    setTimeout(quit, 500);
}

var quitCounter = 0;

function quit() {
    logger.verbose("adapter CCU   quit");
    if (regahss.pendingRequests > 0) {
        quitCounter += 1;
        if (quitCounter > 20) {
            logger.verbose("rega          waited too long ... killing process");
            setTimeout(function () {
                process.exit(0);
            }, 250);
        }
        logger.verbose("rega          waiting for pending ReGa request...");
        setTimeout(quit, 500);

    } else {
        logger.info("adapter CCU   terminating");
        setTimeout(function () {
            process.exit(0);
        }, 250);
    }
}