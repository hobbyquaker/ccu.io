convert = require "../src/base/convert"
assert = require "assert"

wrong = 
	header:
		version: 0
		payload: -1
		ret: 0
		controlflags: 0
		size: 0
		offset: 0
	payload: ''

withoutPayload = 
	header:
		version: 0
		payload: -1
		ret: 0
		controlflags: 0
		size: 0
		offset: 0

correct = 
	header:
		version: 0
		payload: 12
		ret: 12
		controlflags: 32
		size: 12
		offset: 0
	payload: '      22.375'

check = (done)->
	(err,result)->
		assert.equal result,22.375
		done()

describe "extractValue", ->
	it "should extract the value from one correct and one wrong message", (done)->
		messages = [ correct, wrong ]
		convert.extractValue(check(done))(null,messages)

	it "should extract the value from one wrong and one correct message", (done)->
		messages = [ wrong, correct ]
		convert.extractValue(check(done))(null,messages)

	it "should extract the value from a message with undefined payload and one correct message", (done)->
		messages = [ withoutPayload, correct ]
		convert.extractValue(check(done))(null,messages)