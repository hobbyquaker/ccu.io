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
    isGotList  = false,
    pollTimer  = null,
    ccu_socket = null,
    server     = null,
    app        = null;

var simulate = [
    "ON",
    "OFF",
    "125",
    "256",
    "ON",
    "OFF",
    "178",
    "ON"
];


function sendCommand (dev, value) {
    var data = 'cmd=' + devices[dev].port + ':' + value;

    var options = {
        host: megadSettings.ip,
        port: 80,
        path: '/' + megadSettings.password + '/?' + data
    };
    logger.info('adapter megaD: send command "' + data + '" to ' + megadSettings.ip);
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
            if (devices[dev].isState) {
                setState(devices[dev].DPs.LEVEL, value ? true : false);
            } else if (devices[dev].isRollo){
                setState(devices[dev].DPs.LEVEL, ((255 - value) / 255).toFixed(2));
            } else {
                setState(devices[dev].DPs.LEVEL, (value / 255).toFixed(4));
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

    if (id < megadSettings.firstId || id > megadSettings.firstId + 1 + megadSettings.portsCount * 3) {
        return;
    }

    var dev = null;

    // Find device by object ID
    for (var k = 0; k < devices.length; k++) {
        if (!devices[k])
            continue;

        if (id == devices[k].DPs.LEVEL) {
            dev = k;
            break;
        }
    }

    // Device not found
    if (dev === null)
        return;
 
    var val = obj[1];


    logger.info ("adapter megaD  try to control port " + dev + " with " + val);
 
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
        if (devices[dev].isState && val != 0 && val != 1) {
            logger.warn("adapter megaD: invalid control value " + val + ". Value for switch must be 0/false or 1/true");
            val = val ? 1 : 0;
        }

        if (devices[dev].isState) {
            sendCommand(dev, val);
        } else {
            val = Math.round(val * 255);
            if (devices[dev].isRollo) {
                sendCommand(dev, (255 - val));
            } else {
                sendCommand(dev, val);
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
    logger.info("adapter megaD  setState " + id + " " + val);
    ccu_socket.emit("setState", [id, val, null, true]);
}
 
function getPortState(port, callback) {
    var options = {
        host: megadSettings.ip,
        port: 80,
        path: '/' + megadSettings.password + '/?pt=' + port + '&cmd=get'
    };
    console.info("adapter megaD getPortState http://" + options.host + options.path);

    http.get(options, function(res) {
        var xmldata = '';
        res.on('error', function (e) {
            logger.warn ("megaD: " + e);
        });
        res.on('data', function(chunk){
            xmldata += chunk;
        });
        res.on('end', function () {
            // Analyse answer and updates staties
            if (callback) {
                if (xmldata == "ON")
                    callback(port, true, xmldata);
                else
                if (xmldata == "OFF")
                    callback(port, false, xmldata);
                else
                    callback(port, parseInt(xmldata), xmldata);
            }
        });
    }).on('error', function(e) {
        logger.warn("adapter megaD: Got error by request " + e.message);
        if (typeof simulate !== "undefined") {
            if (simulate[port] == "ON")
                callback(port, true, simulate[port]);
            else
            if (simulate[port] == "OFF")
                callback(port, false, simulate[port]);
            else
                callback(port, parseInt(simulate[port]), simulate[port]);
        }
    });
}

function processPortState(_dev, value, rawValue) {
    if (value !== null) {
        if (devices[_dev].value !== undefined) {
            // If status changed
            if (value !== devices[_dev].value) {
                devices[_dev].value = value;

                if (devices[_dev].isState) {
                    logger.info("adapter megaD: detected new state for port " + _dev + ": " + devices[_dev].value);
                    setState(devices[_dev].DPs.LEVEL, value);
                } else if (devices[_dev].isRollo) {
                    logger.info("adapter megaD: detected new rollo state for port " + _dev + ": " + devices[_dev].value + ", calc state " + ((255 - devices[_dev].value) / 255));
                    setState(devices[_dev].DPs.LEVEL, ((255 - devices[_dev].value) / 255).toFixed(2));
                } else {
                    logger.info("adapter megaD: detected new value for port " + _dev + ": " + devices[_dev].value + ", calc state " + (devices[_dev].value / 255));
                    setState(devices[_dev].DPs.LEVEL, (devices[_dev].value / 255).toFixed(4));
                }
            }
        } else {
            if (!isGotList) {
                // Start the status polling
                if (megadSettings.pollIntervalSec) {
                    pollTimer = setInterval(pollStatus, megadSettings.pollIntervalSec * 1000);
                }
                isGotList = true;
            }

            devices[_dev].isState = (rawValue == "ON" || rawValue == "OFF");
            devices[_dev].value = null;

            // Create datapoints for this port
            if (devices[_dev].isState) {
                setObject(devices[_dev].DPs.LEVEL, {
                    Name: devices[_dev].Address + ".STATE",
                    ValueType: 16,
                    ValueSubType: 29,
                    TypeName: "HSSDP",
                    Value: 0,
                    Parent: devices[_dev].chnDP
                });
            } else {
                setObject(devices[_dev].DPs.LEVEL, {
                    Name: devices[_dev].Address + ".LEVEL",
                    ValueType: 16,
                    ValueSubType: 29,
                    TypeName: "HSSDP",
                    Value: 0,
                    Parent: devices[_dev].chnDP
                });
                /*if (devices[num].productName.indexOf("Rollo") != -1) {
                 devices[num].isRollo = true;
                 } else {
                 devices[num].isRollo = false;
                 }*/
            }
            processPortState(_dev, value);
        }
    }
}

function pollStatus() {
    for (var __dev = 0; __dev < devices.length; __dev++) {
        // Do not poll outputs
        if (!devices[__dev].isInput) continue;
        getPortState(__dev, processPortState);
    }
}

// Process http://ccu.io:8090/?pt=6
function restApi(req, res) {
    var parts = req.url.split("=");
    if (parts.length == 2) {
        var _dev = parts[1];
        if (devices[_dev]) {
            // If digital port
            if (devices[_dev].isState) {
                devices[_dev].value = true;
                logger.info("adapter megaD: reported new state for port " + _dev + " - " + devices[_dev].value);
                setState(devices[_dev].DPs.LEVEL, true);

                // Set automatically the state of the port to false after 100ms
                setTimeout(function() {
                    devices[_dev].value = false;
                    setState(devices[_dev].DPs.LEVEL, false);
                }, 100);
            } else {
                logger.info("adapter megaD: reported new value for port " + _dev + ", request actual value");
                // Get value from analog port
                getPortState(_dev, processPortState);
            }
            /*if (devices[_dev].isRollo) {
                devices[_dev].value = 0; // TODO
                logger.info("adapter megaD: reported new rollo state - position " + devices[_dev].value + ", calc state " + ((255 - devices[_dev].value) / 255));
                setState(devices[_dev].DPs.LEVEL, (255 - devices[_dev].value) / 255);
            } else {

                /*devices[_dev].value = 0; // TODO
                logger.info("adapter megaD: reported new value " + devices[num].value + ", calc state " + (devices[_dev].value / 255));
                setState(devices[_dev].DPs.LEVEL, devices[_dev].value / 255);
            }*/
        }
    }
}

function megadInit () {

    var dp;
    var chnDp;
    var devChannels = [];

    for (var port = 0; port < megadSettings.portsCount; port++) {
        chnDp = megadSettings.firstId + 1 + port * 2;
        dp    = chnDp + 1;

        devChannels.push(chnDp);
        devices[port] = {
            chnDP:    chnDp,
            name:     "MegaD." + ((port < 7) ? "IN" : "OUT") + "_Port" + port,
            port:     port,
            isInput:  (port < 7),
            isState:  true,
            Address:  "MegaD." + port,
            DPs:      {
                LEVEL:   dp+0
            }
        };

        var chObject = {
            Name:     devices[port].name,
            TypeName: "CHANNEL",
            Address:  devices[port].address,
            HssType:  "MegaD_" + devices[port].isInput ? "IN" : "OUT",
            DPs:      devices[port].DPs,
            Parent:   megadSettings.firstId
        };

        if (!devices[port].isInput) {
            setObject(devices[port].DPs.LEVEL, {
                Name: devices[port].Address + ".LEVEL",
                ValueType: 16,
                ValueSubType: 29,
                TypeName: "HSSDP",
                Value: 0,
                Parent: devices[port].chnDP
            });
        }

        setObject(chnDp, chObject);
    }

    setObject(megadSettings.firstId, {
        Name:      "MegaD",
        TypeName:  "DEVICE",
        HssType:   "MegaD_ROOT",
        Address:   "MegaD",
        Interface: "CCU.IO",
        Channels:  devChannels
    });

    pollStatus();

    // Try to get the list of devices
    pollTimer = setInterval(pollStatus, 30000);

    if (settings.ioListenPort) {
        app = express();
        server = require('http').createServer(app);
    }
    if (app) {
        app.get('/*', restApi);
    }
    if (server) {
        server.listen(megadSettings.ioListenPort);
        logger.info("megaD     listening on port " + megadSettings.ioListenPort);
    }
}
 
megadInit ();