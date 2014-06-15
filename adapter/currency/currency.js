/**
*      CCU.IO currency Adapter
*      06'2014 Bluefox
*      Read XML file from European Central Bank under http://www.ecb.europa.eu/stats/eurofxref/eurofxref-daily.xml and parse it
*
*      Version 0.1
*     
*      Sample response:    
*
*      <gesmes:Envelope xmlns:gesmes="http://www.gesmes.org/xml/2002-08-01" xmlns="http://www.ecb.int/vocabulary/2002-08-01/eurofxref">
*			<gesmes:subject>Reference rates</gesmes:subject>
*			<gesmes:Sender>
*				<gesmes:name>European Central Bank</gesmes:name>
*			</gesmes:Sender>
*			<Cube>
*				<Cube time="2014-06-12">
*				<Cube currency="USD" rate="1.3528"/>
*				<Cube currency="JPY" rate="138.12"/>
*				<Cube currency="BGN" rate="1.9558"/>
*				<Cube currency="CZK" rate="27.420"/>
*				<Cube currency="DKK" rate="7.4602"/>
*				<Cube currency="GBP" rate="0.80390"/>
*				<Cube currency="HUF" rate="305.84"/>
*				<Cube currency="LTL" rate="3.4528"/>
*				<Cube currency="PLN" rate="4.1040"/>
*				<Cube currency="RON" rate="4.3910"/>
*				<Cube currency="SEK" rate="9.0637"/>
*				<Cube currency="CHF" rate="1.2174"/>
*				<Cube currency="NOK" rate="8.1085"/>
*				<Cube currency="HRK" rate="7.5875"/>
*				<Cube currency="RUB" rate="46.4520"/>
*				<Cube currency="TRY" rate="2.8498"/>
*				<Cube currency="AUD" rate="1.4383"/>
*				<Cube currency="BRL" rate="3.0216"/>
*				<Cube currency="CAD" rate="1.4690"/>
*				<Cube currency="CNY" rate="8.4127"/>
*				<Cube currency="HKD" rate="10.4863"/>
*				<Cube currency="IDR" rate="15945.61"/>
*				<Cube currency="ILS" rate="4.6818"/>
*				<Cube currency="INR" rate="80.0114"/>
*				<Cube currency="KRW" rate="1375.88"/>
*				<Cube currency="MXN" rate="17.5769"/>
*				<Cube currency="MYR" rate="4.3493"/>
*				<Cube currency="NZD" rate="1.5591"/>
*				<Cube currency="PHP" rate="59.164"/>
*				<Cube currency="SGD" rate="1.6879"/>
*				<Cube currency="THB" rate="43.905"/>
*				<Cube currency="ZAR" rate="14.4648"/>
*				</Cube>
*			</Cube>
*		</gesmes:Envelope>
*/
var settings = require(__dirname + '/../../settings.js');
 
if (!settings.adapters.currency || !settings.adapters.currency.enabled) {
    process.exit();
}
 
var currencySettings = settings.adapters.currency.settings;
 
var logger      = require(__dirname + '/../../logger.js'),
    io_client   = require('socket.io-client'), 
    http        = require('http'),
	parseString = require('xml2js').parseString;
 
var objects     = {},
    datapoints  = {},
    devices     = [],
    isGotList   = false,
    pollTimer   = null,
    ccu_socket  = null,
    control_id ;
  
if (settings.ioListenPort) {
    ccu_socket = io_client.connect("127.0.0.1", {
        port: settings.ioListenPort
    });
} else if (settings.ioListenPortSsl) {
    ccu_socket = io_client.connect("127.0.0.1", {
        port: settings.ioListenPortSsl,
        secure: true
    });
} else {
    process.exit();
}
 
ccu_socket.on('connect', function () {
    logger.info("adapter currency  connected to ccu.io");
});
 
ccu_socket.on('disconnect', function () {
    logger.info("adapter currency  disconnected from ccu.io");
});
 
ccu_socket.on('event', function (obj) {
    if (!obj || !obj[0]) {
        return;
    }
    var id = obj[0];
 
    if (id != control_id) {
        return;
    }

    pollRates();
});
 
function stop() {
    if (pollTimer) {
        clearInterval(pollTimer);
        pollTimer = null;
    }
 
    logger.info("adapter currency  terminating");
 
    setTimeout(function () {
        process.exit();
    }, 250);
}

process.on('SIGINT', function () {
    stop();
});
 
process.on('SIGTERM', function () {
    stop();
});
 
function setObject(id, obj) {
    objects[id] = obj;
 
    if (obj.Value) {
        datapoints[obj.Name] = obj.Value;
    }
    ccu_socket.emit("setObject", id, obj);
}
 
function setState(id, val) {
    if (datapoints[id] === undefined || datapoints[id] !== val) {
        datapoints[id] = val;
        logger.info("adapter currency  setState " + id + " " + val);
        ccu_socket.emit("setState", [id, val, null, true]);
    }
}

function convertValue(rate) {
    return rate;
}
 
function getRates(callback) {
    var options = {
        host: 'www.ecb.europa.eu',
        port: 80,
        path: '/stats/eurofxref/eurofxref-daily.xml'
    };

    http.get(options, function(res) {
        var xmldata = '';
        res.setEncoding('utf8');
        res.on('error', function (e) {
            logger.warn ("currency: " + e);
        });
        res.on('data', function(chunk){
            xmldata += chunk;
        });
        res.on('end', function () {
            // Analyse answer and updates staties
            if (callback) {
                parseString(xmldata, function (err, data) {
                    if (!err && data) {
                        try {
                            var list = data['gesmes:Envelope']['Cube'][0]['Cube'][0]['Cube'];
                            var result = {};

                            for (var i = 0; i < list.length; i++) {
                                result[list[i]['$'].currency] = parseFloat(list[i]['$'].rate);
                            }
                        } catch(e) {
                            logger.warn("adapter currency: cannot parse xml answer");
                        }
                        callback(result);
                    } else {
                        logger.warn("adapter currency: cannot parse xml answer - " + err);
                    }
                });
            }
        });
    }).on('error', function(e) {
        logger.warn("adapter currency: Got error by request " + e.message);
    });
}
 
function pollRates() {
    if (isGotList) {
        getRates(function (rates) {
            if (rates) {
                for (var cur in rates) {
					if (devices[cur].value != rates[cur]) {
						devices[cur].value = rates[cur];
						setState(devices[cur].DPs.VALUE, convertValue(devices[cur].value));
					}
                }
				// Special case USD in RUB
				if (rates['RUB'] && rates['USD']) {
					var value = parseFloat(rates['RUB']) / parseFloat(rates['USD']);
					if (devices['USD_RUB'].value != value) {
						devices['USD_RUB'].value = value;
						setState(devices['USD_RUB'].DPs.VALUE, convertValue(value));
					}
				}				
			}
        });
    } else {
        // Try to get the initial read
        getRates(function (rates) {
            if (rates) {

                var dp;
                var chnDp;
                var devChannels = [];
			
				setObject(currencySettings.firstId + 2, {
					Name:         "currency.common.TIME",
					ValueType:    16,
					ValueSubType: 29,
					TypeName:     "HSSDP",
					Value:        0,
					Parent:       currencySettings.firstId + 1
				});
				control_id = currencySettings.firstId + 3;
				setObject(control_id, {
					Name:         "currency.common.FORCE_UPDATE",
					ValueType:    16,
					ValueSubType: 29,
					TypeName:     "HSSDP",
					Value:        0,
					Parent:       currencySettings.firstId + 1
				});					
				
				devChannels.push(currencySettings.firstId + 1);
				setObject(currencySettings.firstId + 1, {
					Name:     "currency.common",
					TypeName: "CHANNEL",
					Address:  "currency.common",
					HssType:  "currency",
					DPs:      {
								TIME:         currencySettings.firstId + 2,
								FORCE_UPDATE: currencySettings.firstId + 3
							  },
					Parent: currencySettings.firstId
				});
				var num = 0;
                for (var cur_ in rates) {
                    chnDp = currencySettings.firstId + 4 + num * 3;
                    dp    = chnDp + 1;

                    devChannels.push(chnDp);
                    devices[cur_] = {value: rates[cur_]};
                    devices[cur_].DPs = {
                        CURRENCY: dp + 0,
                        VALUE:    dp + 1
                    };

                    var chObject = {
                        Name:     "currency." + cur_,
                        TypeName: "CHANNEL",
                        Address:  "currency." + cur_,
                        DPs:      devices[cur_].DPs,
                        Parent:   currencySettings.firstId
                    };

                    setObject(chnDp, chObject);


					setObject(devices[cur_].DPs.CURRENCY, {
						Name:         chObject.Address + ".CURRENCY",
						ValueType:    16,
						ValueSubType: 29,
						TypeName:     "HSSDP",
						Value:        0,
						Parent:       chnDp
					});
					setObject(devices[cur_].DPs.VALUE, {
						Name:         chObject.Address + ".VALUE",
						ValueType:    16,
						ValueSubType: 29,
						TypeName:     "HSSDP",
						Value:        0,
						Parent:       chnDp
					});
					num++;
                }
				
				if (devices['RUB'] && devices['USD']) {
                    chnDp = currencySettings.firstId + 4 + num * 3;
                    dp    = chnDp + 1;

					var value = parseFloat(rates['RUB']) / parseFloat(rates['USD']);
                    devChannels.push(chnDp);
                    devices['USD_RUB'] = {value: value};
                    devices['USD_RUB'].DPs = {
                        CURRENCY: dp + 0,
                        VALUE:    dp + 1
                    };

                    var chObject = {
                        Name:     "currency.USD_RUB",
                        TypeName: "CHANNEL",
                        Address:  "currency.USD_RUB",
                        DPs:      devices['USD_RUB'].DPs,
                        Parent:   currencySettings.firstId
                    };

                    setObject(chnDp, chObject);

					setObject(devices['USD_RUB'].DPs.CURRENCY, {
						Name:         chObject.Address + ".CURRENCY",
						ValueType:    16,
						ValueSubType: 29,
						TypeName:     "HSSDP",
						Value:        0,
						Parent:       chnDp
					});
					setObject(devices['USD_RUB'].DPs.VALUE, {
						Name:         chObject.Address + ".VALUE",
						ValueType:    16,
						ValueSubType: 29,
						TypeName:     "HSSDP",
						Value:        0,
						Parent:       chnDp
					});				
				}

                setObject(currencySettings.firstId, {
                    Name:      "currency",
                    TypeName:  "DEVICE",
                    HssType:   "currency_ROOT",
                    Address:   "currency",
                    Interface: "CCU.IO",
                    Channels:  devChannels
                });

                if (num > 0) {
                    clearInterval(pollTimer);
                    pollTimer = null;

                    // Start the status polling
                    if (currencySettings.pollIntervalHours) {
                        pollTimer = setInterval(pollRates, currencySettings.pollIntervalHours * 1000 * 3600);
                    }
                    isGotList = true;

                    // Update initial states
                    for (var cur in rates) {
                        setState(devices[cur].DPs.CURRENCY, cur);
                        setState(devices[cur].DPs.VALUE, convertValue(devices[cur].value));
                    }
                    if (devices['USD_RUB']) {
                        setState(devices['USD_RUB'].DPs.CURRENCY, 'USD_RUB');
                        setState(devices['USD_RUB'].DPs.VALUE, convertValue(devices['USD_RUB'].value));
                    }
                }
            }
        });
    }
}
 
function currencyInit () {
    pollRates();

    // Try to get the list of rates
    pollTimer = setInterval(pollRates, 30000);
}
 
currencyInit ();