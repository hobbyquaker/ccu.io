var logger         = require(__dirname+'/../../logger.js'),
    http           = require('http');

function postRequest (device, path, post_data, callback) {
    var options = {
        host:   device["ip"],
        port:   8080,
        path:   path,
        method: 'POST',
        headers: {
            'Content-Type': 'application/atom+xml',
            'Content-Length': post_data.length
        }
    };
    // Set up the request
    var post_req = http.request(options, function(res) {
        var xmldata = '';
        res.setEncoding('utf8'),
            res.on('error', function (e) {
                logger.warn ("lgtv: " + e);
                if (callback)
                    callback (device, null);
            });
        res.on('data', function(chunk){
            xmldata += chunk;
        })
        res.on('end', function () {
            console.log('Response: ' + xmldata);
            if (callback)
                callback (device, xmldata);
        });
    });

    // post the data
    post_req.write(post_data);
    post_req.end();
}

var arguments = process.argv.splice(2);
if (arguments.length) {
    var dev = {"ip": arguments[0], is2012: arguments[1]};
    postRequest (dev, dev.is2012 ? "/roap/api/auth" : "/hdcp/api/auth", "<?xml version=\"1.0\" encoding=\"utf-8\"?><auth><type>AuthKeyReq</type></auth>");
}