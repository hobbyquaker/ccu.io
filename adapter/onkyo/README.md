Onkyo adapter
======

* Aktuelle Version: 0.9
* Anzahl verwendeter Variablen in ccu.io: 50

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
* Die nächsten Variablen sind Rückmeldungen vom Onkyo (Volume, Mute, ...), 
  welche vom Adapter gefüllt werden. 
* Die Variablen (ab Startvariable +34 bis +43) sind NET Variable. Diese werden 
  beim Netzwerkbetrieb (smb, HomeMedia, etc.) gefüllt. Eine Anzeige zum 
  Navigieren bieten die letzten 3 Variablen (Startvariable +44 bis +46 zeigt die aktuelle 
  Position im Netzwerkbetrieb, die Startvariable +44 zeigt die Position im Menü und
  die +45 die aktuelle Anzahl / Gesamtanzahl des Verzeichnisses).
  
### Konfiguration über HTML bzw. settings.js unter adapter:
enabled:  true|false
IP:       xxx.xxx.xxx.xxx (Onkyo Reveiver)
Port:     xxxxx  (Onkyo Port)
FirstId:  xxxxxx  (Erste ID) 
Debug:    true|false
  
### Variablenbeschreibung
Es gibt 3 Arten von Variablen. 
* Feedback Variablen
Alle Variable mit der Kennzeichnung "xxxx_fb" sind Feedback Variable. Diese 
Variablen beeinhalten das direkte Feedback des Onkyo Receiver.
* Set Variablen
Diese Variablen "xxxx_set" senden beim Setzen den Befehl an den Onkyo Receiver. Dabei wird, 
wenn nötig, der Wert von Dezimal in einen Hexadezimalen Wert gewandelt, damit der
Onkyo Receiver den Befehl versteht. Die Variable wird nach dem Senden des Befehls 
wieder geleert.
* Command Variable
Diese Variable sendet direkt den gesetzten Wert und wird anschließend wieder geleert.
Hier können direkt die ISCP Befehle gestetzt werden. Beispiel: Power On Zone 1 "PWR01"
oder Power Off Zone 1 "PWR00".


### Verfügbare Variablen
VARIABLE      ISCP  Read/Write      Beispiel    Bezeichnung
firstId       ---   Array           PWR01       "Onkyo_Command"                
firstId+1 	  NAT   read-only       --          "Onkyo_NET/USB_Artist_Name_Info"
firstId+2     NTM   read-only       --          "Onkyo_NET/USB_Time_Info"
firstId+3     NAL   read-only       --          "Onkyo_NET/USB_Album_Name_Info"
firstId+4     NTR   read-only       --          "Onkyo_NET/USB_Track_Info"
firstId+5     NTI   read-only       --          "Onkyo_NET/USB_Track_Info"
firstId+6     MVL   read-only       --          "Onkyo_Volume_Zone1_fb"
firstId+7     MVL   0-100 decimal   85          "Onkyo_Volume_Zone1_set"
firstId+8     ZVL   read-only       --          "Onkyo_Volume_Zone2_fb"
firstId+9     ZVL   0-100 decimal   34          "Onkyo_Volume_Zone2_set"
firstId+10    TUN   read-only       --          "Onkyo_Tuning_Zone1_fb"
firstId+11    TUN   nnn.nn          104.40      "Onkyo_Tuning_Zone1_set"        
firstId+12    TUZ   read-only       --          "Onkyo_Tuning_Zone2_fb"
firstId+13    TUZ   nnn.nn          097.40      "Onkyo_Tuning_Zone2_set"        
firstId+14    NPR   read-only       --          "Onkyo_Internet_Radio_Preset_Zone1_fb"
firstId+15    NPR   1-40 decimal    12          "Onkyo_Internet_Radio_Preset_Zone1_set"
firstId+16    NPZ   read-only       --          "Onkyo_Internet_Radio_Preset_Zone2_fb"
firstId+17    NPZ   1-40 decimal    08          "Onkyo_Internet_Radio_Preset_Zone2_set"
firstId+18    SLI   read-only       --          "Onkyo_Input_Select_Zone1_fb"
firstId+19    SLI   00-FF hex       2B          "Onkyo_Input_Select_Zone1_set"
firstId+20    SLZ   read-only       --          "Onkyo_Input_Select_Zone2_fb"
firstId+21    SLZ   00-FF hex       2D          "Onkyo_Input_Select_Zone2_set"
firstId+22    AMT   read-only       --          "Onkyo_Audio_Mute_Zone1_fb"
firstId+23    AMT   boolean         1           "Onkyo_Audio_Mute_Zone1_set"
firstId+24    ZMT   read-only       --          "Onkyo_Audio_Mute_Zone2_fb"
firstId+25    ZMT   boolean         0           "Onkyo_Audio_Mute_Zone2_set"
firstId+26    PRS   read-only       --          "Onkyo_Tuner_Preset_Zone1_fb"
firstId+27    PRS   1-30 decimal    21          "Onkyo_Tuner_Preset_Zone1_set"
firstId+28    PRZ   read-only       --          "Onkyo_Tuner_Preset_Zone2_fb"
firstId+29    PRZ   1-30 decimal    18          "Onkyo_Tuner_Preset_Zone2_set"
firstId+30    PWR   read-only       --          "Onkyo_Power_Zone1_fb"
firstId+31    PWR   boolean         1           "Onkyo_Power_Zone1_set"
firstId+32    ZPW   read-only       --          "Onkyo_Power_Zone2_fb"
firstId+33    ZPW   boolean         0           "Onkyo_Power_Zone2_set"
firstId+34    NLS   read-only       --          "Onkyo_NET-MENU-0"
firstId+35    NLS   read-only       --          "Onkyo_NET-MENU-1"
firstId+36    NLS   read-only       --          "Onkyo_NET-MENU-2"
firstId+37    NLS   read-only       --          "Onkyo_NET-MENU-3"
firstId+38    NLS   read-only       --          "Onkyo_NET-MENU-4"
firstId+39    NLS   read-only       --          "Onkyo_NET-MENU-5"
firstId+40    NLS   read-only       --          "Onkyo_NET-MENU-6"
firstId+41    NLS   read-only       --          "Onkyo_NET-MENU-7"
firstId+42    NLS   read-only       --          "Onkyo_NET-MENU-8"
firstId+43    NLS   read-only       --          "Onkyo_NET-MENU-9"
firstId+44    NLT   read-only       --          "Onkyo_NET_NAVIGATION"
firstId+45    NLT   read-only       --          "Onkyo_NET_POSITION"
firstId+46    NLT   read-only       --          "Onkyo_NET_POSITION_SUMM"
firstId+47    LMD   read-only       --          "Onkyo_Listening_Mode"
firstId+48    IFA   read-only       --          "Onkyo_Audio_Information"
firstId+49    IFV   read-only       --          "Onkyo_Video_Information"
  

## Todo/Roadmap
* Requests to Eisbaeeer@gmail.com

## Changelog

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
