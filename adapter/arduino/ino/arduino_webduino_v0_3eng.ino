/**
* Arduino adapter (project CCU.IO)
* Platform: Arduino UNO R3 + EthernetShield W5100
* IDE: Arduino 1.0.5-r2
* Date: 26.08.2014
* Version: 0.3
* Size: 29 532 byte (32 256 byte max)
*
* 1. The call of http://xx.xx.xx.xx/ will give background information of this device 
*    (Required to find out what the device is on this IP address)
*
* 2. All variables that are passed to the CCU.IO must have prefix in the name:
*    - DI digital input controller Arduino with serial number real port (DI2 - Pin2), in the function "void setup()" is marked as pinMode (DI2, INPUT);
*    - DO-discrete output controller with a serial number real port (DO5 - Pin5), in the function "void setup()" is marked as pinMode (DI2, OUTPUT);
*    - AI - analog input - any variable for output in CCU.IO is a value measured by the sensor, the timer value and other (AITout tempo. outdoor air for example)
*
* 3. The call of http://xx.xx.xx.xx/data will output values of all ports.
*    In this configuration following sensor data will be provided:
*    - BMP085 (Pout) is the pressure in mm Hg,
*    - DHT22 (Hout, Tout) humidity (%) and temperature (C)
*    - BH1750 (Lux) illuminance (lx)
*    - DS18B20 (T1, T2, T3) - the temperature at various locations (C)
*    Also the status of all announced digital input/output ports will be shown.
*    At the end the variable "Err"(int) - error code wil lbe added. (if there is no error - 0) - not yet implemented.
*    The output format is a string of the form: DI2=x&DI3=x&DI4=x&DO5=x&DO6=x&DO7=x&AIPout=XXX.X&AIHout=XX,X&AITout=XX.X&AILux=XXXXX&AIT1=xx,x&AIT2=xx,x&AIT3=xx,x&AIErr=xx
*    This line will beparsed in the driver CCU.IO to update internal variables based on the table of the driver settings, as well CCU.IO requests this line
*    to configure the driver. When changing the configuration of the controller (in a row will be added new variables, we have to re-request the arduino config from CCU.IO.
*
* 4. The call of http://xx.xx.xx.xx/state - shows only difital inputs and outputs.
*    The output format is a string of the form: DI2=x&DI3=x&DI4=x&DO5=x&DO6=x&DO7=x
*
* 5. The call of http://xx.xx.xx.xx/sensors outputs only analog values.
*    The output format is a string of the form: AIPout=XXX.X&AIHout=XX,X&AITout=XX.X&AILux=XXXXX&AIT1=xx,x&AIT2=xx,x&AIT3=xx,x
*
* 6. The controll of the digital ports DO5 - DO7.
*    Standard request for control: http://xx.xx.xx.xx/command?name=value where
*    name - name of the port, for example DO5 (all declared ports)
*    value - the command parameter (ON-enable OFF-disable, CLICK - momentary (1sec) enable, LCLICK - short-term (3sec) enable, STATUS status)
*    Examples - see next table commands
*    Server CCU.IO makes a request "http://xx.xx.xx.xx/command?DO5=ON?DO5=STATUS (arduino responds DO5=1"), to determine the status of the port after the command - feedback.
**/

//------------------------------------------ Libraries ------------------------------------------//
//Link library for working with Ethernet.
#include <Ethernet.h>
#include <SPI.h>
#include "WebServer.h" // Webduino https://github.com/sirleech/Webduino
//Link library for working with different sensors.
#include <Wire.h> //https://github.com/arduino/Arduino/tree/master/libraries/Wire
#include <Adafruit_BMP085.h> //https://github.com/adafruit/Adafruit-BMP085-Library 
#include <dht.h> //https://github.com/RobTillaart/Arduino/tree/master/libraries/DHTlib
#include <BH1750.h> //https://github.com/claws/BH1750
#include <OneWire.h> //http://playground.arduino.cc/Learning/OneWire
#include <DallasTemperature.h> //https://github.com/milesburton/Arduino-Temperature-Control-Library
//---------------------------------------- End libraries ----------------------------------------//


//------------------------------------ Discrete inputs/outputs ----------------------------------//
//Global constants for working with discrete ports of the Arduino.
#define delayClick 1000 // задержка при обычном CLICK
#define delayLClick 3000 // задержка при длинном LCLICK

//Declaring ports inputs/outputs
//DI2, DI3, DI4 - digital input
//DO5, DO6, DO7 - ports digital outputconst 
int start_DI_pin = 2;
const int end_DI_pin   = 4;
const int start_DO_pin = 5;
const int end_DO_pin   = 7;

//Declare state variables (current and previous cycle) ports DI
int DI[7]     = {0, 0, 0, 0, 0, 0, 0};
int old_DI[7] = {0, 0, 0, 0, 0, 0, 0};
//---------------------------------- End discrete inputs/outputs --------------------------------//

//------------------------------------------- Ethernet ------------------------------------------//
//Global constants for networking
byte mac[] = { 0xDE, 0xAD, 0xBE, 0xE4, 0xDE, 0x35 }; // MAC-address device
byte ip[] = { 192, 168, 69, 52 }; // IP-address device
#define R_PORT  8085 //Port to access CCU.IO to change port status DI without waiting for the request
byte rserver[] = { 192, 168, 69, 50 }; //IP-address server CCU.IO
//----------------------------------------- End ethernet ----------------------------------------//

//-------------------------------------- Web-server/client --------------------------------------//
//Global constants for the output HTML page "About device"
#define VERSION_STRING "0.2"
#define COMPILE_DATE_STRING "2014-08-06"
P(Page_info) = "<html><head><title>CCU.IO Arduino - controller " VERSION_STRING "</title></head><body>\n";
P(location_info) = "underground server room";
P(pin_info) = "A4,A5-I2C (bmp085, BH1750)<br>P2-P4 DI, P5-P7 DO<br>P9 - DHT22, P8 - 1-wire (DS18B20)";
P(version_info) = VERSION_STRING ". Compile date: " COMPILE_DATE_STRING "</body></html>";

//Declare the web server and the client
#define PREFIX ""
WebServer webserver(PREFIX, 80);
EthernetClient client;

//Global constants for parsing commands
#define MAX_COMMAND_LEN (10)
#define MAX_PARAMETER_LEN (10)
#define COMMAND_TABLE_SIZE (8)

#define NAMELEN 32
#define VALUELEN 32
char gCommandBuffer[MAX_COMMAND_LEN + 1];
char gParamBuffer[MAX_PARAMETER_LEN + 1];
long gParamValue;

//Call control functions DO in accordance with the command and parameter
typedef struct {
  char const *name;
  void (*function)(WebServer &server);
} command_t;

//Table of commands
command_t const gCommandTable[COMMAND_TABLE_SIZE] = {
//{"LED", commandsLed, },
  {"HELP", commandsHelp, }, //Displays a list of commands (call http://xx.xx.xx.xx/command?DO5=HELP)
  {"ON", commandsOn, }, // Sets "1" to the digital port DO5 (call http://xx.xx.xx.xx/command?DO5=ON)
  {"OFF", commandsOff, }, // Sets the "0" on the digital port DO5 (call http://xx.xx.xx.xx/command?DO5=OFF)
  {"STATUS", commandsStatus, }, // Get the state of the digital port DO5 (DO5=0 or DO5=1) (call http://xx.xx.xx.xx/command?DO5=STATUS),
  // if instead of the port number to send ALL call http://xx.xx.xx.xx/command?DOALL=STATUS)you will get the status of all ports DO (Example output DO5=0&DO6=0&DO7=0)
  {"CLICK", commandsClick, }, // Short-term "1" in the port DO5 (time adjustable) (call http://xx.xx.xx.xx/command?DO5=CLICK)
  {"LCLICK", commandsLClick, }, // Short-term "1" in the port DO5 (time adjustable) (call http://xx.xx.xx.xx/command?DO5=LCLICK)  
  {NULL, NULL }
};

//Buffer to send HTTP request SET from the Arduino (client) on CCU.IO (server)
char buf[200];

//------------------------------------ End web-server/client ------------------------------------//


//------------------------------------------- Sensors -------------------------------------------//
Adafruit_BMP085 bmp085;
float Pout = 0;
dht DHT;
#define DHT22_PIN 9
float Hout = 0;
float Tout = 0;
BH1750 lightMeter;
unsigned int Lux = 0;
#define ONE_WIRE_BUS 8
OneWire oneWire(ONE_WIRE_BUS);
DallasTemperature DS_sensors(&oneWire);
DeviceAddress addr_T1 = { 0x28, 0x4A, 0xEB, 0x34, 0x05, 0x00, 0x00, 0x7D };
DeviceAddress addr_T2 = { 0x28, 0x45, 0x96, 0x34, 0x05, 0x00, 0x00, 0xD8 };
DeviceAddress addr_T3 = { 0x28, 0x0F, 0x72, 0x34, 0x05, 0x00, 0x00, 0xA7 };
float T1 = 0;
float T2 = 0;
float T3 = 0;
//----------------------------------------- End Sensors -----------------------------------------//

//###############################################################################################//
//########################################## Functions ##########################################//
//###############################################################################################//

//----------------------------------- Web-command infoRequest -----------------------------------//
//Default page, the HTML output pages "About device"
void infoRequest(WebServer &server, WebServer::ConnectionType type, char *url_tail, bool tail_complete)
{
  server.httpSuccess(); // this line sends the standard "we're all OK" headers back to the browser
  server.printP(Page_info);
  server.print("IP:");
  server.print(Ethernet.localIP());
  server.print("<br>Location:");
  server.printP(location_info);
  server.print("<hr>Pin info:<br>");
  server.printP(pin_info);
  server.print("<hr>Pin current state: ");
  for(int i=start_DI_pin;i<=end_DI_pin;i++) {
    int st=digitalRead(i);
    server.print("DI");
    server.print(i);
    server.print("=");
    server.print(st);
    server.print(";");
  }
  for(int i=start_DO_pin;i<=end_DO_pin;i++) {
    int st=digitalRead(i);
    server.print("DO");
    server.print(i);
    server.print("=");
    server.print(st);
    server.print(";");
    }
  server.print("<hr><a href='/data'>All value data</a>");
  server.print("<hr>Commands:<br>");
  commandsHelp(server);
  server.print("<hr>Version info: ");
  server.printP(version_info);
}
//--------------------------------- End web-command infoRequest --------------------------------//


//---------------------------------- Web-command parsedRequest ---------------------------------//
//Parsing the command, followed by the assignment command variable gCommandBuffer and the value of a variable gParamBuffer
//Function call processing commands using commands and parameters from the buffer variables gCommandBuffer and gParamBuffer
void parsedRequest(WebServer &server, WebServer::ConnectionType type, char *url_tail, bool tail_complete)
{
  URLPARAM_RESULT rc;
  char name[NAMELEN];
  int name_len;
  char value[VALUELEN];
  int value_len;

  server.httpSuccess(); // this line sends the standard "we're all OK" headers back to the browser

  /* if we're handling a GET or POST, we can output our data here.
  For a HEAD request, we just stop after outputting headers. */
  if (type == WebServer::HEAD)
    return;

  if (strlen(url_tail))
    {
    while (strlen(url_tail)) //Parse a URL into its component parts (selection of parameters)
      {
      rc = server.nextURLparam(&url_tail, name, NAMELEN, value, VALUELEN);
      if (rc == URLPARAM_EOS) {
  // server.printP(Params_end);
      }
       else //Received parameter (name) and its value (value)
        {
        //The command being executed
        strcpy (gCommandBuffer, value); // In the buffer gCommandBuffer command
        strcpy (gParamBuffer, &name[2]); // In the buffer gParamBuffer parameters (value) except for the first 2 characters - DO
        cliProcessCommand(server); // Pass the function control command processing
        }
      }
    }
/*
if (type == WebServer::POST)
{
server.printP(Post_params_begin);
while (server.readPOSTparam(name, NAMELEN, value, VALUELEN))
{
server.print(name);
server.printP(Parsed_item_separator);
server.print(value);
server.printP(Tail_end);
}
}
*/
}
//-------------------------------- End Web-command parsedRequest -------------------------------//


//---------------------------------- Web-command stateRequest ----------------------------------//
//Executes the command commandsStatus with passing a parameter to "ALL".
//Just output the status of all ports of the Arduino marked as DO
void stateRequest(WebServer &server, WebServer::ConnectionType type, char *url_tail, bool tail_complete)
{
  server.httpSuccess(); // this line sends the standard "we're all OK" headers back to the browser
  strcpy (gParamBuffer, "ALL");
  commandsStatus(server);
}
//-------------------------------- End Web-command stateRequest --------------------------------//


//----------------------------------- Web-command dataRequest ----------------------------------//
//Function sends to the server all the data that is described in drawere CCU.IO
void dataRequest(WebServer &server, WebServer::ConnectionType type, char *url_tail, bool tail_complete)
{
  server.httpSuccess(); // this line sends the standard "we're all OK" headers back to the browser
  getSensors(); //The required values of all sensors
  //Displaying in response to the value of all sensors and the necessary variables
  server.print("AIPout=");
  server.print(Pout, 1);
  server.print("&AIHout=");
  server.print(Hout);
  server.print("&AITout=");
  server.print(Tout);
  server.print("&AILux=");
  server.print(Lux);
  server.print("&AIT1=");
  server.print(T1);
  server.print("&AIT2=");
  server.print(T2);
  server.print("&AIT3=");
  server.print(T3);
  //Displaying the status of all announced digital port input/output
  for(int i=start_DI_pin;i<=end_DI_pin;i++) {
    int st=digitalRead(i);
    server.print("&DI");
    server.print(i);
    server.print("=");
    server.print(st);
    }
  for(int i=start_DO_pin;i<=end_DO_pin;i++) {
    int st=digitalRead(i);
    char my_st[5];
    itoa(st,my_st,10);
    server.print("&DO");
    server.print(i);
    server.print("=");
    server.print(st);
    }
  server.print("&AIErr=");
  server.print("1");
  
}
//---------------------------------- End Web-command dataRequest -------------------------------//


//--------------------------------- Web-command sensorsRequest ---------------------------------//
//The function sends to the server all the data that is described in drawere CCU.IO
void sensorsRequest(WebServer &server, WebServer::ConnectionType type, char *url_tail, bool tail_complete)
{
  server.httpSuccess(); // this line sends the standard "we're all OK" headers back to the browser
  getSensors(); //The required values of all sensors
  //Displaying in response to the value of all sensors and the necessary variables
  server.print("AIPout=");
  server.print(Pout);
  server.print("&AIHout=");
  server.print(Hout);
  server.print("&AITout=");
  server.print(Tout);
  server.print("&AILux=");
  server.print(Lux);
  server.print("&AIT1=");
  server.print(T1);
  server.print("&AIT2=");
  server.print(T2);
  server.print("&AIT3=");
  server.print(T3);
}
//-------------------------------- End Web-command sensorsRequest ------------------------------//


//------------------------------------------ Void setup ----------------------------------------//
void setup() {
  //Declare ports Digital inputs/outputs
  for(int i=start_DI_pin;i<=end_DI_pin;i++) { pinMode (i, INPUT); }
  for(int i=start_DO_pin;i<=end_DO_pin;i++) { pinMode (i, OUTPUT); }

  Ethernet.begin(mac, ip); // Initialize The Ethernet Shield
  webserver.setDefaultCommand(&infoRequest); // default page output (information controller)
  webserver.addCommand("command", &parsedRequest); // commands
  webserver.addCommand("state", &stateRequest); // to give the status of all ports that are marked as DO
  webserver.addCommand("data", &dataRequest); // to give all the data by one thread (variables, ports DI and DO)
  webserver.addCommand("sensors", &sensorsRequest); // to give all variables (measurements), the state of the sensors
  webserver.begin();
  
  bmp085.begin();
  lightMeter.begin();
  DS_sensors.begin();
  DS_sensors.setResolution(addr_T1, 12);
  DS_sensors.setResolution(addr_T2, 12);
  DS_sensors.setResolution(addr_T3, 12);
}
//---------------------------------------- End void setup --------------------------------------//



//------------------------------------------ Void loop -----------------------------------------//
void loop() {
  char buff[64];
  int len = 64;
  webserver.processConnection(buff, &len); // Waiting for incoming connections
  checkDI(); //Check state digital ports DI, when the change is sent to the server CCU.IO new value
}
//---------------------------------------- End void loop ---------------------------------------//
