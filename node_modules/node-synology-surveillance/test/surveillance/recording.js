var should = require('chai').should(),
    Synology = require('../synology_dummy');

var syno = new Synology();

describe('#recording', function() {
    it('start recording with a camera', function () {
        syno.surveillance.recording.record({cameraId:10, action: "start"}, function(params){
            params.cameraId.should.equal(10);
            params.action.should.equal("start");
            params.method.should.equal("Record");
        });
    })

    it('stop recording with a camera', function () {
        syno.surveillance.recording.record({cameraId:10, action: "stop"}, function(params){
            params.cameraId.should.equal(10);
            params.action.should.equal("stop");
            params.method.should.equal("Record");
        });
    })
});