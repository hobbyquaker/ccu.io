/**
*      CCU.IO netAlarm Adapter
*      06'2014 Bluefox
*      Lets control the netAlarm device over ethernet (http://www.avislab.com/blog/enc28j60/)
*
*      Version 0.1
*     
*      The device has 10 ports:
*      T0 - digital temperature sensor
*      T1 - digital temperature sensor
*      T2 - digital temperature sensor
*      A3 - analog input
*      A4 - analog input
*      IN5 - binary input
*      IN6 - binary input
*      IN7 - binary input
*      IN8 - binary input
*      OUT9 - binary output
*      OUT10 - binary output
*
*
*
*      To read the state of the ports call:
*       http://192.168.114.20/status
*      Response:
*       T0:Temperature:21;T1::0;T2::0;A3::92;A4::96;IN5:Water on the floor:1;IN6::1;IN7::1;IN8::1;OUT9::0;OUT10::0;
*
*      To read the short state of the ports call:
*       http://192.168.114.20/stat
*      Response:
*       21:0:0:92:96:1:1:1:1:0:0:
*
*
*/
var settings = require(__dirname + '/../../settings.js');
 
if (!settings.adapters.netalarm || !settings.adapters.netalarm.enabled) {
    process.exit();
}
 
var netalarmSettings = settings.adapters.netalarm.settings;
 
var logger         = require(__dirname + '/../../logger.js'),
    io_client      = require('socket.io-client'), 
    http           = require('http');
 
var devices    = [],
    pollTimer  = null,
    ccu_socket = null;

var simulateStatus = "T0:Temperature:21;T1::0;T2::0;A3::92;A4::96;IN5:Water on the floor:1;IN6::1;IN7::1;IN8::1;OUT9::0;OUT10::0;";
var simulateStat = "21:0:0:92:96:1:1:1:1:0:0:";

// How can I control it??
/*function sendCommand (dev, port, value) {
    var data = 'cmd=' + port + ':' + value;

    var options = {
        host: devices[dev].ip,
        port: 80,
        path: '/' + devices[dev].password + '/?' + data
    };
    logger.info('adapter netalarm: send command "' + data + '" to ' + devices[dev].ip);
    // Set up the request
    http.get(options, function(res) {
        var xmldata = '';
        res.setEncoding('utf8');
        res.on('error', function (e) {
            logger.warn ("netalarm: " + e);
        });
        res.on('data', function(chunk){
            xmldata += chunk;
        });
        res.on('end', function () {
            logger.info('adapter netalarm: Response "' + xmldata + '"');

            // Set state only if positive response from netalarm
            if (devices[dev].digital) {
                setState(devices[dev].ports[port].ccu.DPs.LEVEL, value ? true : false);
            } else if (devices[dev].isRollo){
                setState(devices[dev].ports[port].ccu.DPs.LEVEL, ((255 - value) / 255).toFixed(2));
            } else {
                setState(devices[dev].ports[port].ccu.DPs.LEVEL, (value / 255).toFixed(4));
            }
        });
    }).on('error', function(e) {
        logger.warn("adapter netalarm: Got error by post request " + e.message);
    });
}*/
 
if (settings.ioListenPort) {
    ccu_socket = io_client.connect("127.0.0.1", {
        port: settings.ioListenPort
    });
} else if (settings.ioListenPortSsl) {
    ccu_socket = io_client.connect("127.0.0.1", {
        port: settings.ioListenPortSsl,
        secure: true
    });
} else {
    process.exit();
}
 
ccu_socket.on('connect', function () {
    logger.info("adapter netalarm  connected to ccu.io");
});
 
ccu_socket.on('disconnect', function () {
    logger.info("adapter netalarm  disconnected from ccu.io");
});
 
ccu_socket.on('event', function (obj) {
    if (!obj || !obj[0]) {
        return;
    }
    var id = obj[0];
    var ack = obj[3];

    if (ack) {
        return;
    }

    if (id < netalarmSettings.firstId || id > devices.length * 30 + 1) {
        return;
    }

    var dev = null;
    var port = null;
    // Find device by object ID
    for (var k = 0; k < devices.length; k++) {
        if (!devices[k])
            continue;

        if (id < devices[k].devId || id > devices[k].devId + 30) {
            continue;
        }
        for (var i = 0; i < devices[k].ports.length; i++) {
            if (id == devices[k].ports[i].ccu.DPs.LEVEL) {
                dev = k;
                port = i;
                break;
            }
        }
        if (dev !== null)
            break;
    }

    // Device not found
    if (dev === null)
        return;
 
    var val = obj[1];

    logger.info ("adapter netalarm  try to control " + dev.name + ", port " + port + " with " + val);
 
    if (val === "false" || val === false) { val = 0; }
    if (val === "true"  || val === true)  { val = 1; }

    if (parseFloat(val) == val) {
        // If number => set position
        val = parseFloat(val);
        if (val < 0) {
            logger.warn("adapter netalarm: invalid control value " + val + ". Value must be positive");
            val = 0;
        }
        if (val > 1) {
            logger.warn("adapter netalarm: invalid control value " + val + ". Value must be from 0 to 1, e.g. 0.55");
            val = 1;
        }
        if (devices[dev].ports[port].digital && val != 0 && val != 1) {
            logger.warn("adapter netalarm: invalid control value " + val + ". Value for switch must be 0/false or 1/true");
            val = val ? 1 : 0;
        }

        if (devices[dev].ports[port].digital) {
            sendCommand(dev, port, val);
        } else {
            val = Math.round(val * 255);
            if (devices[dev].ports[port].isRollo) {
                sendCommand(dev, port, (255 - val));
            } else {
                sendCommand(dev, port, val);
            }
        }
    }
});
 
function stop() {
    if (pollTimer) {
        clearInterval(pollTimer);
        pollTimer = null;
    }
 
    logger.info("adapter netalarm  terminating");
 
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
    ccu_socket.emit("setObject", id, obj);
}
 
function setState(id, val) {
    logger.info("adapter netalarm  setState " + id + " " + val);
    ccu_socket.emit("setState", [id, val, null, true]);
}
 
function getPortStates(dev, isShort, callback) {
    var options = {
        host: devices[dev].ip,
        port: 80,
        path: isShort ? '/stat' : '/status'
    };
    logger.info("adapter netalarm getPortState http://" + options.host + options.path);

    http.get(options, function(res) {
        var text = '';
        res.on('error', function (e) {
            logger.warn ("netalarm: " + e);
        });
        res.on('data', function(chunk){
            text += chunk;
        });
        res.on('end', function () {
            // Analyse answer and updates staties
            if (callback) {
                callback(dev, isShort, text);
            }
        });
    }).on('error', function(e) {
        logger.warn("adapter netalarm: Got error by request " + e.message);
        if (typeof simulateStat !== "undefined") {
            callback(dev, isShort, isShort ? simulateStat : simulateStatus);
        }
    });
}

function processPortStates(_dev, isShort, response) {
    if (response !== null) {
        if (isShort) {
            // parse answer
            var vals = response.split(':');
            for (var i = 0; i < vals.length; i++) {
                if (!devices[_dev].ports[i])
                    break;
                vals[i] = parseInt(vals[i]);
                if (devices[_dev].ports[i].ccu.digital) {
                    if ((!!vals[i]) != devices[_dev].ports[i].ccu.value) {
                        devices[_dev].ports[i].ccu.value = !!vals[i];
                        logger.info("adapter netalarm: detected new state for port " + _dev + "[" + i + "]: " + devices[_dev].ports[i].ccu.value);
                        setState(devices[_dev].ports[i].ccu.DPs.LEVEL, devices[_dev].ports[i].ccu.value);
                    }
                }else {
                    var f = (data[2] / 1024) * devices[_dev].ports[i].factor + devices[_dev].ports[i].offset;
                    if (f != devices[_dev].ports[i].ccu.value) {
                        devices[_dev].ports[i].ccu.value = vals[i] / 1024;
                        logger.info("adapter netalarm: detected new value for port " + _dev + "[" + i + "]: " + devices[_dev].ports[i].ccu.value);
                        setState(devices[_dev].ports[i].ccu.DPs.LEVEL, devices[_dev].ports[i].ccu.value);
                    }
                }
            }
        } else {
            if (!devices[_dev].isGotList) {
                clearTimeout(devices[_dev].pollTimer);

                // Start the status polling
                if (devices[_dev].pollIntervalSec) {
                    devices[_dev].pollTimer = setInterval(getPortStates, devices[_dev].pollIntervalSec * 1000, _dev, true, processPortStates);
                }
                devices[_dev].isGotList = true;
            }
            var vals = response.split(';');
            for (var i = 0; i < vals.length; i++) {
                if (!devices[_dev].ports[i])
                    break;

                var data = vals[i].split(':');
                if (data[1]) {
                    devices[_dev].ports[i].ccu.name += "_" + data[1];
                }
                data[2] = parseInt(data[2]);
                if (devices[_dev].ports[i].ccu.digital) {
                    devices[_dev].ports[i].ccu.value = !!data[2];
                    setObject(devices[_dev].ports[i].ccu.DPs.LEVEL, {
                        Name:         devices[_dev].ports[i].ccu.name + ".STATE",
                        ValueType:    16,
                        ValueSubType: 29,
                        TypeName:     "HSSDP",
                        Value:        0,
                        Parent:       devices[_dev].ports[i].ccu.chnDP
                    });
                } else {
                    devices[_dev].ports[i].ccu.value = (data[2] / 1024) * devices[_dev].ports[i].factor + devices[_dev].ports[i].offset;
                    setObject(devices[_dev].ports[i].ccu.DPs.LEVEL, {
                        Name:         devices[_dev].ports[i].ccu.name + ".LEVEL",
                        ValueType:    16,
                        ValueSubType: 29,
                        TypeName:     "HSSDP",
                        Value:        0,
                        Parent:       devices[_dev].ports[i].ccu.chnDP
                    });
                }
                setState(devices[_dev].ports[i].ccu.DPs.LEVEL, devices[_dev].ports[i].ccu.value);
            }
        }
    }
}
function netalarmInit () {
    for (var dev in netalarmSettings.devices) {
        if (!netalarmSettings.devices[dev].ip || netalarmSettings.devices[dev].ip == "0.0.0.0")
            continue;

        var devChannels = [];
        var id = parseInt(dev.substring(1)) - 1;
        var config = [
            "T_0",
            "T_1",
            "T_2",
            "A_3",
            "A_4",
            "IN_5",
            "IN_6",
            "IN_7",
            "IN_8",
            "OUT_9",
            "OUT_10"
        ]
        devices[id] = netalarmSettings.devices[dev];
        devices[id].devId = netalarmSettings.firstId + id * 12;
        devices[id].isGotList = false;

        for (var port = 0; port < config.length; port++) {
            var name = "netalarm_" + devices[id].name + "." + config[port];
            var types = config[port].split('_');

            devices[id].ports[port].ccu = {
                chnDP:    devices[id].devId + port * 2 + 1,
                name:     name,
                address:  "netalarm." + id + "." + port,
                DPs:      {
                    LEVEL:   devices[id].devId + port * 2 + 2
                },
                digital: (types[0] != 'A' &&  types[0] != 'T')
            };

            devChannels.push(devices[id].ports[port].ccu.chnDP);

            var chObject = {
                Name:     devices[id].ports[port].ccu.name,
                TypeName: "CHANNEL",
                Address:  devices[id].ports[port].ccu.address,
                HssType:  "netalarm_" + types[0],
                DPs:      devices[id].ports[port].ccu.DPs,
                Parent:   devices[id].devId
            };
            if (devices[id].ports[port].factor) {
                devices[id].ports[port].factor = parseFloat(devices[id].ports[port].factor);
            } else {
                devices[id].ports[port].factor = 1;
            }
            if (devices[id].ports[port].offset) {
                devices[id].ports[port].offset = parseFloat(devices[id].ports[port].offset);
            } else {
                devices[id].ports[port].offset = 0;
            }
            if (devices[id].ports[port].room) {
                chObject.rooms = devices[id].ports[port].room;
            }
            if (devices[id].ports[port].role) {
                chObject.funcs = devices[id].ports[port].role;
            }

            setObject(devices[id].ports[port].ccu.chnDP, chObject);
        }

        setObject(devices[id].devId, {
            Name:      "netalarm_" + devices[id].name,
            TypeName:  "DEVICE",
            HssType:   "netalarm_ROOT",
            Address:   "netalarm." + id,
            Interface: "CCU.IO",
            Channels:  devChannels
        });
        getPortStates(id, false, processPortStates);

        // Try to get the list of devices
        devices[id].pollTimer = setInterval(getPortStates, 30000, id, false, processPortStates);
    }
}
 
netalarmInit ();