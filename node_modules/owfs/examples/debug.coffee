Client = require('../src/owfs').Client
logger = require("winston")

logger.cli()

logger.remove(logger.transports.Console)
logger.add(logger.transports.Console, { level: 'debug', colorize:true })

owfs = new Client('localhost',4304)

owfs.dir '/',(err, directories)->
	logger.info directories

#owfs.read '/10.D8FE434D9855/temperature', (err,value)->
#	logger.info value