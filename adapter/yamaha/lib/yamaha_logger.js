
exports.LEVEL = Object.freeze({info: 1, error: 2, debug: 3, verbose: 4})
var current_level = 4

exports.log_level = function(level_to_set){
  current_level = level_to_set;
};

exports.info = (function(msg){
   console.log(msg)
});

exports.debug = (function(msg){
    if (current_level > 2){
        console.log("d: "+msg)
    }
});

exports.error = (function(msg){
    console.log("e: "+msg)
});

exports.verbose = (function(msg){
    if (current_level > 3){
        console.log("v: "+msg)
    }
});
