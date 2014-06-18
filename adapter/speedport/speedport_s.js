var request = require('request');

var host = 'speedport.ip';

var cookieJar = request.jar();

request.post({
    url: 'https://' + host + '/data/Login.json',
    jar: cookieJar,
    form: {
        'password': '20819828',
        'showpw': '0'
    },
    headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Referer': 'https://' + host + '/html/login/index.html'
    }
}, function (err, res, body) {
    request({
        headers: {
            'Referer': 'https://' + host + '/html/content/phone/phone_call_list.html'
        },
        jar: cookieJar,
        url: 'https://speedport.ip/data/PhoneCalls.json'
    }, function (err, res, body) {
        parseCalls(JSON.parse(body));
        request.post({
            url: 'https://' + host + '/data/Login.json',
            jar: cookieJar,
            form: {
                logout: 'byby'
            },
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Referer': 'https://' + host + '/html/content/overview/index.html'
            }
        });
    });
});

function parseCalls(data) {
	var calls = {};
	for (var key in data) {
		var item = data[key];
		if (item.vartype != "template") continue;
		var ident = item.varid.slice(3);
		if (!calls[ident]) calls[ident] = [];
		var dateArr = item.varvalue[1].varvalue.split(".");
		var obj = {
			datetime: dateArr[2] + "-" + dateArr[1] + "-" + dateArr[0] + " " + item.varvalue[2].varvalue, 
			number: item.varvalue[3].varvalue
		};
		if (item.varvalue[4]) {
			var durationSeconds =  parseInt(item.varvalue[4].varvalue, 10);
			var durationHours = Math.floor(durationSeconds / 3600);
			var durationMinutes = Math.floor((durationSeconds % 3600) / 60);
			var duration = durationHours + ":" + ("0" + durationMinutes).slice(-2) + ":" + ("0" + (durationSeconds % 60)).slice(-2);

			obj.duration = duration;
		}
		calls[ident].push(obj);		
	}
	console.log(calls);
}

