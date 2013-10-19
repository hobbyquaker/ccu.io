#!/bin/sh
#set -x # Debug Modus, zum aktivieren das # am Anfang der Zeile entfernen

########################################################################
#Variablen setzen
########################################################################

Version=0.3.1
SCRIPT_NAME=$( basename $0 )
TS=$( date +%Y%m%d%H%M%S )
TMP=/tmp
#exec 1>${TMP}/${SCRIPT_NAME}.${TS}.debug.txt
#exec 2>&1
exec 2>${TMP}/${SCRIPT_NAME}.${TS}.debug.txt
set -xv
LOG=${TMP}/${SCRIPT_NAME}.${TS}.log.txt
echo "Programmstart ${SCRIPT_NAME} ${TS}" >> ${LOG}

# Ab hier bitte die Variablnen anpassen
CCUIO_PATH="/opt/ccu.io"   # Hier den Pfad angeben in dem sich ccu.io befindet
CCUIO_CMD="/etc/init.d/ccu.io.sh"     # Hier den Aufruf von ccu.io angeben
CCUIO_USER=pi                           # Hier den User angeben unter dem ccu.io laufen soll
CCUIO_UPDATE=false
NODE=false
CCUIO=true     # CCU.IO installieren = 1

# Optionale Addons
DASHUI=true    # DashUI installieren = 1
CHARTS=true    # CCU-IO-Highcharts installieren = 1
YAHUI=true     # yahui installieren = 1
EVENTLIST=true # CCU-IO Eventlist installieren = 1

#if [ ! ${CCUIO_PATH} ]
#then
#	echo "Die Variable CCUIO_PATH wurde nicht gesetzt"
#	echo "es wird der Standard \"/opt/ccu.io\" genutzt"
#	CCUIO_PATH="/opt/ccu.io"
#fi
#if [ ! "${CCUIO_CMD}" ]
#then
#	echo "Es wurde kein ccu.io Kommando angegeben"
#	echo "es wird der Standard \"node ${CCUIO_PATH}/ccu.io-server.js\" genommen"
#	CCUIO_CMD="node ${CCUIO_PATH}/ccu.io-server.js"
#fi
#if [ ! ${CCUIO_USER} ]
#then
#	echo "Es wurde kein ccu.io User angegeben"
#	echo "Es wird der Standarduser \"root\" verwendet"
#	echo "ccu.io sollte nicht unter \"root\" laufen"
#        CCUIO_USER="root"
#fi

########################################################################
# Funktionen
########################################################################
install ()
{
  echo "Laden von ${LINK}" | tee -a ${LOG}
  wget ${LINK}
  if [ ${?} != 0 ]
  then
    echo "Fehler beim Download von ${ADDON}" | tee -a ${LOG}
    echo "Programm beendet sich"
    copy_log_debug
    exit 1
  fi
  mv master.zip ${ADDON}.zip
  unzip ${ADDON}.zip 1>/dev/null
  if [ ${?} != 0 ]
  then
    echo "Fehler beim unzip von ${ADDON}" | tee -a ${LOG}
    echo "Programm beendet sich"
    copy_log_debug
    exit 1
  fi
  if [ ${ADDON} = ccu.io ]
  then
    cp -Ra ${ADDON}-master/${ADDON_PATH}/* ${CCUIO_PATH}
    if [ ${?} != 0 ]
    then
      echo "Fehler beim kopieren von ${ADDON}" | tee -a ${LOG}
      echo "Programm beendet sich"
      copy_log_debug
      exit 1
    fi
    chown -R ${CCUIO_USER} ${CCUIO_PATH}/
  else
    if [ -d ${CCUIO_PATH}/www/${ADDON_PATH} ]
    then
      cp -Ra ${ADDON}-master/${ADDON_PATH}/* ${CCUIO_PATH}/www/${ADDON_PATH}/
      if [ ${?} != 0 ]
      then
        echo "Fehler beim kopieren von ${ADDON}" | tee -a ${LOG}
        echo "Programm beendet sich"
        copy_log_debug
        exit 1
      fi
      chown -R ${CCUIO_USER} ${CCUIO_PATH}/www/${ADDON_PATH}/
    else
      echo "Bisher war ${ADDON} nicht installiert" | tee -a ${LOG}
      echo "${ADDON} wird installiert und ist unter <IP>:8080/${ADDON_PATH} erreichbar"
      mkdir ${CCUIO_PATH}/www/${ADDON_PATH}
      if [ ${?} != 0 ]
      then
        echo "Fehler beim erstellen des Verzeichnisses ${CCUIO_PATH}/www/${ADDON_PATH}" | tee -a ${LOG}
        echo "Programm beendet sich"
        copy_log_debug
        exit 1
      fi
      cp -Ra ${ADDON}-master/${ADDON_PATH}/* ${CCUIO_PATH}/www/${ADDON_PATH}/
      if [ ${?} != 0 ]
      then
        echo "Fehler beim kopieren von ${ADDON}" | tee -a ${LOG}
        echo "Programm beendet sich"
        copy_log_debug
        exit 1
      fi
      chown -R ${CCUIO_USER} ${CCUIO_PATH}/www/${ADDON_PATH}/
    fi
  fi
  rm -R ${ADDON}-master ${ADDON}.zip # Loeschen der Temorären Dateien und Verzeichnisse ${ADDON}-master ${ADDON}.zip
}

copy_log_debug ()
{
  # Kopieren der Log und Debugdateien in das LOG Verzeichnis von ccu.io"
  cp ${LOG} ${TMP}/${SCRIPT_NAME}.${TS}.debug.txt ${CCUIO_PATH}/log
  set +xv
  rm ${LOG} ${TMP}/${SCRIPT_NAME}.${TS}.debug.txt
}

ja_nein_abfrage ()
{
  while [ ${GUELTIG} != 1 ]
  do
    read ANTWORT
    case "${ANTWORT}" in
      [JjYy])    ERGEBNIS=1; GUELTIG=1 ;;
      [Nn])      ERGEBNIS=0; GUELTIG=1 ;;
      *)         GUELTIG=0 ;;
    esac
  done
}
########################################################################
# Vorbedingungen pruefen
########################################################################

# Abfrage ob das Script von root aufgerufen wird
if [ $( whoami ) != root ]
then
	echo "Das Programm muss als root laufen da es Verzeichnisse anlegt und Rechte anpasst"
	echo "bitte das Script mit \"sudo ${SCRIPT_NAME}\" aufrufen"
	echo "Das Programm wurde nicht als root gestartet" >> ${LOG}
	copy_log_debug
  exit 1
fi

# Pruefen ob es noch ein altes master.zip gibt und dieses gegebenenfalls sichern
if [ -f ${TMP}/master.zip ]
then
  echo "Altes master.zip gefunden" | tee -a ${LOG}
  echo "sichere altes master.zip als master.zip.${TS}"
  mv ${TMP}/master.zip ${TMP}/master.zip.${TS}
fi

# Pruefen ob es eine ccu.io Installation gibt
if [ -d ${CCUIO_PATH} ]
then
  echo "Es wurde eine vorhandene ccu.io Installation gefunden" | tee -a ${LOG}
  echo "Soll eine Aktualisierung von CCU.IO durchgeführt werden?"
  echo "YyJj/Nn"
  GUELTIG=0
  ja_nein_abfrage
  if [ ${ERGEBNIS} = 1 ]
  then
    CCUIO_UPDATE=true
    echo "Ab hier geht es mit der Update Routine weiter" >> ${LOG}
  else
    echo "Es ist kein Update gewuenscht, das Programm beendet sich" | tee -a ${LOG}
    copy_log_debug
    exit
  fi
else
  mkdir -p ${CCUIO_PATH}
  if [ ${?} != 0 ]
  then
    echo "Fehler beim erstellen des Verzeichnisses ${CCUIO_PATH}" | tee -a ${LOG}
    echo "Programm beendet sich"
    copy_log_debug
    exit 1
  fi
fi

# Pruefen ob es bereits eine nodejs Installation gibt
echo "Pruefen ob es bereits eine nodejs Installation gibt" >> ${LOG}
node --help 2>/dev/null|grep nodejs 2>&1 >> ${LOG}
if [ $? -eq 0 ]
then
  echo "Es wurde ein nodejs \"node\" im Pfad gefunden" >> ${LOG}
  NODE=true
fi
nodejs --help 2>/dev/null|grep nodejs 2>&1 >> ${LOG}
if [ $? -eq 0 ]
then
  echo "Es wurde ein nodejs \"nodejs\" im Pfad gefunden" >> ${LOG}
  NODE=true
fi

########################################################################
# Hauptprogramm
########################################################################

# Alte CCU.IO Version in /tmp sichern
if [ ${CCUIO_UPDATE} = true ]
then
  echo "Sichern der alten ccu.io Umgebung" | tee -a ${LOG}
  echo "Das Sicher kann einen Moment dauern"
  tar cfz ${TMP}/ccu.io.${TS}.tar.gz ${CCUIO_PATH} #1>/dev/null
  if [ ${?} != 0 ]
  then
    echo "Fehler beim erstellen der Sicherung unter ${TMP}/ccu.io.${TS}.tar.gz" | tee -a ${LOG}
    echo "Programm beendet sich"
    copy_log_debug
    exit 1
  else
    echo " Der alte Versionsstand von ccu.io wurde unter ${TMP}/ccu.io.${TS}.tar.gz gesichert" | tee -a ${LOG}
  fi
  echo "Pruefen ob ccu.io laeuft" >> ${LOG}
  ps -e|grep ccu.io >> ${LOG}
  if [ ${?} = 0 ]
  then
    if [ -f /etc/init.d/ccu.io.sh ]
    then
      /etc/init.d/ccu.io.sh stop
    else
      echo "Es wurde kein init.d Script für CCU.io gefunden" | tee -a ${LOG}
      echo "CCU.IO wird gekillt" | tee -a ${LOG}
      killall ccu.io
      ps -e|grep ccu.io >> ${LOG}
      if [ ${?} = 0 ]
      then
        echo "CCU.IO lässt sich nicht beenden, bitte prüfen" | tee -a ${LOG}
        echo "Der Installer beendet sich jetzt"
        copy_log_debug
        exit
      fi
    fi
  fi
fi  

# NODE installieren
if [ ${NODE} = false ]
then
  ADDON=node
  echo "Lade das node Paket von Github" | tee -a ${LOG}
  wget https://github.com/stryke76/nodejs/archive/master.zip
  if [ ${?} != 0 ]
  then
    echo "Fehler beim Download von ${ADDON}" | tee -a ${LOG}
    echo "Programm beendet sich"
    copy_log_debug
    exit 1
  fi
  echo "Verschiebe das master.zip nach ${TMP}/NODEJS.zip" >> ${LOG}
  mv master.zip ${TMP}/NODEJS.zip
  echo "Entpacke ${TMP}/NODEJS.zip" tee -a ${LOG}
  unzip ${TMP}/NODEJS.zip 1>/dev/null
  if [ ${?} != 0 ]
  then
    echo "Fehler beim unzip von ${ADDON}" | tee -a ${LOG}
    echo "Programm beendet sich"
    copy_log_debug
    exit 1
  fi                     
  mv nodejs-master ${TMP}
  echo "Installiere das im NODEJS.zip enthaltene node\*.deb" | tee -a ${LOG}
  dpkg -i ${TMP}/nodejs-master/nodejs_0.10.20-1_armhf.deb
  if [ ${?} != 0 ]
  then
    echo "Fehler beim installieren von NODEJS" | tee -a ${LOG}
    echo "Programm beendet sich"
    copy_log_debug
    exit 1
  fi
  echo "Verlinke /usr/local/bin/node mit /usr/local/bin/nodejs" | tee -a ${LOG}
  ln -s /usr/local/bin/node /usr/local/bin/nodejs   
  echo "Es werden die temprären Dateien der node Installation aufgeraeumt" | tee -a ${LOG}
  rm ${TMP}/NODEJS.zip
  rm -r ${TMP}/nodejs-master/
fi

# CCU.IO installieren
if [ ${CCUIO} = true ]
then
  if [ ${CCUIO_UPDATE} != true ]
  then
    # CCU.IO kopieren
    echo "Es wird mit der Installation von ccu.io begonnen" | tee -a ${LOG}
    echo "Kopiere die Dateien nach ${CCUIO_PATH}" | tee -a ${LOG}
    cp -Ra ../../ccu.io/* ${CCUIO_PATH}
    if [ ${?} != 0 ]
    then
      echo "Fehler beim kopieren von ${ADDON}" | tee -a ${LOG}
      echo "Programm beendet sich"
      copy_log_debug
      exit 1
    fi
    
    # Rechte anpassen
    echo "Es werden die Rechte der Installation angepasst" | tee -a ${LOG}
    chown -R ${CCUIO_USER} ${CCUIO_PATH}
    
    # Init Scripte anlegen
    echo "Startscripte von ccu.io kopieren" | tee -a ${LOG}
    echo "ccu.io nach /etc/init.d/ kopieren" >> ${LOG}
    cp ccu.io.sh /etc/init.d/
    echo "Rechte von ccu.io anpassen" >> ${LOG}
    chmod 755 /etc/init.d/ccu.io.sh 
    echo "Init Scripte verlinken" >> ${LOG}
    update-rc.d ccu.io.sh defaults
    # settings.js anpassen
    echo "settings.js anpassen" >> ${LOG}
    cp ${CCUIO_PATH}/settings.js.dist ${CCUIO_PATH}/settings.js
    echo " "
    echo "Bitte die IP Adresse der CCU eingeben" | tee -a ${LOG}
    read CCUIP
    echo ${CCUIP} >> ${LOG}
    sed -i "s/.*ccuIp.*/    ccuIp:\ \"${CCUIP}\"\,/g" ${CCUIO_PATH}/settings.js
    echo " "
    echo "Bitte die IP Adresse des Computers eingeben auf dem CCU.IO laufen soll" | tee -a ${LOG}
    read CCUIOIP
    echo ${CCUIOIP} >> ${LOG}
    sed -i "s/.*listenIp.*/        listenIp:\ \"${CCUIOIP}\"\,/g" ${CCUIO_PATH}/settings.js
    echo " "
    echo "Wird CUXd verwendet?" | tee -a ${LOG}
    echo "YyJj/Nn"
    GUELTIG=0
    ja_nein_abfrage
    if [ ${ERGEBNIS} = 1 ]
    then
      echo "CUXd soll verwendet werden" >> ${LOG}
      sed -i "s/.*io_cuxd.*/            \{ id\: \"io_cuxd\"\,    port\: 8701 \}\,/g" ${CCUIO_PATH}/settings.js
    fi
    echo " "
    echo "Wird Wired verwendet?" | tee -a ${LOG}
    echo "YyJj/Nn"
    GUELTIG=0
    ja_nein_abfrage
    if [ ${ERGEBNIS} = 1 ]
    then
      echo "Wired soll verwendet werden" >> ${LOG}
      sed -i "s/.*io_wired.*/            \{ id\: \"io_wired\"\,    port\: 2000 \}\,/g" ${CCUIO_PATH}/settings.js
    fi
  fi  
fi  
  
  
# CCU.IO aktualisieren
if [ ${CCUIO_UPDATE} = true ]
then
  ADDON=ccu.io
  ADDON_PATH=${ADDON}
  LINK="https://github.com/hobbyquaker/${ADDON}/archive/master.zip"
  install ccu.io
fi

# yahui aktualisieren
if [ ${YAHUI} = true ]
then
  ADDON=yahui
  ADDON_PATH=${ADDON}
  LINK="https://github.com/hobbyquaker/${ADDON}/archive/master.zip"
  install yahui
  echo "yahui settings-dist.js nach settings.js kopieren" >> ${LOG}
  if [ ! -f ${CCUIO_PATH}/www/${ADDON_PATH}/js/settings.js ]
  then
   cp ${CCUIO_PATH}/www/${ADDON_PATH}/js/settings-dist.js ${CCUIO_PATH}/www/${ADDON_PATH}/js/settings.js
  fi
fi

# DashUI aktualisieren
if [ ${DASHUI} = true ]
then
  ADDON=DashUI
  ADDON_PATH=dashui
  LINK="https://github.com/hobbyquaker/${ADDON}/archive/master.zip"
  install DashUI
fi

# CCU-IO-Highcharts aktualisieren
if [ ${CHARTS} = true ]
then
  ADDON=CCU-IO-Highcharts
  ADDON_PATH=charts
  LINK="https://github.com/hobbyquaker/${ADDON}/archive/master.zip"
  install CCU-IO-Highcharts
fi

# CCU-IO.Eventlist aktualisieren
if [ ${EVENTLIST} = true ]
then
  ADDON=CCU-IO.Eventlist
  ADDON_PATH=eventlist
  LINK="https://github.com/GermanBluefox/${ADDON}/archive/master.zip"
  install CCU-IO.Eventlist
fi
#
## Rechte auf ${CCUIO_USER} setzen
#chown -R ${CCUIO_USER} ${CCUIO_PATH}
#
## CCU.IO starten
${CCUIO_CMD} start
echo "Programmsende ${SCRIPT_NAME} $( date +%Y%m%d%H%M%S )" >> ${LOG}

copy_log_debug


