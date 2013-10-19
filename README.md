CCU.IO
======

aktuelle Version: 0.9.52

CCU.IO ist eine Node.js Applikation die einen Web-Server für HomeMatic Web-Oberflächen bereitstellt und via BIN-RPC mit
rfd, hs485d und CUxD kommuniziert. CCU.IO kann - aber muss nicht - auf der CCU2 installiert werden. Über eine Websocket-
Verbindung kann CCU.IO den Web-Browser über Events nach dem Push-Prinzip informieren. CCU.IO bringt ausserdem im Verzeichnis
/www/lib gängige Bibliotheken für die Entwicklung von Web-Oberflächen mit.

Die enthaltene BIN RPC Bibliothek binrpc.js und die ReGa-Schnittstelle rega.js kann auch losgelöst von CCU.IO in anderen
Node basierten Projekten als Schnittstelle zur CCU eingesetzt werden.

CCU.IO bildet die Schnittstelle zur CCU für folgende Projekte:

* [yahui](https://github.com/hobbyquaker/yahui)
* [DashUI](https://github.com/hobbyquaker/DashUI)
* [CCU.IO-Highcharts](https://github.com/hobbyquaker/CCU-IO-Highcharts)
* [CCU.IO-Eventlist](https://github.com/GermanBluefox/CCU-IO.Eventlist)

## Voraussetzungen

CCU.IO benötigt Node.js (Version >= 0.8) das für viele Plattformen inklusive der CCU2 zur Verfügung steht:
* Binärfile für die CCU2 hab ich gebaut und hier veröffentlicht: https://github.com/hobbyquaker/node-ccu2
* Binärpakete für den Raspberry Pi gibt es hier: https://gist.github.com/adammw/3245130
* In den Repositories vieler Linux und BSD Distributionen vorhanden.
* Binaries und Sourcen für Linux, OSX, Solaris und Windows gibt es hier: http://nodejs.org/download/

## Installation

### Für eine komfortable Installation auf RaspberryPi (Raspbian) steht Strykes Install-Script zur Verfügung. Siehe http://homematic-forum.de/forum/viewtopic.php?f=48&t=14556

* Die Datei settings.js.dist in settings.js umbennen
* in settings.js müssen die IP des Hosts auf dem Node.js läuft sowie die IP der CCU angepasst werden. (Läuft CCU.IO auf
der CCU2 selbst kann hier an beiden stellen 127.0.0.1 eingetragen werden.)
* Falls auch Wired-Geräte oder der CUxD vorhanden sind müssen in der settings.js die entsprechenden Kommentar-Zeichen entfernt werden.
* Den Server starten:

    node ccu.io-server.js start

* http://hostname:8080/ccu.io/index.html aufrufen. Auf dieser Seite können die 3 CCU.IO Objekte sowie die Events
eingesehen werden. Hilfreich beim Entwickeln von CCU.IO basierten Anwendungen.

* Den Server stoppen:

    node ccu.io-server.js stop

* CCU.IO schreibt ein Logfile in ccu.io/log/ccu.io.log

## Script-Engine

Eigene Scripte können einfach im Verzeichnis scripts abgelegt werden. Bitte beachten - wenn Änderungen an den Scripten
erfolgen muss die Script-Engine neu gestartet werden (über Button in CCU.IO Oberfläche unter CCU.IO->Control machbar)

Innerhalb der Scripte stehen folgende Funktionen zur Verfügung:


### log(msg)

Etwas in ccu.io/log/ccu.io.log schreiben

### setState(id, val)

Den Wert eines Datenpunktes ändern

### executeProgram(id)

Ein Homematic Programm ausführen

### setObject(id, object)

Ein Objekt in die regaObjects einfügen

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
    valGt       mixed           Wert ist größer
    valGe       mixed           Wert ist größer oder gleich
    valLt       mixed           Wert ist kleiner
    valLe       mixed           Wert ist kleiner oder gleich

    ack         bool            Wert ist bestätigt

    oldVal      mixed           vorheriger Wert ist gleich
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

### Adapter

## Todo/Roadmap

* Erkennen ob CCU erreichbar/nicht erreichbar/wieder erreichbar ist und sinnvoll damit umgehen
* Hue Adapter
* Plugwise Adapter
* LIRC Adapter
* ArtNet (DMX) Adapter
* Email Adapter
* Growl/Prowl Adapter
* iCal Adapter
* Oberfläche vervollständigen
* Doku für Adapter-Entwickler
* BIN-RPC Implementierung vervollständigen
* CCU.IO-Pseudo-Gerät in CCU? Könnte sinnvoll sein z.B: für Polling-Trigger u.v.m. ...
* rega.js weiter ausbauen (... Variablen/Räume/Gewerke anlegen/bearbeiten/löschen/umbenennen, Geräte/Kanäle umbenennen, Favortien anlegen/bearbeiten/löschen/umbenennen, Kanäle/Variablen/Programme zu Favoriten zuordnen, ......? -> wäre notwendig für Portierung von "HQ WebUI" auf CCU.IO
* CCU2-Paket für einfache Installation
* Unterstützung für mehrere CCUs?

## Changelog

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

Copyright (c) 2013 hobbyquaker http://hobbyquaker.github.io

Lizenz: [CC BY-NC 3.0](http://creativecommons.org/licenses/by-nc/3.0/de/)

Sie dürfen das Werk bzw. den Inhalt vervielfältigen, verbreiten und öffentlich zugänglich machen,
Abwandlungen und Bearbeitungen des Werkes bzw. Inhaltes anfertigen zu den folgenden Bedingungen:
  * **Namensnennung** - Sie müssen den Namen des Autors/Rechteinhabers in der von ihm festgelegten Weise nennen.
  * **Keine kommerzielle Nutzung** - Dieses Werk bzw. dieser Inhalt darf nicht für kommerzielle Zwecke verwendet werden.

Wobei gilt:
Verzichtserklärung - Jede der vorgenannten Bedingungen kann aufgehoben werden, sofern Sie die ausdrückliche Einwilligung des Rechteinhabers dazu erhalten.

Die Veröffentlichung dieser Software erfolgt in der Hoffnung, daß sie Ihnen von Nutzen sein wird, aber OHNE IRGENDEINE GARANTIE, sogar ohne die implizite Garantie der MARKTREIFE oder der VERWENDBARKEIT FÜR EINEN BESTIMMTEN ZWECK. Die Nutzung dieser Software erfolgt auf eigenes Risiko!
