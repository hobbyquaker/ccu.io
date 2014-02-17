About
=====
Interface to the Raspberry Pi Piface board using Node.js.  This addon shouldn't require any sudo or root privileges to run, as long as your user is in the "spi" group on your Pi (handled by the spidev-setup script).

Installation
============
Assuming a fresh Raspbian install, there are three steps to getting a project off the ground with piface-node.
  - Get Node.js
  - Get the Piface C libraries
  - Get the piface-node module with NPM

Get Node.js
-----------
It's not quite as easy to install [Node.js](http://nodejs.org/) on a Raspberry Pi as it is on other platforms, so you might need to dig around to find the newest available version for the Pi's architecture.  At the time I write this, the latest available packaged build for Raspberry Pi is [v0.10.21](http://nodejs.org/dist/v0.10.21/node-v0.10.21-linux-arm-pi.tar.gz).

```bash
$ wget http://nodejs.org/dist/v0.10.21/node-v0.10.21-linux-arm-pi.tar.gz
$ tar -zxvf node-v0.10.21-linux-arm-pi.tar.gz
$ sudo mkdir /opt/node
$ sudo cp -r node-v0.10.21-linux-arm-pi/* /opt/node
```

At this point, you probably don't need the node distribution files after installation, as the important stuff got copied into /opt/node.  To free up disk space, I like to remove both the tarfile and the extracted files, but that's entirely your choice.

Add the Node.js path to your default profile.  Use nano instead of vi if you like, but vi is old-school and awesome.  If you want to impress your friends, learn how to use vi ;)
```bash
$ sudo vi /etc/profile
```

Add the following lines to the configuration file before the ‘export’ command.
```
NODE_JS_HOME="/opt/node"
PATH="$PATH:$NODE_JS_HOME/bin"
export PATH
```

Log out and back in again for the /etc/profile changes to take effect.

Make sure your SPI driver is loaded
-----------------------------------
If this is the first time you've plugged in your Piface board, you'll need to update the modprobe configuration so that it loads the SPI driver.  This will enable the driver on reboot.

```bash
$ sudo nano /etc/modprobe.d/raspi-blacklist.conf
```

Insert a hash (#) at the beginning of the line containing spi-bcm2708, so it reads:

```
#spi-bcm2708
```

...And reboot to make it take effect.


Get the Piface C libraries
--------------------------
First, you'll need the C libraries, available [here](https://github.com/thomasmacpherson/piface).  Follow the "C" library installation, naturally.

The TL;DR version:
```bash
$ sudo apt-get update
$ sudo apt-get install automake libtool git
$ git clone https://github.com/thomasmacpherson/piface.git
$ cd piface/c
$ ./autogen.sh && ./configure && make && sudo make install
$ sudo ldconfig
$ cd ../scripts
$ sudo ./spidev-setup
```

Get the piface-node module with NPM
-----------------------------------
```bash
$ mkdir ~/my_project
$ cd ~/my_project
$ npm install piface-node
```

Using piface-node
=================
I've intended this to be used with the full awesome power of Node's EventEmitter.  You can easily wire up the physical I/O on the Piface with pretty much anything.

Here's a basic example of the usage, in lieu of actual documentation.  There are also a few examples in the examples folder.
```js
var pfio = require('piface-node');
pfio.init();
pfio.digital_write(0,1); // (pin, state)
var foo = pfio.digital_read(0); // (pin; returns state)
pfio.deinit();
```

```js
var pfio = require('piface-node');
pfio.init();
var foo = pfio.read_input(); // bit-mapped
pfio.write_output(255); // that's binary 11111111, so it'll turn all outputs on.
pfio.deinit();
```

The Examples Folder
-------------------
Everything in the example application is modular and decoupled: most of the components don't even know that the other ones exist. They only communicate through the EventBus. All that example.js does is start up those modules.  The example application watches for changes on the input pins, and echoes them to the output pins.  Try it out by pressing the tactile switches.

```bash
$ cd node_modules/piface-node/examples
$ node example.js
````
