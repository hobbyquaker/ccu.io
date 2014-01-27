/**
 * CCU.IO adapter for Yamaha AV receiver
 *
 * Copyright 2013 Thorsten Kamann
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

var settings = require(__dirname+'/../../settings.js');

if (!settings.adapters.yamaha || !settings.adapters.yamaha.enabled) {
    process.exit();
}

var logger = require(__dirname+'/../../logger.js'),
    io     = require('socket.io-client'),
    net    = require('net'),
    yservice = require('./lib/yamaha_service');

var datapoints = {}, objects = {};
var yamahaSettings = settings.adapters.yamaha.settings;
var input_mapping = yamahaSettings.input_mapping;
var socket;
var intervals = [];

var current_volume = -1000;
var current_mute = "";

yamaha_init();
yamaha();

/**
 * Main function to handle logic of this adpater.
 */
function yamaha(){
    var i_now_playing = start_now_playing_listener();
    var i_mute = start_muting_listener();
    var i_volume = start_volume_listener();

    intervals = {mute: i_mute, "now playing": i_now_playing, volume: i_volume};

    socket.on('event', function (obj) {
        if (!obj || !obj[0]) {
            return;
        }

        var id = obj[0];
        var id_for_onlinecheck = yamahaSettings.id_for_onlinecheck
        if (id_for_onlinecheck != "0" && id == id_for_onlinecheck){
            var state = obj[1];
            logger.info("adapter yamaha detects a status change of device "+ id_for_onlinecheck+"["+state+"]");
            if (state){
                setTimeout(function () {
                    i_now_playing = start_now_playing_listener();
                    i_mute = start_muting_listener();
                    i_volume = start_volume_listener();
                    intervals = {mute: i_mute, "now playing": i_now_playing, volume: i_volume};
                }, 20000);

            }else{
                for (var key in intervals){
                    clearInterval(intervals[key]);
                    logger.info("adapter yamaha stopping '"+key+"' listener");
                }
                setState(yamahaSettings.firstId+3, "");
            };
        }

        if (id == yamahaSettings.firstId+1){
            var val = obj[1];
            var ack = obj[3];

            logger.info(obj+ "---"+ack);


            if (ack == null || !ack){
                var volume = val*10;
                yservice.set_volume(volume, 1, "dB", function(success){
                    logger.info("setting: "+success);
                    if (!success){
                        logger.error("Could not set volume to Yamaha AV receiver.")
                    }
                });
            }
        }

        if (id == yamahaSettings.firstId+2){
            var val = obj[1];
            var ack = obj[3];
            var mute_value = "Off";

            if (val == true || val == "1" || val == "On"){
                mute_value = "On";
            }

            if (ack == null || !ack){
                yservice.set_mute(mute_value, function(success){
                    if (!success){
                        logger.error("Could not set muting to Yamaha AV receiver.")
                    }
                });
            }
        }
    });
}

/**
 * Starts the listener for the now_playing feature
 * @returns {number} The instance of this listener
 */
function start_now_playing_listener(){
    logger.info("adapter yamaha starting 'now playing' listener");
    return setInterval(function(){
        yservice.now_playing(function(data){
            var np = data;
            for (var key in input_mapping){
                if (key == np.trim()){
                  np = input_mapping[key];
                }
            }
            setState(yamahaSettings.firstId+3, np);
        });
    }, 10000);
}

/**
 * Starts the listener for the muting feature
 * @returns {number} The instance of this listener
 */
function start_muting_listener(){
    logger.info("adapter yamaha starting 'muting' listener");
    return setInterval(function(){
        yservice.mute(function(data){
            if (data != current_mute){
                setState(yamahaSettings.firstId+2, ((data.toLowerCase() == "on")? true: false));
                current_mute = data;
            }
        });
    }, 5000);
}

/**
 * Starts the listener for the volume feature
 * @returns {number} The instance of this listener
 */
function start_volume_listener(){
    logger.info("adapter yamaha starting 'volume' listener");
    return setInterval(function(){
        yservice.volume(function(data){
            var volume = data.replace(" dB", "");
            if (volume != current_volume){
                setState(yamahaSettings.firstId+1, volume);
                current_volume = volume;
            }
        });
    }, 2000);
}

/**
 * Starts the socket.io listener
 */
function socketio_init(){
    if (settings.ioListenPort) {
        socket = io.connect("127.0.0.1", {
            port: settings.ioListenPort
        });
    } else if (settings.ioListenPortSsl) {
        socket = io.connect("127.0.0.1", {
            port: settings.ioListenPortSsl,
            secure: true
        });
    } else {
        process.exit();
    }
}

/**
 * Initialize all object this adapter needs to have
 * @constructor
 */
function yamaha_init() {
    socketio_init();

    logger.info("adapter yamaha is setup ["+yamahaSettings.host+":"+yamahaSettings.port+":"+yamahaSettings.zone+"]");
    yservice.inject_logger(logger);
    yservice.setup(yamahaSettings.host, yamahaSettings.port, yamahaSettings.zone);

    setObject(yamahaSettings.firstId+1, {
        Name: "Yamaha_Volume",
        TypeName: "VARDP",
        "ValueType": 4,
        "ValueSubType": 0
    });

    setObject(yamahaSettings.firstId+2, {
        Name: "Yamaha_Mute",
        TypeName: "VARDP",
        "ValueType": 2,
        "ValueSubType": 2,
        "ValueList": ""
    });

    setObject(yamahaSettings.firstId+3, {
        Name: "Yamaha_Now_Playing",
        TypeName: "VARDP","ValueUnit": "",
        "ValueType": 20,
        "ValueSubType": 11
    });
}

/**
 * Sets the state of an existing object in the datapoints collection
 * @param id - the id of the object the state should be changed
 * @param val - the value represents the state
 */
function setState(id, val) {
    datapoints[id] = [val];
    logger.verbose("adapter yamaha setState "+id+" "+val);
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

/**
 * Stops this adapter. In this stop function the open socket will be closed and
 * the process exited.
 */
function stop() {
    logger.info("adapter yamaha is terminating");
    setState(yamahaSettings.firstId+3, "");
    setTimeout(function () {
        process.exit();
    }, 250);
}

/**
 * If the Unix signal <i>SIGINT</i> was received then ends the adapter.
 */
process.on('SIGINT', function () {
    stop();
});

/**
 * If the Unix signal <i>SIGTERM</i> was received then ends the adapter.
 */
process.on('SIGTERM', function () {
    stop();
});
