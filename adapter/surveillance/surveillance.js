var settings = require(__dirname+'/../../settings.js');

if (!settings.adapters.surveillance || !settings.adapters.surveillance.enabled) {
    process.exit();
}

var logger =    require(__dirname+'/../../logger.js'),
    io =        require('socket.io-client'),
    Synology =  require('node-synology-surveillance');

var syno = null;
var configured_cams = {}
var datapoints = {}, objects = {};
var surveillanceSettings = settings.adapters.surveillance.settings;

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
    logger.info("adapter surveillance    connected to ccu.io");
});

socket.on('disconnect', function () {
    logger.info("adapter surveillance    disconnected from ccu.io");
});



initialize();
handle_events();

/**
 * Handle the events (eg. recording, enabling, disabling a camera
 */
function handle_events(){

    socket.on('event', function (obj) {
        if (!obj || !obj[0]) {
            return;
        }


        if (obj[0] == surveillanceSettings.firstId+200){
            var action = (obj[1] == 1)? "start": "stop";
            for (var i in configured_cams.ids){
                handle_recording(configured_cams.ids[i].id, action);
            }
        }

        if (obj[0] > surveillanceSettings.firstId && obj[0] < (surveillanceSettings.firstId + 200)) {
            for (var i in configured_cams.ids) {
                if (obj[0] == configured_cams.ids[i].enabled_id) {
                    action = (obj[1] == 1) ? "enable" : "disable";
                    handle_enabling(configured_cams.ids[i].id, action);
                }
            }
        }
    });
}

function handle_recording(camera_id, action){
    syno.surveillance.recording.record({cameraId: camera_id, action: action}, function(err, data){
        if (err){
            logger.err("adapter surveillance    "+err);
        }else{
            logger.info("adapter surveillance    camera ["+camera_id+"] "
                +action+"s recording ("+data.success+").");
        }
    });
}

function handle_enabling(camera_id, action){
    syno.surveillance.camera[action]({cameraIds: camera_id}, function(err, data){
        if (err){
            logger.err("adapter surveillance    "+err);
        }else{
            logger.info("adapter surveillance    camera ["+camera_id+"] "
                +"was "+action+"d ("+data.success+").");
        }
    });
}

function rec_status_listener(){
    setInterval(function(){
        syno.surveillance.camera.list(function(err, data) {
            if (err) {
                logger.error("adapter surveillance     " + err);
                stop();
            } else {
                var cams = data.data.cameras;
                for (var x in cams) {
                    var cam = cams[x];
                    setState(surveillanceSettings.firstId + (x * 20 + 5), (cam.recStatus == 0)? 0: 1);
                }
            }
        });
    }, 5000);
}

/**
 * Initializing the synology node module and setting up the datapoints
 */
function initialize(){
    syno = new Synology({
        host    : surveillanceSettings.host,
        port    : surveillanceSettings.port,
        secure  : surveillanceSettings.secure,
        user    : surveillanceSettings.user,
        password: surveillanceSettings.password
    });



    syno.surveillance.camera.list({additional: 'device'}, function(err, data){
        if (err){
            logger.error("adapter surveillance     "+err);
            stop();
        }else {
            var cams = data.data.cameras;
            configured_cams.ids = [];
            for (var x in cams) {
                var cam = cams[x];

                logger.info("adapter surveillance     setting up camera ["+cam.id+"]: "+ cam.name );
                configured_cams.ids.push({id: cam.id, enabled_id :surveillanceSettings.firstId + (x * 20 + 2)});
                setObject(surveillanceSettings.firstId + (x * 20 + 1), {
                    Name: "surveilance.camera." + cam.id + ".name",
                    TypeName: "VARDP",
                    "ValueType": 20,
                    "ValueSubType": 11
                });
                setObject(surveillanceSettings.firstId + (x * 20 + 2), {
                    Name: "surveilance.camera." + cam.id + ".enabled",
                    TypeName: "VARDP",
                    "ValueType": 2,
                    "ValueSubType": 2
                });
                setObject(surveillanceSettings.firstId + (x * 20 + 3), {
                    Name: "surveilance.camera." + cam.id + ".host",
                    TypeName: "VARDP",
                    "ValueType": 20,
                    "ValueSubType": 11
                });
                setObject(surveillanceSettings.firstId + (x * 20 + 4), {
                    Name: "surveilance.camera." + cam.id + ".status",
                    TypeName: "VARDP",
                    "ValueType": 4,
                    "ValueSubType": 0
                });
                setObject(surveillanceSettings.firstId + (x * 20 + 5), {
                    Name: "surveilance.camera." + cam.id + ".rec_status",
                    TypeName: "VARDP",
                    "ValueType": 2,
                    "ValueSubType": 2
                });
                setState(surveillanceSettings.firstId + (x * 20 + 1), cam.name);
                setState(surveillanceSettings.firstId + (x * 20 + 2), cam.enabled);
                setState(surveillanceSettings.firstId + (x * 20 + 3), cam.host);
                setState(surveillanceSettings.firstId + (x * 20 + 4), cam.status);
                setState(surveillanceSettings.firstId + (x * 20 + 5), (cam.recStatus == 0)? 0: 1);


                syno.surveillance.camera.get_snapshot_url({cameraId: cam.id}, function(err, data){
                    if (err){
                        logger.error("adapter surveillance     "+err);
                        stop();
                    }else {
                        setObject(surveillanceSettings.firstId + (x * 20 + 6), {
                            Name: "surveilance.camera." + cam.id + ".snapshot_url",
                            TypeName: "VARDP",
                            "ValueType": 20,
                            "ValueSubType": 11
                        });
                        setState(surveillanceSettings.firstId + (x * 20 + 6), data);
                    }
                });

                syno.surveillance.camera.get_videostream_url({cameraId: cam.id, format: 'mjpeg'}, function(err, data){
                    if (err){
                        logger.error("adapter surveillance     "+err);
                        stop();
                    }else {
                        setObject(surveillanceSettings.firstId + (x * 20 + 7), {
                            Name: "surveilance.camera." + cam.id + ".videostream_url",
                            TypeName: "VARDP",
                            "ValueType": 20,
                            "ValueSubType": 11
                        });
                        setState(surveillanceSettings.firstId + (x * 20 + 7), data);
                    }
                });



            }
        }
    });


    setObject(surveillanceSettings.firstId + 200, {
        Name: "surveilance.camera.action",
        TypeName: "VARDP",
        "ValueType": 2,
        "ValueSubType": 2
    });

    setTimeout(function(){
        rec_status_listener();
    }, 5000);
}

/**
 * Sets the state of an existing object in the datapoints collection
 * @param id - the id of the object the state should be changed
 * @param val - the value represents the state
 */
function setState(id, val) {
    datapoints[id] = [val];
    logger.verbose("adapter surveillance setState "+id+" "+val);
    socket.emit("setState", [id,val,null,true]);
}

/**
 * Sets an object to the collection of objects of datapoints.
 * <p>
 *     <code>
 *         setObject(123456, {
 *               Name: "OBJECT_NAME",
 *               TypeName: "VARDP"
 *           });
 *      </code>
 * </p>
 *
 * @param id - the id of the object to store
 * @param obj - the object to store
 */
function setObject(id, obj) {
    objects[id] = obj;
    if (obj.Value) {
        datapoints[obj.Name] = [obj.Value];
    }
    socket.emit("setObject", id, obj);
}

function stop() {
    logger.info("adapter surveillance   terminating");
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