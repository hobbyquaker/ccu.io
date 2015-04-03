/**
 *      CCU.IO Hue Adapter
 *      11'2013 Hobbyquaker
 *
 *      Version 0.9
 *
 *      TODO CMD_WAIT
 *      TODO Group API
 */

var settings = require(__dirname+'/../../settings.js');

if (!settings.adapters.hue || !settings.adapters.hue.enabled) {
   process.exit();
}

var hueSettings = settings.adapters.hue.settings;

var logger =    require(__dirname+'/../../logger.js'),
    io =        require('socket.io-client'),
    request =   require("request"),
    hueUrl =    "http://"+hueSettings.bridge+"/api/"+hueSettings.user+"/";

function hueLights(lamp, callback) {
    request(hueUrl+"lights/"+lamp, function (err, res) {
         if (err) {
            logger.error("adapter hue   hueLights error "+JSON.stringify(err));
         } else if (res.statusCode != 200) {
             logger.error("adapter hue   hueLights http "+res.statusCode);
         } else {
             callback(JSON.parse(res.body));
         }
    });
}

function hueGetFullState(callback) {
    request(hueUrl, function (err, res) {
        if (err) {
            logger.error("adapter hue   hueGetFullState error "+JSON.stringify(err));
        } else if (res.statusCode != 200) {
            logger.error("adapter hue   hueGetFullState http "+res.statusCode);
        } else {
            callback(JSON.parse(res.body));
        }
    });
}

function hueSetLightsState(lamp, obj, callback) {
    request({
        method: "PUT",
        uri: hueUrl+"lights/"+lamp+"/state",
        body: JSON.stringify(obj)
    }, function (err, res) {
        if (err) {
            logger.error("adapter hue   hueSetLightsState error "+JSON.stringify(err));
        } else if (res.statusCode != 200) {
            logger.error("adapter hue   hueSetLightsState http "+res.statusCode);
        } else {
            if (callback) {
                callback(JSON.parse(res.body));
            }
        }
    });
}

function hueSetGroupState(group, obj, callback) {
    request({
        method: "PUT",
        uri: hueUrl+"groups/"+group+"/action",
        body: JSON.stringify(obj)
    }, function (err, res) {
        if (err) {
            logger.error("adapter hue   hueSetGroupState error "+JSON.stringify(err));
        } else if (res.statusCode != 200) {
            logger.error("adapter hue   hueSetGroupState http "+res.statusCode);
        } else {
            if (callback) {
                callback(JSON.parse(res.body));
            }
        }
    });
}

var objects = {},
    nameIndex = {},
    datapoints = {},
    apiObj = {};

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
    logger.info("adapter hue   connected to ccu.io");
});

socket.on('disconnect', function () {
    logger.info("adapter hue   disconnected from ccu.io");
});

socket.on('event', function (obj) {
    if (!obj || !obj[0]) {
        return;
    }
    var id = obj[0];
    var val = obj[1];
    var ts = obj[2];
    var ack = obj[3];


    if (val === "false") { val = false; }
    if (val === "true") { val = true; }
    if (parseInt(val,10) == val) { val = parseInt(val,10); }

    if (objects[id] && objects[id].hueType) {
        var tmpArr = objects[id].Name.split(".");

        if (objects[id].hueType == "on") {
            if (val === 0) {
                val = false;
            } else if (val === 1) {
                val = true;
            }
        }

        if (objects[id].Name.indexOf(".GROUPS.")>1){
            var group = tmpArr[2];
            var data = {}
            datapoints[objects[id].Name] = [val, ts, ack];

            data[objects[id].hueType] = val;
            hueSetGroupState(group, data);
        }else {
            var lamp = tmpArr[1];
            apiObj[lamp][objects[id].hueType] = val;
            datapoints[objects[id].Name] = [val, ts, ack];

            if (objects[id].hueType == "colormode") {
                if (val == "ct") {
                    apiObj[lamp].ct = datapoints["HUE." + lamp + ".CT"][0];
                } else if (val == "hs") {
                    apiObj[lamp].hue = datapoints["HUE." + lamp + ".HUE"][0];
                    apiObj[lamp].sat = datapoints["HUE." + lamp + ".SAT"][0];

                }
            }

            // TODO IF NOT WAIT
            if (tmpArr[2] !== "RAMP_TIME" && !ack) {
                hueSetLightsState(lamp, apiObj[lamp]);
                apiObj[lamp] = {};
            }
        }
    }
});

function stop() {
    logger.info("adapter hue   terminating");
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
    if (obj.Value !== undefined) {
        datapoints[obj.Name] = [obj.Value];
        nameIndex[obj.Name] = id;
    }
    socket.emit("setObject", id, obj);
}

hueGetFullState(function (config) {

    var dp = hueSettings.firstId + 1;
    var devChannels = [];
    for (var i in config.lights) {
        apiObj[i] = {};

        devChannels.push(dp);

        config.lights[i].type = config.lights[i].type.replace(/ /g, "_").toUpperCase();

        var hasColortemperature = config.lights[i].type == "EXTENDED_COLOR_LIGHT" || config.lights[i].type == "COLOR_TEMPERATURE_LIGHT";
        var hasColor = !(config.lights[i].type == "DIMMABLE_PLUG-IN_UNIT" || config.lights[i].type == "DIMMABLE_LIGHT" || config.lights[i].type == "COLOR_TEMPERATURE_LIGHT");

        var chObject = {
            Name: config.lights[i].name,
            TypeName: "CHANNEL",
            Address: "HUE."+i,
            HssType: "HUE_" + config.lights[i].type,
            DPs: {
                STATE:          dp+1,
                LEVEL:          dp+2,
                ALERT:          dp+5,
                RAMP_TIME:      dp+6,
                CMD_WAIT:       dp+7,
                UNREACH:        dp+8

            },
            Parent: hueSettings.firstId
        };

        if (hasColor) {
            chObject.DPs.HUE = dp+3;
            chObject.DPs.SAT = dp+4;
        }

        if (hasColortemperature) {
            chObject.DPs.CT = dp + 9;
            chObject.DPs.COLORMODE = dp + 10;
        }

        if (hueSettings.lamps[i]) {
            if (hueSettings.lamps[i].rooms) {
                chObject.rooms = hueSettings.lamps[i].rooms;
            }
            if (hueSettings.lamps[i].funcs) {
                chObject.funcs = hueSettings.lamps[i].funcs;
            }
            if (hueSettings.lamps[i].favs) {
                chObject.favs = hueSettings.lamps[i].favs;
            }
        }

        setObject(dp, chObject);

        setObject(dp+1, {
            Name: "HUE."+i+".STATE",
            hueType: "on",
            ValueType: 2,
            TypeName: "HSSDP",
            Value: config.lights[i].state.on && config.lights[i].state["reachable"],
            Parent: dp
        });
        setObject(dp+2, {
            Name: "HUE."+i+".LEVEL",
            hueType: "bri",
            TypeName: "HSSDP",
            Value: config.lights[i].state.bri,
            Parent: dp
        });
        if (!hasColor) {
            setObject(dp+3, {
                Name: "HUE."+i+".HUE",
                hueType: "hue",
                TypeName: "HSSDP",
                Value: config.lights[i].state.hue,
                Parent: dp
            });
            setObject(dp+4, {
                Name: "HUE."+i+".SAT",
                hueType: "sat",
                TypeName: "HSSDP",
                Value: config.lights[i].state.sat,
                Parent: dp
            });
        }
        setObject(dp+5, {
            Name: "HUE."+i+".ALERT",
            ValueType: 2,
            hueType: "alert",
            TypeName: "HSSDP",
            Value: config.lights[i].state["alert"],
            Parent: dp
        });
        setObject(dp+6, {
            Name: "HUE."+i+".RAMP_TIME",
            hueType: "transitiontime",
            TypeName: "HSSDP",
            Value: null,
            Parent: dp
        });
        setObject(dp+7, {
            Name: "HUE."+i+".CMD_WAIT",
            ValueType: 2,
            TypeName: "HSSDP",
            Value: false,
            Parent: dp
        });
        setObject(dp+8, {
            Name: "HUE."+i+".UNREACH",
            ValueType: 2,
            TypeName: "HSSDP",
            Value: !config.lights[i].state["reachable"],
            Parent: dp
        });
        if (hasColortemperature) {
            setObject(dp+9, {
                Name: "HUE."+i+".CT",
                hueType: "ct",
                TypeName: "HSSDP",
                Value: config.lights[i].state.ct,
                Parent: dp
            });
            setObject(dp+10, {
                Name: "HUE."+i+".COLORMODE",
                hueType: "colormode",
                TypeName: "HSSDP",
                Value: config.lights[i].state.colormode,
                Parent: dp
            });
            dp += 11;
        } else {
            dp += 9;
        }
    }

    for (var i in config.groups) {
        var chObject = {
            Name: config.groups[i].name,
            TypeName: "CHANNEL",
            Address: "HUE.GROUPS."+i,
            HssType: "HUE_" + config.groups[i].type,
            DPs: {
                STATE:          dp+1,
                LEVEL:          dp+2,
                CT:             dp+3,
                HUE:            dp+4,
                SAT:            dp+5

            },
            Parent: hueSettings.firstId
        };

        setObject(dp, chObject);

        setObject(dp+1, {
            Name: "HUE.GROUPS."+i+".STATE",
            hueType: "on",
            ValueType: 2,
            TypeName: "HSSDP",
            Value: config.groups[i].action.on,
            Parent: dp
        });
        setObject(dp+2, {
            Name: "HUE.GROUPS."+i+".LEVEL",
            hueType: "bri",
            TypeName: "HSSDP",
            Value: config.groups[i].action.bri,
            Parent: dp
        });
        setObject(dp+3, {
            Name: "HUE.GROUPS."+i+".CT",
            hueType: "ct",
            TypeName: "HSSDP",
            Value: config.groups[i].action.ct,
            Parent: dp
        });
        setObject(dp+4, {
            Name: "HUE.GROUPS."+i+".HUE",
            hueType: "hue",
            TypeName: "HSSDP",
            Value: config.groups[i].action.hue,
            Parent: dp
        });
        setObject(dp+5, {
            Name: "HUE.GROUPS."+i+".SAT",
            hueType: "sat",
            TypeName: "HSSDP",
            Value: config.groups[i].action.sat,
            Parent: dp
        });
        dp += 6;
    }

    setObject(hueSettings.firstId, {
        Name: config.name,
        TypeName: "DEVICE",
        HssType: "HUE-BRIDGE",
        Address: "HUE",
        Interface: "CCU.IO",
        Channels: devChannels
    });

    logger.info("adapter hue   inserted objects");

    if (hueSettings.pollingEnabled) {
        logger.info("adapter hue   polling enabled - interval "+hueSettings.pollingInterval+"ms");
        setInterval(pollAll, hueSettings.pollingInterval);
    }

    function pollAll() {
        pollLamp(1);
    }

    function setState(id, val) {
        datapoints[id] = [val];

        if (nameIndex[id]) {
            id = nameIndex[id];
            socket.emit("setState", [id,val,null,true]);
        }

    }

    function pollLamp(lamp) {
        if (lamp > Object.keys(apiObj).length) {
            return;
        }
        logger.verbose("adapter hue   polling lamp "+lamp);
        hueLights(lamp, function (result) {
            logger.verbose("adapter hue   result lamp "+lamp+" of "+Object.keys(apiObj).length+" "+JSON.stringify(result.state));
            //console.log("adapter hue   result lamp "+lamp+" of "+Object.keys(apiObj).length+" "+JSON.stringify(result.state));

            var state = result.state["on"] && result.state["reachable"];
            //console.log("lamp "+lamp+" state="+state);
            if (datapoints["HUE."+lamp+".STATE"] && (datapoints["HUE."+lamp+".STATE"][0] != state )) {
                setState("HUE."+lamp+".STATE",      state);
            }
            if (datapoints["HUE."+lamp+".LEVEL"] && (datapoints["HUE."+lamp+".LEVEL"][0] != result.state["bri"])) {
                setState("HUE."+lamp+".LEVEL",      result.state.bri);
            }
            if (datapoints["HUE."+lamp+".COLORMODE"] && (datapoints["HUE."+lamp+".COLORMODE"][0] != result.state["colormode"])) {
                setState("HUE."+lamp+".COLORMODE",  (result.state.colormode == "xy" ? "hs" : result.state.colormode));
            }
            if (datapoints["HUE."+lamp+".HUE"] && (datapoints["HUE."+lamp+".HUE"][0] != result.state["hue"])) {
                setState("HUE."+lamp+".HUE",        result.state.hue);
            }
            if (datapoints["HUE."+lamp+".SAT"] && (datapoints["HUE."+lamp+".SAT"][0] != result.state["sat"])) {
                setState("HUE."+lamp+".SAT",        result.state.sat);
            }
            if (datapoints["HUE."+lamp+".CT"] && (datapoints["HUE."+lamp+".CT"][0] != result.state["ct"])) {
                setState("HUE."+lamp+".CT",         result.state.ct);
            }
            //logger.info(lamp + ' reachable ' + result.state.reachable);
            if (datapoints["HUE."+lamp+".UNREACH"] && (datapoints["HUE."+lamp+".UNREACH"][0] == result.state["reachable"])) {
                setState("HUE."+lamp+".UNREACH",    !result.state.reachable);
                //logger.info('set ' + lamp + ' unreach=' + !result.state.reachable);
            }


            setTimeout(function () {
                pollLamp(lamp+1);
            }, 50);
        });

    }

});