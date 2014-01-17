Dreambox adapter
======

* Aktuelle Version: 0.4
* Anzahl verwendeter Variablen in ccu.io: 7
* getestet mit CCU.IO 1.0.12 und Dreambox DM800se 

## Dokumentation

Dieser Adapter ermöglicht die Anbindung einer Dreambox an CCU.IO für das Auslesen aktueller Werte der Dreambox (Stand-By, Lautstärke, Programm) und das Absetzen von ausgewählten Kommandos. Die erste eingerichtete Variable (DREAM.COMMAND) kann zur Bedienung der Dreambox verwendet werden, alle anderen Variablen dienen lediglich der Information bzw. der Verwendung mit Hilfe von weiteren CCU.IO-Mechanismen. Die Konfiguration des Adapters kann durch ein HTML-Formular vorgenommen werden.

### Konfiguration

* **Enabled** - Aktiviert den Adapter 
* **First ID** - Erste ID, die für die Datenvariablen genutzt wird
* **Dreambox (IP)** - IP-Adresse der Dreambox
* **Dreambox (Port)** - Port des Web-Interfaces des Dreambox
* **Polling enabled** - Aktiviert das zyklische Abrufen von Status-Informationen
* **Polling Interval** - Definition des Abruf-Intervalls (in Sekunden)
* **Message Type** - Typ der Nachricht, mit dem Meldungen auf dem Bildschirm der Dreambox ausgegeben werden
* **Message Timeout** - Anzeigedauer einer auszugebenden Nachricht

### Variablen

* **DREAM.COMMAND** - Nimmt Befehle zur Ausführung entgegen (s.u.)
* **DREAM.STANDBY** - Zeigt an, ob sich die Box im Standby befindet (true) oder nicht (false)
* **DREAM.VOLUME** - Zeigt die aktuell eingestellte Lautstärke (0 - 100) an
* **DREAM.MUTED** - Zeigt an, ob die Box lautlos gestellt ist oder nicht (unabhängig von der eingestellten Lautstärke!)
* **DREAM.CHANNEL** - Zeigt den aktuell eingestellten Sender an, sofern sich die Box nicht im Standby befindet
* **DREAM.HDD.CAPACITY** - Zeigt die Kapazität der eingebauten Festplatte an
* **DREAM.HDD.FREE** - Zeigt an, wieviel Platz noch auf der eingebauten Festplatte verfügbar ist

### Kommandos

**Information:** Bei einer erfolgreichen Ausführung wird der Inhalt der Variable DREAM.COMMAND gelöscht.

* **MESSAGE:xyz** - Sendet eine Nachricht xyz an die Box, die für die in der Konfiguration unter messageTimeout angegebene Zeit auf dem Bildschirm angezeigt wird.
* **MUTE | UNMUTE | TOOGLEMUTE** - Stellt die Box auf lautlos oder nicht lautlos bzw. wechselt zwischen beiden Möglichkeiten.
* **VOLUME:xy** - Stellt die Lautstärke auf den Wert xy, wobei es sich hier um einen Wert zwischen 0 und 100 handeln darf.
* **WAKEUP | STANDBY | TOOGLESTANDBY** - Weckt die Box aus dem Standby oder versetzt sie dorthin. Mit TOOGLESTANDBY ist ein entsprechender Wechsel möglich.
* **DEEPSTANDBY** - Setzt die Box in den Deep-Standby. Achtung: da in diesem Modus kein Web-Interface verfügbar ist, muss die Box per Hand wieder reaktiviert werden!
* **REBOOT** - Führt einen Reboot bei der Box durch. Achtung: für die Zeit des Reboots ist die Box nicht durch den Adapter erreichbar!
* **RESTART** - Führt einen Neustart des Enigma-Systems durch. Achtung: für die Zeit des Neustarts ist die Box nicht durch den Adapter erreichbar!

## Todo/Roadmap

* Implementierung weiterer Funktionen

## Changelog

### 0.4
* Fehler beim Speichern von Werten behoben (war object anstatt bool oder string)
* Konfiguration mehrerer Boxen ermöglicht
* Debug-Modus implementiert
* Fix für VU+ und Geräte mit openwebif implementiert (Linefeed bei Bools)

### 0.3
* Umstellung der Konfiguration (JSON -> Formular)
* weitere Konfigurationsmöglichkeiten (Nachrichtentyp, Polling aktivieren/deaktivieren)
* Implementierung weiterer Kommandos (TOOGLESTANDBY, TOOGLEMUTE, etc.)
* Ausbau der Dokumentation

### 0.2
* Neue Variablen DREAM.VOLUME, DREAM.MUTED, DREAM.CHANNEL, DREAM.HDD.CAPACITY und DREAM.HDD.FREE
* Änderung des Requests, der zur Box geschickt wird
* Tausch der Kommando-Variablen (war firstId + 1, nun firstId)

### 0.1
* Erste Version mit Grundfunktionalitäten

## Lizenz

Copyright (c) 2014 BasGo

Lizenz: [CC BY-NC 3.0](http://creativecommons.org/licenses/by-nc/3.0/de/)

Sie dürfen das Werk bzw. den Inhalt vervielfältigen, verbreiten und öffentlich zugänglich machen,
Abwandlungen und Bearbeitungen des Werkes bzw. Inhaltes anfertigen zu den folgenden Bedingungen:

  * **Namensnennung** - Sie müssen den Namen des Autors/Rechteinhabers in der von ihm festgelegten Weise nennen.
  * **Keine kommerzielle Nutzung** - Dieses Werk bzw. dieser Inhalt darf nicht für kommerzielle Zwecke verwendet werden.

###Verzichtserklärung

Jede der vorgenannten Bedingungen kann aufgehoben werden, sofern Sie die ausdrückliche Einwilligung des Rechteinhabers dazu erhalten.

###Gewährleistungsausschluss

Die Veröffentlichung dieser Software erfolgt in der Hoffnung, daß sie Ihnen von Nutzen sein wird, aber **ohne irgendeine implizite oder explizite Garantie** der **Marktreife** oder der **Verwendbarkeit für einen bestimmten Zweck**. Jegliche Nutzung dieser Software erfolgt **auf eigenes Risiko**!
