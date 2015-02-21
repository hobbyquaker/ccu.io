debug = require("debug")("owfs:convert")
exports.extractValue = (callback) ->
	(error, messages) ->
		if !error
			if messages.length > 1
				debug "Received multiple messages in simple read",messages
				messageToUse = messages.filter (message) ->
					debug "Checking Header payload > 0",message.header.payload
					message.header.payload > 0
			else
				messageToUse = messages
			debug "message to use",messageToUse
			if messageToUse.length > 0
				result = messageToUse[0].payload.replace(new RegExp(" ", "g"), "")
				callback(error, result)
			else
				callback
					msg: "No usable messages received, but no error returned."
		else
			callback(error)

extractDirectoriesFromMessage = (message)->
	if not not message.payload
		exp = new RegExp("[\u0000-\u001F]", "g")
		lines = message.payload.replace(exp, "").split(" ")
		lines = lines.filter (line)->
			not not line
		lines.join(",").split ","
	else
		[]

exports.extractDirectories = (callback) ->
	debug "extractDirectories"
	(err, messages) ->
		debug messages
		if !err
			directories = messages.map extractDirectoriesFromMessage
			debug "extracted directories",directories
			callback(err, [].concat directories...)
		else
			callback(err)
