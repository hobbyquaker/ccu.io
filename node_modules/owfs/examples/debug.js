var Client = require("../lib/owfs").Client;
var net = require("net");
var argv = require('optimist').argv;

var HOST = argv.host?argv.host:'raspberrypi';
var PORT = argv.port?argv.port:4304;
console.log("Connecting to "+HOST+":"+PORT);
var owfs = new Client(HOST, PORT);

owfs.dir('/', function(result){
	console.log("dir",result);
});

owfs.read('/22.8CE2B3471711/temperature', function(result){
	console.log("Result 1: "+result);
})

owfs.read('/10.67C6697351FF/temperature', function(result){
	console.log("Result 2: "+result);
});


