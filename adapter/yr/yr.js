/**
 * yr.no Adapter for CCU.IO
 *
 * Copyright (c) 10'2013 hobbyquaker http://hobbyquaker.github.io
 *
 * Weather forecast from yr.no, delivered by the Norwegian Meteorological Institute and the NRK
 *
 *
 */
var settings = require(__dirname+'/../../settings.js');

if (!settings.adapters.yr || !settings.adapters.yr.enabled) {
    process.exit();
}

var reqOptions = {
    hostname: 'www.yr.no',
    port: 80,
    path: '/place/'+settings.adapters.yr.settings.location+'/forecast.xml',
    method: 'GET'
};

//console.log(reqOptions.hostname + reqOptions.path);

var http = 		require("http"),
	xml2js = 	require("xml2js"),
    logger =    require(__dirname+'/../../logger.js');

var io = require('socket.io-client');

    if (settings.ioListenPort) {
        var socket = io.connect("127.0.0.1", {
            port: settings.ioListenPort
        });
    } else if (settings.ioListenPortSsl) {
        var socket = io.connect("127.0.0.1", {
            port: settings.ioListenPortSsl,
            secure: true,
        });
    } else {
        process.exit();
    }


socket.on('connect', function () {
    logger.info("adapter yr    connected to ccu.io");
});

socket.on('disconnect', function () {
    logger.info("adapter yr    disconnected from ccu.io");
});

var req = http.request(reqOptions, function(res) {
  
  var data = "";

  res.on('data', function (chunk) {
    data += chunk
  });

  res.on('end', function () {
    parseData(data.toString());
  });

});

req.on('error', function(e) {
  logger.error("adapter yr    " + e.message);
});

req.end();

function parseData(xml) {

	var options = {
		explicitArray: false,
		mergeAttrs: true
	};
	var parser = new xml2js.Parser(options);
	parser.parseString(xml, function (err, result) {
		if (err) {
            logger.error("adapter yr   "+err);
        } else {
            logger.info("adapter yr    got weather data from yr.no");
          	var forecastArr = result.weatherdata.forecast.tabular.time;

			for (var i = 0; i < forecastArr.length; i++) {
				var period = forecastArr[i];
				period.symbol.url = 'http://symbol.yr.no/grafikk/sym/b38/' + period.symbol.var + ".png";

			}

			var tableDay = '<table style="border-collapse: collapse; padding: 0; margin: 0"><tr class="yr-day">';
			var tableHead = '</tr><tr class="yr-time">';
			var tableMiddle = '</tr><tr class="yr-img">';
			var tableBottom = '</tr><tr class="yr-temp">';
			var dateObj = new Date();
			var dayEnd = dateObj.getFullYear() + "-" + ("0" + (dateObj.getMonth() + 1)).slice(-2) + "-" + ("0" + dateObj.getDate()).slice(-2) + "T24:00:00";
			var daySwitch = false;
			for (var i = 0; i < 8; i++) {
				var period = forecastArr[i];
          		switch (i) {
				case 0:
					tableHead += "<td>jetzt</td>";
					break;
				default:
					if (period.from > dayEnd) {
						if (!daySwitch) {
							daySwitch = true;
							tableDay += '<td colspan="'+i+'">Heute</td><td colspan="4">Morgen</td>';
                            if (i < 3) {
                                tableDay += '<td colspan="'+(4-i)+'">Übermorgen</td>';
                            }
							tableHead += '<td>'+parseInt(period.from.substring(11,13),10).toString()+'-'+parseInt(period.to.substring(11,13),10).toString()+'</td>';
						} else {
							tableHead += '<td>'+parseInt(period.from.substring(11,13),10).toString()+'-'+parseInt(period.to.substring(11,13),10).toString()+'</td>';
						}
						
					} else {
						tableHead += '<td>'+parseInt(period.from.substring(11,13),10).toString()+'-'+parseInt(period.to.substring(11,13),10).toString()+'</td>';
					}
				}
				

				tableMiddle += '<td><img src="'+period.symbol.url+'" alt="'+period.symbol.name+'" title="'+period.symbol.name+'"><br/>';
				tableBottom += '<td><span class="">'+period.temperature.value+'°C</span></td>';
				//console.log(period);
			}
            var style = '<style type="text/css">tr.yr-day td {font-family: sans-serif; font-size: 9px; padding:0; margin: 0;}\ntr.yr-time td {text-align: center; font-family: sans-serif; font-size: 10px; padding:0; margin: 0;}\ntr.yr-temp td {text-align: center; font-family: sans-serif; font-size: 12px; padding:0; margin: 0;}\ntr.yr-img td {text-align: center; padding:0; margin: 0;}\ntr.yr-time td img {padding:0; margin: 0;}</style>'
			var table = style + tableDay + tableHead + tableMiddle + tableBottom + "</tr></table>";
			//console.log(JSON.stringify(result, null, "  "));

            if (forecastArr[0].precipitation.Value != "0" || forecastArr[1].precipitation.Value != "1" || forecastArr[2].precipitation.Value != "2" || forecastArr[3].precipitation.Value != "3") {
                var rain24 = true;
            } else {
                var rain24 = false;
            }
            if (forecastArr[0].precipitation.Value != "4" || forecastArr[1].precipitation.Value != "5" || forecastArr[2].precipitation.Value != "6" || forecastArr[3].precipitation.Value != "7") {
                var rain48 = true;
            } else {
                var rain48 = false;
            }

            var minTemp24 = 100;
            var maxTemp24 = -100;
            var minTemp48 = 100;
            var maxTemp48 = -100;
            for (var i = 0; i < 4; i++) {
                if (forecastArr[i].temperature.value > maxTemp24) {
                    maxTemp24 = forecastArr[i].temperature.value;
                }
                if (forecastArr[i].temperature.value < minTemp24) {
                    minTemp24 = forecastArr[i].temperature.value;
                }
                if (forecastArr[i+4].temperature.value > maxTemp48) {
                    maxTemp48 = forecastArr[i+4].temperature.value;
                }
                if (forecastArr[i+4].temperature.value < minTemp48) {
                    minTemp48 = forecastArr[i+4].temperature.value;
                }
            }


            socket.emit("setObject", 70001, {
                Name: "yr.no Regen 24h",
                DPInfo: "Regen in den nächsten 24h",
                TypeName: "VARDP",
                "ValueMin": null,
                "ValueMax": null,
                "ValueUnit": "",
                "ValueType": 2,
                "ValueSubType": 2,
                "ValueList": ""
            }, function() {
                socket.emit("setState", [70001, rain24]);
            });

            socket.emit("setObject", 70002, {
                Name: "yr.no Regen 48h",
                DPInfo: "Regen in den darauffolgenden 24h",
                TypeName: "VARDP",
                "ValueMin": null,
                "ValueMax": null,
                "ValueUnit": "",
                "ValueType": 2,
                "ValueSubType": 2,
                "ValueList": ""
            }, function() {
                socket.emit("setState", [70002, rain48]);
            });

            socket.emit("setObject", 70003, {
                Name: "yr.no Temp min 24h",
                DPInfo: "minimale Temperatur in den nächsten 24h",
                TypeName: "VARDP",
                "ValueMin": null,
                "ValueMax": null,
                "ValueUnit": "°C",
                "ValueType": 4,
                "ValueSubType": 0,
                "ValueList": ""
            }, function() {
                socket.emit("setState", [70003, minTemp24]);
            });
            socket.emit("setObject", 70004, {
                Name: "yr.no Temp min 48h",
                DPInfo: "minimale Temperatur in den darauffolgenden 24h",
                TypeName: "VARDP",
                "ValueMin": null,
                "ValueMax": null,
                "ValueUnit": "°C",
                "ValueType": 4,
                "ValueSubType": 0,
                "ValueList": ""
            }, function() {
                socket.emit("setState", [70004, minTemp48]);
            });

            socket.emit("setObject", 70005, {
                Name: "yr.no Temp max 24h",
                DPInfo: "maximale Temperatur in den nächsten 24h",
                TypeName: "VARDP",
                "ValueMin": null,
                "ValueMax": null,
                "ValueUnit": "°C",
                "ValueType": 4,
                "ValueSubType": 0,
                "ValueList": ""
            }, function() {
                socket.emit("setState", [70005, maxTemp24]);
            });
            socket.emit("setObject", 70006, {
                Name: "yr.no Temp max 48h",
                DPInfo: "maximale Temperatur in den darauffolgenden 24h",
                TypeName: "VARDP",
                "ValueMin": null,
                "ValueMax": null,
                "ValueUnit": "°C",
                "ValueType": 4,
                "ValueSubType": 0,
                "ValueList": ""
            }, function() {
                socket.emit("setState", [70006, maxTemp48]);
            });


            socket.emit("setObject", 70000, {
                Name: "yr.no Wettervorhersage",
                DPInfo: "48h Vorhersage als HTML Tabelle",
                TypeName: "VARDP",
                "ValueMin": null,
                "ValueMax": null,
                "ValueUnit": "",
                "ValueType": 20,
                "ValueSubType": 11,
                "ValueList": ""

            }, function() {
                socket.emit("setState", [70000, table], function () {
                    socket.disconnect();
                    logger.info("adapter yr    terminating");
                    setTimeout(function () {
                        process.exit();
                    }, 1000);
                });
            });


		}
	});
}


setTimeout(function () {
    logger.info("adapter yr    force terminating");
    process.exit();
}, 900000);