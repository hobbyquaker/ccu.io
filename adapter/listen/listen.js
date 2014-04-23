/**
 *      CCU.IO Listen Adapter
 *      12'2013-2014 Bluefox
 *
 *      Version 0.1
 *
 *      This adapter is continually listens for voice activity and sends it to Google API.
 *      It creates following variables in CCU.IO:
 *      1. 72950 - listening indication. If no autoListen enabled, write true into this variable to start recording
 *      2. 72951 - error text. Is something goes wrong, here will be the error text.
 *      3. 72952 - auto listen value. Indication of the auto listen mode. Can be controlled in runtime. Value will not be stored in the settings.
 *      4. 72953 - processing beep. Indication if the beep by voice processing is enabled. Can be controlled in runtime but will not be stored permanently.
 *
 *      After the voice is recognised the text will be written into the text processor variable, e.g. textCommands adapter 72970.
 *      If the auto listen mode is enabled the recording starts immediately after the text was processed.
 *
 *  Install first following components on system:
 *  apt-get install v4l-utils sox alsa-tools alsa-oss flac
 *
 *  You can list the installed interfaces with: arecord -l
 *  Find additional information under http://linux.die.net/man/1/rec or
 *  http://digitalcardboard.com/blog/2009/08/25/the-sox-of-silence/
 *
 * Copyright (c) 2013-2014 Bluefox dogafox@gmail.com
 *
 * It is licensed under the Creative Commons Attribution-Non Commercial-Share Alike 3.0 license.
 * The full text of the license you can get at http://creativecommons.org/licenses/by-nc-sa/3.0/legalcode
 *
 * Short content:
 * Licensees may copy, distribute, display and perform the work and make derivative works based on it only if they give the author or licensor the credits in the manner specified by these.
 * Licensees may distribute derivative works only under a license identical to the license that governs the original work.
 * Licensees may copy, distribute, display, and perform the work and make derivative works based on it only for noncommercial purposes.
 * (Free for non-commercial use).
 */

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

var objListening          = listenSettings.firstId;
var objError              = listenSettings.firstId + 1;
var objAutoListen         = listenSettings.firstId + 2;
var objProcessBeep        = listenSettings.firstId + 3;
var objKeywords           = listenSettings.firstId + 4;
var objKeywordBeep        = listenSettings.firstId + 5;
var objWaitForCmd         = listenSettings.firstId + 6;
var objProcessIndication  = listenSettings.firstId + 7;
var objLastRecognition    = listenSettings.firstId + 8;
var objDetectedKeyword    = listenSettings.firstId + 9;

listenSettings.language         = listenSettings.language         || 'de';
listenSettings.reclen           = (listenSettings.reclen !== undefined) ? listenSettings.reclen : 0;
listenSettings.qualityThreshold = listenSettings.qualityThreshold || 0.4;
listenSettings.processTextID    = listenSettings.processTextID    || 72960;
listenSettings.autoListen       = (listenSettings.autoListen !== undefined) ? listenSettings.autoListen : true;
listenSettings.processBeep      = listenSettings.processBeep      || "";
listenSettings.sayItID          = listenSettings.sayItID          || 0;
listenSettings.recHardware      = listenSettings.recHardware      || "hw:1,0";
listenSettings.startThreshold   = listenSettings.startThreshold   || "0.1 3%";
listenSettings.stopThreshold    = listenSettings.stopThreshold    || "0.4 2%";

listenSettings.keywords         = (listenSettings.keywords !== undefined && listenSettings.keywords !== null) ? listenSettings.keywords : 'system';
listenSettings.keywordBeep      = listenSettings.keywordBeep || "";
listenSettings.keywordFailBeep  = listenSettings.keywordFailBeep || "";
listenSettings.keywordTimeout   = (listenSettings.keywordTimeout || 6000);
listenSettings.debug            = (listenSettings.debug || false);

var fileCounter     = 0;
var waitForCommand  = false;
var timerKeyword    = null;
var isSaidDuringRecording = false;
var isOwnPlaying    = false;
var currentLanguage = listenSettings.language;

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
        if (!isOwnPlaying) {
            isSaidDuringRecording = true;
        }
        else {
            isOwnPlaying = false;
        }
    }
    else
    if (obj[0] == objProcessBeep && obj[1] !== undefined) {
        listenSettings.processBeep = obj[1];
    }
    else
    if (obj[0] == objKeywords && obj[1] !== undefined) {
        listenSettings.keywords = obj[1];
    }
    else
    if (obj[0] == objKeywordBeep && obj[1] !== undefined) {
        listenSettings.keywordBeep = obj[1];
    }
    else
    if (obj[0] == objAutoListen && obj[1] !== undefined) {
        if (listenSettings.autoListen != !!obj[1]) {
            listenSettings.autoListen = !!obj[1];
            if (listenSettings.autoListen) {
                listenRecord (listenGetTextGoogle);
            }
        }
    }});


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
    if (listenSettings.sayItID && listenSettings.processBeep) {
        isOwnPlaying = true;
        setState (listenSettings.sayItID, listenSettings.processBeep);
    }

    setState (objProcessIndication,  true);
    setTimeout (function () {
        setState (objProcessIndication,  false);
    },1000);

    var options = {
        host: 'www.google.com',
		method: 'POST',
        //port: 80,
        path: '/speech-api/v1/recognize?xjerr=1&client=chromium&lang=' + listenIt_langs[currentLanguage].param
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

    var cmdExec = '-r 16000 -c 1 ' + __dirname + '/../../tmp/temp.flac silence -l 1 '+listenSettings.startThreshold+' ' + ((listenSettings.reclen) ? ('trim 0 ' + listenSettings.reclen) : '1 '+listenSettings.stopThreshold);

    if (p == 'linux') {
        //linux
        // ls = cp.exec('AUDIODRIVER=alsa AUDIODEV=hw:1,0 rec -r 16000 temp.flac silence 1 0.3 3% 1 0.3 3%', function (error, stdout, stderr) {
        // AUDIODRIVER=alsa AUDIODEV=hw:1,0 rec -r 16000 '+recIndex+'.flac silence 1 0.2 2% 1 0.3 1%
        cmdExec = 'AUDIODRIVER=alsa AUDIODEV='+listenSettings.recHardware+' rec ' + cmdExec;
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
                console.log ("Ignore recording");
                logger.error ("adaptr listen Ignore recording");
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

                if (error.code == 1) {
                    // command line error
                    logger.error ("adaptr listen Stop execution of 'listen'");
                    stop ();
                }
                else {
                    // May be device is busy => try again in 5 seconds
                    // Restart recording
                    setTimeout (listenRecord, 5000, listenGetTextGoogle);
                }
            }
            else {
                fs.renameSync (__dirname + "/../../tmp/temp.flac",  __dirname + "/../../tmp/command"+fileCounter+".flac");
                // Try to recognize this text
                if (callback) {
                    setTimeout (callback, 0,  __dirname + "/../../tmp/command"+fileCounter+".flac");
                }
                fileCounter++;
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
                    setState (objLastRecognition, obj.hypotheses[0].confidence + ";" + obj.hypotheses[0].utterance);
                    if (obj.hypotheses[0].confidence >= listenSettings.qualityThreshold) {
                        checkCommand (obj.hypotheses[0].utterance);
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
        if (!listenSettings.debug) {
            fs.renameSync (file, __dirname + "/../../tmp/lastCommand.flac");
        }
    }catch (e){

    }

    // Restart recording
    if (listenSettings.autoListen) {
        listenRecord (listenGetTextGoogle);
    }
};

// try to find keyword at the start of the text
function checkCommand (text) {
    var isDetectKeyWord = !!listenSettings.keywords;

    // If some key words for specific languages are set
    if (!isDetectKeyWord && listenSettings.languageKeywords) {
        for (var lang in listenSettings.languageKeywords) {
            if (listenSettings.languageKeywords[lang]) {
                isDetectKeyWord = true;
                break;
            }
        }
    }

    // If there is no key word => go to process command
    if (!isDetectKeyWord || waitForCommand) {
        if (timerKeyword) {
            clearTimeout (timerKeyword);
            timerKeyword = null;
        }

        if (!isDetectKeyWord) {
            // There is no key word
            setState (objDetectedKeyword, "---");
        }

        // Send text for textCommands
        setState (listenSettings.processTextID, currentLanguage + ";" + text);

        if (waitForCommand) {
            waitForCommand = false;
            setState (objWaitForCmd,  waitForCommand);
        }

        // Restore language
        currentLanguage = listenSettings.language;
        return true;
    }

    // Detect key word, like "system/computer"
    var words = listenSettings.keywords.split ("/");

    var isFound = false;
    for (var t = 0; t < words.length; t++) {
        if (words[t] == text.substring (0, words[t].length)) {
            isFound = true;
            text = text.substring (words[t].length + 1);
            // Set language
            currentLanguage = listenSettings.language;
            // Send text for textCommands
            setState (objDetectedKeyword, words[t]);
            break;
        }
    }

    // Try detect, may be it is key word for other languages
    if (!isFound && listenSettings.languageKeywords) {
        for (var lang in listenSettings.languageKeywords) {
            if (listenSettings.languageKeywords[lang]) {
                words = listenSettings.languageKeywords[lang].split ("/");

                for (var t = 0; t < words.length; t++) {
                    if (words[t] == text.substring (0, words[t].length)) {
                        isFound = true;
                        text = text.substring (words[t].length + 1);
                        // Set language
                        currentLanguage = lang;
                        setState (objDetectedKeyword, words[t]);
                        break;
                    }
                }
            }
        }
    }

    // If key word was found
    if (isFound) {
        if (text) {
            setState (listenSettings.processTextID, currentLanguage + ";" + text);
            // Restore language
            currentLanguage = listenSettings.language;
        }
        else {
            waitForCommand = true;
            setState (objWaitForCmd,  waitForCommand);
            isOwnPlaying = true;
            if (listenSettings.keywordBeep) {
                setState (listenSettings.sayItID, listenSettings.keywordBeep);
            }
            // Start timer
            timerKeyword = setTimeout (function () {
                // Timeout: no sound was recognised in X ms after key word
                waitForCommand = false;
                setState (objWaitForCmd,  waitForCommand);
                if (listenSettings.keywordFailBeep) {
                    isOwnPlaying = true;
                    setState (listenSettings.sayItID, listenSettings.keywordFailBeep);
                }
                // Restore language
                currentLanguage = listenSettings.language;
            }, listenSettings.keywordTimeout);
        }
    }
    else {
        // No keyword found
        setState (objError, 'No keyword ("'+textCommandsSettings.keywords+'") found: ' + text);
    }
}

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
createObject(objWaitForCmd, {
    "Name": "Listen.WaitForCommand",
    "TypeName": "VARDP",
    "DPInfo": "Listen",
    "ValueMin": null,
    "ValueMax": null,
    "ValueUnit": "",
    "ValueType": 4,
    "ValueSubType": 0,
    "ValueList": ""
});
createObject(objProcessIndication, {
    "Name": "Listen.Processing",
    "TypeName": "VARDP",
    "DPInfo": "Listen",
    "ValueMin": null,
    "ValueMax": null,
    "ValueUnit": "",
    "ValueType": 4,
    "ValueSubType": 0,
    "ValueList": ""
});
createObject(objProcessBeep, {
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
createObject(objKeywords, {
    "Name": "Listen.Keywords",
    "TypeName": "VARDP",
    "DPInfo": "Listen",
    "ValueMin": null,
    "ValueMax": null,
    "ValueUnit": "",
    "ValueType": 20,
    "ValueSubType": 11,
    "ValueList": ""
});
createObject(objDetectedKeyword, {
    "Name": "Listen.DetectedKeyword",
    "TypeName": "VARDP",
    "DPInfo": "Listen",
    "ValueMin": null,
    "ValueMax": null,
    "ValueUnit": "",
    "ValueType": 20,
    "ValueSubType": 11,
    "ValueList": ""
});
createObject(objKeywordBeep, {
    "Name": "Listen.KeywordBeep",
    "TypeName": "VARDP",
    "DPInfo": "Listen",
    "ValueMin": null,
    "ValueMax": null,
    "ValueUnit": "",
    "ValueType": 20,
    "ValueSubType": 11,
    "ValueList": ""
});
createObject(objLastRecognition, {
    "Name": "Listen.LastRecognition",
    "TypeName": "VARDP",
    "DPInfo": "Listen",
    "ValueMin": null,
    "ValueMax": null,
    "ValueUnit": "",
    "ValueType": 20,
    "ValueSubType": 11,
    "ValueList": ""
});

if (listenSettings.keywords) {
    setState (objKeywords, listenSettings.keywords);
}
setState (objKeywordBeep, listenSettings.keywordBeep);

// Initiate recording
if (listenSettings.autoListen) {
	listenRecord (listenGetTextGoogle);
}
else {
    setState (objListening, false);
}
setState (objAutoListen,  listenSettings.autoListen);
setState (objProcessBeep, listenSettings.processBeep);
setState (objWaitForCmd,  waitForCommand);
setState (objProcessIndication,  false);

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


