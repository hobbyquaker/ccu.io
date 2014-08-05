
var net = require('net');
var events = require("events");
var sys = require("sys");

function screen(name){
  var self = this;
  self.screen_name = name
  this.socket.write("screen_add screen\n");
  this.socket.write("screen_set screen name {screen}\n");
  this.socket.write("screen_set screen heartbeat on\n");
  this.socket.write("screen_set screen priority 2\n");
  this.socket.write("screen_set screen backlight on\n");
}
function widget(name) {
  this.socket.write("widget_add screen " + name + " string\n");
}
function widget_val(name, x, y,value) {
  this.socket.write("widget_set screen " + name + " " + x + " " + y + " {" + value +"}\n");
}
function init() {
  var self = this;
  this.socket = new net.Socket();
  this.socket.connect(this.host, this.port, function() {
    this.write("hello\n");
    self.emit('init');
  });
    

  this.socket.on('data', function(d) {
    data_str = d.toString();
    params = data_str.split(' ');
    if (params[0] == 'connect')
    {
      for (i=1;i< params.length;i++)
      {
        if (params[i - 1] == 'wid')
        {
          self.width = params[i];
        }
        if (params[i - 1] == 'hgt')
        {
          self.height = params[i];
        }
      }
      self.socket.write("client_set name {NODEJS}\n");
      //self.on('data',function(d) { console.log(d);});
      self.emit('ready');
    }
    });
}

exports.LcdClient = function( p_host, p_port) {
  this.width=0;
  this.height= 0;
  this.host= p_host;
  this.port= p_port;
  this.socket= null;
  this.init= init;
  this.screen = screen;
  this.widget = widget;
  this.widget_val = widget_val;
};
sys.inherits(exports.LcdClient, events.EventEmitter);



