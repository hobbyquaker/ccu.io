var Client = require("../build/owfs").Client;
var net = require("net");
var argv = require('optimist').argv,
	logger = require("winston");

logger.cli();

logger.remove(logger.transports.Console);
logger.add(logger.transports.Console, { level: 'debug', colorize:true });

var HOST = argv.host?argv.host:'localhost';
var PORT = argv.port?argv.port:4304;
logger.info("Connecting to "+HOST+":"+PORT);
var owfs = new Client(HOST, PORT);

owfs.dir('/', function(err, result){
	logger.info("dir",result);
});

/*owfs.get('/', function(err, result){
	logger.info("get",result);
});

owfs.getslash('/', function(err, result){
	logger.info("getslash",result);
});*/

/*owfs.read('/10.6CC351E220AE/temperature', function(err, result){
	logger.info("Result 1: "+result);
});*/

/*owfs.read('/10.A7F1D92A82C/temperature', function(err, result){
	logger.error("Error: ",err);
	logger.info("No result",result);
});*/


