/**
 *      CCU.IO Hue Adapter
 *      11'2013 Hobbyquaker
 *
 *      Version 0.1
 *
 *      TODO Status Polling
 *      TODO CMD_WAIT
 *      TODO Group API
 */

var settings = require(__dirname+'/../../settings.js');

if (!settings.adapters.hue || !settings.adapters.hue.enabled) {
    process.exit();
}

var logger =    require(__dirname+'/../../logger.js'),
    io =        require('socket.io-client'),
    HueApi = require("node-hue-api").HueApi,
    host = "172.16.23.149",
    user = "newdeveloper",
    hue = new HueApi(settings.adapters.hue.settings.bridge, settings.adapters.hue.settings.user);

var objects = {};
var apiObj = {};

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

    if (val == "false") { val = false; }
    if (val == "true") { val = true; }
    if (parseInt(val,10) == val) { val = parseInt(val,10); }

    if (objects[id] && objects[id].hueType) {
        var tmpArr = objects[id].Name.split(".");
        var lamp = tmpArr[1];
        //console.log("received event lamp="+lamp+" dp="+objects[id].hueType+" val="+val);
        apiObj[lamp][objects[id].hueType] = val;
        //console.log("apiObj["+lamp+"]="+JSON.stringify(apiObj[lamp]));

        // TODO IF NOT WAIT
        if (tmpArr[2] !== "RAMP_TIME") {
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
    socket.emit("setObject", id, obj);
}

hue.getFullState(function(err, config) {
    if (err) {
        logger.error("adapter hue   "+JSON.stringify(err));
        logger.info("adapter hue   terminating");
        process.exit();
    }
    logger.info("adapter hue   inserting objects");

    var dp = 90001;
    var devChannels = [];
    for (var i in config.lights) {
        apiObj[i] = {};

        devChannels.push(dp);

        setObject(dp, {
            Name: config.lights[i].name,
            TypeName: "CHANNEL",
            Address: "HUE."+i,
            HssType: "HUE " + config.lights[i].type,
            DPs: {STATE:dp+1,LEVEL:dp+2,HUE:dp+3,SAT:dp+4,CT:dp+5,COLORMODE:dp+6,"ALERT":dp+7,"RAMP_TIME":dp+8,"CMD_WAIT":dp+9},
            Parent: 90000
        });

        setObject(dp+1, {
            Name: "HUE."+i+".STATE",
            hueType: "on",
            ValueType: 2,
            TypeName: "HSSDP",
            Value: config.lights[i].state.on,
            Parent: dp
        });
        setObject(dp+2, {
            Name: "HUE."+i+".LEVEL",
            hueType: "bri",
            TypeName: "HSSDP",
            Value: config.lights[i].state.bri,
            Parent: dp
        });
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
        setObject(dp+5, {
            Name: "HUE."+i+".CT",
            hueType: "ct",
            TypeName: "HSSDP",
            Value: config.lights[i].state.ct,
            Parent: dp
        });
        setObject(dp+6, {
            Name: "HUE."+i+".COLORMODE",
            hueType: "colormode",
            TypeName: "HSSDP",
            Value: config.lights[i].state.colormode,
            Parent: dp
        });
        setObject(dp+7, {
            Name: "HUE."+i+".ALERT",
            ValueType: 2,
            hueType: "alert",
            TypeName: "HSSDP",
            Value: config.lights[i].state["alert"],
            Parent: dp
        });
        setObject(dp+8, {
            Name: "HUE."+i+".RAMP_TIME",
            hueType: "transitiontime",
            TypeName: "HSSDP",
            Value: 10,
            Parent: dp
        });
        setObject(dp+9, {
            Name: "HUE."+i+".CMD_WAIT",
            ValueType: 2,
            TypeName: "HSSDP",
            Value: false,
            Parent: dp
        });
        dp += 10;
    }

    setObject(90000, {
        Name: config.name,
        TypeName: "DEVICE",
        HssType: "HUE-BRIDGE",
        Address: "HUE",
        Interface: "CCU.IO",
        Channels: devChannels
    });



//    console.log(config);
});