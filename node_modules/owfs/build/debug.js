(function() {
  var Client, logger, owfs;

  Client = require('./owfs').Client;

  logger = require("winston");

  logger.cli();

  logger.remove(logger.transports.Console);

  logger.add(logger.transports.Console, {
    level: 'debug',
    colorize: true
  });

  owfs = new Client('localhost', 4304);

  owfs.dir('/', function(err, directories) {
    return logger.info(directories);
  });

  owfs.read('/10.D8FE434D9855/temperature', function(err, value) {
    return logger.info(value);
  });

}).call(this);

//# sourceMappingURL=debug.js.map
