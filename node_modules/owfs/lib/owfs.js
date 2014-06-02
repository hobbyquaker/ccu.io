var communication = require('./base/communication');

function Client(server, port){
    if(false === (this instanceof Client)) {
        return new Client();
    }
    
    this._server = server;
    this._port = port;
}

function _send(path,fun, callback){
    communication.sendCommand({path: path, command: fun, server: this._server, port: this._port}, callback);
}

function _dir(method, path, callback){
    var directories = [];
    _send.call(this,path,method,function(messages){
        messages.forEach(function(message){
            var lines = message.payload.split(" ");
            lines.map(function(line){
                return line.replace(new RegExp("[\u0000-\u001F]", "g"), "");
            }).forEach(function(line){
                if(line){
                    directories = directories.concat(line.split(","));
                }
            });
        });
       callback(directories);
    });
}


Client.prototype.read = function(path, callback){
    _send.call(this,path,2,function(messages){
        var messageToUse;
        if(messages.length > 1){
            //Sometimes there are multiple result packages. I don't know why!
            messageToUse = messages.filter(function(message){
                return message.header.payload > 0;
            })[0];
        } else {
            messageToUse = messages[0];
        }
        var result = messageToUse.payload.replace(new RegExp(" ", "g"), "");
        callback(result);
    });
};

Client.prototype.write = function(path, payload, callback){
    _send.call(this, path+"\u0000"+payload,3, callback);
};
Client.prototype.dir = function(path, callback){
    _dir.call(this,4,path,callback);
};

Client.prototype.dirall = function(path, callback){
    _dir.call(this,7,path,callback);
};
Client.prototype.get = function(path, callback){
    _dir.call(this,8,path,callback);
};

Client.prototype.dirallslash = function(path, callback){
    _dir.call(this,9,path,callback);
};

Client.prototype.getslash = function(path, callback){
    _dir.call(this,10,path,callback);
};

exports.Client = Client;
