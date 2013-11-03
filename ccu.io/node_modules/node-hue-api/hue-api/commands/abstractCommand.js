"use strict";

var ApiError = require("../errors").ApiError;
//TODO remove this class

var AbstractCommand = function (hostname) {

    this.path = "/api";
    this.method = "GET";
    this.body = {};

    this.hostname = hostname;
};

AbstractCommand.prototype.validate = function () {
    if (! this.hostname) {
        throw new ApiError(this._invalidCommandPrefix + "no hostname provided.");
    }
};

AbstractCommand.prototype.toJSON = function() {
    return {
        "hostname": this.hostname,
        "address": this.path,
        "method": this.method,
        "body": this.getBodyObject()
    };
};

AbstractCommand.prototype.getBodyObject = function() {
    return this.body;
};

AbstractCommand.prototype._invalidCommandPrefix = function() {
    return "Invalid " + this.name + " command, ";
};

module.exports = AbstractCommand;