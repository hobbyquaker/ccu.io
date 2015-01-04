var settings = require(__dirname+'/../../settings.js');

if (!settings.adapters.mqtt || !settings.adapters.mqtt.enabled) {
    process.exit();
}

var adapterSettings = settings.adapters.mqtt.settings;

var mqtt = require('mqtt');
var logger =    require(__dirname+'/../../logger.js'),
    io =        require('socket.io-client');

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

var from = adapterSettings.prefix.replace(/\/$/, '');

var client = mqtt.createClient(adapterSettings.port, adapterSettings.host);

var rx;

switch (adapterSettings.payload) {
    case'plain':
        rx = new RegExp("^" + adapterSettings.prefix + "set\/([0-9]+)$");
        break;
    default:
        rx = new RegExp("^" + adapterSettings.prefix + "([0-9]+)$");
}

client.on('message', function(topic, message) {
    var tmp;
    if (tmp = topic.match(rx)) {
        var id = tmp[1];

        switch (adapterSettings.payload) {
            case 'plain':
                socket.emit("setState", [id, message]);
                break;
            default:
                try {
                    var msg = JSON.parse(message);
                } catch (e) {}
                if (typeof msg === 'object' && typeof msg.val !== 'undefined' && msg.from !== from) {
                    socket.emit("setState", [id, msg.val]);
                }

        }
    }
});

socket.on('connect', function () {
    logger.info("adapter mqtt  connected to ccu.io");
    logger.info("adapter mqtt  subscribe " + adapterSettings.prefix + "#");
    client.subscribe(adapterSettings.prefix + "#");
});

socket.on('disconnect', function () {
    logger.info("adapter mqtt  disconnected from ccu.io");
});

socket.on('event', function (obj) {
    if (!obj) return;
    var id = obj[0];
    var val = obj[1];
    var ts = obj[2];
    var ack = obj[3];
    var lc = obj[4];

    if (ts != lc) return; // value unchanged

    var topic = adapterSettings.prefix + id;
    var payload = "";

    switch (adapterSettings.payload) {
        case "plain":
            if (typeof val != "string") {
                payload = JSON.stringify(val);
            } else {
                payload = val;
            }
            break;
        default:
            payload = JSON.stringify({val: val, ts: Math.floor((new Date(ts)).getTime() / 1000), ack: ack, lc: lc ? Math.floor((new Date(lc)).getTime() / 1000) : null, from: from});
    }
    client.publish(topic, payload, {retain: adapterSettings.retain});
});



function stop() {
    logger.info("adapter mqtt  terminating");
    try {
        client.unsubscribe(adapterSettings.prefix + "#");
        logger.info("adapter mqtt  unsubscribe " + adapterSettings.prefix + "#");
        client.end();
    } catch (e) {}
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