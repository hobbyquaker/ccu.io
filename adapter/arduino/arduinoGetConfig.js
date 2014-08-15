var logger  = require(__dirname + '/../../logger.js');
var http    = require('http');

//var simulate = "AIPout1=156.5&AIHout=56.8&AITout=25.4&AILux=12345&AIT1=12.5&AIT2=45.8&AIT3=89.7&DI0=0&DI1=1&DI2=0&DI3=1&DO4=0&DO5=1&DO6=0&DO7=1&AIErr=0";


function getConfig(ip) {
    http.get("http://" + ip + "/data", function(res) {
        console.log("Got response: " + res.statusCode);
        var bodyArr = [];

        res.on('data', function(chunk){
            bodyArr.push(chunk);
        });
        res.on('end', function(){
            process.send(bodyArr.join('').toString());
            process.exit();
        });
    }).on('error', function(e) {
        console.log("Error: " + e.message);
        if (typeof simulate != "undefined") {
            process.send(simulate);
            process.exit();
        } else {
            process.send("Error: " + e.message);
            process.exit(-1);
        }
    }).setTimeout(1000, function() {
        console.log("Error: timeout");
        if (typeof simulate != "undefined") {
            process.send(simulate);
            process.exit();
        } else {
            process.send("Error: timeout");
            process.exit(-1);
        }
    });
}

var arguments = process.argv.splice(2);
if (arguments.length) {
    getConfig(arguments[0]);
} else {
    process.exit(-1);
}
