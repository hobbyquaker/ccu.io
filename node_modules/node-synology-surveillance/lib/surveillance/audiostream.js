'use strict';

var util = require('util');

/**
 * Get Live View audio stream of the camera with given ID.
 * @param  {object}   params   User parameters (cameraId)
 * @param  {function} callback Function to execute at the end of the request. Passed the response of the request and the
 * error if on occurs
 * @returns {*|Synology}
 *
 *
 * @see Chapter 2.3.11.1
 */
function stream() {
    var userParams = typeof arguments[0] === 'object' ? arguments[0]: {};
    var callback = typeof arguments[1] === 'function' ? arguments[1] :
            typeof arguments[0] === 'function' ? arguments[0] :null;
    var params = {
        api    : 'SYNO.SurveillanceStation.AudioStream',
        version: 2,
        method : 'Stream'
    };
    util._extend(params, userParams);
    var query = this.query({
        path: '/webapi/SurveillanceStation/audioStreaming.cgi',
        params: params
    }, callback || null);
    return query;
}

/**
 * Query the format of live view audio stream of the camera with given ID.
 * @param  {object}   params   User parameters (cameraId)
 * @param  {function} callback Function to execute at the end of the request. Passed the response of the request and the
 * error if on occurs
 * @returns {*|Synology}
 *
 *
 * @see Chapter 2.3.11.2
 */
function query() {
    var userParams = typeof arguments[0] === 'object' ? arguments[0]: {};
    var callback = typeof arguments[1] === 'function' ? arguments[1] :
            typeof arguments[0] === 'function' ? arguments[0] :null;
    var params = {
        api    : 'SYNO.SurveillanceStation.AudioStream',
        version: 2,
        method : 'Query'
    };
    util._extend(params, userParams);
    var query = this.query({
        path: '/webapi/SurveillanceStation/audioStreaming.cgi',
        params: params
    }, callback || null);
    return query;
}

/**Open the live view audio stream of the camera with given ID.
 * @param  {object}   params   User parameters (cameraId)
 * @param  {function} callback Function to execute at the end of the request. Passed the response of the request and the
 * error if on occurs
 * @returns {*|Synology}
 *
 *
 * @see Chapter 2.3.11.3
 */
function open() {
    var userParams = typeof arguments[0] === 'object' ? arguments[0]: {};
    var callback = typeof arguments[1] === 'function' ? arguments[1] :
            typeof arguments[0] === 'function' ? arguments[0] :null;
    var params = {
        api    : 'SYNO.SurveillanceStation.AudioStream',
        version: 2,
        method : 'Open'
    };
    util._extend(params, userParams);
    var query = this.query({
        path: '/webapi/SurveillanceStation/audioStreaming.cgi',
        params: params
    }, callback || null);
    return query;
}

/**
 * Close live view audio streaming of the camera with given ID.
 * @param  {object}   params   User parameters (cameraId)
 * @param  {function} callback Function to execute at the end of the request. Passed the response of the request and the
 * error if on occurs
 * @returns {*|Synology}
 *
 *
 * @see Chapter 2.3.11.4
 */
function close() {
    var userParams = typeof arguments[0] === 'object' ? arguments[0]: {};
    var callback = typeof arguments[1] === 'function' ? arguments[1] :
            typeof arguments[0] === 'function' ? arguments[0] :null;
    var params = {
        api    : 'SYNO.SurveillanceStation.AudioStream',
        version: 2,
        method : 'Close'
    };
    util._extend(params, userParams);
    var query = this.query({
        path: '/webapi/SurveillanceStation/audioStreaming.cgi',
        params: params
    }, callback || null);
    return query;
}



module.exports = function(syno) {
    return {
        stream      : stream.bind(syno),
        query       : query.bind(syno),
        open        : open.bind(syno),
        close       : close.bind(syno)
    };
};