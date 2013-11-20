CCU.IO
======

*aktuelle Version: 0.9.82*

CCU.IO ist eine Node.js Applikation die eine Script-Engine, verschiedene Adapter zum Einbinden von Fremdsystemen und einen Web-Server bereitstellt und via BIN-RPC mit rfd, hs485d und CUxD kommuniziert. Über eine Websocket-Verbindung kann CCU.IO Web-Browser über Events nach dem Push-Prinzip informieren. CCU.IO bringt ausserdem im Verzeichnis /www/lib gängige Bibliotheken für die Entwicklung von Web-Oberflächen mit.

Die enthaltene BIN RPC Bibliothek binrpc.js und die ReGa-Schnittstelle rega.js kann auch losgelöst von CCU.IO in anderen Node basierten Projekten als Schnittstelle zur CCU eingesetzt werden.

CCU.IO bildet die Schnittstelle zur CCU für folgende Projekte:

* [yahui](https://github.com/hobbyquaker/yahui)
* [DashUI](https://github.com/hobbyquaker/DashUI)
* [CCU.IO-Highcharts](https://github.com/hobbyquaker/CCU-IO-Highcharts)
* [CCU.IO-Eventlist](https://github.com/GermanBluefox/CCU-IO.Eventlist)

## Voraussetzungen

CCU.IO benötigt Node.js (Version >= 0.8) das für viele Plattformen inklusive der CCU2 zur Verfügung steht:

* Binärfile für die CCU2 hab ich gebaut und hier veröffentlicht: [https://github.com/hobbyquaker/node-ccu2](https://github.com/hobbyquaker/node-ccu2)
* Binärpakete für den Raspberry Pi gibt es hier: [https://gist.github.com/adammw/3245130](https://gist.github.com/adammw/3245130)
* In den Repositories der meisten Linux Distributionen vorhanden.
* Sourcen sowie Binaries für Linux, OSX, Windows und diverse andere Systeme gibt es hier: [http://nodejs.org/download/](http://nodejs.org/download/)

## Installation

### Manuelle Installation

* [Dieses Zip-File](https://github.com/hobbyquaker/ccu.io/archive/master.zip) herunterladen und entpacken
* Die Datei settings.js.dist in settings.js umbennen
* in settings.js müssen die IP des Hosts auf dem Node.js läuft sowie die IP der CCU angepasst werden. (Läuft CCU.IO auf
der CCU2 selbst kann hier an beiden stellen 127.0.0.1 eingetragen werden.)
* Falls auch Wired-Geräte oder der CUxD vorhanden sind müssen in der settings.js die entsprechenden Kommentar-Zeichen entfernt werden.
* Den Server starten:
    `node ccu.io-server.js start`


### Script-gesteuerte Installation auf RaspberryPi (Rapsbian)

Über das Installer Script von Stryke werden auch die Addons (yahui, dashui, …) mit installiert werden.


    wget https://github.com/hobbyquaker/ccu.io/archive/master.zip
    unzip master.zip
    cd ccu.io-master/ccu.io/install/
    chmod 755 ccu.io.install.sh
    sudo ./ccu.io.install.sh
    
In der Datei install/settings kann konfiguriert werden welche Addons installiert werden sollen, unter welchem User CCU.IO laufen soll und in welchem Pfad es installiert werden soll.

Siehe auch [http://homematic-forum.de/forum/viewtopic.php?f=48&t=14556](http://homematic-forum.de/forum/viewtopic.php?f=48&t=14556)


### getestete Plattformen

CCU.IO wurde bisher erfolgreich auf folgenden Plattformen installiert:

* Raspbian (RaspberryPi)
* RCU (CCU2 Firmware auf RaspberryPi)
* Homematic CCU2
* Mac OS X
* Windows
* x86 und amd64 Linux 
* QNAP TS-469 Pro (vermutlich auch auf allen anderen x86-basierten QNAP NAS)
* Synology DS212


## Support

Bei Problemen bitte sicherstellen dass die neueste Version installiert ist und das Logfile log/ccu.io.log bereithalten. Im [Homematic-Forum](http://homematic-forum.de/forum/viewforum.php?f=48) und im [Chat](http://webchat.quakenet.org/?channels=homematic&uio=d4) wird gerne geholfen.


## Dokumentation

Die CCU.IO Oberfläche ist unter http://ccu-io-host:ccu-io-port/ccu.io/ erreichbar.

CCU.IO schreibt ein Logfile in ccu.io/log/ccu.io.log

## Simple API

CCU.IO bietet neben der Möglichkeit via Socket.IO zu kommunizieren auch die "Simple API", eine auf HTTP-GET-Requests
basierende Schnittstelle die Daten im JSON- oder Plain-Text-Format zurückliefert. Folgende Kommandos stehen zur Verfügung:

### get

#### Beispiele

Ein Objekt über die ID abfragen. Liefert Daten im JSON-Format. Lässt sich auf alle Objekte im CCU.IO-regaObjects-Objekt anwenden.

    http://ccu-io-host:ccu.io-port/api/get/950

Ein Objekt über den Namen abfragen

    http://ccu-io-host:ccu.io-port/api/get/Anwesenheit

Ein Datenpunkt über den Kanal-Namen und den Datenpunktbezeichner abfragen

    http://ccu-io-host:ccu.io-port/api/get/Licht-Küche/LEVEL

Ein Datenpunkt über die Kanal-Adresse und den Datenpunktbezeichner abfragen

    http://ccu-io-host:ccu.io-port/api/get/FEQ1234567:1/LEVEL


Ein Datenpunkt über die BidCos-Adresse abfragen

    http://ccu-io-host:ccu.io-port/api/get/BidCos-RF.FEQ1234567:1.LEVEL


### getPlainValue

Diese Methode liefert direkt den Wert eines Datenpunkts mit Content-Type text/plain. Bietet die gleichen Möglichkeiten einen Datenpunkt zu adressieren wie die Methode `get`. Diese Methode lässt sich im Gegensatz zur Methode `get` nur auf Variablen und Datenpunkte anwenden.

    http://ccu-io-host:ccu.io-port/api/getPlainValue/950

### set

Eine Variable oder einen Datenpunkt setzen. Bietet die gleichen Möglichkeiten einen Datenpunkt zu adressieren wie die Methode `get`, lässt sich aber nur auf Datenpunkte und Variablen anwenden.

#### Beispiele

    http://ccu-io-host:ccu.io-port/api/set/BidCos-RF.FEQ1234567:1.LEVEL/?value=0.7
    http://ccu-io-host:ccu.io-port/api/set/Licht-Küche/LEVEL/?value=0.7
    http://ccu-io-host:ccu.io-port/api/set/Anwesenheit/?value=0
    http://ccu-io-host:ccu.io-port/api/set/950/?value=1


### setBulk

Mehrere Datenpunkte auf einmal setzen

Diese Methode kann auch per POST aufgerufen werden, je nach Content-Type Header können die Daten als JSON oder form-encoded geliefert werden

#### Beispiele

Dieses Beispiel vereint alle 4 Beispiele aus der Methode `set` in einem Aufruf:

    http://ccu-io-host:ccu.io-port/api/setBulk/?BidCos-RF.FEQ1234567:1.LEVEL=0.7&Licht-Küche/LEVEL=0.7&Anwesenheit=0&950=1


### programExecute

Ein Programm ausführen. Kann über ID oder Name angesprochen werden


#### Beispiele

    http://ccu-io-host:ccu.io-port/api/programExecute/1205
    http://ccu-io-host:ccu.io-port/api/programExecute/Alle-Lichter-an


### getObjects

    http://ccu-io-host:ccu.io-port/api/getObjects


### getIndex

    http://ccu-io-host:ccu.io-port/api/getIndex

### getDatapoints

    http://ccu-io-host:ccu.io-port/api/getDatapoints
    

## Socket.IO Schnittstelle

[Socket.IO](http://socket.io) ist nicht nur für die Kommunikation mit Web-Browsern der beste Weg mit CCU.IO zu kommunizieren. Es gibt Socket.IO Implementierungen für viele Sprachen, siehe [https://github.com/learnboost/socket.io/wiki#in-other-languages](https://github.com/learnboost/socket.io/wiki#in-other-languages)


### Methoden die von CCU.IO auf allen Clients aufgerufen werden

#### event

CCU.IO ruft bei jedem Event (Änderung oder Aktualisierung eines Datenpunkts oder einer Variable) die Methode "event" auf allen verbundenen Clients auf. Als Parameter wird ein Array mit folgender Struktur übergeben `[id, val, timestamp, ack, lastchange]`

### Methoden die von Clients auf CCU.IO werden können

#### getDatapoints(callback)

Das Datenpunkt-Objekt von CCU.IO abfragen

#### getObjects(callback)

Die Meta-Daten (regaObjects) von CCU.IO abfragen

### getIndex(callback)

Den Objekt-Index von CCU.IO abfragen

#### setState(arr, callback)

Einen Datenpunkt setzen.
Als Parameter wird ein Array mit folgender Struktur erwartet `[id, val, timestamp, ack, lastchange]`

#### programExecute(id, callback)

Ein Homematic-Programm ausführen

#### runScript(script, callback)

Ein Homematic-Script ausführen

#### reloadScriptEngine()

Lädt die Script-Engine neu. Notwendig wenn Änderungen an einem Script vorgenommen wurden.

### execCmd(cmd, callback)

Führt ein Shell-Commando aus. Callback wird mit 3 Parametern aufgerufen: error, stdout, stderr

#### readdir(path, callback)

Gibt den Inhalt eines bestimmten Verzeichnisses zurück.
Die Methode callback wird mit einem Array des Verzeichnisinhalts zurückgerufen

#### writeFile(name, object, callback)

Wandelt object in JSON um und schreibt es in die Datei name im datastore-Verzeichnis

#### readFile(name, callback)

List eine JSON Datei im datastore-Verzeichnis und gibt das geparste Objekt als Parameter an die callback Funktion zurück

#### readRawFile(name, callback)

Liest eine beliebige Datei (name kann auch einen Pfad beinhalten) und gibt das Ergebnis als String an die callback Funktion zurück. Der Pfad ist relativ zum ccu.io-Verzeichnis

#### readJsonFile(name, callback)

List eine JSON Datei und gibt das geparste Objekt als Parameter an die callback Funktion zurück. Der Pfad ist relativ zum ccu.io-Verzeichnis

#### getUrl(url, callback)

Eine URL via HTTP-GET aufrufen. Callback erhält den Body den Antwort. Geschickter Weg um die Same-Origin-Policy in Webanwendungen zu umgehen.

#### getSettings(callback)

Liefert das CCU.IO Settings Objekt zurück

#### getStringtable(callback)

Liefert eine Objekt mit dem Inhalt der stringtable_de.txt von der CCU

#### addStringVariable(name, desc, str, callback)

Fügt eine Stringvariable auf der CCU hinzu. Liefert die neue ID an den Callback.

#### setObject(id, obj, callback)

Ein Objekt zu regaObjects und regaIndex hinzufügen

## Script-Engine

Eigene Scripte können einfach im Verzeichnis scripts abgelegt werden. Bitte beachten - wenn Änderungen an den Scripten
erfolgen muss die Script-Engine neu gestartet werden (über Button in CCU.IO Oberfläche unter CCU.IO->Control machbar)

Innerhalb der Scripte stehen folgende Funktionen zur Verfügung:


### log(msg)

Etwas in ccu.io/log/ccu.io.log schreiben

### setState(id, val)

Den Wert eines Datenpunktes ändern. ID kann eine ID, ein Name oder eine Adresse sein.

### executeProgram(id)

Ein Homematic Programm ausführen

### setObject(id, object)

Ein Objekt in die regaObjects einfügen

### wol.wake(mac);

Weckt einen Rechner per Wake on Lan auf

Beispiele:

     wol.wake('20:DE:20:DE:20:DE');
     wol.wake('20-DE-20-DE-20-DE');
     wol.wake('20DE20DE20DE');

### request(url)

Führt einen HTTP GET Request durch.

### email(obj)

Versendet eine Email

Beispiel:

   email({
        to: "ernie@sesamestreet.com",
        subject: "ccu.io",
        text: "alarm!!!"
   });

### pushover(obj)

Versendet eine Pushover Benachrichtigung

Beispiel:

   pushover({
        message:"Das Fenster im Bad sollte geschlossen werden."
   });

### subscribe(pattern, callback)

Einen Event abbonieren. Das pattern-Objekt bietet folgende Attribute:

    logic       string          "and" oder "or" Logik zum Verknüpfen der Bedingungen nutzen (default: "and")

    id          integer         ID ist gleich

    name        string          name ist gleich
                RegExp          name matched Regulären Ausdruck

    change      string          "eq", "ne", "gt", "ge", "lt", "le"
                                    "eq"    Wert muss gleich geblieben sein (val == oldval)
                                    "ne"    Wert muss sich geändert haben (val != oldval)
                                    "gt"    Wert muss großer geworden sein (val > oldval)
                                    "ge"    Wert muss größer geworden oder gleich geblieben sein (val >= oldval)
                                    "lt"    Wert muss kleiner geworden sein (val < oldval)
                                    "le"    Wert muss kleiner geworden oder gleich geblieben sein (val <= oldval)

    val         mixed           Wert ist gleich
    valNe       mixed           Wert ist ungleich
    valGt       mixed           Wert ist größer
    valGe       mixed           Wert ist größer oder gleich
    valLt       mixed           Wert ist kleiner
    valLe       mixed           Wert ist kleiner oder gleich

    ack         bool            Wert ist bestätigt

    oldVal      mixed           vorheriger Wert ist gleich
    oldValNe    mixed           vorheriger Wert ist ungleich
    oldValGt    mixed           vorheriger Wert ist größer
    oldValGe    mixed           vorheriger Wert ist größer oder gleich
    oldValLt    mixed           vorheriger Wert ist kleiner
    oldValLe    mixed           vorheriger Wert ist kleiner oder gleich

    oldAck      bool            vorheriger Wert ist bestätigt

    ts          string          Timestamp ist gleich
    tsGt        string          Timestamp ist größer
    tsGe        string          Timestamp ist größer oder gleich
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


Der Callback-Funktion wird ein Objekt mit folgendem Inhalt als Parameter übergeben:

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

funcIds, roomIds, funcNames und roomNames sind Arrays (func = Gewerke)

### schedule(pattern, callback)

Zeitmodul mit Astrofunktion.

Pattern kann ein String in Cron-Syntax sein, z.B.:

    schedule("*/2 * * * *", function () {
        log("wird alle 2 Minuten ausgeführt!");
    });


Pattern kann aber auch ein Objekt sein, insbesondere dann notwendig wenn man Sekundengenaue Ausführung benötigt:

    schedule({second: [20, 25]}, function () {
        log("Wird um xx:xx:20 und xx:xx:25 ausgeführt!");
    });

    schedule({hour: 12, minute: 30}, function () {
        log("Wird um 12:30Uhr ausgeführt!");
    });


Pattern kann auch ein Javascript-Date-Objekt (also ein bestimmter Zeitpunkt sein) - dann findet nur eine einmalige Ausführung statt.


#### Astrofunktion

Über das Attribut "astro" kann die Astrofunktion genutzt werden:

    schedule({astro:"sunrise"}, function () {
        log("Sonnenaufgang!");
    });

    schedule({astro:"sunset", shift:10}, function () {
        log("10 Minuten nach Sonnenuntergang!");
    });

Das Attribut shift ist eine Verschiebung in Minuten, kann auch negativ sein um die Events vorzuziehen.


Folgende Werte sind für das Attribut astro verwendbar:

* sunrise: sunrise (top edge of the sun appears on the horizon)
* sunriseEnd: sunrise ends (bottom edge of the sun touches the horizon)
* goldenHourEnd: morning golden hour (soft light, best time for photography) ends
* solarNoon: solar noon (sun is in the highest position)
* goldenHour: evening golden hour starts
* sunsetStart: sunset starts (bottom edge of the sun touches the horizon)
* sunset: sunset (sun disappears below the horizon, evening civil twilight starts)
* dusk: dusk (evening nautical twilight starts)
* nauticalDusk: nautical dusk (evening astronomical twilight starts)
* night: night starts (dark enough for astronomical observations)
* nightEnd: night ends (morning astronomical twilight starts)
* nauticalDawn: nautical dawn (morning nautical twilight starts)
* dawn: dawn (morning nautical twilight ends, morning civil twilight starts)
* nadir: nadir (darkest moment of the night, sun is in the lowest position)

### Standardmäßig bereits vorhandene Node-Module

* fs - Das Filesystem Modul "fs"
* request - https://github.com/mikeal/request
* wol - https://github.com/agnat/node_wake_on_lan


## Adapter

Zur Entwicklung von eigenen Adaptern steht ein Grundgerüst bereit (Datei ccu.io/adapter/skeleton.js)

### yr

Fragt Wetterdaten von yr.no ab und schreibt Sie in die Variablen 70000-70006

### hue

Bindet Philips Hue / LivingColors / LivingWhites Lampen ein.
In settings.js muss die IP der Hue Bridge sowie ein Username konfiguriert werden. Zum Anlegen eines Users auf der Bridge siehe:
http://developers.meethue.com/gettingstarted.html


### MySQL

Bindet CCU.IO an eine MySQL Datenbank an. Des notwendige Schema und Beispiel-Queries liegen im Adapter-Verzeichnis bereit


## Todo/Roadmap

* CCU.IO Update in Weboberfläche anstoßen
* LIRC Adapter
* ArtNet (DMX) Adapter
* Email Adapter
* Growl/Prowl Adapter (?)
* Pushover Adapter (?)
* iCal, VCALENDAR, Google Calendar Adapter (?)
* Oberfläche vervollständigen
* Doku für Adapter-Entwickler
* BIN-RPC Implementierung vervollständigen
* rega.js weiter ausbauen (... Variablen/Räume/Gewerke anlegen/bearbeiten/löschen/umbenennen, Geräte/Kanäle umbenennen, Favortien anlegen/bearbeiten/löschen/umbenennen, Kanäle/Variablen/Programme zu Favoriten zuordnen, ......? -> wäre notwendig für Portierung von "HQ WebUI" auf CCU.IO
* CCU2-Paket für einfache Installation
* Unterstützung für mehrere CCUs?

## Changelog

### 0.9.82
* (Hobbyquaker) Simple-API Methode setBulk nun auch via POST nutzbar
* (Hobbyquaker) metaScripts Variable von settings.js nach ccu.io.js verlagert
* (Hobbyquaker) abfangen fehlender Optionen in settings.js

### 0.9.81
* (Hobbyquaker) neue Methode writeRawFile(path, content, callback) - path relativ zum ccu.io Verzeichnis

### 0.9.80
* (Hobbyquaker) Methode setObject legt nicht vorhandene Räume/Gewerke/Favoriten an
* (Hobbyquaker) Neuer Adapter: Pushover (keine Datenpunkte - steht in Script-Engine zur Verfügung)
* (Hobbyquaker) Neuer Adapter: Email (keine Datenpunkte - steht in Script-Engine zur Verfügung)
* (Hobbyquaker) Bugfix in clearRegaData Methode
* (Hobbyquaker) Bugfixes Script-Engine

### 0.9.79
* (Hobbyquaker) Bugfix re-init

### 0.9.78
* (Bluefox) Socket.io Authentication
* (Hobbyquaker) clearRegaData Methode hinzugefügt für reloadRegaData und reconnect
* (Hobbyquaker) Bugfixes

### 0.9.77
* (Hobbyquaker) Default id des rego-Adapter geändert
* (Hobbyquaker) Funktion hinzugefügt die prüft ob noch Events empfangen werden und ggf erneuten RPC Init durchführt
* (Hobbyquaker) diverse Bugfixes
* (Hobbyquaker) Hue Adapter umgebaut, nutzt nun nicht mehr das Modul node-hue-api

### 0.9.76
* (Anli) rego-Adapter added (adapter for ivt rego 600series heating controller)
* (Hobbyquaker) Bugfixes Logging
* (Hobbyquaker) added Logging of virtual Variables
* (Hobbyquaker) Bugfix Hue Adapter

### 0.9.75
* (Hobbyquaker) Ping Adapter: bool statt string als value, Punkte aus IP-Adresse werden in Name/Address Attributen durch Unterstriche ersetzt

### 0.9.74
* (Bluefox) Fix Debug Mode
* (Bluefox) added Ping Adapter

### 0.9.73
* (Hobbyquaker) Bugfix es wurden immer wieder überflüssige Adapter-Prozesse gespawnt

### 0.9.72

* (Hobbyquaker) Bugfix setObject - hat u.U. dazu geführt das Kanäle mehrfach zu den selben Räumen/Gewerken/Favoriten zugeordnet wurden

### 0.9.71

* (Hobbyquaker) Hue Adapter: Bugfix Polling
* (Hobbyquaker) Hue Adapter: Fallunterscheidung "Dimmable Plug-In Unit" (Zwischensteck-Dimmer)

### 0.9.70

* (Hobbyquaker) Bugfix Steuerung HM-CC-TC
* (Hobbyquaker) setState Methode akzeptiert nun auch Namen oder Adressen statt IDs
* (Hobbyquaker) setObject Methode können Räume, Gewerke und Favoriten mitgegeben werden
* (Hobbyquaker) Hue Adapter: Lampen können nun Räumen, Gewerken und Favoriten zugeordnet werden
* (Hobbyquaker) Hue Adapter: Fallunterscheidung "Color Light" (LivingColors) und "Extended Color Light" (Hue) - nur verfügbare Datenpunkte werden angelegt
* (Hobbyquaker) Hue Adapter: Status Polling


### 0.9.69

* (Stryke) Installer: Non root ccu.io update and CCUIO_UPDATE parameter
* (Hobbyquaker) neuer Adapter: Hue
* (Hobbyquaker) Bugfix: Fehler beim Laden der Stringtable (betrifft nur CCU1)

### 0.9.68

* (Hobbyquaker) Übersetzung der stringtable (nur bei CCU2)

### 0.9.67

* (Stryke) Installer: Bugfix für QNAP
* (Hobbyquaker) Simple API: neue Methode setBulk (setzen mehrerer Datenpunkte auf einmal)
* (Hobbyquaker) Script-Engine: neue Datei _global.js für Funktionen die in mehreren Scripts genutzt werden
* (Hobbyquaker) Script-Engine: Beispiel-Scripts hinzugefügt
* (Hobbyquaker) diverse Bibliotheken zu www/lib hinzugefügt

### 0.9.66
* (Hobbyquaker) neue Methode delRawFile
* (Hobbyquaker) www/lib/jquery-1.10.2.min.js ausgetauscht, map File hinzugefügt

### 0.9.65
* (Hobbyquaker) Bugfix datapoints.fn
* (Hobbyquaker) channels.fn STATE Datenpunkt von SMOKE_DETECTOR hinzugefügt

### 0.9.64
* (Hobbyquaker) datapoints.fn STATE Datenpunkt von SMOKE_DETECTOR hinzugefügt

### 0.9.63
* (Hobbyquaker) Alarm-Datenpunkte hinzugefügt


### 0.9.62
* (Hobbyquaker) diverse Dateien zum Verzeichnis /www/lib hinzugefügt
* (Stryke) Bugfixes Installer

### 0.9.61
* (Hobbyquaker) diverse kleine Verbesserungen und Bugfixes
* (Hobbyquaker) Update-Button in der Addon-Tabelle (falls neue Version zur Verfügung steht). Ruft install/ccu.io.install.sh auf
* (Hobbyquaker) neuer Button unter CCU.IO->Control um RPC Inits zu erneuern
* (Hobbyquaker) neue Anzeige unter CCU.IO->Info: Zeit seit letztem Event

### 0.9.60
* (Hobbyquaker) Erkennen ob CCU erreichbar/nicht erreichbar/wieder erreichbar ist

### 0.9.59
* (Hobbyquaker) Bugfixes

### 0.9.58
* (Stryke) Installer: Laufende ccu.io Erkennung endgültig gefixt

### 0.9.57
* (Hobbyquaker) Bugfix: File Upload funktionierte u.U. nicht
* (Hobbyquaker) Bugfix: PRESS_SHORT, PRESS_LONG und PRESS_OPEN funktionierte nicht
* (Stryke) Installer: Laufende ccu.io erkennung verbessert

### 0.9.56
* (Hobbyquaker) Bugfix "Hänger" beim Beenden von CCU.IO
* (Stryke) Installer: Parameter gesteuerter Aufruf und Config Datei


### 0.9.55
* (Hobbyquaker) Neue Methode "getPlainValue" in Simple API
* (Hobbyquaker) Tool hinzugefügt um CUxD Logs ins CCU.IO-Format zu konvertiern

### 0.9.54
* (Hobbyquaker) "Simple API" implementiert, einfaches Abfragen und Setzen von Werten/Objekten via HTTP GET (executeProgram noch nicht implementiert)

### 0.9.53
* (Hobbyquaker) Bugfix Werte an CCU senden (impact z.B. bei RAMP_TIME Datenpunkt)

### 0.9.52
* (Hobbyquaker) Bugfix in setObject Methode
* (Hobbyquaker) Neue Datenpunkte yr-Adapter (rain24h, rain48h, minTemp24h, maxTemp24h, minTemp48h, maxTemp48h)

### 0.9.51

* (Hobbyquaker) Oberfläche weiter ausgebaut
* (Stryke) Bugfix Startscript

### 0.9.50
* (Stryke) Installer v0.3.1

### 0.9.49
* (Hobbyquaker) Der Wert eines Datenpunkts kann nun direkt in der CCU.IO Oberfläche bearbeitet werden
* (Hobbyquaker) Bugfix Button reloadScriptEngine
* (Hobbyquaker) automatisches Anpassen der datapoints und events Ansicht an Browser Breite/Höhe

### 0.9.48

* (Hobbyquaker) Bugfix für Variablen 41 und 40 (Anzahl Alarm- und Servicemeldungen)

### 0.9.47

* (Hobbyquaker) Zeitmodul mit Astro-Funktion für die Script-Engine
* (Hobbyquaker) Neue Optionen longitude und latitude in settings.js (wird für Astrofunktion benötigt)
* (Hobbyquaker) BIN-RPC Bug behoben (hatte kein Impact, hat aber unschöne Log-Meldung generiert)
* (Hobbyquaker) fehlende Dateien in ccu.io/www/lib ergänzt, führte dazu dass die Reiter datapoints und events in der CCU.IO-Oberfläche leer waren

### 0.9.46

* (Hobbyquaker) setValue nun (wenn möglich) via binrpc statt ReGa
* (Hobbyquaker) Neue Methode setObject() in script-engine
* (Hobbyquaker) Polling Trigger implementiert (über virtuelle Taste kann sofortiges Pollen der Variablen angestoßen werden)
* (Hobbyquaker) wenn regaObject[id].dontLog wird kein Logging durchgeführt
* (Hobbyquaker) Neue Option für MySQL-Adapter: nur geänderte Datenpunkte loggen


### 0.9.45

* (Hobbyquaker) Beenden der Kind-Prozesse (Adapter, Script-Engine) beim Beenden von CCU.IO
* (Hobbyquaker) diverse Kleinigkeiten, Bugfixes
* (Hobbyquaker) Variable 40 und 41 (Anzahl Servicemeldungen und Anzahl Alarme) zu variables.fn hinzugefügt
* (Hobbyquaker) Neue Methode setObject
* (Hobbyquaker) MySQL-Adapter: Variablen werden nur bei Änderungen in event-Tabelle geschrieben
* (Hobbyquaker) Bugfix MySQL-Adapater: ValueUnit wurde nicht in Datenbank geschrieben

### 0.9.44
* (Hobbyquaker) MySQL-Adapter ausgearbeitet

### 0.9.43
* (Hobbyquaker) Bei Änderungen an SET_TEMPERATURE und MANU_MODE nächsten temp und mode Event vom Thermostat ignorieren
* (Hobbyquaker) Neuer Adapter für Logging in MySQL Datenbank

### 0.9.42
* (Stryke) Installer/Updater v0.1 integriert

### 0.9.41

* (Hobbyquaker) Script-Engine ausgearbeitet und Dokumenation begonnen (steckt in scripts/example.js)

### 0.9.40

* (Hobbyquaker) Script-Engine implementiert (proof-of-concept, wird sich noch einiges ändern!)

### 0.9.39

* (Hobbyquaker) Adapter implementiert
* (Hobbyquaker) Basic Auth füt http und https getrennt aktivierbar

### 0.9.38

* (Hobbyquaker) Bugfix wenn settings.authentication in settings.js fehlt
* (Hobbyquaker) Bugfixes wenn ioListenPort fehlt (Betrieb nur mit ssl)

### 0.9.37

* (Bluefox) SSL Support
* (Bluefox) Basic Auth

### 0.9.36

* (Hobbyquaker) Bugfix file upload

### 0.9.35

* (Hobbyquaker) Anonymisierungs-Funktion anonymisiert nun auch Adressen
* (Hobbyquaker) fehlende Node-Module hinzugefügt, überflüssige entfernt
* (Hobbyquaker) Speichern von nicht-json-Dateien im Datastore verhindert

### 0.9.34

* (Hobbyquaker) fehlende Dateien ergänzt

### 0.9.33

* (Hobbyquaker) neue CCU.IO Oberfläche
* (Hobbyquaker) Button in CCU.IO Oberfläche um Objekte neu von der CCU zu laden (damit man nicht immer neustarten muss nach Änderungen auf der CCU)
* (Hobbyquaker) Button zum "anonymisieren" von regaObjects und regaIndex (aus-x-en der BidCos-Adressen)


## Lizenz

Copyright (c) 2013 hobbyquaker [http://hobbyquaker.github.io](http://hobbyquaker.github.io)

Lizenz: [CC BY-NC 3.0](http://creativecommons.org/licenses/by-nc/3.0/de/)

Sie dürfen das Werk bzw. den Inhalt vervielfältigen, verbreiten und öffentlich zugänglich machen,
Abwandlungen und Bearbeitungen des Werkes bzw. Inhaltes anfertigen zu den folgenden Bedingungen:

  * **Namensnennung** - Sie müssen den Namen des Autors/Rechteinhabers in der von ihm festgelegten Weise nennen.
  * **Keine kommerzielle Nutzung** - Dieses Werk bzw. dieser Inhalt darf nicht für kommerzielle Zwecke verwendet werden.

Wobei gilt:
Verzichtserklärung - Jede der vorgenannten Bedingungen kann aufgehoben werden, sofern Sie die ausdrückliche Einwilligung des Rechteinhabers dazu erhalten.

Die Veröffentlichung dieser Software erfolgt in der Hoffnung, daß sie Ihnen von Nutzen sein wird, aber OHNE IRGENDEINE GARANTIE, sogar ohne die implizite Garantie der MARKTREIFE oder der VERWENDBARKEIT FÜR EINEN BESTIMMTEN ZWECK. Die Nutzung dieser Software erfolgt auf eigenes Risiko!