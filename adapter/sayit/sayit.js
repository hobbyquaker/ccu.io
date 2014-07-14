/**
 *      CCU.IO SayIt Adapter
 *      12'2013-2014 Bluefox
 *
 *      Version 0.5
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
var settings = require(__dirname + '/../../settings.js');

if (!settings.adapters.sayit || !settings.adapters.sayit.enabled) {
    process.exit();
}

var sayitSettings        = settings.adapters.sayit.settings;
var sayIndex             = 0;
var sayLastGeneratedText = "";
var sayLastVolume        = null;

var logger      = require(__dirname + '/../../logger.js'),
    io          = require('socket.io-client'),
    fs          = require('fs'),
    http        = require('http'),
    https       = require('https'),
    request     = require('request'),
    ftp         = require('jsftp'),
    querystring = require('querystring'),
    cp          = require('child_process'),
    crypto      = require('crypto'),
    os          = require('os');


sayitSettings.language     = sayitSettings.language || 'de';
sayitSettings.start_volume = (sayitSettings.start_volume === undefined) ? 100: sayitSettings.start_volume;
sayitSettings.cache_enabled    = sayitSettings.cache_enabled || false;
var cacheDir = __dirname+"/../../" + (sayitSettings.cache_path || "tmp") + "/";

var objTrigger  = sayitSettings.firstId;
var objFileName = sayitSettings.firstId + 1;
var objVolume   = sayitSettings.firstId + 2;
var objPlayAll  = sayitSettings.firstId + 3;
var objPlaying  = sayitSettings.firstId + 4;

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
	
	if (obj[0] == objPlayAll || (obj[0] > objPlaying && obj[0] <= (sayitSettings.firstId + 21) && obj[1])) {
		sayIt (obj[0], obj[1]);
		// Clear value
		setTimeout (function (id) { setState (id, "")}, 50, obj[0]);
	} else
    // Volume on Raspbery PI
    if (obj[0] == objVolume) {
        sayItSystemVolume (obj[1]);
    }
});

socket.on('connect', function () {
    logger.info("adapter sayIt connected to ccu.io");
    logger.info("adapter sayIt settings (cache: " + sayitSettings.cache_enabled + ", path: " + cacheDir + ")");
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

function copyFile(i_, text, language, volume, source, dest, callback) {
    var input = fs.createReadStream(source);                // Input stream
    var output = fs.createWriteStream(dest);                // Output stream
    
    input.on("data", function(d) { output.write(d); });     // Copy in to out
    input.on("error", function(err) { throw err; });        // Raise errors
    input.on("end", function() {                            // When input ends
        output.end();                                       // close output
        logger.info("adapter sayIt copied file '" + source + "' to '" + dest + "'");
        if (callback) {                                     // And notify callback            
            callback (i_, text, language, volume);
        }                     
    });
}

function sayItGetSpeechGoogle (i_, text, language, volume, callback) {
    if (text.length == 0) {
        return;
    }
    language = language || sayitSettings.language;

    var md5filename = cacheDir + crypto.createHash('md5').update(language + ";" + text).digest('hex') + ".mp3";

    fs.exists(md5filename, function(exists) {
        if (exists) {
            copyFile(i_, text, language, volume, md5filename, __dirname+"/../../www/say.mp3", callback)
        } else {
            //logger.info("adapter sayIt cache file '" + md5filename + "' does not exist, fetching new file ...");
    var options = {
        host: 'translate.google.com',
        //port: 80,
        path: '/translate_tts?q=' + querystring.escape(text) + '&tl=' + language
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
                            if (sayitSettings.cache_enabled) {
                                copyFile (i_, text, language, volume, __dirname+"/../../www/say.mp3", md5filename);
                            }
                    if (callback) {
                        callback (i_, text, language, volume);
                    }
                }
            });
        })
    });
        }
    });
}

function sayItGetSpeechAcapela (i_, text, language, volume, callback) {
    var options = {
        host: 'vaassl3.acapela-group.com',
        path: '/Services/Synthesizer?prot_vers=2&req_voice='+language+'22k&cl_env=FLASH_AS_3.0&req_text=%5Cvct%3D100%5C+%5Cspd%3D180%5C+' +
            querystring.escape(text) + '&req_asw_type=STREAM&cl_vers=1-30&req_err_as_id3=yes&cl_login=ACAPELA_BOX&cl_app=PROD&cl_pwd=0g7znor2aa'
    };

    https.get(options, function(res){
        var sounddata = ''
        res.setEncoding('binary')

        res.on('data', function(chunk){
            sounddata += chunk
        })

        res.on('end', function(){
            fs.writeFile(__dirname+"/../../www/say.mp3", sounddata, 'binary', function(err){
                if (err) {
                    logger.error ('File error:' + err);
				}
                else {
                    console.log('File saved.');
                    if (callback) {
                        callback (i_, text, language, volume);
                    }
                }
            });
        })
    });
}

function sayItGetSpeech (i_, text, language, volume, callback) {
    if (sayit_engines[language] && sayit_engines[language].engine) {
        if (sayit_engines[language].engine == "google") {
            sayItGetSpeechGoogle (i_, text, language, volume, callback);
        }
        else
        if (sayit_engines[language].engine == "acapela") {
            sayItGetSpeechAcapela (i_, text, language, volume, callback);
        }
    }
    else {
        sayItGetSpeechGoogle (i_, text, language, volume, callback);
    }
}

function sayItBrowser (i_, text, language, volume) {
	sayIndex++;
    if (sayItIsPlayFile (text)) {
        setState (objFileName, text);
    }
    else {
        setState (objFileName, "say.mp3");
    }

	setState (objTrigger, sayIndex);
}

function sayItMP24 (i_, text, language, volume) {
    var mediaPlayer = sayitSettings.vars[i_].mediaPlayer || sayitSettings.mediaPlayer;
	if (mediaPlayer && !sayItIsPlayFile (text)) {
		request ("http://"+mediaPlayer+":50000/tts="+querystring.escape(text),
			function (error, response, body) {
				if (!error && response.statusCode == 200) {
					console.log(body) // Print the google web page.
				}
			});
	}		
}

function sayItMP24ftp (i_, text, language, volume) {
    var ftp_port    = sayitSettings.vars[i_].ftp_port    || sayitSettings.ftp_port;
    var mediaPlayer = sayitSettings.vars[i_].mediaPlayer || sayitSettings.mediaPlayer;

	// Copy mp3 file to android device to play it later with MediaPlayer
	if (ftp_port && mediaPlayer) {

        var file = sayItGetFileName (text);

		var Ftp = new ftp({
			host: mediaPlayer,
			port: parseInt(ftp_port), // defaults to 21
			user: sayitSettings.vars[i_].ftp_user || sayitSettings.ftp_user || "anonymous", // defaults to "anonymous"
			pass: sayitSettings.vars[i_].ftp_pass || sayitSettings.ftp_pass || "@anonymous" // defaults to "@anonymous"
		});

		Ftp.put (file, 'say.mp3', function(hadError) {
			if (!hadError) {
				request ("http://"+mediaPlayer+":50000/track=say.mp3",
					function (error, response, body) {
						if (!error && response.statusCode == 200) {
							logger.error(body) // Print the google web page.
						}
					});
			} else {
				logger.error ('FTP error:' + hasError);
			}
			Ftp.raw.quit(function(err, data) {
				if (err) logger.error(err);

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

function sayItSystem (i_, text, language, volume) {
    var p = os.platform();
    var ls = null;
    var file = sayItGetFileName (text);
    setState (objPlaying, true);

    if (volume !== null && volume !== undefined) {
        sayItSystemVolume (volume);
    }

    if (p == 'linux') {
        //linux
        ls = cp.exec('mpg321 ' + file, function (error, stdout, stderr) {
            setState (objPlaying, false);
        });
    } else if (p.match(/^win/)) {
        //windows
        ls = cp.exec (__dirname + '/cmdmp3/cmdmp3.exe ' + file, function (error, stdout, stderr) {
            setState (objPlaying, false);
        });
    } else if (p == 'darwin') {
        //mac osx
        ls = cp.exec('/usr/bin/afplay '+ file, function (error, stdout, stderr) {
            setState (objPlaying, false);
        });
    }

    if (ls) {
        ls.on('error', function(e) {
            throw new Error('sayIt.play: there was an error while playing the mp3 file:' + e);
        });
    }
}

function sayItWindows (i_, text, language, volume) {
	// If mp3 file
	if (sayItIsPlayFile (text)) {
		sayItSystem (i_, text, language, volume);
		return;
	}
	
    var p = os.platform();
    var ls = null;
    var file = sayItGetFileName (text);
    setState (objPlaying, true);

    if (volume !== null && volume !== undefined) {
        sayItSystemVolume (volume);
    }

    if (p.match(/^win/)) {
        //windows
        ls = cp.exec (__dirname + '/Say/SayStatic.exe ' + text, function (error, stdout, stderr) {
            setState (objPlaying, false);
        });
    }
    else {
    	logger.error ('sayItWindows: only windows OS is supported for Windows default mode');
    }

    if (ls) {
        ls.on('error', function(e) {
            throw new Error('sayIt.play: there was an error while text2speech on window:' + e);
        });
    }
}

function sayItSystemVolume (level) {
	level = parseInt (level);
	if (level < 0)   level = 0;
	if (level > 100) level = 100;	

    if (level === sayLastVolume) {
		return;
	}

    setState(objVolume, level);
	
	sayLastVolume = level;
	
	var p = os.platform();
    var ls = null;
	
    if (p == 'linux') {
        //linux
        ls = cp.spawn('amixer', ["cset", "numid=1", "--", level+"%"]);
    } else if (p.match(/^win/)) {
        //windows
		// windows volume is from 0 to 65535
		level = Math.round((65535 * level) / 100); // because this level is from 0 to 100
        ls = cp.spawn (__dirname + '/nircmd/nircmdc.exe', ["setsysvolume", level]);
    } else if (p == 'darwin') {
        //mac osx
        ls = cp.spawn('sudo', ['osascript', '-e', '"set Volume ' + Math.round(level / 10) + '"']);
    }

    if (ls) {
        ls.on('error', function(e) {
            throw new Error('sayIt.play: there was an error while playing the mp3 file:' + e);
        });
    }
}

function sayItExecute (i_, text, language, volume) {
	var options     = sayitSettings.vars[i_].options.split(',');
    var ftp_port    = sayitSettings.vars[i_].ftp_port    || sayitSettings.ftp_port;
    var mediaPlayer = sayitSettings.vars[i_].mediaPlayer || sayitSettings.mediaPlayer;

	if (options[0] == "all") {

		for (var opt in sayit_options) {
            // Skip mp24 if FTP option is enabled and configured
            if (opt == "mp24" && ftp_port && mediaPlayer) {
                continue;
            }
			sayit_options[opt].func (i_, text, language, volume);
		}
	}
	else {
		for (var q = 0; q < options.length; q++) {
			if (sayit_options[options[q]]) {

                // Skip mp24 if FTP option is enabled and configured
                if (opt == "mp24" &&
                    sayitSettings.vars[i_].options.indexOf ("mp24ftp") != -1 &&
                    ftp_port && mediaPlayer) {
                        continue;
                }
				sayit_options[options[q]].func (i_, text, language, volume);
			}
		}
	}
}

function sayIt (objId, text, language) {
	var volume    = null;
    var oldVolume = null;

    if (text.length == 0) {
        return;
    }
    
    logger.info("adapter sayIt saying: " + text);

    // Extract language from "en;Text to say"
    if (text.indexOf (";") != -1) {
        var arr = text.split(';',3);
		// If language;text or volume;text
		if (arr.length == 2) {
			// If number
			if (parseInt(arr[0]) == arr[0]) {
				volume = arr[0];
			}
			else {
				language = arr[0];
			}
			text = arr[1];
		}
		// If language;volume;text or volume;language;text
		else if (arr.length == 3) {
			// If number
			if (parseInt(arr[0]) == arr[0]) {
				volume   = arr[0];
				language = arr[1];
			}
			else {
				volume   = arr[1];
				language = arr[0];
			}
			text = arr[2];
		}
    }

	var i = null;
    // If say on all possible variables
    if (objId == objPlayAll) {
        for (var t in sayitSettings.vars) {
            sayIt (sayitSettings.vars[t].id, text, language);
        }
        return;
    }

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
		if (isGenerate && sayLastGeneratedText != "["+language+"]"+text) {
            sayLastGeneratedText = "["+language+"]"+text;
			sayItGetSpeech (i, text, language, volume, sayItExecute);
		}
		else {
			sayItExecute (i, text, language, volume);
		}
	}
}

var sayit_options = {
	"browser": {name: "Browser",           mp3Required: true,  func: sayItBrowser},
    "mp24ftp": {name: "MediaPlayer24+FTP", mp3Required: true,  func: sayItMP24ftp},
	"mp24"   : {name: "MediaPlayer24",     mp3Required: false, func: sayItMP24},
	"system" : {name: "System",            mp3Required: true,  func: sayItSystem},
	"windows": {name: "Windows default",   mp3Required: false, func: sayItWindows}
};

var sayit_engines = {
    "en":     {name: "Google - English",         engine: "google"},
    "de":     {name: "Google - Deutsch",         engine: "google"},
    "ru":     {name: "Google - Русский",         engine: "google"},
    "it":     {name: "Google - Italiano",        engine: "google"},
    "es":     {name: "Google - Espaniol",        engine: "google"},
    "alyona": {name: "Acapela - Russian Алёна",  engine: "acapela"}
};

createObject(objTrigger, {
    "Name": "SayIt.Trigger",
    "TypeName": "VARDP",
    "DPInfo": "SayIt",
    "ValueMin": 0,
    "ValueMax": 4294967295,
    "ValueUnit": "",
    "ValueType": 4,
    "ValueSubType": 0,
    "ValueList": ""
});

createObject(objFileName, {
    "Name": "SayIt.FileName",
    "TypeName": "VARDP",
    "DPInfo": "SayIt",
    "ValueMin": null,
    "ValueMax": null,
    "ValueUnit": "",
    "ValueType": 20,
    "ValueSubType": 11,
    "ValueList": ""
});
createObject(objVolume, {
    "Name": "SayIt.VOLUME",
    "TypeName": "VARDP",
    "DPInfo": "SayIt",
    "ValueMin": null,
    "ValueMax": null,
    "ValueUnit": "",
    "ValueType": 4,
    "ValueSubType": 0,
    "ValueList": ""
});

createObject(objPlaying, {
    "Name": "SayIt.Playing",
    "TypeName": "VARDP",
    "DPInfo": "SayIt",
    "ValueMin": null,
    "ValueMax": null,
    "ValueUnit": "",
    "ValueType": 4,
    "ValueSubType": 0,
    "ValueList": ""
});

createObject(objPlayAll, {
    "Name": "SayIt.ALL",
    "TypeName": "VARDP",
    "DPInfo": "SayIt",
    "ValueMin": null,
    "ValueMax": null,
    "ValueUnit": "",
    "ValueType": 20,
    "ValueSubType": 11,
    "ValueList": ""
});

var isMixerInitialized = false;
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
    // Set valid output for raspberry PI. If you have other hardware under linux, just leave this value on "Auto"
    if (!isMixerInitialized &&
        (sayitSettings.vars[id].options == "all" || sayitSettings.vars[id].options.indexOf("system") != -1)) {
        isMixerInitialized = true;
        var p = os.platform();
        var ls = null;

        if (p == 'linux' && sayitSettings.rasp_output && sayitSettings.rasp_output != "0") {
            //linux
            ls = cp.spawn('amixer', ["cset", "numid=3", sayitSettings.rasp_output]);
        }
    }
}

// Init volume
sayItSystemVolume(sayitSettings.start_volume);
