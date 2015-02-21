'use strict';

var util = require('util');

/**
 * Get the list of all cameras.
 * @param  {object}   params   User parameters (offset, limit)
 * @param  {function} callback Function to execute at the end of the request. Passed the response of the request and the
 * error if on occurs
 * @returns {*|Synology}
 *
 *
 * @see Chapter 2.3.4.1
 */
function list() {
    var userParams = typeof arguments[0] === 'object' ? arguments[0]: {};
    var callback = typeof arguments[1] === 'function' ? arguments[1] :
            typeof arguments[0] === 'function' ? arguments[0] :null;
    var params = {
        api    : 'SYNO.SurveillanceStation.Camera',
        version: 1,
        method : 'List'
    };
    util._extend(params, userParams);
    var query = this.query({
        path: '/webapi/SurveillanceStation/camera.cgi',
        params: params
    }, callback || null);
    return query;
}

/**
 * Get all camera group information.
 * @param  {object}   params   User parameters (offset, limit)
 * @param  {function} callback Function to execute at the end of the request. Passed the response of the request and the
 * error if on occurs
 * @returns {*|Synology}
 *
 * @see Chapter 2.3.4.4
 */
function list_group() {
    var userParams = typeof arguments[0] === 'object' ? arguments[0]: {};
    var callback = typeof arguments[1] === 'function' ? arguments[1] :
            typeof arguments[0] === 'function' ? arguments[0] :null;
    var params = {
        api    : 'SYNO.SurveillanceStation.Camera',
        version: 1,
        method : 'ListGroup'
    };
    util._extend(params, userParams);
    var query = this.query({
        path: '/webapi/SurveillanceStation/camera.cgi',
        params: params
    }, callback || null);
    return query;
}

/**
 * Get specific camera settings.
 * @param  {object}   params   User parameters (cameraIds, additional)
 * @param  {function} callback Function to execute at the end of the request. Passed the response of the request and the
 * error if on occurs
 * @returns {*|Synology}
 *
 * @see Chapter 2.3.4.2
 */
function info() {
    var userParams = typeof arguments[0] === 'object' ? arguments[0]: {};
    var callback = typeof arguments[1] === 'function' ? arguments[1] :
            typeof arguments[0] === 'function' ? arguments[0] :null;
    var params = {
        api    : 'SYNO.SurveillanceStation.Camera',
        version: 1,
        method : 'GetInfo'
    };
    util._extend(params, userParams);
    var query = this.query({
        path: '/webapi/SurveillanceStation/camera.cgi',
        params: params
    }, callback || null);
    return query;
}

/**
 * Get capability of a specific camera model.
 * @param  {object}   params   User parameters (vendor, model)
 * @param  {function} callback Function to execute at the end of the request. Passed the response of the request and the
 * error if on occurs
 * @returns {*|Synology}
 *
 * @see Chapter 2.3.4.2
 */
function get_capabilities() {
    var userParams = typeof arguments[0] === 'object' ? arguments[0]: {};
    var callback = typeof arguments[1] === 'function' ? arguments[1] :
            typeof arguments[0] === 'function' ? arguments[0] :null;
    var params = {
        api    : 'SYNO.SurveillanceStation.Camera',
        version: 1,
        method : 'GetCapability'
    };
    util._extend(params, userParams);
    var query = this.query({
        path: '/webapi/SurveillanceStation/camera.cgi',
        params: params
    }, callback || null);
    return query;
}

/**
 * Get the up-to-date snapshot of the selected camera in JPEG format.
 * @param  {object}   params   User parameters (cameraId)
 * @param  {function} callback Function to execute at the end of the request. Passed the response of the request and the
 * error if on occurs
 * @returns {*|Synology}
 *
 * @see Chapter 2.3.4.5
 */
function get_snapshot() {
    var userParams = typeof arguments[0] === 'object' ? arguments[0]: {};
    var callback = typeof arguments[1] === 'function' ? arguments[1] :
            typeof arguments[0] === 'function' ? arguments[0] :null;
    var params = {
        api    : 'SYNO.SurveillanceStation.Camera',
        version: 1,
        method : 'GetSnapshot'
    };
    util._extend(params, userParams);
    var query = this.query({
        path: '/webapi/SurveillanceStation/camera.cgi',
        params: params
    }, callback || null);
    return query;
}


/**
 * Get the  snapshot url of the selected camera.
 * @param  {object}   params   User parameters (cameraId)
 * @param  {function} callback Function to execute at the end of the request. Passed the response of the request and the
 * error if on occurs
 * @returns {*|Synology}
 *
 * <b>Remark: this function is not part of the WebAPI</b>
 */
function get_snapshot_url(){
    var userParams = typeof arguments[0] === 'object' ? arguments[0]: {};
    var callback = typeof arguments[1] === 'function' ? arguments[1] :
            typeof arguments[0] === 'function' ? arguments[0] :null;
    var params = {
        api    : 'SYNO.SurveillanceStation.Camera',
        version: 1,
        method : 'GetSnapshot'
    };

    var cb_data = 'http' + (this.options.secure ? 's' : '') + '://'
        + this.options.host + ':' + this.options.port + "/webapi/SurveillanceStation/camera.cgi?"
    this.api.auth(function(err, data){
        if (err) throw err;

        userParams._sid = data.data.sid;
        util._extend(params, userParams);

        var url_params = [];
        for (var name in params) {
            if (params.hasOwnProperty(name)) {
                url_params.push(name+"="+params[name]);
            }
        }
        callback(err, cb_data += url_params.join("&"));
    });
}

/**
 * Get the  videostream url of the selected camera.
 * @param  {object}   params   User parameters (cameraId, format)
 * @param  {function} callback Function to execute at the end of the request. Passed the response of the request and the
 * error if on occurs
 * @returns {*|Synology}
 *
 * <b>Remark: this function is not part of the WebAPI</b>
 */
function get_videostream_url(){
    var userParams = typeof arguments[0] === 'object' ? arguments[0]: {};
    var callback = typeof arguments[1] === 'function' ? arguments[1] :
            typeof arguments[0] === 'function' ? arguments[0] :null;
    var params = {
        api    : 'SYNO.SurveillanceStation.VideoStream',
        version: 1,
        method : 'Stream'
    };

    var cb_data = 'http' + (this.options.secure ? 's' : '') + '://'
        + this.options.host + ':' + this.options.port + "/webapi/SurveillanceStation/videoStreaming.cgi?";
    this.api.auth(function(err, data){
        if (err) throw err;

        userParams._sid = data.data.sid;
        util._extend(params, userParams);

        var url_params = [];
        for (var name in params) {
            if (params.hasOwnProperty(name)) {
                url_params.push(name+"="+params[name]);
            }
        }
        callback(err, cb_data += url_params.join("&"));
    });
}

/**
 * Enable cameras.
 * @param  {object}   params   User parameters (cameraIds)
 * @param  {function} callback Function to execute at the end of the request. Passed the response of the request and the
 * error if on occurs
 * @returns {*|Synology}
 *
 * @see Chapter 2.3.4.6
 */
function enable() {
    var userParams = typeof arguments[0] === 'object' ? arguments[0]: {};
    var callback = typeof arguments[1] === 'function' ? arguments[1] :
            typeof arguments[0] === 'function' ? arguments[0] :null;
    var params = {
        api    : 'SYNO.SurveillanceStation.Camera',
        version: 3,
        method : 'Enable'
    };
    util._extend(params, userParams);
    var query = this.query({
        path: '/webapi/SurveillanceStation/camera.cgi',
        params: params
    }, callback || null);
    return query;
}

/**
 * Disable cameras.
 * @param  {object}   params   User parameters (cameraIds)
 * @param  {function} callback Function to execute at the end of the request. Passed the response of the request and the
 * error if on occurs
 * @returns {*|Synology}
 *
 * @see Chapter 2.3.4.6
 */
function disable() {
    var userParams = typeof arguments[0] === 'object' ? arguments[0]: {};
    var callback = typeof arguments[1] === 'function' ? arguments[1] :
            typeof arguments[0] === 'function' ? arguments[0] :null;
    var params = {
        api    : 'SYNO.SurveillanceStation.Camera',
        version: 3,
        method : 'Disable'
    };
    util._extend(params, userParams);
    var query = this.query({
        path: '/webapi/SurveillanceStation/camera.cgi',
        params: params
    }, callback || null);
    return query;
}

/**
 * Get capability of a specific camera by its camera Id.
 * @param  {object}   params   User parameters (cameraId)
 * @param  {function} callback Function to execute at the end of the request. Passed the response of the request and the
 * error if on occurs
 * @returns {*|Synology}
 *
 * @see Chapter 2.3.4.6
 */
function get_capability_by_cam_id() {
    var userParams = typeof arguments[0] === 'object' ? arguments[0]: {};
    var callback = typeof arguments[1] === 'function' ? arguments[1] :
            typeof arguments[0] === 'function' ? arguments[0] :null;
    var params = {
        api    : 'SYNO.SurveillanceStation.Camera',
        version: 4,
        method : 'GetCapabilityByCamId'
    };
    util._extend(params, userParams);
    var query = this.query({
        path: '/webapi/SurveillanceStation/camera.cgi',
        params: params
    }, callback || null);
    return query;
}






module.exports = function(syno) {
    return {
        list                        : list.bind(syno),
        list_group                  : list_group.bind(syno),
        info                        : info.bind(syno),
        get_capabilities            : get_capabilities.bind(syno),
        get_snapshot                : get_snapshot.bind(syno),
        get_snapshot_url            : get_snapshot_url.bind(syno),
        get_videostream_url         : get_videostream_url.bind(syno),
        enable                      : enable.bind(syno),
        disable                     : disable.bind(syno),
        get_capability_by_cam_id    : get_capability_by_cam_id.bind(syno)
    };
};
