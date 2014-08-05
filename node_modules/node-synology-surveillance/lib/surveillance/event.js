'use strict';

var util = require('util');

/**
 * Query event list by specific filter conditions.
 * @param  {object}   params   User parameters (offset, limit, mode, locked, cameraIds, fromTime, toTime)
 * @param  {function} callback Function to execute at the end of the request. Passed the response of the request and the
 * error if on occurs
 * @returns {*|Synology}
 *
 *
 * @see Chapter 2.3.7.1
 */
function query() {
    var userParams = typeof arguments[0] === 'object' ? arguments[0]: {};
    var callback = typeof arguments[1] === 'function' ? arguments[1] :
            typeof arguments[0] === 'function' ? arguments[0] :null;
    var params = {
        api    : 'SYNO.SurveillanceStation.Event',
        version: 1,
        method : 'Query'
    };
    util._extend(params, userParams);
    var query = this.query({
        path: '/webapi/SurveillanceStation/event.cgi',
        params: params
    }, callback || null);
    return query;
}

/**
 * Delete multi-events with selection.
 * @param  {object}   params   User parameters (idList)
 * @param  {function} callback Function to execute at the end of the request. Passed the response of the request and the
 * error if on occurs
 * @returns {*|Synology}
 *
 *
 * @see Chapter 2.3.7.2
 */
function delete_multi() {
    var userParams = typeof arguments[0] === 'object' ? arguments[0]: {};
    var callback = typeof arguments[1] === 'function' ? arguments[1] :
            typeof arguments[0] === 'function' ? arguments[0] :null;
    var params = {
        api    : 'SYNO.SurveillanceStation.Event',
        version: 3,
        method : 'DeleteMulti'
    };
    util._extend(params, userParams);
    var query = this.query({
        path: '/webapi/SurveillanceStation/event.cgi',
        params: params
    }, callback || null);
    return query;
}

/**
 * Delete events by specific filter conditions.
 * @param  {object}   params   User parameters (mode, cameraIds, fromTime, toTime)
 * @param  {function} callback Function to execute at the end of the request. Passed the response of the request and the
 * error if on occurs
 * @returns {*|Synology}
 *
 *
 * @see Chapter 2.3.7.3
 */
function delete_filter() {
    var userParams = typeof arguments[0] === 'object' ? arguments[0]: {};
    var callback = typeof arguments[1] === 'function' ? arguments[1] :
            typeof arguments[0] === 'function' ? arguments[0] :null;
    var params = {
        api    : 'SYNO.SurveillanceStation.Event',
        version: 3,
        method : 'DeleteFilter'
    };
    util._extend(params, userParams);
    var query = this.query({
        path: '/webapi/SurveillanceStation/event.cgi',
        params: params
    }, callback || null);
    return query;
}

/**
 * Delete all events that the user has authorized.
 * @param  {function} callback Function to execute at the end of the request. Passed the response of the request and the
 * error if on occurs
 * @returns {*|Synology}
 *
 *
 * @see Chapter 2.3.7.4
 */
function delete_all() {
    var userParams = typeof arguments[0] === 'object' ? arguments[0]: {};
    var callback = typeof arguments[1] === 'function' ? arguments[1] :
            typeof arguments[0] === 'function' ? arguments[0] :null;
    var params = {
        api    : 'SYNO.SurveillanceStation.Event',
        version: 3,
        method : 'DeleteAll'
    };
    util._extend(params, userParams);
    var query = this.query({
        path: '/webapi/SurveillanceStation/event.cgi',
        params: params
    }, callback || null);
    return query;
}

module.exports = function(syno) {
    return {
        query           : query.bind(syno),
        delete_multi    : delete_multi.bind(syno),
        delete_filter   : delete_filter.bind(syno),
        delete_all      : delete_all.bind(syno)
    };
};