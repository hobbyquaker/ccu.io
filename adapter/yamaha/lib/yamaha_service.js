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

var yapi = require("./yamaha_api");
var net = require('net');
var ysocket;
var logger;
var settings = [];
var last_error = "";

var HTTP_METHODS = Object.freeze({GET: "GET", POST: "POST", PUT: "PUT"});


exports.inject_logger = (function(injected_logger){
    logger = injected_logger;
});

exports.setup = (function(host, port, zone){
    settings = Object.freeze({host: host, port: port, zone: zone});
});

exports.last_error = (function(){
   return last_error;
});


/**
 * Requests the receiver for the current level of the volume. The data returned are in this form:
 * <br/>
 * <code>-23.5 dB</code>
 *
 * @type {Function}
 * @param callback A callback function with one parameter for the volume level data
 */
exports.volume = (function(callback){
    var request_data = build_request_data(HTTP_METHODS.GET, "<Volume><Lvl>GetParam</Lvl></Volume>");
    var http_request = yapi.http_request(request_data);

    connect_to_yamaha(function(data){
        var volume = yapi.volume(data.toString());
        callback(volume);
    });
    write_to_yamaha(http_request);
});

/**
 * Sets the volume for the Yamaha receiver.
 *
 * @type {Function}
 * @param volume The value for the level. Important here: there are no decimals. For -23.5 you need to set -235.
 * @param exp Mostly you can enter 1
 * @param unit This should be dB (important that the B is in uppercase)
 * @param callback A callback function with one parameter for success or not (true or false)
 */
exports.set_volume = (function(volume, exp, unit, callback){
    var request_data = build_request_data(HTTP_METHODS.PUT, "<Volume><Lvl><Val>"+volume+"</Val><Exp>"+exp+"</Exp><Unit>"+unit+"</Unit></Lvl></Volume>");
    var http_request = yapi.http_request(request_data);

    connect_to_yamaha(function(data){
        var success = false;
        if (data.toString().indexOf('RC="0"') >-1){
            success = true;
        }
        callback(success);
    });
    write_to_yamaha(http_request);
});

/**
 * Requests the receiver for the mute status (On/Off)
 * @type {Function}
 * @param callback A callback function with one parameter for the muting status: On or Off
 */
exports.mute = (function(callback){
    var request_data = build_request_data(HTTP_METHODS.GET, "<Volume><Mute>GetParam</Mute></Volume>");
    var http_request = yapi.http_request(request_data);

    connect_to_yamaha(function(data){
        var mute = yapi.mute(data.toString());
        callback(mute);
    });
    write_to_yamaha(http_request);
});

/**
 * Sets the muting status to the receiver.
 * @type {Function}
 * @param mute_value Either <code>On</code> or <code>Off</code>
 * @param callback A callback function with one parameter for success or not (true or false)
 *
 */
exports.set_mute = (function(mute_value, callback){
    var request_data = build_request_data(HTTP_METHODS.PUT, "<Volume><Mute>"+mute_value+"</Mute></Volume>");
    var http_request = yapi.http_request(request_data);

    connect_to_yamaha(function(data){
        var success = false;
        if (data.toString().indexOf('RC="0"') >-1){
            success = true;
        }
        callback(success);
    });
    write_to_yamaha(http_request);
});

/**
 * requests the receiver in which mode it is. The mode is the same as input on your remote control.
 * @type {Function}
 * @param callback The mode, eg. HDMI1, HDMI2,...,AIRPLAY, NET_RADIO
 */
exports.mode = (function(callback){
    var request_data = build_request_data(HTTP_METHODS.GET, "<Input><Input_Sel_Item_Info>GetParam</Input_Sel_Item_Info></Input>");
    var http_request = yapi.http_request(request_data);

    connect_to_yamaha(function(data){
        var mode = yapi.current_mode(data.toString());
        callback(mode);
    });

    write_to_yamaha(http_request);
});

/**
 * Requests the Receiver for information about the music thats now playing. This is only enabled when the mode
 * NET_RADIO or AIRPLAY is active. If not the information about the mode is returned, eg. HDMI1.
 * @type {Function}
 * @param callback A callback function with one parameter for the 'now playing' information.
 */
exports.now_playing = (function(callback){
    this.mode(function(data){
        var mode = data.symbol;
        var request_data;
        var http_request;

        switch (mode.toLowerCase()){
            case "net_radio":
                request_data = build_request_data_without_zone(HTTP_METHODS.GET, "<NET_RADIO><Play_Info>GetParam</Play_Info></NET_RADIO>");
                http_request = yapi.http_request(request_data);

                connect_to_yamaha(function(dnp){
                    var np = yapi.now_playing_net_radio(dnp.toString());

                    callback(((np == "")? data.name: np));
                });
                write_to_yamaha(http_request);
                break;
            case "airplay":
                request_data = build_request_data_without_zone(HTTP_METHODS.GET, "<AirPlay><Play_Info>GetParam</Play_Info></AirPlay>");
                http_request = yapi.http_request(request_data);

                connect_to_yamaha(function(dnp){
                    var np = yapi.now_playing_airplay(dnp.toString());

                    callback(((np == "")? data.name: np));
                });
                write_to_yamaha(http_request);
                break;
            default:
                callback(mode);
                break;
        }
    });
});

/**
 * requests the  basic status of the receiver.
 * @type {Function}
 * @param callback
 */
exports.basic_status = (function(callback){
    var request_data = build_request_data(HTTP_METHODS.GET, "<Basic_Status>GetParam</Basic_Status>");
    var http_request = yapi.http_request(request_data);

    connect_to_yamaha(function(data){
        callback(data.toString());
    });

    write_to_yamaha(http_request);
});

/* ----------------------PRIVATE FUNCTIONS---------------------------- */

connect_to_yamaha = (function(data_callback){
    close_yamaha();

    ysocket = net.connect(settings.port, settings.host, function() {
        logger.debug("Connected to Yamaha AV Receiver at: "+settings.host+"["+settings.port+"]");

    });
    ysocket.setKeepAlive(true);
    ysocket.setNoDelay(true);

    ysocket.on("connect", function(data){
        last_error = "";
    });

    ysocket.on("close", function(data){
        logger.debug("Connection to Yamaha AV Receiver was closed.");
        ysocket = null;
    });

    ysocket.on("error", function(error){
        var err_message = error.toString();
        if (err_message.indexOf("ETIMEDOUT") >-1 ||
            err_message.indexOf("Unknown system errno 64") >-1 ||
            err_message.indexOf("EHOSTUNREACH") >-1 ||
            err_message.indexOf("ECONNREFUSED") >-1 ||
            err_message.indexOf("ECONNRESET") >-1 ||
            err_message.indexOf("ENETUNREACH") >-1){
            logger.debug("Connection to Yamaha AV Receiver was broken: "+err_message);
        }else{
            logger.error("Connection to Yamaha AV Receiver was broken: "+err_message);
        }
        last_error = error.toString();
        close_yamaha();
    });

    ysocket.on("data", function(data){
        logger.debug("Yamaha responds: "+data.toString());

        if (data.toString().indexOf("<YAMAHA_AV ")>-1){
            data_callback(data.toString().substring(data.toString().indexOf("<YAMAHA_AV ")));
        }
        close_yamaha();
    });
});

write_to_yamaha = function(data){
    if (ysocket != null){
        logger.debug("Write to Yamaha:"+data);
        ysocket.write(data);
    }
}

close_yamaha = (function(){
    if (ysocket != null){
        ysocket.end();
        ysocket = null;
    }
});

build_request_data = function(method, cmd){
    return '<YAMAHA_AV cmd="'+method+'"><'+settings.zone+'>'+cmd+'</'+settings.zone+'></YAMAHA_AV>';
};

build_request_data_without_zone = function(method, cmd){
    return '<YAMAHA_AV cmd="'+method+'">'+cmd+'</YAMAHA_AV>';
};






