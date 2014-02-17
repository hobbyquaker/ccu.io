/**
 *      CCU.IO LG TV Adapter
 *      12'2013 Bluefox
 *      Lets control the LG TV over ethernet
 *
 *      Version 0.2
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
	postRequest (device, device.is2012 ? "/roap/api/auth" : "/hdcp/api/auth", "<?xml version=\"1.0\" encoding=\"utf-8\"?><auth><type>AuthKeyReq</type></auth>");
}

function getSessionId (device, paringKey, callb) {
	postRequest (device,
        device.is2012 ? "/roap/api/auth" : "/hdcp/api/auth",
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
        device.is2012 ? "/roap/api/command" : "/hdcp/api/dtv_wifirc",
		"<?xml version=\"1.0\" encoding=\"utf-8\"?><command><session>"+session+"</session>" +
            (device.is2012 ? "<name>HandleKeyInput</name>" : "<type>HandleKeyInput</type>")+"<value>"+cmd+"</value></command>",
		function (device_, result) {
			if (cb) {
				cb (device_, result);
			}
		}
	);
}

var commands = {
// Menus                           2011  2012
	"menu_status_bar":            ["35",  -1],
	"menu_quick_menu":            ["69",  -1],
	"menu_home_menu":             ["67",  "21"],
	"menu_premium_menu":          ["89",  -1],
	"menu_installation_menu":     ["207", -1],
	"menu_IN_START":              ["251", -1],
	"menu_EZ_ADJUST":             ["255", -1],
	"menu_power_only":            ["254", -1],
	"menu_my_apps":               [-1,   "417"],
	"menu_net_cast":              [-1,   "408"],
// Power controls                 
	"power_off" :                 ["8",   "1"],
	"power_sleep_timer":          ["14",  -1],
// Navigation                     
	"nav_left" :                  ["7",   "14"],
	"nav_right" :                 ["6",   "15"],
	"nav_up" :                    ["64",  "12"],
	"nav_down" :                  ["65",  "13"],
	"nav_select" :                ["68",  "20"],
	"nav_back" :                  ["40",  "23"],
	"nav_exit" :                  ["91",  "412"],
	"nav_blue" :                  ["97",  "31"],
	"nav_green" :                 ["113", "30"],
	"nav_red" :                   ["114", "32"],
	"nav_yellow" :                ["99",  "29"],
// keypad                         
	"keypad_0" :                  ["16",  "2"],
	"keypad_1" :                  ["17",  "3"],
	"keypad_2" :                  ["18",  "4"],
	"keypad_3" :                  ["19",  "5"],
	"keypad_4" :                  ["20",  "6"],
	"keypad_5" :                  ["21",  "7"],
	"keypad_6" :                  ["22",  "8"],
	"keypad_7" :                  ["23",  "9"],
	"keypad_8" :                  ["24",  "10"],
	"keypad_9" :                  ["25",  "11"],
	// Undescore                          
	"keypad__" :                  ["76",  -1],
	//Playback controls                   
	"playback_play" :             ["176", "33"],
	"playback_pause" :            ["186", "34"],
	"playback_fast_forward" :     ["142", "36"],
	"playback_rewind" :           ["143", "37"],
	"playback_stop" :             ["177", "35"],
	"playback_record" :           ["189", "40"],
// Input controls                         
	"input_tv_radio" :            ["15",  -1],
	"input_simplink" :            ["126", "411"],
	"input_input" :               ["11",  "47"],
	"input_component_rgb_hdmi" :  ["152", -1],
	"input_component" :           ["191", -1],
	"input_rgb" :                 ["213", -1],
	"input_hdmi" :                ["198", -1],
	"input_hdmi1" :               ["206", -1],
	"input_hdmi2" :               ["204", -1],
	"input_hdmi3" :               ["233", -1],
	"input_hdmi4" :               ["218", -1],
	"input_av1" :                 ["90",  -1],
	"input_av2" :                 ["208", -1],
	"input_av3" :                 ["209", -1],
	"input_usb" :                 ["124", -1],
	"input_slideshow_usb1" :      ["238", -1],
	"input_slideshow_usb2" :      ["168", -1],
// TV Controls                            
	"tv_channel_up" :             ["0",   "27"],
	"tv_channel_down" :           ["1",   "28"],
	"tv_channel_back" :           ["26",  "403"],
	"tv_favorites" :              ["30",  -1],
	"tv_teletext" :               ["32",  "51"],
	"tv_t_opt" :                  ["33",  -1],
	"tv_channel_list" :           ["83",  "50"],
	"tv_greyed_out_add_button" :  ["85",  -1],
	"tv_guide" :                  ["169", "44"],
	"tv_info" :                   ["170", "45"],
	"tv_live_tv" :                ["158", "43"],
  // Picture controls             
	"picture_av_mode" :           ["48",  "410"],
	"picture_mode" :              ["77",  -1],
	"picture_ratio" :             ["121", -1],
	"picture_ratio_4_3" :         ["118", -1],
	"picture_ratio_16_9" :        ["119", -1],
	"picture_energy_saving" :     ["149", "409"],
	"picture_cinema_zoom" :       ["175", -1],
	"picture_3D" :                ["220", "400"],
	"picture_factory_check" :     ["252", -1],
	// Audio controls                   
	"audio_volume_up" :           ["2",   "24"],
	"audio_volume_down" :         ["3",   "25"],
	"audio_mute" :                ["9",   "26"],
	"audio_language" :            ["10",  -1],
	"audio_sound_mode" :          ["82",  -1],
	"audio_factory_sound_check" : ["253", -1],
	"audio_subtitle_language" :   ["57",  -1],
	"audio_audio_description" :   ["145", "407"]
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
	if (id == dev.DPs.COMMAND) {
		cmd = commands[val][dev.is2012 ? 1 : 0];
	}
	if (cmd === undefined || cmd == null || cmd === -1) {
		logger.warn ("adapter lgtv  unknown command: " + val);
		return;
	}
	
	if (dev.sessionKey) {
		handleCommand (dev, dev.sessionKey, cmd, function (dev_, result) {
            if (result && (result.indexOf ("<HDCPError>401</HDCPError>") != -1 || result.indexOf ("<ROAPError>401</ROAPError>") != -1)){
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
			"is2012":     lgtvSettings.devices[id].is2012 ? true : false,
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


