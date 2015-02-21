    /**
     *      CCU.IO Arduino Project Adapter
     *      07'2014 Bluefox
     *      Lets control the MegaD-328 over ethernet (http://www.ab-log.ru/smart-house/ethernet/megad-328)
     *
     *      Version 0.2
     *
     *      The device has N ports.
     *      To read the state of all ports call
     *      http://arduino_ip/data
     *      The result:
     *          DI0=x&DI1=x&DI2=x&DO3=x&DO4=x&DO5=x&AIPout=XXX.X&AIHout=XX,X&AITout=XX.X&AILux=XXXXX&AIT1=xx,x&AIT2=xx,x&AIT3=xx,x&AIErr=xx
     *
     *      To set the state call:
     *      http://arduino_ip/command?port=value , Value can be ON OFF, Port is number, like http://arduino_ip/command?4=ON
     *
     *      The device can report the changes of ports to some web server in form
     *      http://ccu.io:8085/?port=Name&value=V  , where "Name" is the digital port name (DO5, DO6, ...) and V is 0 or 1
     *
     */
var adapter    = require(__dirname + '/../../utils/adapter-init.js').Adapter("arduino");
var http       = require('http');
var express    = require('express');

var devices    = [],
    pollTimer  = null,
    server     = null,
    app        = null;

var simulate = "AIPout=156.5&AIHout=56.8&AITout=25.4&AILux=12345&AIT1=12.5&AIT2=45.8&AIT3=89.7&DI0=0&DI1=1&DI2=0&DI3=1&DO4=0&DO5=1&DO6=0&DO7=1&AIErr=0";

function sendCommand (dev, port, value) {
    var data  = port + '=' + value + '&' + port + '=STATUS';

    var options = {
        host: devices[dev].ip,
        port: 80,
        path: '/command?' + data
    };
    adapter.info('send command "' + options.path + '" to ' + devices[dev].ip);
    // Set up the request
    http.get(options, function(res) {
        var xmldata = '';
        res.setEncoding('utf8');
        res.on('error', function (e) {
            adapter.warn (e);
        });
        res.on('data', function(chunk){
            xmldata += chunk;
        });
        res.on('end', function () {
            adapter.info('Response "' + xmldata + '"');

            // Set state only if positive response from megaD
            processPortsState(dev, xmldata)
        });
    }).on('error', function(e) {
        adapter.warn("Got error by post request " + e.message);
    });
}

adapter.onEvent = function (id, value, ts, dir) {
    if (dir || id < adapter.firstId || id > adapter.firstId + devices.length * 40 + 1) {
        return;
    }

    var dev = null;
    var port = null;
    // Find device by object ID
    for (var k = 0; k < devices.length; k++) {
        if (!devices[k])
            continue;

        if (id < devices[k].devId || id > devices[k].devId + 40) {
            continue;
        }
        for (var i in devices[k].ports) {
            if (devices[k].ports[i].ccu.DPs && id == devices[k].ports[i].ccu.DPs.LEVEL) {
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

    adapter.info("try to control " + devices[k].name + ", port " + port + " with " + value);

    if (!devices[dev].ports[port] || devices[dev].ports[port].input) {
        adapter.warn("cannot control input port: " + devices[k].name + ", port " + port + " with " + value);
        return;
    }


    if (devices[dev].ports[port].digital) {
        if (value == 'OFF') {
            value = false;
        } else
        if (value == 'ON') {
            value = true;
        }
        if (value == '0') {
            value = false;
        } else
        if (value == '1') {
            value = true;
        }
        if (value === 'false') {
            value = false;
        } else
        if (value === 'true') {
            value = true;
        }
    }
    else {
        value = parseFloat(value);
    }

    if (devices[dev].ports[port].digital && value !== true && value !== false && value !== "CLICK" && value !== "LCLICK") {
        adapter.warn("invalid control value " + value + ". Value for digital port must be 0/false or 1/true");
    }

    if (devices[dev].ports[port].digital) {
        sendCommand(dev, port, (value == "CLICK" || value == "LCLICK") ? value : (value ? "ON" : "OFF"));
    } else {
        value = (value - devices[dev].ports[port].offset) / devices[dev].ports[port].factor * 256;
        value = value.toFixed(2);
        sendCommand(dev, port, value);
    }
};

adapter.onStop = function () {
    if (pollTimer) {
        clearInterval(pollTimer);
        pollTimer = null;
    }
};

function getPortsState (dev, callback) {
    var options = {
        host: devices[dev].ip,
        port: 80,
        path: '/data'
    };
    adapter.info("getPortsState http://" + options.host + options.path);

    http.get(options, function(res) {
        var xmldata = '';
        res.on('error', function (e) {
            adapter.warn(e);
        });
        res.on('data', function(chunk){
            xmldata += chunk;
        });
        res.on('end', function () {
            adapter.info("response for " + devices[dev].ip + ": " + xmldata);
            // Analyse answer and updates staties
            if (callback) {
                callback(dev, xmldata);
            }
        });
    }).on('error', function(e) {
        adapter.warn("Got error by request " + e.message);
        if (typeof simulate !== "undefined") {
            callback(dev, simulate);
        }
    });
}

function processPortsState(_dev, str) {
    if (str) {
        var ports = str.split('&');
        for (var i = 0; i < ports.length; i++) {
            if (ports[i]) {
                var parts = ports[i].split('=');
                if (parts.length == 2) {
                    processPortState(_dev, parts[0], parts[1]);
                }
            }
        }
    }
}

function processPortState (_dev, _port, value) {
    if (value !== null && devices[_dev].ports[_port]) {
        if (devices[_dev].ports[_port].digital) {
            if (value == 'OFF') {
                value = false;
            } else
            if (value == 'ON') {
                value = true;
            }
            if (value == '0') {
                value = false;
            } else
            if (value == '1') {
                value = true;
            }
            if (value === 'false') {
                value = false;
            } else
            if (value === 'true') {
                value = true;
            }
        } else if (_port == "Err") {
            value = parseInt(value);
        }
        else {
            value = parseFloat(value);
        }

        // If status changed
        //if (devices[_dev].ports[_port].ccu.value != value) {
            var oldValue = devices[_dev].ports[_port].ccu.value;
            devices[_dev].ports[_port].ccu.value = value;

            if (devices[_dev].ports[_port].digital) {
                adapter.info("detected new state for " + devices[_dev].ip + "[" + _port + "]: " + value + ' (old value ' + oldValue + ')');
                adapter.setState(devices[_dev].ports[_port].ccu.DPs.LEVEL, value, true);
            } else {
                var f = value * devices[_dev].ports[_port].factor + devices[_dev].ports[_port].offset;
                adapter.info("detected new value for " + devices[_dev].ip + "[" + _port + "]: " + value + ", calc state " + f + ' (old value ' + oldValue + ')');
                adapter.setState(devices[_dev].ports[_port].ccu.DPs.LEVEL, f, true);
            }
        //}
    }
}

function pollStatus (dev) {
    getPortsState(dev, processPortsState);
}

// Process http://ccu.io:8085/?Pname=0
function restApi(req, res) {
   // analyse /?DI1=1&DI2=0&DO3=0
    var parts = req.url.split("?");
   var ports;
    if (parts.length == 2) {
      ports = parts[1].split('&');
    } else {
        res.set('Content-Type', 'text/plain');
        res.send('Error: invalid format. Expected string like "?DI1=1&DI2=0&DO3=0"');
        return;   
   }
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
        res.send('Error: unknown device ip "' + req.connection.remoteAddress + '"');
        return;
    }
   
   var errors = '';
   for (var j = 0; j < ports.length; j++) {
      parts = ports[j].split('=');
      if (parts.length == 2) {
         var _port = parts[0];
         if (devices[_dev] && devices[_dev].ports[_port]) {
            var val = parts[1];
            if (val == "ON") {
               val = true;
            }
            if (val == "OFF") {
               val = false;
            }
            if (val === "true") {
               val = true;
            }
            if (val === "false") {
               val = false;
            }
            if (val == "1") {
               val = true;
            }
            if (val == "0") {
               val = false;
            }
            // If digital port
            if (devices[_dev].ports[_port].digital) {
               devices[_dev].ports[_port].ccu.value = val;
               adapter.info("" + devices[_dev].name + " reported new state for port " + _port + " - " + devices[_dev].ports[_port].ccu.value);
               adapter.setState(devices[_dev].ports[_port].ccu.DPs.LEVEL, val, true);
            }
         }
      } else {
         errors += (errors ? ', ' : '') + 'Cannot parse "' + ports[j] + '"';
      }
   }
   
   if (errors) {
      res.set('Content-Type', 'text/plain');
      res.send('Error: invalid input "' + req.url + '". Expected /?DOx=0&DOy=1.<br>' + errors);
   } else {
      res.set('Content-Type', 'text/plain');
      res.send('OK');
   }   
}

function arduinoInit () {
    for (var dev in adapter.settings.devices) {
        if (!adapter.settings.devices[dev].ip || adapter.settings.devices[dev].ip == "0.0.0.0")
            continue;

        var devChannels = [];
        var id = parseInt(dev.substring(1)) - 1;

        devices[id] = adapter.settings.devices[dev];
        devices[id].devId = adapter.firstId + id * 40;

        var iPort;
        for (var port in devices[id].ports) {
            iPort = devices[id].ports[port].id;
            var name = "Arduino_" + devices[id].name + "." + devices[id].ports[port].name;

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
                chnDP:    devices[id].devId + iPort * 2 + 1,
                name:     name,
                address:  "Arduino." + id + "." + port,
                DPs:      {
                    LEVEL:   devices[id].devId + iPort * 2 + 2
                }
            };

            devChannels.push(devices[id].ports[port].ccu.chnDP);

            var chObject = {};

            if (devices[id].ports[port].room) {
                chObject.rooms = devices[id].ports[port].room;
            }
            if (devices[id].ports[port].role) {
                chObject.funcs = devices[id].ports[port].role;
            }

            adapter.createDP(devices[id].ports[port].ccu.DPs.LEVEL, devices[id].ports[port].ccu.chnDP, name + (devices[id].ports[port].digital ? ".STATE" : ".LEVEL"), chObject);
            adapter.createChannel(devices[id].ports[port].ccu.chnDP, devices[id].devId, name, devices[id].ports[port].ccu.DPs, {
                Address: devices[id].ports[port].ccu.address,
                HssType: "Arduino_" + devices[id].ports[port].input ? "IN" : "OUT"
            });
            iPort++;
        }

        adapter.createDevice(devices[id].devId, "Arduino_" + devices[id].name, devChannels, {
            HssType:   "Arduino_ROOT",
            Address:   "Arduino" + id,
            Interface: "CCU.IO"
        });

        pollStatus(id);

        // Try to get the list of devices
        devices[id].pollTimer = setInterval(pollStatus, devices[id].pollIntervalSec * 1000, id);
    }

    try {
        if (adapter.settings.ioListenPort) {
            app = express();
            server = require('http').createServer(app);
        }
        if (app) {
            app.get('/*', restApi);
        }
        if (server) {
            server.listen(adapter.settings.ioListenPort);
            adapter.info("listening on port " + adapter.settings.ioListenPort);
        }
    } catch (e) {
        adapter.error("cannot start listening server on port " + adapter.settings.ioListenPort + ": " + e);
    }
}

arduinoInit();
