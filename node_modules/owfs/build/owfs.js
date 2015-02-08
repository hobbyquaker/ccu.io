(function() {
  var Client, basecommunication, convert;

  basecommunication = require('./base/communication');

  convert = require('./base/convert');

  Client = (function() {
    function Client(server, port, communication) {
      this.server = server;
      this.port = port != null ? port : 4304;
      this.communication = communication != null ? communication : basecommunication;
    }

    Client.prototype._dir = function(path, fun, callback) {
      var command;
      command = {
        path: path,
        command: fun,
        server: this.server,
        port: this.port
      };
      return this.communication.sendCommand(command, convert.extractDirectories(callback));
    };

    Client.prototype.read = function(path, callback) {
      var command;
      command = {
        path: path,
        command: 2,
        server: this.server,
        port: this.port
      };
      return this.communication.sendCommand(command, convert.extractValue(callback));
    };

    Client.prototype.write = function(path, payload, callback) {
      var command;
      command = {
        path: path + "\u0000" + payload,
        command: 3,
        server: this.server,
        port: this.port
      };
      return this.communication.sendCommand(command, callback);
    };

    Client.prototype.dir = function(path, callback) {
      return this._dir(path, 4, callback);
    };

    Client.prototype.dirall = function(path, callback) {
      return this._dir(path, 7, callback);
    };

    Client.prototype.get = function(path, callback) {
      return this._dir(path, 8, callback);
    };

    Client.prototype.dirallslash = function(path, callback) {
      return this._dir(path, 9, callback);
    };

    Client.prototype.getslash = function(path, callback) {
      return this._dir(path, 10, callback);
    };

    return Client;

  })();

  exports.Client = Client;

}).call(this);

//# sourceMappingURL=owfs.js.map
