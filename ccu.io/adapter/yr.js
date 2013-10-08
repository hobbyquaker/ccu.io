/**
 * yr.no Adapter for CCU.IO
 *
 * Copyright (c) 10'2013 hobbyquaker http://hobbyquaker.github.io
 *
 * Weather forecast from yr.no, delivered by the Norwegian Meteorological Institute and the NRK
 *
 *
 */

var settings = {
    location: "Germany/Baden-W%C3%BCrttemberg/Stuttgart",
    ccuIoPort: 8080
};

var reqOptions = {
    hostname: 'www.yr.no',
    port: 80,
    path: '/place/'+settings.location+'/forecast.xml',
    method: 'GET'
};

var http = 		require("http"),
	xml2js = 	require("xml2js"),
    logger =    require(__dirname+'/../logger.js');

var io = require('socket.io-client'),
    socket = io.connect("127.0.0.1", {
        port: settings.ccuIoPort
    });

socket.on('connect', function () {
    console.log("yr.no Adapter connected to CCU.IO");
});

socket.on('disconnect', function () {
    console.log("yr.no Adapter disconnected from CCU.IO");
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
  console.log("Got error: " + e.message);
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
			console.log("error parsing xml");
			console.log(err);
		} else {

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
				
				console.log(period);

				tableMiddle += '<td><img src="'+period.symbol.url+'" alt="'+period.symbol.name+'" title="'+period.symbol.name+'"><br/>';
				tableBottom += '<td><span class="">'+period.temperature.value+'°C</span></td>';
				//console.log(period);
			}
            var style = '<style type="text/css">tr.yr-day td {font-family: sans-serif; font-size: 9px; padding:0; margin: 0;}\ntr.yr-time td {text-align: center; font-family: sans-serif; font-size: 10px; padding:0; margin: 0;}\ntr.yr-temp td {text-align: center; font-family: sans-serif; font-size: 12px; padding:0; margin: 0;}\ntr.yr-img td {text-align: center; padding:0; margin: 0;}\ntr.yr-time td img {padding:0; margin: 0;}</style>'
			var table = style + tableDay + tableHead + tableMiddle + tableBottom + "</tr></table>";
			console.log(table);
			//console.log(JSON.stringify(result, null, "  "));
            socket.emit("setState", [70000, table]);
            socket.close();
		}
	});
}

