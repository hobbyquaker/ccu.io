var fs =        require('fs'),
    log4js =      require('log4js'),
    logger;

var settings = {};

// setup logger
log4js.configure(__dirname + '/log4js.json', {reloadSecs: 600});
logger = log4js.getLogger('ccu.io.daily');
logger.info("settings      Logger starting up on default-level: DEBUG");

try {
    var settingsJson = fs.readFileSync(__dirname+"/datastore/io-settings.json");
    settings = JSON.parse(settingsJson.toString());
    logger.setLevel(settings.logging.level);
    logger.info("settings      setting Loglevel to: " + settings.logging.level);
    logger.debug("settings      settings found");
    if (!settings.uid) {
        logger.debug("settings      creating uid");
        settings.uid = Math.floor((Math.random()*4294967296)).toString(16)+Math.floor((Math.random()*4294967296)).toString(16)+Math.floor((Math.random()*4294967296)).toString(16)+Math.floor((Math.random()*4294967296)).toString(16);
        fs.writeFileSync(__dirname+"/datastore/io-settings.json", JSON.stringify(settings));
    }
} catch (e) {
    logger.info("settings      creating datastore/io-settings.json");
    var settingsJson = fs.readFileSync(__dirname+"/settings-dist.json");
    settings = JSON.parse(settingsJson.toString());
    settings.unconfigured = true;
    logger.debug("settings      creating uid");
    settings.uid = Math.floor((Math.random()*4294967296)).toString(16)+Math.floor((Math.random()*4294967296)).toString(16)+Math.floor((Math.random()*4294967296)).toString(16)+Math.floor((Math.random()*4294967296)).toString(16);
    fs.writeFileSync(__dirname+"/datastore/io-settings.json", JSON.stringify(settings));
}

settings.updateSelfRunning = false;

settings.binrpc.inits = [];
if (settings.binrpc.rfdEnabled) {
    settings.binrpc.inits.push({
        id:     settings.binrpc.rfdId,
        port:   settings.binrpc.rfdPort
    });
}
if (settings.binrpc.hs485dEnabled) {
    settings.binrpc.inits.push({
        id:     settings.binrpc.hs485dId,
        port:   settings.binrpc.hs485dPort
    });
}
if (settings.binrpc.cuxdEnabled) {
    settings.binrpc.inits.push({
        id:     settings.binrpc.cuxdId,
        port:   settings.binrpc.cuxdPort
    });
}

settings.binrpc.checkEvents.testTrigger = {
    "io_rf": settings.binrpc.checkEvents.rfd,
    "io_wired": settings.binrpc.checkEvents.hs485d
}

if (!settings.httpEnabled) {
    delete settings.ioListenPort;
}
if (!settings.httpsEnabled) {
    delete settings.ioListenPortSsl;
}

settings.adapters = {};

// Find Adapters
var adapters = fs.readdirSync(__dirname+"/adapter");

for (var i = 0; i < adapters.length; i++) {
    if (adapters[i] == ".DS_Store" || adapters[i].match(/^skeleton/)) {
        continue;
    }

    var adapterSettings = {},
        settingsJson;

    try {
        settingsJson = fs.readFileSync(__dirname+"/datastore/adapter-"+adapters[i]+".json");
        adapterSettings = JSON.parse(settingsJson.toString());
        if (!adapterSettings) {
            try {
                settingsJson = fs.readFileSync(__dirname+"/adapter/"+adapters[i]+"/settings.json");
                var adapterSettings = JSON.parse(settingsJson.toString());
                fs.writeFileSync(__dirname+"/datastore/adapter-"+adapters[i]+".json", JSON.stringify(adapterSettings));
                logger.info("settings      creating datastore/adapter-"+adapters[i]+".json");
            } catch (ee) {
                logger.error("settings      no settings.json found for "+adapters[i]);
            }
        } else {
            logger.debug("settings      settings.json found for "+adapters[i]);
        }

    } catch (e) {
        try {
            settingsJson = fs.readFileSync(__dirname+"/adapter/"+adapters[i]+"/settings.json");
            var adapterSettings = JSON.parse(settingsJson.toString());
            fs.writeFileSync(__dirname+"/datastore/adapter-"+adapters[i]+".json", JSON.stringify(adapterSettings));
            logger.info("settings      creating datastore/adapter-"+adapters[i]+".json");
        } catch (ee) {
            logger.error("settings      no settings.json found for "+adapters[i]);
        }
    }
    settings.adapters[adapters[i]] = adapterSettings;
}



//console.log(JSON.stringify(settings, null, " "));

module.exports = settings;

