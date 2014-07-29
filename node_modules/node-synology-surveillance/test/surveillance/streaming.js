var should = require('chai').should(),
    Synology = require('../synology_dummy');

var syno = new Synology();

describe('#streaming', function() {
    it('streams the current live video', function () {
        syno.surveillance.streaming.live_stream({cameraId:20}, function(params){
            params.cameraId.should.equal(20);
            params.method.should.equal("LiveStream");
        });
    })

    it('streams the content of a given event', function () {
        syno.surveillance.streaming.event_stream({eventId:2340}, function(params){
            params.eventId.should.equal(2340);
            params.method.should.equal("EventStream");
        });
    })

});