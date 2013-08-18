/**
 *      HomeMatic ReGaHss Schnittstelle für Node.js
 *
 *      Version 0.2
 *
 *      Copyright (c) 2013 http://hobbyquaker.github.io
 *
 *      CC BY-NC 3.0
 *
 *      Kommerzielle Nutzung nicht gestattet!
 *
 */


var logger = require('./logger.js'),
    http = require("http"),
    fs = require('fs'),
    xml2js = require('xml2js');

var parser = new xml2js.Parser({explicitArray:false});


var rega = function(options) {

    this.options = options;
    /* TODO checkrega */
    this.options.ready();

};

rega.prototype = {
    options: {},
    pendingRequests: 0,
    regaUp: function (success, error) {

    },
    runScriptFile: function (script, callback) {
        //logger.verbose('rega      --> ' + script + '.fn');

        var that = this;
        fs.readFile('./regascripts/'+script+'.fn', 'utf8', function (err, data) {
            if (err) {
                logger.error("rega          readFile "+err);
                return false;
            }
            that.script(data, function (stdout, xml) {
                callback(stdout, xml);
            });
        });
    },
    script: function (script, callback) {
        var that = this;
        logger.verbose('rega      --> ' + script);

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
        this.pendingRequests += 1;
        var post_req = http.request(post_options, function(res) {
            var data = "";
            res.setEncoding('utf8');
            res.on('data', function (chunk) {
                data += chunk;
            });
            res.on('end', function () {
                that.pendingRequests -= 1;
                var pos = data.lastIndexOf("<xml>");
                var stdout = (data.substring(0, pos));
                var xml = (data.substring(pos));
                parser.parseString(xml, function (err, result) {
                    logger.verbose('rega      <-- ' + stdout);
                    callback(stdout, result.xml);
                });

            });
        });

        post_req.on('error', function(e) {
            logger.error('rega          post request error: ' + e.message);
        });

        post_req.write(script);
        post_req.end();


    }
};

module.exports = rega;
