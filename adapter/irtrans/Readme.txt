Adapter IRTrans
===============

Der Adapter IRTrans verbindet einen IRTrans LAN IrDB Receiver mit CCU.IO.
In den settings muss die IP Adresse und der Port des IRTrans LAN IrDB Receivers, sowie die Startadresse der folgenden 4 Variablen angegeben werden.
 
IRTransSendCommand
IRTransMode
IRTransReceive
IRTransResult

Im Normalfall wird der IRTrans LAN IrDB Receiver über die mitgelieferte Software parametriert und die Datenbank mit Remotes und Codes gefüllt.

Senden:
———————

Zum Senden eines IR Befehls wird in die Variable IRTransSendCommand ein String mit folgendem Inhalt geschrieben: „remote,command“ z.B. „sat,chup“. Dazu muss in der DB des IRTrans LAN Receivers die Fernbedienung und der Befehl hinterlegt sein.

Alle Ergebnisse (Quittungen oder Fehler) des IRTrans LAN werden in der Variable IRTransResult abgelegt.

Empfangen:
———————————

Sobald der IRTrans LAN IrDB Receiver einen bekannten IRCode (in seiner DB) empfangen hat, wird in der Variablen IRTransReceive der empfangende Befehl abgelegt (remote,command).

Anlernen:
——————————

Der IRTrans Adapter bietet auch die Möglichkeit des Anlernens von Codes.
Dazu muss zuerst die Variable IRTransMode mit dem String „learnIR“ gesetzt werden.
Daraufhin wartet der IRTrans LAN Receiver 20 Sekunden lang auf das Empfangen eines IR Codes. Bei Erfolg wird der HEX Code in der Variablen IRTransReceive abgelegt.

Senden des HEX Codes:
——————————————————————

Zum senden eines gelernten HEX Codes wird die Variable IRTransSendRemote mit dem String „sendIR“ beschrieben. Sobald der HEX Code in die Variable IRTransSendCommand geschrieben wird, beginnt der Sendevorgang.







