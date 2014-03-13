/**
 *      CCU.IO
 *
 *      Socket.IO based Home Automation Interface
 *
 *      Copyright (c) 2013 http://hobbyquaker.github.io
 *
 *      CC BY-NC 3.0
 *
 *      Kommerzielle Nutzung nicht gestattet!
 *
 */

// Keep WebStorm satisfied
if (typeof __dirname == "undefined") {
    var __dirname = "";
}

var settings = require(__dirname+'/settings.js');

settings.version = "1.0.26";
settings.basedir = __dirname;
settings.datastorePath = __dirname+"/datastore/";
settings.stringTableLanguage = settings.stringTableLanguage || "de";

var fs =        require('fs'),
    logger =    require(__dirname+'/logger.js'),
    express =   require('express'),
    http =      require('http'),
    https =     require('https'),
    crypto =    require('crypto'),
    request =   require('request'),
    childProcess = require('child_process'),
    url =       require('url'),
    socketio =  require('socket.io'),
    scheduler = require('node-schedule'),
    app,
    appSsl,
    server,
    serverSsl,
    io,
    ioSsl,
    devlogCache = [],
    children = [],
    childrenAdapter = {},
    timerAdapter = {},
    childScriptEngine,
    webserverUp = false,
    initsDone = false,
    extDone = false,
    authHash = "";

/** @namespace settings.logging.enabled */
/** @namespace settings.logging.file */
/** @namespace settings.logging.move */
/** @namespace settings.logging.varChangeOnly */
/** @namespace settings.logging.writeInterval */

if (settings.ioListenPort) {
    app =  express();

    if (settings.authentication && settings.authentication.enabled) {
        app.use(express.basicAuth(settings.authentication.user, settings.authentication.password));
    }

    server =    require('http').createServer(app);
}

// Create md5 hash of user and password
if (settings.authentication.user && settings.authentication.password) {
    // We can add the client IP address, so the key will be different for every client, but the server should calculate hash on the fly
    authHash = crypto.createHash('md5').update(settings.authentication.user+settings.authentication.password).digest("hex");
}

if (settings.ioListenPortSsl) {
    var options = null;

    // Zertifikate vorhanden?
    try {
        options = {
            key: fs.readFileSync(__dirname+'/cert/privatekey.pem'),
            cert: fs.readFileSync(__dirname+'/cert/certificate.pem')
        };
    } catch(err) {
        logger.error(err.message);
    }
    if (options) {
        appSsl = express();
        if (settings.authentication && settings.authentication.enabledSsl) {
            appSsl.use(express.basicAuth(settings.authentication.user, settings.authentication.password));
        }
        serverSsl = require('https').createServer(options, appSsl);
    }
}

var socketlist = [],
    stringtable = {},
    datapoints = {},
    ctrlObjects = {},
    ctrlIndex = {
        Name: {},
        Address: {},
        ENUM_ROOMS: [],
        ENUM_FUNCTIONS: [],
        FAVORITE: [],
        DEVICE: [],
        CHANNEL: [],
        HSSDP: [],
        VARDP: [],
        ALDP: [],
        ALARMDP: [],
        PROGRAM: []

    };

logger.info("node.control  starting version "+settings.version + " copyright (c) 2013 hobbyquaker http://hobbyquaker.github.io");
logger.verbose("node.control  commandline "+JSON.stringify(process.argv));

loadPersistentObjects();
loadDatapoints();
initWebserver();
initExtensions();

// Create language variable
datapoints[69999] = [settings.language || 'en', formatTimestamp(), true];
ctrlObjects[69999] = {Name:"SYSTEM.LANGUAGE", TypeName: "VARDP", DPInfo: "DESC", ValueType: 20, ValueSubType: 11};
ctrlIndex.VARDP.push(69999);
ctrlIndex.Name[69999] = [13305, "VARDP", null];
var staties = {};

function updateStatus () {
    if (io) {
        io.sockets.emit("updateStatus", staties);
    }
    if (ioSsl) {
        ioSsl.sockets.emit("updateStatus", staties);
    }
}

if (settings.logging.enabled) {
    setInterval(writeLog, settings.logging.writeInterval * 1000);
    if (settings.logging.move) {
        scheduler.scheduleJob('0 0 * * *', function(){
            moveLog(settings.logging.file);
        });
    }
}

var stats = {
    clients: 0,
    counters: {}, // counters in form {rx: 5, wired: 10}
    start: ((new Date()).getTime()),
    uptime: function() {
        var mseconds = ((new Date()).getTime()) - stats.start;
        var diff = new Date(mseconds);
        var hours = diff.getHours();
        var days = Math.floor(hours/24);
        hours = hours - (24 * days);
        return days+" Tage, "+(hours-1)+" Stunden, "+ diff.getMinutes()+" Minuten, "+diff.getSeconds()+" Sekunden";
    },
    log: function() {
        for (var cnt in stats.counters) {
            if (stats.counters[cnt].last === undefined) {
                stats.counters[cnt].last = 0;
            }
            logger.info("ccu.io stats  "+cnt+": "+((stats.counters[cnt].value - stats.counters[cnt].last)/settings.statsIntervalMinutes).toFixed(0)+"msg/min");
            stats.counters[cnt].last = stats.counters[cnt].value;
        }
        logger.info("ccu.io stats  "+socketlist.length+" Socket.IO Clients connected");
        logger.verbose("ccu.io uptime "+stats.uptime());
    }
};

if (settings.stats) {
    setInterval(stats.log, settings.statsIntervalMinutes * 60000);
}

function sendEvent(arr) {
    logger.verbose("socket.io --> broadcast event "+JSON.stringify(arr))
    if (io) {
        io.sockets.emit("event", arr);
    }
    if (ioSsl) {
        ioSsl.sockets.emit("event", arr);
    }
}

function setDatapoint(id, val, ts, ack, lc) {
    if (id < 65535 && !staties["ccuRegaData"]) { return; }

    // unescape Script WriteURL()
    if (typeof val == "string") {
        val = unescape(val);
    }

    var oldval = datapoints[id];
    var obj; // Event argument

    logger.verbose("setDatapoint "+JSON.stringify(oldval)+" -> "+JSON.stringify([val,ts,ack,lc]));

    if (!oldval) {
        // Neu
        if (!ctrlObjects[id]) {
            logger.warn("rega      <-- unknown variable "+id);
        }
        datapoints[id] = [val,ts,ack,lc];
        obj = [id,val,ts,ack,lc];
        sendEvent (obj);
        devLog(ts, id, val);
    } else {

        // Änderung
        if (!lc && val != oldval[0]) {
            lc = formatTimestamp();
        } else {
            lc = oldval[3];
        }

        datapoints[id] = [val,ts,ack,lc];
        obj = [id,val,ts,ack,lc];

        if (val == oldval[0] && ack == oldval[2] && ts == oldval[1] && lc == oldval[3]) {
            // Keine Änderung
        } else {
            // If log updates and changes or value really changed
            if (!settings.logging.varChangeOnly || val != oldval[0]) {
                devLog(ts, id, val);
            }
            sendEvent (obj);
        }
    }
}

function uploadParser(req, res, next) {
    var urlParts = url.parse(req.url, true);
    var query = urlParts.query;

    //console.log(query);

    // get the temporary location of the file
    var tmpPath = req.files.file.path;

    logger.info("webserver <-- file upload "+req.files.file.name+" ("+req.files.file.size+" bytes) to "+tmpPath);
    logger.info("webserver <-- file upload query params "+JSON.stringify(query));

    var newName;
    if (query.id) {
        newName = query.id + "." + req.files.file.name.replace(/.*\./, "");
    } else {
        newName = req.files.file.name;
    }
    // set where the file should actually exists - in this case it is in the "images" directory
    var targetPath = __dirname + "/" + query.path + newName;
    logger.info("webserver     move uploaded file "+tmpPath+" -> "+targetPath);


    // move the file from the temporary location to the intended location
    fs.rename(tmpPath, targetPath, function(err) {
        if (err) throw err;
        // delete the temporary file, so that the explicitly set temporary upload dir does not get filled with unwanted files
        fs.unlink(tmpPath, function() {
            if (err) throw err;
            res.send('File uploaded to: ' + targetPath + ' - ' + req.files.file.size + ' bytes');
        });
    });
}

function findDatapoint(needle, hssdp) {
    if (!datapoints[needle]) {
        if (ctrlIndex.Name[needle]) {
            // Get by Name
            needle = ctrlIndex.Name[needle][0];
            if (hssdp) {
                // Get by Name and Datapoint
                if (ctrlObjects[needle].DPs) {
                    return ctrlObjects[needle].DPs[hssdp];
                } else {
                    return false;
                }
            }
        } else if (ctrlIndex.Address[needle]) {
            needle = ctrlIndex.Address[needle][0];
            if (hssdp) {
                // Get by Channel-Address and Datapoint
                if (ctrlObjects[needle].DPs && ctrlObjects[needle].DPs[hssdp]) {
                    needle = ctrlObjects[needle].DPs[hssdp];
                }
            }
        } else if (needle.match(/[a-zA-Z-]+\.[0-9A-Za-z-]+:[0-9]+\.[A-Z_]+/)) {
            // Get by full BidCos-Address
            addrArr = needle.split(".");
            if (ctrlIndex.Address[addrArr[1]]) {
                needle = ctrlObjects[ctrlIndex.Address[addrArr[1]]].DPs[addArr[2]];
            }
        } else {
            return false;
        }
    }
    return needle;

}

function restApiPost(req, res) {
    var path = req.params[0];
    var tmpArr = path.split("/");
    var command = tmpArr[0];
    var response;

    var responseType = "json";
    var status = 500;

    res.set("Access-Control-Allow-Origin", "*");

    switch(command) {
        case "setBulk":
            response = [];
            status = 200;
            for (var item in req.body) {
                var parts = item.split("/");
                var dp = findDatapoint(parts[0], parts[1]);
                if (dp == false) {
                    sres = {error: "datapoint "+item+" not found"};
                } else if (req.body[item] === undefined) {
                    sres = {error: "no value given for "+item};
                } else {
                    sres = {id:dp,value:req.body[item]};
                    setState(dp,req.body[item]);
                }
                response.push(sres);
            }
            break;
        default:
            response = {error: "command "+command+" unknown"};
    }
    switch (responseType) {
        case "json":
            res.json(response);
            break;
        case "plain":
            res.set('Content-Type', 'text/plain');
            res.send(response);
            break;

    }
}

function restApi(req, res) {

    var path = req.params[0];
    var tmpArr = path.split("/");
    var command = tmpArr[0];
    var response;

    var responseType = "json";
    var status = 500;

    res.set("Access-Control-Allow-Origin", "*");

    switch(command) {
        case "getPlainValue":
            responseType = "plain";
            if (!tmpArr[1]) {
                response = "error: no datapoint given";
                break;
            }
            var dp = findDatapoint(tmpArr[1], tmpArr[2]);
            if (!dp || !datapoints[dp]) {
                response = "error: datapoint not found";
            } else {
                response = String(datapoints[dp][0]);
                status = 200;
            }
            break;
        case "get":

            if (!tmpArr[1]) {
                response = {error: "no object/datapoint given"};
                break;
            }
            var dp_ = findDatapoint(tmpArr[1], tmpArr[2]);
            if (!dp_) {
                response = {error: "object/datapoint not found"};
            } else {
                status = 200;
                response = {id: dp_};
                if (datapoints[dp_]) {
                    response.value      = datapoints[dp_][0];
                    response.ack        = datapoints[dp_][2];
                    response.timestamp  = datapoints[dp_][1];
                    response.lastchange = datapoints[dp_][3];
                }
                if (ctrlObjects[dp_]) {
                    for (var attr in ctrlObjects[dp_]) {
                        response[attr] = ctrlObjects[dp_][attr];
                    }
                }
            }
            break;
        case "getBulk":
            if (!tmpArr[1]) {
                response = {error: "no datapoints given"};
                break;
            }
            status = 200;
            response = {};
            var dps = tmpArr[1].split(",");
            for (var i = 0; i < dps.length; i++) {
                var parts = dps[i].split(";");
                dp = findDatapoint(parts[0], parts[1]);
                if (dp) {
                    response[dps[i]] = {"val":datapoints[dp][0], "ts":datapoints[dp][3]};
                }
            }
            break;
        case "set":
            if (!tmpArr[1]) {
                response = {error: "object/datapoint not given"};
            }
            var dp = findDatapoint(tmpArr[1], tmpArr[2]);
            var value;
            if (req.query) {
                value = req.query.value;
            }
            if (!value) {
                response = {error: "no value given"};
            } else {
                if (value === "true") {
                    value = true;
                } else if (value === "false") {
                    value = false;
                } else if (!isNaN(value)) {
                    value = parseFloat(value);
                }
                setState(dp, value);
                status = 200;
                response = {id:dp,value:value};
            }
            break;
        case "toggle":
            if (!tmpArr[1]) {
                response = {error: "object/datapoint not given"};
            }
            var dp = findDatapoint(tmpArr[1], tmpArr[2]);
                var value = datapoints[dp][0];
                if (value === true) value = 1;
                if (value === false) value = 0;
                value = 1 - parseInt(value, 10);
                setState(dp, value);
                status = 200;
                response = {id:dp,value:value};
            break;
        case "setBulk":
            response = [];
            status = 200;
            for (var item in req.query) {
                var parts = item.split("/");
                var dp = findDatapoint(parts[0], parts[1]);
                if (dp == false) {
                    sres = {error: "datapoint "+item+" not found"};
                } else if (req.query[item] === undefined) {
                    sres = {error: "no value given for "+item};
                } else {
                    sres = {id:dp,value:req.query[item]};
                    setState(dp,req.query[item]);
                }
                response.push(sres);
            }
            break;
        case "programExecute":
            if (!tmpArr[1]) {
                response = {error: "no program given"};
            }
            var id;
            if (ctrlIndex.Program && ctrlIndex.PROGRAM.indexOf(tmpArr[1]) != -1) {
                id = tmpArr[1]
            } else if (ctrlIndex.Name && ctrlIndex.Name[tmpArr[1]]) {
                if (ctrlObjects[tmpArr[1]].TypeName == "PROGRAM") {
                    id = ctrlIndex.Name[tmpArr[1]][0];
                }
            }
            if (!id) {
                response = {error: "program not found"};
            } else {
                status = 200;
                programExecute(id);
                response = {id:id};
            }
            break;
        case "getIndex":
            response = ctrlIndex;
            status = 200;
            break;
        case "getObjects":
            response = ctrlObjects;
            status = 200;
            break;
        case "getDatapoints":
            response = datapoints;
            status = 200;
            break;
        default:
            response = {error: "command "+command+" unknown"};
    }
    switch (responseType) {
        case "json":
            res.json(response);
            break;
        case "plain":
            res.set('Content-Type', 'text/plain');
            res.send(response);
            break;

    }

}

function initExtensions() {
    if (!extDone) {
        extDone = true;
        setTimeout(startAdapters, 45000);
    }
}

function initWebserver() {
    if (app) {
        if (settings.useCache) {
            var oneYear = 30758400000;
            app.use('/', express.static(__dirname + '/www', { maxAge: oneYear }));
            app.use('/log', express.static(__dirname + '/log', { maxAge: oneYear }));
        }
        else {
            app.use('/', express.static(__dirname + '/www'));
            app.use('/log', express.static(__dirname + '/log'));
        }

        // File Uploads
        app.use(express.bodyParser({uploadDir:__dirname+'/tmp'}));
        app.post('/upload', uploadParser);

        app.get('/api/*', restApi);

        app.post('/api/*', restApiPost);
        app.get('/auth/*', function (req, res) {
            res.set('Content-Type', 'text/javascript');
            if (settings.authentication.enabled) {
                res.send("var socketSession='"+ authHash+"';");
            } else {
                res.send("var socketSession='nokey';");
            }
        });
        app.get('/lang/*', function (req, res) {
            res.set('Content-Type', 'text/javascript');
			res.send("var ccuIoLang='"+ (settings.language || 'en') +"';");
        });    
	}

    if (appSsl) {
        if (settings.useCache) {
            var oneYear_ = 30758400000;
            appSsl.use('/', express.static(__dirname + '/www', { maxAge: oneYear_ }));
            appSsl.use('/log', express.static(__dirname + '/log', { maxAge: oneYear_ }));
        }
        else {
            appSsl.use('/', express.static(__dirname + '/www'));
            appSsl.use('/log', express.static(__dirname + '/log'));
        }

        // File Uploads
        appSsl.use(express.bodyParser({uploadDir:__dirname+'/tmp'}));
        appSsl.post('/upload', uploadParser);

        appSsl.get('/api/*', restApi);
        appSsl.post('/api/*', restApiPost);
        appSsl.get('/auth/*', function (req, res) {
            res.set('Content-Type', 'text/javascript');
            if (settings.authentication.enabledSsl) {
                res.send("var socketSession='"+ authHash+"';");
            } else {
                res.send("var socketSession='nokey';");
            }
        });
        appSsl.get('/lang/*', function (req, res) {
            res.set('Content-Type', 'text/javascript');
			res.send("var ccuIoLang='"+ (settings.language || 'en') +"';");
        });    
    }

    if (settings.authentication && settings.authentication.enabled) {
        logger.info("webserver     basic auth enabled");
    }

    if (server) {
        server.listen(settings.ioListenPort);
        logger.info("webserver     listening on port "+settings.ioListenPort);
        io = socketio.listen(server);
        io.set('logger', { debug: function(obj) {logger.debug("socket.io: "+obj)}, info: function(obj) {logger.debug("socket.io: "+obj)} , error: function(obj) {logger.error("socket.io: "+obj)}, warn: function(obj) {logger.warn("socket.io: "+obj)} });
        initSocketIO(io);
    }

    if (serverSsl){
        serverSsl.listen(settings.ioListenPortSsl);
        logger.info("webserver ssl listening on port "+settings.ioListenPortSsl);
        ioSsl = socketio.listen(serverSsl);
        ioSsl.set('logger', { debug: function(obj) {logger.debug("socket.io: "+obj)}, info: function(obj) {logger.debug("socket.io: "+obj)} , error: function(obj) {logger.error("socket.io: "+obj)}, warn: function(obj) {logger.warn("socket.io: "+obj)} });
        initSocketIO(ioSsl);

    }
    webserverUp = true;
}

function formatTimestamp() {
    var timestamp = new Date();
    return timestamp.getFullYear()                                + '-' +
        ("0" + (timestamp.getMonth() + 1).toString(10)).slice(-2) + '-' +
        ("0" + (timestamp.getDate()).toString(10)).slice(-2)      + ' ' +
        ("0" + (timestamp.getHours()).toString(10)).slice(-2)     + ':' +
        ("0" + (timestamp.getMinutes()).toString(10)).slice(-2)   + ':' +
        ("0" + (timestamp.getSeconds()).toString(10)).slice(-2);
}

function programExecute(id, callback) {
    if (io) {
        io.sockets.emit("ccuProgramExecute", id);
    }
    if (ioSsl) {
        ioSsl.sockets.emit("ccuProgramExecute", id);
    }
    if (callback)
        callback (id);
}

function setState(id,val,ts,ack, callback) {
    logger.verbose("socket.io <-- setState id="+id+" val="+val+" ts="+ts+" ack="+ack);
    if (!ts) {
        ts = formatTimestamp();
    }

    // If ReGa id (0-65534)
    if (id < 65535 && !ack) {
        if (io) {
            io.sockets.emit("ccuSetState", id,val,ts,ack);
        }
        if (ioSsl) {
            ioSsl.sockets.emit("ccuSetState", id,val,ts,ack);
        }
    }

    setDatapoint (id, val, ts, ack);

    // Virtual Datapoint
    if (id > 65535) {
       // cacheLog(uxTime+" "+id+" "+JSON.stringify(val)+"\n");
        //devLog(null, id, val);
        if (callback) {
            callback();
        }
    }
}

function clearCcuData() {
    for (var obj in ctrlObjects) {
        if (parseInt(obj, 10) < 65535) {
            delete ctrlObjects[obj];
        }
    }
    for (var item in ctrlIndex.Name) {
        if (ctrlIndex.Name[item][0] < 65535) {
            delete ctrlIndex.Name[item];
        }
    }
    for (var item in ctrlIndex.Address) {
        if (ctrlIndex.Address[item][0] < 65535) {
            delete ctrlIndex.Address[item];
        }
    }

    var tmpArr = [];
    for (var i = 0; i < ctrlIndex.HSSDP.length; i++) {
        if (ctrlIndex.HSSDP[i] > 65535) {
            tmpArr.push(ctrlIndex.HSSDP[i]);
        }
    }
    ctrlIndex.HSSDP = tmpArr;

    var tmpArr = [];
    for (var i = 0; i < ctrlIndex.ALDP.length; i++) {
        if (ctrlIndex.ALDP[i] > 65535) {
            tmpArr.push(ctrlIndex.ALDP[i]);
        }
    }
    ctrlIndex.ALDP = tmpArr;

    var tmpArr = [];
    for (var i = 0; i < ctrlIndex.ALARMDP.length; i++) {
        if (ctrlIndex.ALARMDP[i] > 65535) {
            tmpArr.push(ctrlIndex.ALARMDP[i]);
        }
    }
    ctrlIndex.ALARMDP = tmpArr;

    var tmpArr = [];
    for (var i = 0; i < ctrlIndex.VARDP.length; i++) {
        if (ctrlIndex.VARDP[i] > 65535) {
            tmpArr.push(ctrlIndex.VARDP[i]);
        }
    }
    ctrlIndex.VARDP = tmpArr;

    var tmpArr = [];
    for (var i = 0; i < ctrlIndex.FAVORITE.length; i++) {
        if (ctrlIndex.FAVORITE[i] > 65535) {
            tmpArr.push(ctrlIndex.FAVORITE[i]);
        }
    }
    ctrlIndex.FAVORITE = tmpArr;

    var tmpArr = [];
    for (var i = 0; i < ctrlIndex.ENUM_ROOMS.length; i++) {
        if (ctrlIndex.ENUM_ROOMS[i] > 65535) {
            tmpArr.push(ctrlIndex.ENUM_ROOMS[i]);
        }
    }
    ctrlIndex.ENUM_ROOMS = tmpArr;

    var tmpArr = [];
    for (var i = 0; i < ctrlIndex.ENUM_FUNCTIONS.length; i++) {
        if (ctrlIndex.ENUM_FUNCTIONS[i] > 65535) {
            tmpArr.push(ctrlIndex.ENUM_FUNCTIONS[i]);
        }
    }
    ctrlIndex.ENUM_FUNCTIONS = tmpArr;

    var tmpArr = [];
    for (var i = 0; i < ctrlIndex.DEVICE.length; i++) {
        if (ctrlIndex.DEVICE[i] > 65535) {
            tmpArr.push(ctrlIndex.DEVICE[i]);
        }
    }
    ctrlIndex.DEVICE = tmpArr;

    var tmpArr = [];
    for (var i = 0; i < ctrlIndex.CHANNEL.length; i++) {
        if (ctrlIndex.CHANNEL[i] > 65535) {
            tmpArr.push(ctrlIndex.CHANNEL[i]);
        }
    }
    ctrlIndex.CHANNEL = tmpArr;

    var tmpArr = [];
    for (var i = 0; i < ctrlIndex.PROGRAM.length; i++) {
        if (ctrlIndex.PROGRAM[i] > 65535) {
            tmpArr.push(ctrlIndex.PROGRAM[i]);
        }
    }
    ctrlIndex.PROGRAM = tmpArr;
}

function mergeTrees (type, isClear, newObjects, newIndex, newDatapoints) {
    if (type == "ccu" && isClear) {
        clearCcuData ();
    }
    if (newObjects) {
        for (var obj in newObjects) {
            ctrlObjects[obj] = newObjects[obj];
        }
    }

    if (newIndex) {
        for (var subTable in newIndex) {
            // Merge array
            if (typeof ctrlIndex[subTable] == "array") {
                for (var i = 0; i < newIndex[subTable].length; i++) {
                    if (ctrlIndex[subTable].indexOf (newIndex[subTable][i]) == -1) {
                        ctrlIndex[subTable].push(newIndex[subTable][i]);
                    }
                }
            }
            // Merge objects
            else {
                for (var obj_ in newIndex[subTable]) {
                    ctrlIndex[subTable][obj_] = newIndex[subTable][obj_];
                }
            }
        }
    }

    if (newDatapoints) {
        for (var dp in newDatapoints) {
            if (newDatapoints[dp]) {
                setDatapoint(dp, newDatapoints[dp][0], newDatapoints[dp][1], newDatapoints[dp][2], newDatapoints[dp][3]);
            }
        }
    }
}

function initSocketIO(_io) {
	_io.configure(function (){
	  this.set('authorization', function (handshakeData, callback) {
        var isHttps = (serverSsl !== undefined && this.server == serverSsl);
        if ((!isHttps && settings.authentication.enabled) || (isHttps && settings.authentication.enabledSsl)) {
            // do not check if localhost
            if(handshakeData.address.address.toString() == "127.0.0.1") {
                logger.verbose("node.control  local authetication " + handshakeData.address.address);
                callback(null, true);
            } else
            if (handshakeData.query["key"] === undefined || handshakeData.query["key"] != authHash) {
                logger.warn("node.control  authetication error on "+(isHttps ? "https from " : "http from ") + handshakeData.address.address);
                callback ("Invalid session key", false);
            } else{
                logger.verbose("node.control  authetication successful on "+(isHttps ? "https from " : "http from ") + handshakeData.address.address);
                callback(null, true);
            }
        }
        else {
           callback(null, true);
        }
	  });
	});

    _io.sockets.on('connection', function (socket) {
        socketlist.push(socket);
        var address = socket.handshake.address;
        logger.verbose("socket.io <-- " + address.address + ":" + address.port + " " + socket.transport + " connected");

        socket.on('log', function (sev, msg) {
           switch (sev) {
               case "info":
                   logger.info(msg);
                   break;
               case "warn":
                   logger.warn(msg);
                   break;
               case "error":
                   logger.error(msg);
           }
        });

        socket.on('execCmd', function (cmd, callback) {
            logger.info("node.control  exec "+cmd);
            childProcess.exec(cmd, callback);
        });

        socket.on('execScript', function (script, arg, callback) {
            logger.info("node.control  script "+script + "["+arg+"]");
            var scr_prc = childProcess.fork (__dirname + script, arg);
            var result = null;
            scr_prc.on('message', function(obj) {
                // Receive results from child process
                console.log ("Message: " + obj);
				logger.debug("node.control  script result: " + obj);
                result = obj;
            });
            scr_prc.on ("exit", function (code, signal) {
                if (callback) {
					logger.debug("node.control  script end result: " + result);
                    callback (script, arg, result);
                }
            });
        });

        socket.on('restartAdapter', function (adapter) {
           return restartAdapter(adapter)
        });

        socket.on('updateAddon', function (url, name) {
            var path = __dirname + "/update-addon.js";
            logger.info("node.control  starting "+path+" "+url+" "+name);
            var updateProcess = childProcess.fork(path, [url, name]);
            updateProcess.on("close", function (code) {
                var msg;
                if (code == 0) {
                    msg = " done.";
                } else {
                    msg = " failed.";
                }
                if (io) {
                    io.sockets.emit("ioMessage", "Update "+name+msg);
                }
                if (ioSsl) {
                    ioSsl.sockets.emit("ioMessage", "Update "+name+msg);
                }
            });
        });

        socket.on('updateSelf', function () {
            var path = __dirname + "/update-self.js";
            settings.updateSelfRunning = true;
            logger.info("node.control  starting "+path);
            var updateProcess = childProcess.fork(path);
            if (io) {
                io.sockets.emit("ioMessage", "Update started. Please be patient...");
            }
            if (ioSsl) {
                ioSsl.sockets.emit("ioMessage", "Update started. Please be patient...");
            }
            updateProcess.on("close", function (code) {
                settings.updateSelfRunning = false;
                if (code == 0) {
                    if (io) {
                        io.sockets.emit("ioMessage", "Update done. Restarting...");
                    }
                    if (ioSsl) {
                        ioSsl.sockets.emit("ioMessage", "Update done. Restarting...");
                    }
                    logger.info("node.control  update done. restarting...");
                    childProcess.fork(__dirname+"/ccu.io-server.js", ["restart"]);
                } else {
                    logger.error("node.control  update failed.");
                    if (io) {
                        io.sockets.emit("ioMessage", "Error: update failed.");
                    }
                    if (ioSsl) {
                        ioSsl.sockets.emit("ioMessage", "Error: update failed.");
                    }
                }

            });
        });

        socket.on('createBackup', function (isWithLog) {
            var path = __dirname + "/backup.js";
            logger.info("node.control  starting "+path);
            var backupProcess = childProcess.fork(path, [isWithLog ? "createWithLog": "create"]);
            var fileName = "";
            backupProcess.on("message", function (msg) {
                fileName = msg;
            });
            if (io) {
                io.sockets.emit("ioMessage", "Backup started. Please be patient...");
            }
            if (ioSsl) {
                ioSsl.sockets.emit("ioMessage", "Backup started. Please be patient...");
            }
            backupProcess.on("close", function (code) {
                if (code == 0) {
                    if (io) {
                        io.sockets.emit("readyBackup", fileName);
                    }
                    if (ioSsl) {
                        ioSsl.sockets.emit("readyBackup", fileName);
                    }
                } else {
                    logger.error("node.control  Backup failed.");
                    if (io) {
                        io.sockets.emit("ioMessage", "Error: Backup failed.");
                    }
                    if (ioSsl) {
                        ioSsl.sockets.emit("ioMessage", "Error: Backup failed.");
                    }
                }
            });
        });

        socket.on('applyBackup', function (fileName) {
            var path = __dirname + "/backup.js";
            logger.info("node.control  starting "+path);
            var backupProcess = childProcess.fork(path, [fileName]);

            if (io) {
                io.sockets.emit("ioMessage", "Apply backup started. Please be patient...");
            }
            if (ioSsl) {
                ioSsl.sockets.emit("ioMessage", "Apply backup started. Please be patient...");
            }
            backupProcess.on("close", function (code) {
                if (code == 0) {
                    if (io) {
                        io.sockets.emit("applyReady", "Apply backup done. Restart CCU.IO");
                    }
                    if (ioSsl) {
                        ioSsl.sockets.emit("applyReady", "Apply backup done. Restart CCU.IO");
                    }
                } else {
                    logger.error("node.control  Apply backup failed.");
                    if (io) {
                        io.sockets.emit("applyError", "Error: Backup failed.");
                    }
                    if (ioSsl) {
                        ioSsl.sockets.emit("applyError", "Error: Backup failed.");
                    }
                }
            });
        });

        socket.on('refreshAddons', function () {
            if (io) {
                io.sockets.emit("refreshAddons");
            }
            if (ioSsl) {
                ioSsl.sockets.emit("refreshAddons");
            }
        });

        socket.on('reloadData', function () {
            logger.info("socket.io --> broadcast reload")
            if (io) {
                io.sockets.emit("reloadData");
            }
            if (ioSsl) {
                ioSsl.sockets.emit("reloadData");
            }
        });

        socket.on('newData', function (newObjects, newIndex, newDatapoints){
            mergeTrees ("ccu", true, newObjects, newIndex, newDatapoints);
        });

        socket.on('setStates', function (newDatapoints){
            mergeTrees (null, false, null, null, newDatapoints);
        });
        socket.on('devLog', function (timeStamp, id, val){
            devLog (timeStamp, id, val);
        });

        socket.on('reloadDataReady', function () {
            if (io) {
                io.sockets.emit("reload");
            }
            if (ioSsl) {
                ioSsl.sockets.emit("reload");
            }
        });

        socket.on('restart', function () {
            logger.info("node.control  received restart command");
            childProcess.fork(__dirname+"/ccu.io-server.js", ["restart"]);
        });

        socket.on('ccuRestartRPC', function () {
            if (io) {
                io.sockets.emit("ccuRestartRPC");
            }
            else
            if (ioSsl) {
                ioSsl.sockets.emit("ccuRestartRPC");
            }
        });

        socket.on('reloadScriptEngine', function (callback) {
            if (settings.scriptEngineEnabled) {
                childScriptEngine.kill();
                setTimeout(function () {
                    startScriptEngine();
                    if (callback) {
                        callback();
                    }
                }, 1500);
            }
        });

        socket.on('readdir', function (path, callback) {
            path = __dirname+"/"+path;
            logger.verbose("socket.io <-- readdir "+path);
            fs.readdir(path, function (err, data) {
                if (err) {
                    callback(undefined);
                } else {
                    callback(data);
                }
            });
        });

        socket.on('readdirStat', function(path, callback) {
            path = __dirname + "/" + path;
            logger.verbose("socket.io <-- readdirStat " + path);

            fs.readdir(path, function(err, files) {
                var data = [];
                if (err) {
                    callback(undefined);
                }
                if (files.length == 0) {
                    callback(undefined);
                } else {
                    files.forEach(function(file) {
                        fs.stat(path + file, function(err, stats) {
                            data.push({
                                "file": file,
                                "stats": stats
                            });
                            if (data.length == files.length) {
                                callback(data);
                                logger.info(data);
                            }
                        });
                    });
                }
            });
        });

        socket.on('writeFile', function (name, obj, callback) {
            var content = JSON.stringify(obj);
            logger.verbose("socket.io <-- writeFile "+name+" "+content);
            fs.writeFile(settings.datastorePath+name, content);
            // Todo Fehler abfangen
            if (callback) { callback(); }
        });

        socket.on('writeRawFile', function (path, content, callback) {
            logger.verbose("socket.io <-- writeRawFile "+path);
            fs.writeFile(__dirname+"/"+path, content);
            // Todo Fehler abfangen
            if (callback) { callback(); }
        });

        socket.on('readFile', function (name, callback) {
            logger.verbose("socket.io <-- readFile "+name);

            fs.readFile(settings.datastorePath+name, function (err, data) {
                if (err) {
                    logger.error("node.control  failed loading file "+settings.datastorePath+name);
                    callback(undefined);
                } else {
                    var obj = JSON.parse(data);
                    callback(obj);
                }
            });
        });

        socket.on('readRawFile', function (name, callback) {
            logger.verbose("socket.io <-- readFile "+name);

            fs.readFile(__dirname+"/"+name, function (err, data) {
                if (err) {
                    logger.error("node.control  failed loading file "+__dirname+"/"+name);
                    callback(undefined);
                } else {
                    callback(data.toString());
                }
            });
        });

        socket.on('touchFile', function (name, callback) {
            logger.verbose("socket.io <-- touchFile "+name);
            if (!fs.existsSync(__dirname+"/"+name)) {
                logger.info("node.control  creating empty file "+name);
                var stream = fs.createWriteStream(__dirname+"/"+name);
                stream.end();
            }
        });

        socket.on('delRawFile', function (name, callback) {
            logger.info("socket.io <-- delRawFile "+name);

            fs.unlink(__dirname+"/"+name, function (err, data) {
                if (err) {
                    logger.error("node.control  failed deleting file "+__dirname+"/"+name);
                    callback(false);
                } else {
                    callback(true);
                }
            });
        });

        socket.on('readJsonFile', function (name, callback) {
            logger.verbose("socket.io <-- readFile "+name);

            fs.readFile(__dirname+"/"+name, function (err, data) {
                if (err) {
                    logger.error("node.control  failed loading file "+__dirname+"/"+name);
                    callback(undefined);
                } else {
                    callback(JSON.parse(data));
                }
            });
        });

        socket.on('getUrl', function (url, callback) {
            logger.info("node.control  GET "+url);
            if (url.match(/^https/)) {
                https.get(url, function(res) {
                    var body = "";
                    res.on("data", function (data) {
                        body += data;
                    });
                    res.on("end", function () {
                        callback(body);
                    });

                }).on('error', function(e) {
                        logger.error("node.control  GET "+url+" "+ e.message);
                    });
            } else {
                http.get(url, function(res) {
                    var body = "";
                    res.on("data", function (data) {
                        body += data;
                    });
                    res.on("end", function () {
                        callback(body);
                    });
                }).on('error', function(e) {
                    logger.error("node.control  GET "+url+" "+ e.message);
                });
            }
        });

        socket.on('getStatus', function (callback) {
            callback(staties);
        });

        socket.on('setStatus', function (obj, value) {
            if (typeof obj == "object") {
                for (var n in obj) {
                    staties[n] = obj[n];
                }
            }
            else {
                staties[obj] = value;
            }
            updateStatus ();
        });

        socket.on('getNextId', function (start, callback) {
            callback(nextId(start));
        });

        socket.on('getSettings', function (callback) {
            callback(settings);
        });

        socket.on('getVersion', function(callback) {
            callback(settings.version);
        });

        socket.on('getDatapoints', function(callback) {
            logger.verbose("socket.io <-- getData");

            callback(datapoints);
        });

        socket.on('getDatapoint', function(id, callback) {
            logger.verbose("socket.io <-- getDatapoint " + id);

            callback(id, datapoints[id]);
        });
		
        socket.on('getObjects', function(callback) {
            logger.verbose("socket.io <-- getObjects");
            callback(ctrlObjects);
        });

        socket.on('getIndex', function(callback) {
            logger.verbose("socket.io <-- getIndex");
            callback(ctrlIndex);
        });

        socket.on('getStringtable', function(callback) {
            logger.verbose("socket.io <-- getStringtable");
            callback(stringtable);
        });

        socket.on('setStringtable', function(strTable) {
            logger.verbose("socket.io <-- getStringtable");
            stringtable = strTable;
        });

        socket.on('setStats', function(name, value) {
            stats.counters[name].value = value;
        });

        socket.on('addStringVariable', function(name, desc, str, callback) {
            logger.verbose("socket.io <-- addStringVariable");
            regahss.addStringVariable(name, desc, str, function (id) {
                if (id) {
                    var ts = formatTimestamp();
                    datapoints[id] = [str, ts, true];
                    ctrlObjects[id] = {Name:name, TypeName: "VARDP", DPInfo: "DESC", ValueType: 20, ValueSubType: 11};
                    ctrlIndex.VARDP.push(id);
                    ctrlIndex.Name[id] = [13305, "VARDP", null];
                    logger.info("node.control  added string variable "+id+" "+name);
                }
                callback(id);
            });
        });

        function nextEnumId() {
            var id = 66000;
            while (ctrlObjects[id]) {
                id += 1;
            }
            return id;
        }
        function nextId(id) {
            var id = id || 100000;
            while (ctrlObjects[id]) {
                id += 1;
            }
            return id;
        }
        
        function setObject(id, obj, callback) {
            if (!obj) {
                return;
            }
            if (obj._findNextId) {
                delete obj._findNextId;
                while (ctrlObjects[id]) {
                    id += 1;
                }
            }
            if (obj.rooms) {
                for (var i = 0; i < obj.rooms.length; i++) {
                    if (obj.rooms[i] === "") {
                        continue;
                    }
                    var roomId;
                    if (ctrlIndex.ENUM_ROOMS.indexOf(obj.rooms[i]) != -1) {
                        roomId = obj.rooms[i];
                    } else if (ctrlIndex.Name[obj.rooms[i]] && ctrlIndex.Name[obj.rooms[i]][1] == "ENUM_ROOMS") {
                        roomId = ctrlIndex.Name[obj.rooms[i]][0];
                    } else {
                        roomId = nextId(66000);
                        ctrlIndex.ENUM_ROOMS.push(roomId);
                        if (!ctrlIndex.Name[obj.rooms[i]]) {
                            ctrlIndex.Name[obj.rooms[i]] = [
                                roomId, "ENUM_ROOMS", null
                            ];
                        }
                        ctrlObjects[roomId] = {
                            "Name": obj.rooms[i],
                            "TypeName": "ENUM_ROOMS",
                            "EnumInfo": "",
                            "Channels": []
                        };
                        logger.info("node.control  setObject room "+obj.rooms[i]+" created");
                    }
                    if (roomId && ctrlObjects[roomId].Channels.indexOf(id) == -1) {
                        ctrlObjects[roomId].Channels.push(id);
                    }
                }
                delete obj.rooms
            }
            if (obj.funcs) {
                for (var i = 0; i < obj.funcs.length; i++) {
                    if (obj.funcs[i] === "") {
                        continue;
                    }
                    var funcId;
                    if (ctrlIndex.ENUM_FUNCTIONS.indexOf(obj.funcs[i]) != -1) {
                        funcId = obj.funcs[i];
                    } else if (ctrlIndex.Name[obj.funcs[i]] && ctrlIndex.Name[obj.funcs[i]][1] == "ENUM_FUNCTIONS") {
                        funcId = ctrlIndex.Name[obj.funcs[i]][0];
                    } else {
                        funcId = nextId(66000);
                        ctrlIndex.ENUM_FUNCTIONS.push(funcId);
                        if (!ctrlIndex.Name[obj.funcs[i]]) {
                            ctrlIndex.Name[obj.funcs[i]] = [
                                funcId, "ENUM_FUNCTIONS", null
                            ];
                        }
                        ctrlObjects[funcId] = {
                            "Name": obj.funcs[i],
                            "TypeName": "ENUM_FUNCTIONS",
                            "EnumInfo": "",
                            "Channels": []
                        };
                        logger.info("node.control  setObject function "+obj.funcs[i]+" created");
                    }
                    if (funcId && ctrlObjects[funcId].Channels.indexOf(id) == -1) {
                        ctrlObjects[funcId].Channels.push(id);
                    }
                }
                delete obj.funcs;
            }
            if (obj.favs) {
                for (var i = 0; i < obj.favs.length; i++) {
                    if (obj.favs[i] === "") {
                        continue;
                    }
                    var favId;
                    if (ctrlIndex.FAVORITE.indexOf(obj.favs[i]) != -1) {
                        favId = obj.favs[i];
                    } else if (ctrlIndex.Name[obj.favs[i]] && ctrlIndex.Name[obj.favs[i]][1] == "FAVORITE") {
                        favId = ctrlIndex.Name[obj.favs[i]][0];
                    } else {
                        favId = nextId(66000);
                        ctrlIndex.FAVORITE.push(favId);
                        if (!ctrlIndex.Name[obj.favs[i]]) {
                            ctrlIndex.Name[obj.favs[i]] = [
                                favId, "ENUM_FUNCTIONS", null
                            ];
                        }
                        ctrlObjects[favId] = {
                            "Name": obj.favs[i],
                            "TypeName": "FAVORITE",
                            "EnumInfo": "",
                            "Channels": []
                        };
                        logger.info("node.control  setObject favorite "+obj.favs[i]+" created");
                    }
                    if (favId && ctrlObjects[favId].Channels.indexOf(id) == -1) {
                        ctrlObjects[favId].Channels.push(id);
                    }
                }
                delete obj.favs;
            }

            if (obj.TypeName) {
                if (!ctrlIndex[obj.TypeName]) {
                    ctrlIndex[obj.TypeName] = [];
                }
                if (ctrlIndex[obj.TypeName].indexOf(id) == -1) {
                    ctrlIndex[obj.TypeName].push(id);
                }
            }

            if (obj.Name) {
                ctrlIndex.Name[obj.Name] = [id, obj.TypeName, obj.Parent];
            }

            if (obj.Address) {
                ctrlIndex.Address[obj.Address] = [id, obj.TypeName, obj.Parent];
            }
            if (obj.TypeName && obj.TypeName.match(/DP$/)) {
                if (!obj.ValueUnit) {
                    obj.ValueUnit = "";
                }
                if (!datapoints[id] || obj.Value) {
                    logger.verbose("node.control  adding dp "+id);
                    datapoints[id] = [obj.Value, formatTimestamp()];
                }
            }

            ctrlObjects[id] = obj;

            if (callback) {
                callback(id);
            }
        }
        
        socket.on('setObject', setObject);

        // Eine Homematic Servicemeldung bestätigen
        socket.on('alarmReceipt', function (id) {
            if (io) {
                io.sockets.emit("ccuAlarmReceipt", id);
            }
            else
            if (ioSsl) {
                ioSsl.sockets.emit("ccuAlarmReceipt", id);
            }
        });

        socket.on('setState', function(arr, callback) {
            // Todo Delay!

            logger.info("setState"+JSON.stringify(arr));

            var id =    arr[0],
                val =   arr[1],
                ts =    arr[2],
                ack =   arr[3];

            if (typeof id == "string") {
                if (ctrlIndex.Name[id]) {
                    id = ctrlIndex.Name[id][0];
                } else if (ctrlIndex.Address[id]) {
                    id = ctrlIndex.Address[id][0];
                }
            }

            //logger.info("setState"+JSON.stringify(arr));

            setState(id,val,ts,ack, callback);

        });

        socket.on('programExecute', function (id, callback) {
            if (io) {
                io.sockets.emit("ccuProgramExecute", id, function () {
                    if (callback) {
                        callback ();
                    }
                });
            }
            else
            if (ioSsl) {
                ioSsl.sockets.emit("ccuProgramExecute", id, function () {
                    if (callback) {
                        callback ();
                    }
                });
            }
        });

        socket.on('runScript', function(script, callback) {
            if (io) {
                io.sockets.emit("ccuRunScript", script, function (data) {
                    if (callback) {
                        callback (data);
                    }
                });
            }
            else
            if (ioSsl) {
                ioSsl.sockets.emit("ccuRunScript", script, function () {
                    if (callback) {
                        callback (data);
                    }
                });
            }
        });

        socket.on('disconnect', function () {
            var address = socket.handshake.address;
            logger.verbose("socket.io <-- " + address.address + ":" + address.port + " " + socket.transport + " disconnected");
            socketlist.splice(socketlist.indexOf(socket), 1);
        });

        socket.on('close', function () {
            var address = socket.handshake.address;
            logger.verbose("socket.io <-- " + address.address + ":" + address.port + " " + socket.transport + " closed");
            socketlist.splice(socketlist.indexOf(socket), 1);
        });
    });
}

function startScriptEngine() {
    var path = __dirname + "/script-engine.js";
    logger.info("node.control  starting script-engine");
    childScriptEngine = childProcess.fork(path);
}

function restartAdapter(adapter) {
    if (!settings.adapters[adapter].enabled) {
        return "Error: Adapter not enabled";
    }
    //logger.info("node.control  found adapter "+adapter);
    var mode = settings.adapters[adapter].mode;
    var period = settings.adapters[adapter].period * 60000;

    var path = __dirname + "/adapter/"+adapter+"/"+adapter+".js";

    switch (mode) {
        case "periodical":
            clearTimeout(timerAdapter[adapter]);
            setTimeout(function (_path, _period, _adapter) {
                startAdapterPeriod(_path, _period);
                logger.info("node.control  adapter "+_adapter+" timer restarted");
            }, 50, path, period, adapter);
            return "adapter "+adapter+" timer restarted";
            break;

        default:
            logger.info("node.control  killing adapter "+adapter);

            try {
                childrenAdapter[adapter].process.kill();
            } catch (e) {

            }
            setTimeout(function (_path, _adapter) {
                logger.info("node.control  starting adapter "+_path);
                childrenAdapter[_adapter] = childProcess.fork(_path);
                return "adapter "+_adapter+" timer restartet";
            }, 1000, path, adapter);
    }


    return "Adapter restarted";
}

function startAdapters () {
    if (!settings.adapters) {
        return false;
    }
    var i = 0;
    for (adapter in settings.adapters) {
        if (!settings.adapters[adapter] || !settings.adapters[adapter].enabled) {
            continue;
        }
        //logger.info("node.control  found adapter "+adapter);
        var mode = settings.adapters[adapter].mode;
        var period = settings.adapters[adapter].period * 60000;

        var path = __dirname + "/adapter/"+adapter+"/"+adapter+".js";

        if (!childrenAdapter[adapter]) {
            childrenAdapter[adapter] = {};
        }

        switch (mode) {
            case "periodical":
                setTimeout(function (_path, _period, _adapter) {
                    startAdapterPeriod(_path, _period, _adapter);
                }, (i*3000), path, period, adapter);
                break;

            default:
                setTimeout(function (_path, _adapter) {
                    logger.info("node.control  starting adapter "+_path);
                    if (!childrenAdapter[_adapter]) {
                        childrenAdapter[_adapter] = {};
                    }
                    childrenAdapter[_adapter].process = childProcess.fork(_path);
                }, (i*3000), path, adapter);
        }
        i += 1;
    }
    if (settings.scriptEngineEnabled) {
        setTimeout(startScriptEngine, (i*3000));
    }
}

function startAdapterPeriod (adapter, interval, _adapter) {
   interval = parseInt(interval, 10) || 3600000;

    if (!childrenAdapter[_adapter]) {
        childrenAdapter[_adapter] = {};
    }

   timerAdapter[_adapter] = setInterval(function () {
       logger.info("node.control  starting adapter "+adapter+" (interval="+interval+"ms)");
       childrenAdapter[_adapter].process = childProcess.fork(adapter);
   }, interval);
   logger.info("node.control  starting adapter "+adapter+" (interval="+interval+"ms)");
   childrenAdapter[_adapter].process = childProcess.fork(adapter);
}

process.on('SIGINT', function () {
    stop();
});

process.on('SIGTERM', function () {
    stop();
});

function stop() {
    saveDatapoints();
    savePersistentObjects();
    try {
        socketlist.forEach(function(socket) {
            logger.info("socket.io --> disconnecting socket");
            socket.disconnect();
        });

        if (io && io.server) {
            logger.info("node.control  closing http server");
            io.server.close();
            io.server = undefined;
        }
        if (ioSsl && ioSsl.server) {
            logger.info("node.control  closing https server");
            ioSsl.server.close();
            ioSsl.server = undefined;
        }

        if (childScriptEngine) {
            logger.info("node.control  killing script-engine");
            childScriptEngine.kill();
        }

        for (var adapter in childrenAdapter) {
            logger.info("node.control  killing adapter "+adapter);
            childrenAdapter[adapter].process.kill();
        }
    } catch (e) {
        logger.error("node.control  something went wrong while terminating: "+e)
    }


    setTimeout(quit, 500);
}

var quitCounter = 0;

function quit() {
    logger.verbose("node.control  quit");
	logger.info("node.control  uptime "+stats.uptime());
	logger.info("node.control  terminating");
	setTimeout(function () {
		process.exit(0);
	}, 250);
}

function cacheLog(str) {
    devlogCache.push(str);
}

var logMoving = [];

function writeLog() {

    if (logMoving[settings.logging.file]) {
        setTimeout(writeLog, 250);
        return false;
    }

    var tmp = devlogCache;
    devlogCache = [];

    var l = tmp.length;
    logger.verbose("node.control  writing "+l+" lines to "+settings.logging.file);

    var file = __dirname+"/log/"+settings.logging.file;

    fs.appendFile(file, tmp.join(""), function (err) {
        if (err) {
            logger.error("node.control  writing to "+settings.logging.file + " error: "+JSON.stringify(err));
        }
    });

}

function moveLog(file) {
    logMoving[file] = true;
    setTimeout(moveLog, 86400000);
    var ts = (new Date()).getTime() - 3600000;
    ts = new Date(ts);


    var timestamp = ts.getFullYear() + '-' +
        ("0" + (ts.getMonth() + 1).toString(10)).slice(-2) + '-' +
        ("0" + (ts.getDate()).toString(10)).slice(-2);

    logger.info("node.control  moving Logfile "+file+" "+timestamp);

    fs.rename(__dirname+"/log/"+file, __dirname+"/log/"+file+"."+timestamp, function() {
        logMoving[file] = false;
    });

}

function devLog(ts, id, val) {
    if (!settings.logging.enabled) {
        return;
    }
    if (!ts || (typeof ts == "string" && ts.indexOf(" ") != -1)) {
        ts = Math.round((new Date()).getTime() / 1000);
    }


    if (typeof val === "string") {
        if (val === "true") { val = true; }
        if (val === "false") { val = false; }
        if (!isNaN(val)) {
            val = parseFloat(val);
        }
    }
    cacheLog(ts+" "+id+" "+JSON.stringify(val)+"\n");
}

function savePersistentObjects() {
    var name = "io-persistent-objs.json";
    var content = JSON.parse(JSON.stringify(ctrlObjects));
    for (var id in content) {
        if (parseInt(id, 10) < 65536 || !content[id]._persistent) {
            delete content[id];
        }
    }
    fs.writeFileSync(settings.datastorePath+name, JSON.stringify(content));
    logger.info("node.control  saved persistent objects");
}

function loadPersistentObjects() {
    try {
        var x = JSON.parse(fs.readFileSync(settings.datastorePath+"io-persistent-objs.json"));
        for (var obj in x) {
            if (obj.TypeName) {
                if (!ctrlIndex[obj.TypeName]) {
                    ctrlIndex[obj.TypeName] = [];
                }
                if (ctrlIndex[obj.TypeName].indexOf(id) == -1) {
                    ctrlIndex[obj.TypeName].push(id);
                }
            }

            if (obj.Name) {
                ctrlIndex.Name[obj.Name] = [id, obj.TypeName, obj.Parent];
            }

            if (obj.Address) {
                ctrlIndex.Address[obj.Address] = [id, obj.TypeName, obj.Parent];
            }

        }
        ctrlObjects = x;
        logger.info("ccu.io        loaded persistent objects");
        return true;
    } catch (e) {
        return false;
    }
}

function saveDatapoints() {
    var name = "io-persistent-dps.json";
    var content = JSON.parse(JSON.stringify(datapoints));
    for (var id in content) {
        if (parseInt(id, 10) < 65536) {
            delete content[id];
        } else {
            content[id][2] = null;
        }
    }
    fs.writeFileSync(settings.datastorePath+name, JSON.stringify(content));
    logger.info("node.control  saved datapoints");
}

function loadDatapoints() {
    var dps;
    try {
        var x = fs.readFileSync(settings.datastorePath+"io-persistent-dps.json");
        dps = JSON.parse(x);
        datapoints = dps;
        logger.info("node.control  loaded datapoints");
        return true
    } catch (e) {
        return false;
    }
}
