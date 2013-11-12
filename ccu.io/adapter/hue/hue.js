/**
 *      CCU.IO Hue Adapter
 *      11'2013 Hobbyquaker
 *
 *      Version 0.7
 *
 *      TODO CMD_WAIT
 *      TODO Group API
 */

var settings = require(__dirname+'/../../settings.js');

if (!settings.adapters.hue || !settings.adapters.hue.enabled) {
  //  process.exit();
}

var hueSettings = settings.adapters.hue.settings;

var logger =    require(__dirname+'/../../logger.js'),
    io =        require('socket.io-client'),
    HueApi =    require("node-hue-api").HueApi,
    host =      "172.16.23.149",
    user =      "newdeveloper",
    hue =       new HueApi(hueSettings.bridge, hueSettings.user);

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
    var ack = obj[3];


    if (val === "false") { val = false; }
    if (val === "true") { val = true; }
    if (parseInt(val,10) == val) { val = parseInt(val,10); }

    if (objects[id] && objects[id].hueType) {
        var tmpArr = objects[id].Name.split(".");
        var lamp = tmpArr[1];
        //console.log("received event lamp="+lamp+" dp="+objects[id].hueType+" val="+val);
        apiObj[lamp][objects[id].hueType] = val;
        datapoints[objects[id].Name] = [val];

        //console.log("apiObj["+lamp+"]="+JSON.stringify(apiObj[lamp]));

        // TODO IF NOT WAIT
        if (tmpArr[2] !== "RAMP_TIME" && !ack) {
            hue.setLightState(lamp, apiObj[lamp]);
            apiObj[lamp] = {};
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

hue.getFullState(function(err, config) {
    if (err) {
        logger.error("adapter hue   "+JSON.stringify(err));
        logger.info("adapter hue   terminating");
        process.exit();
    }

    var dp = hueSettings.firstId + 1;
    var devChannels = [];
    for (var i in config.lights) {
        apiObj[i] = {};

        devChannels.push(dp);

        config.lights[i].type = config.lights[i].type.replace(/ /g, "_").toUpperCase();

        var extended = config.lights[i].type == "EXTENDED_COLOR_LIGHT";
        var plug = config.lights[i].type == "DIMMABLE_PLUG-IN_UNIT";

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

        if (!plug) {
            chObject.DPs.HUE = dp+3;
            chObject.DPs.SAT = dp+4;
        }

        if (extended) {
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
        if (!plug) {
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
            Value: (config.lights[i].state["reachable"] ? false : true),
            Parent: dp
        });
        if (extended) {
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
        //logger.info("adapter hue   setState "+id+" "+val);
        //console.log("setState "+id+" "+val);

        if (nameIndex[id]) {
            id = nameIndex[id];
            //console.log("emitting setState "+id+" "+val);
            socket.emit("setState", [id,val,null,true]);
        }

    }

    function pollLamp(lamp) {
        if (lamp > Object.keys(apiObj).length) {
            return;
        }
        logger.verbose("adapter hue   polling lamp "+lamp);
        hue.lightStatus(lamp, function(err, result) {
            if (err) {
                logger.error("adapter hue   pollLamp "+lamp+" error "+JSON.stringify(err));
                return;
            }

            logger.verbose("adapter hue   result lamp "+lamp+" of "+Object.keys(apiObj).length+" "+JSON.stringify(result.state));
            //console.log("adapter hue   result lamp "+lamp+" of "+Object.keys(apiObj).length+" "+JSON.stringify(result.state));

            var state = result.state["on"] && result.state["reachable"];
            //console.log("lamp "+lamp+" state="+state);
            if ((datapoints["HUE."+lamp+".STATE"] && datapoints["HUE."+lamp+".STATE"][0] != state) || !datapoints["HUE."+lamp+".STATE"]) {
                setState("HUE."+lamp+".STATE",      state);
            }
            if ((datapoints["HUE."+lamp+".LEVEL"] && datapoints["HUE."+lamp+".LEVEL"][0] != result.state["bri"]) || !datapoints["HUE."+lamp+".LEVEL"]) {
                setState("HUE."+lamp+".LEVEL",      result.state.bri);
            }
            if ((datapoints["HUE."+lamp+".COLORMODE"] && datapoints["HUE."+lamp+".COLORMODE"][0] != result.state["colormode"]) || !datapoints["HUE."+lamp+".COLORMODE"]) {
                setState("HUE."+lamp+".COLORMODE",  result.state.colormode);
            }
            if ((datapoints["HUE."+lamp+".HUE"] && datapoints["HUE."+lamp+".HUE"][0] != result.state["hue"]) || !datapoints["HUE."+lamp+".HUE"]) {
                setState("HUE."+lamp+".HUE",        result.state.hue);
            }
            if ((datapoints["HUE."+lamp+".SAT"] && datapoints["HUE."+lamp+".SAT"][0] != result.state["sat"]) || !datapoints["HUE."+lamp+".SAT"]) {
                setState("HUE."+lamp+".SAT",        result.state.sat);
            }
            if ((datapoints["HUE."+lamp+".CT"] && datapoints["HUE."+lamp+".CT"][0] != result.state["ct"]) || !datapoints["HUE."+lamp+".CT"]) {
                setState("HUE."+lamp+".CT",         result.state.ct);
            }
            if ((datapoints["HUE."+lamp+".UNREACH"] && datapoints["HUE."+lamp+".UNREACH"][0] == result.state["reachable"]) || !datapoints["HUE."+lamp+".UNREACH"]) {
                setState("HUE."+lamp+".UNREACH",    !result.state.reachable);
            }

            setTimeout(function () {
                pollLamp(lamp+1);
            }, 50);
        });
    }

});