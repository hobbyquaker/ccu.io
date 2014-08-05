'use strict';

var util = require('util');

/**
 * Get information about the Surveillance Station
 * @param  {function} callback Function to execute at the end of the request. Passed the response of the request and the
 * error if on occurs
 * @returns {*|Synology}
 *
 *
 * @see Chapter 2.3.4.1
 */
function get_info() {
    var userParams = typeof arguments[0] === 'object' ? arguments[0]: {};
    var callback = typeof arguments[1] === 'function' ? arguments[1] :
            typeof arguments[0] === 'function' ? arguments[0] :null;
    var params = {
        api    : 'SYNO.SurveillanceStation.Info',
        version: 1,
        method : 'getInfo'
    };
    util._extend(params, userParams);

    var query = this.query({
        path: '/webapi/SurveillanceStation/info.cgi',
        params: params
    }, callback || null);
    return query;
}

module.exports = function(syno) {
    return {
        get_info  : get_info.bind(syno)
    };
};
