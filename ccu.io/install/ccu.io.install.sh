#!/bin/sh
# set -xv
DEBUG=false

########################################################################
# Konfiguration der Umgebung
########################################################################

Version=0.5
SCRIPT_NAME=$( basename $0 )
START_PATH=$( dirname $0 )
PARAMETER=$1
TS=$( date +%Y%m%d%H%M%S )
TEMP=${START_PATH}/../tmp
exec 2>${TEMP}/${SCRIPT_NAME}.${TS}.debug.txt
set -xv
LOG=${TEMP}/${SCRIPT_NAME}.${TS}.log.txt
echo "Programmstart ${SCRIPT_NAME} ${TS}" >> ${LOG}
RC=true
RUN=true

if [ -f ${START_PATH}/settings ]
then
  . ${START_PATH}/settings
else
  cp ${START_PATH}/settings-dist ${START_PATH}/settings
  chown -R ${CCUIO_USER} ${START_PATH}/settings
  chmod 755 ${START_PATH}/settings
  . ${START_PATH}/settings
fi
if [ -z ${UN_ZIP} ]
then
  echo "export UN_ZIP=\"unzip\“" >> ${START_PATH}/settings
  UN_ZIP=unzip
fi
  
if [ ${PARAMETER} ]
then
  DASHUI=false
  CHARTS=false   
  YAHUI=false    
  EVENTLIST=false
  CCUIO=false
  CCUIO_UPDATE=false
  if [ ${PARAMETER} = DASHUI ]
  then
    DASHUI=true
  fi
  if [ ${PARAMETER} = CHARTS ]
  then
    CHARTS=true
  fi
  if [ ${PARAMETER} = YAHUI ]
  then
    YAHUI=true
  fi
  if [ ${PARAMETER} = EVENTLIST ]
  then
    EVENTLIST=true
  fi
fi

########################################################################
# Funktionen
########################################################################
install ()
{
  echo "Es wird ${ADDON} von ${LINK} geladen und installiert" | tee -a ${LOG}
  cd ${TEMP}
  wget --no-check-certificate ${LINK} --output-document=master.zip 2>&1
  if [ ${?} != 0 ]
  then
    echo "Fehler beim Download von ${ADDON}" | tee -a ${LOG}
    echo "Programm beendet sich"
    RC=false
    return 1
  fi
  mv master.zip ${ADDON}.zip
  ${UN_ZIP} -d "${TEMP}" "${TEMP}/${ADDON}.zip" 1>/dev/null
  if [ ${?} != 0 ]
  then
    echo "Fehler beim unzip von ${ADDON}" | tee -a ${LOG}
    echo "Programm beendet sich"
    RC=false
    return 1
  fi
  if [ ${ADDON} = ccu.io ]
  then
    cp -Ra ${ADDON}-master/${ADDON_PATH}/* ${CCUIO_PATH}
    if [ ${?} != 0 ]
    then
      echo "Fehler beim kopieren von ${ADDON}" | tee -a ${LOG}
      echo "Programm beendet sich"
      RC=false
      return 1
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
        RC=false
        return 1
      fi
      chown -R ${CCUIO_USER} ${CCUIO_PATH}/www/${ADDON_PATH}/
      echo "${ADDON} wurde aktualisiert"
    else
      echo " "
      echo "Bisher war ${ADDON} nicht installiert" | tee -a ${LOG}
      echo "${ADDON} wird installiert und ist unter http://${CCUIOIP}:8080/${ADDON_PATH} erreichbar"
      echo " "
      mkdir ${CCUIO_PATH}/www/${ADDON_PATH}
      if [ ${?} != 0 ]
      then
        echo "Fehler beim erstellen des Verzeichnisses ${CCUIO_PATH}/www/${ADDON_PATH}" | tee -a ${LOG}
        echo "Programm beendet sich"
        RC=false
        return 1
      fi
      cp -Ra ${ADDON}-master/${ADDON_PATH}/* ${CCUIO_PATH}/www/${ADDON_PATH}/
      if [ ${?} != 0 ]
      then
        echo "Fehler beim kopieren von ${ADDON}" | tee -a ${LOG}
        echo "Programm beendet sich"
        RC=false
        return 1
      fi
      chown -R ${CCUIO_USER} ${CCUIO_PATH}/www/${ADDON_PATH}/
    fi
  fi
  rm -R ${ADDON}-master ${ADDON}.zip # Loeschen der Temorären Dateien und Verzeichnisse ${ADDON}-master ${ADDON}.zip
}

copy_log_debug ()
{
  # Kopieren der Log und Debugdateien in das LOG Verzeichnis von ccu.io"
  mv ${LOG} ${TEMP}/${SCRIPT_NAME}.${TS}.debug.txt ${CCUIO_PATH}/log/ 2>&1
  chown -R ${CCUIO_USER} ${CCUIO_PATH}/log/
  set +xv
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

# Pruefen ob es noch ein altes master.zip gibt und dieses gegebenenfalls sichern
if [ -f ${TEMP}/master.zip ]
then
  echo "Altes master.zip gefunden" | tee -a ${LOG}
  echo "sichere altes master.zip als master.zip.${TS}"
  sudo mv ${TEMP}/master.zip ${TEMP}/master.zip.${TS}
fi

# Pruefen ob es eine ccu.io Installation gibt
if [ -d ${CCUIO_PATH} ]
then
  if [ ! ${PARAMETER} ]
  then
    echo "Es wurde eine vorhandene ccu.io Installation gefunden" | tee -a ${LOG}
    echo "Soll eine Aktualisierung von CCU.IO durchgeführt werden?"
    echo "YyJj/Nn"
    GUELTIG=0
    ja_nein_abfrage
    if [ ${ERGEBNIS} = 1 ]
    then
      CCUIO_UPDATE=true
      CCUIO=true
      echo "Ab hier geht es mit der Update Routine weiter" >> ${LOG}
    else
      echo "Es ist kein Update gewuenscht, das Programm beendet sich" | tee -a ${LOG}
      RUN=false
      return
    fi
  else
    CCUIO_UPDATE=false
    CCUIO=true
  fi
else
  CCUIO=false
fi

# Pruefen ob es bereits eine nodejs Installation gibt
echo "Pruefen ob es bereits eine nodejs Installation gibt" >> ${LOG}
node --help 2>/dev/null|grep nodejs 2>&1 >> ${LOG}
if [ $? -eq 0 ]
then
  echo "Es wurde ein nodejs \"node\" im Pfad gefunden" >> ${LOG}
  NODE=true
else
  NODE=false
fi
nodejs --help 2>/dev/null|grep nodejs 2>&1 >> ${LOG}
if [ ${?} -eq 0 ]
then
  echo "Es wurde ein nodejs \"nodejs\" im Pfad gefunden" >> ${LOG}
  NODE=true
else
  NODE=false
fi

# Abfrage ob das Script von root aufgerufen wird
if [ $( whoami ) = root ]
then
  ROOT=true
else
  ROOT=false
fi

########################################################################
# Hauptprogramm
########################################################################

if [ ${RUN}=true ]
then 

  #################################
  # NODE installieren
  #################################
  if [ ${NODE} = false -a ${RC} = true -a ${ROOT} = true ]
  then
    ADDON=node
    echo "Lade das node Paket von Github" | tee -a ${LOG}
    wget https://github.com/stryke76/nodejs/archive/master.zip 2>&1
    if [ ${?} != 0 ]
    then
      echo "Fehler beim Download von ${ADDON}" | tee -a ${LOG}
      echo "Programm beendet sich"
      RC=false
      return 1
    fi
    echo "Verschiebe das master.zip nach ${TEMP}/NODEJS.zip" >> ${LOG}
    mv master.zip ${TEMP}/NODEJS.zip
    echo "Entpacke ${TEMP}/NODEJS.zip" tee -a ${LOG}
    ${UN_ZIP} ${TEMP}/NODEJS.zip 1>/dev/null
    if [ ${?} != 0 ]
    then
      echo "Fehler beim unzip von ${ADDON}" | tee -a ${LOG}
      echo "Programm beendet sich"
      RC=false
      return 1
    fi
    mv nodejs-master ${TEMP}
    echo "Installiere das im NODEJS.zip enthaltene node\*.deb" | tee -a ${LOG}
    dpkg -i ${TEMP}/nodejs-master/nodejs_0.10.20-1_armhf.deb
    if [ ${?} != 0 ]
    then
      echo "Fehler beim installieren von NODEJS" | tee -a ${LOG}
      echo "Programm beendet sich"
      RC=false
      return 1
    fi
    echo "Verlinke /usr/local/bin/node mit /usr/local/bin/nodejs" | tee -a ${LOG}
    ln -s /usr/local/bin/node /usr/local/bin/nodejs
    echo "Es werden die temprären Dateien der node Installation aufgeraeumt" | tee -a ${LOG}
    rm ${TEMP}/NODEJS.zip
    rm -r ${TEMP}/nodejs-master/
  fi
  
  #################################
  # CCU.IO Update
  #################################
  if [ ${CCUIO_UPDATE} = true -a ${RC} = true -a ${ROOT} = true -a ! ${PARAMETER} ]
  then
    # Backup der alten CCU.IO Umgebung
    echo "Sichern der alten ccu.io Umgebung" | tee -a ${LOG}
    echo "Das Sichern kann einen Moment dauern"
    tar cfz /tmp/ccu.io.${TS}.tar.gz ${CCUIO_PATH} #1>/dev/null
    if [ ${?} != 0 ]
    then
      echo "Fehler beim erstellen der Sicherung unter ${CCUIO_PATH}/tmp/ccu.io.${TS}.tar.gz" | tee -a ${LOG}
      echo "Programm beendet sich"
      RC=false
      return 1
    else
      mv /tmp/ccu.io.${TS}.tar.gz ${CCUIO_PATH}/tmp 
      echo " Der alte Versionsstand von ccu.io wurde unter ${CCUIO_PATH}/tmp/ccu.io.${TS}.tar.gz gesichert" | tee -a ${LOG}
      # Aktualisieren von CCU.IO
      ${CCUIO_CMD} stop
      ADDON=ccu.io
      ADDON_PATH=${ADDON}
      LINK="https://github.com/hobbyquaker/${ADDON}/archive/master.zip"
      install ccu.io
      PARAMETER=all
    fi
  fi
  

  #################################
  # CCU.IO installieren
  #################################
  if [ ${CCUIO} = false -a ${RC} = true -a ${ROOT} = true -a ! ${PARAMETER} ]
  then
    # CCU.IO kopieren
    mkdir -p ${CCUIO_PATH}
    if [ ${?} != 0 ]
    then
      echo "Fehler beim erstellen des Verzeichnisses ${CCUIO_PATH}" | tee -a ${LOG}
      echo "Programm beendet sich"
      RC=false
    else
      echo "Es wird mit der Installation von ccu.io begonnen" | tee -a ${LOG}
      echo "Kopiere die Dateien nach ${CCUIO_PATH}" | tee -a ${LOG}
      cp -Ra ../../ccu.io/* ${CCUIO_PATH}
      if [ ${?} != 0 ]
      then
        echo "Fehler beim kopieren von ${ADDON}" | tee -a ${LOG}
        echo "Programm beendet sich"
        RC=false
      else   
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
        echo "CCUIP ${CCUIP}" >> ${LOG}
        sed -i "s/.*ccuIp.*/    ccuIp:\ \"${CCUIP}\"\,/g" ${CCUIO_PATH}/settings.js
        echo "export CCUIP=\"${CCUIP}\"" >> settings
        echo " "
        echo "Bitte die IP Adresse des Computers eingeben auf dem CCU.IO laufen soll" | tee -a ${LOG}
        read CCUIOIP
        echo "CCUIOIP ${CCUIOIP}" >> ${LOG}
        sed -i "s/.*listenIp.*/        listenIp:\ \"${CCUIOIP}\"\,/g" ${CCUIO_PATH}/settings.js
        echo "export CCUIOIP=\"${CCUIOIP}\"" >> settings
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
        
        # Rechte anpassen
        echo "Es werden die Rechte der Installation angepasst" | tee -a ${LOG}
        echo " "
        echo "ccu.io ist unter http://${CCUIOIP}:8080/ccu.io erreichbar"
        chown -R ${CCUIO_USER} ${CCUIO_PATH}
        CCUIO=true
        PARAMETER=all
      fi
    fi
  fi  
    
  if [ ${PARAMETER} -a ${CCUIO} = true ]
  then
    #################################  
    # yahui aktualisieren
    ################################# 
    if [ ${YAHUI} = true -a ${RC} = true ]
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
    
    #################################
    # DashUI aktualisieren
    #################################  
    if [ ${DASHUI} = true -a ${RC} = true ]
    then
      ADDON=DashUI
      ADDON_PATH=dashui
      LINK="https://github.com/hobbyquaker/${ADDON}/archive/master.zip"
      install DashUI
    fi
    
    #################################
    # CCU-IO-Highcharts aktualisieren
    #################################
    if [ ${CHARTS} = true -a ${RC} = true ]
    then
      ADDON=CCU-IO-Highcharts
      ADDON_PATH=charts
      LINK="https://github.com/hobbyquaker/${ADDON}/archive/master.zip"
      install CCU-IO-Highcharts
    fi
    
    #################################  
    # CCU-IO.Eventlist aktualisieren
    #################################
    if [ ${EVENTLIST} = true -a ${RC} = true ]
    then
      ADDON=CCU-IO.Eventlist
      ADDON_PATH=eventlist
      LINK="https://github.com/GermanBluefox/${ADDON}/archive/master.zip"
      install CCU-IO.Eventlist
    fi
  else
    if [ ${CCUIO} = false -a ${PARAMETER} ]
    then
      echo "Es soll ${PARAMETER} installiert werden aber es ist kein ccu.io unter ${CCUIO_PATH} installiert"
      echo "Bei einer vorhandenen ccu.io Installation bitte die settings Datei anpassen"
      echo "Wenn ccu.io installiert werden soll bitte das Script folgendermassen aufrufen"
      echo "sudo ./ccu.io.install.sh" 
      RC=false
    else
      echo "Es soll ccu.io installiert/aktualisiert werden, dazu bitte das Script als root aufrufen"
      echo "sudo ./ccu.io.install.sh"      
      RC=false
    fi
  fi
  
  #################################
  # CCU.IO starten
  ################################# 
  if [ ${CCUIO} = true -a ${ROOT} = true ]
  then
    if [ ${PARAMETER} = all ]
    then
      ${CCUIO_CMD} start
    fi
  fi
fi

if [ ${DEBUG} = true ]
then
  echo "CCUIO ${CCUIO}"
  echo "CCUIO_UPDATE ${CCUIO_UPDATE}"
  echo "YAHUI ${YAHUI}"
  echo "CHARTS ${CHARTS}"
  echo "DASHUI ${DASHUI}"
  echo "EVENTLIST ${EVENTLIST}"
  echo "NODE ${NODE}"
  echo "ROOT ${ROOT}"
  echo "Programmsende ${SCRIPT_NAME} $( date +%Y%m%d%H%M%S )" >> ${LOG}
  copy_log_debug
else
  echo "Programmsende ${SCRIPT_NAME} $( date +%Y%m%d%H%M%S )" >> ${LOG}
  copy_log_debug
fi

if [ ${RC} = false ]
then
  exit 1
fi