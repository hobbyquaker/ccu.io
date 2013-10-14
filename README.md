CCU.IO
======

aktuelle Version: 0.9.43

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

## Todo/Roadmap

* Don't Log Flag in regaObjects
* Erkennen ob CCU erreichbar/nicht erreichbar/wieder erreichbar ist und sinnvoll damit umgehen
* Polling-Trigger fertig implementieren
* Adapter (einbinden von nicht-Homematic-Systemen, Webservices etc.)
* Doku für Adapter-Entwickler
* Script-Engine
* Doku für Script-Engine
* BIN-RPC Implementierung vervollständigen
* CCU.IO-Pseudo-Gerät in CCU? Könnte sinnvoll sein z.B: für Polling-Trigger u.v.m. ...
* rega.js weiter ausbauen (... Variablen/Räume/Gewerke anlegen/bearbeiten/löschen/umbenennen, Geräte/Kanäle umbenennen, Favortien anlegen/bearbeiten/löschen/umbenennen, Kanäle/Variablen/Programme zu Favoriten zuordnen, ......? -> wäre notwendig für Portierung von "HQ WebUI" auf CCU.IO
* Raspbian-Paket für einfache Installation (stryke)
* Automatisches Update (stryke)
* CCU2-Paket für einfache Installation
* Web-based Setup (komfortabel CCU IP einstellen, Logging konfigurieren, Updates durchführen etc...)
* Unterstützung für mehrere CCUs?

## Changelog

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
