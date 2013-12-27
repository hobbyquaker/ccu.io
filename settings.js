var fs =        require('fs'),
    logger =    require(__dirname+'/logger.js');

var settings = {};

try {
    var settingsJson = fs.readFileSync(__dirname+"/datastore/io-settings.json");
    settings = JSON.parse(settingsJson.toString());
    logger.verbose("ccu.io        settings found");
    if (!settings.uid) {
        logger.verbose("ccu.io        creating uid");
        settings.uid = Math.floor((Math.random()*4294967296)).toString(16)+Math.floor((Math.random()*4294967296)).toString(16)+Math.floor((Math.random()*4294967296)).toString(16)+Math.floor((Math.random()*4294967296)).toString(16);
        fs.writeFileSync(__dirname+"/datastore/io-settings.json", JSON.stringify(settings));
    }
} catch (e) {
    logger.info("ccu.io        creating datastore/io-settings.json");
    var settingsJson = fs.readFileSync(__dirname+"/settings-dist.json");
    settings = JSON.parse(settingsJson.toString());
    settings.unconfigured = true;
    logger.verbose("ccu.io        creating uid");
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
    if (adapters[i] == ".DS_Store" || adapters[i] == "skeleton.js") {
        continue;
    }

    var adapterSettings = {},
        settingsJson;

    try {
        settingsJson = fs.readFileSync(__dirname+"/datastore/adapter-"+adapters[i]+".json");
        adapterSettings = JSON.parse(settingsJson.toString());
        logger.verbose("ccu.io        settings.json found for "+adapters[i]);

    } catch (e) {
        try {
            settingsJson = fs.readFileSync(__dirname+"/adapter/"+adapters[i]+"/settings.json");
            var adapterSettings = JSON.parse(settingsJson.toString());
            fs.writeFileSync(__dirname+"/datastore/adapter-"+adapters[i]+".json", JSON.stringify(adapterSettings));
            logger.info("ccu.io        creating datastore/adapter-"+adapters[i]+".json");
        } catch (ee) {
            logger.error("ccu.io        no settings.json found for "+adapters[i]);
        }
    }
    settings.adapters[adapters[i]] = adapterSettings;
}



//console.log(JSON.stringify(settings, null, " "));

module.exports = settings;

