CCU.IO adapter for Yamaha AV receiver
=========================================


Features
-----------------------------------------
This adapter connects to the configured Yamaha receiver and starts a socket. The adpater starts listening to this socket
and get information about
- Volume
- Muting
- Now playing for airplay and net radio

After an amount of time the socket connection will be closed by the receiver but the adpater will be re-establish a new
one shortly after connection the closing of the socket.

One additionally feature exists: If you have connected your receiver to an *HomeMatic Binary Switch* you can configure the
*ID* of this switch. The adpater will starts listining to the state of this switch. If the state is going to **OFF**  then the
socket will be closed. Otherwise if the state goes to **ON** a new socket will be established.

This enabled you to completely switch off your receiver (not only stand by) and you doesn't restart the adapter or needs
to polling the receiver until the receiver goes online again.



Settings
--------------

The settings following the standard of CCU.IO. There is a *settings.json* with some configuration items you need to change:

| item | description |
| host | The ip address of your Yamaha AV receiver |
| port | The socket port you listen too (default: 50000) |
| xml_port | The HTTP port you need to communicate and send commands (default: 80) |
| id_for_onlinecheck | This is a little bit special. For this see the Features above. |


Datapoints
----------------------------------------------
There are 3 datapoints defines:

| name | description |
| Yamaha_Volume | Holds the value for the volume in db |
| Yamaha_Mute | *true* if muting is on otherwise *false* |
| Yamaha_Now_Playing | A string containing artist, song and album |


Now Playing
---------------------------------------------------
There are 3 values the **Now Playing** string will be filled with:
- artist
- song
- album

Every value is seperated with a - from the next value. If one of these values is missing there is no placeholder. It is
missing in the resulting string too.

In the case of net radio only the song information is considered.

