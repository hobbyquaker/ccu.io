//--------------------------------------- Function checkDI -------------------------------------//
// Обработка состояний цифровых входов №0(DI0) - №3(DI[3]). При изменении отсылка на сервер.
void checkDI() {
	for (int i = start_DI_pin; i <= end_DI_pin; i++) {
		// Цифровой вход pinX DIX.-----------------------------------------------------------------
		DI[i] = digitalRead (i);
		if (DI[i] != old_DI[i]) {
		  old_DI[i] = DI[i];
		  sprintf(buf, "GET /?DI%i=%i", i, DI[i]);
 		  sendHTTPRequest();
		}
	}
}
//------------------------------------- End function checkDI -----------------------------------//


//----------------------------------- Function sendHTTPRequest ---------------------------------//
// Функция отправки HTTP-запроса на сервер
void sendHTTPRequest() {
  if (client.connect(rserver, R_PORT)) {
    client.print(buf);
    client.println (" HTTP/1.0");
    client.println("Host: 192.168.69.52");
    client.print("Content-Type: text/html\n");
    client.println("Connection: close\n");
    delay(10);
    client.stop();
  } else {
    }
}
//--------------------------------- End Function sendHTTPRequest -------------------------------//
