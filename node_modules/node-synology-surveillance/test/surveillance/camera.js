var should = require('chai').should(),
    Synology = require('../synology_dummy');

var syno = new Synology();

describe('#cameras', function() {
    it('list all cameras', function () {
        syno.surveillance.camera.list({limit:10}, function(params){
            params.limit.should.equal(10);
            params.method.should.equal("List");
        });
    })

    it('get info for a specified camera', function () {
        syno.surveillance.camera.info({cameraIds:23, additional:'device, schedule'}, function(params){
            params.cameraIds.should.equal(23);
            params.additional.should.equal("device, schedule");
            params.method.should.equal("GetInfo");
        });
    })

    it('get capabilities for a specified camera', function () {
        syno.surveillance.camera.get_capabilities({vendor:"D-Link", model:'DSC 945L'}, function(params){
            params.vendor.should.equal("D-Link");
            params.model.should.equal("DSC 945L");
            params.method.should.equal("GetCapability");
        });
    })

    it('list all camera groups', function () {
        syno.surveillance.camera.list_group({limit:100}, function(params){
            params.limit.should.equal(100);
            params.method.should.equal("ListGroup");
        });
    })

    it('get the current snapshot of the cam with the given id', function () {
        syno.surveillance.camera.get_snapshot({cameraId:54}, function(params){
            params.cameraId.should.equal(54);
            params.method.should.equal("GetSnapshot");
        });
    })

    it('get the current snapshot url of the selected url', function () {
        syno.surveillance.camera.get_snapshot_url({cameraId:54}, function(params){
            params.cameraId.should.equal(54);
            params.method.should.equal("GetSnapshot");
        });
    })

    it('get the current videostream url of the selected url', function () {
        syno.surveillance.camera.get_videostream_url({cameraId:54, format: 'hls'}, function(params){
            params.cameraId.should.equal(54);
            params.format.should.equal('hls');
            params.method.should.equal("Stream");
        });
    })


    it('disable the cam with the given id', function () {
        syno.surveillance.camera.disable({cameraIds:"2,4,6"}, function(params){
            params.cameraIds.should.equal("2,4,6");
            params.method.should.equal("Disable");
        });
    })

    it('enable the cam with the given id', function () {
        syno.surveillance.camera.enable({cameraIds:"2,14,6"}, function(params){
            params.cameraIds.should.equal("2,14,6");
            params.method.should.equal("Enable");
        });
    })

    it('Get capability of a specific camera by its camera Id', function () {
        syno.surveillance.camera.get_capability_by_cam_id({cameraId:1}, function(params){
            params.cameraId.should.equal(1);
            params.method.should.equal("GetCapabilityByCamId");
        });
    })
});