net = require 'net'
ntohl = require('network-byte-order').ntohl
htonl = require('network-byte-order').htonl
debug = require('debug')('owfs:communication')

header_props = ["version","payload", "ret", "controlflags", "size", "offset"]

sendCommandToSocket = (options, socket, callback) ->
	messages = []
	path = options.path
	called = false
	callbackOnce = (error, data) ->
		if !called
			callback(error, data)
			called = true

	socket.on 'error', (error) ->
		debug error
		callbackOnce(error)

	socket.on 'end', ->
		callbackOnce(null, messages)

	socket.on 'data', (data) ->
		header = {}
		for header_prop,i in header_props
			value = ntohl(data, i*4)
			header[header_prop] = value

		payload = data.slice(24).toString('utf8')
		message =
			header: header
			payload: payload
		debug "Receiving header",header
		debug "Receiving payload",payload
		if header.ret < 0
			callbackOnce
				msg: "Communication Error. Received #{header.ret}"
				header: header
				options: options
		messages.push(message)

	socket.connect options.port, options.server, ->
		debug "Sending",options
		data_len = 8192
		msg = new Buffer(24+path.length+1)
		htonl(msg, 0, 0) #version
		htonl(msg, 4, path.length + 1) #payload length
		#type of function call http://owfs.org/index.php?page=owserver-message-types
		htonl(msg, 8, options.command)
		htonl(msg, 12, 0x00000020) #format flags -- 266 for alias upport
		htonl(msg, 16, data_len) #size of data element for read or write
		htonl(msg, 20, 0)
		bytesWritten = msg.write(path,24)
		msg.write("\x00", 24+bytesWritten)
		socket.end(msg)


sendCommand = (options, callback) ->
	socket = new net.Socket({type: 'tcp4'} )
	sendCommandToSocket(options, socket, callback)

exports.sendCommand = sendCommand
exports.sendCommandToSocket = sendCommandToSocket