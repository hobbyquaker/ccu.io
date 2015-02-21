'use strict';

var util = require('util');

/**
 * Get a HTTP Live View video stream of the camera with given ID.
 * @param  {object}   params   User parameters (cameraId)
 * @param  {function} callback Function to execute at the end of the request. Passed the response of the request and the
 * error if on occurs
 * @returns {*|Synology}
 *
 *
 * @see Chapter 2.3.10.1
 */
function live_stream() {
    var userParams = typeof arguments[0] === 'object' ? arguments[0]: {};
    var callback = typeof arguments[1] === 'function' ? arguments[1] :
            typeof arguments[0] === 'function' ? arguments[0] :null;
    var params = {
        api    : 'SYNO.SurveillanceStation.Streaming',
        version: 1,
        method : 'LiveStream'
    };
    util._extend(params, userParams);
    var query = this.query({
        path: '/webapi/SurveillanceStation/streaming.cgi',
        params: params
    }, callback || null);
    return query;
}

/**
 * Get HTTP video stream of the specific recording event.
 * @param  {object}   params   User parameters (eventId)
 * @param  {function} callback Function to execute at the end of the request. Passed the response of the request and the
 * error if on occurs
 * @returns {*|Synology}
 *
 *
 * @see Chapter 2.3.10.2
 */
function event_stream() {
    var userParams = typeof arguments[0] === 'object' ? arguments[0]: {};
    var callback = typeof arguments[1] === 'function' ? arguments[1] :
            typeof arguments[0] === 'function' ? arguments[0] :null;
    var params = {
        api    : 'SYNO.SurveillanceStation.Streaming',
        version: 1,
        method : 'EventStream'
    };
    util._extend(params, userParams);
    var query = this.query({
        path: '/webapi/SurveillanceStation/streaming.cgi',
        params: params
    }, callback || null);
    return query;
}

module.exports = function(syno) {
    return {
        live_stream     : live_stream.bind(syno),
        event_stream    : event_stream.bind(syno)
    };
};