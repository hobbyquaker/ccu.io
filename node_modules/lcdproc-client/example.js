var Client = require('node-rest-client').Client;
var LcdClient = require('./lcdproc-client.js').LcdClient;

var cnt = 0;

lc = new LcdClient(13666,'localhost');

function update_display() {
  lc.widget_val("second_line",1,2,"COUNT " + cnt);
  cnt = cnt + 1;
  console.log("CNT");
}


lc.on('init', function() {console.log("HI");});
lc.on('ready', function() {
  console.log("WIDTH: " + lc.width);
  console.log("HEIGHT: " + lc.height);
  lc.screen("bacon");
  lc.widget("first_line");
  lc.widget_val("first_line",1,1,"This is a line");
  lc.widget("second_line");
  lc.widget_val("second_line",1,2,"This is a second line");
  setInterval(update_display, 3000);
});
lc.init();


