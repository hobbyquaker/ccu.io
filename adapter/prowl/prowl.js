/**
 *		Prowl Adapter v0.2
 *		
 *		2014-7 SGiersch.de
 *		
 *		Todo:
 *		- Test des APIKey beim Ausfüllen der Settings ermöglichen.
 */


var settings = require(__dirname+'/../../settings.js');

if (!settings.adapters.prowl || !settings.adapters.prowl.enabled) {
	process.exit();
}

var logger =				require(__dirname+'/../../logger.js'),
	io =					require('socket.io-client'),
	request =				require('request'),
	settings_api_key = 		settings.adapters.prowl.settings.apikey,
	settings_application =	settings.adapters.prowl.settings.application,
	settings_firstid =		settings.adapters.prowl.firstID,
	url = 					"",
	variable_PriorityID = 	0,
	variable_Event = 		"";

if (settings.ioListenPort) {
	var socket = io.connect("127.0.0.1", {
		port: settings.ioListenPort
	});
} else if (settings.ioListenPortSsl) {
	var socket = io.connect("127.0.0.1", {
		port: settings.ioListenPortSsl,
		secure: true,
	});
} else {
	process.exit();
}

socket.on('connect', function () {
	logger.info("adapter prowl    connected to ccu.io");
});

socket.on('disconnect', function () {
	logger.info("adapter prowl    disconnected from ccu.io");
});

socket.on('event', function (obj) {
	if (!obj || !obj[0]) {
		return;
	}
	
	if (typeof obj[3] != 'undefined') {
		var ack = obj[3];
		
		if (ack)
			return;
		}
		
		if (obj[0] == settings_firstid) {
			getvari(function() {
				var text = replacetext(obj[1]);
				sendprowl(text)
			});
		}
});

function stop() {
	logger.info("adapter prowl   terminating");
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

function replacetext(testtext){
	var newString = '';
	newString = testtext.replace(/~/g,'%7e');
	newString = newString.replace(/#/g,'%23');
	newString = newString.replace(/&/g,'%26');
	newString = newString.replace(/§/g,'%C2%A7');
	newString = newString.replace(/>\"</g,'%22');
	newString = newString.replace(/>Smiley</g,'%E2%98%BA');
	newString = newString.replace(/<<</g,'%0A');
	newString = newString.replace(/>NOEntry</g,'%E2%9B%94');
	newString = newString.replace(/>Check</g,'%E2%9C%85');
	return newString;
}

function getState(id, callback) {
	logger.verbose("adapter prowl getState "+id);
	socket.emit("getDatapoint", [id], function (id, obj) {
		callback (id, obj);
	});
}

function getvari(callback) {
	// Danke an Bluefox
	getState (settings_firstid+2, function (id, obj) {
		variable_Event = replacetext(obj[0]);
		logger.verbose("adapter prowl    get event: "+variable_Event);
		getState (settings_firstid+1, function (id, obj) {
			variable_PriorityID = obj[0];
			logger.verbose("adapter prowl    get priority: "+variable_PriorityID);
			// An dieser Stelle hast du beide Datenpunkte!
			if (callback) callback();
		});
	});
}

function sendprowl(msg) {	
	url = 'https://api.prowlapp.com/publicapi/add'
	url += '?application='+settings_application
	url += '&priority='+variable_PriorityID
	url += '&event='+variable_Event
	url += '&description='+msg
	url += '&apikey='+settings_api_key;
	logger.verbose("adapter prowl    url event: "+variable_Event);
	logger.verbose("adapter prowl    url priority: "+variable_PriorityID);
	
	request(url, function (error, response, body) {
		switch (response.statusCode) {
			case 200:
				logger.info("adapter prowl    Nachricht gesendet --> ");
				logger.info("adapter prowl     - application: "+settings_application);
				logger.info("adapter prowl     - event: "+variable_Event);
				logger.info("adapter prowl     - description: "+msg);
				logger.info("adapter prowl     - priority: "+variable_PriorityID);
				break;
			case 400:
				logger.error("adapter prowl   Bad request, the parameters you provided did not validate. ");
				break;
			case 401:
				logger.error("adapter prowl   Not authorized, the API key given is not valid, and does not correspond to a user. ");
				break;
			case 406:
				logger.error("adapter prowl   Not acceptable, your IP address has exceeded the API limit. ");
				break;
			case 409:
				logger.error("adapter prowl   Not approved, the user has yet to approve your retrieve request. ");
				break;
			case 500:
				logger.error("adapter prowl   Internal server error, something failed to execute properly on the Prowl side. ");
				break;
			default:
				logger.error("adapter prowl   Unknown HTTP Status "+JSON.stringify(error));
				break;
		}
	});
}

function ProwlInit() {
	socket.emit("setObject", settings_firstid, {
		Name: "Prowl Message",
		TypeName: "VARDP"
	});
	
	socket.emit("setObject", settings_firstid+1, {
		Name: "Prowl Priority",
		TypeName: "VARDP"
	});
	socket.emit("setState", [settings_firstid+1, "0"]);
	
	socket.emit("setObject", settings_firstid+2, {
		Name: "Prowl Event",
		TypeName: "VARDP"
	});
	socket.emit("setState", [settings_firstid+2, ""]);
	
	logger.info("adapter prowl   Prowl Init ausgeführt (First ID:"+settings_firstid+")");
}

ProwlInit();