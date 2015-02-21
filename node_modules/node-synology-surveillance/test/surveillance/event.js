var should = require('chai').should(),
    Synology = require('../synology_dummy');

var syno = new Synology();

describe('#event', function() {
    it('query events', function () {
        syno.surveillance.event.query({limit:20, mode: "1, 4, 6"}, function(params){
            params.limit.should.equal(20);
            params.mode.should.equal("1, 4, 6");
            params.method.should.equal("Query");
        });
    })

    it('delete multiple events', function () {
        syno.surveillance.event.delete_multi({idList: '[{"id":"1:5","dsId":1},{"id":"2:10","dsId":0}]'}, function(params){
            params.idList.should.equal('[{"id":"1:5","dsId":1},{"id":"2:10","dsId":0}]');
            params.method.should.equal("DeleteMulti");
        });
    })

    it('delete events by filters', function () {
        syno.surveillance.event.delete_filter({mode: '1,2,3', fromTime: '123456786543'}, function(params){
            params.mode.should.equal('1,2,3');
            params.fromTime.should.equal('123456786543');
            params.method.should.equal("DeleteFilter");
        });
    })

    it('delete all events', function () {
        syno.surveillance.event.delete_all(function(params){
            params.method.should.equal("DeleteAll");
        });
    })

});