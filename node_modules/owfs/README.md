[![Build Status](https://travis-ci.org/benediktarnold/owfs.png?branch=master)](https://travis-ci.org/benediktarnold/owfs) [![david-dm][2]][1]
  [1]: https://david-dm.org/benediktarnold/owfs
  [2]: https://david-dm.org/benediktarnold/owfs.png
owfs
====

A [node.js](nodejs.org) client library to owserver [Documentation & protocol specs](http://www.owfs.org)

Installation
============
	npm install owfs

Examples
========

First of all you need a connection to a running owserver:

	var Client = require("owfs").Client;
	var con = new Client(HOST,PORT);

read
----
Reads a value of the specified path and passes the value to the callback.

	con.read("/10.E89C8A020800/temperature", function(result){
		console.log(result);
	})

write
-----
Writes a value to the specified path and passes the raw owserver message to the callback.

	con.write("/10.E89C8A020800/temperature",1,function(message){
		console.log(message)
	})

Directory listings
==================
According to [OWFS message types](http://owfs.org/index.php?page=owserver-message-types) there are several methods for directory listings. They all have the same argument list but behave a bit different.

Lists all the children of the supplied path as an array passed to the callback.

	con.dir("/",function(directories){
		console.log(directories);
	})

	con.dirall("/",function(directories){
		console.log(directories);
	})

	con.get("/",function(directories){
		console.log(directories);
	})

	con.dirallslash("/",function(directories){
		console.log(directories);
	})

	con.getslash("/",function(directories){
		console.log(directories);
	})
