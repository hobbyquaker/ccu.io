var assert = require("assert"),
	sinon = require("sinon"),
	proxyquire = require('proxyquire');

var payloadResult = '/01.A7F1D92A82C8\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0011\u0000\u0000\u0000\u0000\u0000\u0000\u0000 \u0000\u0000\u0000\u0010\u0000\u0000\u0000\u0000/10.D8FE434D9855\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0011\u0000\u0000\u0000\u0000\u0000\u0000\u0000 \u0000\u0000\u0000\u0010\u0000\u0000\u0000\u0000/22.8CE2B3471711\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0011\u0000\u0000\u0000\u0000\u0000\u0000\u0000 \u0000\u0000\u0000\u0010\u0000\u0000\u0000\u0000/29.98542F112D05\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000 \u0000\u0000\u0000\u0000\u0000\u0000';

describe('OWFS Client', function(){
	var communicationStub = {};
	var Client = proxyquire('../lib/owfs',{'./base/communication':communicationStub}).Client;
	var sendCommandStub;
	var owfs = new Client("blablub",4304);
	before(function(){
		sendCommandStub=sinon.stub(communicationStub, "sendCommand");
		sendCommandStub.callsArgWith(1,[{payload:payloadResult}]);
	});
	describe('#dir()', function(){
		it('should send dir (4) command', function(done){
			owfs.dir("/some/path", function(){
				done();
			});
			assert.ok(sendCommandStub.called);
			sinon.assert.calledWith(sendCommandStub, sinon.match({ command: 4, server:"blablub", port:4304, path:"/some/path" }));
		});
		it('should pass 4 directories to callback', function(){
			owfs.dir("/some/path", function(directories){
				assert.ok(directories, "directories");
				assert.equal(directories.length, 4);
			});
		});
	});
});