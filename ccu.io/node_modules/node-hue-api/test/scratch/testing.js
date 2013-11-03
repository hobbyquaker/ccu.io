"use strict";

var hue = require("../../index.js");
console.log(JSON.stringify(hue));

var displayBridges = function(bridge) {
    console.log("Hue Bridges Found: " + JSON.stringify(bridge));
};

// Using a promise
hue.locateBridges().then(displayBridges).done();

// Using a callback
hue.locateBridges(function(err, result) {
    if (err) throw err;
    displayBridges(result);
});

//var hue = require("../../index").hue;
//var scheduleEvent = require("../../index").scheduledEvent;
//var http = require("q-io/http");
////var http = require("http");
//var BufferStream = require("q-io/buffer-stream");
//
//var displayResult = function (result) {
//    console.log(JSON.stringify(result, null, 2));
//};
//
//var host = "192.168.2.129",
//    username = "08a902b95915cdd9b75547cb50892dc4",
//    api = new hue.HueApi(host, username),
//    scheduleId = 1,
//    updatedValues;
//
//api.createGroup("mine", ["1", "2"]).then(displayResult).done();
//api.updateGroup(2, ["1", "4"]).then(displayResult).done();

//var body = new BufferStream(JSON.stringify({"lights":["5"]}), "utf-8");
//
//http.request(
//    {
//        host: "192.168.2.129",
//        path: "/api/08a902b95915cdd9b75547cb50892dc4/groups/2",
//        body: body,
//        method: "PUT"
//    }
//).then(function(result) {
//           return result.body.read().then(function(body) {
//               console.log(body.toString());
//           });
//       })
//    .done();

//var post_data = JSON.stringify({"lights":["1", "3"]});
//
//var options = {
//        host: "192.168.2.129",
//        path: "/api/08a902b95915cdd9b75547cb50892dc4/groups/2",
//        body: post_data,
//        method: "PUT",
//        headers: {
//            'Content-Type': 'application/json',
//            'Content-Length': post_data.length
//        }
//};
//
//var req = http.request(options, function(res) {
//    console.log('STATUS: ' + res.statusCode);
//    console.log('HEADERS: ' + JSON.stringify(res.headers));
//    res.setEncoding('utf8');
//    res.on('data', function (chunk) {
//        console.log('BODY: ' + chunk);
//    });
//});
//
//req.on('error', function(e) {
//    console.log('problem with request: ' + e.message);
//});
//
//// write data to request body
//req.write(post_data);
//req.end();


//var addUser = require("../../hue-api/commands/addUser");
//var myUserCommand = addUser.command(null, username, null);
//myUserCommand.validate();

//updatedValues = {
//    "name": "Updated Name",
//    "time": "January 1, 2014 07:00:30"
//};
//
//api.updateSchedule(scheduleId, updatedValues)
//    .then(displayResult)
//    .done();

//TODO remove groups
//var idx = 1;
//while (idx < 16) {
//    api.deleteGroup(idx++);
//}

//var event = schedule.create()
//    .withName("Sample Schedule")
//    .withDescription("An example of a schedule")
//    .withCommand({
//                     "address": "/api/08a902b95915cdd9b75547cb50892dc4/lights/5/state",
//                     "method" : "PUT",
//                     "body"   : {
//                         "on": true
//                     }
//                 })
//    .at("2014-08-01T00:00:00");
//
//api.scheduleEvent(event)
//    .then(displayResult)
//    .then(function() {
//              return api.schedules();
//          })
//    .then(displayResult)
//    .done();

