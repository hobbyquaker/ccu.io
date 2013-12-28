Adapter iCal
=============

Der Adapter iCal für CCU.IO liest Kalender Files im .ics Format von einer URL ein und schreibt Termine, welche in einem definierbaren Zeitraum liegen in eine CCU.IO Variable.
Die Termine werden zeilenweise durch ein <br> Tag voneinander getrennt und können z.B. mit dem DashUI Widget "basic hm_val - String (unescaped)" in DashUI Angezeigt werden.

Es werden 2 Variablen angelegt 

- iCalReadTrigger
- iCalEvents

Die Variable iCalReadTrigger dient zum Triggern des Einlesevorgangs. In den Settings kann eine defaultURL hintelegt werden, von welcher der Kalender eingelesen wird. 
Alternativ kann dem Lesebefehl auch eine URL mitgegeben werden, um z.B. zeitweilig einen anderen Kalender einzulesen.

- zum Einlesen von der defaultURL muss der String "read" in die Variable iCalReadTrigger geschrieben werden.
- zum Einlesen von einer beliebigen URL muss der String "readURL <URL>" in die Variable iCalReadTrigger geschrieben werden.

Das Ergebnis liefert der iCal Adapter in die Variable iCalEvents.

Alternativ kann der Adapter auch automatisch in einem definierbaren Intervall den Kalender abfragen (nur mit der defaultURL). Dazu in den Settings mit der Variablen runEveryMinutes das Abfrageintervall (in Minuten) einstellen.

Das automatische Einlesen kann durch schreiben des Strings "stop" on die Variable iCalReadTrigger gestoppt und mit "start" wieder gestartet werden. 

In den Settings wird durch die Angabe der "preview" Option festgelegt wie viele Tage im voraus Termine mit einbezogen werden, also z.B. durch die Angabe der Zahl "2" werden Termine von heute und morgen angezeigt. Durch Angabe der "1" werden nur Termine vom heutigen Tag angezeigt.

Mit der Option „colorize“ wird der Termin am Tag vor dem Ereignis gelb gefärbt und beim aktuellen Tag rot gefärbt. Die Option debug schreibt mehr Informationen in das CCU.IO LogFile.

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


Known BUGS: zur Zeit werden ganztägige Termine macnhmal nicht angezeigt, nur Termine mit einer Uhrzeit.