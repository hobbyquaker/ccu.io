/**
* Контроллер-исполнительное устройство (к проекту CCU.IO)
* Platform: Arduino UNO R3 + EthernetShield W5100
* IDE: Arduino 1.0.5-r2
* Date: 26.08.2014
* Version: 0.3
* Size: 29 500 byte (32 256 byte max)
*
* 1. Обращение по http://xx.xx.xx.xx/ выдаст справочную информацию по этому устройству (нужно для того, чтобы когда обращаешься
*    по IP к устройству понять что это за контроллер и пр.)
*
* 2. Все переменным, который передаются на сервер CCU.IO необходимо присвоить префикс:
*    - DI дискретный вход контроллера Arduino с порядковым номером реального порта (DI2 - Pin2), в функции void setup() помечается как pinMode (DI2, INPUT);
*    - DO дискретный выход контроллера с порядковым номером реального порта (DO5 - Pin5), в функции void setup() помечается как pinMode (DI2, OUTPUT);
*    - AI - аналоговый вход - любая переменная для вывода в CCU.IO - величина, измеренная датчиком, значение таймера и пр. (AITout - темп. наружного воздуха к примеру)
*
* 3. Обращение по http://xx.xx.xx.xx/data - вывод значений всех данных устройства.
*    В данной конфигурации это значение датчиков:
*    - BMP085 (Pout) давление в мм рт. ст.,
*    - DHT22 (Hout, Tout) влажность (%) и температура (град. С) снаружи,
*    - BH1750 (Lux) освещенность (lx) снаружи,
*    - DS18B20 (T1, T2, T3) - температуры в различных местах (град. С)
*    Так же в строку выводятся состояния всех объявленных цифровых портов ввода-вывода.
*    С конца добавляется переменная "Err" типа int - код ошибки (если нет ошибок - значение "0")
*    Формат вывода данных - строка вида: DI2=x&DI3=x&DI4=x&DO5=x&DO6=x&DO7=x&AIPout=XXX.X&AIHout=XX,X&AITout=XX.X&AILux=XXXXX&AIT1=xx,x&AIT2=xx,x&AIT3=xx,x&AIErr=xx
*    Потом эта строчка парсится в драйвере CCU.IO для обновления внутренних переменных соласно таблицы настроек драйвера, так же CCU.IO запрашивает эту строку
*    для конфигурирования драйвера. При изменении конфигурации контроллера (в строку добавятся новые переменные) - необходимо из CCU.IO заново запросить конфиг.
*
* 3. Обращение по http://xx.xx.xx.xx/state - вывод только состояний всех объявленных цифровых портов ввода-вывода.
*    Формат вывода данных - строка вида: DI2=x&DI3=x&DI4=x&DO5=x&DO6=x&DO7=x
*
* 4. Обращение по http://xx.xx.xx.xx/sensors - вывод только значений объвяленных датчиков и необходимых переменных.
*    Формат вывода данных - строка вида: AIPout=XXX.X&AIHout=XX,X&AITout=XX.X&AILux=XXXXX&AIT1=xx,x&AIT2=xx,x&AIT3=xx,x
*
* 5. Управление состоянием цифровых портов DO5 - DO7.
*    Типовой запрос на управление: http://xx.xx.xx.xx/command?name=value где
*    name - имя порта, к примеру DO5 (ALL - все объявленные порты)
*    value - параметр команды (ON-включить, OFF-выключить, CLICK - кратковременно (1сек) включить, LCLICK - кратковременно (3сек) включить, STATUS - состояние)
*    Примеры - смотри далее "Таблица команд"
**/

//------------------------------------------ Libraries ------------------------------------------//
//Подключаем библиотеки для работы с сетью Ethernet.
#include <Ethernet.h>
#include <SPI.h>
#include "WebServer.h" // Webduino https://github.com/sirleech/Webduino
//Подключаем библиотеки для работы с различными сенсорами.
#include <Wire.h> //https://github.com/arduino/Arduino/tree/master/libraries/Wire
#include <Adafruit_BMP085.h> //https://github.com/adafruit/Adafruit-BMP085-Library 
#include <dht.h> //https://github.com/RobTillaart/Arduino/tree/master/libraries/DHTlib
#include <BH1750.h> //https://github.com/claws/BH1750
#include <OneWire.h> //http://playground.arduino.cc/Learning/OneWire
#include <DallasTemperature.h> //https://github.com/milesburton/Arduino-Temperature-Control-Library
//---------------------------------------- End libraries ----------------------------------------//


//------------------------------------ Discrete inputs/outputs ----------------------------------//
//Глобальные константы для работы с дискретными портами Arduino.
#define delayClick 1000 // задержка при обычном CLICK
#define delayLClick 3000 // задержка при длинном LCLICK

//Объявляем порты ввода-вывода
//DI2, DI3, DI4 - порты цифрового ввода
//DO5, DO6, DO7 - порты цифрового вывода
const int start_DI_pin = 2;
const int end_DI_pin   = 4;
const int start_DO_pin = 5;
const int end_DO_pin   = 7;

//Объявляем переменные состояний (текущих и на предыдущем цикле) портов DI
int DI[7]     = {0, 0, 0, 0, 0, 0, 0};
int old_DI[7] = {0, 0, 0, 0, 0, 0, 0};
//---------------------------------- End discrete inputs/outputs --------------------------------//

//------------------------------------------- Ethernet ------------------------------------------//
//Глобальные константы для работы с сетью
byte mac[] = { 0xDE, 0xAD, 0xBE, 0xE4, 0xDE, 0x35 }; // MAC-адрес нашего устройства
byte ip[] = { 192, 168, 69, 52 }; // IP-адрес нашего контроллера - Arduino
#define R_PORT  8085 //Порт для обращения к CCU.IO на изменение состояния порта DI не дожидаясь запроса
byte rserver[] = { 192, 168, 69, 50 }; //IP-адрес сервера CCU.IO
//----------------------------------------- End ethernet ----------------------------------------//

//-------------------------------------- Web-server/client --------------------------------------//
//Глобальные констранты для вывода HTML-странички "Об устройстве"
#define VERSION_STRING "0.2"
#define COMPILE_DATE_STRING "2014-08-06"
P(Page_info) = "<html><head><title>CCU.IO Arduino - controller " VERSION_STRING "</title></head><body>\n";
P(location_info) = "underground server room";
P(pin_info) = "A4,A5-I2C (bmp085, BH1750)<br>P2-P4 DI, P5-P7 DO<br>P9 - DHT22, P8 - 1-wire (DS18B20)";
P(version_info) = VERSION_STRING ". Compile date: " COMPILE_DATE_STRING "</body></html>";

//Объявляем веб-сервер и клиент
#define PREFIX ""
WebServer webserver(PREFIX, 80);
EthernetClient client;

//Глобальные константы для парсинга команд
#define MAX_COMMAND_LEN (10)
#define MAX_PARAMETER_LEN (10)
#define COMMAND_TABLE_SIZE (8)

#define NAMELEN 32
#define VALUELEN 32
char gCommandBuffer[MAX_COMMAND_LEN + 1];
char gParamBuffer[MAX_PARAMETER_LEN + 1];
long gParamValue;

//Вызов функции управления DO в соответствии с командой и параметром 
typedef struct {
  char const *name;
  void (*function)(WebServer &server);
} command_t;

//Таблица команд
command_t const gCommandTable[COMMAND_TABLE_SIZE] = {
// {"LED", commandsLed, },
  {"HELP", commandsHelp, }, // Выводит список комманд (вызов http://xx.xx.xx.xx/command?DO5=HELP )
  {"ON", commandsOn, }, // Устанавливает "1" на заданном цифровом порту DO5 (вызов http://xx.xx.xx.xx/command?DO5=ON )
  {"OFF", commandsOff, }, // Устанавливает "0" на заданном цифровом порту DO5 (вызов http://xx.xx.xx.xx/command?DO5=OFF )
  {"STATUS", commandsStatus, }, // Получить состояние цифрового порта DO5 (DO5=0 или DO5=1) (вызов http://xx.xx.xx.xx/command?DO5=STATUS ),
                                    // если вместо номера порта передать ALL (вызов http://xx.xx.xx.xx/command?DOALL=STATUS ), то получим состояние всех портов DO (Пример вывода DO5=0&DO6=0&DO7=0&)
  {"CLICK", commandsClick, }, // Кратковременная "1" на порту DO5 (время настраивается) (вызов http://xx.xx.xx.xx/command?DO5=CLICK )
  {"LCLICK", commandsLClick, }, // Кратковременная "1" на порту DO5 (время настраивается) (вызов http://xx.xx.xx.xx/command?DO5=LCLICK )
  {NULL, NULL }
};

//Буфер для передачи HTTP-запроса SET от Arduino (клиент) на CCU.IO (сервер)
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
//Дефолтная страница, вывод HTML-странички "Об устройстве"
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
//Парсинг команды с последующим присвоением команды переменной gCommandBuffer и значения переменной gParamBuffer
//Вывзов функции обработки команд с с ипользованием команды и параметров из буферных переменных gCommandBuffer и gParamBuffer
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
    while (strlen(url_tail)) // Разбор URI на составные части (выборка параметров)
      {
      rc = server.nextURLparam(&url_tail, name, NAMELEN, value, VALUELEN);
      if (rc == URLPARAM_EOS) {
  // server.printP(Params_end);
      }
       else // Получили параметр (name) и его значение (value)
        {
        // Выполняем команды
        strcpy (gCommandBuffer, value); // В буфер gCommandBuffer команду
        strcpy (gParamBuffer, &name[2]); // В буфер gParamBuffer параметры (значение) за исключением первых 2х символов - DO
        cliProcessCommand(server); // Передаем управление функции обработки команд
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
//Исполняет команду commandsStatus с передачей параметра "ALL".
//Просто вывод состояния всех портов Arduino, помеченных как DO
void stateRequest(WebServer &server, WebServer::ConnectionType type, char *url_tail, bool tail_complete)
{
  server.httpSuccess(); // this line sends the standard "we're all OK" headers back to the browser
  strcpy (gParamBuffer, "ALL");
  commandsStatus(server);
}
//-------------------------------- End Web-command stateRequest --------------------------------//


//----------------------------------- Web-command dataRequest ----------------------------------//
//Функция отправляет на сервер все данные, что описаны в дравере CCU.IO
void dataRequest(WebServer &server, WebServer::ConnectionType type, char *url_tail, bool tail_complete)
{
  server.httpSuccess(); // this line sends the standard "we're all OK" headers back to the browser
  getSensors(); //Запрашиваем значения всех сенсоров
  //Выводим в ответ значение всех сенсоров и необходимых переменных
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
  //Выводим состояния всех объявленных цифровых портов ввода-вывода
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
//Функция отправляет на сервер все данные, что описаны в дравере CCU.IO
void sensorsRequest(WebServer &server, WebServer::ConnectionType type, char *url_tail, bool tail_complete)
{
  server.httpSuccess(); // this line sends the standard "we're all OK" headers back to the browser
  getSensors(); //Запрашиваем значения всех сенсоров
  //Выводим в ответ значение всех сенсоров и необходимых переменных
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
  //Объявляем порты Digital inputs/outputs
  for(int i=start_DI_pin;i<=end_DI_pin;i++) { pinMode (i, INPUT); }
  for(int i=start_DO_pin;i<=end_DO_pin;i++) { pinMode (i, OUTPUT); }

  Ethernet.begin(mac, ip); // Инициализируем Ethernet Shield
  webserver.setDefaultCommand(&infoRequest); // дефолтная страница вывода (информация о контроллере)
  webserver.addCommand("command", &parsedRequest); // команды
  webserver.addCommand("state", &stateRequest); // выдать состояния всех портов, помеченных как DO
  webserver.addCommand("data", &dataRequest); // выдать все данные одним потоком (переменные, порты DI и DO)
  webserver.addCommand("sensors", &sensorsRequest); // выдать все переменные (измерения), состояния сенсоров
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
  webserver.processConnection(buff, &len); // Ожидание входящих соединений
  checkDI(); //Проверка состояний цифровых портов DI, при изменении - отправка на сервер CCU.IO нового значения
}
//---------------------------------------- End void loop ---------------------------------------//
