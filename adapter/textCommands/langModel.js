var commands = {
	'whatTimeIsIt' : {
		description: {
			'en': "What time is it?",
			'de': "Wie spät ist das?",
			'ru': "Сколько время?"
		},
        invisible: true,
		unique:   true,
		editable: false,
		words: {
			'en': "time is it",
			'de': "zeit/spät",
			'ru': "сколько время"
		}
	},
	'whatIsYourName' : {
		description: {
			'en': "What is your name?",
			'de': "Wie heißt du?",
			'ru': "Как тебя зовут?"
		},
        invisible: true,
		unique:   true,
		editable: false,
		words: {
			'en': "your name",
			'de': "heißt du",
			'ru': "тебя зовут"
		}
	},
	'outsideTemperature' : {
		description: {
			'en': "What is the outside temperature?",
			'de': "Wie kalt/warm ist draußen?",
			'ru': "Какая температура на улице?"
		},
		unique:   true,
		editable: false,
		words: {
			'en': "outside temperature",
			'de': "aussen/draußen temperatur",
			'ru': "температура"
		},
		arg1: {
			'en': "Outside temperature ID",
			'de': "Außentemperatur ID",
			'ru': "ID сенсора на улице '.TEMPERATURE'"
		}
	},	
	'insideTemperature' : {
		description: {
			'en': "What is the inside temperature?",
			'de': "Wie kalt/warm ist drin?",
			'ru': "Какая температура дома?"
		},
		unique:   true,
		editable: false,
		words: {
			'en': "inside temperature",
			'de': "intern/drin temperatur",
			'ru': "температура дома/внутри/квартире"
		},
        arg1: {
			'en': "Inside temperature ID",
			'de': "Innentemperature ID",
			'ru': "ID сенсора дома '.TEMPERATURE'"
		}
	},
    'switchOnOff': {
        description: {
            'en': "Switch light on/off",
            'de': "Schalte das Licht an oder aus",
            'ru': "Включить/выключить свет"
        },
        unique:   true,
        editable: false,
        words: {
            'en': "switch light on/off",
            'de': "licht einschalten/ausschalten/ein/aus/an",
            'ru': "свет ключи/включи/включить/выключи/выключить/потушить/потуши/зажги/зажечь"
        },
        ack:  {
            'en': "If acknowledge must be spoken",
            'de': "Ob Ergebniss gesprochen werden soll",
            'ru': "Проговорить команду"
        }
    },
    'blindsUpDown': {
        description: {
            'en': "Open/close blinds",
            'de': "Rolladen auf/zu machen",
            'ru': "Поднять опустить ставни"
        },
        unique:   true,
        editable: false,
        words: {
            'en': "blinds up/down",
            'de': "rollladen/rolllade auf/zu/hoch/runter",
            'ru': "ставни/окно/окна поднять/подними/опустить/опусти/открой/открыть/закрыть/закрой"
        },
        ack:  {
            'en': "If acknowledge must be spoken",
            'de': "Ob Ergebniss gesprochen werden soll",
            'ru': "Проговорить команду"
        }
    },
    'userDeviceControl' : {
        description: {
            'en': "Switch something on/off",
            'de': "Schalte irgendwas an oder aus",
            'ru': "Что нибудь включить/выключить"
        },
        unique:   false,
        editable: true,
        arg1: {
            'en': "Device or variable ID",
            'de': "Gerät- oder Variablen- ID",
            'ru': "ID сенсора или переменной"
        },
        arg2: {
            'en': "Value to write down",
            'de': "Wert zu schreiben",
            'ru': "Записываемое значение"
        }
    },
    'userProgramExec' : {
        description: {
            'en': "Execute program on CCU",
            'de': "Porgramm ausfühen auf CCU",
            'ru': "Выпролнить программу на CCU"
        },
        unique:   false,
        editable: true,
        arg1: {
            'en': "Program ID",
            'de': "Programm-ID",
            'ru': "ID программы"
        }
    },
    'goodBoy' : {
        description: {
            'en': "You are good",
            'de': "Du bist gut",
            'ru': "Молодец"
        },
        invisible: true,
        unique:   true,
        editable: false,
        words: {
            'en': "good",
            'de': "gut",
            'ru': "молодец/хорошая/хороший"
        }
    },
    'thankYou' : {
        description: {
            'en': "Thank you",
            'de': "Danke",
            'ru': "Спасибо"
        },
        invisible: true,
        unique:   true,
        editable: false,
        words: {
            'en': "thank",
            'de': "danke",
            'ru': "спасибо"
        },
        ack: {
            'en': ["No problem", "You are welcome"],
            'de': ["Kein problem", "Bitte", "Bitte sehr"],
            'ru': ["Пожалуйста", "Всегда пожалуйста", "Не за что", "С радостью"]
        }
    }
};

// Translations for rooms
var rooms = {
    "livingRoom": {"ru" : "зал",          "de": "wohnzimmer",           "en": "living" },
    "bedroom":    {"ru" : "спальн",       "de": "schlafzimmer",         "en": "bedroom" },
    "bathroom":   {"ru" : "ванн",         "de": "bad",                  "en": "bath" },
    "office":     {"ru" : "кабинет",      "de": "arbeitszimmer/kabinet/büro","en": "working/office" },
    "nursery":    {"ru" : "детск",        "de": "kinder",               "en": "kids/child/nursery" },
    "wc":         {"ru" : "туалет",       "de": "wc",                   "en": "wc/closet" },
    "floor":      {"ru" : "прихож/вход",  "de": "diele/eingang/flur",   "en": "floor/enter" },
    "kitchen":    {"ru" : "кухня/кухне",  "de": "küche",                "en": "kitchen" },
    "everywhere": {"ru" : "везде/все/всё","de": "alle/überall",         "en": "all/everywhere" },
    "terrace":    {"ru" : "балкон/терасс","de": "balkon/terrasse",      "en": "balcony/terrace/patio" },
    "dinningRoom":{"ru" : "столовая",     "de": "esszimmer",            "en": "dinning" },
    "garage":     {"ru" : "гараж",        "de": "garage",               "en": "garage" },
    "stairs":     {"ru" : "лестниц",      "de": "treppe",               "en": "stair" },
    "garden":     {"ru" : "сад",          "de": "garten",               "en": "garden" },
    "court":      {"ru" : "двор",         "de": "hof",                  "en": "court/yard" },
    "guestroom":  {"ru" : "гостей",       "de": "gästezimmer/gast",     "en": "guestroom" },
    "attic":      {"ru" : "кладовк",      "de": "speicher",             "en": "attic" },
    "roof":       {"ru" : "крыше/крыша",  "de": "dachstuhl",            "en": "roof" },
    "terminal":   {"ru" : "сени/сенях",   "de": "anschlussraum",        "en": "terminal" },
    "washRoom":   {"ru" : "прачечн",      "de": "waschraum",            "en": "wash" },
    "heatRoom":   {"ru" : "котельн",      "de": "heizungsraum",         "en": "heat room" },
    "hovel":      {"ru" : "сарай/сарае",  "de": "schuppen/scheune",     "en": "hovel" },
    "summerHouse":{"ru" : "теплиц",       "de": "gartenhaus",           "en": "summer" }
};

if (module) {
	module.exports = {commands: commands, rooms: rooms};
}
