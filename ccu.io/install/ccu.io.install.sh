#!/bin/sh
set -x # Debug Modus, zum aktivieren das # am Anfang der Zeile entfernen

########################################################################
#Variablen setzen
########################################################################

Version=0.1
SCRIPT_NAME=$( basename $0 )
TS=$( date +%Y%m%d%H%M%S )
TMP=/tmp

# Ab hier bitte die Variablnen anpassen
CCUIO_PATH="/opt/ccu.io"   # Hier den Pfad angeben in dem sich ccu.io befindet
CCUIO_CMD="/etc/init.d/ccu.io.sh"     # Hier den Aufruf von ccu.io angeben
CCUIO_USER=pi                           # Hier den User angeben unter dem ccu.io laufen soll
CCUIO_UPDATE=false
NODE=false
CCUIO=true     # CCU.IO installieren = 1

# Optionale Addons
DASHUI=false    # DashUI installieren = 1
CHARTS=false    # CCU-IO-Highcharts installieren = 1
YAHUI=false     # yahui installieren = 1
EVENTLIST=false # CCU-IO Eventlist installieren = 1

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
  wget ${LINK}
  if [ ${?} != 0 ]
  then
    echo "Fehler beim Download von ${ADDON}"
    echo "Programm beendet sich"
    exit 1
  fi
  mv master.zip ${ADDON}.zip
  unzip ${ADDON}.zip 1>/dev/null
  if [ ${?} != 0 ]
  then
    echo "Fehler beim unzip von ${ADDON}"
    echo "Programm beendet sich"
    exit 1
  fi
  if [ ${ADDON} = ccu.io ]
  then
    cp -Ra ${ADDON}-master/${ADDON_PATH}/* ${CCUIO_PATH} 1>/dev/null
    if [ ${?} != 0 ]
    then
      echo "Fehler beim kopieren von ${ADDON}"
      echo "Programm beendet sich"
      exit 1
    fi
    chown -R ${CCUIO_USER} ${CCUIO_PATH}/
  else
    if [ -d ${CCUIO_PATH}/www/${ADDON_PATH} ]
    then
      cp -Ra ${ADDON}-master/${ADDON_PATH}/* ${CCUIO_PATH}/www/${ADDON_PATH}/ 1>/dev/null
      if [ ${?} != 0 ]
      then
        echo "Fehler beim kopieren von ${ADDON}"
        echo "Programm beendet sich"
        exit 1
      fi
      chown -R ${CCUIO_USER} ${CCUIO_PATH}/www/${ADDON_PATH}/
    else
      echo "Bisher war ${ADDON} nicht installiert"
      echo "${ADDON} wird installiert und ist unter <IP>:8080/${ADDON_PATH} erreichbar"
      mkdir ${CCUIO_PATH}/www/${ADDON_PATH}
      if [ ${?} != 0 ]
      then
        echo "Fehler beim erstellen des Verzeichnisses ${CCUIO_PATH}/www/${ADDON_PATH}"
        echo "Programm beendet sich"
        exit 1
      fi
      cp -Ra ${ADDON}-master/${ADDON_PATH}/* ${CCUIO_PATH}/www/${ADDON_PATH}/ 1>/dev/null
      if [ ${?} != 0 ]
      then
        echo "Fehler beim kopieren von ${ADDON}"
        echo "Programm beendet sich"
        exit 1
      fi
      chown -R ${CCUIO_USER} ${CCUIO_PATH}/www/${ADDON_PATH}/
    fi
  fi
  rm -R ${ADDON}-master ${ADDON}.zip # Loeschen der Temorären Dateien und Verzeichnisse ${ADDON}-master ${ADDON}.zip
}
########################################################################
# Vorbedingungen pruefen
########################################################################

if [ $( whoami ) != root ]
then
	echo "Das Programm muss als root laufen da es Verzeichnisse anlegt und Rechte anpasst"
	echo "bitte das Script mit \"sudo ${SCRIPT_NAME}\" aufrufen"
  exit 1
fi

# cd ${TMP}

# Pruefen ob es noch ein altes master.zip gibt und dieses gegebenenfalls sichern
if [ -f ${TMP}/master.zip ]
then
  echo "Altes master.zip gefunden"
  echo "sichere altes master.zip als master.zip.${TS}"
  mv ${TMP}/master.zip ${TMP}/master.zip.${TS}
fi

# Pruefen ob es eine ccu.io Installation gibt
if [ -d ${CCUIO_PATH} ]
then
  echo "Der angegebene Pfad zu CCU.IO existiert bereits!"
  echo "Soll eine aktualisierung von CCU.IO durchgeführt werden?"
  echo "YyJj/Nn"
  GUELTIG=0
  while [ ${GUELTIG} != 1 ]
  do
    read ANTWORT
    case "${ANTWORT}" in
      [JjYy])    ERGEBNIS=1; GUELTIG=1 ;;
      [Nn])      ERGEBNIS=0; GUELTIG=1 ;;
      *)         GUELTIG=0 ;;
    esac
  done
  if [ ${ERGEBNIS} = 1 ]
  then
    CCUIO_UPDATE=true
  else
    echo "Die Antwort ist NEIN"
    echo "Dadurch beendet sich das Programm"
    exit
  fi
else
  mkdir -p ${CCUIO_PATH}
  if [ ${?} != 0 ]
  then
    echo "Fehler beim erstellen des Verzeichnisses ${CCUIO_PATH}"
    echo "Programm beendet sich"
    exit 1
  fi
fi

# Pruefen ob es bereits eine nodejs Installation gibt
node --help 2>/dev/null|grep nodejs 2>&1 1>/dev/null
if [ $? -eq 0 ]
then
  NODE=true
fi
nodejs --help 2>/dev/null|grep nodejs 2>&1 1>/dev/null
if [ $? -eq 0 ]
then
  NODE=true
fi

########################################################################
# Hauptprogramm
########################################################################

# Alte CCU.IO Version in /tmp sichern
if [ ${CCUIO_UPDATE} = true ]
then
  tar cvfz ${TMP}/ccu.io.${TS}.tar.gz ${CCUIO_PATH} 1>/dev/null
  if [ ${?} != 0 ]
  then
    echo "Fehler beim erstellen der Sicherung unter ${TMP}/ccu.io.${TS}.tar.gz"
    echo "Programm beendet sich"
    exit 1
  else
    echo " Der alte Versionsstand von ccu.io wurde unter ${TMP}/ccu.io.${TS}.tar.gz gesichert"
  fi
  ps -e|grep ccu.io 2>&1 1>/dev/null
  if [ ${?} = 0 ]
  then
    if [ -f /etc/init.d/ccu.io.sh ]
    then
      /etc/init.d/ccu.io.sh stop
    else
      echo "es wurde kein init.d Script für CCU.io gefunden"
      echo "CCU.IO wird gekillt"
      killall ccu.io
      ps -e|grep ccu.io 2>&1 1>/dev/null
      if [ ${?} = 0 ]
      then
        echo "CCU.IO lässt sich nicht beenden, bitte prüfen"
        echo "Der Installer beendet sich jetzt"
        exit
      fi
    fi
  fi
fi  

# NODE installieren
if [ ${NODE} = false ]
then
  wget https://github.com/stryke76/nodejs/archive/master.zip
  if [ ${?} != 0 ]
  then
    echo "Fehler beim Download von ${ADDON}"
    echo "Programm beendet sich"
    exit 1
  fi
  mv master.zip ${TMP}/NODEJS.zip
  unzip ${TMP}/NODEJS.zip 1>/dev/null
  if [ ${?} != 0 ]
  then
    echo "Fehler beim unzip von ${ADDON}"
    echo "Programm beendet sich"
    exit 1
  fi                     
  mv nodejs-master ${TMP}
  dpkg -i ${TMP}/nodejs-master/nodejs_0.10.20-1_armhf.deb
  if [ ${?} != 0 ]
  then
    echo "Fehler beim installieren von NODEJS"
    echo "Programm beendet sich"
    exit 1
  fi
  ln -s /usr/local/bin/node /usr/local/bin/nodejs   
  rm ${TMP}/NODEJS.zip
  rm -r ${TMP}/nodejs-master/
fi

# CCU.IO installieren
if [ ${CCUIO} = true ]
then
  if [ ${CCUIO_UPDATE} != true ]
  then
    # CCU.IO kopieren
    cp -Ra ../../ccu.io/* ${CCUIO_PATH} 1>/dev/null
    if [ ${?} != 0 ]
    then
      echo "Fehler beim kopieren von ${ADDON}"
      echo "Programm beendet sich"
      exit 1
    fi
    
    # Rechte anpassen
    chown -R ${CCUIO_USER} ${CCUIO_PATH}
    
    # Init Scripte anlegen
    cp ccu.io.sh /etc/init.d/
    chmod 755 /etc/init.d/ccu.io.sh 
    ln -s /etc/init.d/ccu.io.sh /etc/rc1.d/K01ccu.io.sh
    ln -s /etc/init.d/ccu.io.sh /etc/rc2.d/S03ccu.io.sh
    ln -s /etc/init.d/ccu.io.sh /etc/rc0.d/K01ccu.io.sh
    ln -s /etc/init.d/ccu.io.sh /etc/rc4.d/S03ccu.io.sh
    ln -s /etc/init.d/ccu.io.sh /etc/rc5.d/S03ccu.io.sh
    ln -s /etc/init.d/ccu.io.sh /etc/rc3.d/S03ccu.io.sh
    ln -s /etc/init.d/ccu.io.sh /etc/rc6.d/K01ccu.io.sh
    
    # settings.js anpassen
    cp ${CCUIO_PATH}/settings.js.dist ${CCUIO_PATH}/settings.js
    echo "Bitte die IP Adresse der CCU eingeben"
    read CCUIP
    sed -i "s/.*ccuIp.*/    ccuIp:\ \"${CCUIP}\"\,/g" ${CCUIO_PATH}/settings.js
    echo "Bitte die IP Adresse des Computers eingeben auf dem CCU.IO laufen soll"
    read CCUIOIP
    sed -i "s/.*listenIp.*/        listenIp:\ \"${CCUIOIP}\"\,/g" ${CCUIO_PATH}/settings.js
    echo "Wird CUXd verwendet?"
    echo "YyJj/Nn"
    GUELTIG=0
    while [ ${GUELTIG} != 1 ]
    do
      read ANTWORT
      case "${ANTWORT}" in
        [JjYy])    ERGEBNIS=1; GUELTIG=1 ;;
        [Nn])      ERGEBNIS=0; GUELTIG=1 ;;
        *)         GUELTIG=0 ;;
      esac
    done
    if [ ${ERGEBNIS} = 1 ]
    then
      sed -i "s/.*io_cuxd.*/            \{ id\: \"io_cuxd\"\,    port\: 8701 \}\,/g" ${CCUIO_PATH}/settings.js
    fi
    echo "Wird Wired verwendet?"
    echo "YyJj/Nn"
    GUELTIG=0
    while [ ${GUELTIG} != 1 ]
    do
      read ANTWORT
      case "${ANTWORT}" in
        [JjYy])    ERGEBNIS=1; GUELTIG=1 ;;
        [Nn])      ERGEBNIS=0; GUELTIG=1 ;;
        *)         GUELTIG=0 ;;
      esac
    done
    if [ ${ERGEBNIS} = 1 ]
    then
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

