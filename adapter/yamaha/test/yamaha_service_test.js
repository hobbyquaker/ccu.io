
var ylogger = require("../lib/yamaha_logger");
var yservice = require("../lib/yamaha_service");

var host = '192.168.178.42';
var port = 80;

exports.setUp = function(callback){
    ylogger.log_level(ylogger.LEVEL.info);
    yservice.inject_logger(ylogger);
    yservice.setup(host, port, "Main_Zone");
    callback();
}

exports.volume = function(test){
    yservice.volume(function(data){
        test.ok(data.indexOf(" dB"));
    });
    setTimeout(function(){
        test.done();
    }, 1000);
};

exports.mute = function(test){
    yservice.mute(function(data){
        test.ok("OnOff".indexOf(data) >-1);
    });
    setTimeout(function(){
        test.done();
    }, 1000);
};

exports.mode = function(test){
    yservice.mode(function(data){
        test.ok("NET_RADIOAIRPLAYHDMI1HDMI2HDMI3HDMI4".indexOf(data.symbol) >-1);
    });
    setTimeout(function(){
        test.done();
    }, 1000);
};

exports.now_playing = function(test){
    yservice.now_playing(function(data){
        ylogger.info("now_playing: "+data);
        test.notEqual(data, "");
    });
    setTimeout(function(){
        test.done();
    }, 1000);
};

exports.set_volume = function(test){
    yservice.set_volume(-435, 1, "dB", function(data){
        test.equal(data, true);
        yservice.volume(function(vd){
            test.equal(vd, "-43.5 dB");
        });
    });

    setTimeout(function(){
        test.done();
    }, 3000);
};

exports.set_volume_fail = function(test){
    yservice.set_volume(-435, 1, "db", function(data){
        test.equal(data, false);
    });
    setTimeout(function(){
        test.done();
    }, 3000);
};


//
//exports.no_connection = function(test){
//    var ec = 0;
//    var i = setInterval(function(){
//        if (ec > 3){
//            ylogger.error("too many errors");
//            clearInterval(i);
//            return;
//        }
//        yservice.mute(function(data){
//
//        });
//
//        ylogger.info(yservice.last_error());
//        if (yservice.last_error() != ""){
//            ec++;
//        }else{
//            ec = 0;
//        }
//    },1000);
//
//
//
//    test.done();
//};


