Onkyo adapter
======

* Aktuelle Version: 0.9.4
* Anzahl verwendeter Variablen in ccu.io: 40

getestet mit Onkyo TX-NR626; TX-NR515 

## Dokumentation

* Dieser Adapter ermöglicht die Anbindung eines Onkyo Reveivers an ccu.io
* Die erste Variable kann als Sendevariable zum Onkyo verwendet werden. Die Variable 
  wird als array verarbeitet. Wird dort z.B. ein "MVLQSTN" gesetzt, wird der 
  Befehl "Abfrage Master Volume" an den Onkyo gesendet. Anschließend wird die 
  Variable wieder geleert. Durch die Verarbeitung als Array können dort auch 
  mehrere Befehle durch "komma" getrennt verarbeitet werden. Der Onkyo Adapter sorgt 
  im Hintergrund automatisch für das richtige Timing.
  Beispiel:
  SLI29,NTCPLAY ==> spielt das erste Lied vom "Front USB Eingang"
  SLI24,TUNDIRECT,TUN1,TUN0,TUN1,TUN8,TUN0 ==> setzt den Onkyo auf Tuner mode 
  und setzt die Frequenz "101.80"
  Hierdurch ist es nun auch möglich, eigene Initialisierungen durchzuführen. Z.B. 
  zyklische Abfrage von Werten. Oder Abfrage beim Starten von CCU.IO.
* Die nächsten Variablen werden zum setzten von Befehlen und für Rückmeldungen 
  vom Onkyo verwendet. Beispiel (Volume, Mute, ...) diese werden vom Adapter gefüllt und
  sind ECHTE Rückmeldungen. 
* Die Variablen (ab Startvariable +20 bis +29) sind NET Variable. Diese werden 
  beim Netzwerkbetrieb (smb, HomeMedia, etc.) gefüllt. Eine Anzeige zum 
  Navigieren bieten die letzten 3 Variablen
  
### Konfiguration über HTML bzw. settings.js unter adapter:
enabled:  true|false
IP:       xxx.xxx.xxx.xxx (Onkyo Reveiver)
Port:     xxxxx  (Onkyo Port)
FirstId:  xxxxxx  (Erste ID) 
Debug:    true|false
  

### Verfügbare Variablen
|VARIABLE      |ISCP  |Read/Write      |Beispiel |Bezeichnung                           |
|--------------|:----:|:--------------:|:-------:|-------------------------------------:|
|firstId       |---   |Array           |PWR01    |"Onkyo_Command"                       |                
|firstId+1 	   |NAT   |read-only       |--       |"Onkyo_NET/USB_Artist_Name_Info"      |
|firstId+2     |NTM   |read-only       |--       |"Onkyo_NET/USB_Time_Info"             |
|firstId+3     |NAL   |read-only       |--       |"Onkyo_NET/USB_Album_Name_Info"       |
|firstId+4     |NTR   |read-only       |--       |"Onkyo_NET/USB_Track_Info"            |
|firstId+5     |NTI   |read-only       |--       |"Onkyo_NET/USB_Track_Info"            |
|firstId+6     |MVL   |0-100 decimal   |47       |"Onkyo_Volume_Zone1"                  |
|firstId+7     |ZVL   |0-100 decimal   |34       |"Onkyo_Volume_Zone2"                  |
|firstId+8     |TUN   |nnn.nn          |104.40   |"Onkyo_Tuning_Zone1"                  |
|firstId+9     |TUZ   |nnn.nn          |097.40   |"Onkyo_Tuning_Zone2"                  |
|firstId+10    |NPR   |1-40 decimal    |12       |"Onkyo_Internet_Radio_Preset_Zone1"   |
|firstId+11    |NPZ   |1-40 decimal    |08       |"Onkyo_Internet_Radio_Preset_Zone2"   |
|firstId+12    |SLI   |00-FF hex       |2B       |"Onkyo_Input_Select_Zone1"            |
|firstId+13    |SLZ   |00-FF hex       |2D       |"Onkyo_Input_Select_Zone2"            |
|firstId+14    |AMT   |boolean         |1        |"Onkyo_Audio_Mute_Zone1"              |
|firstId+15    |ZMT   |boolean         |0        |"Onkyo_Audio_Mute_Zone2"              |
|firstId+16    |PRS   |1-30 decimal    |21       |"Onkyo_Tuner_Preset_Zone1"            |
|firstId+17    |PRZ   |1-30 decimal    |18       |"Onkyo_Tuner_Preset_Zone2"            |
|firstId+18    |PWR   |boolean         |true     |"Onkyo_Power_Zone1"                   |
|firstId+19    |ZPW   |boolean         |false    |"Onkyo_Power_Zone2"                   |
|firstId+20    |NLS   |read-only       |--       |"Onkyo_NET-MENU-0"                    |
|firstId+21    |NLS   |read-only       |--       |"Onkyo_NET-MENU-1"                    |
|firstId+22    |NLS   |read-only       |--       |"Onkyo_NET-MENU-2"                    |
|firstId+23    |NLS   |read-only       |--       |"Onkyo_NET-MENU-3"                    |
|firstId+24    |NLS   |read-only       |--       |"Onkyo_NET-MENU-4"                    |
|firstId+25    |NLS   |read-only       |--       |"Onkyo_NET-MENU-5"                    |
|firstId+26    |NLS   |read-only       |--       |"Onkyo_NET-MENU-6"                    |
|firstId+27    |NLS   |read-only       |--       |"Onkyo_NET-MENU-7"                    |
|firstId+28    |NLS   |read-only       |--       |"Onkyo_NET-MENU-8"                    |
|firstId+29    |NLS   |read-only       |--       |"Onkyo_NET-MENU-9"                    |
|firstId+30    |NLT   |read-only       |--       |"Onkyo_NET_NAVIGATION"                |
|firstId+31    |NLT   |read-only       |--       |"Onkyo_NET_POSITION"                  |
|firstId+32    |NLT   |read-only       |--       |"Onkyo_NET_POSITION_SUMM"             |
|firstId+33    |LMD   |read-only       |--       |"Onkyo_Listening_Mode"                |
|firstId+34    |IFA   |read-only       |--       |"Onkyo_Audio_Information"             |
|firstId+35    |IFV   |read-only       |--       |"Onkyo_Video_Information"             |
|firstId+36    |NST   |read-only       |--       |"Onkyo_NET_Play_Status"               |
|firstId+37    |NST   |read-only       |--       |"Onkyo_NET_Repeat_Status"             |
|firstId+38    |NST   |read-only       |--       |"Onkyo_NET_Shuffle_Status"            |
|firstId+39    |---   |read-only       |--       |"Onkyo_Connect_Status"                |
                                               
## Todo/Roadmap
* Requests to Eisbaeeer@gmail.com

## Changelog

### 0.9.4
* Major changes in variable structur (combining set and feedback vars in front
  of compatibility with Dashui and CCU.IO) - if we set a var, we don´t set "ACK" to true, if we 
  get a feedback of Receiver, we set "ACK" to true. In this case it is possible to use one button
  for e.g. ON|OFF
* Small bugfixes. Delete characters like CR, LF in string vars. Issues - It was not possible to 
  use the var in DashUI for select-list. E.g. SLI doesn´t works.
* Default init of Mute and Master Volume and Input by changing the state of PWR and ZPW. 

### 0.9.3
* Added var +53 (Onkyo connect status)
* Added function reconnect onkyo socket

### 0.9.2
* Bugfix NET Navigation (cursor position in menu). Var +44 shows now the correct position in NET-MENU (1-10)
* Added vars +23,+25,+31,+33 (possibility of "true|false")
* INFO: var +14 & var +16 dosen´t work (not supported by Onkyo)
* Added vars "NST" - NET/USB Play/Repeat/Shuffle Status" (3 more vars) 

### 0.9.1
* Small bugfix (setState)
* Remove function erase set var

### 0.9
* Added Array to the first Id.

### 0.8
* Added variables and changing order of vars.
* Added functions to set commands directly. 
* Added config in html mode

### 0.7
* Debug mode in settings.json added
* Variable +33 (Listening Mode) added
* Variable +34 (Audio Information) added
* Variable +35 (Video Information) added

### 0.6.3
* Bug in "Navigation bei Netzwerk Modus"

### 0.6.2
* Navigation erweitert (Einzelposition VAL31, Summe VAL32)

### 0.6.1
* Small bugfixes
* Navigation im Netzwerkmodus hinzugefügt

### 0.6
* First launch with basic functions

## Lizenz

Copyright (c) 2014 Eisbaeeer [http://www.weimars.net](http://www.weimars.net)

Lizenz: [CC BY-NC 3.0](http://creativecommons.org/licenses/by-nc/3.0/de/)

Sie dürfen das Werk bzw. den Inhalt vervielfältigen, verbreiten und öffentlich zugänglich machen,
Abwandlungen und Bearbeitungen des Werkes bzw. Inhaltes anfertigen zu den folgenden Bedingungen:

  * **Namensnennung** - Sie müssen den Namen des Autors/Rechteinhabers in der von ihm festgelegten Weise nennen.
  * **Keine kommerzielle Nutzung** - Dieses Werk bzw. dieser Inhalt darf nicht für kommerzielle Zwecke verwendet werden.

Wobei gilt:
Verzichtserklärung - Jede der vorgenannten Bedingungen kann aufgehoben werden, sofern Sie die ausdrückliche Einwilligung des Rechteinhabers dazu erhalten.
Die Veröffentlichung dieser Software erfolgt in der Hoffnung, daß sie Ihnen von Nutzen sein wird, aber OHNE IRGENDEINE GARANTIE, sogar ohne die implizite Garantie der MARKTREIFE oder der VERWENDBARKEIT FÜR EINEN BESTIMMTEN ZWECK. Die Nutzung dieser Software erfolgt auf eigenes Risiko!
=====
This project needs ccu.io
This project allow connection to Onkyo network enabled receiver with ISCP protocol
