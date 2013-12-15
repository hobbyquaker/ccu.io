/**
 *      CCU.IO iCal Adapter
 *      12'2013 vader722
 *
 *      Version 0.1
 *		
 */
var settings = require(__dirname+'/../../settings.js');

if (!settings.adapters.ical || !settings.adapters.ical.enabled) {
    process.exit();
}

var icalSettings = settings.adapters.ical.settings;

var logger = require(__dirname+'/../../logger.js'),
    io     = require('socket.io-client');

var objects = {},
	datapoints = {};
var ical = require('ical'), months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mai', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dez']
var RRule = require('rrule').RRule;
var preview = icalSettings.preview;
		
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
    logger.info("adapter iCal  connected to ccu.io");
});

socket.on('disconnect', function () {
    logger.info("adapter iCal  disconnected from ccu.io");
});

socket.on('event', function (obj) {
    if (!obj || !obj[0]) {
        return;
    }
        
    var id = obj[0];
    var val = obj[1];
    var ts = obj[2];
    var ack = obj[3];
        
        if (obj[0] == icalSettings.firstId) {
                if (id == icalSettings.firstId && val != "") {
					var content = val.split(" ");
					//von defURL lesen
					setState(icalSettings.firstId + 1, "");
					if (content[0] == "read") {
						logger.info("adapter ical reading iCal from default URL: " + icalSettings.defURL);
						checkiCal(icalSettings.defURL);
					}
					//von custom URL lesen
					if (content[0] == "readURL") {
						if (content[1] != "") {
							setState(icalSettings.firstId + 1, "");
							logger.info("adapter ical reading iCal from URL: " + content[1]);
							checkiCal(content[1]);
						}
					}
				}
		}
});


function checkiCal(loc) {
	
	ical.fromURL(loc, {}, function(err, data){
		var arrDates = new Array();
	  for (var k in data){
		  
	    if (data.hasOwnProperty(k)){
	      var ev = data[k]
	  
		  //es interessieren nur Termine mit einer Summary
		 var enddate = new Date();
		 var now = new Date();
		 enddate.setDate(enddate.getDate()+preview);
		 if (ev.summary != undefined) {
			 //aha, eine RRULE in dem Termin --> auswerten
			 if (ev.rrule != undefined) {
				// console.log(ev.rrule.toString());
				 var rule = RRule.fromString(ev.rrule.toString());
				 var dates = rule.between(now, enddate);
				 if (dates.length > 0) {
					 for (var i=0; i<dates.length; i++) {
						 var datevar = new Date(Date.parse(dates));
	 					 var MyTimeString = ('0' + ev.start.getHours()).slice(-2) + ':'
	 					              + ('0' + (ev.start.getMinutes())).slice(-2);
						 var singleDate = datevar.getDate()+ "." + (datevar.getMonth()+1)+"."+datevar.getFullYear()+" "+MyTimeString+ " " +ev.summary;
						 //console.log("pushe: "+singleDate);
						 arrDates.push(singleDate);
					 }
				 }
			 } else {
				 //Nein, also ein einzelner Termin
				 if (ev.start < enddate && ev.start > now) {
					 //Termin innerhalb des Zeitfensters
					var MyTimeString = ('0' + ev.start.getHours()).slice(-2) + ':'
					              + ('0' + (ev.start.getMinutes())).slice(-2);
					var singleDate = ev.start.getDate()+"."+(ev.start.getMonth()+1)+"."+ev.start.getFullYear()+" "+MyTimeString+" "+ev.summary;
					 //console.log("pushe: "+singleDate);
					 arrDates.push(singleDate);
					 
				 } 
			} 
			if (arrDates.length>0) {
				setState(icalSettings.firstId + 1,brSeparatedList(arrDates));
			}
		 }	
	    }
	  }
	})
}

function brSeparatedList(arr) {
    var text = "";
	arr.sort();
    var length = arr.length;
    if (length > 0) {
        var first = true;
        for (var i=0; i<length; i++) {
            if (!first) {
                text = text + "<br/>";
            } else {
                first = false;
            }
            text = text + arr[i];
        }
    }
    return text;
}




function stop() {
    logger.info("adapter ical terminating");
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
	logger.verbose("adapter ical setState "+id+" "+val);
	socket.emit("setState", [id,val,null,true]);
}

function iCalInit() {
    
	setObject(icalSettings.firstId, {
        Name: "iCalReadTrigger",
        TypeName: "VARDP",
    });
	
	setObject(icalSettings.firstId + 1 , {
        Name: "iCalEvents",
        TypeName: "VARDP",
    });
	
	setState(icalSettings.firstId, "");
	setState(icalSettings.firstId + 1, "");
	
	  logger.info("adapter ical objects inserted, starting at: "+icalSettings.firstId);
}

logger.info("adapter ical start");

iCalInit();


