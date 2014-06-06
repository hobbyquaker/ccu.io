/**
*      CCU.IO Homepilot Adapter
*      06'2014 Bluefox
*      Lets control the Rademacher homepilot over ethernet (http://homepilot.rademacher.de/)
*
*      Version 0.1
*     
*      To get the list of all devices and there statuts call http://homepilotip/deviceajax.do?devices=1
*
*      To control the devices call: http://homepilot_ip/deviceajax.do POST:cid=CMD&did=RollNUMBER&goto=POS&command=1
*      where CMD is one of the possible commands:
*     
*            UP:1,
*            STOP:2,
*            DOWN:3,
*            POSITION_0:4,
*            POSITION_25:5,
*            POSITION_50:6,
*            POSITION_75:7,
*            POSITION_100:8,
*            POSITION_N:9,
*            ON:10,
*            OFF:11,
*            INCREMENT:23,
*            DECREMENT:24
*
*      POS will be used only for Command '9'.
*      for all other commands there is no action.
*      
*      And RollNUMBER is the number of motor from the device list.
*/
var settings = require(__dirname + '/../../settings.js');
 
if (!settings.adapters.homepilot || !settings.adapters.homepilot.enabled) {
    process.exit();
}
 
var homepilotSettings = settings.adapters.homepilot.settings;
 
var logger         = require(__dirname + '/../../logger.js'),
    io_client      = require('socket.io-client'), 
    http           = require('http');
 
var objects    = {},
    datapoints = {},
    devices    = [],
    isGotList  = false,
    pollTimer  = null,
    ccu_socket = null,
    commands   = {
        "UP":1,
        "STOP":2,
        "DOWN":3,
        "POSITION_0":4,
        "POSITION_25":5,
        "POSITION_50":6,
        "POSITION_75":7,
        "POSITION_100":8,
        "POSITION_N":9,
        "ON":10,
        "OFF":11,
        "INCREMENT":23,
        "DECREMENT":24
    };
 
function sendCommand (did, cmd, pos) {
    var post_data = 'cid=' + cmd + '&did=' + did + '&goto=' + ((pos === undefined) ? 0: pos) + '&command=1';

    var options = {
        host:   homepilotSettings.ip,
        port:   80,
        path:   '/deviceajax.do',
        method: 'POST',
        headers: {
            'Content-Type': 'text/plain',
            'Content-Length': post_data.length
        }
    };

    // Set up the request
    var post_req = http.request(options, function(res) {
        var xmldata = '';
        res.setEncoding('utf8');
        res.on('error', function (e) {
            logger.warn ("homepilot: " + e);
        });
        res.on('data', function(chunk){
            xmldata += chunk;
        });
        res.on('end', function () {
            console.log('Response: ' + xmldata);
        });
    }).on('error', function(e) {
        logger.warn("adapter homepilot: Got error by post request " + e.message);
    });;

    // post the data
    post_req.write(post_data);
    post_req.end();
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
    logger.info("adapter homepilot  connected to ccu.io");
});
 
ccu_socket.on('disconnect', function () {
    logger.info("adapter homepilot  disconnected from ccu.io");
});
 
ccu_socket.on('event', function (obj) {
    if (!obj || !obj[0]) {
        return;
    }
    var id = obj[0];
 
    if (!objects[id])
        return;
 
    var dev = null;

    // Find device by object ID
    for (var k = 0; k < devices.length; k++) {
        if (!devices[k]) continue;

        if (id == devices[k].DPs.LEVEL || id == devices[k].DPs.COMMAND) {
            dev = k;
            break;
        }
    }
 
    if (dev === null)
        return;
 
    // We can control COMMAND
    var val = obj[1];
    var ack = obj[3];
       
    if (ack)
        return;
 
    logger.info ("adapter homepilot  try to control id " + id + " with " + val);
 
    if (val === "false") { val = 0; }
    if (val === "true")  { val = 100; }

    if (parseFloat(val) == val) {
        // If number => set position
        val = Math.round(parseFloat(val) * 100);
        sendCommand(devices[dev].did, commands['POSITION_N'], val);

        // Set new status immediately
        if (id == devices[k].DPs.COMMAND) {
            setState(devices[dev].DPs.LEVEL, devices[dev].statusesMap.Position / 100);
        }
        return;
    }

    if (id == devices[k].DPs.COMMAND) {
        // val is command
        val = val.toUpperCase();
        if (commands[val]) {
            sendCommand(devices[dev].did, commands[val]);
        } else {
            logger.warn("adapter homepilot: unknown command " + val);
        }
    }
});
 
function stop() {
    if (pollTimer) {
        clearInterval(pollTimer);
        pollTimer = null;
    }
 
    logger.info("adapter homepilot  terminating");
 
    setTimeout(function () {
        process.exit();
    }, 250);
}
 
var testResponse = {
	"response": "get_visible_devices",
	"status": "ok",
	"devices": [{
		"did": 10009,
		"name": "Gartenbeleuchtung",
		"description": " ",
		"initialized": 1,
		"position": 100,
		"productName": "Universal-Aktor",
		"serial": "43",
		"statusesMap": {
			"Position": 100,
			"Manuellbetrieb": 0
		},
		"status_changed": 1401217204,
		"deviceGroup": 1,
		"iconSet": {
			"name": "Ein-Aus-Schalter",
			"description": "Ein- Aus-Schalter Icon-Set",
			"strMin": "An",
			"strMax": "Aus",
			"valMax": 100,
			"valMin": 0,
			"sprite": {
				"imageUri": "images/sets/ein-aus-schalter1.png",
				"numTiles": 2
			},
			"k": "iconset5"
		},
		"iconSetInverted": 0,
		"paired": 0,
		"statusValid": true,
		"uid": "43 XX XX",
		"visible": true,
		"groups": [5003],
		"favoredId": 5013,
		"properties": {
			"generic": 3,
			"wind": 3,
			"trigger": 3,
			"closingContact": 3,
			"dusk": 3,
			"smoke": 3,
			"sun": 3,
			"temperature": 3,
			"manual": 3,
			"time": 2,
			"dawn": 3,
			"dust": 3,
			"favored": 0,
			"smartphone": 3,
			"motion": 3,
			"temperator": 3,
			"warning": 3,
			"rain": 3,
			"states": [{
				"cfgKey": "setSunAuto",
				"cfgId": 105,
				"state": 0
			},
			{
				"cfgKey": "setEveningAuto",
				"cfgId": 107,
				"state": 1
			},
			{
				"cfgKey": "setAutomationOverall",
				"cfgId": 99,
				"state": 0
			},
			{
				"cfgKey": "setMorningAuto",
				"cfgId": 103,
				"state": 1
			},
			{
				"cfgKey": "setTimeAuto",
				"cfgId": 101,
				"state": 1
			}]
		},
		"sortId": 293,
		"sTypes": [],
		"version": "2.2",
		"sync": -2147483471,
		"messages": [],
		"hasErrors": 0,
		"autos": [3,
		2,
		0,
		1,
		4]
	},
	{
		"did": 10011,
		"name": "Moonlights",
		"description": " ",
		"initialized": 1,
		"position": 0,
		"productName": "Universal-Aktor",
		"serial": "43",
		"statusesMap": {
			"Position": 0,
			"Manuellbetrieb": 0
		},
		"status_changed": 1401180892,
		"deviceGroup": 1,
		"iconSet": {
			"name": "Ein-Aus-Schalter",
			"description": "Ein- Aus-Schalter Icon-Set",
			"strMin": "An",
			"strMax": "Aus",
			"valMax": 100,
			"valMin": 0,
			"sprite": {
				"imageUri": "images/sets/ein-aus-schalter1.png",
				"numTiles": 2
			},
			"k": "iconset5"
		},
		"iconSetInverted": 0,
		"paired": 0,
		"statusValid": true,
		"uid": "43 XX XX",
		"visible": true,
		"groups": [5003],
		"favoredId": -1,
		"properties": {
			"generic": 3,
			"wind": 3,
			"trigger": 3,
			"closingContact": 3,
			"dusk": 3,
			"smoke": 3,
			"sun": 3,
			"temperature": 3,
			"manual": 3,
			"time": 3,
			"dawn": 3,
			"dust": 3,
			"favored": 3,
			"smartphone": 3,
			"motion": 3,
			"temperator": 3,
			"warning": 3,
			"rain": 3,
			"states": [{
				"cfgKey": "setSunAuto",
				"cfgId": 105,
				"state": 0
			},
			{
				"cfgKey": "setEveningAuto",
				"cfgId": 107,
				"state": 0
			},
			{
				"cfgKey": "setAutomationOverall",
				"cfgId": 99,
				"state": 0
			},
			{
				"cfgKey": "setMorningAuto",
				"cfgId": 103,
				"state": 0
			},
			{
				"cfgKey": "setTimeAuto",
				"cfgId": 101,
				"state": 1
			}]
		},
		"sortId": 294,
		"sTypes": [],
		"version": "2.2",
		"sync": -2147483485,
		"messages": [],
		"hasErrors": 0,
		"autos": [3,
		2,
		0,
		1,
		4]
	},
	{
		"did": 10012,
		"name": "Poolbeleucht. klein",
		"description": " ",
		"initialized": 1,
		"position": 0,
		"productName": "Universal-Aktor",
		"serial": "43",
		"statusesMap": {
			"Position": 0,
			"Manuellbetrieb": 0
		},
		"status_changed": 1401180892,
		"deviceGroup": 1,
		"iconSet": {
			"name": "Ein-Aus-Schalter",
			"description": "Ein- Aus-Schalter Icon-Set",
			"strMin": "An",
			"strMax": "Aus",
			"valMax": 100,
			"valMin": 0,
			"sprite": {
				"imageUri": "images/sets/ein-aus-schalter1.png",
				"numTiles": 2
			},
			"k": "iconset5"
		},
		"iconSetInverted": 0,
		"paired": 0,
		"statusValid": true,
		"uid": "43 XX XX",
		"visible": true,
		"groups": [5003],
		"favoredId": -1,
		"properties": {
			"generic": 3,
			"wind": 3,
			"trigger": 3,
			"closingContact": 3,
			"dusk": 3,
			"smoke": 3,
			"sun": 3,
			"temperature": 3,
			"manual": 3,
			"time": 3,
			"dawn": 3,
			"dust": 3,
			"favored": 3,
			"smartphone": 3,
			"motion": 3,
			"temperator": 3,
			"warning": 3,
			"rain": 3,
			"states": [{
				"cfgKey": "setSunAuto",
				"cfgId": 105,
				"state": 0
			},
			{
				"cfgKey": "setEveningAuto",
				"cfgId": 107,
				"state": 0
			},
			{
				"cfgKey": "setAutomationOverall",
				"cfgId": 99,
				"state": 0
			},
			{
				"cfgKey": "setMorningAuto",
				"cfgId": 103,
				"state": 0
			},
			{
				"cfgKey": "setTimeAuto",
				"cfgId": 101,
				"state": 1
			}]
		},
		"sortId": 295,
		"sTypes": [],
		"version": "2.2",
		"sync": -2147483485,
		"messages": [],
		"hasErrors": 0,
		"autos": [3,
		2,
		0,
		1,
		4]
	},
	{
		"did": 10010,
		"name": "Poolbeleuchtung",
		"description": " ",
		"initialized": 1,
		"position": 0,
		"productName": "Universal-Aktor",
		"serial": "43",
		"statusesMap": {
			"Position": 0,
			"Manuellbetrieb": 0
		},
		"status_changed": 1401217204,
		"deviceGroup": 1,
		"iconSet": {
			"name": "Ein-Aus-Schalter",
			"description": "Ein- Aus-Schalter Icon-Set",
			"strMin": "An",
			"strMax": "Aus",
			"valMax": 100,
			"valMin": 0,
			"sprite": {
				"imageUri": "images/sets/ein-aus-schalter1.png",
				"numTiles": 2
			},
			"k": "iconset5"
		},
		"iconSetInverted": 0,
		"paired": 0,
		"statusValid": true,
		"uid": "43 XX XX",
		"visible": true,
		"groups": [5003],
		"favoredId": -1,
		"properties": {
			"generic": 3,
			"wind": 3,
			"trigger": 3,
			"closingContact": 3,
			"dusk": 3,
			"smoke": 3,
			"sun": 3,
			"temperature": 3,
			"manual": 3,
			"time": 3,
			"dawn": 3,
			"dust": 3,
			"favored": 3,
			"smartphone": 3,
			"motion": 3,
			"temperator": 3,
			"warning": 3,
			"rain": 3,
			"states": [{
				"cfgKey": "setSunAuto",
				"cfgId": 105,
				"state": 0
			},
			{
				"cfgKey": "setEveningAuto",
				"cfgId": 107,
				"state": 0
			},
			{
				"cfgKey": "setAutomationOverall",
				"cfgId": 99,
				"state": 0
			},
			{
				"cfgKey": "setMorningAuto",
				"cfgId": 103,
				"state": 0
			},
			{
				"cfgKey": "setTimeAuto",
				"cfgId": 101,
				"state": 1
			}]
		},
		"sortId": 296,
		"sTypes": [],
		"version": "2.2",
		"sync": -2147483481,
		"messages": [],
		"hasErrors": 0,
		"autos": [3,
		2,
		0,
		1,
		4]
	},
	{
		"did": 10006,
		"name": "Pumpe",
		"description": "Teichpumpe",
		"initialized": 1,
		"position": 0,
		"productName": "Steckdosenaktor",
		"serial": "46",
		"statusesMap": {
			"Position": 0,
			"Manuellbetrieb": 0
		},
		"status_changed": 1401206405,
		"deviceGroup": 1,
		"iconSet": {
			"name": "Pumpe",
			"description": "Pumpe Icon-Set",
			"strMin": "An",
			"strMax": "Aus",
			"valMax": 100,
			"valMin": 0,
			"sprite": {
				"imageUri": "images/sets/pumpe1.png",
				"numTiles": 2
			},
			"k": "iconset16"
		},
		"iconSetInverted": 0,
		"paired": 0,
		"statusValid": true,
		"uid": "46 XX XX",
		"visible": true,
		"groups": [],
		"favoredId": 5009,
		"properties": {
			"generic": 3,
			"wind": 3,
			"trigger": 3,
			"closingContact": 3,
			"dusk": 3,
			"smoke": 3,
			"sun": 3,
			"temperature": 3,
			"manual": 3,
			"time": 2,
			"dawn": 3,
			"dust": 3,
			"favored": 0,
			"smartphone": 3,
			"motion": 3,
			"temperator": 3,
			"warning": 3,
			"rain": 3,
			"states": [{
				"cfgKey": "setSunAuto",
				"cfgId": 105,
				"state": 0
			},
			{
				"cfgKey": "setEveningAuto",
				"cfgId": 107,
				"state": 0
			},
			{
				"cfgKey": "setAutomationOverall",
				"cfgId": 99,
				"state": 0
			},
			{
				"cfgKey": "setMorningAuto",
				"cfgId": 103,
				"state": 0
			},
			{
				"cfgKey": "setTimeAuto",
				"cfgId": 101,
				"state": 1
			}]
		},
		"sortId": 297,
		"sTypes": [],
		"version": "2.0",
		"sync": -2147483448,
		"messages": [],
		"hasErrors": 0,
		"autos": [3,
		2,
		0,
		1,
		4]
	},
	{
		"did": 10001,
		"name": "Rollo EG Esstisch",
		"description": " ",
		"initialized": 1,
		"position": 0,
		"productName": "RolloTron Comfort",
		"serial": "61",
		"statusesMap": {
			"Position": 0,
			"Manuellbetrieb": 0
		},
		"status_changed": 1401180972,
		"deviceGroup": 2,
		"iconSet": {
			"name": "Rollladen 2",
			"description": "Rollladen Icon-Set mit Streben",
			"strMin": "Auf",
			"strMax": "Zu",
			"valMax": 100,
			"valMin": 0,
			"sprite": {
				"imageUri": "images/sets/rollladen2.png",
				"numTiles": 5
			},
			"k": "iconset15"
		},
		"iconSetInverted": 0,
		"paired": 0,
		"statusValid": true,
		"uid": "61 XX XX",
		"visible": true,
		"groups": [5000],
		"favoredId": -1,
		"properties": {
			"generic": 3,
			"wind": 3,
			"trigger": 3,
			"closingContact": 3,
			"dusk": 3,
			"smoke": 3,
			"sun": 3,
			"temperature": 3,
			"manual": 3,
			"time": 2,
			"dawn": 3,
			"dust": 3,
			"favored": 3,
			"smartphone": 3,
			"motion": 3,
			"temperator": 3,
			"warning": 3,
			"rain": 3,
			"states": [{
				"cfgKey": "setSunAuto",
				"cfgId": 105,
				"state": 0
			},
			{
				"cfgKey": "setEveningAuto",
				"cfgId": 107,
				"state": 0
			},
			{
				"cfgKey": "setAutomationOverall",
				"cfgId": 99,
				"state": 0
			},
			{
				"cfgKey": "setMorningAuto",
				"cfgId": 103,
				"state": 0
			},
			{
				"cfgKey": "setTimeAuto",
				"cfgId": 101,
				"state": 1
			}]
		},
		"sortId": 298,
		"sTypes": [30],
		"version": "0.3",
		"sync": -2147483479,
		"messages": [],
		"hasErrors": 0,
		"autos": [3,
		2,
		0,
		1,
		4]
	},
	{
		"did": 10000,
		"name": "Rollo EG Kuche",
		"description": " ",
		"initialized": 1,
		"position": 100,
		"productName": "RolloTron Comfort",
		"serial": "61",
		"statusesMap": {
			"Position": 100,
			"Manuellbetrieb": 0
		},
		"status_changed": 1401217223,
		"deviceGroup": 2,
		"iconSet": {
			"name": "Rollladen 2",
			"description": "Rollladen Icon-Set mit Streben",
			"strMin": "Auf",
			"strMax": "Zu",
			"valMax": 100,
			"valMin": 0,
			"sprite": {
				"imageUri": "images/sets/rollladen2.png",
				"numTiles": 5
			},
			"k": "iconset15"
		},
		"iconSetInverted": 0,
		"paired": 0,
		"statusValid": true,
		"uid": "61 XX XX",
		"visible": true,
		"groups": [5000],
		"favoredId": -1,
		"properties": {
			"generic": 3,
			"wind": 3,
			"trigger": 3,
			"closingContact": 3,
			"dusk": 3,
			"smoke": 3,
			"sun": 3,
			"temperature": 3,
			"manual": 3,
			"time": 2,
			"dawn": 3,
			"dust": 3,
			"favored": 3,
			"smartphone": 3,
			"motion": 3,
			"temperator": 3,
			"warning": 3,
			"rain": 3,
			"states": [{
				"cfgKey": "setSunAuto",
				"cfgId": 105,
				"state": 1
			},
			{
				"cfgKey": "setEveningAuto",
				"cfgId": 107,
				"state": 1
			},
			{
				"cfgKey": "setAutomationOverall",
				"cfgId": 99,
				"state": 0
			},
			{
				"cfgKey": "setMorningAuto",
				"cfgId": 103,
				"state": 1
			},
			{
				"cfgKey": "setTimeAuto",
				"cfgId": 101,
				"state": 1
			}]
		},
		"sortId": 299,
		"sTypes": [30],
		"version": "0.3",
		"sync": -2147483474,
		"messages": [],
		"hasErrors": 0,
		"autos": [3,
		2,
		0,
		1,
		4]
	},
	{
		"did": 10005,
		"name": "Rollo EG WoZi F1",
		"description": "kleines Fenster (Slave)",
		"initialized": 1,
		"position": 100,
		"productName": "RolloTron Standard",
		"serial": "40",
		"statusesMap": {
			"Position": 100,
			"Manuellbetrieb": 0
		},
		"status_changed": 1401215426,
		"deviceGroup": 2,
		"iconSet": {
			"name": "Rollladen 1",
			"description": "Rollladen Icon-Set",
			"strMin": "Auf",
			"strMax": "Zu",
			"valMax": 100,
			"valMin": 0,
			"sprite": {
				"imageUri": "images/sets/rollladen1.png",
				"numTiles": 5
			},
			"k": "iconset8"
		},
		"iconSetInverted": 0,
		"paired": 0,
		"statusValid": true,
		"uid": "40 XX XX",
		"visible": true,
		"groups": [5000],
		"favoredId": -1,
		"properties": {
			"generic": 3,
			"wind": 3,
			"trigger": 3,
			"closingContact": 3,
			"dusk": 3,
			"smoke": 3,
			"sun": 3,
			"temperature": 3,
			"manual": 3,
			"time": 2,
			"dawn": 3,
			"dust": 3,
			"favored": 3,
			"smartphone": 3,
			"motion": 3,
			"temperator": 3,
			"warning": 3,
			"rain": 3,
			"states": [{
				"cfgKey": "setSunAuto",
				"cfgId": 105,
				"state": 1
			},
			{
				"cfgKey": "setEveningAuto",
				"cfgId": 107,
				"state": 1
			},
			{
				"cfgKey": "setAutomationOverall",
				"cfgId": 99,
				"state": 0
			},
			{
				"cfgKey": "setMorningAuto",
				"cfgId": 103,
				"state": 1
			},
			{
				"cfgKey": "setTimeAuto",
				"cfgId": 101,
				"state": 1
			}]
		},
		"sortId": 300,
		"sTypes": [],
		"version": "0.7",
		"sync": -2147483474,
		"messages": [],
		"hasErrors": 0,
		"autos": [3,
		2,
		0,
		1,
		4]
	},
	{
		"did": 10004,
		"name": "Rollo EG WoZi F2",
		"description": "grosses Fenster (Slave)",
		"initialized": 1,
		"position": 93,
		"productName": "RolloTron Standard",
		"serial": "40",
		"statusesMap": {
			"Position": 93,
			"Manuellbetrieb": 0
		},
		"status_changed": 1401215431,
		"deviceGroup": 2,
		"iconSet": {
			"name": "Rollladen 1",
			"description": "Rollladen Icon-Set",
			"strMin": "Auf",
			"strMax": "Zu",
			"valMax": 100,
			"valMin": 0,
			"sprite": {
				"imageUri": "images/sets/rollladen1.png",
				"numTiles": 5
			},
			"k": "iconset8"
		},
		"iconSetInverted": 0,
		"paired": 0,
		"statusValid": true,
		"uid": "40 XX XX",
		"visible": true,
		"groups": [5000],
		"favoredId": -1,
		"properties": {
			"generic": 3,
			"wind": 3,
			"trigger": 3,
			"closingContact": 3,
			"dusk": 3,
			"smoke": 3,
			"sun": 3,
			"temperature": 3,
			"manual": 3,
			"time": 2,
			"dawn": 3,
			"dust": 3,
			"favored": 3,
			"smartphone": 3,
			"motion": 3,
			"temperator": 3,
			"warning": 3,
			"rain": 3,
			"states": [{
				"cfgKey": "setSunAuto",
				"cfgId": 105,
				"state": 1
			},
			{
				"cfgKey": "setEveningAuto",
				"cfgId": 107,
				"state": 1
			},
			{
				"cfgKey": "setAutomationOverall",
				"cfgId": 99,
				"state": 0
			},
			{
				"cfgKey": "setMorningAuto",
				"cfgId": 103,
				"state": 1
			},
			{
				"cfgKey": "setTimeAuto",
				"cfgId": 101,
				"state": 1
			}]
		},
		"sortId": 301,
		"sTypes": [],
		"version": "0.7",
		"sync": -2147483474,
		"messages": [],
		"hasErrors": 0,
		"autos": [3,
		2,
		0,
		1,
		4]
	},
	{
		"did": 10003,
		"name": "Rollo EG WoZi F3",
		"description": "grosses Fenster (Master)",
		"initialized": 1,
		"position": 100,
		"productName": "RolloTron Comfort",
		"serial": "61",
		"statusesMap": {
			"Position": 100,
			"Manuellbetrieb": 0
		},
		"status_changed": 1401215433,
		"deviceGroup": 2,
		"iconSet": {
			"name": "Rollladen 2",
			"description": "Rollladen Icon-Set mit Streben",
			"strMin": "Auf",
			"strMax": "Zu",
			"valMax": 100,
			"valMin": 0,
			"sprite": {
				"imageUri": "images/sets/rollladen2.png",
				"numTiles": 5
			},
			"k": "iconset15"
		},
		"iconSetInverted": 0,
		"paired": 0,
		"statusValid": true,
		"uid": "61 XX XX",
		"visible": true,
		"groups": [5000],
		"favoredId": -1,
		"properties": {
			"generic": 3,
			"wind": 3,
			"trigger": 3,
			"closingContact": 3,
			"dusk": 3,
			"smoke": 3,
			"sun": 3,
			"temperature": 3,
			"manual": 3,
			"time": 2,
			"dawn": 3,
			"dust": 3,
			"favored": 3,
			"smartphone": 3,
			"motion": 3,
			"temperator": 3,
			"warning": 3,
			"rain": 3,
			"states": [{
				"cfgKey": "setSunAuto",
				"cfgId": 105,
				"state": 1
			},
			{
				"cfgKey": "setEveningAuto",
				"cfgId": 107,
				"state": 1
			},
			{
				"cfgKey": "setAutomationOverall",
				"cfgId": 99,
				"state": 0
			},
			{
				"cfgKey": "setMorningAuto",
				"cfgId": 103,
				"state": 1
			},
			{
				"cfgKey": "setTimeAuto",
				"cfgId": 101,
				"state": 1
			}]
		},
		"sortId": 302,
		"sTypes": [30],
		"version": "0.3",
		"sync": -2147483473,
		"messages": [],
		"hasErrors": 0,
		"autos": [3,
		2,
		0,
		1,
		4]
	},
	{
		"did": 10014,
		"name": "Rollo EG WoZi Ture",
		"description": " ",
		"initialized": 1,
		"position": 0,
		"productName": "RolloTron Comfort",
		"serial": "61",
		"statusesMap": {
			"Position": 0,
			"Manuellbetrieb": 0
		},
		"status_changed": 1401180933,
		"deviceGroup": 2,
		"iconSet": {
			"name": "Tur",
			"description": "Tur Icon-Set",
			"strMin": "An",
			"strMax": "Aus",
			"valMax": 100,
			"valMin": 0,
			"sprite": {
				"imageUri": "images/sets/tuer1.png",
				"numTiles": 2
			},
			"k": "iconset12"
		},
		"iconSetInverted": 0,
		"paired": 0,
		"statusValid": true,
		"uid": "61 XX XX",
		"visible": true,
		"groups": [5000],
		"favoredId": -1,
		"properties": {
			"generic": 3,
			"wind": 3,
			"trigger": 3,
			"closingContact": 3,
			"dusk": 3,
			"smoke": 3,
			"sun": 3,
			"temperature": 3,
			"manual": 3,
			"time": 2,
			"dawn": 3,
			"dust": 3,
			"favored": 3,
			"smartphone": 3,
			"motion": 3,
			"temperator": 3,
			"warning": 3,
			"rain": 3,
			"states": [{
				"cfgKey": "setSunAuto",
				"cfgId": 105,
				"state": 1
			},
			{
				"cfgKey": "setEveningAuto",
				"cfgId": 107,
				"state": 1
			},
			{
				"cfgKey": "setAutomationOverall",
				"cfgId": 99,
				"state": 0
			},
			{
				"cfgKey": "setMorningAuto",
				"cfgId": 103,
				"state": 1
			},
			{
				"cfgKey": "setTimeAuto",
				"cfgId": 101,
				"state": 1
			}]
		},
		"sortId": 303,
		"sTypes": [30],
		"version": "0.4",
		"sync": -2147483477,
		"messages": [],
		"hasErrors": 0,
		"autos": [3,
		2,
		0,
		1,
		4]
	},
	{
		"did": 10019,
		"name": "Rollo OG KiZi Fenster",
		"description": " ",
		"initialized": 1,
		"position": 100,
		"productName": "RolloTron Comfort",
		"serial": "61",
		"statusesMap": {
			"Position": 100,
			"Manuellbetrieb": 0
		},
		"status_changed": 1401211341,
		"deviceGroup": 2,
		"iconSet": {
			"name": "Rollladen 2",
			"description": "Rollladen Icon-Set mit Streben",
			"strMin": "Auf",
			"strMax": "Zu",
			"valMax": 100,
			"valMin": 0,
			"sprite": {
				"imageUri": "images/sets/rollladen2.png",
				"numTiles": 5
			},
			"k": "iconset15"
		},
		"iconSetInverted": 0,
		"paired": 0,
		"statusValid": true,
		"uid": "61 XX XX",
		"visible": true,
		"groups": [5004],
		"favoredId": -1,
		"properties": {
			"generic": 3,
			"wind": 3,
			"trigger": 3,
			"closingContact": 3,
			"dusk": 3,
			"smoke": 3,
			"sun": 3,
			"temperature": 3,
			"manual": 3,
			"time": 3,
			"dawn": 3,
			"dust": 3,
			"favored": 3,
			"smartphone": 3,
			"motion": 3,
			"temperator": 3,
			"warning": 3,
			"rain": 3,
			"states": [{
				"cfgKey": "setSunAuto",
				"cfgId": 105,
				"state": 1
			},
			{
				"cfgKey": "setEveningAuto",
				"cfgId": 107,
				"state": 0
			},
			{
				"cfgKey": "setAutomationOverall",
				"cfgId": 99,
				"state": 0
			},
			{
				"cfgKey": "setMorningAuto",
				"cfgId": 103,
				"state": 0
			},
			{
				"cfgKey": "setTimeAuto",
				"cfgId": 101,
				"state": 1
			}]
		},
		"sortId": 304,
		"sTypes": [30],
		"version": "1.2",
		"sync": -2147483478,
		"messages": [],
		"hasErrors": 0,
		"autos": [3,
		2,
		0,
		1,
		4]
	},
	{
		"did": 10020,
		"name": "Rollo OG KiZi Ture",
		"description": " ",
		"initialized": 1,
		"position": 100,
		"productName": "RolloTron Comfort",
		"serial": "61",
		"statusesMap": {
			"Position": 100,
			"Manuellbetrieb": 0
		},
		"status_changed": 1401211347,
		"deviceGroup": 2,
		"iconSet": {
			"name": "Tur",
			"description": "Tur Icon-Set",
			"strMin": "An",
			"strMax": "Aus",
			"valMax": 100,
			"valMin": 0,
			"sprite": {
				"imageUri": "images/sets/tuer1.png",
				"numTiles": 2
			},
			"k": "iconset12"
		},
		"iconSetInverted": 0,
		"paired": 0,
		"statusValid": true,
		"uid": "61 XX XX",
		"visible": true,
		"groups": [5004],
		"favoredId": -1,
		"properties": {
			"generic": 3,
			"wind": 3,
			"trigger": 3,
			"closingContact": 3,
			"dusk": 3,
			"smoke": 3,
			"sun": 3,
			"temperature": 3,
			"manual": 3,
			"time": 3,
			"dawn": 3,
			"dust": 3,
			"favored": 3,
			"smartphone": 3,
			"motion": 3,
			"temperator": 3,
			"warning": 3,
			"rain": 3,
			"states": [{
				"cfgKey": "setSunAuto",
				"cfgId": 105,
				"state": 1
			},
			{
				"cfgKey": "setEveningAuto",
				"cfgId": 107,
				"state": 0
			},
			{
				"cfgKey": "setAutomationOverall",
				"cfgId": 99,
				"state": 0
			},
			{
				"cfgKey": "setMorningAuto",
				"cfgId": 103,
				"state": 0
			},
			{
				"cfgKey": "setTimeAuto",
				"cfgId": 101,
				"state": 1
			}]
		},
		"sortId": 305,
		"sTypes": [30],
		"version": "1.2",
		"sync": -2147483477,
		"messages": [],
		"hasErrors": 0,
		"autos": [3,
		2,
		0,
		1,
		4]
	},
	{
		"did": 10017,
		"name": "Rollo OG SZ Fenster",
		"description": " ",
		"initialized": 1,
		"position": 100,
		"productName": "RolloTron Comfort",
		"serial": "61",
		"statusesMap": {
			"Position": 100,
			"Manuellbetrieb": 0
		},
		"status_changed": 1401211636,
		"deviceGroup": 2,
		"iconSet": {
			"name": "Rollladen 2",
			"description": "Rollladen Icon-Set mit Streben",
			"strMin": "Auf",
			"strMax": "Zu",
			"valMax": 100,
			"valMin": 0,
			"sprite": {
				"imageUri": "images/sets/rollladen2.png",
				"numTiles": 5
			},
			"k": "iconset15"
		},
		"iconSetInverted": 0,
		"paired": 0,
		"statusValid": true,
		"uid": "61 XX XX",
		"visible": true,
		"groups": [5004],
		"favoredId": -1,
		"properties": {
			"generic": 3,
			"wind": 3,
			"trigger": 3,
			"closingContact": 3,
			"dusk": 3,
			"smoke": 3,
			"sun": 3,
			"temperature": 3,
			"manual": 3,
			"time": 3,
			"dawn": 3,
			"dust": 3,
			"favored": 3,
			"smartphone": 3,
			"motion": 3,
			"temperator": 3,
			"warning": 3,
			"rain": 3,
			"states": [{
				"cfgKey": "setSunAuto",
				"cfgId": 105,
				"state": 1
			},
			{
				"cfgKey": "setEveningAuto",
				"cfgId": 107,
				"state": 1
			},
			{
				"cfgKey": "setAutomationOverall",
				"cfgId": 99,
				"state": 0
			},
			{
				"cfgKey": "setMorningAuto",
				"cfgId": 103,
				"state": 1
			},
			{
				"cfgKey": "setTimeAuto",
				"cfgId": 101,
				"state": 1
			}]
		},
		"sortId": 306,
		"sTypes": [30],
		"version": "0.4",
		"sync": -2147483464,
		"messages": [],
		"hasErrors": 0,
		"autos": [3,
		2,
		0,
		1,
		4]
	},
	{
		"did": 10018,
		"name": "Rollo OG SZ Ture",
		"description": " ",
		"initialized": 1,
		"position": 100,
		"productName": "RolloTron Comfort",
		"serial": "61",
		"statusesMap": {
			"Position": 100,
			"Manuellbetrieb": 0
		},
		"status_changed": 1401211614,
		"deviceGroup": 2,
		"iconSet": {
			"name": "Tur",
			"description": "Tur Icon-Set",
			"strMin": "An",
			"strMax": "Aus",
			"valMax": 100,
			"valMin": 0,
			"sprite": {
				"imageUri": "images/sets/tuer1.png",
				"numTiles": 2
			},
			"k": "iconset12"
		},
		"iconSetInverted": 0,
		"paired": 0,
		"statusValid": true,
		"uid": "61 XX XX",
		"visible": true,
		"groups": [5004],
		"favoredId": -1,
		"properties": {
			"generic": 3,
			"wind": 3,
			"trigger": 3,
			"closingContact": 3,
			"dusk": 3,
			"smoke": 3,
			"sun": 3,
			"temperature": 3,
			"manual": 3,
			"time": 3,
			"dawn": 3,
			"dust": 3,
			"favored": 3,
			"smartphone": 3,
			"motion": 3,
			"temperator": 3,
			"warning": 3,
			"rain": 3,
			"states": [{
				"cfgKey": "setSunAuto",
				"cfgId": 105,
				"state": 1
			},
			{
				"cfgKey": "setEveningAuto",
				"cfgId": 107,
				"state": 0
			},
			{
				"cfgKey": "setAutomationOverall",
				"cfgId": 99,
				"state": 0
			},
			{
				"cfgKey": "setMorningAuto",
				"cfgId": 103,
				"state": 0
			},
			{
				"cfgKey": "setTimeAuto",
				"cfgId": 101,
				"state": 1
			}]
		},
		"sortId": 307,
		"sTypes": [30],
		"version": "1.2",
		"sync": -2147483464,
		"messages": [],
		"hasErrors": 0,
		"autos": [3,
		2,
		0,
		1,
		4]
	},
	{
		"did": 10016,
		"name": "Test-Steckdose 2",
		"description": " ",
		"initialized": 1,
		"position": -1,
		"productName": "Steckdosenaktor",
		"serial": "46",
		"statusesMap": {
			"Position": 0,
			"Manuellbetrieb": 0
		},
		"status_changed": -1,
		"deviceGroup": 1,
		"iconSet": {
			"name": "Tischlampe",
			"description": "Tischlampe Icon-Set",
			"strMin": "An",
			"strMax": "Aus",
			"valMax": 100,
			"valMin": 0,
			"sprite": {
				"imageUri": "images/sets/tischlampe1.png",
				"numTiles": 5
			},
			"k": "iconset11"
		},
		"iconSetInverted": 0,
		"paired": 0,
		"statusValid": false,
		"uid": "46 XX XX",
		"visible": true,
		"groups": [],
		"favoredId": -1,
		"properties": {
			"generic": 3,
			"wind": 3,
			"trigger": 3,
			"closingContact": 3,
			"dusk": 3,
			"smoke": 3,
			"sun": 3,
			"temperature": 3,
			"manual": 3,
			"time": 3,
			"dawn": 3,
			"dust": 3,
			"favored": 3,
			"smartphone": 3,
			"motion": 3,
			"temperator": 3,
			"warning": 3,
			"rain": 3,
			"states": [{
				"cfgKey": "setSunAuto",
				"cfgId": 105,
				"state": 0
			},
			{
				"cfgKey": "setEveningAuto",
				"cfgId": 107,
				"state": 0
			},
			{
				"cfgKey": "setAutomationOverall",
				"cfgId": 99,
				"state": 0
			},
			{
				"cfgKey": "setMorningAuto",
				"cfgId": 103,
				"state": 0
			},
			{
				"cfgKey": "setTimeAuto",
				"cfgId": 101,
				"state": 0
			}]
		},
		"sortId": 308,
		"sTypes": [],
		"version": "",
		"sync": -2147483488,
		"messages": [],
		"hasErrors": 0,
		"autos": [3,
		2,
		0,
		1,
		4]
	},
	{
		"did": 10013,
		"name": "Test-Steckdose Keller",
		"description": " ",
		"initialized": 1,
		"position": -1,
		"productName": "Steckdosenaktor",
		"serial": "46",
		"statusesMap": {
			"Position": 0,
			"Manuellbetrieb": 0
		},
		"status_changed": -1,
		"deviceGroup": 1,
		"iconSet": {
			"name": "Steckdose",
			"description": "Steckdose Icon-Set",
			"strMin": "An",
			"strMax": "Aus",
			"valMax": 100,
			"valMin": 0,
			"sprite": {
				"imageUri": "images/sets/steckdose1.png",
				"numTiles": 2
			},
			"k": "iconset10"
		},
		"iconSetInverted": 0,
		"paired": 0,
		"statusValid": false,
		"uid": "46 XX XX",
		"visible": true,
		"groups": [],
		"favoredId": -1,
		"properties": {
			"generic": 3,
			"wind": 3,
			"trigger": 3,
			"closingContact": 3,
			"dusk": 3,
			"smoke": 3,
			"sun": 3,
			"temperature": 3,
			"manual": 3,
			"time": 3,
			"dawn": 3,
			"dust": 3,
			"favored": 3,
			"smartphone": 3,
			"motion": 3,
			"temperator": 3,
			"warning": 3,
			"rain": 3,
			"states": [{
				"cfgKey": "setSunAuto",
				"cfgId": 105,
				"state": 0
			},
			{
				"cfgKey": "setEveningAuto",
				"cfgId": 107,
				"state": 0
			},
			{
				"cfgKey": "setAutomationOverall",
				"cfgId": 99,
				"state": 0
			},
			{
				"cfgKey": "setMorningAuto",
				"cfgId": 103,
				"state": 0
			},
			{
				"cfgKey": "setTimeAuto",
				"cfgId": 101,
				"state": 0
			}]
		},
		"sortId": 309,
		"sTypes": [],
		"version": "",
		"sync": -2147483488,
		"messages": [],
		"hasErrors": 0,
		"autos": [3,
		2,
		0,
		1,
		4]
	}]
}; 

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
        logger.verbose("adapter homepilot  setState " + id + " " + val);
        ccu_socket.emit("setState", [id, val, null, true]);
    }
}
 
function getDevices(callback) {
    var options = {
        host: homepilotSettings.ip,
        port: 80,
        path: '/deviceajax.do?devices=1'
    };

    http.get(options, function(res) {
        var xmldata = '';
        res.setEncoding('utf8');
        res.on('error', function (e) {
            logger.warn ("homepilot: " + e);
            if (typeof testResponse != 'undefined') {
                // Analyse answer and updates staties
                if (callback) {
                    callback(testResponse.devices);
                }
            }
        });
        res.on('data', function(chunk){
            xmldata += chunk;
        });
        res.on('end', function () {
            // Analyse answer and updates staties
            if (callback) {
                var data = null;
                try {
                    data = JSON.parse(xmldata);
                } catch(e) {
                    logger.warn("adapter homepilot: cannot parse json answer");
                }

                if (data) {
                    if (data.status == 'ok' && data.response == 'get_visible_devices') {
                        callback(data.devices);
                    }
                }
            }
        });
    }).on('error', function(e) {
        logger.warn("adapter homepilot: Got error by request " + e.message);
        if (typeof testResponse != 'undefined') {
            // Analyse answer and updates staties
            if (callback) {
                callback(testResponse.devices);
            }
        }
    });
}
 
function pollStatus() {
    if (isGotList) {
        getDevices(function (devs) {
            if (devs) {
                for (var j = 0; j < devs.length; j++) {
                    var num = devs[j].did - 10000;
                    // If status changed
                    if (devs[j].statusesMap && devs[j].statusesMap.Position != devices[num].statusesMap.Position){
                        devices[num].statusesMap.Position = devs[j].statusesMap.Position;
                        setState(devices[num].DPs.LEVEL, devices[num].statusesMap.Position / 100);
                    }
                }
            }
        });
    } else {
        // Try to get the initial read
        getDevices(function (devs) {
            if (devs) {
                clearInterval(pollTimer);
                pollTimer = null;

                var dp;
                var chnDp;
                var devChannels = [];

                for (var i = 0; i < devs.length; i++) {
                    var id = devs[i].did;
                    var num = id - 10000;
                    chnDp = homepilotSettings.firstId + (num + 1) * 5;
                    dp    = chnDp + 1;

                    devChannels.push(chnDp);
                    devices[num] = devs[i];
                    devices[num].DPs = {
                        LEVEL:   dp+0,
                        COMMAND: dp+1
                    }
                    var name = (devices[num]['name']) || id;
                    name = name.replace(/ /g, '_');
                    name = name.replace(/\./g, '_');

                    var chObject = {
                        Name:     name,
                        TypeName: "CHANNEL",
                        Address:  "Homepilot." + name,
                        HssType:  "Homepilot",
                        DPs:      devices[num].DPs,
                        Parent:   homepilotSettings.firstId
                    };

                    setObject(chnDp, chObject);

                    setObject(devices[num].DPs.LEVEL, {
                        Name:         chObject.Address+".LEVEL",
                        ValueType:    16,
                        ValueSubType: 29,
                        TypeName:     "HSSDP",
                        Value:        0, // 0 - Pause, 1 - play, 2 - stop
                        Parent:       chnDp
                    });
                    setObject(devices[num].DPs.COMMAND, {
                        Name:         chObject.Address+".COMMAND",
                        ValueType:    20,
                        ValueSubType: 11,
                        TypeName:     "HSSDP",
                        Value:        "",
                        Parent:       chnDp
                    });
                }

                setObject(homepilotSettings.firstId, {
                    Name:      "Homepilot",
                    TypeName:  "DEVICE",
                    HssType:   "Homepilot_ROOT",
                    Address:   "Homepilot",
                    Interface: "CCU.IO",
                    Channels:  devChannels
                });


                // Start the status polling
                if (homepilotSettings.pollIntervalSec) {
                    pollTimer = setInterval(pollStatus, homepilotSettings.pollIntervalSec * 1000);
                }
                isGotList = true;

                // Update initial states
                for (var u = 0; u < devs.length; u++) {
                    var n = devs[u].did - 10000;
                    setState(devices[n].DPs.LEVEL, devices[n].statusesMap.Position / 100);
                }
            }
        });
    }
}
 
function homepilotInit () {
    ccu_socket.on('news', function (data) {
        console.log(data);
        ccu_socket.emit('my other event', { my: 'data' });
    });

    pollStatus();

    // Try to get the list of devices
    pollTimer = setInterval(pollStatus, 30000);
}
 
homepilotInit ();