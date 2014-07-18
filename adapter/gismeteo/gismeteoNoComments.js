// Same as gismeteo.js, but without comments
var adapter     = require(__dirname + '/../../utils/adapter-init.js').Adapter("gismeteo"),
    http        = require('http'),
    parseString = require('xml2js').parseString;

var pollTimer   = null;
var rootDevice = adapter.firstId;
var nowChannel = rootDevice + 1;
var nowChannel_DPs = {
    DATE:         nowChannel + 1,
    PRESSURE_MIN: nowChannel + 2,
    PRESSURE_MAX: nowChannel + 3,
    TEMPERATURE:  nowChannel + 4,
    HUMIDITY:     nowChannel + 5
};

var nextChannel = nowChannel + 6;
var nextChannel_DPs = {
    DATE:         nextChannel + 1,
    PRESSURE_MIN: nextChannel + 2,
    PRESSURE_MAX: nextChannel + 3,
    TEMPERATURE:  nextChannel + 4,
    HUMIDITY:     nextChannel + 5
};

adapter.onEvent = function (ID, val, ts, dir) {
    if (dir) {
        return;
    }

    if ((ID == nowChannel_DPs.DATE || ID == nextChannel_DPs.DATE) && val == true) {
        pollGismeteo();
    }
};

adapter.onStop = function () {
    if (pollTimer) {
        clearInterval(pollTimer);
        pollTimer = null;
    }
};

function initGismeteo () {
    adapter.createDP(nowChannel_DPs.DATE,         nowChannel, "gismeteo.now.DATE");
    adapter.createDP(nowChannel_DPs.PRESSURE_MIN, nowChannel, "gismeteo.now.PRESSURE_MIN");
    adapter.createDP(nowChannel_DPs.PRESSURE_MAX, nowChannel, "gismeteo.now.PRESSURE_MAX");
    adapter.createDP(nowChannel_DPs.TEMPERATURE,  nowChannel, "gismeteo.now.TEMPERATURE");
    adapter.createDP(nowChannel_DPs.HUMIDITY,     nowChannel, "gismeteo.now.HUMIDITY");
    adapter.createChannel(nowChannel, rootDevice, "gismeteo.now", nowChannel_DPs, {HssType:  "gismeteo"});

    adapter.createDP(nextChannel_DPs.DATE,         nextChannel, "gismeteo.next.DATE");
    adapter.createDP(nextChannel_DPs.PRESSURE_MIN, nextChannel, "gismeteo.next.PRESSURE_MIN");
    adapter.createDP(nextChannel_DPs.PRESSURE_MAX, nextChannel, "gismeteo.next.PRESSURE_MAX");
    adapter.createDP(nextChannel_DPs.TEMPERATURE,  nextChannel, "gismeteo.next.TEMPERATURE");
    adapter.createDP(nextChannel_DPs.HUMIDITY,     nextChannel, "gismeteo.next.HUMIDITY");
    adapter.createChannel(nextChannel, rootDevice, "gismeteo.next", nextChannel_DPs, {HssType:  "gismeteo"});

    adapter.createDevice(rootDevice, "gismeteo", [nowChannel, nextChannel], {HssType: "gismeteo_ROOT"});

    pollGismeteo();

    pollTimer = setInterval(pollGismeteo, adapter.settings.pollIntervalHours * 3600000 /* ms */);
}

function getXmlResponse(callback) {
    var options = {
        host: 'informer.gismeteo.com',
        port: 80,
        path: '/xml/' + adapter.settings.cityId + '_1.xml'
    };

    console.log('http://informer.gismeteo.com/xml/' + adapter.settings.cityId + '_1.xml');

    http.get(options, function(res) {
        var xmldata = '';
        res.setEncoding('utf8');
        res.on('error', function (e) {
            adapter.warn(e);
        });
        res.on('data', function(chunk){
            xmldata += chunk;
        });
        res.on('end', function () {
            if (callback) {
                parseString(xmldata, function (err, data) {
                    var result = null;
                    if (!err && data) {
                        try {
                            var list = data['MMWEATHER']['REPORT'][0]['TOWN'][0]['FORECAST'];
                            result = {};

                            result['now'] = {
                                DATE:         list[0].$.year + '.' + list[0]['$'].month + '.' + list[0]['$'].day,
                                PRESSURE_MIN: list[0].PRESSURE[0].$.min,
                                PRESSURE_MAX: list[0].PRESSURE[0].$.max,
                                TEMPERATURE:  (parseFloat(list[0].TEMPERATURE[0].$.max) + parseFloat(list[0].PRESSURE[0].$.min)) / 2, // ????? ???????? ? ????????
                                HUMIDITY:     (parseFloat(list[0].RELWET[0].$.max) + parseFloat(list[0].RELWET[0].$.min)) / 2        // ????? ???????? ? ????????
                            };
                            result['next'] = {};

                            for (var i = 1; i < list.length; i++) {
                                if (list[i].$.hour == "15") {
                                    result['next'] = {
                                        DATE:         list[i].$.year + '.' + list[i]['$'].month + '.' + list[i]['$'].day,
                                        PRESSURE_MIN: list[i].PRESSURE[0].$.min,
                                        PRESSURE_MAX: list[i].PRESSURE[0].$.max,
                                        TEMPERATURE:  (parseFloat(list[i].TEMPERATURE[0].$.max) + parseFloat(list[i].PRESSURE[0].$.min)) / 2, // ????? ???????? ? ????????
                                        HUMIDITY:     (parseFloat(list[i].RELWET[0].$.max) + parseFloat(list[i].RELWET[0].$.min)) / 2        // ????? ???????? ? ????????
                                    };
                                    break;
                                }
                            }
                        } catch(e) {
                            adapter.warn("cannot parse xml answer");
                        }
                        callback(result);
                    } else {
                        adapter.warn("cannot parse xml answer - " + err);
                    }
                });
            }
        });
    }).on('error', function(e) {
        adapter.warn("Got error by request " + e.message);
    });
}

function pollGismeteo () {
    getXmlResponse(function (data) {
        if (data) {
            adapter.setState(nowChannel_DPs.DATE,         data.now.DATE);
            adapter.setState(nowChannel_DPs.PRESSURE_MIN, data.now.PRESSURE_MIN);
            adapter.setState(nowChannel_DPs.PRESSURE_MAX, data.now.PRESSURE_MAX);
            adapter.setState(nowChannel_DPs.TEMPERATURE,  data.now.TEMPERATURE);
            adapter.setState(nowChannel_DPs.HUMIDITY,     data.now.HUMIDITY);

            adapter.setState(nextChannel_DPs.DATE,         data.next.DATE);
            adapter.setState(nextChannel_DPs.PRESSURE_MIN, data.next.PRESSURE_MIN);
            adapter.setState(nextChannel_DPs.PRESSURE_MAX, data.next.PRESSURE_MAX);
            adapter.setState(nextChannel_DPs.TEMPERATURE,  data.next.TEMPERATURE);
            adapter.setState(nextChannel_DPs.HUMIDITY,     data.next.HUMIDITY);
        }
    });
}

initGismeteo ();
