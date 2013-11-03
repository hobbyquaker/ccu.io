"use strict";

//TODO remove this class

var ApiError = require("../errors").ApiError,
    AbstractCommand = require("./abstractCommand"),
    util = require("util"),
    md5 = require("MD5");


var AddUser = function (hostname, username, description) {
    AddUser.super_.call(this, hostname);

    this.devicetype = description || "Node API";
    this.username = md5(username);

//    this.validate();
};
util.inherits(AddUser, AbstractCommand);
AddUser.prototype.name = "AddUser";

AddUser.prototype.getBodyObject = function() {
    var body = AbstractCommand.prototype.getBodyObject.call(this);

    body.devicetype = this.devicetype;
    body.username = this.username;

    return body;
};


module.exports.command = function (hostname, devicetype, username) {
    var command = new AddUser(hostname, devicetype, username);

    console.log(JSON.stringify(command.toJSON(), null, 2));

    return command;
};