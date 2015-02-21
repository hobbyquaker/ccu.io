(function() {
  var debug, header_props, htonl, net, ntohl, sendCommand, sendCommandToSocket;

  net = require('net');

  ntohl = require('network-byte-order').ntohl;

  htonl = require('network-byte-order').htonl;

  debug = require('debug')('owfs:communication');

  header_props = ["version", "payload", "ret", "controlflags", "size", "offset"];

  sendCommandToSocket = function(options, socket, callback) {
    var callbackOnce, called, messages, path;
    messages = [];
    path = options.path;
    called = false;
    callbackOnce = function(error, data) {
      if (!called) {
        callback(error, data);
        return called = true;
      }
    };
    socket.on('error', function(error) {
      debug(error);
      return callbackOnce(error);
    });
    socket.on('end', function() {
      return callbackOnce(null, messages);
    });
    socket.on('data', function(data) {
      var header, header_prop, i, message, payload, value, _i, _len;
      header = {};
      for (i = _i = 0, _len = header_props.length; _i < _len; i = ++_i) {
        header_prop = header_props[i];
        value = ntohl(data, i * 4);
        header[header_prop] = value;
      }
      payload = data.slice(24).toString('utf8');
      message = {
        header: header,
        payload: payload
      };
      debug("Receiving header", header);
      debug("Receiving payload", payload);
      if (header.ret < 0) {
        callbackOnce({
          msg: "Communication Error. Received " + header.ret,
          header: header,
          options: options
        });
      }
      return messages.push(message);
    });
    return socket.connect(options.port, options.server, function() {
      var bytesWritten, data_len, msg;
      debug("Sending", options);
      data_len = 8192;
      msg = new Buffer(24 + path.length + 1);
      htonl(msg, 0, 0);
      htonl(msg, 4, path.length + 1);
      htonl(msg, 8, options.command);
      htonl(msg, 12, 0x00000020);
      htonl(msg, 16, data_len);
      htonl(msg, 20, 0);
      bytesWritten = msg.write(path, 24);
      msg.write("\x00", 24 + bytesWritten);
      return socket.end(msg);
    });
  };

  sendCommand = function(options, callback) {
    var socket;
    socket = new net.Socket({
      type: 'tcp4'
    });
    return sendCommandToSocket(options, socket, callback);
  };

  exports.sendCommand = sendCommand;

  exports.sendCommandToSocket = sendCommandToSocket;

}).call(this);

//# sourceMappingURL=communication.js.map
