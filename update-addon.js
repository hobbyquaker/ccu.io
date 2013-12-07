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
request(url).pipe(unzip.Extract({path: __dirname+"/tmp"}));

setTimeout(function () {
    // Copy Folder to www Dir
//TODO remove name when repositories are restructured
    var source =        __dirname+"/tmp/"+tmpDir+"/"+name,
        destination =   __dirname+"/www/"+name;


    logger.info("update-addon  copying tmp/"+tmpDir+"/"+name+" to www/"+name);

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
        }, 1000);


    });
}, 1000);




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
