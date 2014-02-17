CCU.IO adapter for Yamaha AV receiver
=========================================

The purpose of this adapter is to enable you to control the volume (and mute) level in CCU.IO. Additionally you can
show the music that is now playing.

Features
-----------------------------------------
1. Volume control: You can control the volume eg. with a DashUI slider. Of course you can use your remote control or
Yamaha app too. In this case the CCU.IO variable will be refreshed.

2. Muting: You can switch muting on or off. As for the volume feature you can use this with a DashUI widget or with your
remote control or Yamaha app. The status will be synced with the CCU.IO variable.

3. Now Playing: If you are in the mode AIRPLAY or NET_RADIO the adapter retrieves the now_playing information from the
receiver. In the other modus only the name of the modus will be returned, eg. HDMI1, HDMI2 and so on. You are able to
map this names to a better one: HDMI1 = TV, HDMI2 = Cinema ...

Configuration
------------------------------------------
There is a settings.json with all configuration options:

<table>
    <tr>
        <th>item</th>
        <th>description</th>
    </tr>
    <tr>
        <td>host</td>
        <td>The ip address of your Yamaha AV receiver</td>
    </tr>
    <tr>
        <td>port</td>
        <td>The HTTP port you listen too (default: 80)</td>
    </tr>
    <tr>
        <td>id_for_onlinecheck</td>
        <td>An id of an HomeMatic device or variable. They must have a state and return ON or OFF, so the adapter reacts
        on the state change to re-establish the HTTP connection.</td>
    </tr>
    <tr>
        <td>zone</td>
        <td>The zone of your Yamaha AV receiver you want to control (default: Main_Zone)</td>
    </tr>
    <tr>
        <td>input_mapping</td>
        <td>A simple key-value map with mappings between the modes of the receiver to nicer names</td>
    </tr>
</table>

Input Mappings
----------------------------------------
The now-playing feature is limited to the modes of NET_RADIO and AIRPLAY. In all other modes the name of the mode is
returned. Commonly this names a the technical names of the input, eg. HDMI1-4.
You are able to manage nice names with a simple mapping:
<pre><code>
"input_mapping":
    {
        "HDMI1": "Spielen",
        "HDMI2": "Fernsehen",
        "HDMI3": "Kino",
        "HDMI4": "HDMI4",
        "NET RADIO": "Radio",
        "AIRPLAY": "Airplay"
    }
</code></pre>


Detection of a not responding receiver
----------------------------------------------------
If you receiver not online (fully disconnected from power) then the adapter tries to connect until the reciever is
online again. But this produces much of network traffic without need.
If you are often diconnecting your receiver from power you can use a HM binary switch. You can configure the id from
the state property of such a switch (id_for_onlinecheck in settings.json). The adpater listen for events of such a
device and i the switch goes to Off all listeners will be stopped until teh switch is On again. So you avoid much of
request against a not resonding receiver.
This works wich every logic variable too.


Now Playing
---------------------------------------------------
There are 3 values the **Now Playing** string will be filled with:
- artist
- song
- album

Every value is seperated with a - from the next value. If one of these values is missing there is no placeholder. It is
missing in the resulting string too.
In the case of net radio only the song information is considered.

Comments, question, bugs
----------------------------------------------------
Comments and question you can enter at http://homematic-forum.de/forum/viewforum.php?f=48 or @thorque
Bugs you can enter in the CCU.IO Github project: https://github.com/hobbyquaker/ccu.io


