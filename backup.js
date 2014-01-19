/* Create backup of all important files and folders.
  Following elements will be backuped:
  datastore (All)
  scripts (All)
  logs (Optional)
  dashui/imgs (all except devices, mfd, back)
  dashui/css/dashui-user.css
 */
var logger =    require(__dirname+'/logger.js'),
    fs =        require("fs"),
    gzip =      require('tar.gz'),
    ncp =       require('ncp').ncp;

var backupFolder = __dirname + "/tmp";

var iCopied = 0;
var zipFile = null;

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

function copyFile (source, destination) {
    iCopied++;
    ncp (source, destination, function (err) {
        iCopied--;
        if (err) {
            logger.error ("Cannot copy file " + source + " to " + destination);
        }

        if (!iCopied) {
            var gz = new gzip ();
            gz.compress(backupFolder+"/backup", zipFile, function(err) {
                if (!err) {
                    logger.info ("create-backup file " + zipFile + " created");
                }
                else{
                    logger.info ("create-backup file " + zipFile + " created");
                }
                // Remove directory
                deleteFolderRecursive (backupFolder+"/backup");
                // Signal to ccu.io.js the file name
                process.send (zipFile.replace (__dirname + "/www", "").replace (__dirname + "\www", ""));
                logger.info ("create-backup file " + zipFile.replace (__dirname + "/www", "").replace (__dirname + "\www", "") + "");
            });
        }
    });
}

function copyDirectory (source, destination, exceptionFolders) {
    var list = fs.readdirSync (source);
    var exceptions = exceptionFolders ? exceptionFolders.split(",") : [];

    try {
        var stat = fs.lstatSync(destination);
        if (!stat) {
            fs.mkdirSync (destination);
        }
    }
    catch (e) {
        fs.mkdirSync (destination);
    }

    for (var i = 0, len = list.length; i < len; i++) {
        if (exceptions.indexOf (list[i]) != -1) {
            continue;
        }
        stat = fs.lstatSync (source+"/"+list[i]);

        if (stat.isDirectory()) {
            copyDirectory (source+"/"+list[i], destination + "/"+list[i]);
        }
        else {
            copyFile (source+"/"+list[i], destination + "/"+list[i]);
        }
    }
}

// delete all .tar.gz in "www"
function clearWWW () {
    var list = fs.readdirSync (__dirname + "/www");

    for (var i = 0, len = list.length; i < len; i++) {
        if (list[i].indexOf (".tar.gz") != -1) {
            fs.unlink (__dirname + "/www/" +list[i] );
        }
    }
}

function getCurrentDate (d) {
    d = d || new Date ();
    var year  = d.getFullYear();
    var month = d.getMonth()+1;
    var day   = d.getDate();
    if (month < 10) month = "0" + month;
    if (day < 10)   day   = "0" + day;
    return year + "_" + month + "_" + day;
}

function createBackup (isLog, zipFileName) {
    clearWWW ();

    zipFile = zipFileName || __dirname + "/www/"+getCurrentDate()+"_ccu_io_backup.tar.gz";
    try {
        var stat = fs.lstatSync(zipFile);
        if (stat) {
            fs.unlink (zipFile);
        }
    }
    catch (e) {
    }
    var bckDir = backupFolder+"/backup";
    // Remove directory
    deleteFolderRecursive (bckDir);
    fs.mkdirSync (bckDir);
    copyDirectory (__dirname + "/datastore", bckDir + "/datastore", ".gitignore");
    copyDirectory (__dirname + "/scripts",   bckDir + "/scripts", ".gitignore");
    if (isLog) {
        copyDirectory (__dirname + "/log", bckDir + "/log", "ccu.io.log,.gitignore");
    }
    fs.mkdirSync (bckDir + "/www");
    fs.mkdirSync (bckDir + "/www/dashui");
    fs.mkdirSync (bckDir + "/www/dashui/css");
    fs.mkdirSync (bckDir + "/www/dashui/img");
    copyFile (__dirname + "/www/dashui/css/dashui-user.css", bckDir + "/www/dashui/css/dashui-user.css");
    copyDirectory (__dirname + "/www/dashui/img", bckDir + "/www/dashui/img", "devices,mfd,back");
}

function applyBackup (zipFileName) {
    if (!zipFileName) {
        logger.error ("apply-backup  file does not exist: '" + zipFileName+"'");
        return;
    }
    if (zipFileName.indexOf ("/") == -1 && zipFileName.indexOf ("\\") == -1) {
        zipFileName = __dirname + "/www/" + zipFileName;
    }

    try {
        var stats = fs.lstatSync(zipFileName);

        if (!stats) {
            logger.error ("apply-backup  file does not exist: " + zipFileName);
            return;
        }
    }
    catch (e) {
        logger.error ("apply-backup  file does not exist: " + zipFileName);
        return;
    }

    // Remove directory
    deleteFolderRecursive (backupFolder);
    var gz = new gzip ();
    gz.extract(zipFileName, backupFolder, function(err) {
        if (err) {
            logger.error("apply-backup  cannot unzip: " + err);
            return;
        }
        logger.info("apply-backup  unzip done, start coping");

        ncp(backupFolder + "/backup", __dirname, function (err) {
            if (err) {
                logger.error(err);
                return
            }

            setTimeout(function () {
                // Ordner im tmp Verzeichnis löschen
                logger.info('apply-backup  delete tmp folder '+backupFolder);
                deleteFolderRecursive(backupFolder+"/backup");
                logger.info('apply-backup  done');
                //process.exit(0);
                fs.unlink (zipFileName);
            }, 2000);
        });
    });
}

var cmd = process.argv[2];

if (cmd == "create") {
    createBackup ();
}
else if (cmd) {
    applyBackup(cmd);
}
