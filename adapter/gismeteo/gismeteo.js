//    Gismeteo Driver for CCU.IO
//     Сopyright 2014  Bluefox
//
// Это демо драйвер, созданный для того, что бы объяснить, как писать собственный драйвер
// Рассмотрим web сервис gismeteo.ru. Он возвращает в XML прогноз погоды и актуальные значения для погоды в конкретном городе.
// Вы можете выбрать ID города на странице http://informer.gismeteo.com/getcode/xml.php
// ID города можно считать немного ниже в виде http://informer.gismeteo.com/xml/29865_1.xml, где 29865 ID города.
// Вызвав ссылку с xml можно посмотреть на формат данных. Они приведены ниже в коде.
// Читайте коментарии на русском и, надеюсь, кое сто будет понятно.

// Es ist ein Demo-Adapter. Der wurde dafür geschrieben um zu erklären, wie man einen Adapter kreiert.
// Nehmen wir einen Web-Service gismeteo.ru. Service gibt zurück die Vorhersage für Morgen und aktuelle Daten für jetzt in einer bestimmten Stadt.
// Leider unterstützt der Service keine nicht russischen Städte, aber es ist doch nur einen Beispiel.
// Man kann auf der Seite http:informer.gismeteo.com/getcode/xml.php eine ID für die Stadt finden.
// Z.B. http:informer.gismeteo.com/xml/27612_1.xml ist für Moskau, wo 27612 ist ID für Moskau.
// Wenn man das Link aufruft, kann man die Struktur von XML Antwort sehen. Ein Beispiel kann man unten im Kode sehen.
// Lesen Sie die Kommentare auf Deutsch und, hoffentlich, wird einiges klare.

// This is a demo adapter. This adapter was written as instruction for own adapter creation.
// Let's take the web service gismeteo.ru. The service returns the weather forecast for tomorrow and actual weather data for todey in some specific city.
// Unfortunately, the servvice does not support non-russian cities, but this adapter is only an example.
// On the web page http://informer.gismeteo.com/getcode/xml.php the ID of the specific city can be found.
// For example http://informer.gismeteo.com/xml/27612_1.xml is link for xml data for Moscow, where 27612 is the ID for Moscow.
// If you call the given link, you can see the sturcture of the XML response. One answer can be found bellow in code.
// Read the comments and, hopefully, it will be something clearer.

// Как отлаживать драйвер:
// - Настроить драйвер в файле ccu.io/datastore/adapter-gismeteo.json (28722 можно заменить на ваш город)
//     {
//    "enabled": true,
//    "settings": {
//      "firstId": 71300,
//      "cityId": 28722,
//      "pollIntervalHours": 6
//    }
//  }
// - Войти в папку ccu.io в коммандной строке (cmd.exe или shell)
// - вызвать: node adapter/gismeteo/gismeteo.js 
// - смотреть встроенные выводы, через console.log 
//
// Можно использовать для отладки браузер Chrome (http://greenido.wordpress.com/2013/08/27/debug-nodejs-like-a-pro/)
// или при помощи WebStorm


// Wie kann man Adapter debuggen:
// - Einstellen den Adapter in  ccu.io/datastore/adapter-gismeteo.json
//     {
//    "enabled": true,
//    "settings": {
//      "firstId": 71300,
//      "cityId": 28722,
//      "pollIntervalHours": 6
//    }
//  }
// - Das Verzeichnis ccu.io wählen in der Kommandozeile (cmd.exe oder shell)
// - Aufrufen: node adapter/gismeteo/gismeteo.js 
// - console.log Ausgaben betrachten
// 
// Man kann auch Chrome für Debugging benutzen (http://greenido.wordpress.com/2013/08/27/debug-nodejs-like-a-pro/)
// oder WebStorm.

// How to debug the adapter:
// - Set up the den Adapter in  ccu.io/datastore/adapter-gismeteo.json
//     {
//    "enabled": true,
//    "settings": {
//      "firstId": 71300,
//      "cityId": 28722,
//      "pollIntervalHours": 6
//    }
//  }
//
// - Go to directory ccu.io in command console (cmd.exe or shell)
// - Call: node adapter/gismeteo/gismeteo.js 
// - Analyse the outputs of console.log 
// 
// You can debug with Chrome (http://greenido.wordpress.com/2013/08/27/debug-nodejs-like-a-pro/) too
// or WebStorm.

//--------------------------------------------------------------------------------------------------------
// Считать файл с настройками
// Lese die Datei mit der Adapter-Einstellungen
// Read the file with adapter settings
var adapter     = require(__dirname + '/../../utils/adapter-init.js').Adapter("gismeteo"),
    // Загрузим еще и модуль для выполнения GET/POST запросов по http
    // Der Modul für GET/POST anfragen laden, weil wir nehmen die Antworte mit HTTP GET
    // Load the HTTP GET/POST module to request the XML file per HTTP GET
    http        = require('http'),

    // А также модуль парсинга XML, т.к. ГисМетео отдает результаты в XML
    // Und noch einen Modul für XML-Parsing.
    // And another module for xml parsing
    parseString =  require('xml2js').parseString;


// Надо продумать структуру данных. Данные в CCU.IO устроены по следующему принципу.
// Устройство1 => Канал1 => Данные1
//                Канал2 => Данные2
//                       => Данные3
// Устройство2 => Канал3 => Данные4
//                Канал4 => Данные5
// То есть в корне располагается устройство, у которого есть список каналов. Каждый канал должен иметь в списке детей хотя бы одну переменную (datapoint).

// Man muss über die Datenstruktur nachdenken. Die Daten in CCU.IO sind wie folgt aufgebaut:
// Gerät1 => Kanal1 => Datenpunkt1
//           Kanal2 => Datenpunkt2
//                  => Datenpunkt3
// Gerät2 => Kanal3 => Datenpunkt4
//           Kanal4 => Datenpunkt5
// Das heißt im Root sind die Geräte die eine Liste von Kanälen haben. Jeder Kanal soll die Liste mit mindestens einem Kind haben.

// You should think about the data structure of the channel. The data in CCU.IO looks like:
// Device1 => Channel1 => Data point1
//            Channel2 => Data point2
//                     => Data point3
// Device1 => Channel3 => Data point4
//            Channel4 => Data point5
// The devcices in root have the list of child channels. Every channel must have the list with at least one data point.

// Если посмотреть на возвращаемый формат XML файла:
// Hier ist ungefähr das, was als XML - Antwort kommt:
// Here is an example of one XML response of the service:
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

// Man kann sehen, dass der Antwort hat die Daten für jetzt und 3 Werte für Morgen.
// Ich werde folgende Datenstruktur benutzen:

// You can see, that the answer has one value for today/now and 3 following values for future.
// I will use following data structure:

// gismeteo(Device) => now (channel)   => DATE         (datapoint)
//                                     => PRESSURE_MIN (datapoint)
//                                     => PRESSURE_MAX (datapoint)
//                                     => TEMPERATURE  (datapoint)
//                                     => HUMIDITY     (datapoint. Может, конечно, RELWET означает вероятность дождя, но для данного примера это не так важно
//                                                                 Vielleicht RELWET ist Regenwahrscheinlichkeit, aber für diesen Beispiel ist es nicht wichtig
//                                                                 May be RELWET is rain probability, but for this example it is not important.
// 
//                     next (channel)  => DATE         (datapoint)
//                                     => PRESSURE_MIN (datapoint)
//                                     => PRESSURE_MAX (datapoint)
//                                     => TEMPERATURE  (datapoint)
//                                     => HUMIDITY     (datapoint.
//


// Создадим внутренние переменные:
// Interne Variable definieren:
// Let's define internal variables:
var pollTimer        = null; // Таймер для опроса gismeteo
                             // Timer für die Anfragen
                             // Timer for polling

// Теперь создаем объекты. Здесь важно использовать настройки для драйвера, которая определяет адресное пространство драйвера firstId
// Jetzt kreieren wir die Datenobjekte in CCU.IO. Es ist wichtig die Einstellungen für Adapter zu nutzen. firstId beschriebt die erste ID für diesen Adapter.
// Now create the data objects in CCU.IO for adapter. It is important to use firtsId variable in adpater settings to start the object IDs of adapter from it.
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

// Событие от CCU.IO. Драйвер получает сообщения обо всех изменениях, а не только своих.
// Ein Ereignis von CCU.IO. Adapter bekommt die Nachrichten über alle Änderungen und nicht nur eigenen.
// Handler for event from CCU.IO. The adapter gets the events about all datapoints and not only owns.
adapter.onEvent = function (ID, val, ts, dir) {
    // direction true означает, что данные пришли от драйвера, false - данные пришли от GUI, ScriptEngine, или другого адаптера
    // Falls die Richtung ist "true", das heißt die Daten sind von internen Adapter oder von uns selbst gekommen. "false" bedeutet, dass die Daten sind von GUI/DashUI oder ScriptEngine.
    // If the direction is "true" that means the data is from other internal adapter or from ourself. "false" means the data is from GUI/DashUI or from script engine.

    // Мы на хотим реагировать на изменения, которые сами же внесли
    // Wir wollen auf eigene Änderungs-Ereignisse nicht reagieren
    // We don' want to process our own changes.
    if (dir) {
        return;
    }

    // Если в переменную DATE записали значение TRUE => одновить погодные данные немедленно
    // Falls DATE hat den Wert TRUE => Updaten die Wetterdaten sofort
    // If date has value TRUE => reload the data immediately
    if ((ID == nowChannel_DPs.DATE || ID == nextChannel_DPs.DATE) && val == true) {
        pollGismeteo();
    }
};

// Вызывается при остановке адаптера
// Wird beim Adapter-Stop aufgerufen
// Called by adapter stopping
adapter.onStop = function () {
    // Останавливаем таймер
    // Anhalten den Poll-Timer
    // Stop the poll timer
    if (pollTimer) {
        clearInterval(pollTimer);
        pollTimer = null; // форсируем запуск сборщика мусора
        // Sage zu Garbage Collector, dass Objekt nicht mehr benutzt wird
        // Say to garbage collector, that object is free now
    }
};


// Создаем объекты в CCU.IO при старте
// Die Objekten beim Adapterstart erzeugen
// Create data objects by adapter start
function initGismeteo () {
	// Сначала переменные для канала сегодня
    // Erst die Datenpunkte für jetzt
    // First the datapoints for NOW
	adapter.createDP(
        nowChannel_DPs.DATE,
        nowChannel,   // Говорит ID корневого элемента/канала (Важно)
                      // ID von dem übergeordneten Kanal (Wichtig)
                      // Id of the parent channel. Must be defined
        "gismeteo.now.DATE"
    );

    adapter.createDP(nowChannel_DPs.PRESSURE_MIN, nowChannel, "gismeteo.now.PRESSURE_MIN");
    adapter.createDP(nowChannel_DPs.PRESSURE_MAX, nowChannel, "gismeteo.now.PRESSURE_MAX");
    adapter.createDP(nowChannel_DPs.TEMPERATURE,  nowChannel, "gismeteo.now.TEMPERATURE");
    adapter.createDP(nowChannel_DPs.HUMIDITY,     nowChannel, "gismeteo.now.HUMIDITY");

	// Потом сам канал сегодня
    // dann Kanal - Next
    // then Channel - next
    adapter.createChannel (
        nowChannel,              
        rootDevice,              // Говорит ID корневого элемента (Важно)
                                 // ID von dem übergeordneten Gerät (Wichtig)
                                 // Id of the parent device. Must be defined
        
        "gismeteo.now",          // Имя канала
                                 // Kanalsname
                                 // Channel name
        
        nowChannel_DPs,          // Список ID данных, принадлежащих этому каналу. Тип array. Обязателен
                                 // Datenpunkten-Liste als IDs, die zu diesem Kanal gehören (als Array). Muss unbedingt definiert sein.
                                 // Data points ID list of the channel (as JS array). Must be defined.
        
        {HssType:  "gismeteo"}   // Тип канала. Это свойство можно опустить
                                 // Kanal-Typ. Ist unwichtig
                                 // Channel type. Can be ignored
    );
	
	// тоже самое для следующегр канала
	// Das gleiche ist für den nächsten Kanal
	// The same is for th next channel
    adapter.createDP(
        nextChannel_DPs.DATE,
        nextChannel,   // Говорит ID корневого элемента/канала (Важно)
                       // ID von dem übergeordneten Kanal (Wichtig)
                       // Id of the parent channel. Must be defined
        "gismeteo.next.DATE"
    );

    adapter.createDP(nextChannel_DPs.PRESSURE_MIN, nextChannel, "gismeteo.next.PRESSURE_MIN");
    adapter.createDP(nextChannel_DPs.PRESSURE_MAX, nextChannel, "gismeteo.next.PRESSURE_MAX");
    adapter.createDP(nextChannel_DPs.TEMPERATURE,  nextChannel, "gismeteo.next.TEMPERATURE");
    adapter.createDP(nextChannel_DPs.HUMIDITY,     nextChannel, "gismeteo.next.HUMIDITY");    

	// Потом сам канал завтра
	// Kanal - Next
	// Channel - next
    adapter.createChannel (
        nextChannel,
        rootDevice,              // Говорит ID корневого элемента (Важно)
        // ID von dem übergeordneten Gerät (Wichtig)
        // Id of the parent device. Must be defined

        "gismeteo.next",          // Имя канала
        // Kanalsname
        // Channel name

        nextChannel_DPs,          // Список ID данных, принадлежащих этому каналу. Тип array. Обязателен
        // Datenpunkten-Liste als IDs, die zu diesem Kanal gehören (als Array). Muss unbedingt definiert sein.
        // Data points ID list of the channel (as JS array). Must be defined.

        {HssType:  "gismeteo"}   // Тип канала. Это свойство можно опустить
        // Kanal-Typ. Ist unwichtig
        // Channel type. Can be ignored
    );    
    
	// И напоследок корневой элемент
	// Und am Ende das Root-Element
	// And at the end the root element
    adapter.createDevice(
        rootDevice, 
        "gismeteo",                 // Имя устройства (Важно)
                                    // Gerätname (Wichtig)
                                    // Device name (Important)
        
        [                           // Массив с ID каналов (Важно)
            nowChannel,             // Array mit Kanal-IDs (Wichtig)
            nextChannel             // Channel IDs Array (Important)
        ],
        {HssType:   "gismeteo_ROOT"}// Тип устройства. Это свойство можно опустить
                                    // Gerätetyp. Ist unwichtig
                                    // Device type. Can be ignored
    );
	
	// Выполняем один раз опрос
	// Fragen zum ersten Mal 
	// Request for the first time
	pollGismeteo();
	
	// и запускаем циклический таймер
	// und zyklischen Timer starten
	// and start the cyclic timer
    pollTimer = setInterval(pollGismeteo, adapter.settings.pollIntervalHours * 3600000 /* ms */);
}

// запрашиваем объект c gismeteo.ru
// fragen bei gismeteo.ru für XML Daten
// request xml data at gismeteo.ru
function getXmlResponse(callback) {
    var options = {
        host: 'informer.gismeteo.com',
        port: 80,
        path: '/xml/' + adapter.settings.cityId + '_1.xml'
    };

    console.log('http://informer.gismeteo.com/xml/' + adapter.settings.cityId + '_1.xml');

	// Здесь можно почитать, как использовать http.get
	// Hier kann man mehr Information über "http.get" finden
	// You can find more information about http.get here
	// http://nodejs.org/api/http.html#http_http_get_options_callback
	
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
        	// Получение данных закончилось. Анализируеи ответ
        	// Wir haben alle Pakete bekommen. Antwort analysieren
            // Analyse answer and updates states
            if (callback) {
                parseString(xmldata, function (err, data) {
                    var result = null;
                    if (!err && data) {
                        try {
							// я не знаю точно, какой объект вернет парсер XML, 
							// поэтому я сначала вывожу в консоли его структуру командой: console.log(JSON.stringify(data, "", " "));
							// получаем
							
							// Ich weiß nicht, wie das XML Objekt nach dem Parser aussieht, 
							// deswegen ich gebe deren Format mit dem Befehl aus: console.log(JSON.stringify(data, "", " "));
							// bekommen:
							
							// I don't know the structure of  XML Object after parser,
							// so I print the structure with command: console.log(JSON.stringify(data, "", " "));
							// got:
							
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
							
							// Можно использовать data.MMWEATHER.REPORT[0].TOWN[0].FORECAST
							// Man kann auch benutzen data.MMWEATHER.REPORT[0].TOWN[0].FORECAST
							// You can use  data.MMWEATHER.REPORT[0].TOWN[0].FORECAST too
							var list = data['MMWEATHER']['REPORT'][0]['TOWN'][0]['FORECAST']; 
                            result = {};

							result['now'] = {
								DATE:         list[0].$.year + '.' + list[0]['$'].month + '.' + list[0]['$'].day,
								PRESSURE_MIN: list[0].PRESSURE[0].$.min, 
								PRESSURE_MAX: list[0].PRESSURE[0].$.max,
								TEMPERATURE:  (parseFloat(list[0].TEMPERATURE[0].$.max) + parseFloat(list[0].TEMPERATURE[0].$.min)) / 2, // берем значение в середине
								HUMIDITY:     (parseFloat(list[0].RELWET[0].$.max) + parseFloat(list[0].RELWET[0].$.min)) / 2        // берем значение в середине
							};
                            result['next'] = {};
                            
							// Ищем значение для 15:00 и возьмем его, как температуру на завтра
							// Suchen wir den Wert 15:00 und nehmen den als Temperatur für Morgen
							// Try to find the value 15:00 and take it as temperature for tomorrow
                            for (var i = 1; i < list.length; i++) {
								if (list[i].$.hour == "15") {
									result['next'] = {
										DATE:         list[i].$.year + '.' + list[i]['$'].month + '.' + list[i]['$'].day,
										PRESSURE_MIN: list[i].PRESSURE[0].$.min, 
										PRESSURE_MAX: list[i].PRESSURE[0].$.max,
										TEMPERATURE:  (parseFloat(list[i].TEMPERATURE[0].$.max) + parseFloat(list[i].TEMPERATURE[0].$.min)) / 2, // берем значение в середине
										HUMIDITY:     (parseFloat(list[i].RELWET[0].$.max) + parseFloat(list[i].RELWET[0].$.min)) / 2        // берем значение в середине
									};
									break;
								}
                            }
                        } catch(e) {
                        	// Сервер вернул неправильный формат XML файла
                        	// Der Server hat mit falschem XMl Format geantwortet
                        	// Server returns invalid XML formatted answer
                            adapter.warn("cannot parse xml answer");
                        }
                        callback(result);
                    } else {
                    	// Есть ответ от gismeteo, но он с ошибкой (Например: сервис не доступен)
                    	// Es gibt eine Antwort vom Server, aber der hat einen Fehler (e.g. Service ist nicht online)
                    	// There is an answer from server, but it has error, e.g. "service not available"
                        adapter.warn("cannot parse xml answer - " + err);
                    }
                });
            }
        });
    }).on('error', function(e) {
    	// Нет соединения с gismeteo.ru
    	// Keine Verbindung  mit gismeteo.ru
    	// There is no connection with gismeteo.ru
        adapter.warn("Got error by request " + e.message);
    });
}

// опрашивем gismeteo и сохраняем результаты
// Frage gismeteo ein Mal und speichere die Antwort in CCU.IO Datenpunkten
// request data from gismeteo one time and store the responses in CCU.IO data points
function pollGismeteo () {
	getXmlResponse(function (data) {
		if (data) {
			// Передать данные для сейчас
			// Speichere für Kanal - Jetzt
			// Store for channel - now
			adapter.setState(nowChannel_DPs.DATE,         data.now.DATE);
			adapter.setState(nowChannel_DPs.PRESSURE_MIN, data.now.PRESSURE_MIN);
			adapter.setState(nowChannel_DPs.PRESSURE_MAX, data.now.PRESSURE_MAX);
			adapter.setState(nowChannel_DPs.TEMPERATURE,  data.now.TEMPERATURE);
			adapter.setState(nowChannel_DPs.HUMIDITY,     data.now.HUMIDITY);
			
			// Передать данные для завтра
			// Speichere für Kanal - Next
			// Store values for channel - next
			adapter.setState(nextChannel_DPs.DATE,         data.next.DATE);
			adapter.setState(nextChannel_DPs.PRESSURE_MIN, data.next.PRESSURE_MIN);
			adapter.setState(nextChannel_DPs.PRESSURE_MAX, data.next.PRESSURE_MAX);
			adapter.setState(nextChannel_DPs.TEMPERATURE,  data.next.TEMPERATURE);
			adapter.setState(nextChannel_DPs.HUMIDITY,     data.next.HUMIDITY);		
		}
	});
}

// Инициализируем драйвер
// Initialisiere Adapter
// Initiate adapter
initGismeteo ();
