/**
 *      CCU.IO lcdproc Adapter
 *      07'2014 Eisbaeeer
 *      mail: Eisbaeeer@gmail.com 
 
 *      Version 0.1
 *      
 *      Get this code on Github
 *      https://github.com/Eisbaeeer/lcdproc 
 *      
 */
var settings = require(__dirname+'/../../settings.js');

if (!settings.adapters.lcdproc || !settings.adapters.lcdproc.enabled) {
    process.exit();
}
                            
// load settings 

var logger = require(__dirname+'/../../logger.js'),
    io     = require('socket.io-client'),
   	net    = require('net'),
    LcdClient = require('lcdproc-client').LcdClient,
    cnt = 0;
	
	var socketLcdproc;
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

connectLcdproc();

function connectLcdproc() {
	//open socket to lcdproc server
	  if (settings.adapters.lcdproc.settings.debug == true) {
	logger.info("adapter lcdproc starting connect to: "+settings.adapters.lcdproc.settings.IP+" "+settings.adapters.lcdproc.settings.port);
	                                   }
   socketLcdproc = new LcdClient(settings.adapters.lcdproc.settings.port,settings.adapters.lcdproc.settings.IP);
}

// socket connect
socket.on('connect', function () {
    logger.info("adapter lcdproc connected to ccu.io");
});

// socket disconnect
socket.on('disconnect', function () {
    logger.info("adapter lcdproc disconnected from ccu.io");
});


// ccu.io object changes
socket.on('event', function (obj) {
    if (!obj || !obj[0]) {
        return;
    }
	
	//ID
    var id = obj[0];
	//Wert
    var val = obj[1];
	//Timestamp
    var ts = obj[2];
	//ACKnowledge
    var ack = obj[3];
	  
  if (obj[0] == settings.adapters.lcdproc.settings.firstId +2 || obj[0] == settings.adapters.lcdproc.settings.firstId +3 || obj[0] == settings.adapters.lcdproc.settings.firstId +4|| obj[0] == settings.adapters.lcdproc.settings.firstId +5  ) {

	  if (settings.adapters.lcdproc.settings.debug == true) {
        logger.info("adapter lcdproc Event: "+id+" "+val+" "+ts+" "+ack+" "+obj);
		                                    }
  		// filter the events
       
  if (id == settings.adapters.lcdproc.settings.firstId +2 && ack != true) {
          
      socketLcdproc.widget("first_line");
      socketLcdproc.widget_val("first_line",1,1,""+val+"");

          if (settings.adapters.lcdproc.settings.debug == true) {
				      logger.info("adapter lcdproc write line 1: "+val);
                                              }
				
		}


  if (id == settings.adapters.lcdproc.settings.firstId +3 && ack != true) {

      socketLcdproc.widget("second_line");
      socketLcdproc.widget_val("second_line",1,2,""+val+"");

          if (settings.adapters.lcdproc.settings.debug == true) {
				      logger.info("adapter lcdproc write line 2: "+val);
                                              }
				
		}
    
  if (id == settings.adapters.lcdproc.settings.firstId +4 && ack != true) {

      socketLcdproc.widget("third_line");
      socketLcdproc.widget_val("third_line",1,3,""+val+"");

          if (settings.adapters.lcdproc.settings.debug == true) {
				      logger.info("adapter lcdproc write line 3: "+val);
                                              }
			
		}      
    
  if (id == settings.adapters.lcdproc.settings.firstId +5 && ack != true) {

      socketLcdproc.widget("fourth_line");
      socketLcdproc.widget_val("fourth_line",1,4,""+val+"");

          if (settings.adapters.lcdproc.settings.debug == true) {
				      logger.info("adapter lcdproc write line 4: "+val);
                                              }
			
		}          
    
    
	}
});

socketLcdproc.on('init', function() {
       socketLcdproc.screen("ccuio");
       logger.info("adapter lcdproc inititalized");
       logger.info("adapter lcdproc screen generated");
  });
       
socketLcdproc.on('ready', function() {
    logger.info("adapter lcdproc connected display WIDTH: " + socketLcdproc.width);
    logger.info("adapter lcdproc connected display HEIGHT: " + socketLcdproc.height);
  });

 socketLcdproc.init();


//ADAPTER END
function stop() {
    logger.info("adapter lcdproc terminating");
    socketLcdproc.end;
	setTimeout(function () {
        process.exit();
    }, 250);
}

//Bei Unix SIGINT -->ende
process.on('SIGINT', function () {
    stop();
});

//Bei Unix SIGTERM -->ende
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
	logger.verbose("adapter lcdproc setState "+id+" "+val);
	socket.emit("setState", [id,val,null,true]);
}

function decimalToHex(d, padding) {
    var hex = Number(d).toString(16);
    padding = typeof (padding) === "undefined" || padding === null ? padding = 2 : padding;

    while (hex.length < padding) {
        hex = "0" + hex;
    }

    return hex;
}

function sleep(milliseconds) {
  var start = new Date().getTime();
  for (var i = 0; i < 1e7; i++) {
    if ((new Date().getTime() - start) > milliseconds){
      break;
    }
  }
}

function LcdprocInit() {

// Create Datapoints in CCU.IO
var dpId = settings.adapters.lcdproc.settings.firstId;

var rowDPs = {
    row1:  dpId+2,
    row2:  dpId+3,
    row3:  dpId+4,
    row4:  dpId+5    
};

socket.emit("setObject", dpId, {
    Name: "Lcdproc-Server",
    TypeName: "DEVICE",
    HssType: "LCDPROC",
    Address: "Lcdproc-Server",
    Interface: "CCU.IO",
    Channels: [
    ],
    _persistent: true
});

socket.emit("setObject", dpId+1, {
    Name: "rows",
    TypeName: "CHANNEL",
    Address: "ROWS",
    HssType: "LCDPROC",
    DPs: rowDPs,
    Parent: settings.adapters.lcdproc.settings.firstId,
    _persistent: true
});

socket.emit("setObject", dpId+2, {
    "Name": "Lcdproc_Line1",
    "TypeName": "VARDP",
    "Operations": 5,
    "ValueType": 4,
    "ValueUnit": "",
    "Parent": settings.adapters.lcdproc.settings.firstId+1,
    _persistent: true
});

socket.emit("setObject", dpId+3, {
    "Name": "Lcdproc_Line2",
    "TypeName": "VARDP",
    "Operations": 5,
    "ValueType": 4,
    "ValueUnit": "",
    "Parent": settings.adapters.lcdproc.settings.firstId+1,
    _persistent: true
});

socket.emit("setObject", dpId+4, {
    "Name": "Lcdproc_Line3",
    "TypeName": "VARDP",
    "Operations": 5,
    "ValueType": 4,
    "ValueUnit": "",
    "Parent": settings.adapters.lcdproc.settings.firstId+1,
    _persistent: true
});

socket.emit("setObject", dpId+5, {
    "Name": "Lcdproc_Line4",
    "TypeName": "VARDP",
    "Operations": 5,
    "ValueType": 4,
    "ValueUnit": "",
    "Parent": settings.adapters.lcdproc.settings.firstId+1,
    _persistent: true
});

	  logger.info("adapter lcdproc objects inserted, starting at: "+settings.adapters.lcdproc.settings.firstId);
}

logger.info("adapter lcdproc start");
LcdprocInit ();
