/**
 * Created by kamann on 13.01.14.
 */

var settings = require(__dirname+'/../../settings.js');

if (!settings.adapters.yamaha || !settings.adapters.yamaha.enabled) {
    process.exit();
}

var logger = require(__dirname+'/../../logger.js'),
    io     = require('socket.io-client'),
    net    = require('net');

var datapoints = {}, objects = {};
var yamahaSettings = settings.adapters.yamaha.settings;
var yamahaSocket;

logger.info("Hello Wold");

if (settings.ioListenPort) {
    var socket = io.connect("127.0.0.1", {
        port: settings.ioListenPort
    });
} else if (settings.ioListenPortSsl) {
    var socket = io.connect("127.0.0.1", {
        port: settings.ioListenPortSsl,
        secure: true
    });
} else {
    process.exit();
}

YamahaInit();
connectYamaha();

/**
 * Connection function to send and retrieve data to and from the receiver.
 */
function connectYamaha(){
    yamahaSocket = net.connect({port: yamahaSettings.port, host: yamahaSettings.host});

    yamahaSocket.on('close', function () {
        logger.info("adapter yamaha disconnected from Receiver");
    });

    yamahaSocket.on('data', function (data) {
        logger.info(data.toString());
    });

    setState(yamahaSettings.firstId+1,-44.5);
    setState(yamahaSettings.firstId+2,true);

    socket.on('event', function (obj) {
        if (!obj || !obj[0]) {
            return;
        }

        var id = obj[0];
        if (id == yamahaSettings.firstId+1){
            var val = obj[1];
            var ts = obj[2];
            var ack = obj[3];

            logger.info("adapter Yamaha Event: "+id+" "+val+" "+ts+" "+ack+" "+obj);
            talkToYamaha(yamahaSocket, "<Volume><Mute>On/Off</Mute></Volume>", "Main_Zone")
        }
    });
}

/**
 * Initialize all object this adapter needs to have
 * @constructor
 */
function YamahaInit() {

    setObject(yamahaSettings.firstId, {
        Name: "Yamaha_Command",
        TypeName: "VARDP"
    });

    setObject(yamahaSettings.firstId+1, {
        Name: "Yamaha_Volume",
        TypeName: "VARDP"
    });

    setObject(yamahaSettings.firstId+2, {
        Name: "Yamaha_Mute",
        TypeName: "VARDP"
    });
}

/**
 * Central function to talk with the Yamaha AV Receiver.
 * <br/>
 * For a reference for all commands see: http://www.google.de/url?sa=t&rct=j&q=yamaha%20rx-vx67_ethernet_if_spec&source=web&cd=1&ved=0CDAQFjAA&url=http%3A%2F%2Fwww.avhifiresources.co.uk%2Fcontent%2FDealer%2520News-Info%2FCustom%2520Installer%2520Info%2FRX%2520AX10%2520VX71%2520Series%2520Function%2520Tree.xls&ei=yN_4TuyJHpGA8gO00eWsAQ&usg=AFQjCNHbx60435avSmn_xl8V69exhoTUSw
 * <br/>
 * <br/>
 * Samples for cmd and zone:
 * <ul>
 *     <li>cmd = <Volume><Mute>On/Off</Mute></Volume></li>
 *     <li>zone = Main_Zone</li>
 *
 * </ul>
 * @param yamahaSocket - The open socket you want to use
 * @param cmd - The cmd you want to execute
 * @param zone - The zone of the Yamaha receiver
 */
function talkToYamaha(yamahaSocket, http_method, cmd, zone){

    if (zone == undefined){
        zone = 'Main_Zone'
    }
    var data = '<YAMAHA_AV cmd="PUT"><'+zone+'>'+cmd+'</'+zone+'></YAMAHA_AV>';
    var command_length = data.length;
    var host = yamahaSettings.host;
    var port = yamahaSettings.port;
    var http_request;
    http_request = "POST /YamahaRemoteControl/ctrl HTTP/1.1\r\n";
    http_request += "Host: "+host+"\r\n";
    http_request += "User-Agent: Mozilla/5.0 (Windows NT 6.1; WOW64; rv:12.0) Gecko/20100101 Firefox/12.0\r\n";
    http_request += "Accept: text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8\r\n";
    http_request += "Accept-Language: de-de,de;q=0.8,en-us;q=0.5,en;q=0.3\r\n";
    http_request += "Accept-Encoding: gzip, deflate\r\n";
    http_request += "Connection: keep-alive\r\n";
    http_request += "Content-Type: text/xml; charset=UTF-8\r\n";
    http_request += "Referer: http://"+host+"/\r\n";
    http_request += "Content-Length: "+command_length+"\r\n";
    http_request += "Pragma: no-cache\r\n";
    http_request += "Cache-Control: no-cache\r\n\r\n";
    http_request += data;

    yamahaSocket.write(http_request);
}

/**
 * Sets the state of an existing object in the datapoints collection
 * @param id - the id of the object the state should be changed
 * @param val - the value represents the state
 */
function setState(id, val) {
    datapoints[id] = [val];
    logger.verbose("adapter yamaha setState "+id+" "+val);
    socket.emit("setState", [id,val,null,true]);
}

/**
 * Sets an object to the collection of objects of datapoints.
 * <p>
 *     <code>
 *         setObject(123456, {
 *               Name: "OBJECT_NAME",
 *               TypeName: "VARDP"
 *           });
 *      </code>
 * </p>
 *
 * @param id - the id of the object to store
 * @param obj - the object to store
 */
function setObject(id, obj) {
    objects[id] = obj;
    if (obj.Value) {
        datapoints[obj.Name] = [obj.Value];
    }
    socket.emit("setObject", id, obj);
}

/**
 * Stops this adapter. In this stop function the open socket will be closed and
 * the process exited.
 */
function stop() {
    logger.info("adapter yamaha terminating");
    yamahaSocket.end;
    setTimeout(function () {
        process.exit();
    }, 250);
}

/**
 * If the Unix signal <i>SIGINT</i> was received then ends the adapter.
 */
process.on('SIGINT', function () {
    stop();
});

/**
 * If the Unix signal <i>SIGTERM</i> was received then ends the adapter.
 */
process.on('SIGTERM', function () {
    stop();
});
