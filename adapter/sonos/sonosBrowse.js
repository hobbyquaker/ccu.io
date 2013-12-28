var logger  = require(__dirname+'/../../logger.js'),
    dgram   = require("dgram");

function lgtvBrowse ()
{
    var strngtoXmit = new Buffer(["M-SEARCH * HTTP/1.1",
        "HOST: 239.255.255.250:reservedSSDPport",
        "MAN: ssdp:discover",
        "MX: 1",
        "ST: urn:schemas-upnp-org:device:ZonePlayer:1"].join("\r\n"));

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
        server.bind (53004, "0.0.0.0");

        server.on("message", function (msg, rinfo) {
            var str = msg.toString();
            if (str.indexOf ("Sonos") != -1) {
                console.log (rinfo.address);
                result += ((result) ? "," : "" ) + rinfo.address;
            }
        });

        setTimeout (function () {
            server.close();
            process.send (result);
            console.log ("Send:" + result);
            process.exit();
        }, 2000);

        server.send (strngtoXmit, 0, strngtoXmit.length, 1900, "239.255.255.250", function (err, bytes) {
            if (err) {
                console.log("ERROR - Cannot send request: " + err);
                server.close();
                process.exit(-1);
            }
        });
    }
}

lgtvBrowse ();
