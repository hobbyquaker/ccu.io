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


var logger = require(__dirname+'/logger.js'),
    http = require("http"),
    fs = require('fs'),
    xml2js = require('xml2js');
// var iconv = require('iconv-lite');



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
    checkTime: function (callback) {
        this.script('WriteLine(system.Date("%F %X").ToTime().ToInteger());', function (data) {
            var ccuTime = parseInt(data, 10);
            var localTime = Math.round(new Date().getTime() / 1000);
            var diff = localTime - ccuTime
            logger.info("ccu.io        time difference local-ccu " + diff.toString() + "s");
            callback();
        });
    },
    loadStringTable: function (callback) {

        var options = {
            host: this.options.ccuIp,
            port: 80,
            path: '/config/stringtable_de.txt'
        };

        http.get(options, function(res) {
            var data = "";

            res.on('data', function (chunk) {
                data += chunk;
            });
            res.on('end', function () {
                var str = iconv.decode(data, 'ISO-8859-1');
                var dataArr = str.split("\n");
                var lang = {};
                for (var i = 0; i < dataArr.length; i++) {
                    var line = dataArr[i];
                    if (line && line != "") {
                        var resultArr = line.match(/^([A-Z0-9_-]+)\|?([A-Z0-9_-]+)?=?([A-Z0-9_-]+)?[ \t]+(.+)$/);
                        if (resultArr) {
                            if (!lang[resultArr[1]]) {
                                lang[resultArr[1]] = {};
                            }
                            if (resultArr[3]) {
                                if (!lang[resultArr[1]][resultArr[2]]) {
                                    lang[resultArr[1]][resultArr[2]] = {};
                                }
                                if (!lang[resultArr[1]][resultArr[2]][resultArr[3]]) {
                                    lang[resultArr[1]][resultArr[2]][resultArr[3]] = {};
                                }
                                lang[resultArr[1]][resultArr[2]][resultArr[3]].text = resultArr[4];
                            } else if (resultArr[2]) {
                                if (!lang[resultArr[1]][resultArr[2]]) {
                                    lang[resultArr[1]][resultArr[2]] = {};
                                }
                                lang[resultArr[1]][resultArr[2]].text = resultArr[4];
                            } else {
                                lang[resultArr[1]].text = resultArr[4];
                            }
                        }

                    }

                }


                logger.info("ccu.io        stringtable loaded");
                callback(lang);
            });

        }).on('error', function(e) {
            callback(false);
        });

    },
    addStringVariable: function (name, desc, str, callback) {
        var script = "object test = dom.GetObject('"+name+"');\n" +
            "if (test) {\n" +
            "WriteLine('false');\n" +
            "} else {\n" +
            "object o = dom.CreateObject(OT_VARDP);\n" +
            "o.Name('"+name+"');\n" +
            "dom.GetObject(ID_SYSTEM_VARIABLES).Add(o.ID());\n" +
            "o.DPInfo('"+desc+"');\n" +
            "o.DPArchive(false);\n" +
            "o.ValueUnit('');\n" +
            "o.ValueType(20);\n" +
            "o.ValueSubType(11);\n" +
            "o.State('"+str+"');\n" +
            "WriteLine(o.ID());\n" +
            "}";

        this.script(script, function (res) {
            var id = parseInt(res, 10);
            if (res == "false") {
                logger.error("rega          addStringVariable("+name+") already exists");
                callback(false);
            } else if (id > 0) {
                callback(id);
            } else {
                logger.error("rega          addStringVariable("+name+") unknown error");
                callback(false);
            }
        });
    },
    runScriptFile: function (script, callback) {
        //logger.verbose('rega      --> ' + script + '.fn');

        var that = this;
        fs.readFile(__dirname+'/regascripts/'+script+'.fn', 'utf8', function (err, data) {
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
