/**
 *   CCU.IO OWFS Adapter - owfs.js
 *
 *   Initial Version : 05. Mar 2014
 *   Current Version : 0.1 Alpha 1
 *   
 *   Change Notes:
 *   - Initial Version 0.2.1 
 *
 *   Authors: 
 *   Ralf Muenk [muenk@getcom.de]
 *   (c) getcom IT Services
 *   Eisbaeeer  [Eisbaeeer@gmail.com]
 *     
 *
 *   This is a part of the iXmaster project started in 2014.
 *
 *   This program is free software; you can redistribute it and/or modify
 *   it under the terms of the GNU General Public License as published by
 *   the Free Software Foundation; either version 3 of the License, or
 *   (at your option) any later version.*   Licence: GNU General Public License.
 *   For more information visit http://www.gnu.org.
 *
**/

var settings = require(__dirname+'/../../settings.js');

if (!settings.adapters.owfs || !settings.adapters.owfs.enabled) {
    process.exit();
}

var adapterSettings = settings.adapters.owfs.settings;

var logger =    require(__dirname+'/../../logger.js'),
    io =        require('socket.io-client'),
    // call node module 'owfs'
    owfs =      require('owfs');
    
var Client = require("owfs").Client,
     host = adapterSettings.IPs._1.ip,
     port = adapterSettings.IPs._1.port;
     
var con = new Client(host, port);         

// create express HTTP server
//var app = require('express')() 
//  , server = require('http').createServer(app), // express HTTP server
//    port = process.env.PORT || '8888'; //use environment variable $PORT as port; if not set default is 8888
  
//server.listen(port);

// Further in your code to get your files passed to the browser...

//app.get('/', function (req, res) {
//    res.sendfile(__dirname + '/index.html');
//});
//app.get('/img/minus-5-32.png', function (req, res) {
//    res.sendfile(__dirname + '/img/minus-5-32.png');
//});
//app.get('/img/plus-5-32.png', function (req, res) {
//    res.sendfile(__dirname + '/img/plus-5-32.png');
//});
//app.get('/img/search-5-32.png', function (req, res) {
//    res.sendfile(__dirname + '/img/search-5-32.png');
//});
//app.get('/owfs-dirlisting.js', function (req, res) {
//    res.sendfile(__dirname + '/owfs-dirlisting.js');
//});
//end express HTTP server



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


socket.on('connect', function () {
    logger.info("adapter owfs connected to ccu.io");
});

socket.on('disconnect', function () {
    logger.info("adapter owfs disconnected from ccu.io");
});

socket.on('event', function (obj) {
    if (!obj || !obj[0]) {
        return;
    }
});

function stop() {
    logger.info("adapter owfs terminating");
    setTimeout(function () {
        process.exit();
    }, 250);
}


process.on('SIGINT', function () {
    stop();
});

process.on('SIGTERM', function () {
    stop();
});

function setObject(id, obj) {
    socket.emit("setObject", id, obj);
}

function owfsServerGetValues (){
         con.read("/"+settings.adapters.owfs.settings.wire._1.id+"/temperature", function(result){
         socket.emit("setState", [settings.adapters.owfs.firstId+2, result,null,true]);
         })
         con.read("/"+settings.adapters.owfs.settings.wire._2.id+"/temperature", function(result){
         socket.emit("setState", [settings.adapters.owfs.firstId+3, result,null,true]);
         })
         con.read("/"+settings.adapters.owfs.settings.wire._3.id+"/temperature", function(result){
         socket.emit("setState", [settings.adapters.owfs.firstId+4, result,null,true]);                  
         })
         con.read("/"+settings.adapters.owfs.settings.wire._4.id+"/temperature", function(result){
         socket.emit("setState", [settings.adapters.owfs.firstId+5, result,null,true]);                  
         })
         con.read("/"+settings.adapters.owfs.settings.wire._5.id+"/temperature", function(result){
         socket.emit("setState", [settings.adapters.owfs.firstId+6, result,null,true]);                  
         })
         con.read("/"+settings.adapters.owfs.settings.wire._6.id+"/temperature", function(result){
         socket.emit("setState", [settings.adapters.owfs.firstId+7, result,null,true]);                  
         })
         con.read("/"+settings.adapters.owfs.settings.wire._7.id+"/temperature", function(result){
         socket.emit("setState", [settings.adapters.owfs.firstId+8, result,null,true]);                  
         })
         con.read("/"+settings.adapters.owfs.settings.wire._8.id+"/temperature", function(result){
         socket.emit("setState", [settings.adapters.owfs.firstId+9, result,null,true]);                  
         })
         con.read("/"+settings.adapters.owfs.settings.wire._9.id+"/temperature", function(result){
         socket.emit("setState", [settings.adapters.owfs.firstId+10, result,null,true]);                  
         })
         con.read("/"+settings.adapters.owfs.settings.wire._10.id+"/temperature", function(result){
         socket.emit("setState", [settings.adapters.owfs.firstId+11, result,null,true]);                  
         })
         con.read("/"+settings.adapters.owfs.settings.wire._11.id+"/temperature", function(result){
         socket.emit("setState", [settings.adapters.owfs.firstId+12, result,null,true]);                  
         })
         con.read("/"+settings.adapters.owfs.settings.wire._12.id+"/temperature", function(result){
         socket.emit("setState", [settings.adapters.owfs.firstId+13, result,null,true]);                  
         })
}

// Create Datapoints in CCU.IO
var dpId = settings.adapters.owfs.firstId;

var sensorDPs = {
    Sensor1:  dpId+2,
    Sensor2:  dpId+3,
    Sensor3:  dpId+4,
    Sensor4:  dpId+5,
    Sensor5:  dpId+6,
    Sensor6:  dpId+7,
    Sensor7:  dpId+8,
    Sensor8:  dpId+9,
    Sensor9:  dpId+10,
    Sensor10:  dpId+11,
    Sensor11:  dpId+12,
    Sensor12:  dpId+13    
};

socket.emit("setObject", dpId, {
    Name: adapterSettings.IPs._1.alias,
    TypeName: "DEVICE",
    HssType: "1WIRE",
    Address: adapterSettings.IPs._1.alias,
    Interface: "CCU.IO",
    Channels: [
        74301
    ],
    _persistent: true
});

socket.emit("setObject", dpId+1, {
    Name: adapterSettings.IPs._1.alias+".SENSORS",
    TypeName: "CHANNEL",
    Address: adapterSettings.IPs._1.alias+".SENSORS",
    HssType: "1WIRE-SENSORS",
    DPs: sensorDPs,
    Parent: settings.adapters.owfs.firstId,
    _persistent: true
});

socket.emit("setObject", dpId+2, {
    "Name": adapterSettings.IPs._1.alias+".SENSORS."+settings.adapters.owfs.settings.wire._1.alias,
    "TypeName": "HSSDP",
    "Operations": 5,
    "ValueType": 4,
    "ValueUnit": "°C",
    "Parent": settings.adapters.owfs.firstId+1,
    _persistent: true
});

socket.emit("setObject", dpId+3, {
    "Name": adapterSettings.IPs._1.alias+".SENSORS."+settings.adapters.owfs.settings.wire._2.alias,
    "TypeName": "HSSDP",
    "Operations": 5,
    "ValueType": 4,
    "ValueUnit": "°C",
    "Parent": settings.adapters.owfs.firstId+1,
    _persistent: true
});

socket.emit("setObject", dpId+4, {
    "Name": adapterSettings.IPs._1.alias+".SENSORS."+settings.adapters.owfs.settings.wire._3.alias,
    "TypeName": "HSSDP",
    "Operations": 5,
    "ValueType": 4,
    "ValueUnit": "°C",
    "Parent": settings.adapters.owfs.firstId+1,
    _persistent: true
});

socket.emit("setObject", dpId+5, {
    "Name": adapterSettings.IPs._1.alias+".SENSORS."+settings.adapters.owfs.settings.wire._4.alias,
    "TypeName": "HSSDP",
    "Operations": 5,
    "ValueType": 4,
    "ValueUnit": "°C",
    "Parent": settings.adapters.owfs.firstId+1,
    _persistent: true
});

socket.emit("setObject", dpId+6, {
    "Name": adapterSettings.IPs._1.alias+".SENSORS."+settings.adapters.owfs.settings.wire._5.alias,
    "TypeName": "HSSDP",
    "Operations": 5,
    "ValueType": 4,
    "ValueUnit": "°C",
    "Parent": settings.adapters.owfs.firstId+1,
    _persistent: true
});

socket.emit("setObject", dpId+7, {
    "Name": adapterSettings.IPs._1.alias+".SENSORS."+settings.adapters.owfs.settings.wire._6.alias,
    "TypeName": "HSSDP",
    "Operations": 5,
    "ValueType": 4,
    "ValueUnit": "°C",
    "Parent": settings.adapters.owfs.firstId+1,
    _persistent: true
});

socket.emit("setObject", dpId+8, {
    "Name": adapterSettings.IPs._1.alias+".SENSORS."+settings.adapters.owfs.settings.wire._7.alias,
    "TypeName": "HSSDP",
    "Operations": 5,
    "ValueType": 4,
    "ValueUnit": "°C",
    "Parent": settings.adapters.owfs.firstId+1,
    _persistent: true
});

socket.emit("setObject", dpId+9, {
    "Name": adapterSettings.IPs._1.alias+".SENSORS."+settings.adapters.owfs.settings.wire._8.alias,
    "TypeName": "HSSDP",
    "Operations": 5,
    "ValueType": 4,
    "ValueUnit": "°C",
    "Parent": settings.adapters.owfs.firstId+1,
    _persistent: true
});

socket.emit("setObject", dpId+10, {
    "Name": adapterSettings.IPs._1.alias+".SENSORS."+settings.adapters.owfs.settings.wire._9.alias,
    "TypeName": "HSSDP",
    "Operations": 5,
    "ValueType": 4,
    "ValueUnit": "°C",
    "Parent": settings.adapters.owfs.firstId+1,
    _persistent: true
});

socket.emit("setObject", dpId+11, {
    "Name": adapterSettings.IPs._1.alias+".SENSORS."+settings.adapters.owfs.settings.wire._10.alias,
    "TypeName": "HSSDP",
    "Operations": 5,
    "ValueType": 4,
    "ValueUnit": "°C",
    "Parent": settings.adapters.owfs.firstId+1,
    _persistent: true
});

socket.emit("setObject", dpId+12, {
    "Name": adapterSettings.IPs._1.alias+".SENSORS."+settings.adapters.owfs.settings.wire._11.alias,
    "TypeName": "HSSDP",
    "Operations": 5,
    "ValueType": 4,
    "ValueUnit": "°C",
    "Parent": settings.adapters.owfs.firstId+1,
    _persistent: true
});

socket.emit("setObject", dpId+13, {
    "Name": adapterSettings.IPs._1.alias+".SENSORS."+settings.adapters.owfs.settings.wire._12.alias,
    "TypeName": "HSSDP",
    "Operations": 5,
    "ValueType": 4,
    "ValueUnit": "°C",
    "Parent": settings.adapters.owfs.firstId+1,
    _persistent: true
});

  logger.info("adapter owfs created datapoints. Starting at: "+dpId);
  
// Interval to read values from owfs-server
setInterval(owfsServerGetValues, settings.adapters.owfs.settings.owserverInterval);

//set var for displaying in datastore
socket.emit("setState", [settings.adapters.owfs.firstId, null,null,true]);
socket.emit("setState", [settings.adapters.owfs.firstId+1, null,null,true]);

