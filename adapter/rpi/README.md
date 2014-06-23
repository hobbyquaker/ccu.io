Author: Hobbyquaker, Eisbaeeer

## Beschreibung
Dieser Adapter kann auch "Standalone" - sprich auf einem anderen Raspberry als CCU.IO - genutzt werden.
Dafür muss das gesamte Adapter-Verzeichnis auf den anderen Raspberry kopiert werden, die Datei "standalone-settings.js"
muss angepasst werden und der Start erfolgt über "node rpi-standalone.js start"

Als eine weitere Ein/Ausgabe Karte kann das PiFace verwendet werden. Das PiFace muss in der settings.json aktiviert werden.

## Changelog

### 0.6.1 - 20140622 by Eisbaeeer
* BugFix: PiFace issue - Datapoints not shown in ScriptGUI

### 0.6 - 20140606 by Eisbaeeer
* PiFace issue through init of inputs

### 0.5 - 20140513 by Eisbaeeer
* PiFace Input uses now "true" and "false"
* added support of DashUI (ack true)
* deleted the folder node_modules


