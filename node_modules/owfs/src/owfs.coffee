#require 'coffee-script'
basecommunication = require './base/communication'
convert = require './base/convert'

class Client
	constructor: (@server, @port=4304, @communication=basecommunication) ->

	_dir: (path,fun, callback) ->
		command =
			path: path
			command: fun
			server: @server
			port: @port
		@communication.sendCommand(command, convert.extractDirectories(callback))

	read: (path, callback) ->
		command =
			path: path
			command: 2
			server: @server
			port: @port
		@communication.sendCommand(command, convert.extractValue(callback))

	write: (path, payload, callback) ->
		command =
			path: path + "\u0000" + payload
			command: 3
			server: @server
			port: @port
		@communication.sendCommand(command, callback)

	dir: (path, callback) ->
		this._dir(path, 4, callback)

	dirall: (path, callback) ->
		this._dir(path, 7, callback)

	get: (path, callback) ->
		this._dir(path, 8, callback)

	dirallslash: (path, callback) ->
		this._dir(path, 9, callback)

	getslash: (path, callback) ->
		this._dir(path, 10, callback)


exports.Client = Client
