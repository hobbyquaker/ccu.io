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
var connecting;

var volume;
var muting;
var album = "";
var artist = "";
var song = "";

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
retrieveInitialData();
connectYamaha();

function closeYamaha(){
    yamahaSocket.end();
    logger.info("Socket to Yamaha AV receiver is closed.")
}
/**
 * Connection function to send and retrieve data to and from the receiver.
 */
function connectYamaha(){
//    if (connecting) {
//        clearTimeout (connecting);
//        connecting = null;
//    }

    socket.emit("getDatapoint", [2060], function (id, obj) {
        logger.info(id+". "+obj);
    });

//    getState (1856, function (id, obj) {
//        logger.info(id+". "+obj);
//        if (!obj){
//            logger.info(obj)
//        }
//    });

    yamahaSocket = net.connect(yamahaSettings.port, yamahaSettings.host, function() {
        logger.info("adapter yamaha connected to Yamaha AV Receiver: " + yamahaSettings.host);
    });


    yamahaSocket.on('close', function () {
        logger.info("adapter yamaha received 'close'");
        yamahaSocket.connect(yamahaSettings.port, yamahaSettings.host);
    });

    yamahaSocket.on('error', function (data) {
        logger.info("adapter yamaha received 'error':"+data.toString());
        if(data.code == 'ETIMEDOUT') {
            closeYamaha();
        }
    });

    yamahaSocket.on('end', function () {
        logger.info("adapter yamaha received 'end'");
        yamahaSocket.end ();
    });

    yamahaSocket.on('data', function (data) {
        logger.info(data.toString());
        var value = data.toString();

        var item = value.split("@")
        for (var i=0;i<item.length;i++){
            var itemdata = item[i].split("=");
            if (itemdata.length > 1){
                var key = itemdata[0];
                var value = itemdata[1].replace("\r\n", "");

                if (key.indexOf(":VOL") >-1){
                    key = "VOL";
                }
                if (key.indexOf(":MUTE") >-1){
                    key = "MUTE";
                }

                switch (key){
                    case "VOL":
                        if (!isNaN(value.toString())){
                            volume = value;
                            setState(yamahaSettings.firstId+1,value);
                        }
                        break;
                    case "MUTE":
                        muting = ((value == "Off")? false: true);
                        setState(yamahaSettings.firstId+2,muting);
                        break;
                    case "AIRPLAY:ALBUM":
                        album = value;
                        setState(yamahaSettings.firstId+3,showNowPlaying(album, artist, song));
                        break;
                    case "AIRPLAY:ARTIST":
                        artist = value;
                        setState(yamahaSettings.firstId+3,showNowPlaying(album, artist, song));
                        break;
                    case "AIRPLAY:SONG":
                        song = value;
                        setState(yamahaSettings.firstId+3,showNowPlaying(album, artist, song));
                        break;
                    case "NETRADIO:SONG":
                        song = value;
                        setState(yamahaSettings.firstId+3,showNowPlaying("", "", song));
                        break;
                    case "NETRADIO:AVAIL":
                        album = "";
                        artist = "";
                        song = "";
                        setState(yamahaSettings.firstId+3,showNowPlaying(album, artist, song));
                        break;
                    case "AIRPLAY:AVAIL":
                        album = "";
                        artist = "";
                        song = "";
                        setState(yamahaSettings.firstId+3,showNowPlaying(album, artist, song));
                        break;
                }
            }
        }
    });



    socket.on('event', function (obj) {
        if (!obj || !obj[0]) {
            return;
        }
        //logger.info(obj);



        var id = obj[0];

        if (id == "1856"){
            logger.info("1856: "+obj[1]);
            var state = obj[1];
            if (state){
                setTimeout(function () {
                    retrieveInitialData();
                    connectYamaha();
            }, 20000);

            }else{
                closeYamaha();
            }
            return;
        }

        if (id == yamahaSettings.firstId+1){
            var val = obj[1];

            if (volume != null && val != volume){
                logger.info("adapter Yamaha Event: "+id+" "+val);

                var cmd = "<Volume><Lvl><Val>"+(val*10)+"</Val><Exp>1</Exp><Unit>dB</Unit></Lvl></Volume>"


                createLocalSocketAndWrite(createHTTPRequest("PUT", cmd, "Main_Zone")).on('data', function(d){
                    logger.info(d.toString());
                    this.end();
                });
            }
        }

        if (id == yamahaSettings.firstId+2){
            var val = obj[1];

            if (muting != null && val != muting){
                logger.info("Muting")
                var cmd = "<Volume><Mute>GetParam</Mute></Volume>"

                createLocalSocketAndWrite(createHTTPRequest("GET", cmd, "Main_Zone")).on('data', function(d){
                    logger.info(d.toString());
                    cmd = "";

                    var response = d.toString();
                    if (response.indexOf("<YAMAHA_AV")>-1){
                        var status = response.substring(response.indexOf("<Mute>")+6, response.indexOf("</Mute>"));
                        logger.info(status);
                        logger.info("val="+val);
                        //if (status != val){
                            cmd = "<Volume><Mute>"+((status == 'Off')? 'On': 'Off')+"</Mute></Volume>"
                            logger.info(cmd);
                            createLocalSocketAndWrite(createHTTPRequest("PUT", cmd, "Main_Zone")).on('data', function(d){
                                logger.info(d.toString());
                                this.end();
                            });
                        //}

                    }
                    this.end();
                });
            }




        }
    });
}

function retrieveInitialData(){
    var status;
    var cmd = "<Volume><Lvl>GetParam</Lvl></Volume>"
    createLocalSocketAndWrite(createHTTPRequest("GET", cmd, "Main_Zone")).on('data', function(d){
        var response = d.toString();
        if (response.indexOf("<YAMAHA_AV")>-1){
            volume = response.substring(response.indexOf("<Lvl><Val>")+10, response.indexOf("</Val>"))/10;
            setState(yamahaSettings.firstId+1,volume);
        }
    });


    cmd = "<Volume><Mute>GetParam</Mute></Volume>"
    createLocalSocketAndWrite(createHTTPRequest("GET", cmd, "Main_Zone")).on('data', function(d){
        var response = d.toString();
        if (response.indexOf("<YAMAHA_AV")>-1){
            status = response.substring(response.indexOf("<Mute>")+6, response.indexOf("</Mute>"));
            muting = ((status == "Off")? false: true);
            setState(yamahaSettings.firstId+2,muting);
        }
    });
}


/**
 * Initialize all object this adapter needs to have
 * @constructor
 */
function YamahaInit() {
    setObject(yamahaSettings.firstId+1, {
        Name: "Yamaha_Volume",
        TypeName: "VARDP",
        "ValueType": 4,
        "ValueSubType": 0
    });

    setObject(yamahaSettings.firstId+2, {
        Name: "Yamaha_Mute",
        TypeName: "VARDP",
        "ValueType": 2,
        "ValueSubType": 2,
        "ValueList": ""
    });

    setObject(yamahaSettings.firstId+3, {
        Name: "Yamaha_Now_Playing",
        TypeName: "VARDP","ValueUnit": "",
        "ValueType": 20,
        "ValueSubType": 11
    });
}

function showNowPlaying(album, artist, song){
    var np = "";

    if (artist != ""){
        np = artist;
        if (song != "" || album != ""){
            np += " - ";
        }
    }

    if (song != ""){
        np += song;
        if (album != ""){
            np += " - ";
        }
    }

    if (album != ""){
        np += album;
    }
    return np;
}

function createLocalSocketAndWrite(http_request){
    var local_socket = net.connect(yamahaSettings.xml_port, yamahaSettings.host);
    local_socket.on('error', function(e) {
        if(e.code == 'ETIMEDOUT') {
            local_socket.end();
        }
    });
    local_socket.write(http_request);
    return local_socket;
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
function createHTTPRequest(http_method, cmd, zone){
    var response = "";

    if (zone == undefined){
        zone = 'Main_Zone'
    }
    var data = '<YAMAHA_AV cmd="'+http_method+'"><'+zone+'>'+cmd+'</Main_Zone></YAMAHA_AV>';
    var command_length = data.length;
    var host = yamahaSettings.host;
    var port = yamahaSettings.xml_port;
    var http_request;
    http_request = "POST /YamahaRemoteControl/ctrl HTTP/1.1\r\n";
    http_request += "Content-Length: "+command_length+"\r\n";
    http_request += "Pragma: no-cache\r\n";
    http_request += "Cache-Control: no-cache\r\n\r\n";
    http_request += data;

    return http_request;
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

function getState(id, callback) {
    logger.info("adapter yamaha getState "+id);
    socket.emit("getDatapoint", [id], function (id, obj) {
        callback (id, obj);
    });
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
