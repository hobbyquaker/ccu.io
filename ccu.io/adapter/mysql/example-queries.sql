-- Geräte- und Kanal-Namen zu einem gegebenen Datenpunkt abfragen
SELECT  datapoint.name AS datapointName,
        device.name AS deviceName,
        channel.name AS channelName
FROM objects AS datapoint
LEFT JOIN objects AS channel ON datapoint.parent = channel.id
LEFT JOIN objects AS device ON channel.parent = device.id
WHERE datapoint.id = 14450

-- Liste der Räume in dem sich ein gegebener Kanal befindet
SELECT rooms.name AS roomName
FROM refs
LEFT JOIN objects AS rooms ON rooms.id = refs.enum_id
WHERE refs.object_id = 14425

-- Liste aller vorhandenen Geräte-Typen und deren Anzahl
SELECT  devices.hssType AS deviceHssType,
        COUNT( devices.id ) AS deviceCount
FROM  objects AS devices
WHERE devices.type = 'DEVICE'
GROUP BY deviceHssType

-- Liste aller Kanäle vom Typ DIMMER oder SWITCH die deren STATE bzw LEVEL Datenpunkt nicht den Wert 0 oder false hat
SELECT  channels.name AS channelName,
        dpvalues.val AS stateOrLevel
FROM objects AS channels
LEFT JOIN objects AS datapoints ON datapoints.parent = channels.id
LEFT JOIN datapoints AS dpvalues ON dpvalues.id = datapoints.id
WHERE   channels.type =  "CHANNEL"
        AND (
          channels.hssType = "SWITCH"
          OR channels.hssType = "DIMMER"
        )
        AND (
          RIGHT( datapoints.name, 6 ) = ".STATE"
          OR RIGHT( datapoints.name, 6 ) = ".LEVEL"
        )
        AND (
          dpvalues.val != 0
          OR dpvalues.val = "true"
        )

