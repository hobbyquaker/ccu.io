/**
*      CCU.IO MegaD-328 Adapter
*      06'2014 Bluefox
*      Lets control the MegaD-328 over ethernet (http://www.ab-log.ru/smart-house/ethernet/megad-328)
*
*      Version 0.1
*
*      The device has 14 ports, 0-7 inputs and 8-13 outputs.
*      To read the state of the port call
*      http://mega_ip/sec/?pt=4&cmd=get , where sec is password (max 3 chars), 4 is port number
*      The result will come as "ON", "OFF" or analog value for analog ports
*
*      To set the state call:
*      http://mega_ip/sec/?cmd=2:1 , where sec is password (max 3 chars), 2 is port number, and 1 is the value
*      For digital ports only 0, 1 and 2 (toggle) are allowed, for analog ports the values from 0 to 255 are allowed
*
*      The device can report the changes of ports to some web server in form
*      http://ccu.io:8090/?pt=6  , where 6 is the port number
*
*/
var settings = require(__dirname + '/../../settings.js');

if (!settings.adapters.megaD || !settings.adapters.megaD.enabled) {
    process.exit();
}

var megadSettings = settings.adapters.megaD.settings;

var logger         = require(__dirname + '/../../logger.js'),
    io_client      = require('socket.io-client'),
    http           = require('http'),
    express        = require('express');

var devices    = [],
    pollTimer  = null,
    ccu_socket = null,
    server     = null,
    app        = null;

var simulate = [
    "OFF/0<br>",
    "ON/607<br>",
    "OFF/0<br>",
    "OFF/0<br>",
    "OFF/12<br>",
    "OFF/6<br>",
    "OFF/4<br>",
    "OFF",
    "OFF",
    "OFF",
    "OFF",
    "OFF",
    "OFF",
    "0"
];

function sendCommand (dev, port, value) {
    var data = 'cmd=' + port + ':' + value;

    var options = {
        host: devices[dev].ip,
        port: 80,
        path: '/' + devices[dev].password + '/?' + data
    };
    logger.info('adapter megaD: send command "' + data + '" to ' + devices[dev].ip);
    // Set up the request
    http.get(options, function(res) {
        var xmldata = '';
        res.setEncoding('utf8');
        res.on('error', function (e) {
            logger.warn ("megaD: " + e);
        });
        res.on('data', function(chunk){
            xmldata += chunk;
        });
        res.on('end', function () {
            logger.info('adapter megaD: Response "' + xmldata + '"');

            // Set state only if positive response from megaD
            if (devices[dev].ports[port].digital) {
                setState(devices[dev].ports[port].ccu.DPs.LEVEL, value ? true : false);
            } else if (devices[dev].ports[port].isRollo){
                setState(devices[dev].ports[port].ccu.DPs.LEVEL, ((255 - value) / 255).toFixed(2));
            } else {
                setState(devices[dev].ports[port].ccu.DPs.LEVEL, (value / 255).toFixed(4));
            }
        });
    }).on('error', function(e) {
        logger.warn("adapter megaD: Got error by post request " + e.message);
    });
}

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
    logger.info("adapter megaD  connected to ccu.io");
});

ccu_socket.on('disconnect', function () {
    logger.info("adapter megaD  disconnected from ccu.io");
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

    if (id < megadSettings.firstId || id > megadSettings.firstId + devices.length * 30 + 1) {
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

    logger.info ("adapter megaD  try to control " + devices[dev].name + ", port " + port + " with " + val);

    if (val === "false" || val === false) { val = 0; }
    if (val === "true"  || val === true)  { val = 1; }

    if (parseFloat(val) == val) {
        // If number => set position
        val = parseFloat(val);
        if (val < 0) {
            logger.warn("adapter megaD: invalid control value " + val + ". Value must be positive");
            val = 0;
        }
        if (val > 1) {
            logger.warn("adapter megaD: invalid control value " + val + ". Value must be from 0 to 1, e.g. 0.55");
            val = 1;
        }
        if (devices[dev].ports[port].digital && val != 0 && val != 1) {
            logger.warn("adapter megaD: invalid control value " + val + ". Value for switch must be 0/false or 1/true");
            val = val ? 1 : 0;
        }

        if (devices[dev].ports[port].digital) {
            sendCommand(dev, port, val);
        } else {
            val = (val - devices[dev].ports[port].offset) / devices[dev].ports[port].factor * 256;
            val = Math.round(val);
            if (devices[dev].ports[port].isRollo) {
                sendCommand(dev, port, (256 - val));
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

    logger.info("adapter megaD  terminating");

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
    logger.info("adapter megaD setState " + id + " " + val);
    ccu_socket.emit("setState", [id, val, null, true]);
}

function getPortState(dev, port, callback) {
    var options = {
        host: devices[dev].ip,
        port: 80,
        path: '/' + devices[dev].password + '/?pt=' + port + '&cmd=get'
    };
    logger.info("adapter megaD getPortState http://" + options.host + options.path);

    http.get(options, function(res) {
        var xmldata = '';
        res.on('error', function (e) {
            logger.warn("megaD: " + e);
        });
        res.on('data', function(chunk){
            xmldata += chunk;
        });
        res.on('end', function () {
            logger.info("adapter megaD response for " + devices[dev].ip + "[" + port + "]: " + xmldata);
            // Analyse answer and updates staties
            if (callback) {
                callback(dev, port, xmldata);
            }
        });
    }).on('error', function(e) {
        logger.warn("adapter megaD: Got error by request " + e.message);
        if (typeof simulate !== "undefined") {
            callback(dev, port, simulate[port]);
        }
    });
}

function processPortState(_dev, _port, value) {
    if (value !== null) {
        var rawValue = value;
        // Value can be OFF/5 or 27/0 or 27 or ON
        if (typeof value == "string") {
            var t = value.split("/");
            value = t[0];
            rawValue = value;
            t = null;
            if (value == 'OFF') {
                value = 0;
            } else
            if (value == 'ON') {
                value = 1;
            }
            value = parseInt(value);
        }

        if (devices[_dev].ports[_port].ccu.value !== undefined) {
            // If status changed
            if (value !== devices[_dev].ports[_port].ccu.value) {
                devices[_dev].ports[_port].ccu.value = value;

                if (devices[_dev].ports[_port].digital) {
                    logger.info("adapter megaD detected new state for " + devices[_dev].ip + "[" + _port + "]: " + value);
                    setState(devices[_dev].ports[_port].ccu.DPs.LEVEL, !!value);
                } else if (devices[_dev].isRollo) {
                    logger.info("adapter megaD detected new rollo state for " + devices[_dev].ip + "[" + _port + "]: " + value + ", calc state " + ((256 - value) / 256));
                    setState(devices[_dev].ports[_port].ccu.DPs.LEVEL, ((256 - devices[_dev].value) / 256).toFixed(2));
                } else {
                    logger.info("adapter megaD detected new value for " + devices[_dev].ip + "[" + _port + "]: " + value + ", calc state " + (value / 256));
                    var f = (value / 256) * devices[_dev].ports[_port].factor + devices[_dev].ports[_port].offset;
                    setState(devices[_dev].ports[_port].ccu.DPs.LEVEL, f.toFixed(4));
                }
            }
        } else {
            if (!devices[_dev].isGotList) {
                clearTimeout(devices[_dev].pollTimer);

                // Start the status polling
                if (devices[_dev].pollIntervalSec) {
                    devices[_dev].pollTimer = setInterval(pollStatus, devices[_dev].pollIntervalSec * 1000, _dev);
                }
                devices[_dev].isGotList = true;
            }

            devices[_dev].ports[_port].digital = (rawValue == "ON" || rawValue == "OFF");
            devices[_dev].ports[_port].ccu.value = null;

            // Create datapoints for this port
            if (devices[_dev].ports[_port].digital) {
                setObject(devices[_dev].ports[_port].ccu.DPs.LEVEL, {
                    Name:         devices[_dev].ports[_port].ccu.name + ".STATE",
                    ValueType:    16,
                    ValueSubType: 29,
                    TypeName:     "HSSDP",
                    Value:        0,
                    Parent:       devices[_dev].ports[_port].ccu.chnDP
                });
            } else {
                setObject(devices[_dev].ports[_port].ccu.DPs.LEVEL, {
                    Name:         devices[_dev].ports[_port].ccu.name + ".LEVEL",
                    ValueType:    16,
                    ValueSubType: 29,
                    TypeName:     "HSSDP",
                    Value:        0,
                    Parent:       devices[_dev].ports[_port].ccu.chnDP
                });
            }
            processPortState(_dev, _port, value);
        }
    }
}

function pollStatus(dev) {
    for (var port = 0; port < devices[dev].ports.length; port++) {
        getPortState(dev, port, processPortState);
    }
}

// Process http://ccu.io:8090/megaName/?pt=6
function restApi(req, res) {
    var parts = req.url.split("=");
    var path = req.params[0];
    var _devs = path.split('/');
    var _dev = null;
    for (var i = 0; i < devices.length; i++) {
        if ((_devs[0] && devices[i].name == _devs[0]) || devices[i].ip == req.connection.remoteAddress) {
            _dev = i;
            break;
        }
    }
    if (_dev === null) {
        res.set('Content-Type', 'text/plain');
        res.send('Error: unknown device name "' + _devs[0] + '"');
        return;
    }
    if (parts.length == 2) {
        var _port = parts[1];
        if (devices[_dev] && devices[_dev].ports[_port]) {
            // If digital port
            if (devices[_dev].ports[_port].digital && !devices[_dev].ports[_port].switch) {
                devices[_dev].ports[_port].ccu.value = true;
                logger.info("adapter megaD: " + devices[_dev].name + " reported new state for port " + _port + " - " + devices[_dev].ports[_port].ccu.value);
                setState(devices[_dev].ports[_port].ccu.DPs.LEVEL, true);

                // Set automatically the state of the port to false after 100ms
                setTimeout(function() {
                    devices[_dev].value = false;
                    setState(devices[_dev].ports[_port].ccu.DPs.LEVEL, false);
                }, 100);
            } else {
                logger.info("adapter megaD: " + devices[_dev].name + " reported new value for port " + _port + ", request actual value");
                // Get value from analog port
                getPortState(_dev, _port, processPortState);
            }
            res.set('Content-Type', 'text/plain');
            res.send('OK');
            return;
        }
    }
    res.set('Content-Type', 'text/plain');
    res.send('Error: invalid input "' + req.url + '". Expected /'+devices[_dev].name+'/?pt=X');
}

function megadInit () {
    for (var dev in megadSettings.devices) {
        if (!megadSettings.devices[dev].ip || megadSettings.devices[dev].ip == "0.0.0.0")
            continue;

        var devChannels = [];
        var id = parseInt(dev.substring(1)) - 1;

        devices[id] = megadSettings.devices[dev];
        devices[id].devId = megadSettings.firstId + id * 30;
        devices[id].isGotList = false;

        for (var port = 0; port < devices[id].portsCount; port++) {
            var name = "MegaD_" + devices[id].name + "." + ((devices[id].ports[port].name == ("port" + port)) ? (((port < 7) ? "IN" : "OUT") + "_Port" + port) : devices[id].ports[port].name);

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

            devices[id].ports[port].ccu = {
                chnDP:    devices[id].devId + port * 2 + 1,
                name:     name,
                address:  "MegaD." + id + "." + port,
                DPs:      {
                    LEVEL:   devices[id].devId + port * 2 + 2
                }
            };

            devChannels.push(devices[id].ports[port].ccu.chnDP);

            var chObject = {
                Name:     devices[id].ports[port].ccu.name,
                TypeName: "CHANNEL",
                Address:  devices[id].ports[port].ccu.address,
                HssType:  "MegaD_" + devices[id].ports[port].input ? "IN" : "OUT",
                DPs:      devices[id].ports[port].ccu.DPs,
                Parent:   devices[id].devId
            };

            if (devices[id].ports[port].room) {
                chObject.rooms = devices[id].ports[port].room;
            }
            if (devices[id].ports[port].role) {
                chObject.funcs = devices[id].ports[port].role;
            }

            if (!devices[id].ports[port].input) {
                setObject(devices[id].ports[port].ccu.DPs.LEVEL, {
                    Name: chObject.Name + (devices[id].ports[port].digital ? ".STATE" : ".LEVEL"),
                    ValueType: 16,
                    ValueSubType: 29,
                    TypeName: "HSSDP",
                    Value: 0,
                    Parent: devices[id].ports[port].ccu.chnDP
                });
            }

            setObject(devices[id].ports[port].ccu.chnDP, chObject);
        }

        setObject(devices[id].devId, {
            Name:      "MegaD_" + devices[id].name,
            TypeName:  "DEVICE",
            HssType:   "MegaD_ROOT",
            Address:   "MegaD." + id,
            Interface: "CCU.IO",
            Channels:  devChannels
        });
        pollStatus(id);

        // Try to get the list of devices
        devices[id].pollTimer = setInterval(pollStatus, 30000, id);
    }

    try {
        if (settings.ioListenPort) {
            app = express();
            server = require('http').createServer(app);
        }
        if (app) {
            app.get('/*', restApi);
        }
        if (server) {
            server.listen(megadSettings.ioListenPort);
            logger.info("adapter megaD listening on port " + megadSettings.ioListenPort);
        }
    } catch (e) {
        logger.error("adapter megaD cannot start listening server on port " + megadSettings.ioListenPort + ": " + e);
    }
}

megadInit ();
