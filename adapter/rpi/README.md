Author: Hobbyquaker, Eisbaeeer (PiFace Extension)

Dieser Adapter kann auch "Standalone" - sprich auf einem anderen Raspberry als CCU.IO - genutzt werden.
Dafür muss das gesamte Adapter-Verzeichnis auf den anderen Raspberry kopiert werden, benötigte Node-Module müssen über
"npm install" nachinstalliert werden, die Datei "standalone-settings.js"
muss angepasst werden und der Start erfolgt über "node rpi-standalone.js start"

## Changelog

### 0.5 - 20140513 by Eisbaeeer
* PiFace Input uses now "true" and "false"
* added support of DashUI (ack true)
* deleted the folder node_modules

