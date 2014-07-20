'use strict';

var util = require('util');

/**
 * Start or stop external recording of a camera.
 * @param  {object}   params   User parameters (cameraId, action)
 * @param  {function} callback Function to execute at the end of the request. Passed the response of the request and the
 * error if on occurs
 * @returns {*|Synology}
 *
 *
 * @see Chapter 2.3.6.1
 */
function record() {
    var userParams = typeof arguments[0] === 'object' ? arguments[0]: {};
    var callback = typeof arguments[1] === 'function' ? arguments[1] :
            typeof arguments[0] === 'function' ? arguments[0] :null;
    var params = {
        api    : 'SYNO.SurveillanceStation.ExternalRecording',
        version: 1,
        method : 'Record'
    };
    util._extend(params, userParams);
    var query = this.query({
        path: '/webapi/SurveillanceStation/extrecord.cgi',
        params: params
    }, callback || null);
    return query;
}

module.exports = function(syno) {
    return {
        record  : record.bind(syno)
    };
};