var settings = require(__dirname+'/../../settings.js');

if (!settings.adapters.ADAPTERNAME || !settings.adapters.ADAPTERNAME.enabled) {
    process.exit();
}

var logger =    require(__dirname+'/../../logger.js'),
    io =        require('socket.io-client');


if (settings.ioListenPort) {
	socket = io("http://127.0.0.1:" + settings.ioListenPort);
} else if (settings.ioListenPortSsl) {
	socket = io("https://127.0.0.1:" + settings.ioListenPortSsl);
} else {
    process.exit();
}


socket.on('connect', function () {
    logger.info("adapter xxx    connected to ccu.io");
});

socket.on('disconnect', function () {
    logger.info("adapter xxx    disconnected from ccu.io");
});

socket.on('event', function (obj) {
    if (!obj || !obj[0]) {
        return;
    }
});

function stop() {
    logger.info("adapter xxx   terminating");
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