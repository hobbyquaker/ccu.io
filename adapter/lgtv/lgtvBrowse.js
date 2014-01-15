var logger  = require(__dirname+'/../../logger.js'),
    dgram   = require("dgram");

function lgtvBrowse () {
    var strngtoXmit =  "M-SEARCH * HTTP/1.1\r\n"+
    "HOST: 239.255.255.250:1900\r\n"+
    "MAN: \"ssdp:discover\"\r\n"+
    "MX: 2\r\n"+
    "ST: urn:schemas-upnp-org:device:MediaRenderer:1\r\n\r\n";

    // Create a new socket
    var server = dgram.createSocket('udp4');
    var result = "";

    if (server)
    {
        server.on("error", function (err) {
            console.log("ERROR: " + err.stack);
            server.close();
            process.exit(-1);
        });

        server.on("message", function (msg, rinfo) {
            var str = msg.toString();
            if (str.indexOf ("LGE") != -1) {
                console.log (rinfo.address);
                result += ((result) ? "," : "" ) + rinfo.address;
            }
        });

        server.bind (50303, "0.0.0.0");

        setTimeout (function () {
            server.close();
            process.send (result);
            console.log ("Send:" + result);
            process.exit();
        }, 2000);

        var buf = new Buffer(strngtoXmit);
        server.send (buf, 0, buf.length, 1900, "239.255.255.250", function (err, bytes) {
            if (err) {
                console.log("ERROR - Cannot send request: " + err);
                server.close();
                process.exit(-1);
            }
        });
    }
}

lgtvBrowse ();
