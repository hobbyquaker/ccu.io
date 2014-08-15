//--------------------------------- Function cliProcessCommand ---------------------------------//
//Поиск полученной (в буфере) команды в таблице команд. Если команда найдена, то происходит
//её вызов, если искомой команды нет - вывод сообщения об ошибки.

void cliProcessCommand(WebServer &server) {
  int bCommandFound = false;
  int idx;

  gParamValue = strtol(gParamBuffer, NULL, 0); // Конвертируем параметр в тип данных integer, если параметр пуст gParamValue = 0.
  for (idx = 0; gCommandTable[idx].name != NULL; idx++) { // Ищем команду в таблице пока не найдем или пока не достигнем конца таблицы. Если находим - выход из цикла.
    if (strcmp(gCommandTable[idx].name, gCommandBuffer) == 0) {
      bCommandFound = true;
      break;
    }
  }

  if (bCommandFound == true) { // Если команда найдена (в массиве команд), то выполняем ее. Если нет - игнорируем
    (*gCommandTable[idx].function)(server);
  }
  else { // Команда не найдена
    server.print("ERROR: Command not found");
  }
}
//------------------------------- End Function cliProcessCommand -------------------------------//


//----------------------------------- Functions of commands ------------------------------------//
//Поиск полученной (в буфере) команды в таблице команд. Если команда найдена, то происходит

void commandsOn(WebServer &server) {
  if (gParamValue>=start_DO_pin && gParamValue<=end_DO_pin) {
    digitalWrite(gParamValue,HIGH);
  } else ErrorMessage(server);
}

void commandsOff(WebServer &server) {
  if (gParamValue>=start_DO_pin && gParamValue<=end_DO_pin) {
    digitalWrite(gParamValue,LOW);
  } else ErrorMessage(server);
}

void commandsClick(WebServer &server) {
  if (gParamValue>=start_DO_pin && gParamValue<=end_DO_pin) {
    digitalWrite(gParamValue,HIGH);
    delay(delayClick);
    digitalWrite(gParamValue,LOW);
  } else ErrorMessage(server);
}

void commandsLClick(WebServer &server) {
  if (gParamValue>=start_DO_pin && gParamValue<=end_DO_pin) {
    digitalWrite(gParamValue,HIGH);
    delay(delayLClick);
    digitalWrite(gParamValue,LOW);
  } else ErrorMessage(server);
}

void commandsStatus(WebServer &server) {
  if (strcmp(gParamBuffer, "ALL") == 0) { // выдать состояние всех пинов
    for(int i=start_DO_pin;i<=end_DO_pin;i++) {
      int st=digitalRead(i);
      server.print("DO");
      server.print(i);
      server.print("=");
      server.print(st);
      server.print("&");
    }
  } else { // выдать состояние только 1 пина
    if (gParamValue>=start_DO_pin && gParamValue<=end_DO_pin) {
      server.print("DO");
      server.print(gParamValue);
      server.print("=");
      server.print(digitalRead(gParamValue));
      } else ErrorMessage(server);
  }
}

void commandsHelp(WebServer &server) {
  int idx;
  for (idx = 0; gCommandTable[idx].name != NULL; idx++) {
    server.print(gCommandTable[idx].name);
    server.print("<br>");
  }
}

void ErrorMessage(WebServer &server) {
    server.print("ERROR: This Pin is not configured for I/O");
}

