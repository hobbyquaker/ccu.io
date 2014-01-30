/**
 *      Growl Adapter v0.1
 *
 *      1'2014 Hobbyquaker
 *
 * Todo:
 *      Icons
 *      Callback-URL
 *
 */

var settings = require(__dirname+'/../../settings.js');

if (!settings.adapters.growl || !settings.adapters.growl.enabled) {
    process.exit();
}

console.log(settings.adapters.growl);

var logger =    require(__dirname+'/../../logger.js'),
    io =        require('socket.io-client'),
    growler =   require('growler');;


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
    logger.info("adapter growl connected to ccu.io");
});

socket.on('disconnect', function () {
    logger.info("adapter growl disconnected from ccu.io");
});

var title;


socket.on('event', function (obj) {
    if (!obj || !obj[0]) {
        return;
    }
    if (obj[0] == (settings.adapters.growl.firstId+1)) {
        title = obj[1];
    }
    if (obj[0] == settings.adapters.growl.firstId) {
        sendGrowl(title, obj[1]);
    }
});


socket.emit("setObject", settings.adapters.growl.firstId+1, {
    Name: "Growl Title",
    TypeName: "VARDP"
});
socket.emit("setObject", settings.adapters.growl.firstId, {
    Name: "Growl Message",
    TypeName: "VARDP"
});

socket.emit('getDatapoint', settings.adapters.growl.firstId+1, function (id, data) {
    if (data) {
        title = data[0];
    }
});

var myApp;

function initGrowl() {
    myApp = new growler.GrowlApplication(settings.adapters.growl.settings.appName, {
        hostname: settings.adapters.growl.settings.host
    }, {
        password: settings.adapters.growl.settings.password
    });
    myApp.setNotifications({
        'Server Status': {}
    });
    myApp.register();

}

initGrowl();

function sendGrowl(title, msg) {
    myApp.sendNotification('Server Status', {
        title: title,
        text: msg
    });

}

function stop() {
    logger.info("adapter growl terminating");
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