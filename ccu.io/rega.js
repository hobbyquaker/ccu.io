var logger = require('./logger.js'),
    http = require("http"),
    fs = require('fs'),
    xml2js = require('xml2js');

var parser = new xml2js.Parser({explicitArray:false});


var rega = function(options) {

    this.options = options;

};

rega.prototype = {
    options: {},
    runScriptFile: function (script, callback) {
        logger.verbose('rega   --> ' + dataType + '.fn');

        var that = this;
        fs.readFile('./regascripts/'+script+'.fn', 'utf8', function (err, data) {
            if (err) {
                logger.error(err);
                return false;
            }
            that.script(data, function (stdout, xml) {
                logger.verbose('rega   <-- response ' + JSON.stringify(stdout));
                callback(JSON.parse(stdout));
            });


        });

    },
    script: function (script, callback) {

        var post_options = {
            host: this.options.ccuIp,
            port: '8181',
            path: '/rega.exe',
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Content-Length': script.length
            }
        };

        var post_req = http.request(post_options, function(res) {
            var data = "";
            res.setEncoding('utf8');
            res.on('data', function (chunk) {
                data += chunk;
            });
            res.on('end', function () {
                var pos = data.lastIndexOf("<xml>");
                var stdout = (data.substring(0, pos));
                var xml = (data.substring(pos));
                parser.parseString(xml, function (err, result) {
                    callback(stdout, result.xml);
                });

            });
        });

        post_req.write(script);
        post_req.end();


    }
};


module.exports = rega;

/*
var r = new rega({"ccuIp":"172.16.23.3"});



r.loadCcuData("values_variables", function (data) {
    console.log(data);
});

r.script("var s = 'muh';\nWriteLine('MUH!!!');", function (stdout, xml) {
    console.log(stdout);
    console.log(JSON.stringify(xml));
});
 */


