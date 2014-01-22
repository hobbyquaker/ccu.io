var adapterWords = {
  "false":             {"en": "false",             "de": "nein",            "ru": "нет"},
  "true":              {"en": "true",              "de": "ja",              "ru": "да"},
  "Enabled:":          {"en": "Enabled:",          "de": "Aktiviert:",      "ru": "Активно:"},
  "Polling interval:": {"en": "Polling interval (sec):", "de": "Pollintervall (sek):",     "ru": "Интервал сканирования (сек):"},
  "IP address":        {"en": "IP address",        "de": "IP-Adresse",      "ru": "IP адрес"},
  "Name":              {"en": "Name",              "de": "Name",            "ru": "Имя"},
  "Rooms":             {"en": "Rooms",             "de": "Zimmern",         "ru": "Комнаты"},
  "Functions":         {"en": "Functions",         "de": "Gewerke",         "ru": "Раздел"},
  "Favorites":         {"en": "Favorites",         "de": "Favorites",       "ru": "Избранное"},
  "Description":       {"en": "Description",       "de": "Beschreibung",    "ru": "Описание"},
  "Description text":  {
    "en": "Ping adapter allows to scan IP devices in the local network.<br>"
         +"From 70100 the Object \"PING.<IP>.STATE\" will be created for every Device in the list. This object consists the state of the device as true or false.<br>"
         +"Only operation systems with enabled \"ping\" command are supported as CCU.IO host: Linux, Windows, MacOS."
         +"All devices, that support ICMP protocol, can be scaned by this adapter."
         
    "de": "Ping adapter allows to scan IP devices in the local network.<br>"
         +"Ab 70100 wird für jedes Gerät ein Objekt PING.<IP>.STATE erzeugt, welches den Gerätenzustand als \"true\" oder \"false\" hat.<br>"
         +"Es sind die Systeme für CCU.IO, die \"ping\"-Befehl haben, unterstützt: Linux, Windows, MacOS.<br>"
         +"Alle Geräte, die ICMP Protokoll unterstützen, können mit diesem Adapter geskännt werden."
         
    "ru": "Ping драйвер позволяет сканировать устройства в локальной сети. Для этого используется ICMP протокол.<br>"
         +"Начиная с номера 70100 для каждого устройства создается объект \"PING.<IP>.STATE\",содержащий состояние устройства, как true или false.<br>"
         +"Только системы с установленной командой ping поддерживаются для CCU.IO: Linux, Windows, MacOS.<br>"
         +"Все устройства, поддерживающие ICMP, могут быть просканированны этим драйвером."
   }
};
