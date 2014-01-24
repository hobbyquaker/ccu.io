var ccuio = {
    ioListenPort: 8080,
    listenIp: "172.16.23.19"
};

var rpi = {
    "enabled": true,
    "firstId": 72600,
    "settings": {
        "deviceName": "PI-WHITE",
        "interval": 60000,
        "piface": false,
        "gpio": {
            "17": {
                "direction": "out"
            },
            "27": {
                "direction": "out"
            },
            "22": {
                "direction": "out"
            },
            "23": {
                "direction": "out"
            },
            "24": {
                "direction": "out"
            },
            "25": {
                "direction": "out"
            }
        },
        "1wire": {
            "28-00000590d06b": {
                "name": "Vorlauftemperatur"
            },
            "28-000005908b0e": {
                "name": "Rücklauftemperatur"
            },
            "28-00000590b3e6": {
                "name": "Temperatur Waschküche"
            }

        }
    }
};

var settings = {
    adapters: {
        rpi: rpi
    },
    ioListenPort: ccuio.ioListenPort,
    binrpc: {
        listenIp: ccuio.listenIp
    }
};

module.exports = settings;