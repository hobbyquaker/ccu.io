var scheduler = require('node-schedule'),
    fs = require("fs");

var logger = {
    log4js:         require('log4js'),
    log4jsLogger:   null,
    settings:       require(__dirname+'/settings.js'),

    init: function () {
        this.log4js.configure(__dirname + '/log4js.json', {reloadSecs: 600});
        this.log4jsLogger = this.log4js.getLogger('ccu.io.daily');
        this.log4jsLogger.setLevel(this.settings.logging.level);
        this.log4jsLogger.info("logger        Logger set to level: " + this.settings.logging.level);
    },
    setLevel: function(level) {
        this.log4jsLogger.setLevel(level);
    },
    silly: function (obj) {
        if (!this.log4jsLogger) {
            logger.init();
        }
        this.log4jsLogger.trace(obj);
    },
    debug: function (obj) {
        if (!this.log4jsLogger) {
            logger.init();
        }
        this.log4jsLogger.debug(obj);
    },
    verbose: function (obj) {
        if (!this.log4jsLogger) {
            logger.init();
        }
        this.log4jsLogger.debug(obj);
    },
    info: function (obj) {
        if (!this.log4jsLogger) {
            logger.init();
        }
        this.log4jsLogger.info(obj);
    },
    warn: function (obj) {
        if (!this.log4jsLogger) {
            logger.init();
        }
        this.log4jsLogger.warn(obj);
    },
    error: function (obj) {
        if (!this.log4jsLogger) {
            logger.init();
        }
        this.log4jsLogger.error(obj);
    },
    fatal: function (obj) {
        if (!this.log4jsLogger) {
            logger.init();
        }
        this.log4jsLogger.fatal(obj);
    }
};

module.exports = logger;
