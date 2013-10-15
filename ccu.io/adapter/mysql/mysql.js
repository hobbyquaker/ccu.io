/**
 * MySQL Adapter for CCU.IO
 *
 * Copyright (c) 10'2013 hobbyquaker http://hobbyquaker.github.io
 *
 * Loggt Events in MySQL Tabelle
 *
 *
 */

var settings = require(__dirname+'/../../settings.js');

if (!settings.adapters.mysql) {
    process.exit();
}

var logger =    require(__dirname+'/../../logger.js'),
    io =        require('socket.io-client'),
    fs =        require('fs'),
    crypto =    require('crypto'),
    mysql =     require('mysql'),
    connection;

if (settings.ioListenPort) {
    var socket = io.connect("127.0.0.1", {
        port: settings.ioListenPort
    });
} else if (settings.ioListenPortSsl) {
    var socket = io.connect("127.0.0.1", {
        port: settings.ioListenPortSsl,
        secure: true,
    });
} else {
    process.exit();
}

var datapoints,
    regaObjects,
    connected;

socket.on('connect', function () {
    logger.info("adapter mysql connected to ccu.io");
});

socket.on('disconnect', function () {
    logger.info("adapter mysql disconnected from ccu.io");
});

socket.on('reload', function () {
    datapoints = undefined;
    regaObjects = undefined;
    loadData();
});

socket.on('event', function (obj) {
    if (!obj || !obj[0]) { return; }
    if (connected) {
        var name = "";
        if (regaObjects) {
            if (regaObjects[obj[0]]) {
                name = regaObjects[obj[0]].Name;
            }
            var sql = "INSERT INTO events (id, name, val, ack, timestamp, lastchange) VALUES('"+obj[0]+"', '"+name+"', '"+obj[1]+"', "+(obj[3]?"true":"false")+", '"+obj[2]+"', '"+obj[4]+"');";
            connection.query(sql, function(err) {
                if (err) {
                    logger.error("adapter mysql INSERT INTO events "+err)
                }
            });
            var sql = "REPLACE INTO datapoints (id, val, ack, timestamp, lastchange) VALUES('"+obj[0]+"', '"+obj[1]+"', "+(obj[3]?"true":"false")+", '"+obj[2]+"', '"+obj[4]+"');";
            connection.query(sql, function(err) {
                if (err) {
                    logger.error("adapter mysql REPLACE INTO datapoints "+err)
                }
            });
        }

    }

});

function loadData() {
    socket.emit('getDatapoints', function(dps) {
        datapoints = dps;
        socket.emit('getObjects', function(objects) {
            logger.info("adapter mysql fetched regaObjects from ccu.io");
            regaObjects = objects;

            try { var savedHash = fs.readFileSync(__dirname+"//objects.hash"); }
            catch (e) { var savedHash = undefined; }
            var hash = crypto.createHash('md5').update(JSON.stringify(objects)).digest("hex");

            fs.writeFile(__dirname+"/objects.hash", hash, function (err) {
                if (err) {
                    logger.error("adapter mysql can't save objects.hash "+err);
                }
            });

            if (savedHash != hash) {
                updateObjects();
                updateDatapoints();
            } else {
                logger.info("adapter mysql database objects are up-to-date");
                updateDatapoints();
            }

            if (!connected) {
                connection = mysql.createConnection({
                    host     : settings.adapters.mysql.settings.host,
                    user     : settings.adapters.mysql.settings.user,
                    password : settings.adapters.mysql.settings.pass,
                    database : settings.adapters.mysql.settings.db
                });

                connection.connect(function(err) {
                    if (err) {
                        logger.error("adapter mysql can't connect to mysql-server "+err);
                    }
                    logger.info("adapter mysql connected to mysql-server on "+settings.adapters.mysql.settings.host);
                    connected = true;

                });
            }

        });
    });

}



function updateObjects() {
    if (!connected) {
        setTimeout(updateObjects, 1000);
        return;
    }
    logger.info("adapter mysql updating regaObjects");

    connection.query("TRUNCATE objects", function(err) {
        if (err) {
            logger.error("adapter mysql TRUNCATE objects "+err)
        }
    });

    connection.query("TRUNCATE refs", function(err) {
        if (err) {
            logger.error("adapter mysql TRUNCATE refs "+err)
        }
    });

    for (var id in regaObjects) {
        var object = regaObjects[id];
        id = parseInt(id, 10);
        var parent =        object.Parent,
            name =          object.Name,
            type =          object.TypeName,
            info,
            hssType =       object.HssType,
            address =       object.Address,
            iface =         object.Interface,
            operations =    object.Operations,
            chnDirection =  object.ChnDirection,
            chnType =       object.ChannelType,
            chnLabel =      object.ChnLabel,
            valueMin =      object.ValueMin,
            valueMax =      object.ValueMax,
            valueType =     object.ValueType,
            valueSubType =  object.ValueSubType,
            valueList =     object.ValueList;

        if (type.match(/^ENUM/)) {
            info = object.EnumInfo;
            for (var i = 0; i < object.Channels.length; i++) {
                var sql = "INSERT INTO refs (enum_id, object_id) VALUES('"+id+"', '"+object.Channels[i]+"');";
                connection.query(sql, function(err) {
                    if (err) {
                        logger.error("adapter mysql REPLACE INTO refs "+err)
                        console.log(err);
                    }
                });
            }
        } else {
            info = object.DPInfo;
        }

        var sql = "REPLACE INTO objects (id, parent, name, type, info, hssType, address, interface, operations, chnDirection, chnType, chnLabel, valueMin, valueMax, valueType, valueSubType, valueList) VALUES ('" +
            (id?id:"") + "', '" +
            (parent?parent:"") + "', '" +
            (name?name:"") + "', '" +
            (type?type:"") + "', '" +
            (info?escapeQuote(info):"") + "', '" +
            (hssType?hssType:"") + "', '" +
            (address?address:"") + "', '" +
            (iface?iface:"") + "', '" +
            (operations?operations:"") + "', '" +
            (chnDirection?chnDirection:"") + "', '" +
            (chnType?chnType:"") + "', '" +
            (chnLabel?chnLabel:"") + "', '" +
            (valueMin?valueMin:"") + "', '" +
            (valueMax?valueMax:"") + "', '" +
            (valueType?valueType:"") + "', '" +
            (valueSubType?valueSubType:"") + "', '" +
            (valueList?valueList:"") + "');";


        connection.query(sql, function(err) {
            if (err) {
                logger.error("adapter mysql REPLACE INTO objects "+err)
                console.log(err);
            }
        });
    }


}


function updateDatapoints() {
    if (!connected) {
        setTimeout(updateDatapoints, 1000);
        return;
    }
    logger.info("adapter mysql updating datapoints");

    connection.query("TRUNCATE datapoints", function(err) {
        if (err) {
            logger.error("adapter mysql TRUNCATE datapoints "+err)
        }
    });

    for (var id in datapoints) {
        var dp = datapoints[id],
            val = escapeQuote(dp[0]),
            ack = (dp[2]?"true":"false"),
            ts = dp[1],
            lc = dp[3];

        var sql = "REPLACE INTO datapoints (id, val, ack, timestamp, lastchange) VALUES('"+id+"', '"+val+"', '"+ack+"', '"+ts+"', '"+lc+"');";
        connection.query(sql, function(err) {
            if (err) {
                logger.error("adapter mysql REPLACE INTO datapoints "+err);
                console.log(err);
            }
        });
    }


}

function escapeQuote(txt) {
    if (typeof txt == "string") {
        return txt.replace(/'/, "\'");
    } else {
        return txt;
    }
}

loadData();