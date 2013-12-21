var request =   require("request"),
    logger =    require(__dirname+'/logger.js'),
    fs =        require("fs"),
    unzip =     require("unzip"),
    ncp =       require('ncp').ncp;

ncp.limit = 16;

logger.info("update-ccu.io started");

var url = "https://github.com/hobbyquaker/ccu.io/archive/master.zip",
    tmpDir = "ccu.io-master";

logger.info("update-ccu.io download and unzip "+url);

// Download and Unzip
request(url).pipe(unzip.Extract({path: __dirname+"/tmp"})).on("close", function () {
    logger.info("update-ccu.io unzip done");
    var source =        __dirname+"/tmp/"+tmpDir,
        destination =   __dirname;

    logger.info("update-ccu.io copying "+source+" to "+destination);

    ncp(source, destination, function (err) {
        if (err) {
            logger.error(err);
            return
        }

        setTimeout(function () {
            // Ordner im tmp Verzeichnis löschen
            logger.info('update-ccu.io delete tmp folder '+__dirname+"/tmp/"+tmpDir);
            deleteFolderRecursive(__dirname+"/tmp/"+tmpDir);
            logger.info('update-ccu.io done');
            //process.exit(0);
        }, 2000);

    });

});

var deleteFolderRecursive = function(path) {
    if( fs.existsSync(path) ) {
        fs.readdirSync(path).forEach(function(file,index){
            var curPath = path + "/" + file;
            if(fs.statSync(curPath).isDirectory()) { // recurse
                deleteFolderRecursive(curPath);
            } else { // delete file
                fs.unlinkSync(curPath);
            }
        });
        fs.rmdirSync(path);
    }
};
