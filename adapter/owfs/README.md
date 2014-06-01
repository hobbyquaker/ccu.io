DRAFT VERSION - still not formated

###
Prerequisites:

sudo apt-get install owfs
npm install owfs
npm install colors
npm install express

OWFS Client for CCU.IO
======

* Aktuelle Version: 0.2.1

## Changelog

### 0.2.1
* Changing "name" and "channel" description in datapoints - fix

### 0.2
* First launch with basic temp functions

## Dokumentation

Der Adapter erlaubt die Kommunikation mit einem OWFS Server. Dieser dient als
Schnittstelle zu 1wire Geraeten.
  
### Konfiguration
* Derzeit noch über settings.json  

### Funktionen
* Derzeit kann 1 OWFS Server angegeben werden
* Derzeit ist die Abfrage von 12 1wire Sensoren an einem Server moeglich
                                               
## Todo/Roadmap
* html config for settings.json
* discovery for 1wire devices
* more than one OWFS Server
* more 1wire devices
* more ...

## Lizenz

Copyright (c) 2014 Ralf Muenck [muenk@getcom.de] & Eisbaeeer Eisbaeeer@gmail.com getcom IT Services http://www.getcom.de & http://www.weimars.net

Lizenz: [CC BY-NC 3.0](http://creativecommons.org/licenses/by-nc/3.0/de/)

Sie dürfen das Werk bzw. den Inhalt vervielfältigen, verbreiten und öffentlich zugänglich machen,
Abwandlungen und Bearbeitungen des Werkes bzw. Inhaltes anfertigen zu den folgenden Bedingungen:

  * **Namensnennung** - Sie müssen den Namen des Autors/Rechteinhabers in der von ihm festgelegten Weise nennen.
  * **Keine kommerzielle Nutzung** - Dieses Werk bzw. dieser Inhalt darf nicht für kommerzielle Zwecke verwendet werden.

Wobei gilt:
Verzichtserklärung - Jede der vorgenannten Bedingungen kann aufgehoben werden, sofern Sie die ausdrückliche Einwilligung des Rechteinhabers dazu erhalten. Die Veröffentlichung dieser Software erfolgt in der Hoffnung, daß sie Ihnen von Nutzen sein wird, aber OHNE IRGENDEINE GARANTIE, sogar ohne die implizite Garantie der MARKTREIFE oder der VERWENDBARKEIT FÜR EINEN BESTIMMTEN ZWECK. Die Nutzung dieser Software erfolgt auf eigenes Risiko!
=====
This project needs ccu.io
This project allow connection to Onkyo network enabled receiver with ISCP protocol
