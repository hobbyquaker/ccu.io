/**
 *      CCU.IO Back up solution
 *      01'2014 Bluefox
 *
 *      Version 0.1
 *
 * Create backup of all important files and folders.
 * Following elements will be backed up:
 *  - datastore (All)
 *  - scripts (All)
 *  - logs (Optional, actually not)
 *  - dashui/img (all except devices, mfd, back)
 *  - dashui/css/dashui-user.css
 *
 */
var logger    = require(__dirname+'/logger.js'),
    fs        = require('fs'),
    gzip      = require('tar.gz'),
    ncp       = require('ncp').ncp;

var targetFolder = __dirname + '/tmp';

var iCopied = 0;
var zipFile = null;
var socket  = null;
var task    = 'backup';

var deleteFolderRecursive = function(path) {
    if( fs.existsSync(path) ) {
        fs.readdirSync(path).forEach(function(file,index){
            var curPath = path + '/' + file;
            if(fs.statSync(curPath).isDirectory()) { // recurse
                deleteFolderRecursive(curPath);
            } else { // delete file
                fs.unlinkSync(curPath);
            }
        });
        fs.rmdirSync(path);
    }
};

function copyFile (source, destination, trigger) {
    iCopied++;
    ncp (source, destination, function (err) {
        iCopied--;
        if (err) {
            logger.error('Cannot copy file ' + source + ' to ' + destination);
        }

        if (trigger || !iCopied && (trigger === undefined)) {
            var gz = new gzip ();
            gz.compress(targetFolder+'/' + task, zipFile, function(err) {
                if (!err) {
                    logger.info('create-' + task+ ' file ' + zipFile + ' created');
                }
                else{
                    logger.info('create-' + task + ' file ' + zipFile + ' created');
                }
                // Remove directory
                deleteFolderRecursive(targetFolder+'/'+task);
                if (process && process.send) {
                    // Signal to ccu.io.js the file name
                    process.send (zipFile.replace (__dirname + '/www', ''));
                }
                logger.info('create-' + task + ' file ' + zipFile.replace (__dirname + '/www', '') + '');
                
                setTimeout (function () {process.exit()}, 1000);
            });
        }
    });
}

function copyDirectory (source, destination, exceptionFolders, trigger) {
    var list = fs.readdirSync (source);
    var exceptions = exceptionFolders ? exceptionFolders.split(',') : [];

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
        stat = fs.lstatSync (source+'/'+list[i]);

        if (stat.isDirectory()) {
            copyDirectory (source+'/'+list[i], destination + '/'+list[i], trigger);
        }
        else {
            copyFile (source+'/'+list[i], destination + '/'+list[i], trigger);
        }
    }
}

// delete all .tar.gz in 'www'
function clearWWW () {
    var list = fs.readdirSync (__dirname + '/www');

    for (var i = 0, len = list.length; i < len; i++) {
        if (list[i].indexOf ('.tar.gz') != -1) {
            fs.unlink (__dirname + '/www/' +list[i] );
        }
    }
}

function getCurrentDate (d) {
    d = d || new Date ();
    var year  = d.getFullYear();
    var month = d.getMonth()+1;
    var day   = d.getDate();
    if (month < 10) month = '0' + month;
    if (day < 10)   day   = '0' + day;
    return year + '_' + month + '_' + day;
}

function createBackup (isLog, zipFileName) {
    clearWWW ();

    zipFile = zipFileName || __dirname + '/www/'+getCurrentDate()+'_ccu_io_' + task + '.tar.gz';
    try {
        var stat = fs.lstatSync(zipFile);
        if (stat) {
            fs.unlink (zipFile);
        }
    }
    catch (e) {
    }
    var bckDir = targetFolder+'/' + task;
    // Remove directory
    deleteFolderRecursive (bckDir);
    fs.mkdirSync (bckDir);
    copyDirectory (__dirname + '/datastore', bckDir + '/datastore', '.gitignore');
    copyDirectory (__dirname + '/scripts',   bckDir + '/scripts', '.gitignore');
    if (isLog) {
        copyDirectory (__dirname + '/log', bckDir + '/log', 'ccu.io.log,.gitignore');
    }
    fs.mkdirSync (bckDir + '/www');
    fs.mkdirSync (bckDir + '/www/dashui');
    fs.mkdirSync (bckDir + '/www/dashui/css');
    fs.mkdirSync (bckDir + '/www/dashui/img');
    copyFile (__dirname + '/www/dashui/css/dashui-user.css', bckDir + '/www/dashui/css/dashui-user.css');
    copyDirectory (__dirname + '/www/dashui/img', bckDir + '/www/dashui/img', 'devices,mfd,back');
}

function applyBackup (zipFileName) {
    if (!zipFileName) {
        logger.error ('apply-backup  file does not exist: "' + zipFileName + '"');
        return;
    }
    if (zipFileName.indexOf ('/') == -1 && zipFileName.indexOf ('\\') == -1) {
        zipFileName = __dirname + '/www/' + zipFileName;
    }

    try {
        var stats = fs.lstatSync(zipFileName);

        if (!stats) {
            logger.error ('apply-backup  file does not exist: ' + zipFileName);
            return;
        }
    }
    catch (e) {
        logger.error ('apply-backup  file does not exist: ' + zipFileName);
        return;
    }

    // Remove directory
    deleteFolderRecursive (targetFolder);
    var gz = new gzip ();
    gz.extract(zipFileName, targetFolder, function(err) {
        if (err) {
            logger.error('apply-backup  cannot unzip: ' + err);
            return;
        }
        logger.info('apply-backup  unzip done, start coping');

        ncp(targetFolder + '/'+ task, __dirname, function (err) {
            if (err) {
                logger.error(err);
                return;
            }

            setTimeout(function () {
                // Ordner im tmp Verzeichnis löschen
                logger.info('apply-backup  delete tmp folder '+targetFolder);
                deleteFolderRecursive(targetFolder+'/' + task);
                logger.info('apply-backup  done');
                //process.exit(0);
                fs.unlink (zipFileName);
            }, 2000);
        });
    });
}

function createSnapshot (isNotAnonymized, zipFileName) {
    var settings  = require(__dirname + '/settings.js');
    var io        = require('socket.io-client');

    task = 'snapshot';

    clearWWW ();

    zipFile = zipFileName || __dirname + '/www/'+getCurrentDate()+'_dashui_io_' + task + '.tar.gz';
    try {
        var stat = fs.lstatSync(zipFile);
        if (stat) {
            fs.unlink (zipFile);
        }
    }
    catch (e) {
    }
    var bckDir = targetFolder + '/' + task;
    // Remove directory
    deleteFolderRecursive(bckDir);
    fs.mkdirSync(bckDir);

    var socket;
    if (settings.ioListenPort) {
        socket = io.connect('127.0.0.1', {
            port: settings.ioListenPort
        });
    } else if (settings.ioListenPortSsl) {
        socket = io.connect('127.0.0.1', {
            port: settings.ioListenPortSsl,
            secure: true
        });
    } else {
        return;
    }
    var localData = {};

    socket.on('connect', function () {
        socket.emit('getDatapoints', function(data) {
            localData.uiState = {};
            for (var dp in data) {
                localData.uiState['_' + dp] = { Value: data[dp][0], Timestamp: data[dp][1], Certain: data[dp][2], LastChange: data[dp][3]};
            }

            socket.emit('getObjects', function(obj) {
                localData.metaObjects = obj;

                if (!isNotAnonymized) {
                    for (var i in localData.metaObjects) {
                        if (localData.metaObjects[i]["Address"]) {
                            localData.metaObjects[i]["Address"] = 'ZZZ';
                        }
                    }
                }

                socket.emit('getIndex', function(obj) {
                    localData.metaIndex = obj;

                    fs.mkdirSync(bckDir + '/datastore');
                    fs.writeFile(bckDir + '/datastore/local-data.json', JSON.stringify(localData, null, '  '));

                    try {
                        var _jviews = fs.readFileSync(__dirname + '/datastore/dashui-views.json');
                        var views   = JSON.parse(_jviews);

                        // Remove all cameras from views
                        for (var view in views) {
                            for (var widget in views[view]['widgets']) {
                                if (views[view]['widgets'][widget] &&
                                    views[view]['widgets'][widget].data) {
                                    if (views[view]['widgets'][widget].data.hqoptions) {
                                        var hqOpt = JSON.parse(views[view].widgets[widget].data.hqoptions);
                                        if (hqOpt.ipCamImageURL) {
                                            hqOpt.ipCamImageURL = 'http://www.river-reach.net/netcam1.jpg';
                                            views[view]['widgets'][widget].data.hqoptions = JSON.stringify(hqOpt, null, '  ');
                                        }
                                    }
                                    if (views[view]['widgets'][widget].data.refreshInterval) {
                                        views[view]['widgets'][widget].data.src = 'http://www.river-reach.net/netcam1.jpg';
                                    }
                                }
                            }
                        }
                        fs.writeFile (bckDir + '/datastore/dashui-views.json', JSON.stringify(views, null, '  '))
                    } catch (e) {
                        logger.warn("create-snapshot: cannot create ")
                    }

                    fs.mkdirSync(bckDir + '/dashui');
                    fs.mkdirSync(bckDir + '/dashui/img');
                    copyDirectory(__dirname + '/www/dashui/img', bckDir + '/dashui/img', 'devices,mfd,back', false);
                    fs.mkdirSync(bckDir + '/dashui/css');
                    copyFile (__dirname + '/www/dashui/css/dashui-user.css', bckDir + '/dashui/css/dashui-user.css', true);
                });
            });
        });
    });
}
var cmd = process.argv[2];

if (cmd == 'create') {
    createBackup ();
}
else if (cmd == 'snapshot') {
    createSnapshot ();
}
else if (cmd) {
    applyBackup(cmd);
}
