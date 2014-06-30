# Что такое CCU.IO?

CCU.IO это программа, написанная на Node.js и служащая для автоматизации различного домашнего (и не очень) оборудования.
При помощи встроенного веб-сервера CCU.IO выступает платформой для визуализации и позволяет отображать события с использованием Socket.IO библиотеки. 
Нет постоянных запросов к серверу (no-polling), а сервер сам говорит, когда нужно обновить графический элемент. 
Ресурсоёмкий процесс постоянных запросов отпадает и таким образом уменьшается время реакции на события.
Дополнительно CCU.IO выступает, как прокси между визуализацией и приборами. Не важно, сколько запущено копий визуализации, нагрузка на приборы всегда низкая.

Можно подключать новое оборудование через, так называемые, драйверы. На данный момент существуют драйвера для Philips Hue, Sonos, IRTrans, подключение к базе данных MySQL, а также различных веб-сервисов (Погода, валюта, почта, pushover). Некоторые новые драйвера находятся в разработке или запланированы на ближайшее будущее.

Интегрированный в CCU.IO механизм скриптов позволяет автоматизировать системы при помощи языка JavaScript. Все возможности среды Node.JS можно использовать и в скриптах (например доступ к дисковой системе, сетевые функции и т.д.) Также можно использовать огромное количество готовых библиотек через npm.

CCU.IO это открытое программное обеспечение.

# Инсталляция.
Требования: для платформы нужен работающий бинарный файл Node.js с версией больше 0.10. Скачать можно либо с официального сайта http://nodejs.org/download/ или здесьhttp://ccu.io/download.html.

##Инсталляция под Windows:
- Скачать http://dashui.ccu.io/download/ccu.ioIns ... 1.0.39.exe и запустить (Node.js дополнительно не нужен)

##Инсталляция Debian-пакета (RaspberyPI):
Войти в консоль raspberry под именем "pi" и для инсталляции Node.js и CCU.IO выполнить:

wget http://ccu.io.mainskater.de/nodejs_0.10.22-1_armhf.deb
wget http://ccu.io.mainskater.de/ccu.io_1.0.29.deb
sudo dpkg -i nodejs_0.10.22-1_armhf.deb
sudo dpkg -i ccu.io_1.0.29.deb

- вызвать веб интерфейс для настроек: http://hostname:8080/ccu.io
- настроить язык (русский в основном присутствует), настроить адаптеры и перезапустить ccu.io в CCU.IO -> Контроль -> Перезапуск CCU.IO

##Инсталляция в ручном режиме:
- скачать и распаковать файл с CCU.IO https://github.com/hobbyquaker/ccu.io/a ... master.zip 
- перейти в распакованную папку
- запустить CCU.IO сервер: node ccu.io-server.js start или под windows: node.exe ccu.io-server.js start
- вызвать веб интерфейс для настроек: http://hostname:8080/ccu.io
- настроить язык (русский в основном присутствует), настроить адаптеры и перезапустить ccu.io в CCU.IO -> Контроль -> Перезапуск CCU.IO
saved_resource(4).png
Остается необходимость автоматического запуска сервера при старте компьютера/системы, но это решаемо.

##Протестированные платформы:
- Raspbian (RaspberryPi)
- Cubian (Cubieboard/Cubietruck)
- RCU (CCU2 Firmware auf RaspberryPi)
- Homematic CCU2
- Mac OS X
- Windows
- x86 und amd64 Linux
- QNAP TS-469 Pro (vermutlich auch auf allen anderen x86-basierten QNAP NAS)
- QNAP TS-419II (vermutlich auch auf anderen ARM-basierten QNAP NAS)
- Synology DS212, DS214play, DS412+, DS413j (vermutlich auf den meisten ARM- und Atom-basierten Synolgy)
- Western Digital My Cloud
- Odroid with Debian.
- BananaPi with Raspbian 

Из конфигурационной страницы CCU.IO можно установить и обновить все другие дополнения:
saved_resource(5).png

Не советуется начинать новичкам с установки на редкие системы (как QNAP, Synology или My Cloud). Потренируйтесь сначала под Windows или RaspberryPi, а потом можно систему перенести на другую платформу.


# Настройка

Настройка CCU.IO происходит через веб-интерфейс по адресу http://ip_address:8080/ccu.io/ или http://localhost:8080/ccu.io/ , если CCU.IO установлена на локальной системе.
На закладке "CCU.IO -> Настройки" можно настроить базовые параметры системы. На закладке "Драйвера" можно настроить каждый драйвер в отдельности.
После изменения настроек (как CCU.IO, так и драйверов) необходимо перезапустить систему.

## Базовые настройки системы
CCU.IO IP адрес (не путать с просто адресом CCU)
Адрес хоста на котором запущена сама CCU.IO (не путать с просто адресом CCU)
Для некоторых драйверов необходимо знать собственный IP адрес.

## Статистика
Если активировано, то каждые пол-часа в логах будет появляться статистическая информация о пакетах и сообщениях

## Протокол 
Если эта опция активирована, то все события и изменения переменных будут записываться в протокол и их впоследствии можно просмотреть с EventList или построить графики с Highcharts.
Интервал говорит о том, как часто протокол из оперативной памяти будет сбрасываться на диск.

## Script-Engine
Активирует механизм пользовательских скриптов. Все скрипты в папке ccu.io/scripts будут выполняться при старте системы.

## Широта и долгота
Используются для вычисления восхода и захода солнца для скриптов.


## Web Сервер

Здесь можно настроить параметры для веб-сервера. Включить или выключить веб сервер по защищенному протоколу, установить пароли или порт. Не советуется отключать оба сервера, т.к. потом нет возможности активировать их через веб интерфейс.

HomeMatic RPC и HomeMatic ReGaHSS
используются для настройки HomeMatic - система автоматизации дома. Необходимо соответствующее оборудование.

# Обновления
Перед каждым обновлением рекомендуется сделать резервную копию системы, хотя все настройки и папки log, scripts, www останутся неизменными. 

CCU.IO можно обновить с главной страницы настроек. Просто нажать кнопку проверить и если есть новая версия программы, повторно нажать 
кнопку. Эта процедура может занять на слабом оборудовании или медленном интернет соединении длительное время. 

Changelog можно посмотреть на Github. https://github.com/hobbyquaker/ccu.io

# Резервная копия.

# SimpleAPI
Дополнительно к Socket.IO интерфейсу существует возможность использовать основанный на HTTP-GET-Requests интерфейс. Данные возвращаются в виде текста или в виде JSON объекта.
Можно использовать следующие команды:

#### get
Опросить состояние объекта. Возвращает данные в JSON формате.
Пример
Опросить объект по ID
http://ccu-io-host:ccu.io-port/api/get/950
Опросить объект по имени
http://ccu-io-host:ccu.io-port/api/get/ЕстьКтоДома
Опросить объект по имени канала и атрибуту
http://ccu-io-host:ccu.io-port/api/get/Свет-Кухня/LEVEL
Опросить объект по адресу
http://ccu-io-host:ccu.io-port/api/get/FEQ1234567:1/LEVEL
Опросить объект по адресу
http://ccu-io-host:ccu.io-port/api/get/BidCos-RF.FEQ1234567:1.LEVEL
getPlainValue

Опросить состояние объекта. Возвращает данные как обычный текст.
Можно использовать виды опроса, как с get методом. Эту функцию можно применять только к данным и переменным. Опросить все атрибуты канала с этой функцией не получиться:
http://ccu-io-host:ccu.io-port/api/getPlainValue/950

set
Установить значение данных или переменной. Можно использовать все возможности адресации, как get, но можно применять только к данным и переменным.
http://ccu-io-host:ccu.io-port/api/set/BidCos-RF.FEQ1234567:1.LEVEL/?value=0.7
http://ccu-io-host:ccu.io-port/api/set/Свет-Кухня/LEVEL/?value=0.7
http://ccu-io-host:ccu.io-port/api/set/ЕстьКтоДома/?value=0
http://ccu-io-host:ccu.io-port/api/set/950/?value=1

setBulk
Установить значения сразу нескольких переменных или данных.
Можно использовать POST запросы. В зависимости от Content-Type Header данные будут интепретированы, как JSON или как просто текст.

http://ccu-io-host:ccu.io-port/api/setBulk/?BidCos-RF.FEQ1234567:1.LEVEL=0.7&Свет-Кухня
/LEVEL=0.7&ЕстьКтоДома=0&950=1

getObjects
Возвращает, как JSON все объекты из CCU.IO
http://ccu-io-host:ccu.io-port/api/getObjects

getIndex
http://ccu-io-host:ccu.io-port/api/getIndex

getDatapoints
Возвращает, как JSON все значения объектов из CCU.IO
http://ccu-io-host:ccu.io-port/api/getDatapoints


ScriptEngine
Собственные скрипты можно просто разместить в папке scripts и они автоматически запустятся при старте Script-Engine. При добавлении новых скриптов или при изменении старых необходимо перезапустить CCU.IO или Script-Engine.
Это можно сделать через Web Интерфейс CCU.IO -> Контроль

Следующие модули Node.js уже загружены в Script-Engine и их не нужно дополнительно подгружать:
- fs - доступ к файловой системе
- request - HTTP запросы - https://github.com/mikeal/request
- wol - WakeOnLan - https://github.com/agnat/node_wake_on_lan

Функции
Следующие функции можно использовать в собственных скриптах:

log(msg)
Записать что-нибудь в ccu.io/log/ccu.io.log

getState(id [,dpType])
Возвращает значение переменной или данных.
var val = getState(950);
var val = getState("ЕстьКтоДома");
var val = getState("Свет-Кухня", "LEVEL")
var val = getState("BidCos-RF.FEQ12345678.LEVEL");
setState(id, val)
Устанавливает значение переменной или данных устройства. Можно использовать ID, имя или адрес.

setObject(id, object)
Создать переменную в CCU.IO
setObject(100015, {
    Name: "ЕстьКтоДома",
    TypeName: "VARDP"
}, function () {
    setState(100015, 0); // Установить значение, после создания переменной
});

wol.wake(mac)
Послать WakeOnLan пакет к устройству с заданным MAC адресом.

wol.wake("20:DE:20:DE:20:DE");
wol.wake("20-DE-20-DE-20-DE");
wol.wake("20DE20DE20DE");

request(url)
Выполняет HTTP-GET запрос и возвращает содержание ответа.
equest("http://user:pass@webservice.example.com/api/set/1");
var url = "http://user:pass@webservice.example.com/api/get";

request(url, function (error, response, body) {
  log("webservice-запрос " + url + " возвращает: " + body);
});
Основан на пакете request для Node.js. 
https://npmjs.org/package/request
https://github.com/mikeal/request

email(obj)
Отсылает электронное письмо.
email({
    to: "ernie@sesamestreet.com",
    subject: "ccu.io",
    text: "Вода в подвале!!!"
});
Эта функция нуждается в сконфигурированном email драйвере.

pushover(obj)
Отсылает сообщение через pushover сервис.
pushover({
    message:"Окно в ванной надо закрыть."
});
Эта функция нуждается в сконфигурированном pushover драйвере.

subscribe (pattern, callback)
Подписаться на событие.
Объект pattern поддерживает следующее:
logic       string          логические операторы "and" и "or" можно использовать для нескольких правил (default: "and")

    id          integer         ID объекта равно

    name        string          Имя объекта равно
                RegExp          Имя объекта удовлетворяет регулярному выражению

    change      string          "eq", "ne", "gt", "ge", "lt", "le"
            "eq"    Значение объекта не изменилось (val == oldval)
            "ne"    Значение объекта изменилось (val != oldval)
            "gt"    Значение объекта увеличилось (val > oldval)
            "ge"    Значение объекта увеличилось или не изменилось (val >= oldval)
            "lt"    Значение объекта уменьшилось (val < oldval)
            "le"    Значение объекта уменьшилось или не изменилось (val <= oldval)

    val         mixed           Значение объекта равно заданному значению.
    valNe       mixed           Значение объекта не равно заданному значению.
    valGt       mixed           Значение объекта больше заданного значения.
    valGe       mixed           Значение объекта больше или равно заданного значения.
    valLt       mixed           Значение объекта меньше заданного значения.
    valLe       mixed           Значение объекта меньше или равно заданного значения.

    ack         bool            Значение объекта от драйвера, а не от пользователя

    oldVal      mixed           Старое значение объекта равно заданному значению.
    oldValNe    mixed           Старое значение объекта не равно заданному значению.
    oldValGt    mixed           Старое значение объекта больше заданного значения.
    oldValGe    mixed           Старое значение объекта больше или равно заданного значения.
    oldValLt    mixed           Старое значение объекта меньше заданного значения.
    oldValLe    mixed           Старое значение объекта меньше или равно заданного значения.

    oldAck      bool            Старое значение объекта от драйвера, а не от пользователя

    ts          string          Время события равно
    tsGt        string          Время события увеличилось
    tsGe        string          Время события увеличилось или равно
    tsLt        string          Timestamp ist kleiner
    tsLe        string          Timestamp ist kleiner oder gleich

    oldTs       string          vorheriger Timestamp ist gleich
    oldTsGt     string          vorheriger Timestamp ist größer
    oldTsGe     string          vorheriger Timestamp ist größer oder gleich
    oldTsLt     string          vorheriger Timestamp ist kleiner
    oldTsLe     string          vorheriger Timestamp ist kleiner oder gleich

    lc          string          Lastchange ist gleich
    lcGt        string          Lastchange ist größer
    lcGe        string          Lastchange ist größer oder gleich
    lcLt        string          Lastchange ist kleiner
    lcLe        string          Lastchange ist kleiner oder gleich

    oldLc       string          vorheriger Lastchange ist gleich
    oldLcGt     string          vorheriger Lastchange ist größer
    oldLcGe     string          vorheriger Lastchange ist größer oder gleich
    oldLcLt     string          vorheriger Lastchange ist kleiner
    oldLcLe     string          vorheriger Lastchange ist kleiner oder gleich

    room        integer         Raum ID ist gleich
                string          Raum ist gleich
                RegExp          Raum matched Regulären Ausdruck

    func        integer         Gewerk ID ist gleich
                string          Gewerk ist gleich
                RegExp          Gewerk matched Regulären Ausdruck

    channel     integer         Kanal ID ist gleich
                string          Kanal-Name ist gleich
                RegExp          Kanal-Name matched Regulären Ausdruck

    device      integer         Geräte ID ist gleich
                string          Geräte-Name ist gleich
                RegExp          Geräte-Name matched Regulären Ausdruck

    channelType string          Kanal HssType ist gleich
                RegExp          Kanal HssType matched Regulären Ausdruck

    deviceType  string          Geräte HssType ist gleich
                RegExp          Geräte HssType matched Regulären Ausdruck
Callback функция возвращает JavaScript объект со следующим содержанием: 
{
    id,
    name,
    newState: {
        value,
        timestamp,
        ack,
        lastchange
    },
    oldState: {
        value,
        timestamp,
        ack,
        lastchange
    },
    channel: {
        id,
        name,
        type,
        funcIds,
        roomIds,
        funcNames,
        roomNames
    },
    device: {
        id,
        name,
        type
    }
}
funcIds, roomIds, funcNames и roomNames являются массивами Arrays (func = Роли)

Пример: Почтовый ящик
Этот скрипт считает сколько раз бросили почту в почтовый ящик. "id: 11928" и change:"ne" подписываются на изменения значения объекта. Использованный в примере ID 11928 это ID состояния датчика на дверце почтового ящика. При помощи таймера отсеиваются срабатывания чаще, чем 30 секунд. Количество срабатываний записывается в переменную 100015, созданную здесь же при помощи setObject. Сразу после создания переменная будет обнулена. 

var postboxTimer;
subscribe({id:11928, change:"ne"}, function (obj) { // можно использовать короткую форму on(11928, function(obj {...});
    if (!postboxTimer) {

        postboxTimer= true;
        setTimeout(function () {
            postboxTimer = undefined;
        }, 30000);

        setState(100015, 1 + getState(100015));
    }
});

setObject(100015, {
    Name: "Postbox",
    TypeName: "VARDP"
}, function () {
    setState(100015, 0);
});

shedule(pattern, callback)
Временные события с астро-функцией.
Паттерн может быть текстом с Cron-синтаксисом http://ru.wikipedia.org/wiki/Cron
schedule("*/2 * * * *", function () {
    log("Выполняется каждые две минуты!");
});
Паттерн может быть также объектом (можно задавать с секундной точностью)
schedule({second: [20, 25]}, function () {
    log("Исполняется каждые xx:xx:20 и xx:xx:25 !");
});

schedule({hour: 12, minute: 30}, function () {
    log("Выполнено в 12:30!");
});
Паттерн может быть JavaScript-Date объектом. В этом случае вызов будет только один раз.

Астро-функция
С атрибутом astro можно использовать астро-функцию:
schedule({astro:"sunrise"}, function () {
    log("Восход!");
});

schedule({astro:"sunset", shift:10}, function () {
    log("10 минут после заката солнца!");
});
Атрибут shift - это сдвиг в минутах. Может быть так же отрицательным, что бы описать события перед закатом или восходом.

Следующие значения можно использовать для атрибута astro:
sunrise: sunrise (top edge of the sun appears on the horizon)
sunriseEnd: sunrise ends (bottom edge of the sun touches the horizon)
goldenHourEnd: morning golden hour (soft light, best time for photography) ends
solarNoon: solar noon (sun is in the highest position)
goldenHour: evening golden hour starts
sunsetStart: sunset starts (bottom edge of the sun touches the horizon)
sunset: sunset (sun disappears below the horizon, evening civil twilight starts)
dusk: dusk (evening nautical twilight starts)
nauticalDusk: nautical dusk (evening astronomical twilight starts)
night: night starts (dark enough for astronomical observations)
nightEnd: night ends (morning astronomical twilight starts)
nauticalDawn: nautical dawn (morning nautical twilight starts)
dawn: dawn (morning nautical twilight ends, morning civil twilight starts)
nadir: nadir (darkest moment of the night, sun is in the lowest position)



Socket.IO Интерфейс

Socket.IO можно использовать не только для коммуникации через Web- Браузер. Есть библиотеки для многих языков.  https://github.com/learnboost/socket.io/wiki#in-other-languages
Sockrt.IO интерфейс используется драйверами для общения с CCU.IO.

Следующие методы использовать:
CCU.IO => Client
event
При каждом изменении переменной или состояния устройства CCU.IO генерирует событие event. Как параметр передается массив со следующим содержанием: [id, val, timestamp, ack, lastchange]

Client => CCU.IO

getDatapoints(callback)

Взять значение всех объектов и переменных из CCU.IO

getObjects(callback)

Взять описание всех объектов из CCU.IO

getIndex(callback)

Взять взаимосвязи всех объектов из CCU.IO

setState(arr, callback)
Установить значение объекта. Как параметр используется массив со следующим содержанием: [id, value, timestamp, ack, lastchange]. Можно использовать и просто [id, value]

reloadScriptEngine()

Перезапустить Script-Engine. Необходимо для вступления в силу изменений сделанных в пользовательских скриптах.

execCmd(cmd, callback)

Выполнить системную команду. Callback возвращает 3 параметра: error, stdout, stderr

readdir(path, callback)

Вернуть список файлов и папок в конкретной папке. Результат возвращается в виде массива.

writeFile(name, object, callback)

Конвертирует object в json и сохраняет значение в файле, находящимся в папке datastore

readFile(name, callback)

Считывает содержимое файла в папке datastore, конвертирует из JSON в javascript объект и возвращает значение, как параметр в callback функции

readRawFile(name, callback)

Считывает содержимое любого файла (имя файла может содержать путь к файлу) и возвращает как текст в callback функции. Путь можно задавать относительно ccu.io - папки

readJsonFile(name, callback)

Считывает JSON содержимое любого файла (имя файла может содержать путь к файлу) и возвращает как javascript объект в callback функции. Путь можно задавать относительно ccu.io - папки

getUrl(url, callback)
Возвращает ответ на HTTP-GET запрос. В параметре callback функции содержится Body документа. 

getSettings(callback)

Возвращает объект с настройками CCU.IO

setObject(id, obj, callback)

Создаёт объект в CCU.IO
socket.emit("setObject", 100015, {
    Name: "Postbox",
    TypeName: "VARDP"
}, function() {log("Переменная создана");});
 
