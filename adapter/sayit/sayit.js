/**
 *      CCU.IO SayIt Adapter
 *      12'2013 Bluefox
 *
 *      Version 0.1
 *      
 *      It uses unofficial Google Translate TTS and it can be closed any time.
 *      
 *      Creates mp3 file in DashUI under /dashui/say.mp3 and set variable 72500 to 1 and after second to 0
 *      So DashUI can monitor 72500 object and play say.mp3
 *
 *      To make DashUI say some text, set 72501 with desired text.
 *      You can write "en;Text to say" to say it in specific language
 *
 */
var settings = require(__dirname+'/../../settings.js');

if (!settings.adapters.sayit || !settings.adapters.sayit.enabled) {
    process.exit();
}

var sayitSettings = settings.adapters.sayit.settings;
var sayIndex      = 0;

var logger      = require(__dirname+'/../../logger.js'),
    io          = require('socket.io-client'),
    fs          = require('fs'),
    http        = require('http'),
    request     = require('request'),
    querystring = require('querystring');


sayitSettings.language = sayitSettings.language || 'de';

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
socket.on('event', function (obj) {
    if (!obj || !obj[0]) {
        return;
    }
	
	if (obj[0] >= sayitSettings.firstId+1 && obj[0] <= sayitSettings.firstId+20 && obj[1]) {
		sayIt (obj[0], obj[1]);
	}
});

socket.on('connect', function () {
    logger.info("adapter ping  connected to ccu.io");
});

socket.on('disconnect', function () {
    logger.info("adapter ping  disconnected from ccu.io");
});

function stop() {
    logger.info("adapter ping  terminating");
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
    socket.emit("setObject", id, obj);
}

function setState(id, val) {
	logger.verbose("adapter sayit setState "+id+" "+val);
	socket.emit("setState", [id,val,null,true]);
}

function sayIt (objId, text, language) {
    logger.info("adapter sait  Saying: " + text);

    // Extract language from "en;Text to say"
    if (text && text.length > 3 && text[2] == ';') {
        language = text.substring (0,2);
        text = text.substring (3);
    }

    if (!objId || objId == sayitSettings.firstId+1 || objId == sayitSettings.firstId+2) {
        var options = {
            host: 'translate.google.com',
            //port: 80,
            path: '/translate_tts?q=' + querystring.escape(text) + '&tl='+(language || sayitSettings.language)
        };

        var request_ = http.get(options, function(res){
            var sounddata = ''
            res.setEncoding('binary')

            res.on('data', function(chunk){
                sounddata += chunk
            })

            res.on('end', function(){
                fs.exists(__dirname+"/../../www/dashui/"+sayIndex+".mp3", function(exists) {
                    if (exists) {
                        fs.unlink(__dirname+"/../../www/dashui/"+sayIndex+".mp3");
                    }

                    sayIndex++;

                    fs.writeFile(__dirname+"/../../www/dashui/"+sayIndex+".mp3", sounddata, 'binary', function(err){
                        if (err)
                            log.error ('File error:' + err);
                        else {
                            console.log('File saved.');
                            // Trigger
                            setState (sayitSettings.firstId, sayIndex);
                        }
                    })
                });
            })
        });
    }

    if (!objId || objId == sayitSettings.firstId+1 || objId == sayitSettings.firstId+3) {
        if (sayitSettings.mediaPlayer) {
            request ("http://"+sayitSettings.mediaPlayer+":50000/tts="+querystring.escape(text),
                function (error, response, body) {
                    if (!error && response.statusCode == 200) {
                        console.log(body) // Print the google web page.
                    }
                });
        }
    }
}
	
setObject(sayitSettings.firstId, {
    "Name": "SayIt.Trigger",
    "TypeName": "VARDP",
    "DPInfo": "SayIt",
    "ValueMin": 0,
    "ValueMax": 4294967295,
    "ValueUnit": "",
    "ValueType": 16,
    "ValueSubType": 0,
    "ValueList": ""
});

setObject(sayitSettings.firstId+1, {
    "Name": "SayIt.Text.AllDevices",
    "TypeName": "VARDP",
    "DPInfo": "SayIt",
    "ValueMin": null,
    "ValueMax": null,
    "ValueUnit": "",
    "ValueType": 16,
    "ValueSubType": 29,
    "ValueList": ""
});

setObject(sayitSettings.firstId+2, {
    "Name": "SayIt.Text.AllBrowsers",
    "TypeName": "VARDP",
    "DPInfo": "SayIt",
    "ValueMin": null,
    "ValueMax": null,
    "ValueUnit": "",
    "ValueType": 16,
    "ValueSubType": 29,
    "ValueList": ""
});

setObject(sayitSettings.firstId+3, {
    "Name": "SayIt.Text.AllMediaPlayers",
    "TypeName": "VARDP",
    "DPInfo": "SayIt",
    "ValueMin": null,
    "ValueMax": null,
    "ValueUnit": "",
    "ValueType": 16,
    "ValueSubType": 29,
    "ValueList": ""
});