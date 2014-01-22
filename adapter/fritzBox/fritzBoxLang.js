var adapterWords = {
  "false":             {"en": "false",             "de": "nein",            "ru": "нет"},
  "true":              {"en": "true",              "de": "ja",              "ru": "да"},
  "Enabled:":          {"en": "Enabled:",          "de": "Aktiviert:",      "ru": "Активно:"},
  "IP address:":       {"en": "IP address:",       "de": "IP-Adresse:",     "ru": "IP адрес"},
  "Max stored calls:": {"en": "Max stored calls:", "de": "Anrufenanazahl:", "ru": "Число звонков:"},
  "Number of the stored all type calls.": {
    "en": "Number of the stored all type calls.", 
    "de": "Anzahl von maximal gespeicherten Anrufen.", 
    "ru": "Максимальное количество сохранённых звонков."},
  "Max stored missed calls:": {"en": "Max stored missed calls:", "de": "Max. verpasste Anrufe:", "ru": "Пропущенные звонки:"},
  "Number of the stored missed calls.": {
    "en": "Number of the stored missed calls.", 
    "de": "Anzahl von maximal gespeicherten verpassten Anrufen.", 
    "ru": "Максимальное количество сохранённых пропущенных звонков."},
  "Phonebook":         {"en": "Phone book",  "de": "Telefonbuch",  "ru": "Телефонная книга"},
  "Number":            {"en": "Number",      "de": "Nummer",       "ru": "Номер"},
  "Name":              {"en": "Name",        "de": "Name",         "ru": "Имя"},
  "Image":             {"en": "Image",       "de": "Bildpfad",     "ru": "Путь к картинке"},
  "Description":       {"en": "Description", "de": "Beschreibung", "ru": "Описание"},
  "Description text":  {
    "en": "The fritz!box has an integrated call monitor that can be activated by dialling #96*5* (and deactivated by #96*4*).<br>"
        + "Additionally the CCU.IO adapter has to be enabled too.<br>"
        + "Following objects will be created:<br>"
        + "1. 73200 - STATE [NONE | RING | TALKING ]<br>"
        + "2. 73201 - RINGING: true if STATE is RING<br>"
        + "3. 73202 - MISSED: count of missed calls. Can be cleared with value 0.<br>"
        + "4. 73203 - MISSED_LIST: list of missed calls in form \"MISSED/14.01.14 23:01:03/Caller Number/0\".<br>"
        + "5. 73204 - MISSED_LIST_FMT: formatted list of last missed calls for HTML.<br>"
        + "6. 73205 - LAST_MISSED: Name or number of last missed call.<br>"
        + "7. 73206 - RINGING_NUMBER: Name or number of actual ringing call. Will be set to "" after ring is over.<br>"
        + "8. 73207 - RINGING_IMAGE: Picture of actual ringing call. Will be set to "" after ring is over.<br>"
        + "9. 73208 - ALL_LIST: list of all calls in form \"type/14.01.14 23:01:03/Caller Number/Duration\".<br>"
        + "10.73209 - ALL_LIST_FMT: formatted list of all calls for HTML.<br>", 
		
    "de": "fritz!box hat integrierten Anrufmonior. Der kann dürch Anruf #96*5* aktiviert werden (und deaktiviert mit #96*4*).<br>"
        + "Additionally the CCU.IO adapter has to be enabled too.<br>"
        + "Folgende Objekte für die Interkommunikation mit dem Anrufmonitor werden zur Verfügung gestellt:<br>"
        + "1. 73200 - STATE [NONE | RING | TALKING ]<br>"
        + "2. 73201 - RINGING: \"true\" falls STATE ist RING<br>"
        + "3. 73202 - MISSED: Anzahl von vermissten Anrufen. Kann mit schreiben von 0 gelöscht werden.<br>"
        + "4. 73203 - MISSED_LIST: Die Liste von vermissten Anrufen in eine Form von \"MISSED/14.01.14 23:01:03/Caller Number/0\".<br>"
        + "5. 73204 - MISSED_LIST_FMT: Die formatierte Liste von vermissten Anrufen für HTML.<br>"
        + "6. 73205 - LAST_MISSED: Name oder Nummer vom letzten vermiessten Anruf.<br>"
        + "7. 73206 - RINGING_NUMBER: Name oder Nummer vom aktuellen Anruf. Nach dem als Anruf zu ende ist, wird wieder gelöscht.<br>"
        + "8. 73207 - RINGING_IMAGE: Der Bildchen-Pfad vom aktuellen Anruf. Nach dem als Anruf zu ende ist, wird wieder gelöscht.<br>"
        + "9. 73208 - ALL_LIST: Die Liste von allen Anrufen in eine Form von \"type/14.01.14 23:01:03/Caller Number/Duration\".<br>"
        + "10.73209 - ALL_LIST_FMT: Die formatierte Liste von allen Anrufen für HTML.<br>", 
		
    "ru": "fritz!box обладает встроенным монитором звонков, который можно активировать набором на телефоне номера #96*5* (и деактивировать с #96*4*).<br>"
        + "Конечно, сам fritz.Box! драйвер дожен быть тоже активирован.<br>"
        + "Драйвер предоставляет следующие объекты для взаимодействия с монитором:<br>"
        + "1. 73200 - STATE [NONE | RING | TALKING ]<br>"
        + "2. 73201 - RINGING: true если STATE = RING<br>"
        + "3. 73202 - MISSED: число пропущенных звонков. Может быть обнулен, если записать в него 0.<br>"
        + "4. 73203 - MISSED_LIST: список пропущенных звонков в виде \"MISSED/14.01.14 23:01:03/Caller Number/0\".<br>"
        + "5. 73204 - MISSED_LIST_FMT: форматированный список пропущенных звонков для HTML.<br>"
        + "6. 73205 - LAST_MISSED: Имя или номер последнего пропущенного звонка.<br>"
        + "7. 73206 - RINGING_NUMBER: Имя или номер звонящего в настоящий момент. Будет затерто, как только звонок прекратится.<br>"
        + "8. 73207 - RINGING_IMAGE: Путь к картике звонящего в настоящий момент. Будет затерто, как только звонок прекратится.<br>"
        + "9. 73208 - ALL_LIST: список всех звонков в виде \"type/14.01.14 23:01:03/Caller Number/Duration\".<br>"
        + "10.73209 - ALL_LIST_FMT: форматированный список всех звонков для HTML.<br>"
  }
};
