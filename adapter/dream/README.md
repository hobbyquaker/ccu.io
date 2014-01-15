Dreambox adapter
======

* Aktuelle Version: 0.2
* Anzahl verwendeter Variablen in ccu.io: 7

getestet mit Dreambox DM800se

## Dokumentation

* Dieser Adapter ermöglicht die Anbindung einer Dreambox an ccu.io
* Die erste Variable dient als Kommando-Variable, d.h. hier ist es möglich, Befehle an die Box zu senden. Bei einer erfolgreichen Ausführung wird der Inhalt der Variablen gelöscht.

* Konfiguration über settings.json (in adapter\dream):
  enabled:  true|false
  IP:             xxx.xxx.xxx.xxx  (IP der Dreambox)
  messageTimeout: xxxxx  (Dauer der Anzeige einer Nachricht)
  firstId:        xxxxxx  (Erste ID, standardmäßig 95100) 

### Variablen

* firstId     : DREAM.COMMAND
  Nimmt Befehle zur Ausführung entgegen (s.u.)
  
* firstId + 1 : DREAM.STANDBY
  Zeigt an, ob sich die Box im Standby befindet (true) oder nicht (false)
  
* firstId + 2 : DREAM.VOLUME
  Zeigt die aktuell eingestellte Lautstärke (0 - 100) an
  
* firstId + 3 : DREAM.MUTED
  Zeigt an, ob die Box lautlos gestellt ist oder nicht (unabhängig von der eingestellten Lautstärke!)
  
* firstId + 4 : DREAM.CHANNEL
  Zeigt den aktuell eingestellten Sender an, sofern sich die Box nicht im Standby befindet
  
* firstId + 5 : DREAM.HDD.CAPACITY
  Zeigt die Kapazität der eingebauten Festplatte an
  
* firstId + 6 : DREAM.HDD.FREE
  Zeigt an, wieviel Platz noch auf der eingebauten Festplatte verfügbar ist

### Kommandos

* MESSAGE:xyz
  Sendet eine Nachricht xyz an die Box, die für die in der Konfiguration unter messageTimeout angegebene Zeit auf dem Bildschirm angezeigt wird.
  
* MUTE | UNMUTE | TOOGLEMUTE
  Stellt die Box auf lautlos oder nicht lautlos bzw. wechselt zwischen beiden Möglichkeiten.
  
* VOLUME:xy
  Stelt die Lautstärke auf den Wert xy, wobei es sich hier um einen Wert zwischen 0 und 100 handeln darf.
  
* WAKEUP | STANDBY | TOOGLESTANDBY
  Weckt die Box aus dem Standby oder versetzt sie dorthin. Mit TOOGLESTANDBY ist ein entsprechender Wechsel möglich.
  
* DEEPSTANDBY
  Setzt die Box in den Deep-Standby. Achtung: da in diesem Modus kein Web-Interface verfügbar ist, muss die Box per Hand wieder reaktiviert werden!
  
* REBOOT
  Führt einen Reboot bei der Box durch. Achtung: für die Zeit des Reboots ist die Box nicht durch den Adapter erreichbar!
  
* RESTART
  Führt einen Neustart des Enigma-Systems durch. Achtung: für die Zeit des Neustarts ist die Box nicht durch den Adapter erreichbar!
  
## Todo/Roadmap

* Einstellungen per HTML-Formular editieren
* Implementierung weiterer Funktionen

## Changelog

### 0.2
* Neue Variablen DREAM.VOLUME, DREAM.MUTED, DREAM.CHANNEL, DREAM.HDD.CAPACITY und DREAM.HDD.FREE
* Änderung des Requests, der zur Box geschickt wird
* Tausch der Kommando-Variablen (war firstId + 1, ist nun firstId)

### 0.1
* Erste Version mit Grundfunktionalitäten

## Lizenz

Copyright (c) 2014 BasGo

Lizenz: [CC BY-NC 3.0](http://creativecommons.org/licenses/by-nc/3.0/de/)

Sie dürfen das Werk bzw. den Inhalt vervielfältigen, verbreiten und öffentlich zugänglich machen,
Abwandlungen und Bearbeitungen des Werkes bzw. Inhaltes anfertigen zu den folgenden Bedingungen:

  * **Namensnennung** - Sie müssen den Namen des Autors/Rechteinhabers in der von ihm festgelegten Weise nennen.
  * **Keine kommerzielle Nutzung** - Dieses Werk bzw. dieser Inhalt darf nicht für kommerzielle Zwecke verwendet werden.

Wobei gilt:
Verzichtserklärung - Jede der vorgenannten Bedingungen kann aufgehoben werden, sofern Sie die ausdrückliche Einwilligung des Rechteinhabers dazu erhalten.
Die Veröffentlichung dieser Software erfolgt in der Hoffnung, daß sie Ihnen von Nutzen sein wird, aber OHNE IRGENDEINE GARANTIE, sogar ohne die implizite Garantie der MARKTREIFE oder der VERWENDBARKEIT FÜR EINEN BESTIMMTEN ZWECK. Die Nutzung dieser Software erfolgt auf eigenes Risiko!
=====