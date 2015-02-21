CCU.IO adapter for the Surveillance Station by Synology
=======================================================

The main product of Synology are the Diskstations (NAS=Network Attached Storage). These aren't only for storage. You
can install apps to the Diskstation, eg. for Audio- and Videostreaming, for Photos and for a Survellance solution.

The purpose of this adapter is to interact with the cams enable and configured in this Surveillance Station.

Features
-----------------------------------------
1. Show the current snapshot of every cam
2. Show the videostream of every cam
3. Start recording of the current stream for all cams simultaneously (not for every cam itself)
4. Disable and enable a cam

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
        <td>The IP adress or hostname of the diskstation</td>
    </tr>
    <tr>
        <td>port</td>
        <td>The HTTP port you listen too (default: 5000)</td>
    </tr>
    <tr>
        <td>secure</td>
        <td>True is you use https otherwise false (please remark that you need to change the port)</td>
    </tr>
    <tr>
        <td>user</td>
        <td>The user you want to use to access the surveillance station (this user needs to be in the Manager role)</td>
    </tr>
    <tr>
        <td>password</td>
        <td>The password for the user</td>
    </tr>
</table>

Datapoints
----------

Because of the dynamic numbers of cams you can configure into the Surveillance Station the datapoints id are dynamic too
and the id of a cam is part of the datapoints name:

Property | Datapoint
-------- | ---------
id | The id is part of the datapoint: `surveillance.camera.[id]`
name | `surveillance.camera.[id].name`
enabled | `surveillance.camera.[id].state` -> true or false
host | `surveillance.camera.[id].host`
status | `surveillance.camera.[id].status` -> see chapter 2.3.4.1 in the WebAPI documentation
recStatus | `surveillance.camera.[id].rec_status` -> see chapter 2.3.4.1 in the WebAPI documentation
snapshot_url | `surveillance.camera.[id].snapshot_url` -> usable url to retrieve the current snapshot (re-usable in a webbrowser)
videostream_url | `surveillance.camera.[id].videostream_url` -> usable url to retrieve the current videostream in mjpeg format (re-usable in a webbrowser)

Comments, question, bugs
----------------------------------------------------
Comments and question you can enter at http://homematic-forum.de/forum/viewforum.php?f=48 or @thorque
Bugs you can enter in the CCU.IO Github project: https://github.com/hobbyquaker/ccu.io


