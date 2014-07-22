/**
 *      ROOMBA RooWifi Adapter zum Auslesen der Sensordaten
 *      by Pix 5.7.2014
 *      Version 0.31
 *      weitestgehend basierend auf dem
 *         CCU.IO OpenWeatherMap Adapter
 *         02'2014 BasGo
 *         mail: basgo@gmx.de
 *         Version 0.2
 *      
 *      http:// Roomba_Wifi_Remote_IP /roomba.cgi?button=CLEAN
 *      http:// Roomba_Wifi_Remote_IP /roomba.cgi?button=SPOT
 *      http:// Roomba_Wifi_Remote_IP /roomba.cgi?button=DOCK
 *      evtl. 
 *      http://roomba/roomba.cgi?button=DOCK
 */
var settings = require(__dirname + '/../../settings.js');

if (!settings.adapters.roomba || !settings.adapters.roomba.enabled) {
    process.exit();
}

var roombaSettings = settings.adapters.roomba.settings;

var pollingInterval = roombaSettings.period || 5;

var reqOptions = {
    host: roombaSettings.roombaIP,
    // host: '192.168.178.42',   
    // host: 'roomba',            
    port: 80,
    path: '/roomba.json',
    method: 'GET'
};

var logger = require(__dirname + '/../../logger.js'),
    io     = require('socket.io-client'),
    http   = require('http');

	
if (settings.ioListenPort) {
    var socket = io.connect('127.0.0.1', {
        port: settings.ioListenPort
    });
} else if (settings.ioListenPortSsl) {
    var socket = io.connect('127.0.0.1', {
        port: settings.ioListenPortSsl,
        secure: true
    });
} else {
    process.exit();
}

function logDebug(message) {
    if (roombaSettings.debugEnabled) {
        logger.info('adapter roomba   ' + message);
    }
}

function logInfo(message) {
    logger.info('adapter roomba   ' + message);
}

function logWarning(message) {
    logger.warn('adapter roomba   ' + message);
}

socket.on('connect', function () {
    logDebug('connected to ccu.io');
});

socket.on('disconnect', function () {
    logDebug('disconnected from ccu.io');
});

function stop() {
    logDebug('terminating');
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


function analyzeResult(result) {
    var curBumps         = result['response']['r0']['value'];
    var curWall          = result['response']['r1']['value'];
    var curCliffL        = result['response']['r2']['value'];
    var curCliffFL       = result['response']['r3']['value'];
    var curCliffFR       = result['response']['r4']['value'];
    var curCliffR        = result['response']['r5']['value'];
    var curVirtualWall   = result['response']['r6']['value'];
    var curMoverC        = result['response']['r7']['value'];
    var curDirtL         = result['response']['r8']['value'];
    var curDirtR         = result['response']['r9']['value'];
    var curRemote        = result['response']['r10']['value'];
    var curButtons       = result['response']['r11']['value'];
    var curDistance      = result['response']['r12']['value'];
    var curAngle         = result['response']['r13']['value'];
    var curChargingState = result['response']['r14']['value'];
    var curVoltage       = result['response']['r15']['value'];
    var curCurrent       = result['response']['r16']['value'];
    var curTemp          = result['response']['r17']['value'];
    var curCharge        = result['response']['r18']['value'];
    var curCapacity      = result['response']['r19']['value'];

    logInfo('received data (Temperature: '+curTemp+'°C, Charge: '+curCharge+'mAh, Capacity: '+curCapacity+'mAh)');

    socket.emit('setState', [roombaSettings.firstId + 2, curBumps]);
    socket.emit('setState', [roombaSettings.firstId + 3, curWall]);
    socket.emit('setState', [roombaSettings.firstId + 4, curCliffL]);
    socket.emit('setState', [roombaSettings.firstId + 5, curCliffFL]);
    socket.emit('setState', [roombaSettings.firstId + 6, curCliffFR]);
    socket.emit('setState', [roombaSettings.firstId + 7, curCliffR]);
    socket.emit('setState', [roombaSettings.firstId + 8, curVirtualWall]);
    socket.emit('setState', [roombaSettings.firstId + 9, curMoverC]);
    socket.emit('setState', [roombaSettings.firstId + 10, curDirtL]);
    socket.emit('setState', [roombaSettings.firstId + 11, curDirtR]);
    socket.emit('setState', [roombaSettings.firstId + 12, curRemote]);
    socket.emit('setState', [roombaSettings.firstId + 13, curButtons]);
    socket.emit('setState', [roombaSettings.firstId + 14, curDistance]);
    socket.emit('setState', [roombaSettings.firstId + 15, curAngle]);
    socket.emit('setState', [roombaSettings.firstId + 16, curChargingState]);
    socket.emit('setState', [roombaSettings.firstId + 17, curVoltage]);
    socket.emit('setState', [roombaSettings.firstId + 18, curCurrent]);
    socket.emit('setState', [roombaSettings.firstId + 19, curTemp]);
    socket.emit('setState', [roombaSettings.firstId + 20, curCharge]);
    socket.emit('setState', [roombaSettings.firstId + 21, curCapacity]);

}

function getValues() {
    logDebug('Checking values ...');
    var req = http.get(reqOptions, function(res) {
    var pageData = '';
    res.on('data', function (chunk) {
        pageData += chunk;
    });
    res.on('end', function () {
        var result = JSON.parse(pageData);
        analyzeResult(result);
    });
    });

    req.on('error', function(e) {
    logWarning('received error: '+e.message);
    });

    req.end();
}

function roombaInit() {

    socket.emit('setObject', roombaSettings.firstId, {
        Name: 'Roomba RooWifi',
        TypeName: 'DEVICE',
        HssType: 'roomba',
        Address: 'Roomba',
        Interface: 'CCU.IO',
        Channels: [
            roombaSettings.firstId + 1,
            roombaSettings.firstId + 2
        ],
        _persistent: true
    });

    socket.emit('setObject', roombaSettings.firstId + 1, {
        Name: 'Roomba',
        TypeName: 'CHANNEL',
        Address: 'Roomba Sensor Daten',
        HssType: 'RooWifi-DATA',
        DPs: {
            BUMPS: roombaSettings.firstId + 2,
            WALL: roombaSettings.firstId + 3,
            CLIFF_LEFT: roombaSettings.firstId + 4,
            CLIFF_FRONTLEFT: roombaSettings.firstId + 5,
            CLIFF_FRONTRIGHT: roombaSettings.firstId + 6,
            CLIFF_RIGHT: roombaSettings.firstId + 7,
            VIRTUAL_WALL: roombaSettings.firstId + 8,
            MOTOR_OVERCURRENTS: roombaSettings.firstId + 9,
            DIRT_LEFT: roombaSettings.firstId + 10,
            DIRT_RIGHT: roombaSettings.firstId + 11,
            REMOTE: roombaSettings.firstId + 12,
            BUTTONS: roombaSettings.firstId + 13,
            DISTANCE: roombaSettings.firstId + 14,
            ANGLE: roombaSettings.firstId + 15,
            CHARGING_STATE: roombaSettings.firstId + 16,
            VOLTAGE: roombaSettings.firstId + 17,
            CURRENT: roombaSettings.firstId + 18,
            TEMPERATURE: roombaSettings.firstId + 19,
            CHARGE: roombaSettings.firstId + 20,
            CAPACITY: roombaSettings.firstId + 21
        },
        'Parent': roombaSettings.firstId,
        _persistent: true
    });

    socket.emit('setObject', roombaSettings.firstId + 2, {
        Name: 'Bumps Wheeldrops',
        DPInfo: 'Bumps Wheeldrops',
        TypeName: 'VARDP',
        'ValueMin': null,
        'ValueMax': null,
        'ValueType': 4,
        'Parent': roombaSettings.firstId + 1,
        _persistent: true
    });

    socket.emit('setObject', roombaSettings.firstId + 3, {
        Name: 'Wall',
        DPInfo: 'Wand',
        TypeName: 'VARDP',
        'ValueMin': null,
        'ValueMax': null,
        'ValueType': 4,
        'Parent': roombaSettings.firstId + 1,
        _persistent: true
    });

    socket.emit('setObject', roombaSettings.firstId + 4, {
        Name: 'Cliff left',
        DPInfo: 'Klippe links',
        TypeName: 'VARDP',
        'ValueMin': null,
        'ValueMax': null,
        'ValueType': 4,
        'Parent': roombaSettings.firstId + 1,
        _persistent: true
    });
    
    socket.emit('setObject', roombaSettings.firstId + 5, {
        Name: 'Cliff front left',
        DPInfo: 'Klippe vorn links',
        TypeName: 'VARDP',
        'ValueMin': null,
        'ValueMax': null,
        'ValueType': 4,
        'Parent': roombaSettings.firstId + 1,
        _persistent: true
    });
    
    socket.emit('setObject', roombaSettings.firstId + 6, {
        Name: 'Cliff front right',
        DPInfo: 'Klippe vorn rechts',
        TypeName: 'VARDP',
        'ValueMin': null,
        'ValueMax': null,
        'ValueType': 4,
        'Parent': roombaSettings.firstId + 1,
        _persistent: true
    });

    socket.emit('setObject', roombaSettings.firstId + 7, {
        Name: 'Cliff right',
        DPInfo: 'Klippe rechts',
        TypeName: 'VARDP',
        'ValueMin': null,
        'ValueMax': null,
        'ValueType': 4,
        'Parent': roombaSettings.firstId + 1,
        _persistent: true
    });

    socket.emit('setObject', roombaSettings.firstId + 8, {
        Name: 'Virtual Wall',
        DPInfo: 'virtuelle Wand',
        TypeName: 'VARDP',
        'ValueMin': null,
        'ValueMax': null,
        'ValueType': 4,
        'Parent': roombaSettings.firstId + 1,
        _persistent: true
    });

    socket.emit('setObject', roombaSettings.firstId + 9, {
        Name: 'Motor Overcurrents',
        DPInfo: 'Motorüberstrom',
        TypeName: 'VARDP',
        'ValueMin': null,
        'ValueMax': null,
        'ValueType': 4,
        'Parent': roombaSettings.firstId + 1,
        _persistent: true
    });

    socket.emit('setObject', roombaSettings.firstId + 10, {
        Name: 'Dirt Detector Left',
        DPInfo: 'Schmutzerkennung links',
        TypeName: 'VARDP',
        'ValueMin': null,
        'ValueMax': null,
        'ValueType': 4,
        'Parent': roombaSettings.firstId + 1,
        _persistent: true
    });

    socket.emit('setObject', roombaSettings.firstId + 11, {
        Name: 'Dirt Detector Right',
        DPInfo: 'Schmutzerkennung rechts',
        TypeName: 'VARDP',
        'ValueMin': null,
        'ValueMax': null,
        'ValueType': 4,
        'Parent': roombaSettings.firstId + 1,
        _persistent: true
    });

    socket.emit('setObject', roombaSettings.firstId + 12, {
        Name: 'Remote Operation Code',
        DPInfo: 'Remote Opcode',
        TypeName: 'VARDP',
        'ValueMin': null,
        'ValueMax': null,
        'ValueType': 4,
        'Parent': roombaSettings.firstId + 1,
        _persistent: true
    });

    socket.emit('setObject', roombaSettings.firstId + 13, {
        Name: 'Buttons',
        DPInfo: 'Tasten',
        TypeName: 'VARDP',
        'ValueMin': null,
        'ValueMax': null,
        'ValueType': 4,
        'Parent': roombaSettings.firstId + 1,
        _persistent: true
    });

    socket.emit('setObject', roombaSettings.firstId + 14, {
        Name: 'Distance',
        DPInfo: 'Entfernung',
        TypeName: 'VARDP',
        'ValueMin': null,
        'ValueMax': null,
        'ValueUnit': 'mm',
        'ValueType': 4,
        'Parent': roombaSettings.firstId + 1,
        _persistent: true
    });

    socket.emit('setObject', roombaSettings.firstId + 15, {
        Name: 'Angle',
        DPInfo: 'Winkel',
        TypeName: 'VARDP',
        'ValueMin': null,
        'ValueMax': null,
        'ValueUnit': 'mm',
        'ValueType': 4,
        'Parent': roombaSettings.firstId + 1,
        _persistent: true
    });    
    
    socket.emit('setObject', roombaSettings.firstId + 16, {
        Name: 'Charging State',
        DPInfo: 'Ladestatus',
        TypeName: 'VARDP',
        'ValueMin': null,
        'ValueMax': null,
        'ValueType': 4,
        'Parent': roombaSettings.firstId + 1,
        _persistent: true
    });    
    
    socket.emit('setObject', roombaSettings.firstId + 17, {
        Name: 'Voltage',
        DPInfo: 'elektr. Spannung',
        TypeName: 'VARDP',
        'ValueMin': null,
        'ValueMax': null,
        'ValueUnit': 'mV',
        'ValueType': 4,
        'Parent': roombaSettings.firstId + 1,
        _persistent: true
    });

    socket.emit('setObject', roombaSettings.firstId + 18, {
        Name: 'Current',
        DPInfo: 'elektr. Strom',
        TypeName: 'VARDP',
        'ValueMin': null,
        'ValueMax': null,
        'ValueUnit': 'mA',
        'ValueType': 4,
        'Parent': roombaSettings.firstId + 1,
        _persistent: true
    });
    
    socket.emit('setObject', roombaSettings.firstId + 19, {
        Name: 'Temperature',
        DPInfo: 'Temperatur',
        TypeName: 'VARDP',
        'ValueMin': null,
        'ValueMax': null,
        'ValueUnit': '°C',
        'ValueType': 4,
        'Parent': roombaSettings.firstId + 1,
        _persistent: true
    });

    socket.emit('setObject', roombaSettings.firstId + 20, {
        Name: 'Charge',
        DPInfo: 'Ladung',
        TypeName: 'VARDP',
        'ValueMin': null,
        'ValueMax': null,
        'ValueUnit': 'mAh',
        'ValueType': 4,
        'Parent': roombaSettings.firstId + 1,
        _persistent: true
    });

    socket.emit('setObject', roombaSettings.firstId + 21, {
        Name: 'Capacity',
        DPInfo: 'Akku Kapazität',
        TypeName: 'VARDP',
        'ValueMin': null,
        'ValueMax': null,
        'ValueUnit': 'mAh',
        'ValueType': 4,
        'Parent': roombaSettings.firstId + 1,
        _persistent: true
    });

     
    // Fix polling interval if too short
    if (pollingInterval <= 1) {
        pollingInterval = 1;
    }

    logInfo('polling enabled - interval ' + pollingInterval + ' minutes');

    setInterval(getValues, pollingInterval * 60 * 1000);
    getValues();
}

roombaInit();
