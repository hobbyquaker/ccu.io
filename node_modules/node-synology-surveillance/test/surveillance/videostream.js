var should = require('chai').should(),
    Synology = require('../synology_dummy');

var syno = new Synology();

describe('#videostream', function() {
    it('retrives the videostream of the selected camera', function () {
        syno.surveillance.videostream.stream({cameraId:20, format: 'mjpeg'}, function(params){
            params.cameraId.should.equal(20);
            params.format.should.equal('mjpeg');
            params.method.should.equal("Stream");
        });
    })

    it('retrives the format of the live stream of the selected camera', function () {
        syno.surveillance.videostream.query({cameraId:20}, function(params){
            params.cameraId.should.equal(20);
            params.method.should.equal("Query");
        });
    })

    it('opens the videostream of the selected camera', function () {
        syno.surveillance.videostream.open({cameraId:20, format: 'hls'}, function(params){
            params.cameraId.should.equal(20);
            params.format.should.equal('hls');
            params.method.should.equal("Open");
        });
    })

    it('closes the format of the live stream of the selected camera', function () {
        syno.surveillance.videostream.close({cameraId:20}, function(params){
            params.cameraId.should.equal(20);
            params.method.should.equal("Close");
        });
    })

});