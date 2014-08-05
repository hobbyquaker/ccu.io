
[![Build Status](https://travis-ci.org/thorque/node-synology-surveillance.svg?branch=master)](https://travis-ci.org/thorque/node-synology-surveillance)
[![Dependency Status](https://gemnasium.com/thorque/node-synology-surveillance.svg)](https://gemnasium.com/thorque/node-synology-surveillance)

node-synology-surveillance
===

Node module to interact with the Surveillance Station by Synology.

# Installation

    $ npm install node-synology-surveillance

# Usage

You can use this module on the same way as you do it with oter modules:

```javascript
var Synology = require('node-synology-surveillance');

var syno = new Synology({
    host    : 'localhost',
    user    : 'user',
    password: 'userpwd'
});

syno.surveillance.info.get_info(function(err, data){
    if (err) throw err;
    console.log(data);
});
```

All functions have the same structure:

```javascript
syno.surveillance.{API}.{function}([params], [callback]{}
```

The *params* are optional (doumented in the original WebApi document with samples) and are in the form of an object.

```javascript
syno.surveillance.recording.record({
    cameraId: 1,
    action: "stop"
}, function(err, data){
    if (err) throw err;
    //do anything with the data
});
```

The callback is optional too, if you don't need the data or the error.

# Implemented APIs

The [Surveillance Station's WebApi by Synology](http://www.synology.com/en-global/support/surveillance_station_web_api) 
provides many APIs:
 
 API Name | Description | Section 
 -------- | ----------- | ------- 
 SYNO.API.Info | Discover all API information | 2.3.1
 SYNO.API.Auth | Perform session login and logout | 2.3.2
 SYNO.SurveillanceStation.Info | Retrieve Surveillance Station-related general information | 2.3.3
 SYNO.SurveillanceStation.Camera | Retrieve camera-related information | 2.3.4
 SYNO.SurveillanceStation.PTZ | Perform camera PTZ actions | 2.3.5
 SYNO.SurveillanceStation.ExternalRecording | Control external recording of cameras | 2.3.6
 SYNO.SurveillanceStation.Event | Query event information | 2.3.7
 SYNO.SurveillanceStation.Device | Get information of Visual Station and CMS | 2.3.8
 SYNO.SurveillanceStation.Emap | Get information of defined E-Maps. | 2.3.9
 SYNO.SurveillanceStation.Streaming | Get video stream of live view and recorded events | 2.3.10
 SYNO.SurveillanceStation.AudioStream | Get audio stream of live view | 2.3.11
 SYNO.SurveillanceStation.VideoStream | Get video stream of live view | 2.3.12
 SYNO.SurveillanceStation.Notification | Get authorized token of DS. | 2.3.13
 
 Not all APIs are implemented. Here is a list with the implemented APIs:
 
 API Name | All methods implemented?
 -------- | ------------------------
 SYNO.SurveillanceStation.Info | [x]
 SYNO.SurveillanceStation.Camera | [x]
 SYNO.SurveillanceStation.ExternalRecording | [x]
 SYNO.SurveillanceStation.Event | [x]
 SYNO.SurveillanceStation.Streaming | [x]
 SYNO.SurveillanceStation.AudioStream | [x]
 SYNO.SurveillanceStation.VideoStream | [x]

# Licence
The MIT License (MIT)

Copyright (c) {{{2014}}} {{{ThorQue}}}

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
