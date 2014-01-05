var logger   = require(__dirname+'/../../logger.js'),
	commands = require(__dirname+'/langModel.js')
 
process.send (commands);

process.exit();
