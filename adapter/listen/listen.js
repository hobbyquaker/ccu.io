// Install first following components on system:
// apt-get install v4l-utils sox alsa-tools alsa-oss flac

// arecord -l (to list the possible record devices)
// http://linux.die.net/man/1/rec
// http://digitalcardboard.com/blog/2009/08/25/the-sox-of-silence/

var settings = require(__dirname+'/../../settings.js');

if (!settings.adapters.listen || !settings.adapters.listen.enabled) {
    process.exit();
}

var logger      = require(__dirname+'/../../logger.js'),
    io          = require('socket.io-client'),
	fs          = require('fs'),
    http        = require('http'),
    https       = require('https'),
    os          = require('os'),
    cp          = require('child_process');

var listenSettings = settings.adapters.listen.settings;

var objListening   = listenSettings.firstId;
var objError       = listenSettings.firstId + 1;
var objAutoListen  = listenSettings.firstId + 2;
var objAckBeep     = listenSettings.firstId + 3;

var fileCounter    = 0;

var isSaidDuringRecording = false;
var isAckBeep      = listenSettings.ackSoundID ? true : false;

listenSettings.language         = listenSettings.language         || 'de';
listenSettings.reclen           = (listenSettings.reclen !== undefined) ? listenSettings.reclen : 0;
listenSettings.qualityThreshold = listenSettings.qualityThreshold || 0.4;
listenSettings.processTextID    = listenSettings.processTextID    || 72960;
listenSettings.autoListen       = (listenSettings.autoListen !== undefined) ? listenSettings.autoListen : true;
listenSettings.ackSoundID       = listenSettings.ackSoundID       || 0;

var listenIt_langs = {
    "ru": {name: "Русский", param: "ru-RU", engine: "google"},
    "de": {name: "Deutsch", param: "de-DE", engine: "google"},
    "en": {name: "English", param: "en-GB", engine: "google"}
};

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

socket.on('connect', function () {
    logger.info("adaptr listen connected to ccu.io");
});

socket.on('disconnect', function () {
    logger.info("adaptr listen disconnected from ccu.io");
});

socket.on('event', function (obj) {
    if (!obj || !obj[0]) {
        return;
    }

    if (!listenSettings.autoListen && obj[0] == objListening && obj[1]) {
        listenRecord (listenGetTextGoogle);
    }
    else
    // Is some file playing
    if (obj[0] == 72904 && obj[1]) {
        // obj[1]
        isSaidDuringRecording = true;
    }
    else
    // Is some file playing
    if (obj[0] == objAckBeep && obj[1]) {
        isAckBeep = (obj[1] === "true" || obj[1] === true) ? true : false;
    }
});


function stop() {
    logger.info("adaptr listen terminating");
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
	logger.verbose("adaptr listen setState "+id+" "+val);
	socket.emit("setState", [id,val,null,true]);
}

function getState(id, callback) {
	logger.verbose("adaptr listen getState "+id);
	socket.emit("getDatapoint", [id], function (id, obj) {
		callback (id, obj);
	});
}

var afterRecognitionCallback = null;

function listenGetTextGoogle (file) {
    if (listenSettings.ackSoundID && isAckBeep) {
        setState (listenSettings.ackSoundID, "..\\adapter\\listen\\beep.wav");
    }

    var options = {
        host: 'www.google.com',
		method: 'POST',
        //port: 80,
        path: '/speech-api/v1/recognize?xjerr=1&client=chromium&lang=' + listenIt_langs[listenSettings.language].param
    };
	var post_data = fs.createReadStream(file);

	fs.stat(file, function (err, stats) {
		if (err) {
			logger.error ("adaptr listen Cannot find " + file + " :" + err);
			setState (objError, 'File error: ' + err);
			if (afterRecognitionCallback) {
				afterRecognitionCallback (null);
			}
			return;
		}
		
		options.headers = {
			"Content-Type"   : "audio/x-flac; rate=16000",
			'Content-Length' : stats.size
		};
	
		// Set up the request
		var post_req = https.request (options, function(res) {
			var xmldata = '';
			res.setEncoding('utf8'),

			res.on('data', function(chunk){
				xmldata += chunk;
			})
			res.on('end', function () {
				if (afterRecognitionCallback) {
					afterRecognitionCallback (xmldata, file);
				}
			});
			res.on('error', function (err) {
				logger.error ("adaptr listen Cannot call google " + file + " :" + err);
				setState (objError, 'Google connect error: ' + err);
				if (afterRecognitionCallback) {
					afterRecognitionCallback (null, file);
				}				
			});
		});

		// post the data
		post_data.on('data', function(data) {
			post_req.write(data);
		});
		post_data.on('end', function() {
			post_req.end();
		});
	});
}

function listenRecord (callback) {
    var p = os.platform();
    var ls = null;

    var cmdExec = '-r 16000 -c 1 temp.flac silence -l 1 0.1 3% ' + ((listenSettings.reclen) ? ('trim 0 ' + listenSettings.reclen) : '1 0.3 3%');

    if (p == 'linux') {
        //linux
        // ls = cp.exec('AUDIODRIVER=alsa AUDIODEV=hw:1,0 rec -r 16000 temp.flac silence 1 0.3 3% 1 0.3 3%', function (error, stdout, stderr) {
        // AUDIODRIVER=alsa AUDIODEV=hw:1,0 rec -r 16000 '+recIndex+'.flac silence 1 0.2 2% 1 0.3 1%
        cmdExec = 'AUDIODRIVER=alsa AUDIODEV=hw:1,0 rec ' + cmdExec;
    }
	else
    if (p.match(/^win/)) {
        //Windows
        cmdExec = __dirname + '\\win-sox\\sox -d ' + cmdExec;
    }
    else {
        cmdExec = null;
        logger.error ("adaptr listen Platform " + p + " is not supported by 'listen'");
        stop ();
    }

    if (cmdExec) {
        logger.debug ("adaptr listen Listening... ");
        //linux
        setState (objListening, true);
        isSaidDuringRecording = false;

        ls = cp.exec(cmdExec, function (error, stdout, stderr) {
            setState (objListening, false);
            if (isSaidDuringRecording) {
                console.log ("Ignore recording")
                listenRecord (listenGetTextGoogle);
                return;
            }

            logger.debug ('adaptr listen stdout: ' + stdout);
            logger.debug ('adaptr listen stderr: ' + stderr);
            if (error !== null && error.code) {
                logger.error ("adaptr listen cannot execute: '"+cmdExec+"'");
                logger.error (stderr);
                logger.error (error);
                setState (objError, 'exec error: ' + error);

                logger.error ("adaptr listen Stop execution of 'listen'");
                stop ();
            }
            else {
                fs.renameSync ("temp.flac", "command"+fileCounter+".flac");
                // Try to recognize this text
                if (callback) {
                    setTimeout (callback, 50, "command"+fileCounter+".flac");
                }
                fileCounter++;
                // Restart recording
                if (listenSettings.autoListen) {
                    //listenRecord (listenGetTextGoogle);
                }
            }
        });
    }
}

afterRecognitionCallback = function (xmlResult, file) {
	logger.debug ("adapter listen " + xmlResult);
    // Analyse JSON string from Google API
	try {
        var obj = null;

        // Somethimes it returns more than one response
        var xmlResults = xmlResult.split('\n');
        var isResponseFound = false;
        var sError = "No response found";

        for (var i = 0; i < xmlResults.length; i++) {
            if (xmlResults[i] && xmlResults[i] != "\n") {
                var obj = JSON.parse(xmlResults[i]);
                if (obj.hypotheses && obj.hypotheses.length > 0) {
                    logger.verbose ("Result ("+obj.hypotheses[0].confidence+"): " + obj.hypotheses[0].utterance);
                    if (obj.hypotheses[0].confidence >= listenSettings.qualityThreshold) {
                        setState (listenSettings.processTextID, obj.hypotheses[0].utterance);
                        setState (objError, 'no error');
                    }
                    else {
                        setState (objError, 'Recognition error, low quality ('+obj.hypotheses[0].confidence+'): ' + obj.hypotheses[0].utterance);
                    }
                    isResponseFound = true;
                }
                else {
                    sError = xmlResults[i];
                }
            }
        }
        if (!isResponseFound) {
            setState (objError, 'Recognition error: ' + sError);
        }
	}
	catch (e) {
	}

    // Rename this file to last command file for debug
    try {
        fs.renameSync (file, "lastCommand.flac");
    }catch (e){

    }

    // Restart recording
    if (listenSettings.autoListen) {
        listenRecord (listenGetTextGoogle);
    }
};

createObject(objListening, {
    "Name": "Listen.Listening",
    "TypeName": "VARDP",
    "DPInfo": "Listen",
    "ValueMin": null,
    "ValueMax": null,
    "ValueUnit": "",
    "ValueType": 4,
    "ValueSubType": 0,
    "ValueList": ""
});

createObject(objError, {
    "Name": "Listen.Error",
    "TypeName": "VARDP",
    "DPInfo": "Listen",
    "ValueMin": null,
    "ValueMax": null,
    "ValueUnit": "",
    "ValueType": 20,
    "ValueSubType": 11,
    "ValueList": ""
});

createObject(objAutoListen, {
    "Name": "Listen.AutoListen",
    "TypeName": "VARDP",
    "DPInfo": "Listen",
    "ValueMin": null,
    "ValueMax": null,
    "ValueUnit": "",
    "ValueType": 4,
    "ValueSubType": 0,
    "ValueList": ""
});
createObject(objAckBeep, {
    "Name": "Listen.ProcessingBeep",
    "TypeName": "VARDP",
    "DPInfo": "Listen",
    "ValueMin": null,
    "ValueMax": null,
    "ValueUnit": "",
    "ValueType": 4,
    "ValueSubType": 0,
    "ValueList": ""
});

// Initiate recording
if (listenSettings.autoListen) {
	listenRecord (listenGetTextGoogle);
}
else {
    setState (objListening, false);
}
setState (objAutoListen, listenSettings.autoListen);
setState (objAckBeep,    isAckBeep);

// How to install CMU sphinxs
// Copy and extract: http://sourceforge.net/projects/cmusphinx/files/sphinxbase/0.8
// Copy and extract: http://sourceforge.net/projects/cmusphinx/files/pocketsphinx/0.8
// apt-get install bison
// apt-get install libasound2-dev
// Change to the sphinxbase directory and type the following commands:
//    ./configure --enable-fixed
//  make
//  make install
// Now, change to the pocketsphinx directory and type the following commands:
//    ./configure
// make
// make install
// sudo apt-get install gstreamer0.10-pulseaudio libao4 libasound2-plugins libgconfmm-2.6-1c2 libglademm-2.4-1c2a libpulse-dev libpulse-mainloop-glib0 libpulse-mainloop-glib0-dbg libpulse0 libpulse0-dbg libsox-fmt-pulse paman paprefs pavucontrol pavumeter pulseaudio pulseaudio-dbg pulseaudio-esound-compat pulseaudio-esound-compat-dbg pulseaudio-module-bluetooth pulseaudio-module-gconf pulseaudio-module-jack pulseaudio-module-lirc pulseaudio-module-lirc-dbg pulseaudio-module-x11 pulseaudio-module-zeroconf pulseaudio-module-zeroconf-dbg pulseaudio-utils oss-compat -y

// https://sites.google.com/site/observing/Home/speech-recognition-with-the-raspberry-pi


