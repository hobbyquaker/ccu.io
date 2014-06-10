var settings = require(__dirname+'/../../settings.js');



if (!settings.adapters.speedport || !settings.adapters.speedport.enabled) {
    process.exit();
}

var logger =    require(__dirname+'/../../logger.js'),
    io =        require('socket.io-client');


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
    logger.info("adapter sport connected to ccu.io");
});

socket.on('disconnect', function () {
    logger.info("adapter sport disconnected from ccu.io");
});

socket.on('event', function (obj) {
    if (!obj || !obj[0]) {
        return;
    }
});

function stop() {
    logger.info("adapter sport terminating");
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

var firstId = settings.adapters.speedport.firstId;

socket.emit("setObject", firstId, {
    Name: "Speedport dialedcalls",
    DPInfo: "gewählte Rufnummern",
    TypeName: "VARDP"
});

socket.emit("setObject", firstId + 1, {
    Name: "Speedport takencalls",
    DPInfo: "angenommene Rufnummern",
    TypeName: "VARDP"
});

socket.emit("setObject", firstId + 2, {
    Name: "Speedport missedcalls",
    DPInfo: "verpasste Rufnummern",
    TypeName: "VARDP"
});

var host = settings.adapters.speedport.settings.host;
var pass = settings.adapters.speedport.settings.pass;

var request = require('request');
var cookieJar = request.jar();

function getCallers() {
    logger.info("adapter sport login on " + host);
    request.post({
        url: 'https://' + host + '/data/Login.json',
        jar: cookieJar,
        form: {
            'password': pass,
            'showpw': '0'
        },
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Referer': 'https://' + host + '/html/login/index.html'
        }
    }, function (err, res, body) {
        if (body.match(/500 Server Error/)) {
            logger.error('adapter sport 500 Server Error');
            logout(true);
        } else {
            request({
                headers: {
                    'Referer': 'https://' + host + '/html/content/phone/phone_call_list.html'
                },
                jar: cookieJar,
                url: 'https://speedport.ip/data/PhoneCalls.json'
            }, function (err, res, body) {
                if (body.match(/500 Server Error/)) {
                    logger.error('adapter sport 500 Server Error');
                    logout(true);
                } else {
                    parseCalls(JSON.parse(body));
                    logout();
                }

            });
        }
    });
}

function logout(terminate) {
    logger.info("adapter sport logout");
    request.post({
        url: 'https://' + host + '/data/Login.json',
        jar: cookieJar,
        form: {
            logout: 'byby'
        },
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Referer': 'https://' + host + '/html/content/overview/index.html'
        }
    }, function () {
        if (terminate) stop();
    });
}


function parseCalls(data) {
	var calls = {};
	for (var key in data) {
		var item = data[key];
		if (item.vartype != "template") continue;
		var ident = item.varid.slice(3);
		if (!calls[ident]) calls[ident] = [];
		var dateArr = item.varvalue[1].varvalue.split(".");
		var obj = {
			datetime: dateArr[2] + "-" + dateArr[1] + "-" + dateArr[0] + " " + item.varvalue[2].varvalue, 
			number: item.varvalue[3].varvalue
		};
		if (item.varvalue[4]) {
			var durationSeconds =  parseInt(item.varvalue[4].varvalue, 10);
			var durationHours = Math.floor(durationSeconds / 3600);
			var durationMinutes = Math.floor((durationSeconds % 3600) / 60);
			var duration = durationHours + ":" + ("0" + durationMinutes).slice(-2) + ":" + ("0" + (durationSeconds % 60)).slice(-2);

			obj.duration = duration;
		}
		calls[ident].push(obj);		
	}

    socket.emit("setState", [firstId, JSON.stringify(calls.dialedcalls)], function () {
        socket.emit("setState", [firstId + 1, JSON.stringify(calls.takencalls)], function () {
            socket.emit("setState", [firstId + 2, JSON.stringify(calls.missedcalls)], function () {
                stop();
            });
        });
    });

}

getCallers();

setTimeout(function () {
    logger.info("adapter sport force terminating");
    process.exit();
}, 600000);