var request =   require("request"),
    logger =    require(__dirname+'/logger.js'),
    fs =        require("fs"),
    unzip =     require("unzip"),
    ncp =       require('ncp').ncp;

ncp.limit = 16;

logger.info("update-addon  started");


var arguments = process.argv.slice(2),
    url = arguments[0],
    name = arguments[1],
    urlParts = url.split("/"),
    nameArr = urlParts.splice(-3),
    tmpDir = nameArr[0]+"-master";

logger.info("update-addon  download and unzip "+url);

// Download and Unzip
request(url).pipe(unzip.Extract({path: __dirname+"/tmp"})).on("close", function () {
    logger.info("update-addon  unzip done");
    var sourcedir   = __dirname+"/tmp/"+tmpDir,
        destination = __dirname+"/www/"+name;

    var source = sourcedir;

    try {
        var stats = fs.lstatSync(sourcedir+"/"+name);

        if (stats.isDirectory()) {

            source = sourcedir+"/"+name
        }
    }
    catch (e) {

    }


    logger.info("update-addon  copying "+source+" to "+destination);

    ncp(source, destination, function (err) {
        if (err) {
            logger.error(err);
            return
        }

        setTimeout(function () {
            // Ordner im tmp Verzeichnis löschen
            logger.info('update-addon  delete tmp folder '+__dirname+"/tmp/"+tmpDir);
            deleteFolderRecursive(__dirname+"/tmp/"+tmpDir);
            logger.info('update-addon  done');
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
