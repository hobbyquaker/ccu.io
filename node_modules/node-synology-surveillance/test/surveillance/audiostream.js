var should = require('chai').should(),
    Synology = require('../synology_dummy');

var syno = new Synology();

describe('#audiostream', function() {
    it('retrives the audiostream of the selected camera', function () {
        syno.surveillance.videostream.stream({cameraId:20}, function(params){
            params.cameraId.should.equal(20);
            params.method.should.equal("Stream");
        });
    })

    it('retrives the format of the live audio stream of the selected camera', function () {
        syno.surveillance.audiostream.query({cameraId:20}, function(params){
            params.cameraId.should.equal(20);
            params.method.should.equal("Query");
        });
    })

    it('opens the audiostream of the selected camera', function () {
        syno.surveillance.audiostream.open({cameraId:20}, function(params){
            params.cameraId.should.equal(20);
            params.method.should.equal("Open");
        });
    })

    it('closes the audiostream of the selected camera', function () {
        syno.surveillance.audiostream.close({cameraId:20}, function(params){
            params.cameraId.should.equal(20);
            params.method.should.equal("Close");
        });
    })

});