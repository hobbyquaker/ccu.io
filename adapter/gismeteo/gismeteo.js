 //Считать файл с настройками
var settings = require(__dirname+'/../../settings.js');
// Если настройки для драйвера не существуют или драйвер деактивирован
if (!settings.adapters.gismeteo || !settings.adapters.gismeteo.enabled) {
     // Завершаем процесс и не тратим память впустую
    process.exit();
}

// Подключаем модули для протоколирования и коммуникации с CCU.IO
var logger =    require(__dirname+'/../../logger.js'),
    io =        require('socket.io-client'),
    // Загрузим еще и модуль для выполнения GET/POST запросов по http
    http =        require('http'),
    // А также модуль парсинга XML, т.к. ГисМетео отдает результаты в XML
    parseString =  require('xml2js').parseString;


//Надо продумать структуру данных. Данные в CCU.IO устроены по следующему принципу.
//Device => Channel => Datapoint
//          Channel => Datapoint
//                  => Datapoint

// То есть в корне располагается устройство, у которого есть список каналов. Каждый канал должен иметь в списке детей хотя бы одну переменную (datapoint).

//Если посмотреть на возвращаемый формат XML файла:
//<MMWEATHER>
//	<REPORT type="frc3">
//		<TOWN index="28722" sname="%D3%F4%E0" latitude="54" longitude="55">
//			<FORECAST day="16" month="06" year="2014" hour="21" tod="3" predict="0" weekday="2">
//				<PHENOMENA cloudiness="0" precipitation="10" rpower="0" spower="0"/>
//				<PRESSURE max="745" min="743"/>
//				<TEMPERATURE max="15" min="13"/>
//				<WIND min="1" max="3" direction="5"/>
//				<RELWET max="77" min="75"/>
//				<HEAT min="13" max="15"/>
//			</FORECAST>
//			<FORECAST day="17" month="06" year="2014" hour="03" tod="0" predict="0" weekday="3">
//				<PHENOMENA cloudiness="1" precipitation="10" rpower="0" spower="0"/>
//				<PRESSURE max="746" min="744"/>
//				<TEMPERATURE max="11" min="9"/>
//				<WIND min="-1" max="1" direction="1"/>
//				<RELWET max="93" min="91"/>
//				<HEAT min="9" max="11"/>
//			</FORECAST>
//			<FORECAST day="17" month="06" year="2014" hour="09" tod="1" predict="0" weekday="3">
//				<PHENOMENA cloudiness="0" precipitation="10" rpower="0" spower="0"/>
//				<PRESSURE max="747" min="745"/>
//				<TEMPERATURE max="15" min="13"/>
//				<WIND min="0" max="2" direction="5"/>
//				<RELWET max="85" min="83"/>
//				<HEAT min="13" max="15"/>
//			</FORECAST>
//			<FORECAST day="17" month="06" year="2014" hour="15" tod="2" predict="0" weekday="3">
//				<PHENOMENA cloudiness="2" precipitation="10" rpower="0" spower="0"/>
//				<PRESSURE max="748" min="746"/>
//				<TEMPERATURE max="20" min="18"/>
//				<WIND min="3" max="5" direction="5"/>
//				<RELWET max="54" min="52"/>
//				<HEAT min="18" max="20"/>
//			</FORECAST>
//		</TOWN>
//	</REPORT>
//</MMWEATHER>
 
// То можно видеть, что ответ содержит данные для сегодня и три значения на завтра.
// Я буду использовать вот такую структуру данных.
// gismeteo(Device) => now (channel)   => DATE         (datapoint)
//                                     => PRESSURE_MIN (datapoint)
//                                     => PRESSURE_MAX (datapoint)
//                                     => TEMPERATURE  (datapoint)
//                                     => HUMIDITY     (datapoint. Может, конечно, RELWET означает вероятность дождя, но для данного примера это не так важно)
// 
//                     next (channel)  => DATE         (datapoint)
//                                     => PRESSURE_MIN (datapoint)
//                                     => PRESSURE_MAX (datapoint)
//                                     => TEMPERATURE  (datapoint)
//                                     => HUMIDITY     (datapoint. Может, конечно, RELWET означает вероятность дождя, но для данного примера это не так важно)
// 
// Создадим внутренние переменные:
 
var pollTimer        = null, // Таймер для опроса gismeteo
    socket           = null, // Сокет для коммуникации с CCU.IO
    gismeteoSettings = settings.adapters.gismeteo.settings; // Переменная с настройками драйвера (вернемся к настройкам позже)
   
// Соединяемся с CCU.IO
if (settings.ioListenPort) {
    socket = io.connect("127.0.0.1", {
        port: settings.ioListenPort
    });
} else if (settings.ioListenPortSsl) {
    socket = io.connect("127.0.0.1", {
        port: settings.ioListenPortSsl,
        secure: true
    });
} else {
    process.exit();
}

// Реакция на события из сокета
// При соединении
socket.on('connect', function () {
    // драйвер соединился с ccu.io
    logger.info("adapter gismeteo connected to ccu.io");
});

socket.on('disconnect', function () {
    // драйвер потерял соединение с ccu.io. Ничего делать не надо. Он сам снова соединится.
    logger.info("adapter gismeteo disconnected from ccu.io");
});

// Событие от CCU.IO (напишем код позже)
socket.on('event', function (obj) {
    if (!obj || !obj[0]) {
        return;
    }
	
	// CCU.IO шлёт массив из 4х переменных [ID, value, direction, timestamp]
	var ID  = obj[0];
	var val = obj[1];
	var dir = obj[2]; // direction true означает, что данные пришли от драйвера, false - данные пришли от GUI, ScriptEngine, или другого адаптера
	var ts  = obj[3];
	
	if (dir) {
		return;
	}
	
	if ((ID == nowChannel_DPs.DATE || ID == nextChannel_DPs.DATE) && val == true) {
		pollGismeteo();
	}	
});

// Функция завершения драйвера. Очень важно, иначе драйвер при перезапуске CCU.IO останется висеть в памяти и будет дальше пытаться соединится
function stop() {
    logger.info("adapter gismeteo terminating");

	// Останавливаем таймер
	if (pollTimer) {
		clearInterval(pollTimer);
		pollTimer = null; // форсируем запуск сборщика мусора
	}
	
	// и через 250 мсекунд завершаем процесс
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

// Упростив вызов создания объекта
function setObject (id, obj) {
	socket.emit("setObject", id, obj);
}
function setState(id, val) {
	socket.emit("setState", [id, val, null, true]);
}

// Теперь создаем объекты. Здесь важно использовать настройки для драйвера, которая определяет адресное пространство драйвера firstId
var rootDevice   = gismeteoSettings.firstId;
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

//Создаем объекты в CCU.IO при старте
function initGismeteo () {
	// Сначала переменные для канала сегодня
	setObject(nowChannel_DPs.DATE, {
		Name:     "gismeteo.now.DATE",
		TypeName: "HSSDP", // говорит CCU.IO, что это переменная содержит реальные значения а не просто структурный элемент, т.е. это datapoint
		Parent:   nowChannel 
	});
	setObject(nowChannel_DPs.PRESSURE_MIN, {
		Name:     "gismeteo.now.PRESSURE_MIN",
		TypeName: "HSSDP", // говорит CCU.IO, что это переменная содержит реальные значения а не просто структурный элемент, т.е. это datapoint
		Parent:   nowChannel 
	});
	setObject(nowChannel_DPs.PRESSURE_MAX, {
		Name:     "gismeteo.now.PRESSURE_MAX",
		TypeName: "HSSDP", // говорит CCU.IO, что это переменная содержит реальные значения а не просто структурный элемент, т.е. это datapoint
		Parent:   nowChannel 
	});
	setObject(nowChannel_DPs.TEMPERATURE, {
		Name:     "gismeteo.now.TEMPERATURE",
		TypeName: "HSSDP", // говорит CCU.IO, что это переменная содержит реальные значения а не просто структурный элемент, т.е. это datapoint
		Parent:   nowChannel 
	});
	setObject(nowChannel_DPs.HUMIDITY, {
		Name:     "gismeteo.now.HUMIDITY",
		TypeName: "HSSDP", // говорит CCU.IO, что это переменная содержит реальные значения а не просто структурный элемент, т.е. это datapoint
		Parent:   nowChannel 
	});

	// Потом сам канал сегодня
	setObject(nowChannel, {
		Name:     "gismeteo.now", // Имя канала
		TypeName: "CHANNEL",        // Важно. Говорит CCU.IO, что это канал
		Address:  "gismeteo.now",
		HssType:  "gismeteo",       // Помоему это свойство можно опустить
		DPs:      nowChannel_DPs,
		Parent:   rootDevice        // Говорит адрес корневого элемента
	});
	
	// тоже самое для завтра
	setObject(nextChannel_DPs.DATE, {
		Name:     "gismeteo.next.DATE",
		TypeName: "HSSDP", // говорит CCU.IO, что это переменная содержит реальные значения а не просто структурный элемент, т.е. это datapoint
		Parent:   nextChannel 
	});	
	setObject(nextChannel_DPs.PRESSURE_MIN, {
		Name:     "gismeteo.next.PRESSURE_MIN",
		TypeName: "HSSDP", // говорит CCU.IO, что это переменная содержит реальные значения а не просто структурный элемент, т.е. это datapoint
		Parent:   nextChannel 
	});
	setObject(nextChannel_DPs.PRESSURE_MAX, {
		Name:     "gismeteo.next.PRESSURE_MAX",
		TypeName: "HSSDP", // говорит CCU.IO, что это переменная содержит реальные значения а не просто структурный элемент, т.е. это datapoint
		Parent:   nextChannel 
	});
	setObject(nextChannel_DPs.TEMPERATURE, {
		Name:     "gismeteo.next.TEMPERATURE",
		TypeName: "HSSDP", // говорит CCU.IO, что это переменная содержит реальные значения а не просто структурный элемент, т.е. это datapoint
		Parent:   nextChannel 
	});
	setObject(nextChannel_DPs.HUMIDITY, {
		Name:     "gismeteo.next.HUMIDITY",
		TypeName: "HSSDP", // говорит CCU.IO, что это переменная содержит реальные значения а не просто структурный элемент, т.е. это datapoint
		Parent:   nextChannel 
	});

	// Потом сам канал сегодня
	setObject(nextChannel, {
		Name:     "gismeteo.next", // Имя канала
		TypeName: "CHANNEL",        // Важно. Говорит CCU.IO, что это канал
		Address:  "gismeteo.next",
		HssType:  "gismeteo",       // Помоему это свойство можно опустить
		DPs:      nextChannel_DPs,
		Parent:   rootDevice        // Говорит адрес корневого элемента
	});	
	
	// И напоследок корневой элемент
	setObject(rootDevice, {
		Name:      "gismeteo",
		TypeName:  "DEVICE",
		HssType:   "gismeteo_ROOT",
		Address:   "gismeteo",
		Interface: "CCU.IO",
		Channels:  [      // Массив с адресами каналов
			nowChannel,
			nextChannel
		]
	});
	
	// Выполняем один раз опрос
	pollGismeteo();
	
	// и запускаем таймер
    pollTimer = setInterval(pollGismeteo, gismeteoSettings.pollIntervalHours * 3600000 /* ms */);
}

// запрашиваем объект 
function getXmlResponse(callback) {
    var options = {
        host: 'informer.gismeteo.com',
        port: 80,
        path: '/xml/' + gismeteoSettings.cityId + '_1.xml'
    };

    console.log('http://informer.gismeteo.com/xml/' + gismeteoSettings.cityId + '_1.xml');

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
                    var result = null;
                    if (!err && data) {
                        try {
							// я не знаю точно, какой объект вернет парсер XML, 
							// поэтому я сначала вывожу в консоли его структуру командой: console.log(JSON.stringify(data, "", " "));
							// получаем
							// {
							//  "MMWEATHER": {
							//   "REPORT": [
							//    {
							//     "$": {
							//      "type": "frc3"
							//     },
							//     "TOWN": [
							//      {
							//       "$": {
							//        "index": "28722",
							//        "sname": "%D3%F4%E0",
							//        "latitude": "54",
							//        "longitude": "55"
							//       },
							//       "FORECAST": [
							//        {
							//         "$": {
							//          "day": "17",
							//          "month": "06",
							//          "year": "2014",
							//          "hour": "03",
							//          "tod": "0",
							//          "predict": "0",
							//          "weekday": "3"
							//         },
							//         "PHENOMENA": [
							//          {
							//           "$": {
							//            "cloudiness": "1",
							//            "precipitation": "10",
							//            "rpower": "0",
							//            "spower": "0"
							//           }
							//          }
							//         ],
							//         "PRESSURE": [
							//          {
							//           "$": {
							//            "max": "746",
							//            "min": "744"
							//           }
							//          }
							//         ],
							//         "TEMPERATURE": [
							//          {
							//           "$": {
							//            "max": "11",
							//            "min": "9"
							//           }
							//          }
							//         ],
							//         "WIND": [
							//          {
							//           "$": {
							//            "min": "-1",
							//            "max": "1",
							//            "direction": "1"
							//           }
							//          }
							//         ],
							//         "RELWET": [
							//          {
							//           "$": {
							//            "max": "93",
							//            "min": "91"
							//           }
							//          }
							//         ],
							//         "HEAT": [
							//          {
							//           "$": {
							//            "min": "9",
							//            "max": "11"
							//           }
							//          }
							//         ]
							//        },
							//        {
							//         "$": {
							//          "day": "17",
							//          "month": "06",
							//          "year": "2014",
							//          "hour": "09",
							//          "tod": "1",
							//          "predict": "0",
							//          "weekday": "3"
							//         },
							//         "PHENOMENA": [
							//          {
							//           "$": {
							//            "cloudiness": "0",
							//            "precipitation": "10",
							//            "rpower": "0",
							//            "spower": "0"
							//           }
							//          }
							//         ],
							//         "PRESSURE": [
							//          {
							//           "$": {
							//            "max": "747",
							//            "min": "745"
							//           }
							//          }
							//         ],
							//         "TEMPERATURE": [
							//          {
							//           "$": {
							//            "max": "15",
							//            "min": "13"
							//           }
							//          }
							//         ],
							//         "WIND": [
							//          {
							//           "$": {
							//            "min": "0",
							//            "max": "2",
							//            "direction": "5"
							//           }
							//          }
							//         ],
							//         "RELWET": [
							//          {
							//           "$": {
							//            "max": "85",
							//            "min": "83"
							//           }
							//          }
							//         ],
							//         "HEAT": [
							//          {
							//           "$": {
							//            "min": "13",
							//            "max": "15"
							//           }
							//          }
							//         ]
							//        },
							//        {
							//         "$": {
							//          "day": "17",
							//          "month": "06",
							//          "year": "2014",
							//          "hour": "15",
							//          "tod": "2",
							//          "predict": "0",
							//          "weekday": "3"
							//         },
							//         "PHENOMENA": [
							//          {
							//           "$": {
							//            "cloudiness": "2",
							//            "precipitation": "10",
							//            "rpower": "0",
							//            "spower": "0"
							//           }
							//          }
							//         ],
							//         "PRESSURE": [
							//          {
							//           "$": {
							//            "max": "748",
							//            "min": "746"
							//           }
							//          }
							//         ],
							//         "TEMPERATURE": [
							//          {
							//           "$": {
							//            "max": "20",
							//            "min": "18"
							//           }
							//          }
							//         ],
							//         "WIND": [
							//          {
							//           "$": {
							//            "min": "3",
							//            "max": "5",
							//            "direction": "5"
							//           }
							//          }
							//         ],
							//         "RELWET": [
							//          {
							//           "$": {
							//            "max": "54",
							//            "min": "52"
							//           }
							//          }
							//         ],
							//         "HEAT": [
							//          {
							//           "$": {
							//            "min": "18",
							//            "max": "20"
							//           }
							//          }
							//         ]
							//        },
							//        {
							//         "$": {
							//          "day": "17",
							//          "month": "06",
							//          "year": "2014",
							//          "hour": "21",
							//          "tod": "3",
							//          "predict": "0",
							//          "weekday": "3"
							//         },
							//         "PHENOMENA": [
							//          {
							//           "$": {
							//            "cloudiness": "2",
							//            "precipitation": "10",
							//            "rpower": "0",
							//            "spower": "0"
							//           }
							//          }
							//         ],
							//         "PRESSURE": [
							//          {
							//           "$": {
							//            "max": "749",
							//            "min": "747"
							//           }
							//          }
							//         ],
							//         "TEMPERATURE": [
							//          {
							//           "$": {
							//            "max": "19",
							//            "min": "17"
							//           }
							//          }
							//         ],
							//         "WIND": [
							//          {
							//           "$": {
							//            "min": "0",
							//            "max": "2",
							//            "direction": "6"
							//           }
							//          }
							//         ],
							//         "RELWET": [
							//          {
							//           "$": {
							//            "max": "60",
							//            "min": "58"
							//           }
							//          }
							//         ],
							//         "HEAT": [
							//          {
							//           "$": {
							//            "min": "17",
							//            "max": "19"
							//           }
							//          }
							//         ]
							//        }
							//       ]
							//      }
							//     ]
							//    }
							//   ]
							//  }
							// }
							
							var list = data['MMWEATHER']['REPORT'][0]['TOWN'][0]['FORECAST']; // Можно использовать data.MMWEATHER.REPORT[0].TOWN[0].FORECAST
                            result = {};

							result['now'] = {
								DATE:         list[0].$.year + '.' + list[0]['$'].month + '.' + list[0]['$'].day,
								PRESSURE_MIN: list[0].PRESSURE[0].$.min, 
								PRESSURE_MAX: list[0].PRESSURE[0].$.max,
								TEMPERATURE:  (parseFloat(list[0].TEMPERATURE[0].$.max) + parseFloat(list[0].PRESSURE[0].$.min)) / 2, // берем значение в середине
								HUMIDITY:     (parseFloat(list[0].RELWET[0].$.max) + parseFloat(list[0].RELWET[0].$.min)) / 2        // берем значение в середине
							};
							// Ищем значение для 15:00 и возьмем его, как температуру на завтра
                            for (var i = 1; i < list.length; i++) {
								if (list[i].$.hour == "15") {
									result['next'] = {
										DATE:         list[i].$.year + '.' + list[i]['$'].month + '.' + list[i]['$'].day,
										PRESSURE_MIN: list[i].PRESSURE[0].$.min, 
										PRESSURE_MAX: list[i].PRESSURE[0].$.max,
										TEMPERATURE:  (parseFloat(list[i].TEMPERATURE[0].$.max) + parseFloat(list[i].PRESSURE[0].$.min)) / 2, // берем значение в середине
										HUMIDITY:     (parseFloat(list[i].RELWET[0].$.max) + parseFloat(list[i].RELWET[0].$.min)) / 2        // берем значение в середине
									};
									break;
								}
                            }
                        } catch(e) {
                            logger.warn("adapter gismeteo: cannot parse xml answer");
                        }
                        callback(result);
                    } else {
                        logger.warn("adapter gismeteo: cannot parse xml answer - " + err);
                    }
                });
            }
        });
    }).on('error', function(e) {
        logger.warn("adapter gismeteo: Got error by request " + e.message);
    });
}

// опрашивем gismeteo
function pollGismeteo () {
	getXmlResponse(function (data) {
		if (data) {
			// Передать данные для сейчас
			setState(nowChannel_DPs.DATE,         data.now.DATE);
			setState(nowChannel_DPs.PRESSURE_MIN, data.now.PRESSURE_MIN);
			setState(nowChannel_DPs.PRESSURE_MAX, data.now.PRESSURE_MAX);
			setState(nowChannel_DPs.TEMPERATURE,  data.now.TEMPERATURE);
			setState(nowChannel_DPs.HUMIDITY,     data.now.HUMIDITY);
			
			// Передать данные для завтра
			setState(nextChannel_DPs.DATE,         data.next.DATE);
			setState(nextChannel_DPs.PRESSURE_MIN, data.next.PRESSURE_MIN);
			setState(nextChannel_DPs.PRESSURE_MAX, data.next.PRESSURE_MAX);
			setState(nextChannel_DPs.TEMPERATURE,  data.next.TEMPERATURE);
			setState(nextChannel_DPs.HUMIDITY,     data.next.HUMIDITY);		
		}
	});
}

// Инициализируем драйвер
initGismeteo ();