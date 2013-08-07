CCU.IO
======

CCU.IO ist eine Node.js Applikation die einen Web-Server für HomeMatic Web-Oberflächen bereitstellt und via BIN-RPC mit
rfd, hs485d und cuxd kommuniziert. CCU.IO kann - aber muss nicht - auf der CCU2 installiert werden. Über eine Websocket-
Verbindung kann CCU.IO den Web-Browser über Events nach dem Push-Prinzip informieren. CCU.IO bringt ausserdem im Verzeichnis
/www/lib gängige Bibliotheken für die Entwicklung von Web-Oberflächen mit.

Die enthaltene BIN RPC Bibliothek binrpc.js und die ReGa-Schnittstelle rega.js kann auch losgelöst von CCU.IO in anderen Node basierten Projekten als Schnittstelle
zur CCU eingesetzt werden.

CCU.IO bildet die Schnittstelle zur CCU für folgende Projekte:

* yahui https://github.com/hobbyquaker/yahui
* DashUI (in 0.8.x noch optional neben jqHomematic/WebAPI, ab 0.9 vollständig CCU.IO) https://github.com/hobbyquaker/DashUI
* HQ WebUI (ab Version 3.0, frühestens Ende 2013) https://github.com/hobbyquaker/hq-webui


## Vorraussetzungen

CCU.IO benötigt Node.js das für viele Plattformen inklusive der CCU2 zur Verfügung steht:
* Binärfile für die CCU2 hab ich gebaut und hier veröffentlicht: https://github.com/hobbyquaker/node-ccu2
* Binärpakete für den Raspberry Pi gibt es hier: https://gist.github.com/adammw/3245130
* In den Repositories vieler Linux und BSD Distributionen vorhanden.
* Binaries und Sourcen für Linux, OSX, Solaris und Windows gibt es hier: http://nodejs.org/download/

## Ausprobieren!

* Die Datei settings.js.dist in settings.js umbennen
* in settings.js müssen die IP des Hosts auf dem Node.js läuft sowie die IP der CCU angepasst werden. (Läuft CCU.IO auf
der CCU2 selbst kann hier an beiden stellen 127.0.0.1 eingetragen werden.)
* Falls auch Wired-Geräte oder der CUxD vorhanden sind müssen in der settings.js die entsprechenden Kommentar-Zeichen entfernt werden.
* Den Server starten:

    node ccu.io.js

* http://hostname:8080/ccu.io/index.html aufrufen. Auf dieser Seite können die 3 CCU.IO Objekte sowie die Events
eingesehen werden. Hilfreich beim Entwickeln von CCU.IO basierten Anwendungen

## Todo/Roadmap

* File-Uploads
* beliebige Objekte speichern und laden
* Eingabefeld+Button für .emit() auf /ccu.io/index.html + Textarea für Rückgabe
* Pseudo-Datenpunkte (nicht auf der CCU vorhanden, nur in CCU.IO)
* Wunderground und yr.no Adapter
* Einbindung von User-Scripten
* binrpc.js vervollständigen

## Changelog

### 0.8

* neue Methode writeFile und readFile - Javascript Objekte speichern und laden (Pfad konfigurierbar in settings.js)
* neue Methode readdir - Gibt den Inhalt eines Verzeichnisses aus (Ohne . und .., Pfad relativ zum ccu.io Wurzelverzeichnis)

### 0.7 - 0.1

* leider nicht wirklich aufgeschrieben und nur schrottige Commit Messages gemacht ;)

## Lizenz

Copyright (c) 2013 hobbyquaker
Lizenz: CC BY-NC 3.0

Sie dürfen:

das Werk bzw. den Inhalt vervielfältigen, verbreiten und öffentlich zugänglich machen
Abwandlungen und Bearbeitungen des Werkes bzw. Inhaltes anfertigen
Zu den folgenden Bedingungen:

Namensnennung - Sie müssen den Namen des Autors/Rechteinhabers in der von ihm festgelegten Weise nennen.
Keine kommerzielle Nutzung — Dieses Werk bzw. dieser Inhalt darf nicht für kommerzielle Zwecke verwendet werden.
Wobei gilt:

Verzichtserklärung - Jede der vorgenannten Bedingungen kann aufgehoben werden, sofern Sie die ausdrückliche Einwilligung des Rechteinhabers dazu erhalten.
Die Veröffentlichung dieser Software erfolgt in der Hoffnung, daß sie Ihnen von Nutzen sein wird, aber OHNE IRGENDEINE GARANTIE, sogar ohne die implizite Garantie der MARKTREIFE oder der VERWENDBARKEIT FÜR EINEN BESTIMMTEN ZWECK.

Die Nutzung dieser Software erfolgt auf eigenes Risiko. Der Author dieser Software kann für eventuell auftretende Folgeschäden nicht haftbar gemacht werden!