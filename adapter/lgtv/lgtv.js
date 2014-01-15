/**
 *      CCU.IO LG TV Adapter
 *      12'2013 Bluefox
 *      Lets control the LG TV over ethernet
 *
 *      Version 0.1
 *      Information got from http://www.cometvisu.de/wiki/index.php?title=LGconnectd
 */
var settings = require(__dirname+'/../../settings.js');

if (!settings.adapters.lgtv || !settings.adapters.lgtv.enabled) {
    process.exit();
}

var lgtvSettings = settings.adapters.lgtv.settings;

var logger         = require(__dirname+'/../../logger.js'),
    io_client      = require('socket.io-client'),
    xml2js         = require('xml2js').parseString,    
	http           = require('http');

var objects    = {},
    datapoints = {},
    devices    = {};

function postRequest (device, path, post_data, callback) {
    var options = {
        host:   device["ip"],
        port:   8080,
        path:   path,
		method: 'POST',
		headers: {
          'Content-Type': 'application/atom+xml',
          'Content-Length': post_data.length
      }
    };
	// Set up the request
	var post_req = http.request(options, function(res) {
		var xmldata = '';
		res.setEncoding('utf8'),
		res.on('error', function (e) {
			logger.warn ("lgtv: " + e);
			if (callback) 
				callback (device, null);
		});
		res.on('data', function(chunk){
			xmldata += chunk;
		})
		res.on('end', function () {
			console.log('Response: ' + xmldata);
			if (callback) 
				callback (device, xmldata);
		});
	});

	// post the data
	post_req.write(post_data);
	post_req.end();
}

function displayKey (device) {
	postRequest (device, "/hdcp/api/auth", "<?xml version=\"1.0\" encoding=\"utf-8\"?><auth><type>AuthKeyReq</type></auth>");
}

function getSessionId (device, paringKey, callb) {
	postRequest (device,
	    "/hdcp/api/auth", 
		"<?xml version=\"1.0\" encoding=\"utf-8\"?><auth><type>AuthReq</type><value>"+paringKey+"</value></auth>",
		function (device_, result) {
			if (result) {
				xml2js (result, function (err, jsObject) {
					if (!err && jsObject.envelope && jsObject.envelope.session) {
						if (callb) 
							callb (device_, jsObject.envelope.session[0]);
					}
					else {
						if (callb) 
							callb (device_, null);	
					}
				});
			}
		}
	);
}

function handleCommand (device, session, cmd, cb) {
	//echo "<?xml version=\"1.0\" encoding=\"utf-8\"?><command><session>".$session."</session><type>HandleKeyInput</type><value>".$cmd."</value></command>";
	postRequest (device,
		"/hdcp/api/dtv_wifirc", 
		"<?xml version=\"1.0\" encoding=\"utf-8\"?><command><session>"+session+"</session><type>HandleKeyInput</type><value>"+cmd+"</value></command>", 
		function (device_, result) {
			if (cb) {
				cb (device_, result);
			}
		}
	);
}

var commands = {
// Menus
	"menu_status_bar":            "35",
	"menu_quick_menu":            "69",
	"menu_home_menu":             "67",
	"menu_premium_menu":          "89",
	"menu_installation_menu":     "207",
	"menu_IN_START":              "251",
	"menu_EZ_ADJUST":             "255",
	"menu_power_only":            "254",
// Power controls                
	"power_off" :                 "8",
	"power_sleep_timer":          "14",
// Navigation                    
	"nav_left" :                  "7",
	"nav_right" :                 "6",
	"nav_up" :                    "64",
	"nav_down" :                  "65",
	"nav_select" :                "68",
	"nav_back" :                  "40",
	"nav_exit" :                  "91",
	"nav_red" :                   "114",
	"nav_green" :                 "113",
	"nav_yellow" :                "99",
	"nav_blue" :                  "97",
// keypad                        
	"keypad_0" :                  "16",
	"keypad_1" :                  "17",
	"keypad_2" :                  "18",
	"keypad_3" :                  "19",
	"keypad_4" :                  "20",
	"keypad_5" :                  "21",
	"keypad_6" :                  "22",
	"keypad_7" :                  "23",
	"keypad_8" :                  "24",
	"keypad_9" :                  "25",
	// Undescore                  
	"keypad__" :                  "76",
	//Playback controls          
	"playback_play" :             "176",
	"playback_pause" :            "186",
	"playback_fast_forward" :     "142",
	"playback_rewind" :           "143",
	"playback_stop" :             "177",
	"playback_record" :           "189",
// Input controls                
	"input_tv_radio" :            "15",
	"input_simplink" :            "126",
	"input_input" :               "11",
	"input_component_rgb_hdmi" :  "152",
	"input_component" :           "191",
	"input_rgb" :                 "213",
	"input_hdmi" :                "198",
	"input_hdmi1" :               "206",
	"input_hdmi2" :               "204",
	"input_hdmi3" :               "233",
	"input_hdmi4" :               "218",
	"input_av1" :                 "90",
	"input_av2" :                 "208",
	"input_av3" :                 "209",
	"input_usb" :                 "124",
	"input_slideshow_usb1" :      "238",
	"input_slideshow_usb2" :      "168",
// TV Controls
	"tv_channel_up" :             "0",
	"tv_channel_down" :           "1",
	"tv_channel_back" :           "26",
	"tv_favorites" :              "30",
	"tv_teletext" :               "32",
	"tv_t_opt" :                  "33",
	"tv_channel_list" :           "83",
	"tv_greyed_out_add_button" : "85",
	"tv_guide" :                  "169",
	"tv_info" :                   "170",
	"tv_live_tv" :                "158",
  // Picture controls
	"picture_av_mode" :           "48",
	"picture_mode" :              "77",
	"picture_ratio" :             "121",
	"picture_ratio_4_3" :         "118",
	"picture_ratio_16_9" :        "119",
	"picture_energy_saving" :     "149",
	"picture_cinema_zoom" :       "175",
	"picture_3D" :                "220",
	"picture_factory_check" :     "252",
	// Audio controls
	"audio_volume_up" :           "2",
	"audio_volume_down" :         "3",
	"audio_mute" :                "9",
	"audio_language" :            "10",
	"audio_sound_mode" :          "82",
	"audio_factory_sound_check" : "253",
	"audio_subtitle_language" :   "57",
	"audio_audio_description" :   "145"
}; 

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
    logger.info("adapter lgtv  connected to ccu.io");
});

ccu_socket.on('disconnect', function () {
    logger.info("adapter lgtv  disconnected from ccu.io");
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
        if (id > devices[ip].DPs.STATE && id <= devices[ip].DPs.COMMAND_NUM) {
            dev = devices[ip];
            break;
        }
    }

    if (!dev)
        return;

    // We can control COMMAND and COMMAND_NUM
    var val = obj[1];
    var ts  = obj[2];
    var ack = obj[3];
	
    if (ack)
        return;

    logger.info ("adapter lgtv  try to control id " + id + " with " + val);

    if (val === "false") { val = false; }
    if (val === "true")  { val = true; }
    if (parseInt(val) == val) { val = parseInt(val); }
	
	var cmd = val;
	if (id == devices[ip].DPs.COMMAND) {
		cmd = commands[val];
	}
	if (cmd === undefined || cmd == null) {
		logger.warn ("adapter lgtv  unknown command: " + val);
		return;
	}
	
	if (dev.sessionKey) {
		handleCommand (dev, dev.sessionKey, cmd, function (dev_, result) {
            if (result && result.indexOf ("<HDCPError>401</HDCPError>") != -1){
                getSessionId (dev_, dev.pairKey, function (dev, sessionKey) {
                    if (sessionKey) {
                        dev.sessionKey = sessionKey;
                        handleCommand (dev, dev.sessionKey, cmd, function (dev_, result) {
                            console.log (result);
                        });
                    }
                    else {
                        logger.warn ("adapter lgtv  Cannot get sessionKey");
                    }
                });
            }
			console.log (result);
		});
	}
	else {
		getSessionId (dev, dev.pairKey, function (dev, sessionKey) {
			if (sessionKey) {
				dev.sessionKey = sessionKey;
				handleCommand (dev, dev.sessionKey, cmd, function (dev_, result) {
					console.log (result);
				});
			} 
			else {
				logger.warn ("adapter lgtv  Cannot get sessionKey");
			}
		});
	}

    
});

function stop() {
    logger.info("adapter lgtv  terminating");

    if (lgtvSettings.webserver.enabled) {
        sonosSocket.server.close();
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
        logger.verbose("adapter lgtv  setState "+id+" "+val);
        ccu_socket.emit("setState", [id,val,null,true]);
    }
}

function lgtvInit () {
    var dp;
    var chnDp;
    var devChannels = [];

    for (var id in lgtvSettings.devices) {
        var ip = lgtvSettings.devices[id].ip;
        var i = parseInt(id.substring(1));
        chnDp = lgtvSettings.firstId + i * 20;
        dp    = chnDp + 1;

        var ip_ = ip.replace(/\./g,"_");

        devChannels.push(chnDp);

        devices[ip] = {
            "sessionKey": null,
			"ip":         ip,
			"pairKey":    lgtvSettings.devices[id].pairKey,
            "DPs": {
                STATE:             dp+0,
                COMMAND:           dp+1,
                COMMAND_NUM:       dp+2
            }
        };

        var chObject = {
            Name:     (lgtvSettings.devices[id]['name']) ? lgtvSettings.devices[id]['name'] : ip,
            TypeName: "CHANNEL",
            Address:  "LG_TV."+ip_,
            HssType:  "LG_TV",
            DPs:      devices[ip].DPs,
            Parent:   lgtvSettings.firstId
        };

        if (lgtvSettings.devices[id].rooms) {
            chObject.rooms = lgtvSettings.devices[id].rooms;
        }
        if (lgtvSettings.devices[id].funcs) {
            chObject.funcs = lgtvSettings.devices[id].funcs;
        }
        if (lgtvSettings.devices[id].favs) {
            chObject.favs = lgtvSettings.devices[id].favs;
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
        setObject(devices[ip].DPs.COMMAND, {
            Name:         chObject.Address+".COMMAND",
            ValueType:    20,
            ValueSubType: 11,
            TypeName:     "HSSDP",
            Value:        "",
            Parent:       chnDp
        });
        setObject(devices[ip].DPs.COMMAND_NUM, {
            Name:         chObject.Address+".COMMAND_NUM",
            ValueType:    4,
            ValueSubType: 0,
            TypeName:     "HSSDP",
            Value:        0,
            Parent:       chnDp
        });

        i++;
    }

    setObject(lgtvSettings.firstId, {
        Name:      "LG_TV",
        TypeName:  "DEVICE",
        HssType:   "LG_TV_ROOT",
        Address:   "LG_TV",
        Interface: "CCU.IO",
        Channels:  devChannels
    });

    ccu_socket.on('news', function (data) {
        console.log(data);
        ccu_socket.emit('my other event', { my: 'data' });
    });
}
lgtvInit ();


