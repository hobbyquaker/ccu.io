/**
 * CCU.IO adapter for Yamaha AV receiver
 *
 * Copyright 2013-2014 Thorsten Kamann
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

var yservice = require("./lib/yamaha_service");
var ylogger = require("./lib/yamaha_logger");
var settings = require(__dirname+'/../../settings.js');
var ysettings = settings.adapters.yamaha.settings;

/**
 * Requests the basic status of the Yamaha AV receiver
 */
exports.get_basic_status = function(){
    ylogger.log_level(ylogger.LEVEL.info);
    yservice.inject_logger(ylogger);
    yservice.setup(ysettings.host, ysettings.port, ysettings.zone);
    yservice.basic_status(function(data){
       ylogger.info(data);
    });
}

this.get_basic_status();
