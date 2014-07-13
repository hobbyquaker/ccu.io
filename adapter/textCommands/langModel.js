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
			'de': "aussen/draußen kalt/warm/temperatur",
			'ru': "температура снаружи/улице"
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
			'de': "kalt/warm/temperatur",
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
            'de': "rolladen/rollade/fenster/laden auf/zu/hoch/runter/machen",
            'ru': "ставни/окно/окна/жалюзи поднять/подними/опустить/опусти/открой/открыть/закрыть/закрой"
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
        },
        ack: {
            'en': ["Thank you", "You are welcome"],
            'de': ["Danke", "Freut mich"],
            'ru': ["Спасибо"]
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

if (module) {
	module.exports = commands;
}