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

if (!settings.adapters.yr) {
    process.exit();
}

var reqOptions = {
    hostname: 'www.yr.no',
    port: 80,
    path: '/place/'+settings.adapters.yr.location+'/forecast.xml',
    method: 'GET'
};

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

req.end()
;
function parseData(xml) {

	var options = {
		explicitArray: false,
		mergeAttrs: true
	}
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
			var todayEnd = dateObj.getFullYear() + "-" + ("0" + (dateObj.getMonth() + 1)).slice(-2) + "-" + ("0" + dateObj.getDate()).slice(-2) + "T24:00:00";
			var daySwitch = false;
			for (var i = 0; i < 5; i++) {
				var period = forecastArr[i];
				switch (i) {
				case 0:
					tableHead += "<td>jetzt</td>";
					break;
				default:
					if (period.from > todayEnd) {
						if (!daySwitch) {
							daySwitch = true;
							tableDay += '<td colspan="'+i+'">Heute</td><td colspan="'+(5-i)+'">Morgen</td>';
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
            socket.emit("setState", [70000, table], function () {
                socket.disconnect();
                logger.info("adapter yr    terminating");
                setTimeout(function () {
                     process.exit();
                }, 1000);
            });

		}
	});
}

