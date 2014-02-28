Adapter iCal
=============

Der Adapter iCal für CCU.IO liest Kalender Files im .ics Format von einer URL ein und schreibt Termine, welche in einem definierbaren Zeitraum liegen in eine CCU.IO Variable.
Die Termine werden zeilenweise durch ein <br> Tag voneinander getrennt und können z.B. mit dem DashUI Widget "basic hm_val - String (unescaped)" in DashUI Angezeigt werden.

Es werden 2 Variablen angelegt 

- iCalReadTrigger
- iCalEvents

Die Variable iCalReadTrigger dient zum Triggern des Einlesevorgangs. 
In den Settings können mehrere URLs hinterlegt werden, von welchen der Kalender eingelesen wird.  Die Kalender werden dann nacheinander eingelesen und das Ergebnis zusammengefasst.
Alternativ kann dem Lesebefehl auch eine URL mitgegeben werden, um z.B. zeitweilig einen anderen Kalender einzulesen.

- zum Einlesen von den defaultURLs muss der String "read" in die Variable iCalReadTrigger geschrieben werden.
- zum Einlesen von einer beliebigen URL muss der String "readURL <URL>" in die Variable iCalReadTrigger geschrieben werden.

Das Ergebnis liefert der iCal Adapter in die Variable iCalEvents.

Alternativ kann der Adapter auch automatisch in einem definierbaren Intervall die Kalender abfragen (nur mit der defaultURL). Dazu in den Settings mit der Variablen runEveryMinutes das Abfrageintervall (in Minuten) einstellen.

Das automatische Einlesen kann durch schreiben des Strings "stop" on die Variable iCalReadTrigger gestoppt und mit "start" wieder gestartet werden. 

Bedeutung der Optionen im Konfigfile:

- "firstID": 80100 legt fest ab welcher ID die Datenpunkte des iCal Adapters starten
- "preview" : 7 heisst, dass Termine 7 Tage im voraus angezeigt werden
- "runEveryMinutes": 30 bedeutet dass der Adapter automatisch alle 30min den Kalender neu einliesst. Bei 0 wird nicht automatisch eingelesen
- "colorize": true Termine am heutigen Tag werden rot gefärbt, Termine am morgigen Tag orange, diese Option überstimmt die Option everyCalOneColor
- "debug": false bei true werden werden erweiterte Ausgaben ins CCU.IO Log geschrieben
- "defColor": "white" legt die Standardfarbe der Kalendereinträge fest 
- "fulltime": " " legt fest durch welchen String bei ganztägigen Terminen die Uhrzeit 00:00 ersetzt wird. Bei Leerzeichen (zwischen den Hochkommas) wird dir Uhrzeit bei ganztägigen Terminen weggelassen
- "replaceDates": true Bei true wird bei heutigen Terminen das heutige Datum durch den String todayString ersetzt (z.B. "Heute"). Bei morgigen Terminen durch den String tomorrowString
- "everyCalOneColor": " false Bei true wird bei mehreren Kalendern jeder Kalender in einer festzulegenden Farbe eingefärbt. Ist die Option colorize gesetzt, funktioniert dies nicht!
- "Calendar1": {
	"calURL": "http://11111.ics", URL des Kalenders
	"calColor": "white" Farbe des Kalenders, wenn die Option "everyCalOneColor" gesetzt ist
   } es können beliebig viele Kalender eingetragen werden. Im Standard Konfigfile sind 2 Kalender eingetragen.
- "Events": {
                "Urlaub": {
                    "enabled": true, # legt fest, ob das Event bearbeitet wird
                    "display": false # legt fest, ob das Event auch in dem iCalEvents angezeigt wird, oder nur ausgewertet wird
                }
            } Durch setzen eines Events (in diesem Beispiel „Urlaub“), werden die Kalender nach dem String „Urlaub“ durchsucht. Sollte ein Termin am heutigen Tage (ganztägige Termine) oder zur aktuellen Uhrzeit mit dem Stichwort „Urlaub“ in einem Kalender stehen, so wird automatisch eine Variable mit dem Namen Urlaub auf True gesetzt. Ist der Termin vorbei, wird die Variable wieder auf false gesetzt. Die Variablen werden automatisch ab der Adresse 80110 angelegt. Achtung ! Es wird nach einem Substring gesucht, d.h. ein Eintrag im Kalender „Urlaub“ wird genauso erkannt wie ein Eintrag „Urlaub Eltern“. Dies ist beim festlegen der Ereignisse zu berücksichtigen. 

Durch Anpassen der dashui-user.css können die Styles von heutigen (Standard rot) und morgigen Terminen (Standard Orange) festegelegt werden:
iCalWarn (Zeilenanfang Kalendereintrag heute)
iCalPreWarn (Zeilenanfang Kalendereintrag morgen)
iCalNormal (Zeilenende von heute)
iCalNormal2 (Zeilenende von morgen)


Kalender:
=========

Apple iCloud:

Apple iCloud Kalender können angezeigt werden, wenn sie vorher freigegeben werden. Am besten einen eigenen Kalender für die Homematic anlegen, da der Kalender fuer alle freigegeben wird.

Dazu mit der rechten Maustaste auf dem Kalender in der Kalender App klicken und Freigabeeinstellungen auswählen.
Jetzt einen Haken bei "Öffentlicher Kalender" setzen und die angezeigte URL kopieren.
WICHTIG: die Url beginnt mit webcal://p0X-cale.....

"webcal" muss durch "http" ersetzt werden. Diese URL dann entweder in den Settings bei defaultURL eintragen, oder sie bei "read URL" angeben, also z.B. "readURL http://p-03-calendarws.icloud.com/xxxxxxxxx"


Google Kalender:

Zum Einbinden eines Google Kalenders muss die Kalendereinstellung des Google Kalenders aufgerufen werden (mit der Maus auf "runter Pfeil" neben dem Kalender klicken). Die URL des Kalenders bekommt man durch klicken auf das "ICAL" Symbol neben dem Feld "Privatadresse".
Diese URL dann entweder in den Settings bei defaultURL eintragen, oder sie bei "read URL" angeben, also z.B. "readURL https://www.google.com/calendar/ical/xxxxxxxx/basic.ics".


Known BUGS: Probleme mit gleichen UUIDs von iCal Einträgen (bedingt durch Bibliothek); sich wiederholende Termine, in welchen einzelne Termine ausgenommen werden funktionieren nicht. Die Bibliothek verarbeitet keine EXDATES.

