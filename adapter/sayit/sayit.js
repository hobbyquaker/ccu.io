/**
 *      CCU.IO SayIt Adapter
 *      12'2013 Bluefox
 *
 *      Version 0.2
 *      
 *      It uses unofficial Google Translate TTS and it can be closed any time.
 *      
 *      Creates mp3 file in DashUI under /dashui/say.mp3 and set variable 72900 to 1 and after second to 0
 *      So DashUI can monitor 72900 object and play say.mp3
 *
 *      To make DashUI say some text, set 72901 with desired text.
 *      You can write "en;Text to say" to say it in specific language
 *
 *      To enable mp3 sound on raspberry execute: "sudo apt-get -y install mpg321"
 *      and "amixer cset numid=3 1" for analog output (replace 1 with: 0=auto, 1=analog, 2=hdmi)
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
    https       = require('https'),
    request     = require('request'),
    ftp         = require('jsftp'),
    querystring = require('querystring'),
    cp          = require('child_process'),
    os          = require('os');


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
    logger.info("adapter sayIt connected to ccu.io");
});

socket.on('disconnect', function () {
    logger.info("adapter sayIt disconnected from ccu.io");
});

function stop() {
    logger.info("adapter sayIt terminating");
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

function createObject(id, obj) {
    socket.emit("setObject", id, obj);
}

function setState(id, val) {
	logger.verbose("adapter sayit setState "+id+" "+val);
	socket.emit("setState", [id,val,null,true]);
}

function sayItGetSpeechGoogle (i_, text, language, callback) {
    var options = {
        host: 'translate.google.com',
        //port: 80,
        path: '/translate_tts?q=' + querystring.escape(text) + '&tl='+(language || sayitSettings.language)
    };

    if (language == "ru") {
        options.headers = {
            "User-Agent"     : "Mozilla/5.0 (Windows NT 6.1; WOW64; rv:25.0) Gecko/20100101 Firefox/25.0",
            "Accept"         : "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
            "Accept-Language": "ru-RU,ru;q=0.8,en-US;q=0.5,en;q=0.3",
            "Accept-Encoding": "gzip, deflate"
        };
    }

    http.get(options, function(res){
        var sounddata = ''
        res.setEncoding('binary')

        res.on('data', function(chunk){
            sounddata += chunk
        })

        res.on('end', function(){
            fs.writeFile(__dirname+"/../../www/say.mp3", sounddata, 'binary', function(err){
                if (err)
                    logger.error ('File error:' + err);
                else {
                    console.log('File saved.');
                    if (callback) {
                        callback (i_, text, language);
                    }
                }
            });
        })
    });
}
function sayItGetSpeechAcapela (i_, text, language, callback) {
    var options = {
        host: 'vaassl3.acapela-group.com',
        //port: 443,
        path: '/Services/Synthesizer?prot_vers=2&req_voice='+language+'22k&cl_env=FLASH_AS_3.0&req_text=%5Cvct%3D100%5C+%5Cspd%3D180%5C+' +
            querystring.escape(text) + '&req_asw_type=STREAM&cl_vers=1-30&req_err_as_id3=yes&cl_login=ACAPELA_BOX&cl_app=PROD&cl_pwd=0g7znor2aa'
    };

    //if (language == "ru") {
    //    options.headers = {
    //        "User-Agent"     : "Mozilla/5.0 (Windows NT 6.1; WOW64; rv:25.0) Gecko/20100101 Firefox/25.0",
    //        "Accept"         : "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    //        "Accept-Language": "ru-RU,ru;q=0.8,en-US;q=0.5,en;q=0.3",
    //        "Accept-Encoding": "gzip, deflate"
    //    };
    //}

    https.get(options, function(res){
        var sounddata = ''
        res.setEncoding('binary')

        res.on('data', function(chunk){
            sounddata += chunk
        })

        res.on('end', function(){
            fs.writeFile(__dirname+"/../../www/say.mp3", sounddata, 'binary', function(err){
                if (err)
                    logger.error ('File error:' + err);
                else {
                    console.log('File saved.');
                    if (callback) {
                        callback (i_, text, language);
                    }
                }
            });
        })
    });
}


function sayItGetSpeech (i_, text, language, callback) {
    if (sayit_engines[language] && sayit_engines[language].engine) {
        if (sayit_engines[language].engine == "google") {
            sayItGetSpeechGoogle (i_, text, language, callback);
        }
        else
        if (sayit_engines[language].engine == "acapela") {
            sayItGetSpeechAcapela (i_, text, language, callback);
        }
    }
    else {
        sayItGetSpeechGoogle (i_, text, language, callback);
    }
}

function sayItBrowser (text, language) {
	sayIndex++;
    if (sayItIsPlayFile (text)) {
        setState (sayitSettings.firstId + 1, text);
    }
    else {
        setState (sayitSettings.firstId + 1, "say.mp3");
    }

	setState (sayitSettings.firstId, sayIndex);
}

function sayItMP24 (text, language) {
	if (sayitSettings.mediaPlayer && !sayItIsPlayFile (text)) {
		request ("http://"+sayitSettings.mediaPlayer+":50000/tts="+querystring.escape(text),
			function (error, response, body) {
				if (!error && response.statusCode == 200) {
					console.log(body) // Print the google web page.
				}
			});
	}		
}

function sayItMP24ftp (text, language) {
	// Copy mp3 file to android device to play it later with MediaPlayer
	if (sayitSettings.ftp_port && sayitSettings.mediaPlayer) {

        var file = sayItGetFileName (text);

		var Ftp = new ftp({
			host: sayitSettings.mediaPlayer,
			port: parseInt(sayitSettings.ftp_port), // defaults to 21
			user: sayitSettings.ftp_user || "anonymous", // defaults to "anonymous"
			pass: sayitSettings.ftp_pass || "@anonymous" // defaults to "@anonymous"
		});

		Ftp.put (file, 'say.mp3', function(hadError) {
			if (!hadError) {
				console.log("File transferred successfully!");
				request ("http://"+sayitSettings.mediaPlayer+":50000/track=say.mp3",
					function (error, response, body) {
						if (!error && response.statusCode == 200) {
							console.log(body) // Print the google web page.
						}
					});
			} else {
				logger.error ('FTP error:' + hasError);
			}
			Ftp.raw.quit(function(err, data) {
				if (err) return console.error(err);

				Ftp.destroy();
			});
		});
	}
}
function sayItIsPlayFile (text) {
    if (text.length > 4) {
        var ext = text.substring (text.length - 4);
        if (ext == ".mp3" || ext == ".wav") {
            return true;
        }
    }
    return false;
}

// If text is gong.mp3 or bong.wav
function sayItGetFileName (text) {
    if (sayItIsPlayFile (text)) {
        return __dirname+"/../../www/" + text;
    }
    return __dirname+"/../../www/say.mp3";
}

function sayItSystem (text, language) {
    var p = os.platform();
    var ls = null;
    var outstring = "";
    var file = sayItGetFileName (text);

    if (p == 'linux') {
        //linux
        ls = cp.spawn('mpg321', [file]);
    } else if (p.match(/^win/)) {
        //windows
        var ls = cp.spawn (__dirname + '/cmdmp3/cmdmp3.exe', [file]);
    } else if (p == 'darwin') {
        //mac osx
        //var ls = cp.spawn('/sbin/ping', ['-n', '-t 2', '-c 1', addr]);
    }

    ls.on('error', function(e) {
        throw new Error('sayIt.play: there was an error while playing the mp3 file:' + e);
    });
}

function sayItExecute (i_, text, language) {
	var options = sayitSettings.vars[i_].options.split(',');
	var isGenerate = false;
	if (options[0] == "all") {
		for (var opt in sayit_options) {
			sayit_options[opt].func (text, language);
		}
	}
	else {
		for (var q = 0; q < options.length; q++) {
			if (sayit_options[options[q]]) {
				sayit_options[options[q]].func (text, language);
			}
		}
	}
}

function sayIt (objId, text, language) {
    logger.info("adapter sayIt saying: " + text);

    // Extract language from "en;Text to say"
    if (text.indexOf (";") != -1) {
        language = text.split(';',2);
        text = language[1];
		language = language[0];
    }

	var i = null;
	for (var t in sayitSettings.vars) {
		if (sayitSettings.vars[t].id == objId) {
			i = t;
			break;
		}
	}
	
	if (i) {
		var options = sayitSettings.vars[i].options.split(',');
		var isGenerate = false;
        if (!sayItIsPlayFile (text)) {
            // find out if say.mp3 must be generated
            if (options[0] == "all") {
                for (var opt in sayit_options) {
                    if (sayit_options[opt].mp3Required) {
                        isGenerate = true;
                        break;
                    }
                }
            }
            else {
                for (var q = 0; q < options.length; q++) {
                    if (sayit_options[options[q]] && sayit_options[options[q]].mp3Required) {
                        isGenerate = true;
                        break;
                    }
                }
            }
        }
		if (isGenerate) {
			sayItGetSpeech (i, text, language, sayItExecute);
		}
		else {
			sayItExecute (i, text, language);
		}
	}
}

var sayit_options = {
	"browser": {name: "Browser",           mp3Required: true,  func: sayItBrowser},
	"mp24"   : {name: "MediaPlayer24",     mp3Required: false, func: sayItMP24},
	"mp24ftp": {name: "MediaPlayer24+FTP", mp3Required: true,  func: sayItMP24ftp},
	"system" : {name: "System",            mp3Required: true,  func: sayItSystem}
};

var sayit_engines = {
    "en":     {name: "Google - English",         engine: "google"},
    "de":     {name: "Google - Deutsch",         engine: "google"},
    "ru":     {name: "Google - Русский",         engine: "google"},
    "it":     {name: "Google - Italiano",        engine: "google"},
    "es":     {name: "Google - Espaniol",        engine: "google"},
    "alyona": {name: "Acapela - Russian Алёна",  engine: "acapela"}
};

createObject(sayitSettings.firstId, {
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

createObject(sayitSettings.firstId + 1, {
    "Name": "SayIt.FileName",
    "TypeName": "VARDP",
    "DPInfo": "SayIt",
    "ValueMin": null,
    "ValueMax": null,
    "ValueUnit": "",
    "ValueType": 16,
    "ValueSubType": 29,
    "ValueList": ""
});
for (var id in sayitSettings.vars) {
    createObject(sayitSettings.vars[id].id, {
		"Name": "SayIt."+sayitSettings.vars[id].name,
		"TypeName": "VARDP",
		"DPInfo": "SayIt",
		"ValueMin": null,
		"ValueMax": null,
		"ValueUnit": "",
		"ValueType": 16,
		"ValueSubType": 29,
		"ValueList": ""
	});	
}