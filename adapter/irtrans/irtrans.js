/**
 *      CCU.IO IRTrans Adapter
 *      12'2013 vader722
 *
 *      Version 0.1
 *		
 */
var settings = require(__dirname+'/../../settings.js');

if (!settings.adapters.irtrans || !settings.adapters.irtrans.enabled) {
    process.exit();
}

var irtransSettings = settings.adapters.irtrans.settings;

var logger = require(__dirname+'/../../logger.js'),
    io     = require('socket.io-client'),
	net    = require('net');
	command = "",
	remote = "",
	mode = "N";
	
	var socketIR;
	var objects = {},
	    datapoints = {};
		
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

connectIR();


function connectIR() {
	logger.info("adapter irtrans starting connect to:"+irtransSettings.IP+" "+irtransSettings.port);
	socketIR = net.connect({port: irtransSettings.port, host: irtransSettings.IP},
	    function() { 
	  	logger.info("adapter irtrans connected to irtrans: "+ irtransSettings.IP);
	  	socketIR.write("ASCI");
	});
}

socketIR.on('close', function () {
    logger.info("adapter irtrans  disconnected from IRTrans");
	setState(irtransSettings.firstId + 3, "No Connection");
});

socketIR.on('data', function (data) {
	logger.info("adapter irtrans Event IR:"+data.toString());
	var content = data.toString().split(" ");
	switch (content[0]) {
		//Command und Remote empfangen
	case "**00037":
		var dest = content[2].split(",");
		setState(irtransSettings.firstId + 2, dest[0]+","+dest[1]);
		setState(irtransSettings.firstId + 3, "Receive IR");
		break;
		//IRCode empfangen
	case "**00171":
		var ircode = content[2];
		setState(irtransSettings.firstId + 2, ircode);
		setState(irtransSettings.firstId + 3, "Learn OK");
		setState(irtransSettings.firstId, "");
		setState(irtransSettings.firstId + 1, "");
		mode = "N";
		console.log(ircode);
		break;
	case "**00056":
		//Lernen abgebrochen, Timeout
		setState(irtransSettings.firstId + 1, "");
		mode = "N";
		break;
		//Den Rest durchreichen
	default:
		setState(irtransSettings.firstId + 3, data.toString());
	}
});

socketIR.on('error', function (data) {
	logger.info("adapter irtrans ERROR Connection IRTrans:"+data.toString());
	setState(irtransSettings.firstId + 3, "No Connection");
    activityTimeout = setTimeout(function () {
       connectIR();
    }, 10000);
});

socket.on('connect', function () {
    logger.info("adapter irtrans  connected to ccu.io");
});

socket.on('disconnect', function () {
    logger.info("adapter irtrans  disconnected from ccu.io");
});

socket.on('event', function (obj) {
    if (!obj || !obj[0]) {
        return;
    }
	
    var id = obj[0];
    var val = obj[1];
    var ts = obj[2];
    var ack = obj[3];
	
	if (obj[0] == irtransSettings.firstId || obj[0] == irtransSettings.firstId +1) {
		
		//logger.info("adapter irtrans Event: "+id+" "+val+" "+ts+" "+ack+" "+obj);
		
		if (id == irtransSettings.firstId && val != "") {
			switch (mode) {
			case "N":
				setState(irtransSettings.firstId + 2, "");
				command = new Buffer("Asnd "+val+"\n");
				logger.info("adapter irtrans send:"+command);
				socketIR.write(command);
				break;
			case "S":
				command = new Buffer("Asndhex H"+val+"\n");
				logger.info("adapter irtrans send:"+command);
				socketIR.write(command);
				break;
			default:
				break;
			}
		}
		
		if (id == irtransSettings.firstId + 1 && val != "") {
			switch (val) {
			case "learnIR":
				mode = "L";
				logger.info("adapter irtrans learning mode");
				setState(irtransSettings.firstId + 3, "");
				socketIR.write("Alearn M0,W30,T0\n");
				break;
			case "sendIR":
				console.log("send");
				mode = "S";
				break;
			default:
				mode = "N";
				remote = val;
			}	
		}
	}
	
	
});

function stop() {
    logger.info("adapter irtrans  terminating");
    socketIR.end;
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
        datapoints[obj.Name] = [obj.Value];
    }
    socket.emit("setObject", id, obj);
}

function setState(id, val) {
	datapoints[id] = [val];
	logger.verbose("adapter irtrans setState "+id+" "+val);
	socket.emit("setState", [id,val,null,true]);
}

function IRTransInit() {
    
	setObject(irtransSettings.firstId, {
        Name: "IRTransSendCommand",
        TypeName: "VARDP",
    });
	
    setObject(irtransSettings.firstId + 1 , {
        Name: "IRTransMode",
        TypeName: "VARDP",
    });
	
	setObject(irtransSettings.firstId + 2, {
        Name: "IRTransReceive",
        TypeName: "VARDP",
    });
	
	
    setObject(irtransSettings.firstId + 3 , {
        Name: "IRTransResult",
        TypeName: "VARDP",
    });
	
	setState(irtransSettings.firstId, "");
	setState(irtransSettings.firstId + 1, "");
	setState(irtransSettings.firstId + 2, "");
	setState(irtransSettings.firstId + 3, "");

	
	  logger.info("adapter irtrans objects inserted, starting at: "+irtransSettings.firstId);
}

logger.info("adapter irtrans start");
IRTransInit ();


