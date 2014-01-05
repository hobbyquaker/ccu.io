var commands = {
	'whatTimeIsIt' : {
		description: {
			'en': "What time is it?",
			'de': "Wie spät ist das?",
			'ru': "Сколько время?"
		},
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
    }};

if (module) {
	module.exports = commands;
}