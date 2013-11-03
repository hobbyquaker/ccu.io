#!/bin/sh
#set -xv
DEBUG=false

########################################################################
# Konfiguration der Umgebung
########################################################################

Version=0.5.3
SCRIPT_NAME=$( basename $0 )
START_PATH=$( dirname $0 )
if [ ${START_PATH} = . ]
then
  START_PATH=$( pwd )
fi
PARAMETER=$1
TS=$( date +%Y%m%d%H%M%S )
TEMP=${START_PATH}/../tmp
exec 2>${TEMP}/${SCRIPT_NAME}.${TS}.debug.txt
set -xv
LOG=${TEMP}/${SCRIPT_NAME}.${TS}.log.txt
echo "Programmstart ${SCRIPT_NAME} ${TS}" >> ${LOG}
RC=true
RUN=true
#NODE_CMD=nodejs

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
  echo "export UN_ZIP=\"unzip\"" >> ${START_PATH}/settings
  UN_ZIP=unzip
fi
  
if [ ! -z ${PARAMETER} ]
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
  elif [ ${PARAMETER} = CHARTS ]
  then
    CHARTS=true
  elif [ ${PARAMETER} = YAHUI ]
  then
    YAHUI=true
  elif [ ${PARAMETER} = EVENTLIST ]
  then
    EVENTLIST=true
  elif [ ${PARAMETER} = CCUIO_UPDATE ]
  then
    CCUIO_UPDATE=true
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
    rm ${TEMP}/master.zip
    return 1
  fi
  mv ${TEMP}/master.zip ${TEMP}/${ADDON}.zip
  ${UN_ZIP} -d "${TEMP}" "${TEMP}/${ADDON}.zip" 1>/dev/null
  if [ ${?} != 0 ]
  then
    echo "Fehler beim unzip von ${ADDON}" | tee -a ${LOG}
    echo "Programm beendet sich"
    rm ${TEMP}/${ADDON}.zip
    if [ -d ${TEMP}/${ADDON}-master ]
    then
      rm -R ${TEMP}/${ADDON}-master
    fi
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
      rm ${TEMP}/${ADDON}.zip
      if [ -d ${TEMP}/${ADDON}-master ]
      then
        rm -R ${TEMP}/${ADDON}-master
      fi
      RC=false
      return 1
    fi
    chown -R ${CCUIO_USER} ${CCUIO_PATH}/
  elif [ ${ADDON} = nodejs ]
  then
    echo "Installiere das im NODEJS.zip enthaltene node\*.deb" | tee -a ${LOG}
    dpkg -i ${TEMP}/${ADDON}-master/nodejs_0.10.20-1_armhf.deb
    if [ ${?} != 0 ]
    then
      echo "Fehler beim installieren von NODEJS" | tee -a ${LOG}
      echo "Programm beendet sich"
      rm ${TEMP}/${ADDON}.zip
      if [ -d ${TEMP}/${ADDON}-master ]
      then
        rm -R ${TEMP}/${ADDON}-master
      fi      
      RC=false
      return 1
    fi
    echo "Verlinke /usr/local/bin/node mit /usr/local/bin/nodejs" | tee -a ${LOG}
    ln -s /usr/local/bin/node /usr/local/bin/nodejs
    grep "\#export\ NODE_CMD=" ${START_PATH}/settings
    if [ ${?} -eq 0 ]
    then     
      sed -i "s/\#export\ NODE_CMD=.*/export\ NODE_CMD=\"${NODE_CMD}\"/g" ${START_PATH}/settings
    else
      echo "export NODE_CMD=\"$( which nodejs )\"" >> ${START_PATH}/settings
    fi
  else
    if [ -d ${CCUIO_PATH}/www/${ADDON_PATH} ]
    then
      cp -Ra ${ADDON}-master/${ADDON_PATH}/* ${CCUIO_PATH}/www/${ADDON_PATH}/
      if [ ${?} != 0 ]
      then
        echo "Fehler beim kopieren von ${ADDON}" | tee -a ${LOG}
        echo "Programm beendet sich"
        rm ${TEMP}/${ADDON}.zip
        if [ -d ${TEMP}/${ADDON}-master ]
        then
          rm -R ${TEMP}/${ADDON}-master
        fi
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
        rm ${TEMP}/${ADDON}.zip
        if [ -d ${TEMP}/${ADDON}-master ]
        then
          rm -R ${TEMP}/${ADDON}-master
        fi
        RC=false
        return 1
      fi
      cp -Ra ${ADDON}-master/${ADDON_PATH}/* ${CCUIO_PATH}/www/${ADDON_PATH}/
      if [ ${?} != 0 ]
      then
        echo "Fehler beim kopieren von ${ADDON}" | tee -a ${LOG}
        echo "Programm beendet sich"
        rm ${TEMP}/${ADDON}.zip
        if [ -d ${TEMP}/${ADDON}-master ]
        then
          rm -R ${TEMP}/${ADDON}-master
        fi
        RC=false
        return 1
      fi
      chown -R ${CCUIO_USER} ${CCUIO_PATH}/www/${ADDON_PATH}/
    fi
  fi
  rm -R ${TEMP}/${ADDON}-master ${TEMP}/${ADDON}.zip # Loeschen der Temorären Dateien und Verzeichnisse ${ADDON}-master ${ADDON}.zip
}

copy_log_debug ()
{
  # Kopieren der Log und Debugdateien in das LOG Verzeichnis von ccu.io"
  chown -R ${CCUIO_USER} ${LOG} ${TEMP}/${SCRIPT_NAME}.${TS}.debug.txt
  if [ -d ${CCUIO_PATH}/log ]
  then
    mv ${LOG} ${TEMP}/${SCRIPT_NAME}.${TS}.debug.txt ${CCUIO_PATH}/log/ 2>&1
    set +xv
  else
    mv ${LOG} ${TEMP}/${SCRIPT_NAME}.${TS}.debug.txt ${START_PATH}/../log
    set +xv
  fi
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
echo "-f TEMP/master.zip" 1>&2
if [ -f ${TEMP}/master.zip ]
then
  echo "Altes master.zip gefunden" | tee -a ${LOG}
  echo "sichere altes master.zip als master.zip.${TS}"
  sudo mv ${TEMP}/master.zip ${TEMP}/master.zip.${TS}
fi

# Pruefen ob es eine ccu.io Installation gibt
echo "-d CCUIO_PATH" 1>&2
if [ -d ${CCUIO_PATH} ]
then
  CCUIO=true
  if [ -z ${PARAMETER} ]
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
      RUN=false
      return
    fi
  else
    if [ ${PARAMETER} = CCUIO_UPDATE ]
    then
      CCUIO_UPDATE=true
    else
      CCUIO_UPDATE=false
    fi
  fi
else
  CCUIO=false
  CCUIO_UPDATE=false
fi

# Pruefen ob es bereits eine nodejs Installation gibt
echo "Pruefen ob es bereits eine nodejs Installation gibt" >> ${LOG}
if [ -z ${NODE_CMD} ]   
then
  nodejs --help 2>/dev/null|grep nodejs 2>&1 >> ${LOG}
  if [ $? -eq 0 ]
  then
    echo "Es wurde ein nodejs \"nodejs\" im Pfad gefunden" >> ${LOG}
    NODE=true
    NODE_CMD=nodejs
    if [ -f ${CCUIO_PATH}/install/settings ]
    then
      grep "\#export\ NODE_CMD=" ${CCUIO_PATH}/install/settings
      if [ ${?} -eq 0 ]
      then     
        sed -i "s/\#export\ NODE_CMD=.*/export\ NODE_CMD=\""${NODE_CMD}"\"/g" ${CCUIO_PATH}/install/settings
      else
        echo "export NODE_CMD=\"$( which nodejs )\"" >> ${CCUIO_PATH}/install/settings
      fi      
    else
      grep "\#export\ NODE_CMD=" ${START_PATH}/settings
      if [ ${?} -eq 0 ]
      then     
        sed -i "s/\#export\ NODE_CMD=.*/export\ NODE_CMD=\"${NODE_CMD}\"/g" ${START_PATH}/settings
      else
        echo "export NODE_CMD=\"$( which nodejs )\"" >> ${START_PATH}/settings
      fi
    fi   
  else
    NODE=false
  fi
  node --help 2>/dev/null|grep nodejs 2>&1 >> ${LOG}
  if [ $? -eq 0 -a ${NODE} = false ]
  then
    echo "Es wurde ein nodejs \"node\" im Pfad gefunden" >> ${LOG}
    NODE=true
    NODE_CMD=node
    if [ -f ${CCUIO_PATH}/install/settings ]
    then
      grep "\#export\ NODE_CMD=" ${CCUIO_PATH}/install/settings
      if [ ${?} -eq 0 ]
      then     
        sed -i "s/\#export\ NODE_CMD=.*/export\ NODE_CMD=\""${NODE_CMD}"\"/g" ${CCUIO_PATH}/install/settings
      else
        echo "export NODE_CMD=\"$( which nodejs )\"" >> ${CCUIO_PATH}/install/settings
      fi      
    else
      grep "\#export\ NODE_CMD=" ${START_PATH}/settings
      if [ ${?} -eq 0 ]
      then     
        sed -i "s/\#export\ NODE_CMD=.*/export\ NODE_CMD=\"${NODE_CMD}\"/g" ${START_PATH}/settings
      else
        echo "export NODE_CMD=\"$( which nodejs )\"" >> ${START_PATH}/settings
      fi
    fi
  fi  
fi

# Abfrage ob das Script von root aufgerufen wird
echo "whoami= root" 1>&2
if [ $( whoami ) = root ]
then
  ROOT=true
else
  ROOT=false
fi

########################################################################
# Hauptprogramm
########################################################################
echo "RUN=true" 1>&2
if [ ${RUN}=true ]
then 

  #################################
  # NODE installieren
  #################################
  echo "NODE = false -a RC = true -a ROOT = true" 1>&2
  if [ ${NODE} = false -a ${RC} = true -a ${ROOT} = true ]
  then
    ADDON=nodejs
    LINK="https://github.com/stryke76/nodejs/archive/master.zip"
    install node
  fi
  
  #################################
  # CCU.IO Update
  #################################
  echo "CCUIO_UPDATE = true -a RC = true" 1>&2
  if [ ${CCUIO_UPDATE} = true -a ${RC} = true ]
  then
    # Backup der alten CCU.IO Umgebung
    echo "Sichern der alten ccu.io Umgebung" | tee -a ${LOG}
    echo "Das Sichern kann einen Moment dauern"
    tar cfz /tmp/ccu.io.${TS}.tar.gz --exclude='*.tar.gz' --exclude=${CCUIO_PATH}/log --exclude=${CCUIO_PATH}/tmp ${CCUIO_PATH} #1>/dev/null
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
      ADDON=ccu.io
      ADDON_PATH=${ADDON}
      LINK="https://github.com/hobbyquaker/${ADDON}/archive/master.zip"
      install ccu.io
      ${NODE_CMD} ${CCUIO_PATH}/ccu.io-server.js restart
      PARAMETER=all
    fi
  fi
  

  #################################
  # CCU.IO installieren
  #################################
  echo "CCUIO = false -a RC = true -a ROOT = true -a ! PARAMETER" 1>&2
  if [ ${CCUIO} = false -a ${RC} = true -a ${ROOT} = true -a -z ${PARAMETER} ]
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
        cp ${START_PATH}/ccu.io.sh /etc/init.d/
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
        grep "\#export\ CCUIP=" ${CCUIO_PATH}/install/settings
        if [ ${?} -eq 0 ]
        then     
          sed -i "s/\#export\ CCUIP=.*/export\ CCUIP=\"${CCUIP}\"/g" ${CCUIO_PATH}/install/settings
        else
          echo "export CCUIP=\"${CCUIP}\"" >> ${CCUIO_PATH}/install/settings
        fi
        echo " "
        echo "Bitte die IP Adresse des Computers eingeben auf dem CCU.IO laufen soll" | tee -a ${LOG}
        read CCUIOIP
        echo "CCUIOIP ${CCUIOIP}" >> ${LOG}
        sed -i "s/.*listenIp.*/        listenIp:\ \"${CCUIOIP}\"\,/g" ${CCUIO_PATH}/settings.js
        grep "\#export\ CCUIOIP=" ${CCUIO_PATH}/install/settings
        if [ ${?} -eq 0 ]
        then     
          sed -i "s/\#export\ CCUIOIP=.*/export\ CCUIOIP=\"${CCUIOIP}\"/g" ${CCUIO_PATH}/install/settings
        else
          echo "export CCUIOIP=\"${CCUIOIP}\"" >> ${CCUIO_PATH}/install/settings
        fi
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
        ${CCUIO_CMD} start
      fi
    fi
  fi
  
    
  echo "PARAMETER -a CCUIO = true" 1>&2
  if [ ! -z ${PARAMETER} -a ${CCUIO} = true ]
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
       chown -R ${CCUIO_USER} ${CCUIO_PATH}/www/${ADDON_PATH}/js/settings.js
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
fi

echo "DEBUG = true" 1>&2
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

echo "RC = false" 1>&2
if [ ${RC} = false ]
then
  exit 1
fi